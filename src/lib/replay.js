/* Client-side replay of the AppointReady interview.
 *
 * Nothing here calls a model. A run is either
 *   - a *recorded* bundle under /sim, lifted from the demo's own response cache
 *     (real MedGemma turns, real Gemini TTS audio), or
 *   - a *scripted* bundle assembled from src/data/appointment.js and voiced by
 *     the browser's own speech synthesiser.
 *
 * Both produce the same shape, so the player below cannot tell them apart.
 * The cadence rule is the one the original uses: a bubble stays on screen for
 * exactly as long as its own audio, and falls back to a fixed wait when silent.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const OPENER =
  'Thank you for booking an appointment with your primary doctor. I am an assistant here to ask a ' +
  'few questions to help your doctor prepare for your visit. To start, what is your main concern today?'

const CLOSER =
  'Thank you for answering my questions. I have everything needed to prepare a report for your visit.'

/* ---------------------------------------------------------------- bundles */

let indexPromise = null

function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch('/sim/index.json')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
  }
  return indexPromise
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Recorded run for this patient + condition, or null if none was cached. */
export async function loadRecorded(patient, condition) {
  try {
    const index = await loadIndex()
    const hit = (Array.isArray(index) ? index : []).find(
      (e) => slug(e.patient) === slug(patient) && slug(e.condition) === slug(condition),
    )
    if (!hit) return null
    const res = await fetch('/sim/' + hit.file)
    if (!res.ok) return null
    const bundle = await res.json()
    if (!bundle || !Array.isArray(bundle.turns) || bundle.turns.length === 0) return null
    return { ...bundle, source: 'recorded' }
  } catch {
    return null
  }
}

/* The report the original builds section by section, as markdown, so the
   scripted run animates through the same four fixed headings. */
function scriptedReports(sc, cs) {
  const head = (n) =>
    [
      '### Primary concern:',
      n >= 1 ? cs.collected[0][1] + '.' : '',
      '',
      '### History of Present Illness (HPI):',
      n >= 2 ? cs.report[0][2] : '',
      '',
      '### Relevant Medical History (from EHR):',
      n >= 3 ? sc.conditions.map((c) => '- ' + c).join('\n') : '',
      '',
      '### Medications (from EHR and interview):',
      n >= 3 ? sc.meds.map((m) => '- ' + m).join('\n') : '',
      n >= 4 ? '\n### ' + cs.report[1][0] + ':\n' + cs.report[1][2] : '',
    ].join('\n')
  return [head(1), head(2), head(3), head(4)]
}

/** Scripted run built from the data already in the repo. Always available. */
export function buildScripted(sc, cs) {
  const reports = scriptedReports(sc, cs)
  const turns = [{ speaker: 'interviewer', text: OPENER, audio: null, report: null }]
  let pair = 0

  cs.script.forEach(([who, text], i) => {
    const isPatient = who === 'Patient'
    // The scripted opener already covers the first question.
    if (!isPatient && i === 0) {
      turns.push({ speaker: 'patient', text: cs.script[1][1], audio: null, report: reports[0] })
      return
    }
    if (isPatient && i === 1) return
    turns.push({
      speaker: isPatient ? 'patient' : 'interviewer',
      text,
      audio: null,
      report: isPatient ? reports[Math.min(++pair, reports.length - 1)] : null,
    })
  })

  turns.push({ speaker: 'interviewer', text: CLOSER, audio: null, report: null })

  return {
    source: 'scripted',
    patient: sc.line.split(',')[0],
    condition: cs.dx.replace('.', ''),
    thinking:
      'I am acting as a clinical assistant interviewing ' + sc.line.split(',')[0] +
      ' for their doctor, focusing on fact-finding. Given the ' +
      sc.conditions[0].split(' (')[0].toLowerCase() +
      ' in the record and the current medication, I will use clinical reasoning to guide my questions, ' +
      'one at a time, keeping them short. My aim is to gather enough for the doctor’s report.',
    turns,
    evaluation: null,
  }
}

/* ------------------------------------------------------------------ voice */

/* Browser speech synthesis, used when a turn carries no recorded audio.
   Two distinct voices so the interview still reads as two speakers. */
let voicePair = null

function voices() {
  if (voicePair) return voicePair
  const synth = typeof window !== 'undefined' && window.speechSynthesis
  if (!synth) return null
  const all = synth.getVoices().filter((v) => /^en/i.test(v.lang))
  if (all.length === 0) return null

  const byName = (...names) =>
    all.find((v) => names.some((n) => v.name.toLowerCase().includes(n)))

  const clinician = byName('samantha', 'karen', 'serena', 'zira', 'google uk english female') || all[0]
  const patient =
    byName('daniel', 'alex', 'fred', 'david', 'google uk english male') ||
    all.find((v) => v !== clinician) ||
    all[0]

  voicePair = { clinician, patient }
  return voicePair
}

function speak(text, who, rate, onDone) {
  const synth = typeof window !== 'undefined' && window.speechSynthesis
  if (!synth || !window.SpeechSynthesisUtterance) return false
  const v = voices()
  if (!v) return false

  const u = new SpeechSynthesisUtterance(text)
  u.voice = who === 'patient' ? v.patient : v.clinician
  u.lang = u.voice ? u.voice.lang : 'en-GB'
  // The original nudges the patient faster and the clinician brisk-but-warm.
  u.rate = (who === 'patient' ? 1.12 : 1.04) * rate
  u.pitch = who === 'patient' ? 0.98 : 1.02
  let fired = false
  const finish = () => {
    if (fired) return
    fired = true
    onDone()
  }
  u.onend = finish
  u.onerror = finish
  synth.speak(u)
  return true
}

export function cancelSpeech() {
  const synth = typeof window !== 'undefined' && window.speechSynthesis
  if (synth) synth.cancel()
}

/* Silent fallback timing: roughly reading speed, clamped either side. */
const readMs = (text, rate) =>
  Math.min(9000, Math.max(1400, (String(text).split(/\s+/).length / 2.9) * 1000)) / rate

/* --------------------------------------------------------------- markdown */

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const inline = (s) =>
  esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')

/** Just enough markdown for the report template's headings, bullets and bold. */
export function renderMarkdown(md) {
  const out = []
  let list = false
  const closeList = () => {
    if (list) {
      out.push('</ul>')
      list = false
    }
  }

  String(md || '')
    .split(/\r?\n/)
    .forEach((raw) => {
      const line = raw.trim()
      if (!line) {
        closeList()
        return
      }
      const h = /^(#{1,6})\s+(.*)$/.exec(line)
      if (h) {
        closeList()
        const level = Math.min(6, Math.max(3, h[1].length))
        out.push(`<h${level}>${inline(h[2].replace(/:$/, ''))}</h${level}>`)
        return
      }
      const li = /^[-*]\s+(.*)$/.exec(line)
      if (li) {
        if (!list) {
          out.push('<ul>')
          list = true
        }
        out.push(`<li>${inline(li[1])}</li>`)
        return
      }
      closeList()
      out.push(`<p>${inline(line)}</p>`)
    })

  closeList()
  return out.join('')
}

/* ------------------------------------------------------------------- diff */

const tokenise = (html) => String(html || '').match(/<[^>]+>|[^<\s]+|\s+/g) || []

/** Word-level diff of two HTML strings, marking what the turn just added. */
export function diffHtml(prev, next) {
  const a = tokenise(prev)
  const b = tokenise(next)
  if (a.length === 0) return next

  // Trim the shared head and tail before the quadratic part.
  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head++
  let tail = 0
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++

  const midA = a.slice(head, a.length - tail)
  const midB = b.slice(head, b.length - tail)

  const out = [b.slice(0, head).join('')]

  if (midA.length * midB.length > 400000) {
    // Too large to diff cheaply — show the new text without decoration.
    out.push(midB.join(''))
  } else {
    const n = midA.length
    const m = midB.length
    const lcs = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i][j] = midA[i] === midB[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
      }
    }
    let i = 0
    let j = 0
    let add = []
    let rem = []
    const flush = () => {
      if (rem.length) {
        const t = rem.join('')
        if (t.trim()) out.push(`<span class="ar-remove">${t}</span>`)
        rem = []
      }
      if (add.length) {
        const t = add.join('')
        if (t.trim()) out.push(`<span class="ar-add">${t}</span>`)
        else out.push(t)
        add = []
      }
    }
    while (i < n && j < m) {
      if (midA[i] === midB[j]) {
        flush()
        out.push(midB[j])
        i++
        j++
      } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
        // A tag that only moved is noise — drop it rather than strike it out.
        if (!/^<[^>]+>$/.test(midA[i])) rem.push(midA[i])
        i++
      } else {
        if (/^<[^>]+>$/.test(midB[j])) out.push(midB[j])
        else add.push(midB[j])
        j++
      }
    }
    while (i < n) {
      if (!/^<[^>]+>$/.test(midA[i])) rem.push(midA[i])
      i++
    }
    while (j < m) {
      if (/^<[^>]+>$/.test(midB[j])) {
        flush()
        out.push(midB[j])
      } else add.push(midB[j])
      j++
    }
    flush()
  }

  out.push(b.slice(b.length - tail).join(''))
  return out.join('')
}

/* ----------------------------------------------------------------- player */

/**
 * Drives one bundle. `running` starts and pauses it; every timer, audio
 * element and utterance is torn down when it goes false or the bundle changes.
 */
export function useReplay({ bundle, running, audioOn, rate = 1 }) {
  const [shown, setShown] = useState([])
  const [reportHtml, setReportHtml] = useState('')
  const [speakingIdx, setSpeakingIdx] = useState(-1)
  const [finished, setFinished] = useState(false)

  const cursor = useRef(0)
  const timer = useRef(null)
  const audio = useRef(null)
  const reportMd = useRef('')
  const live = useRef(false)
  // What has actually been emitted, so that re-entering the effect — which the
  // voice and speed toggles both do mid-run — replays the current turn rather
  // than appending it a second time.
  const emitted = useRef([])

  const stop = useCallback(() => {
    live.current = false
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (audio.current) {
      audio.current.pause()
      audio.current.src = ''
      audio.current = null
    }
    cancelSpeech()
  }, [])

  // A new bundle is a fresh run.
  useEffect(() => {
    stop()
    cursor.current = 0
    reportMd.current = ''
    emitted.current = []
    setShown([])
    setReportHtml('')
    setSpeakingIdx(-1)
    setFinished(false)
  }, [bundle, stop])

  useEffect(() => {
    if (!bundle || !running) {
      stop()
      return undefined
    }
    live.current = true

    const advance = () => {
      if (!live.current) return
      cursor.current += 1
      step()
    }

    const step = () => {
      if (!live.current) return
      const i = cursor.current

      // Index 0 is the reasoning bubble; turns follow it.
      if (i === 0) {
        if (bundle.thinking) {
          if (emitted.current.length === 0) {
            emitted.current = [{ speaker: 'thinking', text: bundle.thinking }]
            setShown(emitted.current)
          }
          setSpeakingIdx(-1)
          timer.current = setTimeout(advance, readMs(bundle.thinking, rate) * 0.55)
          return
        }
        advance()
        return
      }

      const turn = bundle.turns[i - 1]
      if (!turn) {
        setSpeakingIdx(-1)
        setFinished(true)
        live.current = false
        return
      }

      if (emitted.current[emitted.current.length - 1] !== turn) {
        emitted.current = [...emitted.current, turn]
        setShown(emitted.current)
      }
      setSpeakingIdx(i - 1)

      if (turn.report && reportMd.current !== turn.report) {
        const next = renderMarkdown(turn.report)
        const prevHtml = renderMarkdown(reportMd.current)
        setReportHtml(reportMd.current ? diffHtml(prevHtml, next) : next)
        reportMd.current = turn.report
      }

      if (audioOn && turn.audio) {
        const el = new Audio(turn.audio)
        audio.current = el
        el.playbackRate = rate
        el.onended = advance
        el.onerror = () => timer.current = setTimeout(advance, readMs(turn.text, rate))
        const p = el.play()
        if (p && p.catch) {
          // Autoplay refused — keep the run moving silently rather than stalling.
          p.catch(() => {
            timer.current = setTimeout(advance, readMs(turn.text, rate))
          })
        }
        return
      }

      if (audioOn && speak(turn.text, turn.speaker, rate, advance)) return

      timer.current = setTimeout(advance, readMs(turn.text, rate))
    }

    step()
    return stop
  }, [bundle, running, audioOn, rate, stop])

  return {
    shown,
    reportHtml,
    speakingIdx,
    finished,
    total: bundle ? bundle.turns.length : 0,
    stop,
  }
}
