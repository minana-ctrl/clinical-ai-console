import { useState } from 'react'
import { lcCases, lcSamples } from '../data/learning.js'
import { card, Disclaimer, eyebrow, MEDGEMMA_BASELINE_NOTE } from '../components/common.jsx'

const WHO_MANUAL = 'https://www.who.int/publications/i/item/9241546778'

/* Mirrors `lcVals()`, `lcOpen()` and `lcPick()` in the design source. */
export function useLearningCompanion() {
  const [step, setStep] = useState(0)
  const [caseIdx, setCaseIdx] = useState(0)
  const [qIdx, setQIdx] = useState(0)
  const [log, setLog] = useState([])
  const [attempts, setAttempts] = useState({})
  const [results, setResults] = useState([])

  const open = (i) => {
    const c = lcCases[i]
    setStep(2)
    setCaseIdx(i)
    setQIdx(0)
    setAttempts({})
    setResults([])
    setLog([{ k: 'sys', t: "Okay, let's start with Case " + c.id + '. ' + c.questions[0].question }])
  }

  // One retry per question: a first wrong answer earns a hint, a second reveals the answer.
  const pick = (key) => {
    const c = lcCases[caseIdx]
    const qi = qIdx
    const q = c.questions[qi]
    const nextLog = log.slice()
    const tries = attempts[qi] || []
    const nextResults = results.slice()

    nextLog.push({ k: 'user', t: 'You responded: "' + q.choices[key] + '"' })

    let next = qi
    let tried = tries
    let done = false

    if (key === q.answer) {
      nextLog.push({ k: 'sys', t: "That's right. " + q.rationale })
      done = true
    } else if (tries.length < 1) {
      tried = tries.concat([key])
      nextLog.push({ k: 'sys', t: "That's not quite right. Would you like to try again?", hint: 'Hint: ' + q.hint })
    } else {
      tried = tries.concat([key])
      nextLog.push({ k: 'sys', t: "That's not right. The correct answer is \"" + q.choices[q.answer] + '". ' + q.rationale })
      done = true
    }

    if (done) {
      nextResults[qi] = { correct: key === q.answer, first: tried.length ? tried[0] : key }
      next = qi + 1
      if (next < c.questions.length) {
        nextLog.push({ k: 'sys', t: 'Question ' + (next + 1) + ': ' + c.questions[next].question })
      }
    }

    setLog(nextLog)
    setQIdx(next)
    setResults(nextResults)
    setAttempts({ ...attempts, [qi]: tried })
  }

  const c = lcCases[caseIdx]
  const qs = c.questions
  const cur = qIdx < qs.length ? qs[qIdx] : null
  const tried = attempts[qIdx] || []
  const answered = results.filter(Boolean).length

  return {
    isLanding: step === 0,
    isSelect: step === 1,
    isChat: step === 2,
    isSummary: step === 3,
    caseTitle: 'Case ' + c.id,
    img: lcSamples + c.img,
    findings: c.findings,
    summaryTitle: 'Case ' + c.id + ' review and summary',
    guidelineLine: 'You can always reference the condition "' + c.condition + '" in',
    progress: answered + ' / ' + qs.length + ' questions answered',
    start: () => setStep(1),
    exit: () => setStep(0),
    library: lcCases.map((x, i) => ({
      title: 'Case ' + x.id,
      img: lcSamples + x.img,
      open: () => open(i),
    })),
    log: log.map((m) => ({
      t: m.t,
      hint: m.hint || '',
      hasHint: !!m.hint,
      align: m.k === 'user' ? 'flex-end' : 'flex-start',
      bg: m.k === 'user' ? 'var(--icaih-emerald-50)' : 'var(--neutral-50)',
      radius: m.k === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
    })),
    options: cur
      ? Object.keys(cur.choices).map((k) => ({
          label: cur.choices[k],
          dim: tried.indexOf(k) === -1 ? '1' : '0.45',
          bd: tried.indexOf(k) === -1 ? 'var(--border-subtle)' : '#b3261e',
          pick: tried.indexOf(k) === -1 ? () => pick(k) : () => {},
        }))
      : [],
    finished: qIdx >= qs.length,
    goSummary: () => setStep(3),
    review: qs.map((q, i) => {
      const r = results[i]
      const out = []
      if (!r) out.push({ type: 'Not answered', text: 'You did not reach this question.' })
      else if (r.correct && r.first === q.answer) out.push({ type: 'Correct', text: q.rationale })
      else if (r.correct) {
        out.push({ type: 'Incorrect', text: 'You first chose "' + q.choices[r.first] + '".' })
        out.push({ type: 'Correct', text: q.rationale })
      } else {
        out.push({ type: 'Incorrect', text: 'The correct answer is "' + q.choices[q.answer] + '". ' + q.rationale })
      }
      const ok = !!r && r.correct && r.first === q.answer
      return {
        n: 'Q' + (i + 1),
        q: q.question,
        outcomes: out,
        bd: ok ? 'var(--brand-primary)' : 'var(--neutral-300, #cdd3de)',
      }
    }),
  }
}

const primaryButton = {
  padding: '12px 22px',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  background: 'var(--brand-primary)',
  color: '#fff',
  font: 'var(--type-label)',
  cursor: 'pointer',
  boxShadow: 'var(--shadow-brand)',
}

function Landing({ vals }) {
  return (
    <div style={{ ...card, maxWidth: 760, margin: '8px auto', padding: 40, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <span style={eyebrow}>Built with MedGemma</span>
      <h2 style={{ margin: 0, font: 'var(--type-h3)', color: 'var(--text-heading)' }}>Radiology learning companion</h2>
      <p style={{ margin: 0, font: 'var(--type-body-lg)', color: 'var(--text-body)', textWrap: 'pretty' }}>
        An interactive educational tool for medical students, to hone their radiological assessment skills for chest
        X-rays. Start by selecting an image from the example set, then work through a series of targeted multiple-choice
        questions.
      </p>
      <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--text-body)', textWrap: 'pretty' }}>
        Once you have finished, the companion reveals its own interpretation with a rationale drawn from the radiograph
        and from clinical guidelines, then sets it against your responses.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {vals.library.map((lc, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ aspectRatio: '1 / 1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#0b1230' }}>
              <img src={lc.img} alt={lc.title} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
            <span style={{ font: 'var(--type-mono)', color: 'var(--neutral-500)' }}>{lc.title}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--text-body)', textWrap: 'pretty' }}>
        The example set is two chest X-rays from the CXR-14 dataset. Each is paired with a curated single condition
        label; labelling prioritises educationally relevant findings to power a focused learning experience, for
        demonstration purposes only.
      </p>
      <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--text-body)', textWrap: 'pretty' }}>
        MedGemma uses retrieval-augmented generation to pull additional context from{' '}
        <a href={WHO_MANUAL} target="_blank" rel="noopener noreferrer">the WHO manual of diagnostic imaging</a>, so every
        question rationale and hint is grounded in that guideline rather than generated unsupported. Developers can swap
        in other guidelines the same way.
      </p>
      <Disclaimer>{MEDGEMMA_BASELINE_NOTE}</Disclaimer>
      <div style={{ display: 'flex', paddingTop: 4 }}>
        <button onClick={vals.start} style={primaryButton}>Start learning</button>
      </div>
    </div>
  )
}

function Select({ vals }) {
  return (
    <div style={{ maxWidth: 820, margin: '8px auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={eyebrow}>Case library</span>
        <h2 style={{ margin: 0, font: 'var(--type-h4)', color: 'var(--text-heading)' }}>Select a case</h2>
        <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--neutral-600)' }}>
          This demo uses 2 chest X-rays as an example set. Image source: CXR-14 dataset.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
        {vals.library.map((lc, i) => (
          <button
            key={i}
            onClick={lc.open}
            className="hv-lift-shadow"
            style={{ ...card, textAlign: 'left', padding: 0, overflow: 'hidden', cursor: 'pointer' }}
          >
            <div style={{ height: 300, background: '#0b1230' }}>
              <img src={lc.img} alt={lc.title} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
            <div style={{ padding: 16 }}>
              <span style={{ font: 'var(--type-h6, 600 16px/1.3 Poppins, sans-serif)', color: 'var(--text-heading)' }}>{lc.title}</span>
            </div>
          </button>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--neutral-600)', textWrap: 'pretty' }}>
        MedGemma uses retrieval to draw additional context from{' '}
        <a href={WHO_MANUAL} target="_blank" rel="noopener noreferrer">the WHO manual of diagnostic imaging</a>, grounding
        every rationale and hint in the guideline.
      </p>
      <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--neutral-600)', textWrap: 'pretty' }}>
        The experience assumes basic medical knowledge and is designed to guide you through a case, building
        understanding along the way.
      </p>
    </div>
  )
}

function Chat({ vals }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', gap: 20, alignItems: 'start' }}>
      <section style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <span style={eyebrow}>Chest X-ray</span>
          <span style={{ font: 'var(--type-mono)', color: 'var(--neutral-500)' }}>{vals.caseTitle}</span>
        </div>
        <div style={{ aspectRatio: '1 / 1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#0b1230' }}>
          <img src={vals.img} alt={vals.caseTitle} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ font: 'var(--type-mono)', color: 'var(--neutral-500)' }}>{vals.progress}</span>
          <button
            onClick={vals.exit}
            style={{
              padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)',
              background: 'transparent', color: 'var(--text-body)', font: 'var(--type-label)', cursor: 'pointer',
            }}
          >
            Exit
          </button>
        </div>

        <section style={{ ...card, padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {vals.log.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex', flexDirection: 'column', alignSelf: m.align, maxWidth: '88%', gap: 6,
                padding: '12px 14px', borderRadius: m.radius, background: m.bg,
              }}
            >
              <span style={{ fontSize: 'var(--fs-body-sm, 15px)', color: 'var(--text-body)', textWrap: 'pretty' }}>{m.t}</span>
              {m.hasHint && (
                <span style={{ fontSize: 'var(--fs-caption, 13px)', color: 'var(--brand-primary)', textWrap: 'pretty' }}>{m.hint}</span>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
            {vals.options.map((o, i) => (
              <button
                key={i}
                onClick={o.pick}
                className="hv-emerald-bg"
                style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${o.bd}`, background: 'var(--surface-card)', color: 'var(--text-body)',
                  fontSize: 'var(--fs-body-sm, 15px)', cursor: 'pointer', opacity: o.dim,
                  transition: 'background 120ms ease-out',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>

          {vals.finished && (
            <div style={{ display: 'flex', paddingTop: 4 }}>
              <button onClick={vals.goSummary} style={primaryButton}>Go to case review and summary</button>
            </div>
          )}
        </section>

        <Disclaimer>{MEDGEMMA_BASELINE_NOTE}</Disclaimer>
      </div>
    </div>
  )
}

function Summary({ vals }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)', gap: 20, alignItems: 'start' }}>
      <section style={{ ...card, padding: 20, position: 'sticky', top: 24 }}>
        <div style={{ aspectRatio: '1 / 1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#0b1230' }}>
          <img src={vals.img} alt={vals.caseTitle} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ margin: 0, font: 'var(--type-h4)', color: 'var(--text-heading)' }}>{vals.summaryTitle}</h2>
          <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--neutral-600)' }}>
            Thanks for taking this learning journey.
          </p>
          <span style={eyebrow}>Potential findings</span>
          <p style={{ margin: 0, font: 'var(--type-body-lg)', color: 'var(--text-body)', textWrap: 'pretty' }}>{vals.findings}</p>
        </section>

        <section style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={eyebrow}>Response review</span>
          {vals.review.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px',
                borderRadius: 'var(--radius-md)', background: 'var(--neutral-50)', borderLeft: `3px solid ${r.bd}`,
              }}
            >
              <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-heading)', fontWeight: 600, textWrap: 'pretty' }}>
                {r.n}: {r.q}
              </span>
              {r.outcomes.map((o, j) => (
                <span key={j} style={{ fontSize: 'var(--fs-caption, 13px)', color: 'var(--neutral-600)', textWrap: 'pretty' }}>
                  <strong>{o.type}</strong> — {o.text}
                </span>
              ))}
            </div>
          ))}
          <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--neutral-600)', textWrap: 'pretty' }}>
            {vals.guidelineLine}{' '}
            <a href={WHO_MANUAL} target="_blank" rel="noopener noreferrer">the WHO manual of diagnostic imaging</a>.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={vals.start}
              style={{
                padding: '11px 20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)',
                background: 'transparent', color: 'var(--text-body)', font: 'var(--type-label)', cursor: 'pointer',
              }}
            >
              Try another case
            </button>
          </div>
        </section>

        <Disclaimer>{MEDGEMMA_BASELINE_NOTE}</Disclaimer>
      </div>
    </div>
  )
}

export default function LearningCompanion({ vals }) {
  return (
    <div style={{ padding: '24px 32px 40px' }}>
      {vals.isLanding && <Landing vals={vals} />}
      {vals.isSelect && <Select vals={vals} />}
      {vals.isChat && <Chat vals={vals} />}
      {vals.isSummary && <Summary vals={vals} />}
    </div>
  )
}
