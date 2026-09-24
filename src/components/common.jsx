/* Small pieces the design repeats verbatim across more than one tool. */

export const eyebrow = {
  font: 'var(--type-eyebrow)',
  letterSpacing: 'var(--ls-eyebrow)',
  textTransform: 'uppercase',
  color: 'var(--brand-primary)',
}

export const mutedEyebrow = { ...eyebrow, color: 'var(--neutral-500)' }

export const card = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-xs)',
}

export function WarningIcon({ stroke = '#b3261e' }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flex: 'none', marginTop: 1 }}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

export function ActivityIcon({ size = 18 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M3 12h4l2 5 4-11 2 6h6" />
    </svg>
  )
}

export function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

/* The grey "for illustrative purposes only" note. */
export function Disclaimer({ children }) {
  return (
    <div
      style={{
        display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-md)',
        background: 'var(--neutral-50)', border: '1px solid var(--border-subtle)',
      }}
    >
      <WarningIcon />
      <span style={{ fontSize: 'var(--fs-caption, 13px)', color: 'var(--neutral-600)', textWrap: 'pretty' }}>
        {children}
      </span>
    </div>
  )
}

export const MEDGEMMA_BASELINE_NOTE =
  "This demonstration is for illustrative purposes of MedGemma's baseline capabilities only. It does not represent a " +
  'finished or approved product, is not intended to diagnose or suggest treatment of any disease or condition, and ' +
  'should not be used for medical advice.'
