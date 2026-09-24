import { useEffect, useRef, useState } from 'react'
import { ehrCases, ehrEventsFor } from '../data/ehr.js'
import { ChevronLeftIcon, Disclaimer, eyebrow } from '../components/common.jsx'

const HF = 'https://huggingface.co/spaces/google/ehr-navigator-agent-with-medgemma/resolve/main/static/'

/* State + derived values, mirroring `ehrVals()` in the design source. Held above
   the view so a trace survives navigating to another tool and back. */
export function useEhrNavigator() {
  const [caseIdx, setCaseIdx] = useState(0)
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const [screen, setScreen] = useState('intro')
  const timers = useRef([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  // One step every 620ms, so the request/response pairs read at a human pace.
  const run = (idx) => {
    clearTimers()
    const total = ehrEventsFor(ehrCases[idx]).length
    setStep(0)
    setRunning(true)
    for (let n = 1; n <= total; n++) {
      timers.current.push(
        setTimeout(() => {
          setStep(n)
          setRunning(n < total)
        }, n * 620),
      )
    }
  }

  const c = ehrCases[caseIdx]
  const all = ehrEventsFor(c)
  const shown = all.slice(0, step)
  const last = shown.length ? shown[shown.length - 1] : null
  const live = running && last && !last.final
  const lit = (who) => (live && last.dest === who ? 'var(--brand-primary)' : 'var(--border-subtle)')
  const litBg = (who) => (live && last.dest === who ? 'var(--icaih-emerald-50)' : 'var(--surface-card)')

  return {
    picker: ehrCases.map((x, i) => ({
      question: x.question,
      patient: 'Patient ' + x.patient.slice(0, 8),
      bg: i === caseIdx ? 'var(--icaih-emerald-50)' : 'var(--surface-card)',
      bd: i === caseIdx ? 'var(--brand-primary)' : 'var(--border-subtle)',
      pick: () => {
        setCaseIdx(i)
        run(i)
      },
    })),
    started: step > 0,
    progress: step + ' / ' + all.length + ' steps',
    llmBd: lit('LLM'),
    llmBg: litBg('LLM'),
    fhirBd: lit('FHIR'),
    fhirBg: litBg('FHIR'),
    agentBd: live ? 'var(--brand-primary)' : 'var(--border-subtle)',
    events: shown.map((x, i) => ({
      arrow: x.d === 'req' ? '→' : '←',
      dest: x.dest,
      e: x.e,
      data: x.data || '',
      hasData: !!x.data,
      fg: x.d === 'req' ? 'var(--neutral-500)' : 'var(--brand-primary)',
      weight: i === shown.length - 1 ? '600' : '400',
    })),
    done: !!(last && last.final),
    notStarted: step === 0,
    isIntro: screen === 'intro',
    isStage: screen === 'stage',
    view: () => setScreen('stage'),
    back: () => {
      clearTimers()
      setScreen('intro')
      setStep(0)
      setRunning(false)
    },
    intro: c.intro,
    sections: c.sections,
  }
}

export default function EhrNavigator({ vals }) {
  if (vals.isIntro) {
    return (
      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>
        <div
          style={{
            width: '100%',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--neutral-50)',
            backgroundImage: `url(${HF}background.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <img
            src={HF + 'intro.svg'}
            alt="Agent, MedGemma and the FHIR store"
            style={{ width: '100%', maxWidth: 560, height: 'auto', display: 'block' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 660 }}>
          <span style={eyebrow}>Built with MedGemma</span>
          <h2 style={{ margin: 0, font: 'var(--type-h2)', color: 'var(--text-heading)' }}>EHR navigator agent</h2>
          <p style={{ margin: 0, font: 'var(--type-body-lg)', color: 'var(--text-body)', textWrap: 'pretty' }}>
            In a clinical setting, agents are crucial for navigating and utilising vast electronic health record data,
            often stored in FHIR format. An agent can efficiently answer specific questions or perform tasks related to
            a patient by intelligently fetching the most relevant information from their potentially very large and
            complex record.
          </p>
          <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--text-body)', textWrap: 'pretty' }}>
            This demo showcases how an agent can use MedGemma's comprehension of the Fast Healthcare Interoperability
            Resources (FHIR) standard to intelligently navigate a patient's health records. The agent first identifies
            what information is available, then plans how to retrieve the relevant parts. It fetches data in steps,
            extracting key facts along the way, and finally combines all these facts to provide a complete answer. This
            is a simplified example to illustrate the process. All patient data in this demo is synthetic, generated by
            Synthea.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
            <span
              style={{
                flex: 'none',
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--icaih-navy)',
                color: '#fff',
                font: 'var(--type-eyebrow)',
                letterSpacing: 'var(--ls-eyebrow)',
                textTransform: 'uppercase',
              }}
            >
              Disclaimer
            </span>
            <span style={{ fontSize: 'var(--fs-caption, 13px)', color: 'var(--neutral-500)', textWrap: 'pretty' }}>
              This demonstration is for illustrative purposes only and does not represent a finished or approved
              product. It is not representative of compliance to any regulations or standards for quality, safety or
              efficacy. Any real-world application would require additional development, training and adaptation.
            </span>
          </div>
          <div style={{ display: 'flex', paddingTop: 4 }}>
            <button
              onClick={vals.view}
              style={{
                padding: '13px 26px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                background: 'var(--brand-primary)',
                color: '#fff',
                font: 'var(--type-label)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-brand)',
              }}
            >
              View demo
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 32px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={vals.back}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: 'none',
            background: 'transparent', color: 'var(--text-body)', font: 'var(--type-label)', cursor: 'pointer',
          }}
        >
          <ChevronLeftIcon />
          Back
        </button>
        <span style={{ font: 'var(--type-mono)', color: 'var(--neutral-500)' }}>{vals.progress}</span>
      </div>

      <div
        style={{
          borderRadius: 'var(--radius-xl, 24px)',
          border: '1px solid var(--border-subtle)',
          background: 'var(--surface-card)',
          boxShadow: 'var(--shadow-xs)',
          padding: 28,
          display: 'grid',
          gridTemplateColumns: '212px minmax(0, 1fr)',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            borderRight: '1px solid var(--border-subtle)', paddingRight: 24,
          }}
        >
          <span style={{ font: 'var(--type-label)', color: 'var(--text-heading)' }}>Clinician</span>
          <div style={{ width: 118, height: 118, borderRadius: '50%', overflow: 'hidden', background: 'var(--neutral-100)' }}>
            <img src={HF + 'clinician.avif'} alt="Clinician" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <span style={{ font: 'var(--type-label)', color: 'var(--text-heading)', paddingTop: 8 }}>Select a task</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            {vals.picker.map((q, i) => (
              <button
                key={i}
                onClick={q.pick}
                className="hv-brand-border"
                style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: 'var(--radius-md)',
                  border: `1px solid ${q.bd}`, background: q.bg, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}
              >
                <span style={{ fontSize: 'var(--fs-body-sm, 15px)', color: 'var(--text-heading)', textWrap: 'pretty' }}>{q.question}</span>
                <span style={{ font: 'var(--type-mono)', color: 'var(--neutral-500)' }}>{q.patient}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <span style={{ font: 'var(--type-label)', color: 'var(--text-heading)' }}>EHR navigator agent</span>
            <div
              style={{
                width: 104, height: 104, borderRadius: 'var(--radius-lg)', display: 'grid', placeItems: 'center',
                border: `2px solid ${vals.agentBd}`, transition: 'border-color 200ms ease-out',
              }}
            >
              <img src={HF + 'agent.svg'} alt="Agent" style={{ width: 68, height: 68, display: 'block' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 20 }}>
            <div
              style={{
                minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 14,
                borderRadius: 'var(--radius-lg)', border: `2px solid ${vals.llmBd}`, background: vals.llmBg,
                transition: 'all 200ms ease-out',
              }}
            >
              <img src={HF + 'medgemma.avif'} alt="MedGemma" style={{ width: '100%', height: 'auto', maxHeight: 62, display: 'block' }} />
              <span style={{ font: 'var(--type-label)', color: 'var(--text-heading)' }}>MedGemma</span>
              <span style={{ fontSize: 'var(--fs-caption, 13px)', color: 'var(--neutral-500)' }}>(Vertex AI)</span>
            </div>
            <div
              style={{
                minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 14,
                borderRadius: 'var(--radius-lg)', border: `2px solid ${vals.fhirBd}`, background: vals.fhirBg,
                transition: 'all 200ms ease-out',
              }}
            >
              <img src={HF + 'fhir-colors.svg'} alt="FHIR" style={{ height: 56, width: 'auto', maxWidth: '100%', display: 'block' }} />
              <span style={{ font: 'var(--type-label)', color: 'var(--text-heading)', textAlign: 'center', textWrap: 'pretty' }}>
                Electronic health record
              </span>
              <span style={{ fontSize: 'var(--fs-caption, 13px)', color: 'var(--neutral-500)' }}>(FHIR store)</span>
            </div>
          </div>

          {vals.started && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={eyebrow}>Agent trace</span>
              {vals.events.map((ev, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid', gridTemplateColumns: '20px 54px minmax(0, 1fr)', gap: 10, alignItems: 'start',
                    padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--neutral-50)',
                  }}
                >
                  <span style={{ font: 'var(--type-mono)', color: ev.fg }}>{ev.arrow}</span>
                  <span
                    style={{
                      font: 'var(--type-eyebrow)', letterSpacing: 'var(--ls-eyebrow)',
                      color: 'var(--neutral-500)', paddingTop: 3,
                    }}
                  >
                    {ev.dest}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <span style={{ fontSize: 'var(--fs-body-sm, 15px)', color: 'var(--text-body)', fontWeight: ev.weight, textWrap: 'pretty' }}>
                      {ev.e}
                    </span>
                    {ev.hasData && (
                      <span style={{ font: 'var(--type-mono)', color: 'var(--neutral-600)', wordBreak: 'break-word', textWrap: 'pretty' }}>
                        {ev.data}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}

          {vals.done && (
            <section
              style={{
                padding: 22, borderRadius: 'var(--radius-lg)', background: 'var(--neutral-50)',
                border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 14,
              }}
            >
              <span style={eyebrow}>Final answer</span>
              <p style={{ margin: 0, font: 'var(--type-body-lg)', color: 'var(--text-body)', textWrap: 'pretty' }}>{vals.intro}</p>
              {vals.sections.map((sec, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 'var(--fs-body-sm)', fontWeight: 600, color: 'var(--text-heading)' }}>{sec.title}</span>
                  {sec.items.map((t, j) => (
                    <span key={j} style={{ font: 'var(--type-mono)', color: 'var(--text-body)' }}>{t}</span>
                  ))}
                </div>
              ))}
            </section>
          )}

          {vals.notStarted && (
            <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--neutral-500)' }}>
              Select a task on the left. The agent will plan its retrieval, call MedGemma and the FHIR store in turn,
              and combine the facts it gathers into an answer.
            </p>
          )}

          <Disclaimer>
            All patient data here is synthetic, generated by Synthea and served from a public FHIR store. This
            demonstration is for illustrative purposes only and does not represent a finished or approved product.
          </Disclaimer>
        </div>
      </div>
    </div>
  )
}
