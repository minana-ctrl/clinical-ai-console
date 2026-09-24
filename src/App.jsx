import { useState } from 'react'
import EhrNavigator, { useEhrNavigator } from './modules/EhrNavigator.jsx'
import AppointmentReady, { useAppointmentReady } from './modules/AppointmentReady.jsx'
import RadiologyExplainer, { useRadiologyExplainer } from './modules/RadiologyExplainer.jsx'
import LearningCompanion, { useLearningCompanion } from './modules/LearningCompanion.jsx'
import OsceSimulator, { useOsceSimulator } from './modules/OsceSimulator.jsx'

// Served from public/ — the Telehealth Connect lockup, cropped from the event banner (keeps its own blue backdrop).
const LOGO = '/assets/telehealth-connect-logo.png'

const DatabaseIcon = () => (
  <>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14a9 3 0 0 0 18 0V5" />
    <path d="M3 12a9 3 0 0 0 18 0" />
  </>
)
const CalendarCheckIcon = () => (
  <>
    <path d="M8 2v4M16 2v4M3 10h18" />
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="m9 16 2 2 4-4" />
  </>
)
const ActivityGlyph = () => <path d="M3 12h4l2 5 4-11 2 6h6" />
const GraduationIcon = () => (
  <>
    <path d="M22 10 12 5 2 10l10 5z" />
    <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
  </>
)
const StethoscopeIcon = () => (
  <>
    <path d="M11 2v2M5 2v2M5 4a3 3 0 0 0 3 3 3 3 0 0 0 3-3" />
    <path d="M8 7v6a6 6 0 0 0 6 6h1a3 3 0 0 0 3-3v-3" />
    <circle cx="18" cy="10" r="2" />
  </>
)

const NAV = [
  { key: 'interview', label: 'EHR navigator agent', icon: DatabaseIcon },
  { key: 'ready', label: 'Appointment ready', icon: CalendarCheckIcon },
  { key: 'explainer', label: 'Radiology explainer', icon: ActivityGlyph },
  { key: 'learning', label: 'Radiology learning companion', icon: GraduationIcon },
  { key: 'osce', label: 'Bedside OSCE simulator', icon: StethoscopeIcon },
]

export default function App({ defaultSection = 'ready' }) {
  const [page, setPage] = useState(defaultSection)

  // Every tool's state is held here, above the branch that renders it, so
  // progress survives navigating away and back — as it does in the design.
  const ehr = useEhrNavigator()
  const appointment = useAppointmentReady({ active: page === 'ready' })
  const explainer = useRadiologyExplainer()
  const learning = useLearningCompanion()
  const osce = useOsceSimulator()

  const meta = {
    interview: [
      'EHR navigator agent',
      'An agent that plans, fetches and combines FHIR records to answer a question about a patient.',
    ],
    ready: [
      'Appointment ready',
      {
        setup: 'Choose the patient and the condition the assistant will interview.',
        brief: 'How the simulation is set up before the interview begins.',
        live: 'The assistant interviews the patient and drafts the report as it goes.',
        report: 'The pre-visit report, written from the interview and the health record together.',
        eval: 'The reference diagnosis is revealed and the report is marked against it.',
      }[appointment.tab],
    ],
    explainer: ['Radiology explainer', 'Click any sentence of the report to see what it means in plain language.'],
    learning: [
      'Radiology learning companion',
      'Work through a chest X-ray question by question, then compare your read with the model.',
    ],
    osce: [
      'Bedside OSCE simulator',
      {
        ward: 'Pick a waiting patient and take the station.',
        chart: 'Read the folder before you walk in.',
        consult: 'Take a history, examine, and record what you find.',
        diagnosis: 'Write the plan before you leave the room.',
        debrief: 'Your consultation, marked — including what you never asked.',
      }[osce.screen],
    ],
  }[page]

  const go = (key) => () => {
    setPage(key)
    if (key === 'ready') appointment.goSetup()
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--neutral-50)', font: 'var(--type-body)', color: 'var(--text-body)' }}>
      <aside
        style={{
          width: 268, flex: 'none', position: 'sticky', top: 0, height: '100vh', display: 'flex',
          flexDirection: 'column', gap: 26, padding: '24px 20px', background: 'var(--surface-inverse)', color: '#fff',
        }}
      >
        <img
          src={LOGO}
          alt="Telehealth Connect 2026"
          style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 'var(--radius-md)' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              font: 'var(--type-eyebrow)', letterSpacing: 'var(--ls-eyebrow)', textTransform: 'uppercase',
              color: 'var(--icaih-lime)',
            }}
          >
            Clinical AI console
          </span>
          <span style={{ font: 'var(--type-body)', fontSize: 'var(--fs-body-sm)', color: 'rgba(255,255,255,.62)' }}>
            29 Sep – 1 Oct 2026 · Tunis
          </span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={go(key)}
              aria-current={page === key ? 'page' : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', border: 'none',
                cursor: 'pointer', borderRadius: 'var(--radius-sm)', font: 'var(--type-label)',
                fontSize: 'var(--fs-body)', textAlign: 'left', transition: 'var(--transition-control)',
                background: page === key ? 'rgba(255,255,255,.12)' : 'transparent',
                color: page === key ? '#fff' : 'rgba(255,255,255,.66)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <Icon />
              </svg>
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '20px 32px',
            background: 'var(--surface-glass)', backdropFilter: 'var(--blur-glass)',
            borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h1 style={{ margin: 0, font: 'var(--type-h3)', color: 'var(--text-heading)' }}>{meta[0]}</h1>
            <span style={{ font: 'var(--type-body)', fontSize: 'var(--fs-body-sm)', color: 'var(--text-muted)' }}>{meta[1]}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                borderRadius: 'var(--radius-pill)', background: 'var(--status-success-bg)',
                color: 'var(--icaih-emerald-800)', font: 'var(--type-label)', fontSize: 'var(--fs-caption)',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 9, background: 'var(--status-success)' }} />
              Model online
            </span>
            <span style={{ font: 'var(--type-mono)', color: 'var(--text-muted)' }}>Tue 29 Sep 2026 · 09:42</span>
          </div>
        </header>

        {page === 'interview' && <EhrNavigator vals={ehr} />}
        {page === 'ready' && <AppointmentReady vals={appointment} />}
        {page === 'explainer' && <RadiologyExplainer vals={explainer} />}
        {page === 'learning' && <LearningCompanion vals={learning} />}
        {page === 'osce' && <OsceSimulator vals={osce} />}
      </main>
    </div>
  )
}
