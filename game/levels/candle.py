"""
levels/candle.py — Level 3: Candle Gauntlet
5 candles. Sharp puff to extinguish each. Must stop blowing before next one lights up.
"""
import math, random
import pygame
from levels.base import BaseLevel
from assets.constants import *


class CandleLevel(BaseLevel):
    NUM_CANDLES = 5

    def __init__(self, screen, fonts):
        super().__init__(screen, fonts)
        self.candles = [{"lit": True, "extinguish_t": 0.0, "smoke_y": 0.0}
                        for _ in range(self.NUM_CANDLES)]
        self.current = 0
        self.puff_cd = 0.0        # cooldown after puff
        self._flame_wobble = 0.0
        self._particles: list[dict] = []
        self._done_timer = 0.0

    def update(self, breath: float, dt: float):
        self.elapsed += dt
        self._flame_wobble += dt * 6
        self.puff_cd = max(0.0, self.puff_cd - dt)

        for p in self._particles:
            p["x"] += p["vx"] * dt
            p["y"] += p["vy"] * dt
            p["life"] -= dt
            p["vy"] -= 30 * dt
        self._particles = [p for p in self._particles if p["life"] > 0]

        if self.current >= self.NUM_CANDLES:
            self._done_timer += dt
            if self._done_timer > 0.8 and not self.done:
                self._finish(3, "All candles out! Incredible breath control! 🕯️")
            return

        # sharp puff detection
        if breath >= BREATH_HARD * 0.6 and self.puff_cd <= 0 and self.candles[self.current]["lit"]:
            self.candles[self.current]["lit"] = False
            self.puff_cd = 0.9
            cx, cy = self._candle_pos(self.current)
            for _ in range(18):
                self._particles.append({
                    "x": cx, "y": cy - 60,
                    "vx": random.uniform(-60, 60),
                    "vy": random.uniform(-90, -20),
                    "life": random.uniform(0.5, 1.2),
                    "col": random.choice([AMBER, FLAME_CORE, ORANGE]),
                })
            self.current += 1

    def _candle_pos(self, i):
        spacing = (self.W - 160) / (self.NUM_CANDLES - 1)
        return (int(80 + i * spacing), self.H // 2 + 40)

    def draw(self):
        self.screen.fill((20, 10, 30))

        # floor
        pygame.draw.rect(self.screen, (40, 25, 10), (0, self.H // 2 + 80, self.W, self.H))

        # table
        pygame.draw.rect(self.screen, BROWN, (40, self.H // 2 + 75, self.W - 80, 12))

        for i, candle in enumerate(self.candles):
            cx, cy = self._candle_pos(i)
            # candle body
            col = (240, 230, 200) if i >= self.current else LIGHT_GRAY
            pygame.draw.rect(self.screen, col, (cx - 14, cy - 50, 28, 70), border_radius=4)
            pygame.draw.rect(self.screen, (200, 190, 160), (cx - 14, cy - 50, 28, 70), 2, border_radius=4)
            # wick
            pygame.draw.line(self.screen, (80, 60, 40), (cx, cy - 50), (cx, cy - 58), 2)

            if candle["lit"]:
                wobble = math.sin(self._flame_wobble + i) * 4
                # outer flame
                for r, c, off in [(18, ORANGE, 0), (13, AMBER, 0), (8, FLAME_CORE, 0)]:
                    pts = [
                        (cx + wobble, cy - 58 - r * 2),
                        (cx - r + wobble, cy - 58),
                        (cx + r + wobble, cy - 58),
                    ]
                    pygame.draw.polygon(self.screen, c, pts)
                # glow
                glow = pygame.Surface((80, 80), pygame.SRCALPHA)
                pygame.draw.circle(glow, (*AMBER, 40), (40, 40), 40)
                self.screen.blit(glow, (cx - 40, cy - 100))
            else:
                # smoke
                t = self.elapsed
                sy = cy - 60 - (t * 30) % 80
                pygame.draw.circle(self.screen, (160, 160, 160, 100),
                                   (cx + int(math.sin(t * 3) * 6), int(sy)), 6)

            # indicator
            done_col = ACID_GREEN if not candle["lit"] else (AMBER if i == self.current else GRAY)
            pygame.draw.circle(self.screen, done_col, (cx, cy + 30), 7)

        # particles
        for p in self._particles:
            a = max(0, int(p["life"] * 200))
            surf = pygame.Surface((12, 12), pygame.SRCALPHA)
            pygame.draw.circle(surf, (*p["col"], a), (6, 6), 5)
            self.screen.blit(surf, (int(p["x"]) - 6, int(p["y"]) - 6))

        # instructions
        if self.current < self.NUM_CANDLES:
            self._draw_text("One sharp PUFF to blow out each candle! 💨", "md", AMBER,
                            self.W // 2, 36)
            remaining = self.NUM_CANDLES - self.current
            self._draw_text(f"{remaining} left to go!", "sm", LIGHT_GRAY,
                            self.W // 2, self.H - 24)
        else:
            self._draw_text("All out! Amazing! 🌟", "lg", GOLD, self.W // 2, 36)
