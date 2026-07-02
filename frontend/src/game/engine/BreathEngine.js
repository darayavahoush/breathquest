/**
 * BreathEngine v8 — Continuous adaptive baseline
 *
 * The baseline tracks the RUNNING MINIMUM of recent RMS values.
 * It uses two speeds:
 *   - Falls FAST when signal drops (catches new quiet level quickly)
 *   - Never rises with signal (blowing doesn't raise the baseline)
 *
 * Additionally, a "noise gate" requires the signal to exceed the
 * baseline by a meaningful margin AND sustain for a few frames
 * before registering as breath. This kills brief noise spikes.
 *
 * Result: works in quiet rooms, works when a mixer turns on,
 * works when someone walks past. Continuously re-adapts.
 */
export class BreathEngine {
  constructor() {
    this.breathValue    = 0
    this.calibrated     = false
    this.calibrating    = false
    this._ema           = 0
    this._ctx           = null
    this._analyser      = null
    this._gainNode      = null
    this._stream        = null
    this._raf           = null
    this.onBreath       = null
    this.onCalibrated   = null
    this.calProgress    = 0

    this._baseline      = 0.3    // rolling min — tracks quiet level continuously
    this._lastRaw       = 0
    this._noiseFloor    = 0      // alias for debug display
    this._calMedian     = 0
    this._calP95        = 0

    // Sustain gate: signal must stay above threshold for N frames
    this._sustainCount  = 0
    this._SUSTAIN_NEEDED = 3     // ~50ms at 60fps — kills transient spikes
  }

  async start() {
    this._stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl:  true,
      }
    })
    this._ctx      = new (window.AudioContext || window.webkitAudioContext)()
    this._gainNode = this._ctx.createGain()
    this._gainNode.gain.value = 3.5

    this._analyser = this._ctx.createAnalyser()
    this._analyser.fftSize = 1024
    this._analyser.smoothingTimeConstant = 0   // raw frames — no carryover

    const src = this._ctx.createMediaStreamSource(this._stream)
    src.connect(this._gainNode)
    this._gainNode.connect(this._analyser)

    this.calibrating = true
    this._calibrate()
  }

  stop() {
    this._raf && cancelAnimationFrame(this._raf)
    this._stream?.getTracks().forEach(t => t.stop())
    this._ctx?.close()
    this.calibrated  = false
    this.breathValue = 0
    this._ema        = 0
    this._sustainCount = 0
  }

  _rms(arr) {
    let s = 0
    for (let i = 0; i < arr.length; i++) s += (arr[i] / 255) ** 2
    return Math.sqrt(s / arr.length)
  }

  _calibrate() {
    const CAL_MS  = 2000
    const SKIP_MS = 400
    const start   = performance.now()
    const arr     = new Uint8Array(this._analyser.frequencyBinCount)
    const samples = []

    const loop = () => {
      this._analyser.getByteFrequencyData(arr)
      const elapsed = performance.now() - start
      if (elapsed > SKIP_MS) samples.push(this._rms(arr))
      this.calProgress = Math.min(1, elapsed / CAL_MS)

      if (elapsed < CAL_MS) {
        this._raf = requestAnimationFrame(loop)
      } else {
        const sorted = [...samples].sort((a, b) => a - b)
        const p50    = sorted[Math.floor(sorted.length * 0.50)]
        const p85    = sorted[Math.floor(sorted.length * 0.85)]
        const p95    = sorted[Math.floor(sorted.length * 0.95)]

        // Set initial baseline to p85 — captures actual room noise level
        this._baseline   = p85
        this._noiseFloor = p85
        this._calMedian  = p50
        this._calP95     = p95

        this.calibrating = false
        this.calibrated  = true
        this.onCalibrated?.()
        this._loop()
      }
    }
    this._raf = requestAnimationFrame(loop)
  }

  _loop() {
    const arr = new Uint8Array(this._analyser.frequencyBinCount)

    const tick = () => {
      this._analyser.getByteFrequencyData(arr)
      const raw = this._rms(arr)
      this._lastRaw    = raw
      this._noiseFloor = this._baseline   // for debug

      // ── Continuous adaptive baseline ──
      // Only update baseline DOWNWARD (when signal is quiet)
      // This means: new noise → baseline rises naturally as it chases signal down
      // Wait — we want baseline to RISE when noise rises too!
      // So: if raw is between baseline and baseline*1.4 (noise, not breath),
      //     slowly push baseline UP toward the new noise level
      if (raw < this._baseline) {
        // Signal quieter than baseline — drop baseline fast
        this._baseline += (raw - this._baseline) * 0.12
      } else if (raw < this._baseline * 1.35) {
        // Signal slightly above baseline — probably noise, not breath
        // Slowly raise baseline to adapt to new noise level
        this._baseline += (raw - this._baseline) * 0.004
      }
      // If raw > baseline * 1.35 — probably breath, don't update baseline

      // ── Noise gate with sustain ──
      const threshold = this._baseline * 1.35   // must exceed by 35%
      const above     = raw - threshold

      if (above > 0) {
        this._sustainCount = Math.min(this._sustainCount + 1, this._SUSTAIN_NEEDED + 5)
      } else {
        this._sustainCount = Math.max(this._sustainCount - 2, 0)   // drop faster than rise
      }

      const sustained = this._sustainCount >= this._SUSTAIN_NEEDED

      if (!sustained) {
        // Not sustained — decay fast
        this._ema *= 0.55
        if (this._ema < 0.005) this._ema = 0
      } else {
        // Sustained breath — normalise
        // above / (baseline * 0.5) = full breath when signal is 85% above threshold
        const norm = Math.min(1, above / (this._baseline * 0.5))
        this._ema += 0.45 * (norm - this._ema)
      }

      this.breathValue = +this._ema.toFixed(4)
      this.onBreath?.(this.breathValue)
      this._raf = requestAnimationFrame(tick)
    }

    this._raf = requestAnimationFrame(tick)
  }
}
