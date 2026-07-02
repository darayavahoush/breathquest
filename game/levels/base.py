"""
levels/base.py — Abstract base for all BreathQuest levels.
"""

import pygame
from abc import ABC, abstractmethod


class BaseLevel(ABC):
    """
    Each level receives the breath value each frame and draws itself.
    Returns a result dict when complete: {"stars": 1-3, "message": str}
    or None while still in progress.
    """

    def __init__(self, screen: pygame.Surface, fonts: dict):
        self.screen = screen
        self.fonts = fonts
        self.W, self.H = screen.get_size()
        self.done = False
        self.result: dict | None = None
        self.elapsed = 0.0       # seconds since level start

    @abstractmethod
    def update(self, breath: float, dt: float):
        """Process one frame. dt in seconds."""

    @abstractmethod
    def draw(self):
        """Draw everything for this frame."""

    def is_complete(self) -> bool:
        return self.done

    def get_result(self) -> dict | None:
        return self.result

    # ---- helpers ----

    def _finish(self, stars: int, message: str):
        self.done = True
        self.result = {"stars": stars, "message": message}

    def _draw_text(self, text, font_key, color, cx, cy, anchor="center"):
        surf = self.fonts[font_key].render(text, True, color)
        r = surf.get_rect()
        setattr(r, anchor, (cx, cy))
        self.screen.blit(surf, r)

    def _lerp(self, a, b, t):
        return a + (b - a) * t

    def _clamp(self, v, lo, hi):
        return max(lo, min(hi, v))
