import { useEffect, useMemo, useRef, useState } from 'react'
import { caseData, conditionData, scenarioData } from '../data/appointment.js'
import Button from '../ds/Button.jsx'
import { ActivityIcon, card, eyebrow } from '../components/common.jsx'
import { buildScripted, loadRecorded, useReplay } from '../lib/replay.js'

/* Mirrors the `ready` half of `renderVals()` in the design source. */
export function useAppointmentReady({ active }) {
  const [tab, setTab] = useState('setup')
  const [scenario, setScenario] = useState(0)
  const [condition, setCondition] = useState(0)
  const [audioOn, setAudioOn] = useState(true)
  const [fast, setFast] = useState(false)
  const [recorded, setRecorded] = useState(null)
  const [loadingRun, setLoadingRun] = useState(false)
  const videos = useRef([])

  // Only the selected persona's clip plays, and only while the picker is on screen.
  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (!v) return
      if (i === scenario && tab === 'setup' && active) {
        const p = v.play()
        if (p && p.catch) p.catch(() => {})
      } else {
        v.pause()
        v.currentTime = 0
      }
    })
  }, [scenario, tab, active])

  const sc = scenarioData[scenario]
  const cs = caseData[condition]
  const conditionName = conditionData[condition][0]

  /* A recorded run is looked up once the pair is locked in. It is only ever a
     bonus: the scripted run below is always ready, so the demo never blocks on
     a fetch and never depends on a file being present. */
  useEffect(() => {
    if (tab === 'setup') return undefined
    let live = true
    setLoadingRun(true)
    setRecorded(null)
    loadRecorded(sc.line.split(',')[0], conditionName).then((b) => {
      if (!live) return
      setRecorded(b)
      setLoadingRun(false)
    })
    return () => {
      live = false
    }
  }, [tab, sc, conditionName])

  const scripted = useMemo(() => buildScripted(sc, cs), [sc, cs])
  const bundle = tab === 'setup' ? null : recorded || scripted

  const replay = useReplay({
    bundle,
    running: tab === 'live' && active && !loadingRun,
    audioOn,
    rate: fast ? 1.35 : 1,
  })

  const turns = replay.shown
    .filter((m) => m.speaker !== 'thinking')
    .map((m, i) => {
      const ai = m.speaker === 'interviewer'
      return {
        who: ai ? 'Assistant' : 'Patient',
        text: m.text,
        dir: ai ? 'row' : 'row-reverse',
        avatar: ai ? '' : sc.initials,
        avatarBg: ai ? 'var(--icaih-emerald-50)' : 'var(--icaih-navy-50)',
        avatarRadius: ai ? 'var(--radius-sm)' : 'var(--radius-pill)',
        align: ai ? 'flex-start' : 'flex-end',
        bg: ai ? 'var(--icaih-emerald-50)' : 'var(--neutral-50)',
        border: ai ? '1px solid var(--icaih-emerald-100)' : '1px solid var(--border-subtle)',
        speaking: i === replay.speakingIdx,
      }
    })

  const thinkingShown = replay.shown.some((m) => m.speaker === 'thinking')

  return {
    audioOn,
    toggleAudio: () => setAudioOn((v) => !v),
    fast,
    toggleFast: () => setFast((v) => !v),
    isRecorded: Boolean(recorded),
    sourceLabel: recorded
      ? 'Recorded run · MedGemma 27b + Gemini TTS'
      : 'Scripted run · on-device speech',
    interviewDone: replay.finished,
    reportHtml: replay.reportHtml,
    thinkingShown,
    replayStop: replay.stop,

    tab,
    isSetup: tab === 'setup',
    isBrief: tab === 'brief',
    isLive: tab === 'live',
    isReport: tab === 'report',
    isEval: tab === 'eval',
    goSetup: () => {
      replay.stop()
      setTab('setup')
    },
    launch: () => setTab('brief'),
    beginInterview: () => setTab('live'),
    goReport: () => setTab('report'),
    goEval: () => setTab('eval'),

    scenarios: scenarioData.map((d, i) => ({
      person: d.person,
      existing: d.existing,
      video: d.video,
      poster: d.poster,
      ref: (el) => {
        videos.current[i] = el
      },
      outline: i === scenario ? '2px solid var(--border-brand)' : '2px solid transparent',
      select: () => setScenario(i),
    })),
    conditions: conditionData.map(([name, blurb], i) => ({
      name,
      blurb,
      bg: i === condition ? 'var(--icaih-emerald-50)' : 'var(--surface-card)',
      border: i === condition ? '2px solid var(--border-brand)' : '1px solid var(--border-subtle)',
      select: () => setCondition(i),
    })),

    patientName: sc.line.split(',')[0],
    patientLine: sc.line,
    patientPosterBg: `url("${sc.poster}")`,
    thinking: (bundle && bundle.thinking) || '',
    speechLabel: 'Simulated persona · ' + conditionName,
    turns,

    referenceDx: cs.dx,
    report: [
      { heading: cs.report[0][0], source: cs.report[0][1], body: cs.report[0][2] },
      {
        heading: 'Relevant history',
        source: 'Health record',
        body: sc.conditions.join('. ') + '. Current medication: ' + sc.meds.join(', ') + '. Allergies: ' + sc.allergy + '.',
      },
      { heading: cs.report[1][0], source: cs.report[1][1], body: cs.report[1][2] },
      { heading: cs.report[2][0], source: cs.report[2][1], body: cs.report[2][2] },
    ],
    readiness: [
      { label: 'Interview complete', state: 'Done', tint: 'var(--status-success-bg)', ink: 'var(--icaih-emerald-800)' },
      { label: 'Record reconciled', state: 'Done', tint: 'var(--status-success-bg)', ink: 'var(--icaih-emerald-800)' },
      { label: 'Vitals recorded', state: 'Done', tint: 'var(--status-success-bg)', ink: 'var(--icaih-emerald-800)' },
      { label: 'Troponin result', state: 'Pending', tint: 'var(--status-warning-bg)', ink: '#8a6304' },
      { label: 'Clinician sign-off', state: 'Waiting', tint: 'var(--status-warning-bg)', ink: '#8a6304' },
    ],
    flags: cs.flags,
    // A recorded run carries the model's own self-evaluation; otherwise the
    // scripted marking points stand in.
    evalHtml: (recorded && recorded.evaluation) || '',
    evalPoints: cs.evals.map(([heading, body]) => ({ heading, body })),
  }
}

const h3 = { margin: 0, font: 'var(--type-h3)', color: 'var(--text-heading)' }

function Setup({ vals }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1120 }}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={h3}>Select a patient</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 24 }}>
          {vals.scenarios.map((sc, i) => (
            <button
              key={i}
              onClick={sc.select}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 0, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
            >
              <div
                style={{
                  position: 'relative', height: 300, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  background: 'var(--neutral-100)', outlineOffset: 3, outline: sc.outline,
                }}
              >
                <video
                  ref={sc.ref}
                  src={sc.video}
                  poster={sc.poster}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <span
                  style={{
                    position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', pointerEvents: 'none',
                    padding: '5px 12px', borderRadius: 'var(--radius-xs)', background: 'var(--icaih-emerald-50)',
                    border: '1px solid var(--icaih-emerald-300)', color: 'var(--icaih-emerald-800)',
                    font: 'var(--type-label)', fontSize: 'var(--fs-caption)', maxWidth: 'calc(100% - 20px)', textAlign: 'center',
                  }}
                >
                  Synthetic health record (FHIR)
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ font: 'var(--type-body)', color: 'var(--text-heading)' }}>{sc.person}</span>
                <span style={{ font: 'var(--type-body)', fontSize: 'var(--fs-body-sm)', color: 'var(--text-muted)' }}>
                  Existing condition: {sc.existing}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={h3}>Explore a condition</h2>
        <p style={{ margin: 0, maxWidth: '82ch', font: 'var(--type-body)', color: 'var(--text-body)', textWrap: 'pretty' }}>
          A simulated persona speaks to a clinical assistant. Neither the persona nor the assistant is told the
          diagnosis. The assistant gathers and summarises the symptoms, and can read parts of the patient's health
          record as FHIR resources.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          {vals.conditions.map((c, i) => (
            <button
              key={i}
              onClick={c.select}
              style={{
                display: 'grid', gridTemplateColumns: '132px minmax(0, 1fr)', gap: 20, alignItems: 'start',
                textAlign: 'left', padding: 20, borderRadius: 'var(--radius-md)', cursor: 'pointer',
                transition: 'var(--transition-control)', background: c.bg, border: c.border,
              }}
            >
              <span style={{ font: 'var(--type-label)', fontSize: 'var(--fs-body)', color: 'var(--text-heading)' }}>{c.name}</span>
              <span style={{ font: 'var(--type-body)', fontSize: 'var(--fs-body-sm)', color: 'var(--text-body)', textWrap: 'pretty' }}>
                {c.blurb}
              </span>
            </button>
          ))}
        </div>
        <div style={{ paddingTop: 4 }}>
          <Button onClick={vals.launch}>Launch simulation</Button>
        </div>
      </section>
    </div>
  )
}

function Brief({ vals }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1080, margin: '0 auto' }}>
      <h2 style={{ margin: 0, textAlign: 'center', font: 'var(--type-h2)', color: 'var(--text-heading)' }}>
        What is happening in this simulation
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24, alignItems: 'start' }}>
        <section style={{ ...card, padding: 28, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <h3 style={{ margin: 0, font: 'var(--type-h4)', color: 'var(--text-heading)' }}>Pre-visit AI agent</h3>
            <span style={{ font: 'var(--type-mono)', color: 'var(--text-muted)' }}>Built with MedGemma 27b</span>
          </div>
          <span
            style={{
              width: 64, height: 64, borderRadius: 'var(--radius-md)', background: 'var(--icaih-emerald-50)',
              color: 'var(--brand-primary)', display: 'grid', placeItems: 'center',
            }}
          >
            <ActivityIcon size={30} />
          </span>
          <p style={{ margin: 0, font: 'var(--type-body)', color: 'var(--text-body)', textWrap: 'pretty' }}>
            The agent collects pre-visit information. It interviews the patient agent to gather what the clinician will
            need, and can read parts of the health record supplied as FHIR resources. It is not told the diagnosis. Its
            goal is symptoms, relevant history and current concerns, written up as a pre-visit report.
          </p>
        </section>

        <section style={{ ...card, padding: 28, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <h3 style={{ margin: 0, font: 'var(--type-h4)', color: 'var(--text-heading)' }}>
              Patient persona: {vals.patientName}
            </h3>
            <span style={{ font: 'var(--type-mono)', color: 'var(--text-muted)' }}>Simulated by Gemini 2.5 Flash</span>
          </div>
          <span
            style={{
              width: 64, height: 64, borderRadius: 'var(--radius-pill)', overflow: 'hidden',
              backgroundColor: 'var(--neutral-100)', backgroundImage: vals.patientPosterBg,
              backgroundSize: 'cover', backgroundPosition: 'center top',
            }}
          />
          <p style={{ margin: 0, font: 'var(--type-body)', color: 'var(--text-body)', textWrap: 'pretty' }}>
            A persona and a set of symptoms are given to the patient agent. It does not know its diagnosis either — it
            experiences related symptoms and concerns and shares them during the interview. Unrelated information is
            included as well, so the conversation carries the same noise a real intake does.
          </p>
        </section>
      </div>

      <p style={{ margin: 0, font: 'var(--type-body)', color: 'var(--text-body)', textWrap: 'pretty' }}>
        As the conversation develops, the agent{' '}
        <strong style={{ background: 'var(--icaih-emerald-50)', padding: '1px 4px', borderRadius: 'var(--radius-xs)', color: 'var(--icaih-emerald-800)' }}>
          builds and continually updates a live pre-visit report
        </strong>
        . Once the report exists, an evaluation is available: the reference diagnosis, withheld until then, is revealed
        and the agent writes a{' '}
        <strong style={{ background: 'var(--icaih-emerald-50)', padding: '1px 4px', borderRadius: 'var(--radius-xs)', color: 'var(--icaih-emerald-800)' }}>
          self-evaluation naming what it captured, what it only partly captured and what it missed
        </strong>
        .
      </p>

      <div>
        <Button onClick={vals.beginInterview}>Begin the interview</Button>
      </div>
    </div>
  )
}

function SpeakerIcon({ on }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H2v6h4l5 4z" />
      {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /> : <path d="m23 9-6 6M17 9l6 6" />}
    </svg>
  )
}

/* Three bars that animate only while a bubble's audio is playing. */
function Meter() {
  return (
    <span aria-hidden style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 12, marginLeft: 8 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 3, height: 12, borderRadius: 2, background: 'var(--brand-primary)', transformOrigin: 'bottom',
            animation: `os-meter .9s ${i * 0.15}s ease-in-out infinite`,
          }}
        />
      ))}
    </span>
  )
}

function Live({ vals }) {
  const endRef = useRef(null)

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [vals.turns.length])

  const toggle = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', cursor: 'pointer',
    borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-subtle)',
    background: 'var(--surface-card)', color: 'var(--text-body)',
    font: 'var(--type-label)', fontSize: 'var(--fs-caption)', transition: 'var(--transition-control)',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 32, alignItems: 'start' }}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingRight: 32, borderRight: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, font: 'var(--type-h4)', color: 'var(--text-heading)' }}>Simulated interview</h2>
          <span style={{ font: 'var(--type-mono)', color: 'var(--text-muted)' }}>{vals.speechLabel}</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
            <button
              type="button"
              onClick={vals.toggleAudio}
              className="hv-brand"
              style={{ ...toggle, color: vals.audioOn ? 'var(--brand-primary)' : 'var(--text-muted)' }}
              title={vals.audioOn ? 'Mute the voices' : 'Turn the voices on'}
            >
              <SpeakerIcon on={vals.audioOn} />
              {vals.audioOn ? 'Voice on' : 'Muted'}
            </button>
            <button
              type="button"
              onClick={vals.toggleFast}
              className="hv-brand"
              style={{ ...toggle, color: vals.fast ? 'var(--brand-primary)' : 'var(--text-muted)' }}
              title="Play the interview faster"
            >
              {vals.fast ? '1.35×' : '1×'}
            </button>
          </span>
        </div>

        <span style={{ font: 'var(--type-mono)', color: 'var(--text-muted)', marginTop: -8 }}>{vals.sourceLabel}</span>

        {vals.thinkingShown && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'os-rise .4s ease both' }}>
            <span
              style={{
                flex: 'none', width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                background: 'var(--icaih-emerald-50)', color: 'var(--brand-primary)', display: 'grid', placeItems: 'center',
              }}
            >
              <ActivityIcon />
            </span>
            <div
              style={{
                flex: 1, minWidth: 0, padding: '16px 18px', borderRadius: 'var(--radius-md)',
                background: 'var(--icaih-navy-50)', border: '1px solid var(--icaih-navy-100)',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              <span style={{ font: 'var(--type-label)', color: 'var(--brand-secondary)' }}>Thinking</span>
              <p style={{ margin: 0, font: 'var(--type-body)', fontSize: 'var(--fs-body-sm)', color: 'var(--neutral-700)', textWrap: 'pretty' }}>
                {vals.thinking}
              </p>
            </div>
          </div>
        )}

        {vals.turns.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: t.dir, animation: 'os-rise .4s ease both' }}>
            <span
              style={{
                flex: 'none', width: 34, height: 34, borderRadius: t.avatarRadius, overflow: 'hidden',
                background: t.avatarBg, color: 'var(--brand-primary)', display: 'grid', placeItems: 'center',
                font: 'var(--type-label)', fontSize: 'var(--fs-caption)',
                boxShadow: t.speaking ? '0 0 0 3px var(--icaih-emerald-100)' : 'none',
                transition: 'var(--transition-control)',
              }}
            >
              {t.avatar}
            </span>
            <p
              style={{
                margin: 0, maxWidth: '84%', padding: '14px 16px', borderRadius: 'var(--radius-md)',
                font: 'var(--type-body)', color: 'var(--text-body)', textWrap: 'pretty',
                background: t.bg, border: t.border,
              }}
            >
              {t.text}
              {t.speaking && vals.audioOn && <Meter />}
            </p>
          </div>
        ))}
        <div ref={endRef} />
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, font: 'var(--type-h4)', color: 'var(--text-heading)' }}>Generated report</h2>
          <span style={{ font: 'var(--type-mono)', color: 'var(--text-muted)' }}>
            {vals.interviewDone ? 'Complete' : 'Rewritten after every answer'}
          </span>
        </div>

        <div style={{ ...card, minHeight: 560, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {vals.reportHtml ? (
            <div className="ar-report" dangerouslySetInnerHTML={{ __html: vals.reportHtml }} />
          ) : (
            <span style={{ font: 'var(--type-mono)', color: 'var(--neutral-400)' }}>
              Waiting for the first answer · · ·
            </span>
          )}
          <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
            <Button onClick={vals.goReport}>Open the full pre-visit report</Button>
          </div>
        </div>

        <div
          style={{
            display: 'flex', gap: 12, alignItems: 'flex-start', padding: '16px 18px', borderRadius: 'var(--radius-md)',
            background: 'var(--status-warning-bg)', border: '1px solid rgba(192,139,6,.28)',
          }}
        >
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a6304" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: 2 }}
          >
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--neutral-800)', textWrap: 'pretty' }}>
            A demonstration only. It is not a finished or approved product, it does not diagnose or suggest treatment,
            and it must not be used for medical advice.
          </p>
        </div>
      </section>
    </div>
  )
}

function Report({ vals }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
      <section style={{ ...card, padding: 32, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={eyebrow}>Pre-visit report</span>
            <h2 style={h3}>{vals.patientLine}</h2>
            <span style={{ font: 'var(--type-mono)', color: 'var(--text-muted)' }}>
              Generated 09:38 · from interview and health record
            </span>
          </div>
          <span
            style={{
              padding: '6px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--status-warning-bg)',
              color: '#8a6304', font: 'var(--type-label)', fontSize: 'var(--fs-caption)',
            }}
          >
            Awaiting clinician sign-off
          </span>
        </div>

        {vals.report.map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 18, borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ margin: 0, font: 'var(--type-h4)', color: 'var(--text-heading)' }}>{s.heading}</h3>
              <span
                style={{
                  padding: '4px 10px', borderRadius: 'var(--radius-xs)', background: 'var(--icaih-emerald-50)',
                  border: '1px solid var(--icaih-emerald-100)', color: 'var(--icaih-emerald-800)',
                  font: 'var(--type-eyebrow)', letterSpacing: 'var(--ls-eyebrow)', textTransform: 'uppercase',
                }}
              >
                {s.source}
              </span>
            </div>
            <p style={{ margin: 0, font: 'var(--type-body)', color: 'var(--text-body)', textWrap: 'pretty' }}>{s.body}</p>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 12, paddingTop: 6 }}>
          <Button>Send to clinician</Button>
          <Button variant="outline">Download PDF report</Button>
          <Button variant="ghost" onClick={vals.goEval}>Evaluate this report</Button>
        </div>
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <section style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={eyebrow}>Readiness</span>
          {vals.readiness.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 'var(--fs-body-sm)' }}>
              <span style={{ color: 'var(--text-body)' }}>{r.label}</span>
              <span
                style={{
                  padding: '4px 10px', borderRadius: 'var(--radius-pill)', font: 'var(--type-label)',
                  fontSize: 'var(--fs-caption)', background: r.tint, color: r.ink,
                }}
              >
                {r.state}
              </span>
            </div>
          ))}
        </section>

        <section style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={eyebrow}>Flagged for the clinician</span>
          {vals.flags.map((f, i) => (
            <p key={i} style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--text-body)', textWrap: 'pretty' }}>{f}</p>
          ))}
        </section>

        <section
          style={{
            borderRadius: 'var(--radius-lg)', padding: '20px 24px', background: 'var(--icaih-navy-50)',
            border: '1px solid var(--icaih-navy-100)', display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          <span style={{ ...eyebrow, color: 'var(--brand-secondary)' }}>Scope</span>
          <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--neutral-700)', textWrap: 'pretty' }}>
            The report summarises what the patient said. It does not diagnose, triage or recommend treatment.
          </p>
        </section>
      </div>
    </div>
  )
}

function Evaluation({ vals }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
      <section style={{ ...card, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={eyebrow}>Evaluation</span>
          <h2 style={{ margin: 0, font: 'var(--type-h4)', color: 'var(--text-heading)' }}>
            How well did the report capture the case?
          </h2>
          <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--text-muted)', textWrap: 'pretty' }}>
            The model is shown the reference diagnosis after the fact and marks its own report against it.
          </p>
        </div>
        {vals.evalHtml ? (
          <div
            className="ar-report"
            style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--neutral-50)' }}
            dangerouslySetInnerHTML={{ __html: vals.evalHtml }}
          />
        ) : (
          vals.evalPoints.map((e, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--neutral-50)' }}>
              <span style={{ font: 'var(--type-label)', color: 'var(--text-heading)' }}>{e.heading}</span>
              <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-body)' }}>{e.body}</span>
            </div>
          ))
        )}
      </section>

      <section style={{ ...card, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span style={eyebrow}>Reference diagnosis</span>
        <p style={{ margin: 0, font: 'var(--type-body-lg)', color: 'var(--text-heading)', textWrap: 'pretty' }}>{vals.referenceDx}</p>
        <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--text-body)', textWrap: 'pretty' }}>
          Held back from the interview and revealed only for scoring.
        </p>
      </section>
    </div>
  )
}

export default function AppointmentReady({ vals }) {
  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {vals.isSetup && <Setup vals={vals} />}
      {vals.isBrief && <Brief vals={vals} />}
      {vals.isLive && <Live vals={vals} />}
      {vals.isReport && <Report vals={vals} />}
      {vals.isEval && <Evaluation vals={vals} />}
    </div>
  )
}
