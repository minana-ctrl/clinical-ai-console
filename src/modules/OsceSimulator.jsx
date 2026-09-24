import { useEffect, useRef, useState } from 'react'
import { osChartRows, osDxList, osMgmtList, osQuestions, osTestList, osVitalRows } from '../data/osce.js'
import { OPENING_LINE, startCall, voiceReady } from '../lib/osceVoice.js'
import { card, ChevronLeftIcon, mutedEyebrow } from '../components/common.jsx'

const STATION_SECONDS = 480

/* Mirrors `osceVals()` and its helper methods in the design source. */
export function useOsceSimulator() {
  const [screen, setScreen] = useState('ward')
  const [asked, setAsked] = useState([])
  const [convo, setConvo] = useState([])
  // 'idle' | 'connecting' | 'live' | 'paused' — state of the patient call.
  const [call, setCall] = useState('idle')
  const [typing, setTyping] = useState(false)
  const [listen, setListen] = useState(false)
  const [caption, setCaption] = useState('')
  const [vitalsN, setVitalsN] = useState(0)
  const [exam, setExam] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [testSel, setTestSel] = useState(null)
  const [results, setResults] = useState([])
  const [dx, setDx] = useState(null)
  const [mgmt, setMgmt] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [shown, setShown] = useState(0)

  const timers = useRef([])
  const clock = useRef(null)
  const counter = useRef(null)
  // The scheduled caption words read this, not React state, so a released mic
  // stops the transcript mid-sentence rather than finishing it.
  const listening = useRef(false)
  const session = useRef(null)

  const voiceOn = voiceReady()

  const endCall = () => {
    if (session.current) {
      const s = session.current
      session.current = null
      s.end()
    }
    setCall('idle')
  }

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      clearInterval(clock.current)
      clearInterval(counter.current)
      if (session.current) session.current.end()
    },
    [],
  )

  const startClock = () => {
    clearInterval(clock.current)
    clock.current = setInterval(() => setElapsed((e) => e + 1), 1000)
  }
  const stopClock = () => clearInterval(clock.current)

  /* Streaming transcript bubbles: a live entry updates in place until done. */
  const pushTurn = (who, text, done) => {
    setConvo((c) => {
      const last = c[c.length - 1]
      if (last && last.who === who && last.live) {
        return c.slice(0, -1).concat({ who, text, live: !done })
      }
      return c.concat({ who, text, live: !done })
    })
  }

  const markAsked = (id) => {
    if (!osQuestions.some((q) => q.id === id)) return
    setAsked((a) => (a.indexOf(id) > -1 ? a : a.concat(id)))
  }

  /* A question asked via the typed chips. On a live call it is fed into the
     session and Ama answers by voice; otherwise the scripted pair is appended
     directly. `asked` drives coverage, marking and the debrief either way. */
  const deliver = (q, studentText) => {
    markAsked(q.id)
    setCaption('')
    if (session.current) {
      pushTurn('s', studentText, true)
      session.current.sendText(studentText)
      return
    }
    setConvo((c) => c.concat({ who: 's', text: studentText }, { who: 'p', text: q.a }))
    listening.current = false
    setListen(false)
  }

  // Scripted fallback only: 'meds' stays unreachable by mic — it is the omission
  // the debrief marks. On a live call the student can genuinely ask (or miss) it.
  const nextByMic = osQuestions.find((q) => asked.indexOf(q.id) < 0 && q.id !== 'meds')

  const answerCall = async () => {
    setCall('connecting')
    setCaption('')
    try {
      session.current = await startCall({
        onTurn: pushTurn,
        onMarked: markAsked,
        onEnded: () => {
          // Only a drop we did not initiate lands here with a session still set.
          if (session.current) {
            session.current = null
            setCall('idle')
            setCaption('Call ended — tap to reconnect.')
          }
        },
      })
      setCall('live')
    } catch {
      session.current = null
      setCall('idle')
      setCaption('Could not start the call — check microphone permissions and try again.')
    }
  }

  // Voice mode: one button answers, pauses and resumes the call.
  // Scripted fallback: first tap plays the caption, second tap asks.
  const micToggle = () => {
    if (voiceOn) {
      if (call === 'idle') answerCall()
      else if (call === 'live') {
        session.current?.pause()
        setCall('paused')
      } else if (call === 'paused') {
        session.current?.resume()
        setCall('live')
      }
      return
    }
    if (listening.current) {
      listening.current = false
      setListen(false)
      setCaption('')
      if (nextByMic) deliver(nextByMic, nextByMic.q)
      return
    }
    if (!nextByMic) return
    listening.current = true
    setListen(true)
    setCaption('')
    const words = nextByMic.q.split(' ')
    words.forEach((w, i) => {
      timers.current.push(
        setTimeout(() => {
          if (listening.current) setCaption(words.slice(0, i + 1).join(' '))
        }, 90 * (i + 1)),
      )
    })
  }

  const takeVitals = () => {
    osVitalRows.forEach((_, i) => {
      timers.current.push(setTimeout(() => setVitalsN(i + 1), 220 * (i + 1)))
    })
  }

  const order = () => {
    const t = osTestList[testSel]
    if (!t) return
    setResults((r) => r.concat({ name: t.name, pending: true }))
    setTestOpen(false)
    setTestSel(null)
    timers.current.push(
      setTimeout(() => {
        setResults((rs) =>
          rs.map((r) =>
            r.name === t.name ? { name: t.name, result: t.result, bad: t.bad, credit: t.credit, pending: false } : r,
          ),
        )
      }, 2000),
    )
  }

  const countUp = (total) => {
    clearInterval(counter.current)
    const t0 = Date.now()
    setShown(0)
    counter.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 900)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(total * eased))
      if (p >= 1) clearInterval(counter.current)
    }, 40)
  }

  const reset = () => {
    stopClock()
    clearInterval(counter.current)
    timers.current.forEach(clearTimeout)
    timers.current = []
    listening.current = false
    endCall()
    setScreen('ward')
    setAsked([])
    setConvo([])
    setTyping(false)
    setListen(false)
    setCaption('')
    setVitalsN(0)
    setExam(false)
    setTestOpen(false)
    setTestSel(null)
    setResults([])
    setDx(null)
    setMgmt([])
    setElapsed(0)
    setShown(0)
  }

  // ----- marking -----
  const done = results.filter((r) => !r.pending)
  const historyPts = Math.round((30 * asked.length) / osQuestions.length)
  const examPts = (vitalsN >= 5 ? 12 : 0) + (exam ? 8 : 0)
  const investPts = Math.min(20, done.reduce((n, r) => n + (r.credit || 0), 0))
  const dxPts = dx === 0 ? 15 : 0
  const mgmtPts = Math.min(15, mgmt.length * 3)
  const domainDefs = [
    ['History', historyPts, 30],
    ['Examination & vitals', examPts, 20],
    ['Investigations', investPts, 20],
    ['Diagnosis', dxPts, 15],
    ['Management', mgmtPts, 15],
  ]
  const scoreTotal = historyPts + examPts + investPts + dxPts + mgmtPts

  const marked = asked.map((id) => {
    const q = osQuestions.find((x) => x.id === id)
    return {
      text: '“' + q.q + '”',
      pad: '14px 18px',
      bd: '1px solid var(--border-subtle)',
      bg: 'var(--surface-card)',
      fs: '16px',
      color: 'var(--ink, #0b1230)',
      textAlign: 'left',
      marker: '✓',
      markColor: 'var(--brand-primary)',
      note: q.note,
      noteColor: 'var(--text-body)',
    }
  })

  const misses = []
  const has = (id) => asked.indexOf(id) > -1
  if (!has('meds')) {
    marked.push({
      text: '(nothing asked here)',
      pad: '16px 18px',
      bd: '1px dashed var(--neutral-300)',
      bg: 'transparent',
      fs: '14px',
      color: 'var(--neutral-500)',
      textAlign: 'center',
      marker: '✕',
      markColor: 'var(--status-danger)',
      note:
        'You never asked what she had already taken. She had unlabelled tablets from a seller at the lorry station — ' +
        'that changes your management.',
      noteColor: 'var(--status-danger)',
    })
    misses.push('Ask what the patient has already taken, every time.')
  }
  if (vitalsN < 5) {
    marked.push({
      text: '(no observations recorded)',
      pad: '16px 18px',
      bd: '1px dashed var(--neutral-300)',
      bg: 'transparent',
      fs: '14px',
      color: 'var(--neutral-500)',
      textAlign: 'center',
      marker: '✕',
      markColor: 'var(--status-danger)',
      note: 'A febrile patient was assessed without a temperature, pulse or blood pressure.',
      noteColor: 'var(--status-danger)',
    })
    misses.push('Take a full set of observations before you reason.')
  }
  if (!done.some((r) => r.credit === 12)) misses.push('Confirm fever with a malaria rapid diagnostic test before treating.')
  if (mgmtPts < 15) misses.push('Write the whole plan: treatment, safety advice and prevention.')
  if (dxPts === 0 && dx !== null) misses.push('Name the diagnosis the evidence supports, not the one it resembles.')
  misses.push('Name the diagnosis to the patient in her own words.')

  const left = Math.max(0, STATION_SECONDS - elapsed)

  return {
    screen,
    isWard: screen === 'ward',
    isChart: screen === 'chart',
    isConsult: screen === 'consult',
    isDx: screen === 'diagnosis',
    isDebrief: screen === 'debrief',

    start: () => setScreen('chart'),
    toConsult: () => {
      setScreen('consult')
      startClock()
    },
    toDx: () => {
      endCall()
      setScreen('diagnosis')
      stopClock()
    },
    toDebrief: () => {
      setScreen('debrief')
      countUp(scoreTotal)
    },
    restart: reset,

    clockLabel: ('0' + Math.floor(left / 60)).slice(-2) + ':' + ('0' + (left % 60)).slice(-2),
    clockColor: STATION_SECONDS - elapsed <= 60 ? 'var(--status-danger)' : 'var(--neutral-500)',
    coverWidth: Math.round((100 * asked.length) / osQuestions.length) + '%',
    coverLabel: asked.length + '/' + osQuestions.length + ' asked',
    timeLabel: 'Station 4 · fever in an adult · 8 min',
    signoff: 'Marked 09:51 · Dr Efua Asante, examiner',

    showBack: screen !== 'ward',
    backLabel: { chart: 'Ward list', consult: 'Patient record', diagnosis: 'Consultation', debrief: 'The plan' }[screen] || 'Back',
    back: () => {
      if (screen === 'consult') endCall()
      setScreen({ chart: 'ward', consult: 'chart', diagnosis: 'consult', debrief: 'diagnosis' }[screen] || 'ward')
    },
    locked: [{ demo: 'case 02 · chest pain' }, { demo: 'case 03 · the breathless child' }],
    chart: osChartRows.map(([label, value, mono]) => ({ label, value, font: mono ? 'var(--type-mono)' : 'var(--type-body)' })),

    turns: (voiceOn ? [] : [{ who: 'p', text: OPENING_LINE }])
      .concat(convo)
      .map((t, i) => ({
        time: '09:' + ('0' + Math.min(42 + i, 59)).slice(-2),
        ...(t.who === 'p'
          ? { text: t.text, align: 'stretch', max: '100%', bg: 'var(--surface-card)', bd: '1px solid var(--border-subtle)', fs: '18px', fw: '400', color: 'var(--icaih-ink, #0b1230)' }
          : { text: t.text, align: 'end', max: '72%', bg: 'var(--neutral-100)', bd: '1px solid transparent', fs: '16px', fw: '500', color: 'var(--text-body)' }),
      })),
    hasVitals: vitalsN >= 5,
    examNote: exam
      ? [{ text: 'Sclerae mildly icteric. No neck stiffness, Kernig negative. Chest clear. Spleen tip just palpable. Capillary refill under two seconds.' }]
      : [],

    listening: voiceOn ? call === 'live' : listen,
    bars: [{ delay: '0ms' }, { delay: '90ms' }, { delay: '180ms' }, { delay: '60ms' }, { delay: '150ms' }],
    caption: voiceOn
      ? call === 'live'
        ? 'On call — just speak, Ama can hear you.'
        : caption
      : listen
        ? caption || 'listening…'
        : caption || (nextByMic ? '' : 'No further scripted questions — finish the consultation.'),
    micLabel: voiceOn
      ? { idle: 'Answer patient call', connecting: 'Connecting…', live: 'On call — tap to pause', paused: 'Paused — tap to resume' }[call]
      : listen
        ? 'Listening — tap to send'
        : nextByMic
          ? 'Tap to speak'
          : 'Nothing left to ask',
    micBg: (voiceOn ? call === 'live' || call === 'paused' : listen) ? 'var(--neutral-100)' : 'var(--brand-primary)',
    micFg: (voiceOn ? call === 'live' || call === 'paused' : listen) ? 'var(--text-body)' : '#fff',
    micDot: (voiceOn ? call === 'live' : listen) ? 'var(--status-danger)' : 'rgba(255,255,255,.72)',
    micOff: voiceOn ? call === 'connecting' : !nextByMic,
    micOpacity: (voiceOn ? call !== 'connecting' : nextByMic) ? 1 : 0.45,
    micToggle,
    toggleType: () => setTyping((t) => !t),
    typeLabel: typing ? 'Use the microphone instead' : 'Type instead',
    voiceHint: voiceOn ? '' : 'Scripted voice demo — set VITE_GEMINI_API_KEY in .env.local for live Gemini speech',
    chips: typing
      ? osQuestions.filter((q) => asked.indexOf(q.id) < 0).map((q) => ({ text: q.q, ask: () => deliver(q, q.q) }))
      : [],

    obs: osVitalRows
      .slice(0, vitalsN)
      .map((v) => ({
        label: v.label,
        value: v.value,
        unit: v.unit,
        color: v.bad ? 'var(--status-danger)' : 'var(--icaih-ink, #0b1230)',
        tint: v.bad ? 'var(--status-danger-bg)' : 'transparent',
        pad: v.bad ? '2px 8px' : '2px 0',
        mark: v.bad ? '▲ ' : '',
      }))
      .concat(
        osVitalRows.slice(vitalsN).map((v) => ({
          label: v.label,
          value: '– – –',
          unit: v.unit,
          color: 'var(--neutral-400)',
          tint: 'transparent',
          pad: '2px 0',
          mark: '',
        })),
      ),
    obsEmpty: vitalsN === 0 ? 'No observations recorded' : '',
    invest: results.map((r) => ({
      name: r.name,
      result: r.pending ? '· · · processing' : r.result,
      ts: r.pending ? 'ordered 09:42' : 'resulted 09:44',
      color: r.pending ? 'var(--neutral-400)' : r.bad ? 'var(--status-danger)' : 'var(--icaih-ink, #0b1230)',
    })),
    investEmpty: results.length ? '' : 'No tests ordered',

    testOpen,
    tests: osTestList.map((t, i) => ({
      name: t.name,
      pick: () => setTestSel(i),
      bd: testSel === i ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
      bg: testSel === i ? 'var(--icaih-emerald-50)' : 'var(--surface-card)',
      dot: testSel === i ? 'var(--brand-primary)' : 'var(--neutral-300)',
      fill: testSel === i ? 'var(--brand-primary)' : 'transparent',
    })),
    confirmTest: order,
    confirmOff: testSel === null,
    confirmOpacity: testSel === null ? 0.45 : 1,

    actions: [
      {
        label: vitalsN >= 5 ? 'Observations taken' : 'Take vitals',
        off: vitalsN > 0,
        run: takeVitals,
        mark: vitalsN >= 5 ? '✓' : '→',
        markColor: vitalsN >= 5 ? 'var(--brand-primary)' : 'var(--neutral-400)',
        color: vitalsN > 0 ? 'var(--neutral-500)' : 'var(--text-body)',
        opacity: vitalsN > 0 ? 0.55 : 1,
      },
      {
        label: exam ? 'Patient examined' : 'Examine patient',
        off: exam,
        run: () => setExam(true),
        mark: exam ? '✓' : '→',
        markColor: exam ? 'var(--brand-primary)' : 'var(--neutral-400)',
        color: exam ? 'var(--neutral-500)' : 'var(--text-body)',
        opacity: exam ? 0.55 : 1,
      },
      {
        label: 'Order test',
        off: false,
        run: () => setTestOpen((o) => !o),
        mark: '→',
        markColor: 'var(--neutral-400)',
        color: 'var(--text-body)',
        opacity: 1,
      },
    ],

    dxOptions: osDxList.map((name, i) => ({
      name,
      pick: () => setDx(i),
      bd: dx === i ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
      bg: dx === i ? 'var(--icaih-emerald-50)' : 'var(--surface-card)',
      dot: dx === i ? 'var(--brand-primary)' : 'var(--neutral-300)',
      fill: dx === i ? 'var(--brand-primary)' : 'transparent',
    })),
    mgmtOptions: osMgmtList.map((text, i) => {
      const on = mgmt.indexOf(i) > -1
      return {
        text,
        tick: on ? '✓' : '',
        toggle: () => setMgmt((m) => (on ? m.filter((x) => x !== i) : m.concat(i))),
        bd: on ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
        bg: on ? 'var(--icaih-emerald-50)' : 'var(--surface-card)',
        dot: on ? 'var(--brand-primary)' : 'var(--neutral-300)',
        fill: on ? 'var(--brand-primary)' : 'transparent',
      }
    }),
    submitOff: dx === null,
    submitOpacity: dx === null ? 0.45 : 1,

    score: String(screen === 'debrief' ? shown : scoreTotal),
    domains: domainDefs.map(([label, pts, max]) => ({
      label,
      tally: pts + '/' + max,
      width: Math.round((100 * pts) / max) + '%',
      color: pts / max < 0.5 ? 'var(--status-danger)' : 'var(--brand-primary)',
    })),
    marked,
    next: misses.slice(0, 3).map((text, i) => ({ n: '0' + (i + 1), text })),
  }
}

const mono = { font: 'var(--type-mono)', fontSize: 'var(--fs-caption)', color: 'var(--neutral-500)' }
const pillPrimary = {
  borderRadius: 'var(--radius-pill)',
  border: 'none',
  background: 'var(--brand-primary)',
  color: '#fff',
  font: 'var(--type-label)',
  cursor: 'pointer',
}

function Ward({ vals }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16,
          paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span style={mutedEyebrow}>Waiting</span>
        <span style={mono}>{vals.timeLabel}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        <button
          onClick={vals.start}
          className="hv-card-lift"
          style={{
            ...card, position: 'relative', overflow: 'hidden', textAlign: 'left', display: 'flex',
            flexDirection: 'column', gap: 16, padding: 24, cursor: 'pointer',
            transition: 'border-color var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out)',
          }}
        >
          <span style={{ position: 'absolute', inset: '0 0 auto 0', height: 3, background: 'var(--gradient-brand)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ font: 'var(--type-h5, 600 18px/1.3 Poppins, sans-serif)', color: 'var(--text-heading)' }}>Ama Boateng</span>
            <span style={mono}>22 · F</span>
          </div>
          <span style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--text-body)', textWrap: 'pretty' }}>
            &ldquo;Fever and headache for three days&rdquo;
          </span>
          <span
            style={{
              position: 'absolute', right: 18, bottom: 2, font: 'var(--type-mono)', fontSize: 64,
              fontWeight: 600, lineHeight: 1, color: 'var(--neutral-100)', pointerEvents: 'none',
            }}
          >
            01
          </span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingTop: 4, position: 'relative' }}>
            <span style={mono}>waiting 12 min</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
        </button>

        {vals.locked.map((l, i) => (
          <div
            key={i}
            style={{
              display: 'flex', flexDirection: 'column', gap: 16, padding: 24, borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)', background: 'var(--surface-card)', opacity: 0.4, pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ display: 'block', width: 132, height: 14, borderRadius: 4, background: 'var(--neutral-200)' }} />
              <span style={mono}>{l.demo}</span>
            </div>
            <span style={{ display: 'block', width: '100%', height: 12, borderRadius: 4, background: 'var(--neutral-100)' }} />
            <span style={{ display: 'block', width: '70%', height: 12, borderRadius: 4, background: 'var(--neutral-100)' }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span
                style={{
                  padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--neutral-100)',
                  color: 'var(--neutral-600)', font: 'var(--type-eyebrow)', letterSpacing: 'var(--ls-eyebrow)',
                  textTransform: 'uppercase',
                }}
              >
                Locked
              </span>
              <span style={{ fontSize: 12, color: 'var(--neutral-500)' }}>opens after your debrief</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Chart({ vals }) {
  return (
    <div style={{ maxWidth: 780, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <span
          style={{
            padding: '7px 16px 6px', borderRadius: '10px 10px 0 0', background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)', borderBottom: 'none', font: 'var(--type-eyebrow)',
            letterSpacing: 'var(--ls-eyebrow)', textTransform: 'uppercase', color: 'var(--neutral-500)',
          }}
        >
          Patient record
        </span>
        <span style={{ paddingBottom: 8, font: 'var(--type-mono)', fontSize: 'var(--fs-caption)', color: 'var(--neutral-400)' }}>
          folder OPD/26/4471
        </span>
      </div>
      <div
        style={{
          marginTop: -16, borderRadius: '0 var(--radius-lg) var(--radius-lg) var(--radius-lg)',
          border: '1px solid var(--border-subtle)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-xs)',
          padding: 24, display: 'flex', flexDirection: 'column', gap: 4,
        }}
      >
        {vals.chart.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr)', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ ...mutedEyebrow, paddingTop: 2 }}>{r.label}</span>
            <span style={{ font: r.font, fontSize: 15, color: 'var(--text-body)', textWrap: 'pretty' }}>{r.value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 20 }}>
          <button onClick={vals.toConsult} style={{ ...pillPrimary, padding: '12px 24px', fontSize: 15, boxShadow: 'var(--shadow-brand)' }}>
            Start consultation
          </button>
        </div>
      </div>
    </div>
  )
}

function TemperatureChart() {
  return (
    <div style={{ padding: '14px 0 16px', display: 'flex', flexDirection: 'column', gap: 8, animation: 'os-rise 320ms cubic-bezier(.22,.61,.36,1) both' }}>
      <span style={mutedEyebrow}>Temperature, three days</span>
      <svg viewBox="0 0 240 80" width="100%" height="80" style={{ display: 'block', overflow: 'visible' }}>
        <line x1="0" y1="14" x2="240" y2="14" stroke="#dde2ec" strokeWidth="1" strokeDasharray="3 4" />
        <line x1="0" y1="40" x2="240" y2="40" stroke="#dde2ec" strokeWidth="1" strokeDasharray="3 4" />
        <line x1="0" y1="66" x2="240" y2="66" stroke="#dde2ec" strokeWidth="1" />
        <text x="0" y="10" fill="#98a2b6" fontFamily="ui-monospace, monospace" fontSize="9">39</text>
        <text x="0" y="36" fill="#98a2b6" fontFamily="ui-monospace, monospace" fontSize="9">38</text>
        <text x="0" y="62" fill="#98a2b6" fontFamily="ui-monospace, monospace" fontSize="9">37</text>
        <polyline points="34,52 130,30 226,17" fill="none" stroke="#b3261e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="34" cy="52" r="3" fill="#fff" stroke="#b3261e" strokeWidth="2" />
        <circle cx="130" cy="30" r="3" fill="#fff" stroke="#b3261e" strokeWidth="2" />
        <circle cx="226" cy="17" r="4" fill="#b3261e" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 26 }}>
        <span style={{ font: 'var(--type-mono)', fontSize: 11, color: 'var(--neutral-400)' }}>day 1</span>
        <span style={{ font: 'var(--type-mono)', fontSize: 11, color: 'var(--neutral-400)' }}>day 2</span>
        <span style={{ font: 'var(--type-mono)', fontSize: 11, color: 'var(--status-danger)' }}>today</span>
      </div>
      <span style={{ fontSize: 12, color: 'var(--neutral-500)', textWrap: 'pretty' }}>
        Reported at home: 37.4 &rarr; 38.4 &rarr; 38.9 &deg;C. Climbing, not settling.
      </span>
    </div>
  )
}

function Consult({ vals }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 62fr) minmax(0, 38fr)', gap: 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ font: 'var(--type-h5, 600 18px/1.3 Poppins, sans-serif)', color: 'var(--text-heading)' }}>Ama Boateng</span>
              <span style={mono}>22 · F</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span style={mono}>{vals.coverLabel}</span>
              <span style={{ font: 'var(--type-mono)', fontSize: 15, fontWeight: 500, color: vals.clockColor }}>{vals.clockLabel}</span>
            </span>
          </div>
          <span style={{ display: 'block', height: 3, borderRadius: 3, background: 'var(--neutral-100)', overflow: 'hidden' }}>
            <span
              style={{
                display: 'block', height: '100%', width: vals.coverWidth, background: 'var(--gradient-brand)',
                transition: 'width 320ms cubic-bezier(.22,.61,.36,1)',
              }}
            />
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 320 }}>
          {vals.turns.map((t, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '46px minmax(0, 1fr)', gap: 0, alignItems: 'start' }}>
              <span style={{ font: 'var(--type-mono)', fontSize: 12, color: 'var(--neutral-400)', paddingTop: 16 }}>{t.time}</span>
              <div
                style={{
                  justifySelf: t.align, maxWidth: t.max, padding: '14px 18px', borderRadius: 8,
                  background: t.bg, border: t.bd, animation: 'os-rise 200ms cubic-bezier(.22,.61,.36,1) both',
                }}
              >
                <span style={{ fontSize: t.fs, lineHeight: 1.62, fontWeight: t.fw, color: t.color, textWrap: 'pretty' }}>{t.text}</span>
              </div>
            </div>
          ))}
          {vals.examNote.map((n, i) => (
            <div key={i} style={{ alignSelf: 'stretch', padding: '12px 16px', borderRadius: 8, background: 'var(--neutral-50)', border: '1px solid var(--border-subtle)' }}>
              <span style={mutedEyebrow}>Examination</span>
              <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--text-body)' }}>{n.text}</p>
            </div>
          ))}
        </div>

        <div style={{ minHeight: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
          {vals.listening && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 16 }}>
              {vals.bars.map((b, i) => (
                <span
                  key={i}
                  style={{
                    display: 'block', width: 3, height: 16, borderRadius: 2, background: 'var(--status-danger)',
                    transformOrigin: 'bottom', animation: 'os-meter 620ms ease-in-out infinite', animationDelay: b.delay,
                  }}
                />
              ))}
            </div>
          )}
          <span style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--neutral-500)' }}>{vals.caption}</span>
        </div>

        <button
          onClick={vals.micToggle}
          disabled={vals.micOff}
          style={{
            width: '100%', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer', background: vals.micBg,
            color: vals.micFg, font: 'var(--type-label)', fontSize: 15, opacity: vals.micOpacity,
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: 9, background: vals.micDot }} />
          {vals.micLabel}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <button
            onClick={vals.toggleType}
            style={{
              border: 'none', background: 'transparent', padding: 0, color: 'var(--neutral-500)',
              font: 'var(--type-label)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {vals.typeLabel}
          </button>
          {vals.voiceHint && (
            <span style={{ fontSize: 12, color: 'var(--neutral-400)' }}>{vals.voiceHint}</span>
          )}
          {vals.chips.map((c, i) => (
            <button
              key={i}
              onClick={c.ask}
              className="hv-primary-border"
              style={{
                textAlign: 'left', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)',
                background: 'var(--surface-card)', color: 'var(--text-body)', fontSize: 14, cursor: 'pointer',
              }}
            >
              {c.text}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={mutedEyebrow}>Observations</span>
          <div style={{ borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-card)', padding: '6px 16px' }}>
            {vals.obs.map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--neutral-500)' }}>{o.label}</span>
                <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, padding: o.pad, borderRadius: 6, background: o.tint }}>
                  <span style={{ font: 'var(--type-mono)', fontSize: 22, fontWeight: 500, color: o.color }}>
                    {o.mark}
                    {o.value}
                  </span>
                  <span style={{ font: 'var(--type-mono)', fontSize: 13, color: 'var(--neutral-500)' }}>{o.unit}</span>
                </span>
              </div>
            ))}
            <span style={{ display: 'block', padding: '10px 0 12px', fontSize: 13, color: 'var(--neutral-500)' }}>{vals.obsEmpty}</span>
            {vals.hasVitals && <TemperatureChart />}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={mutedEyebrow}>Investigations</span>
          <div style={{ borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-card)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--neutral-500)' }}>{vals.investEmpty}</span>
            {vals.invest.map((iv, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, animation: 'os-rise 240ms cubic-bezier(.22,.61,.36,1) both' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-heading)' }}>{iv.name}</span>
                <span style={{ font: 'var(--type-mono)', fontSize: 16, fontWeight: 500, color: iv.color }}>{iv.result}</span>
                <span style={{ font: 'var(--type-mono)', fontSize: 12, color: 'var(--neutral-500)' }}>{iv.ts}</span>
              </div>
            ))}
          </div>
        </div>

        {vals.testOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-card)' }}>
            <span style={mutedEyebrow}>Order a test</span>
            {vals.tests.map((t, i) => (
              <button
                key={i}
                onClick={t.pick}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '9px 10px',
                  borderRadius: 8, border: t.bd, background: t.bg, cursor: 'pointer', fontSize: 14, color: 'var(--text-body)',
                }}
              >
                <span style={{ width: 14, height: 14, flex: 'none', borderRadius: 9, border: `2px solid ${t.dot}`, background: t.fill }} />
                {t.name}
              </button>
            ))}
            <button
              onClick={vals.confirmTest}
              disabled={vals.confirmOff}
              style={{ ...pillPrimary, marginTop: 4, padding: '10px 18px', fontSize: 14, opacity: vals.confirmOpacity }}
            >
              Order test
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
          {vals.actions.map((a, i) => (
            <button
              key={i}
              onClick={a.run}
              disabled={a.off}
              className="hv-primary-border"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 14px',
                borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-card)',
                color: a.color, font: 'var(--type-label)', fontSize: 15, cursor: 'pointer', opacity: a.opacity,
              }}
            >
              <span style={{ font: 'var(--type-mono)', fontSize: 14, color: a.markColor }}>{a.mark}</span>
              {a.label}
            </button>
          ))}
          <button onClick={vals.toDx} style={{ ...pillPrimary, marginTop: 8, width: '100%', padding: '13px 18px', fontSize: 15, boxShadow: 'var(--shadow-brand)' }}>
            Finish consultation
          </button>
        </div>
      </div>
    </div>
  )
}

function Diagnosis({ vals }) {
  return (
    <div style={{ maxWidth: 780, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={mutedEyebrow}>Working diagnosis</span>
        <div style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vals.dxOptions.map((d, i) => (
            <button
              key={i}
              onClick={d.pick}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '12px 14px',
                borderRadius: 8, border: d.bd, background: d.bg, cursor: 'pointer', fontSize: 15, color: 'var(--text-body)',
              }}
            >
              <span style={{ width: 15, height: 15, flex: 'none', borderRadius: 9, border: `2px solid ${d.dot}`, background: d.fill }} />
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={mutedEyebrow}>Management plan</span>
        <div
          style={{
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', border: '1px solid var(--border-subtle)',
            borderBottom: '2px dashed var(--neutral-300)', background: 'var(--surface-card)',
            boxShadow: 'var(--shadow-xs)', padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingBottom: 12, marginBottom: 4, borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={mono}>OPD/26/4471 &middot; Ama Boateng &middot; 54 kg</span>
            <span style={mono}>29 Sep 2026</span>
          </div>
          {vals.mgmtOptions.map((m, i) => (
            <button
              key={i}
              onClick={m.toggle}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '12px 14px',
                borderRadius: 8, border: m.bd, background: m.bg, cursor: 'pointer', fontSize: 15, color: 'var(--text-body)',
              }}
            >
              <span
                style={{
                  width: 16, height: 16, flex: 'none', borderRadius: 4, border: `2px solid ${m.dot}`,
                  background: m.fill, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11,
                }}
              >
                {m.tick}
              </span>
              {m.text}
            </button>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12 }}>
            <button
              onClick={vals.toDebrief}
              disabled={vals.submitOff}
              style={{ ...pillPrimary, padding: '12px 24px', fontSize: 15, opacity: vals.submitOpacity, boxShadow: 'var(--shadow-brand)' }}
            >
              Submit for assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Debrief({ vals }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ ...card, display: 'grid', gridTemplateColumns: '132px minmax(0, 1fr)', gap: 32, alignItems: 'start', padding: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ font: 'var(--type-mono)', fontSize: 64, lineHeight: 1, fontWeight: 600, color: 'var(--text-heading)' }}>{vals.score}</span>
          <span style={{ display: 'block', width: 52, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{ font: 'var(--type-mono)', fontSize: 14, color: 'var(--neutral-500)' }}>100</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {vals.domains.map((d, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr) 56px', gap: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: 'var(--text-body)' }}>{d.label}</span>
              <span
                style={{
                  display: 'block', height: 10, borderRadius: 6,
                  background: 'repeating-linear-gradient(135deg, var(--neutral-100) 0 3px, var(--neutral-50) 3px 6px)',
                  overflow: 'hidden',
                }}
              >
                <span style={{ display: 'block', height: '100%', width: d.width, background: d.color, borderRadius: 6, transition: 'width 600ms cubic-bezier(.16,1,.3,1)' }} />
              </span>
              <span style={{ font: 'var(--type-mono)', fontSize: 14, textAlign: 'right', color: d.color }}>{d.tally}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span style={mutedEyebrow}>Consultation</span>
        {vals.marked.map((m, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 58fr) minmax(0, 42fr)', gap: 0 }}>
            <div style={{ padding: '0 24px 20px 0' }}>
              <span
                style={{
                  display: 'block', padding: m.pad, borderRadius: 8, border: m.bd, background: m.bg,
                  fontSize: m.fs, lineHeight: 1.6, color: m.color, textAlign: m.textAlign, textWrap: 'pretty',
                }}
              >
                {m.text}
              </span>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-subtle)', padding: '0 0 20px 24px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ flex: 'none', fontSize: 14, lineHeight: 1.45, color: m.markColor }}>{m.marker}</span>
              <span style={{ fontSize: 13, lineHeight: 1.55, color: m.noteColor, textWrap: 'pretty' }}>{m.note}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={mutedEyebrow}>Next time</span>
        {vals.next.map((n, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'baseline', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ font: 'var(--type-mono)', fontSize: 14, color: 'var(--neutral-500)' }}>{n.n}</span>
            <span style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text-body)', textWrap: 'pretty' }}>{n.text}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={vals.restart}
          style={{
            padding: '11px 20px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-subtle)',
            background: 'transparent', color: 'var(--text-body)', font: 'var(--type-label)', fontSize: 15, cursor: 'pointer',
          }}
        >
          See the ward list
        </button>
        <span style={{ font: 'var(--type-mono)', fontSize: 'var(--fs-caption)', color: 'var(--neutral-400)' }}>{vals.signoff}</span>
      </div>
    </div>
  )
}

export default function OsceSimulator({ vals }) {
  return (
    <div style={{ padding: 32, maxWidth: 1234, width: '100%', boxSizing: 'border-box', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {vals.showBack && (
        <div style={{ display: 'flex' }}>
          <button
            onClick={vals.back}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, marginLeft: -12, padding: '8px 12px', border: 'none',
              background: 'transparent', color: 'var(--text-body)', font: 'var(--type-label)', cursor: 'pointer',
            }}
          >
            <ChevronLeftIcon />
            {vals.backLabel}
          </button>
        </div>
      )}
      {vals.isWard && <Ward vals={vals} />}
      {vals.isChart && <Chart vals={vals} />}
      {vals.isConsult && <Consult vals={vals} />}
      {vals.isDx && <Diagnosis vals={vals} />}
      {vals.isDebrief && <Debrief vals={vals} />}
    </div>
  )
}
