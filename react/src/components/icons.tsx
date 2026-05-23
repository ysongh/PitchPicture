// Shared SVG icons — 24px viewBox, currentColor, stroke-based unless noted.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function BrandMark({ size = 18, ...p }: P & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="3" y="3" width="2.6" height="18" rx="1.3" fill="currentColor" />
      <circle cx="14" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <line x1="18.5" y1="13.5" x2="20.5" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="20.6" cy="17.6" r="2" fill="currentColor" />
    </svg>
  );
}

export function MicIcon({ size = 16, ...p }: P & { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" {...stroke} {...p}>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

// Filled mic glyph for the big circular record button.
export function MicGlyph({ size = 34, ...p }: P & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor" />
      <path d="M5 11a7 7 0 0 0 14 0" {...stroke} fill="none" />
      <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function StopGlyph({ size = 28, ...p }: P & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...p}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function LinkIcon({ size = 16, ...p }: P & { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" {...stroke} {...p}>
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07L11.5 4.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07L12.5 19.5" />
    </svg>
  );
}

export function SparklesIcon({ size = 16, ...p }: P & { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" {...stroke} {...p}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}

export function PlusIcon({ size = 16, ...p }: P & { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" {...stroke} {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function TrashIcon({ size = 16, ...p }: P & { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" {...stroke} {...p}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function KebabIcon({ size = 16, ...p }: P & { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...p}>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 14, ...p }: P & { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={2.4} {...p}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function CalendarIcon({ size = 14, ...p }: P & { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" {...stroke} {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  );
}

export function ChevronIcon({ size = 14, ...p }: P & { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" {...stroke} {...p}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}
