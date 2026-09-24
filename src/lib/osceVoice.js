/* Live voice call for the bedside OSCE simulator — Gemini Live API.
 *
 * One WebSocket session behaves like a phone call: the mic streams raw PCM up,
 * Ama's voice streams down and plays as it arrives, and Gemini's automatic
 * voice-activity detection handles turn-taking and barge-in. No tap-to-send.
 *
 * Marking still works: the session carries a `mark_question` tool, and the
 * model calls it with the rubric id every time the student's question matches
 * a scripted history item. Transcripts stream in for both speakers so the
 * conversation renders as bubbles.
 *
 * Needs VITE_GEMINI_API_KEY in .env.local. Without it, `voiceReady()` is false
 * and the simulator falls back to its original scripted microphone.
 */

import { osChartRows, osQuestions } from '../data/osce.js'

const KEY = import.meta.env.VITE_GEMINI_API_KEY
const LIVE_MODEL = 'gemini-3.1-flash-live-preview'
const WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key='

export const voiceReady = () => Boolean(KEY)

export const OPENING_LINE = "Doctor, I've had fever for three days now and my head won't stop hurting."

const SYSTEM_PROMPT =
  'You are role-playing Ama Boateng, a 22-year-old woman at a district hospital in Ghana, in a bedside ' +
  'OSCE training simulation. You have had fever and headache for three days. The person speaking to you ' +
  'is a medical student. Your chart (the student can read this; you would not use these words):\n' +
  osChartRows.map(([label, value]) => `- ${label}: ${value}`).join('\n') +
  '\n\nScripted history items. Each has an id, the question it represents, and your answer:\n' +
  osQuestions.map((q) => `- id "${q.id}" — question: "${q.q}" — your answer: "${q.a}"`).join('\n') +
  '\n\nRules:\n' +
  '1. Stay in character as Ama at all times: tired, feverish, polite, simple everyday English. ' +
  'Never break role, never give medical advice, never name a diagnosis — you do not know what you have.\n' +
  '2. Keep every answer to one or two short sentences. Reveal facts only when asked; volunteer nothing.\n' +
  '3. EVERY time the student asks something that matches one of the scripted items — in any wording — ' +
  'first call mark_question with that id, then speak that item\'s scripted answer, staying close to its words.\n' +
  '4. For questions not covered by the scripted items, answer briefly and consistently with the facts above, ' +
  'inventing no new clinical information.\n' +
  `5. When told to begin, greet the student with exactly: "${OPENING_LINE}"`

/* ---------------------------------------------------------------- helpers */

const b64FromInt16 = (i16) => {
  const bytes = new Uint8Array(i16.buffer, i16.byteOffset, i16.byteLength)
  let s = ''
  for (let i = 0; i < bytes.length; i += 32768) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768))
  }
  return btoa(s)
}

/* ------------------------------------------------------------------- call */

/**
 * Open a live call. Resolves once the session is ready and the mic is streaming.
 *
 * @param onTurn   (who: 's'|'p', textSoFar: string, done: boolean) — streaming
 *                 transcript of the current speaker's turn.
 * @param onMarked (id: string) — the model matched a scripted rubric question.
 * @param onEnded  () — the session closed (network drop, server hangup, end()).
 * @returns {{ end(), pause(), resume(), sendText(text) }}
 */
export async function startCall({ onTurn, onMarked, onEnded }) {
  // Echo cancellation matters: Ama plays over the speakers while the mic is hot.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  })

  let micCtx
  try {
    micCtx = new AudioContext({ sampleRate: 16000 })
  } catch {
    micCtx = new AudioContext()
  }
  const playCtx = new AudioContext({ sampleRate: 24000 })

  let ws = null
  let paused = false
  let closed = false

  /* Downstream audio: schedule each chunk right after the previous one. */
  let cursor = 0
  const sources = new Set()
  const playChunk = (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const i16 = new Int16Array(bytes.buffer, 0, bytes.length >> 1)
    const f32 = Float32Array.from(i16, (v) => v / 32768)
    const buf = playCtx.createBuffer(1, f32.length, 24000)
    buf.copyToChannel(f32, 0)
    const src = playCtx.createBufferSource()
    src.buffer = buf
    src.connect(playCtx.destination)
    cursor = Math.max(cursor, playCtx.currentTime + 0.03)
    src.start(cursor)
    cursor += buf.duration
    sources.add(src)
    src.onended = () => sources.delete(src)
  }
  const stopPlayback = () => {
    sources.forEach((s) => {
      try {
        s.stop()
      } catch {
        /* already stopped */
      }
    })
    sources.clear()
    cursor = 0
  }

  /* Streaming transcripts: fragments accumulate per speaker; a speaker's turn
     closes when the other side starts (or on turnComplete/interruption). */
  let inBuf = ''
  let outBuf = ''
  const flush = (who) => {
    const text = (who === 's' ? inBuf : outBuf).trim()
    if (who === 's') inBuf = ''
    else outBuf = ''
    if (text) onTurn(who, text, true)
  }

  const cleanup = () => {
    if (closed) return
    closed = true
    stream.getTracks().forEach((t) => t.stop())
    stopPlayback()
    micCtx.close().catch(() => {})
    playCtx.close().catch(() => {})
    if (ws && ws.readyState <= 1) ws.close()
    onEnded()
  }

  /* Mic → 16 kHz PCM16 → base64 → realtimeInput. */
  const micSource = micCtx.createMediaStreamSource(stream)
  const proc = micCtx.createScriptProcessor(4096, 1, 1)
  proc.onaudioprocess = (e) => {
    if (paused || !ws || ws.readyState !== 1) return
    const f = e.inputBuffer.getChannelData(0)
    const ratio = micCtx.sampleRate / 16000
    const n = Math.floor(f.length / ratio)
    const i16 = new Int16Array(n)
    for (let i = 0; i < n; i++) {
      const v = f[Math.floor(i * ratio)]
      i16[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)))
    }
    ws.send(
      JSON.stringify({
        realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: b64FromInt16(i16) } },
      }),
    )
  }
  micSource.connect(proc)
  proc.connect(micCtx.destination) // required for the processor to run; output stays silent

  await new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL + KEY)

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          setup: {
            model: 'models/' + LIVE_MODEL,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Leda' } } },
            },
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            tools: [
              {
                functionDeclarations: [
                  {
                    name: 'mark_question',
                    description:
                      'Record that the student just asked one of the scripted history questions. ' +
                      'Call this every time their question matches a scripted item, before answering.',
                    parameters: {
                      type: 'OBJECT',
                      properties: { id: { type: 'STRING', description: 'The scripted item id.' } },
                      required: ['id'],
                    },
                  },
                ],
              },
            ],
            realtimeInputConfig: {
              automaticActivityDetection: { silenceDurationMs: 500 },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        }),
      )
    }

    ws.onmessage = async (ev) => {
      const raw = typeof ev.data === 'string' ? ev.data : await ev.data.text()
      const msg = JSON.parse(raw)

      if (msg.setupComplete) {
        // Ama opens the consultation, like picking up the phone.
        ws.send(
          JSON.stringify({
            clientContent: {
              turns: [{ role: 'user', parts: [{ text: 'Begin the consultation.' }] }],
              turnComplete: true,
            },
          }),
        )
        resolve()
        return
      }

      if (msg.toolCall) {
        const calls = msg.toolCall.functionCalls || []
        calls.forEach((fc) => {
          if (fc.name === 'mark_question' && fc.args && fc.args.id) onMarked(fc.args.id)
        })
        ws.send(
          JSON.stringify({
            toolResponse: {
              functionResponses: calls.map((fc) => ({
                id: fc.id,
                name: fc.name,
                response: { result: 'recorded' },
              })),
            },
          }),
        )
        return
      }

      const sc = msg.serverContent
      if (!sc) return

      if (sc.interrupted) {
        // Student barged in — cut Ama's audio and close her bubble as spoken so far.
        stopPlayback()
        flush('p')
      }
      if (sc.inputTranscription && sc.inputTranscription.text) {
        if (outBuf) flush('p')
        inBuf += sc.inputTranscription.text
        onTurn('s', inBuf.trim(), false)
      }
      if (sc.outputTranscription && sc.outputTranscription.text) {
        if (inBuf) flush('s')
        outBuf += sc.outputTranscription.text
        onTurn('p', outBuf.trim(), false)
      }
      const inline = sc.modelTurn && sc.modelTurn.parts && sc.modelTurn.parts.find((p) => p.inlineData)
      if (inline && !paused) playChunk(inline.inlineData.data)
      if (sc.turnComplete) {
        flush('s')
        flush('p')
      }
    }

    ws.onerror = () => reject(new Error('Live connection failed'))
    ws.onclose = () => {
      if (!closed) {
        flush('s')
        flush('p')
      }
      cleanup()
    }

    setTimeout(() => reject(new Error('Live connection timed out')), 10000)
  }).catch((e) => {
    cleanup()
    throw e
  })

  return {
    end: cleanup,
    pause() {
      paused = true
      stopPlayback()
      playCtx.suspend().catch(() => {})
    },
    resume() {
      paused = false
      playCtx.resume().catch(() => {})
    },
    /** Feed a typed question into the call as if the student had said it. */
    sendText(text) {
      if (!ws || ws.readyState !== 1) return
      flush('p')
      ws.send(
        JSON.stringify({
          clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true },
        }),
      )
    },
  }
}
