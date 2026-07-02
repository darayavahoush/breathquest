"""
audio.py — Microphone input, noise calibration, breath detection.

Designed to be swappable: the rest of the game only reads `breath_value` (0-1).
On a web port, replace this module with a JS AudioWorklet bridge.
"""

import threading
import numpy as np
import pyaudio
from assets.constants import (
    SAMPLE_RATE, CHUNK, CALIBRATION_FRAMES,
    NOISE_MULTIPLIER, BREATH_SMOOTHING,
)


class AudioEngine:
    def __init__(self):
        self._pa = None
        self._stream = None
        self._thread = None
        self._running = False

        self.breath_value: float = 0.0        # smoothed, noise-subtracted, 0-1
        self.raw_rms: float = 0.0
        self.noise_floor: float = 0.0
        self.calibrated: bool = False
        self.calibrating: bool = False
        self._cal_samples: list[float] = []
        self._ema: float = 0.0                # exponential moving average

        self.error: str | None = None

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def start(self):
        """Open mic stream and begin calibration."""
        try:
            self._pa = pyaudio.PyAudio()
            self._stream = self._pa.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=SAMPLE_RATE,
                input=True,
                frames_per_buffer=CHUNK,
            )
            self._running = True
            self.calibrating = True
            self._thread = threading.Thread(target=self._loop, daemon=True)
            self._thread.start()
        except Exception as exc:
            self.error = str(exc)

    def stop(self):
        self._running = False
        if self._stream:
            try:
                self._stream.stop_stream()
                self._stream.close()
            except Exception:
                pass
        if self._pa:
            self._pa.terminate()

    def is_blowing(self, threshold: float = 0.08) -> bool:
        return self.breath_value >= threshold

    def calibration_progress(self) -> float:
        """0-1 progress through calibration."""
        return min(1.0, len(self._cal_samples) / CALIBRATION_FRAMES)

    # ------------------------------------------------------------------ #
    #  Internal                                                            #
    # ------------------------------------------------------------------ #

    def _loop(self):
        while self._running:
            try:
                data = self._stream.read(CHUNK, exception_on_overflow=False)
            except Exception:
                break

            samples = np.frombuffer(data, dtype=np.int16).astype(np.float32)
            rms = float(np.sqrt(np.mean(samples ** 2))) / 32768.0
            self.raw_rms = rms

            if self.calibrating:
                self._cal_samples.append(rms)
                if len(self._cal_samples) >= CALIBRATION_FRAMES:
                    self.noise_floor = (
                        float(np.percentile(self._cal_samples, 90))
                        * NOISE_MULTIPLIER
                    )
                    self.calibrating = False
                    self.calibrated = True
                self.breath_value = 0.0
            else:
                above = max(0.0, rms - self.noise_floor)
                # normalise: assume 0.3 raw RMS is "full blow"
                norm = min(1.0, above / 0.30)
                # EMA smoothing
                self._ema += BREATH_SMOOTHING * (norm - self._ema)
                self.breath_value = round(self._ema, 4)
