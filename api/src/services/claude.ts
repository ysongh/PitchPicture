import { validateMermaid } from './mermaid.js';
import type { Analysis } from '../lib/types.js';

const SYSTEM_PROMPT = `You convert brainstorm transcripts into the clearest possible visual representation.

The speaker is narrating an idea, problem, or plan to be shared with their team. Your job:
1. Identify the underlying structure (process, system, decision, hierarchy, interaction)
2. Pick ONE diagram type that best reveals that structure
3. Generate complete, valid Mermaid syntax
4. Write a summary and extract key concepts

Diagram type selection:
- "flowchart": linear or branching processes, decisions, "first X then Y if Z..."
- "mindmap": open-ended exploration of related concepts radiating from a central theme
- "architecture": system components and how they connect (use Mermaid 'flowchart LR' with subgraphs)
- "decision_tree": exploring options with consequences ("we could do A, but then B...")
- "sequence": multiple actors interacting over time

Heuristics for selection:
- "first... then... then..." → flowchart
- "and also... another thing... related..." → mindmap
- describing parts of a system → architecture
- "we could do X or Y or Z" → decision_tree
- describing two parties exchanging messages → sequence

Constraints:
- Mermaid must parse on first try
- Unique node IDs (no spaces, no special chars in IDs)
- Keep diagrams under 15 nodes; pick the strongest thread if the brainstorm sprawls
- Node labels: basic punctuation only, escape any quotes
- Summary should help someone who didn't hear the brainstorm understand it in 30 seconds

Output valid JSON only, no preamble or markdown fences:
{
  "title": "3-7 words capturing the core idea",
  "diagram_type": "flowchart" | "mindmap" | "architecture" | "decision_tree" | "sequence",
  "reasoning": "one sentence on why this type fits",
  "mermaid_code": "complete Mermaid syntax",
  "summary": "2-3 sentences",
  "key_concepts": ["concept 1", "concept 2", ...]
}`;

const REFINE_SYSTEM_PROMPT = `You refine an existing diagram based on a follow-up instruction from the speaker.

You are given:
1. The ORIGINAL transcript the diagram was built from
2. The CURRENT diagram (type, Mermaid code, summary, key concepts)
3. A NEW follow-up recording where the speaker asks for changes

Your job: produce an updated diagram that incorporates the follow-up while keeping everything the speaker did NOT ask to change as stable as possible. Make targeted edits, not a rewrite. Only switch diagram type if the follow-up clearly calls for a different structure.

Same constraints as before:
- Mermaid must parse on first try
- Unique node IDs (no spaces, no special chars in IDs)
- Keep diagrams under 15 nodes
- Node labels: basic punctuation only, escape any quotes
- Update the summary and key concepts to reflect the refined diagram

Output valid JSON only, no preamble or markdown fences:
{
  "title": "3-7 words capturing the core idea",
  "diagram_type": "flowchart" | "mindmap" | "architecture" | "decision_tree" | "sequence",
  "reasoning": "one sentence on why this type fits",
  "mermaid_code": "complete Mermaid syntax",
  "summary": "2-3 sentences",
  "key_concepts": ["concept 1", "concept 2", ...]
}`;

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last !== -1) return trimmed.slice(first, last + 1);
  return trimmed;
}

async function requestAnalysis(system: string, userMessage: string): Promise<Analysis> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic error: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { content: Array<{ text: string }> };
  return JSON.parse(extractJson(data.content[0].text)) as Analysis;
}

export async function analyzeWithClaude(
  transcript: string,
  previousError?: string
): Promise<Analysis> {
  const userMessage = previousError
    ? `Transcript:\n\n${transcript}\n\nYour previous response had a Mermaid syntax error: "${previousError}". Generate corrected output.`
    : `Transcript:\n\n${transcript}`;

  const analysis = await requestAnalysis(SYSTEM_PROMPT, userMessage);

  try {
    await validateMermaid(analysis.mermaid_code);
    return analysis;
  } catch (err: any) {
    if (previousError) throw err;
    return analyzeWithClaude(transcript, err.message);
  }
}

export interface RefineContext {
  originalTranscript: string;
  diagramType: string;
  mermaidCode: string;
  summary: string;
  keyConcepts: string[];
}

export async function refineWithClaude(
  ctx: RefineContext,
  refinementTranscript: string,
  previousError?: string
): Promise<Analysis> {
  const base = `ORIGINAL TRANSCRIPT:\n${ctx.originalTranscript}\n\n` +
    `CURRENT DIAGRAM\nType: ${ctx.diagramType}\nMermaid:\n${ctx.mermaidCode}\n\n` +
    `Current summary: ${ctx.summary}\n` +
    `Current key concepts: ${ctx.keyConcepts.join(', ')}\n\n` +
    `FOLLOW-UP RECORDING (the requested changes):\n${refinementTranscript}`;
  const userMessage = previousError
    ? `${base}\n\nYour previous response had a Mermaid syntax error: "${previousError}". Generate corrected output.`
    : base;

  const analysis = await requestAnalysis(REFINE_SYSTEM_PROMPT, userMessage);

  try {
    await validateMermaid(analysis.mermaid_code);
    return analysis;
  } catch (err: any) {
    if (previousError) throw err;
    return refineWithClaude(ctx, refinementTranscript, err.message);
  }
}
