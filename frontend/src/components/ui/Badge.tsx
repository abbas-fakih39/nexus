import type { ReactNode } from 'react';

type Tone = 'success' | 'warn' | 'danger' | 'neutral';

const tones: Record<Tone, string> = {
  success: 'bg-accent-softer text-accent-deep',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-canvas text-ink-mute',
};

export default function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
