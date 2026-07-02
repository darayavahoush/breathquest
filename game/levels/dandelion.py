"""
Level 5 — Dandelion Storm
Dandelions drift across. Quick puffs send seeds flying.
Collect enough seeds before they exit the screen.
"""
import math, random
import pygame
from levels.base import BaseLevel
from assets.constants import *

SEEDS_NEEDED = 20


class Seed:
    def __init__(self, x, y):
        self.x = float(x)
        self.y = float(y)
        self.vx = random.uniform(60, 180)
        self.vy = random.uniform(-120, -40)
        self.life = random.uniform(1.4, 2.6)
        self.maxlife = self.life
        self.collected = False
        self.rot = random.uniform(0, 360)
        self.rot_spd = random.uniform(-120, 120)

    def update(self, dt):
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.vy += 60 * dt   # light gravity
        self.rot += self.rot_spd * dt
        self.life -= dt

    @property
    def alive(self): return self.life > 0 and self.x < 1000


class Dandelion:
    def __init__(self, x, y):
        self.x = float(x)
        self.y = float(y)
        self.seeds_left = 12
        self.vx = -random.uniform(30, 60)

    def update(self, dt):
        self.x += self.vx * dt


class DandelionLevel(BaseLevel):

    def __init__(self, screen, fonts):
        super().__init__(screen, fonts)
        self.seeds_collected = 0
        self.seeds: list[Seed] = []
        self.dandelions: list[Dandelion] = []
        self._spawn_t = 0.0
        self._spawn_interval = 1.8
        self._puff_cd = 0.0
        self._was_blowing = False
        self._total_spawned = 0
        self._score_floats: list[dict] = []
        self._done_timer = 0.0
        self._spawn_dandelion()

    def _spawn_dandelion(self):
        if self._total_spawned < 8:
            x = self.W + 60
            y = random.randint(self.H // 3, int(self.H * 0.75))
            self.dandelions.append(Dandelion(x, y))
            self._total_spawned += 1

    def update(self, breath: float, dt: float):
        self.elapsed += dt
        self._puff_cd = max(0.0, self._puff_cd - dt)
        self._spawn_t += dt

        if self._spawn_t >= self._spawn_interval:
            self._spawn_t = 0.0
            self._spawn_dandelion()

        # puff detection (leading edge)
        is_blowing = breath >= BREATH_SOFT * 1.5
        puff_start = is_blowing and not self._was_blowing and self._puff_cd <= 0
        self._was_blowing = is_blowing

        # remove dandelions that have crossed
        self.dandelions = [d for d in self.dandelions if d.x > -100]
        for d in self.dandelions:
            d.update(dt)
            if puff_start and d.seeds_left > 0:
                dist = math.hypot(d.x - 200, d.y - self.H // 2)
                if dist < 400:
                    burst = min(d.seeds_left, random.randint(4, 7))
                    d.seeds_left -= burst
                    for _ in range(burst):
                        self.seeds.append(Seed(d.x, d.y))
                    self._puff_cd = 0.35
                    self.seeds_collected += burst
                    self._score_floats.append({
                        "x": d.x, "y": d.y - 30,
                        "text": f"+{burst}",
                        "life": 1.0,
                    })

        for s in self.seeds:
            s.update(dt)
        self.seeds = [s for s in self.seeds if s.alive]

        for f in self._score_floats:
            f["y"] -= 40 * dt
            f["life"] -= dt
        self._score_floats = [f for f in self._score_floats if f["life"] > 0]

        if self.seeds_collected >= SEEDS_NEEDED and not self.done:
            self._done_timer += dt
            if self._done_timer > 0.8:
                self._finish(3, "Seeds everywhere! Magical puffs! 🌼")

    def draw(self):
        # gradient sky
        for i in range(self.H):
            t = i / self.H
            r = int(self._lerp(255, 220, t))
            g = int(self._lerp(200, 170, t))
            b = int(self._lerp(100, 80, t))
            pygame.draw.line(self.screen, (r, g, b), (0, i), (self.W, i))

        # ground
        pygame.draw.rect(self.screen, DARK_GREEN, (0, int(self.H * 0.82), self.W, self.H))
        pygame.draw.rect(self.screen, GRASS_GREEN, (0, int(self.H * 0.82), self.W, 16))

        # dandelions
        for d in self.dandelions:
            x, y = int(d.x), int(d.y)
            # stem
            pygame.draw.line(self.screen, DARK_GREEN, (x, y), (x, int(self.H * 0.82)), 3)
            # head
            if d.seeds_left > 0:
                frac = d.seeds_left / 12
                for i in range(d.seeds_left):
                    angle = (i / d.seeds_left) * math.pi * 2
                    r = int(28 * frac)
                    ex = x + int(math.cos(angle) * r)
                    ey = y + int(math.sin(angle) * r)
                    pygame.draw.line(self.screen, (200, 200, 200), (x, y), (ex, ey), 1)
                    pygame.draw.circle(self.screen, WHITE, (ex, ey), 3)
                pygame.draw.circle(self.screen, AMBER, (x, y), 8)
            else:
                pygame.draw.circle(self.screen, AMBER, (x, y), 8)
                pygame.draw.circle(self.screen, (200, 180, 100), (x, y), 6)

        # seeds in flight
        for s in self.seeds:
            alpha = min(1.0, s.life / s.maxlife)
            col = (int(255 * alpha), int(255 * alpha), int(220 * alpha))
            ex = int(s.x)
            ey = int(s.y)
            # simple seed shape (line + dot)
            dx = int(math.cos(math.radians(s.rot)) * 8)
            dy = int(math.sin(math.radians(s.rot)) * 8)
            pygame.draw.line(self.screen, col, (ex, ey), (ex + dx, ey + dy), 1)
            pygame.draw.circle(self.screen, col, (ex, ey), 3)

        # score floats
        for f in self._score_floats:
            alpha = int(f["life"] * 255)
            surf = self.fonts["md"].render(f["text"], True, ACID_GREEN)
            surf.set_alpha(alpha)
            self.screen.blit(surf, surf.get_rect(center=(int(f["x"]), int(f["y"]))))

        # HUD
        progress = min(1.0, self.seeds_collected / SEEDS_NEEDED)
        bar_w = 400
        bar_x = self.W // 2 - bar_w // 2
        pygame.draw.rect(self.screen, GRAY, (bar_x, 20, bar_w, 12), border_radius=6)
        pygame.draw.rect(self.screen, ACID_GREEN,
                         (bar_x, 20, int(bar_w * progress), 12), border_radius=6)
        self._draw_text(f"Seeds: {self.seeds_collected}/{SEEDS_NEEDED}", "md", WHITE,
                        self.W // 2, 50)
        self._draw_text("Quick puffs to release seeds! 🌬️", "sm", AMBER,
                        self.W // 2, self.H - 24)
