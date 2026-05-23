import type { ReactNode } from 'react';
import { TopBar } from './TopBar';

interface Props {
  children: ReactNode;
  active?: 'home' | 'history';
  /** Top-aligned main (lists, Result) instead of vertically centered. */
  wide?: boolean;
  /** Minimal top bar — brand + theme only. */
  minimal?: boolean;
}

export function AppShell({ children, active, wide, minimal }: Props) {
  return (
    <>
      <TopBar active={active} minimal={minimal} />
      <main className={'pp-main' + (wide ? ' pp-main--wide' : '')}>{children}</main>
    </>
  );
}
