import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { transcribeWithDeepgram } from '../api/src/services/deepgram.js';
import { analyzeWithClaude } from '../api/src/services/claude.js';

const MIME_BY_EXT: Record<string, string> = {
  '.webm': 'audio/webm',
  '.mp3': 'audio/mpeg',
  '.mp4': 'audio/mp4',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
};

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: pnpm test:pipeline <path-to-audio-file>');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY in environment.');
    process.exit(1);
  }
  if (!process.env.DEEPGRAM_API_KEY) {
    console.error('Missing DEEPGRAM_API_KEY in environment.');
    process.exit(1);
  }

  const path = resolve(process.cwd(), arg);
  const audio = readFileSync(path);
  const ext = extname(path).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    console.error(`Unsupported audio extension: ${ext}`);
    console.error(`Supported: ${Object.keys(MIME_BY_EXT).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n--- Audio: ${path} (${(audio.length / 1024).toFixed(1)} KB, ${mime}) ---`);
  console.log('Transcribing with Deepgram…');

  const t0 = Date.now();
  const transcript = await transcribeWithDeepgram(audio, mime);
  const t1 = Date.now();

  console.log(`\n--- Transcript (${t1 - t0} ms, ${transcript.length} chars) ---`);
  console.log(transcript);

  if (!transcript.trim()) {
    console.error('\nEmpty transcript — aborting before Claude call.');
    process.exit(1);
  }

  console.log('\nAnalyzing with Claude…');
  const analysis = await analyzeWithClaude(transcript);
  const t2 = Date.now();

  console.log(`\n--- Result (${t2 - t1} ms) ---`);
  console.log(`Title:        ${analysis.title}`);
  console.log(`Diagram type: ${analysis.diagram_type}`);
  console.log(`Reasoning:    ${analysis.reasoning}`);
  console.log(`\nSummary:\n${analysis.summary}`);
  console.log(`\nKey concepts:`);
  for (const c of analysis.key_concepts) console.log(`  - ${c}`);
  console.log(`\nMermaid:\n${analysis.mermaid_code}`);
  console.log(`\nTotal: ${t2 - t0} ms (Deepgram ${t1 - t0} ms + Claude ${t2 - t1} ms)\n`);
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
