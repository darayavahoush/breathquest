"""
Level 4 — Balloon Pop Challenge
Inflate the balloon to land in the target size zone.
Too little = miss the target. Too much = POP and lose a life!
"""
import math, random
import pygame
from levels.base import BaseLevel
from assets.constants import *

TARGET_MIN = 0.55
TARGET_MAX = 0.80
MAX_SIZE   = 1.0
DEFLATE_RATE = 0.07   # slowly deflates when not blowing

class BalloonLevel(BaseLevel):
    ROUNDS = 4

    def __init__(self, screen, fonts):
        super().__init__(screen, fonts)
        self.round = 0
        self.size = 0.0          # 0-1
        self.lives = 3
        self.popped = False
        self._pop_t = 0.0
        self._pop_particles: list[dict] = []
        self._locked = False     # locked in target zone?
        self._lock_t = 0.0
        self._balloon_hue = 0
        self._done_timer = 0.0
        self._wobble = 0.0
        self._new_balloon()

    def _new_balloon(self):
        self.size = 0.0
        self.popped = False
        self._pop_t = 0.0
        self._locked = False
        self._lock_t = 0.0
        self._balloon_hue = random.choice([0, 30, 200, 280, 120])
        self._pop_particles.clear()

    def update(self, breath: float, dt: float):
        self.elapsed += dt
        self._wobble += dt * 5

        if self.round >= self.ROUNDS and not self.done:
            self._done_timer += dt
            if self._done_timer > 0.8:
                stars = 3 if self.lives == 3 else (2 if self.lives >= 2 else 1)
                self._finish(stars, "What precision! 🎈")
            return

        if self.popped:
            self._pop_t += dt
            for p in self._pop_particles:
                p["x"] += p["vx"] * dt
                p["y"] += p["vy"] * dt
                p["vy"] += 200 * dt
                p["life"] -= dt
            self._pop_particles = [p for p in self._pop_particles if p["life"] > 0]
            if self._pop_t > 1.2:
                self._new_balloon()
            return

        # inflate
        if breath > 0.05:
            self.size += breath * 0.55 * dt
        else:
            self.size -= DEFLATE_RATE * dt
        self.size = self._clamp(self.size, 0.0, MAX_SIZE + 0.05)

        # pop!
        if self.size >= MAX_SIZE + 0.02:
            self._pop()
            return

        # check target lock
        in_zone = TARGET_MIN <= self.size <= TARGET_MAX
        if in_zone:
            self._lock_t += dt
        else:
            self._lock_t = max(0.0, self._lock_t - dt * 2)

        # hold in zone for 0.8s → success
        if self._lock_t >= 0.8 and not self.popped:
            self.round += 1
            self._new_balloon()

    def _pop(self):
        self.popped = True
        self._pop_t = 0.0
        self.lives = max(0, self.lives - 1)
        cx, cy = self.W // 2, self.H // 2
        for _ in range(30):
            angle = random.uniform(0, math.pi * 2)
            spd = random.uniform(100, 300)
            self._pop_particles.append({
                "x": cx, "y": cy,
                "vx": math.cos(angle) * spd,
                "vy": math.sin(angle) * spd,
                "life": random.uniform(0.4, 0.9),
                "col": random.choice([CORAL, AMBER, ACID_GREEN, SKY_BLUE, PURPLE]),
                "r": random.randint(4, 10),
            })
        if self.lives <= 0:
            self.lives = 1  # give minimum to continue

    def draw(self):
        # dark bg
        for i in range(self.H):
            t = i / self.H
            r = int(20 + t * 15)
            g = int(10 + t * 20)
            b = int(50 + t * 40)
            pygame.draw.line(self.screen, (r, g, b), (0, i), (self.W, i))

        cx, cy = self.W // 2, self.H // 2

        if not self.popped:
            # target zone indicator
            min_r = int(40 + TARGET_MIN * 120)
            max_r = int(40 + TARGET_MAX * 120)
            zone_surf = pygame.Surface((self.W, self.H), pygame.SRCALPHA)
            pygame.draw.circle(zone_surf, (168, 255, 111, 30), (cx, cy), max_r)
            pygame.draw.circle(zone_surf, (20, 10, 50, 0), (cx, cy), min_r)
            self.screen.blit(zone_surf, (0, 0))
            pygame.draw.circle(self.screen, ACID_GREEN, (cx, cy), max_r, 2)
            pygame.draw.circle(self.screen, (80, 200, 80), (cx, cy), min_r, 2)
            self._draw_text("Target zone", "sm", ACID_GREEN, cx, cy - max_r - 14)

            # balloon
            radius = int(40 + self.size * 120)
            wobble_x = int(math.sin(self._wobble) * 4 * self.size)
            h = self._balloon_hue
            col = pygame.Color(0); col.hsva = (h, 80, 90, 100)
            col2 = pygame.Color(0); col2.hsva = (h, 60, 100, 100)
            pygame.draw.ellipse(self.screen, col,
                                (cx - radius + wobble_x, cy - int(radius * 1.2),
                                 radius * 2, int(radius * 2.4)))
            # shine
            pygame.draw.ellipse(self.screen, col2,
                                (cx - radius // 2 + wobble_x, cy - int(radius * 0.9),
                                 radius // 2, radius // 2))
            # string
            pygame.draw.line(self.screen, GRAY,
                             (cx + wobble_x, cy + int(radius * 1.2)),
                             (cx, cy + int(radius * 1.2) + 60), 2)
            # knot
            pygame.draw.circle(self.screen, col,
                               (cx + wobble_x, cy + int(radius * 1.2)), 6)

            # size bar
            bar_w = 300
            bar_x = cx - bar_w // 2
            bar_y = self.H - 70
            pygame.draw.rect(self.screen, GRAY, (bar_x, bar_y, bar_w, 14), border_radius=7)
            fill_col = ACID_GREEN if TARGET_MIN <= self.size <= TARGET_MAX else (CORAL if self.size > TARGET_MAX else AMBER)
            pygame.draw.rect(self.screen, fill_col,
                             (bar_x, bar_y, int(bar_w * min(1, self.size)), 14),
                             border_radius=7)
            # markers
            pygame.draw.line(self.screen, WHITE,
                             (bar_x + int(bar_w * TARGET_MIN), bar_y - 4),
                             (bar_x + int(bar_w * TARGET_MIN), bar_y + 18), 2)
            pygame.draw.line(self.screen, WHITE,
                             (bar_x + int(bar_w * TARGET_MAX), bar_y - 4),
                             (bar_x + int(bar_w * TARGET_MAX), bar_y + 18), 2)

            # lock indicator
            if self._lock_t > 0:
                lock_prog = self._lock_t / 0.8
                self._draw_text(f"Hold it! {'█' * int(lock_prog * 8)}{'░' * (8 - int(lock_prog * 8))}",
                                "md", ACID_GREEN, cx, self.H - 30)

        # pop particles
        for p in self._pop_particles:
            a = max(0, int(p["life"] * 255))
            surf = pygame.Surface((p["r"] * 2, p["r"] * 2), pygame.SRCALPHA)
            pygame.draw.circle(surf, (*p["col"], a), (p["r"], p["r"]), p["r"])
            self.screen.blit(surf, (int(p["x"]) - p["r"], int(p["y"]) - p["r"]))

        if self.popped:
            self._draw_text("POP! 💥", "lg", CORAL, cx, cy)

        # HUD
        for i in range(3):
            col = CORAL if i < self.lives else GRAY
            self._draw_text("❤", "md", col, 30 + i * 32, 30)
        self._draw_text(f"Round {self.round + 1}/{self.ROUNDS}", "md", WHITE, self.W // 2, 30)
        self._draw_text("Inflate to the target zone — hold it steady! 🎈", "sm", AMBER, self.W // 2, self.H - 100)
