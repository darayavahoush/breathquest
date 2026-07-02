"""
Level 1 — Pinwheel Spin
Blow to spin the pinwheel. No fail state — pure warmup.
Complete when cumulative spin reaches the goal.
"""

import math
import pygame
from levels.base import BaseLevel
from assets.constants import *


class PinwheelLevel(BaseLevel):

    SPIN_GOAL = 1440   # degrees total = 4 full rotations

    def __init__(self, screen, fonts):
        super().__init__(screen, fonts)
        self.angle = 0.0
        self.spin_total = 0.0
        self.spin_speed = 0.0
        self.cx = self.W // 2
        self.cy = self.H // 2 - 20
        self.stem_bottom = self.cy + 180
        self._t = 0.0
        self._particles: list[dict] = []
        self._done_timer = 0.0

    def update(self, breath: float, dt: float):
        self.elapsed += dt
        self._t += dt

        target_speed = breath * 720     # max 720 deg/s
        self.spin_speed += (target_speed - self.spin_speed) * 8 * dt
        delta = self.spin_speed * dt
        self.angle += delta
        self.spin_total += abs(delta)

        # spawn wind particles
        if breath > 0.05 and self._t % 0.08 < dt:
            import random
            self._particles.append({
                "x": self.cx - 160 + random.randint(-20, 20),
                "y": self.cy + random.randint(-30, 30),
                "vx": breath * 220 + random.uniform(40, 80),
                "vy": random.uniform(-20, 20),
                "life": 0.6, "maxlife": 0.6,
                "r": random.randint(3, 7),
            })

        for p in self._particles:
            p["x"] += p["vx"] * dt
            p["y"] += p["vy"] * dt
            p["life"] -= dt
        self._particles = [p for p in self._particles if p["life"] > 0]

        if self.spin_total >= self.SPIN_GOAL and not self.done:
            self._done_timer += dt
            if self._done_timer > 0.5:
                self._finish(3, "Perfect spin! You're a natural! 🌟")

    def draw(self):
        # sky gradient (drawn as stacked rects)
        for i in range(self.H):
            t = i / self.H
            r = int(26 + t * 40)
            g = int(80 + t * 60)
            b = int(140 + t * 80)
            pygame.draw.line(self.screen, (r, g, b), (0, i), (self.W, i))

        # ground
        pygame.draw.rect(self.screen, DARK_GREEN, (0, self.stem_bottom - 10, self.W, self.H))
        pygame.draw.rect(self.screen, GRASS_GREEN, (0, self.stem_bottom - 10, self.W, 14))

        # wind particles
        for p in self._particles:
            alpha = p["life"] / p["maxlife"]
            c = (int(200 * alpha), int(230 * alpha), int(255 * alpha))
            pygame.draw.circle(self.screen, c, (int(p["x"]), int(p["y"])), p["r"])

        # stem
        pygame.draw.line(self.screen, BROWN,
                         (self.cx, self.cy), (self.cx, self.stem_bottom), 5)

        # pinwheel blades
        colors = [CORAL, TEAL, AMBER, ACID_GREEN]
        blade_pts_local = [(0, 0), (-38, -18), (-10, -55)]
        for i, color in enumerate(colors):
            blade_angle = math.radians(self.angle + i * 90)
            pts = []
            for lx, ly in blade_pts_local:
                rx = lx * math.cos(blade_angle) - ly * math.sin(blade_angle)
                ry = lx * math.sin(blade_angle) + ly * math.cos(blade_angle)
                pts.append((self.cx + rx, self.cy + ry))
            pygame.draw.polygon(self.screen, color, pts)
            # highlight
            lighter = tuple(min(255, c + 60) for c in color)
            pygame.draw.polygon(self.screen, lighter, pts, 2)

        # center pin
        pygame.draw.circle(self.screen, GOLD, (self.cx, self.cy), 10)
        pygame.draw.circle(self.screen, AMBER, (self.cx, self.cy), 6)

        # progress arc
        prog = min(1.0, self.spin_total / self.SPIN_GOAL)
        arc_rect = pygame.Rect(self.cx - 70, self.cy - 70, 140, 140)
        if prog > 0:
            pygame.draw.arc(self.screen, ACID_GREEN, arc_rect,
                            math.pi / 2, math.pi / 2 + prog * 2 * math.pi, 5)

        # HUD hint
        if self.spin_total < self.SPIN_GOAL:
            msg = "Blow to spin the pinwheel! 💨"
            self._draw_text(msg, "md", WHITE, self.W // 2, 40)
        else:
            self._draw_text("Amazing! 🎉", "lg", GOLD, self.W // 2, 40)

        # spin speed indicator
        speed_label = f"Spin speed: {'▶' * min(5, int(abs(self.spin_speed) / 144))}"
        self._draw_text(speed_label, "sm", LIGHT_GRAY, self.W // 2, self.H - 30)
