import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from '../lib/theme';

let renderCounter = 0;

interface Props {
  code: string;
}

export function DiagramView({ code }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: resolved === 'dark' ? 'dark' : 'default',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    });

    let cancelled = false;
    const id = `mmd-${++renderCounter}`;

    (async () => {
      try {
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, resolved]);

  if (error) {
    return (
      <div>
        <p className="error">Diagram failed to render: {error}</p>
        <pre className="code-fallback">{code}</pre>
      </div>
    );
  }

  return <div className="diagram" ref={ref} />;
}
