import { supabase, AUDIO_BUCKET } from './services/supabase.js';
import { transcribeWithDeepgram } from './services/deepgram.js';
import { analyzeWithClaude, refineWithClaude } from './services/claude.js';
import type { SessionStatus } from './lib/types.js';

async function updateStatus(id: string, status: SessionStatus) {
  const { error } = await supabase()
    .from('sessions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`updateStatus(${status}) failed: ${error.message}`);
}

async function markFailed(id: string, message: string) {
  await supabase()
    .from('sessions')
    .update({
      status: 'failed',
      error_message: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

async function downloadAudio(audioPath: string): Promise<{ buffer: Buffer; mime: string }> {
  const { data, error } = await supabase().storage
    .from(AUDIO_BUCKET)
    .download(audioPath);
  if (error || !data) {
    throw new Error(`audio download failed: ${error?.message || 'no data'}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mime: data.type || 'audio/webm' };
}

export async function processSession(id: string) {
  try {
    const { data: row, error } = await supabase()
      .from('sessions')
      .select('audio_path')
      .eq('id', id)
      .single();
    if (error || !row?.audio_path) {
      throw new Error(`session ${id} has no audio_path`);
    }

    await updateStatus(id, 'transcribing');
    const { buffer, mime } = await downloadAudio(row.audio_path as string);
    const transcript = await transcribeWithDeepgram(buffer, mime);

    await supabase()
      .from('sessions')
      .update({ transcript, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!transcript.trim()) {
      throw new Error('Empty transcript from Deepgram');
    }

    await updateStatus(id, 'analyzing');
    const analysis = await analyzeWithClaude(transcript);

    await supabase()
      .from('sessions')
      .update({
        status: 'ready',
        title: analysis.title,
        diagram_type: analysis.diagram_type,
        diagram_reasoning: analysis.reasoning,
        mermaid_code: analysis.mermaid_code,
        summary: analysis.summary,
        key_concepts: analysis.key_concepts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  } catch (err: any) {
    console.error(`[pipeline] session ${id} failed:`, err);
    await markFailed(id, err.message || String(err));
  }
}

// Refine is non-destructive: the session already has a valid diagram. On any
// failure we restore it to 'ready' with the old diagram intact and surface the
// error via error_message — a bad follow-up never breaks a working session.
export async function refineSession(id: string, audioBuffer: Buffer, mime: string) {
  try {
    const transcript = await transcribeWithDeepgram(audioBuffer, mime);
    if (!transcript.trim()) {
      throw new Error("Couldn't make out anything in the follow-up recording.");
    }

    const { data: row, error } = await supabase()
      .from('sessions')
      .select('transcript, diagram_type, mermaid_code, summary, key_concepts')
      .eq('id', id)
      .single();
    if (error || !row?.mermaid_code) {
      throw new Error(`session ${id} has no diagram to refine`);
    }

    await updateStatus(id, 'analyzing');
    const originalTranscript = (row.transcript as string) || '';
    const analysis = await refineWithClaude(
      {
        originalTranscript,
        diagramType: row.diagram_type as string,
        mermaidCode: row.mermaid_code as string,
        summary: (row.summary as string) || '',
        keyConcepts: (row.key_concepts as string[]) || [],
      },
      transcript
    );

    const accumulatedTranscript =
      `${originalTranscript}\n\n--- Refinement ---\n${transcript}`.trim();

    await supabase()
      .from('sessions')
      .update({
        status: 'ready',
        error_message: null,
        transcript: accumulatedTranscript,
        title: analysis.title,
        diagram_type: analysis.diagram_type,
        diagram_reasoning: analysis.reasoning,
        mermaid_code: analysis.mermaid_code,
        summary: analysis.summary,
        key_concepts: analysis.key_concepts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  } catch (err: any) {
    console.error(`[pipeline] refine ${id} failed:`, err);
    await supabase()
      .from('sessions')
      .update({
        status: 'ready',
        error_message: `Refine failed: ${(err.message || String(err)).slice(0, 480)}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  }
}
