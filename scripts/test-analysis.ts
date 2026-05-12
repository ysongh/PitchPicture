import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { analyzeWithClaude } from '../api/src/services/claude.js';

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: pnpm test:analysis <path-to-transcript.txt>');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY in environment.');
    console.error('Try: ANTHROPIC_API_KEY=sk-... pnpm test:analysis <path>');
    process.exit(1);
  }

  const path = resolve(process.cwd(), arg);
  const transcript = readFileSync(path, 'utf8').trim();
  if (!transcript) {
    console.error(`Transcript file is empty: ${path}`);
    process.exit(1);
  }

  console.log(`\n--- Transcript (${transcript.length} chars) ---`);
  console.log(transcript.slice(0, 400) + (transcript.length > 400 ? '…' : ''));
  console.log('\nCalling Claude…\n');

  const t0 = Date.now();
  const analysis = await analyzeWithClaude(transcript);
  const ms = Date.now() - t0;

  console.log(`--- Result (${ms} ms) ---`);
  console.log(`Title:        ${analysis.title}`);
  console.log(`Diagram type: ${analysis.diagram_type}`);
  console.log(`Reasoning:    ${analysis.reasoning}`);
  console.log(`\nSummary:\n${analysis.summary}`);
  console.log(`\nKey concepts:`);
  for (const c of analysis.key_concepts) console.log(`  - ${c}`);
  console.log(`\nMermaid:\n${analysis.mermaid_code}\n`);
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
