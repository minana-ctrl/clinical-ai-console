import { useState } from 'react'

// Ported from the ICAIH 2026 design system bundle (components/core/Button.jsx).
// Kept as a direct translation so a future DS release can be dropped in cleanly.

const base = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
  fontFamily: 'var(--font-body)',
  fontWeight: 'var(--fw-semibold)',
  borderRadius: 'var(--radius-control)',
  border: 'var(--border-width) solid transparent',
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  transition: 'var(--transition-control)',
}

const sizes = {
  sm: { height: 'var(--control-h-sm)', padding: '0 var(--space-4)', fontSize: 'var(--fs-body-sm)' },
  md: { height: 'var(--control-h-md)', padding: '0 var(--space-6)', fontSize: 'var(--fs-body)' },
  lg: { height: 'var(--control-h-lg)', padding: '0 var(--space-8)', fontSize: 'var(--fs-body-lg)' },
}

const variants = {
  primary: { background: 'var(--brand-primary)', color: 'var(--text-on-brand)', boxShadow: 'var(--shadow-brand)' },
  secondary: { background: 'var(--brand-secondary)', color: 'var(--text-on-brand)' },
  accent: { background: 'var(--surface-accent)', color: 'var(--text-on-accent)' },
  outline: { background: 'transparent', color: 'var(--brand-primary)', borderColor: 'var(--border-brand)' },
  ghost: { background: 'transparent', color: 'var(--text-heading)' },
  inverse: { background: 'var(--neutral-0)', color: 'var(--icaih-navy)' },
}

const hovers = {
  primary: { background: 'var(--brand-primary-hover)' },
  secondary: { background: 'var(--icaih-navy-700)' },
  accent: { background: 'var(--icaih-lime-bright)' },
  outline: { background: 'var(--icaih-emerald-50)' },
  ghost: { background: 'var(--neutral-100)' },
  inverse: { background: 'var(--neutral-100)' },
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  iconLeft,
  iconRight,
  href,
  onClick,
  style,
  children,
  ...rest
}) {
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)

  const s = {
    ...base,
    ...sizes[size],
    ...variants[variant],
    ...(hover && !disabled ? hovers[variant] : null),
    width: fullWidth ? '100%' : undefined,
    transform: press && !disabled ? 'scale(.98)' : 'none',
    opacity: disabled ? 0.45 : 1,
    pointerEvents: disabled ? 'none' : undefined,
    ...style,
  }

  const Tag = href ? 'a' : 'button'

  return (
    <Tag
      href={href}
      onClick={onClick}
      disabled={!href ? disabled : undefined}
      style={s}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false)
        setPress(false)
      }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </Tag>
  )
}
