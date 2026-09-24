import { useState } from 'react'
import { radBase, radCases } from '../data/radiology.js'
import { card, Disclaimer, eyebrow } from '../components/common.jsx'

/* Mirrors `radVals()` in the design source. */
export function useRadiologyExplainer() {
  const [caseIdx, setCaseIdx] = useState(0)
  const [sentIdx, setSentIdx] = useState(null)
  const [showDemoInfo, setShowDemoInfo] = useState(false)

  const active = radCases[caseIdx]
  const sel = sentIdx == null ? null : active.sentences[sentIdx]

  const tab = (modality) =>
    radCases
      .map((c, i) => ({ c, i }))
      .filter((x) => x.c.modality === modality)
      .map(({ c, i }) => ({
        name: c.name,
        bg: i === caseIdx ? 'var(--brand-primary)' : 'var(--surface-card)',
        fg: i === caseIdx ? '#fff' : 'var(--text-body)',
        bd: i === caseIdx ? 'var(--brand-primary)' : 'var(--border-subtle)',
        select: () => {
          setCaseIdx(i)
          setSentIdx(null)
        },
      }))

  return {
    cxrCases: tab('CXR'),
    ctCases: tab('CT'),
    caseName: active.name,
    modalityLabel: active.label,
    isCT: active.modality === 'CT',
    imgUrl: radBase + active.file,
    explanation: sel ? sel.e : 'Click a sentence to see the explanation here.',
    sentences: active.sentences.map((s, i) => ({
      t: s.t + ' ',
      bg: i === sentIdx ? 'var(--icaih-emerald-50)' : 'transparent',
      fg: i === sentIdx ? 'var(--text-heading)' : 'var(--text-body)',
      sh: i === sentIdx ? 'inset 0 -2px 0 var(--brand-primary)' : 'none',
      select: () => setSentIdx(i),
    })),
    showDemoInfo,
    openDemoInfo: () => setShowDemoInfo(true),
    closeDemoInfo: () => setShowDemoInfo(false),
  }
}

function CaseButton({ c }) {
  return (
    <button
      onClick={c.select}
      style={{
        textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
        border: `1px solid ${c.bd}`, background: c.bg, color: c.fg, font: 'var(--type-label)',
        cursor: 'pointer', transition: 'background 120ms var(--ease-out, ease-out)',
      }}
    >
      {c.name}
    </button>
  )
}

export default function RadiologyExplainer({ vals }) {
  return (
    <>
      <div
        style={{
          padding: '24px 32px 32px',
          display: 'grid',
          gridTemplateColumns: '186px minmax(0, 1fr) minmax(0, 1.05fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={eyebrow}>X-ray</span>
            {vals.cxrCases.map((c, i) => <CaseButton key={i} c={c} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={eyebrow}>CT</span>
            {vals.ctCases.map((c, i) => <CaseButton key={i} c={c} />)}
          </div>
          <button
            onClick={vals.openDemoInfo}
            className="hv-brand"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', padding: '10px 12px',
              borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)', background: 'transparent',
              color: 'var(--neutral-600)', font: 'var(--type-label)', cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m16 18 6-6-6-6" />
              <path d="m8 6-6 6 6 6" />
            </svg>
            Details about this demo
          </button>
        </aside>

        <section style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <span style={eyebrow}>{vals.modalityLabel}</span>
            <span style={{ font: 'var(--type-mono)', color: 'var(--neutral-500)' }}>{vals.caseName}</span>
          </div>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-md)', background: '#0b1230', aspectRatio: '1 / 1' }}>
            <img src={vals.imgUrl} alt={vals.caseName} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </div>
          {vals.isCT && (
            <span style={{ fontSize: 'var(--fs-caption, 13px)', color: 'var(--neutral-500)', textWrap: 'pretty' }}>
              This shows a single slice of the CT. Not all elements in the report can be visualised.
            </span>
          )}
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 168 }}>
            <span style={eyebrow}>What this means</span>
            <p style={{ margin: 0, font: 'var(--type-body-lg)', color: 'var(--text-body)', textWrap: 'pretty' }}>{vals.explanation}</p>
          </section>

          <section style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={eyebrow}>Report</span>
            <p style={{ margin: 0, fontSize: 'var(--fs-body, 16px)', lineHeight: 1.95, color: 'var(--text-body)' }}>
              {vals.sentences.map((s, i) => (
                <span
                  key={i}
                  onClick={s.select}
                  className="hv-neutral-bg"
                  style={{
                    cursor: 'pointer', padding: '2px 3px', borderRadius: 4, background: s.bg, color: s.fg,
                    boxShadow: s.sh, transition: 'background 120ms var(--ease-out, ease-out)',
                  }}
                >
                  {s.t}
                </span>
              ))}
            </p>
            <Disclaimer>
              This demonstration is for illustrative purposes only. It does not represent a finished or approved
              product, is not intended to diagnose or suggest treatment of any disease or condition, and should not be
              used for medical advice.
            </Disclaimer>
          </section>
        </div>
      </div>

      {vals.showDemoInfo && (
        <div
          onClick={vals.closeDemoInfo}
          style={{
            position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(11, 18, 48, 0.55)',
            backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 32,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(680px, 100%)', maxHeight: '80vh', overflow: 'auto', background: 'var(--surface-card)',
              borderRadius: 'var(--radius-xl, 24px)', boxShadow: 'var(--shadow-lg)', padding: 32,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}
          >
            <h2 style={{ margin: 0, font: 'var(--type-h4)', color: 'var(--text-heading)' }}>Details about this demo</h2>
            <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--text-body)', textWrap: 'pretty' }}>
              <strong>The model.</strong> This demo features MedGemma-4B, a Gemma 3-based model fine-tuned for
              comprehending medical text and images such as chest X-rays. It shows how such a model can be built upon to
              explore radiology images and their reports in simple language, with visual cues marking the relevant area
              of the image.
            </p>
            <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--text-body)', textWrap: 'pretty' }}>
              <strong>Health AI Developer Foundations</strong> provides a collection of open-weight models and companion
              resources for developers building AI for healthcare.
            </p>
            <p style={{ margin: 0, fontSize: 'var(--fs-body-sm)', color: 'var(--text-body)', textWrap: 'pretty' }}>
              <strong>Disclaimer.</strong> This demonstration is for illustrative purposes only and does not represent a
              finished or approved product. It is not representative of compliance with any regulations or standards for
              quality, safety or efficacy. Any real-world application would require additional development, training and
              adaptation.
            </p>
            <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
              <button
                onClick={vals.closeDemoInfo}
                style={{
                  padding: '11px 20px', borderRadius: 'var(--radius-sm)', border: 'none',
                  background: 'var(--brand-primary)', color: '#fff', font: 'var(--type-label)', cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
