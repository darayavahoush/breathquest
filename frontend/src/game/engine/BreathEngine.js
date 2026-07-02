/**
 * BreathEngine v7 — Adaptive dynamic detection
 *
 * Instead of a fixed noise floor from calibration, we track a
 * rolling minimum (the "quiet baseline") that updates continuously.
 * 
 * When you blow, RMS spikes above the rolling min → breath detected.
 * When you stop, rolling min catches back up over ~2 seconds.
 * 
 * This works even in noisy rooms because it always tracks
 * YOUR current noise level, not a snapshot from 3 seconds ago.
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

    // Rolling baseline (tracks quiet level)
    this._baseline      = 0.3    // start high, will drop to actual quiet level
    this._lastRaw       = 0
    this._noiseFloor    = 0      // for debug display
    this._calMedian     = 0
    this._calP95        = 0
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
    this._analyser.smoothingTimeConstant = 0   // raw frames

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
  }

  _rms(arr) {
    let s = 0
    for (let i = 0; i < arr.length; i++) s += (arr[i] / 255) ** 2
    return Math.sqrt(s / arr.length)
  }

  _calibrate() {
    // Short calibration — just let analyser settle and set initial baseline
    const CAL_MS = 2000
    const start  = performance.now()
    const arr    = new Uint8Array(this._analyser.frequencyBinCount)
    const samples = []

    const loop = () => {
      this._analyser.getByteFrequencyData(arr)
      const elapsed = performance.now() - start
      if (elapsed > 400) samples.push(this._rms(arr))  // skip first 400ms
      this.calProgress = Math.min(1, elapsed / CAL_MS)

      if (elapsed < CAL_MS) {
        this._raf = requestAnimationFrame(loop)
      } else {
        const sorted = [...samples].sort((a,b) => a-b)
        const p50 = sorted[Math.floor(sorted.length * 0.50)]
        const p95 = sorted[Math.floor(sorted.length * 0.95)]

        // Set initial baseline to p50 of silence
        this._baseline   = p50
        this._noiseFloor = p50   // for debug
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
      this._noiseFloor = this._baseline  // for debug

      // Rolling baseline: tracks quiet level
      // Drops fast when signal is low (catches new quiet state quickly)
      // Does NOT rise when signal is high (so blowing doesn't raise the baseline)
      if (raw < this._baseline) {
        // Signal dropped — update baseline quickly (tau ~0.5s)
        this._baseline += (raw - this._baseline) * 0.08
      }
      // When raw > baseline, we don't update — baseline stays at quiet level

      // How much above the quiet baseline are we?
      const above = raw - this._baseline

      // Dead zone: must exceed baseline by 15% of baseline to count
      // This kills tiny fluctuations but passes real breath
      const threshold = this._baseline * 0.18

      if (above < threshold) {
        // Not blowing — fast decay
        this._ema *= 0.55
        if (this._ema < 0.005) this._ema = 0
      } else {
        // Blowing — normalise above threshold
        // breath 2× threshold = full breath value
        const norm = Math.min(1, (above - threshold) / (this._baseline * 0.35))
        this._ema += 0.45 * (norm - this._ema)
      }

      this.breathValue = +this._ema.toFixed(4)
      this.onBreath?.(this.breathValue)
      this._raf = requestAnimationFrame(tick)
    }

    this._raf = requestAnimationFrame(tick)
  }
}
