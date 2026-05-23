import { useEffect, useRef, useState, type ReactNode } from 'react';

interface TriggerArgs {
  open: boolean;
  toggle: () => void;
}

interface Props {
  trigger: (args: TriggerArgs) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
}

/**
 * Minimal popover menu. Closes on outside click and Escape.
 * Used for the top-bar account chip and the History row kebab.
 */
export function Menu({ trigger, children, align = 'end' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    // Stop clicks bubbling so the menu works inside clickable rows.
    <div className="pp-menu-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div className={`pp-menu pp-menu--${align}`} role="menu">
          {children(close)}
        </div>
      )}
    </div>
  );
}
