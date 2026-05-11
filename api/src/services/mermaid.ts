import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(globalThis as any).document = dom.window.document;
(globalThis as any).window = dom.window;
(globalThis as any).DOMPurify = undefined;

const mermaidMod = await import('mermaid');
const mermaid = mermaidMod.default;

mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });

export async function validateMermaid(code: string): Promise<void> {
  await mermaid.parse(code);
}
