"""
Level 6 — Dragon Fire 🐉
Blow hard and long to shoot fire across gaps.
The fire travels further the longer and harder you blow.
Cross 5 gaps of increasing width!
"""
import math, random
import pygame
from levels.base import BaseLevel
from assets.constants import *


GAP_WIDTHS = [120, 160, 200, 250, 300]   # gap widths in px


class FireParticle:
    def __init__(self, x, y, power):
        angle = random.uniform(-0.3, 0.3)
        spd = random.uniform(180, 350) * (0.6 + power * 0.4)
        self.x = float(x)
        self.y = float(y)
        self.vx = math.cos(angle) * spd
        self.vy = math.sin(angle) * spd - 40
        self.life = random.uniform(0.3, 0.7)
        self.maxlife = self.life
        self.r = random.randint(6, int(6 + power * 16))

    def update(self, dt):
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.vy += 80 * dt
        self.life -= dt

    @property
    def alive(self): return self.life > 0


class DragonLevel(BaseLevel):
    PLATFORM_H = 80
    DRAGON_X = 90

    def __init__(self, screen, fonts):
        super().__init__(screen, fonts)
        self.gap_index = 0       # current gap
        self.fire_power = 0.0   # accumulated fire power (0-1)
        self._blowing_t = 0.0
        self._fire_active = False
        self._fire_x = 0.0
        self._fire_y = 0.0
        self._fire_particles: list[FireParticle] = []
        self._platforms = self._build_platforms()
        self._dragon_y_base = self.H - self.PLATFORM_H - 60
        self._dragon_bob = 0.0
        self._tail_t = 0.0
        self._success_flash = 0.0
        self._fail_flash = 0.0
        self._done_timer = 0.0
        self.lives = 3

    def _build_platforms(self):
        """Returns list of (x, w) for each platform. Player is always on first."""
        platforms = []
        x = 0
        pw = 180   # platform width
        for gap in GAP_WIDTHS:
            platforms.append((x, pw))
            x += pw + gap
        platforms.append((x, 300))   # final platform
        return platforms

    def _gap_info(self):
        """(gap_start_x, gap_end_x) for current gap."""
        px, pw = self._platforms[self.gap_index]
        gap_start = px + pw
        nx, _ = self._platforms[self.gap_index + 1]
        return gap_start, nx

    def _platform_x_to_screen(self, wx):
        """Scroll: current player platform left edge stays at x=0."""
        px, _ = self._platforms[self.gap_index]
        return wx - px

    def update(self, breath: float, dt: float):
        self.elapsed += dt
        self._dragon_bob += dt * 3
        self._tail_t += dt

        if self.gap_index >= len(GAP_WIDTHS) and not self.done:
            self._done_timer += dt
            if self._done_timer > 1.0:
                stars = 3 if self.lives == 3 else (2 if self.lives >= 2 else 1)
                self._finish(stars, "Dragon master! 🔥 All gaps crossed!")
            return

        if self._success_flash > 0:
            self._success_flash -= dt
        if self._fail_flash > 0:
            self._fail_flash -= dt

        # fire particles
        is_blowing = breath >= BREATH_MEDIUM * 0.7
        if is_blowing:
            self._blowing_t += dt
            self.fire_power = self._clamp(self.fire_power + breath * dt * 1.5, 0, 1)
            mouth_y = self._dragon_y_base + int(math.sin(self._dragon_bob) * 5) - 5
            for _ in range(int(breath * 6) + 1):
                self._fire_particles.append(
                    FireParticle(self.DRAGON_X + 50, mouth_y, breath)
                )
        else:
            self._blowing_t = 0.0
            self.fire_power = max(0.0, self.fire_power - dt * 0.8)

        for p in self._fire_particles:
            p.update(dt)
        self._fire_particles = [p for p in self._fire_particles if p.alive]

        # check if fire crossed the gap
        gap_start, gap_end = self._gap_info()
        gap_start_s = self._platform_x_to_screen(gap_start)
        gap_end_s = self._platform_x_to_screen(gap_end)

        fire_xs = [p.x for p in self._fire_particles if p.y > self.H - self.PLATFORM_H - 60]
        if fire_xs and max(fire_xs) >= gap_end_s:
            self.gap_index += 1
            self._fire_particles.clear()
            self._success_flash = 0.6
            self.fire_power = 0.0
            if self.gap_index >= len(GAP_WIDTHS):
                pass   # done

        # fail: no fire reached and breath stopped
        fire_in_gap = any(gap_start_s < p.x < gap_end_s for p in self._fire_particles)
        if not is_blowing and not fire_in_gap and self.fire_power < 0.05 and self.elapsed > 1.5:
            pass  # just wait, no fail penalty for this level

    def draw(self):
        # dark cave background
        for i in range(self.H):
            t = i / self.H
            r = int(self._lerp(30, 60, t))
            g = int(self._lerp(10, 20, t))
            b = int(self._lerp(10, 15, t))
            pygame.draw.line(self.screen, (r, g, b), (0, i), (self.W, i))

        py = self.H - self.PLATFORM_H

        # draw platforms in screen space
        for i, (px, pw) in enumerate(self._platforms):
            sx = self._platform_x_to_screen(px)
            if sx + pw < -10 or sx > self.W + 10:
                continue
            pygame.draw.rect(self.screen, (80, 50, 20), (sx, py, pw, self.PLATFORM_H))
            pygame.draw.rect(self.screen, BROWN, (sx, py, pw, 16))
            pygame.draw.rect(self.screen, (120, 80, 30), (sx, py, pw, 16), 2)

            # gap label
            if i < len(GAP_WIDTHS):
                gap_sx = self._platform_x_to_screen(px + pw)
                gap_w = GAP_WIDTHS[i]
                if 0 < gap_sx < self.W:
                    # lava in gap
                    for j in range(int(gap_w)):
                        lava_t = (j / gap_w)
                        lava_y = py + 20 + int(math.sin(self.elapsed * 4 + lava_t * 10) * 6)
                        col_r = 220 + int(35 * abs(math.sin(self.elapsed * 3 + lava_t * 5)))
                        col_g = int(60 * lava_t)
                        pygame.draw.line(self.screen, (col_r, col_g, 0),
                                         (gap_sx + j, lava_y), (gap_sx + j, py + self.PLATFORM_H), 1)

        # fire particles
        for p in self._fire_particles:
            t = p.life / p.maxlife
            if t > 0.6:
                col = FLAME_CORE
            elif t > 0.3:
                col = AMBER
            else:
                col = (ORANGE[0], int(ORANGE[1] * t * 2), 0)
            alpha = int(t * 220)
            surf = pygame.Surface((p.r * 2, p.r * 2), pygame.SRCALPHA)
            pygame.draw.circle(surf, (*col, alpha), (p.r, p.r), p.r)
            self.screen.blit(surf, (int(p.x) - p.r, int(p.y) - p.r))

        # dragon
        self._draw_dragon()

        # success flash
        if self._success_flash > 0:
            overlay = pygame.Surface((self.W, self.H), pygame.SRCALPHA)
            a = int(self._success_flash * 160)
            overlay.fill((255, 200, 0, min(80, a)))
            self.screen.blit(overlay, (0, 0))
            self._draw_text("Gap crossed! 🔥", "lg", GOLD, self.W // 2, self.H // 2 - 40)

        # HUD
        for i in range(3):
            col = CORAL if i < self.lives else GRAY
            self._draw_text("❤", "md", col, 30 + i * 32, 30)

        gap_label = f"Gap {self.gap_index + 1}/{len(GAP_WIDTHS)}"
        if self.gap_index >= len(GAP_WIDTHS):
            gap_label = "All gaps crossed! 🏆"
        self._draw_text(gap_label, "md", WHITE, self.W // 2, 30)

        # power meter
        bar_x, bar_y, bar_w = self.W - 160, self.H // 2 - 80, 20
        bar_h = 160
        pygame.draw.rect(self.screen, GRAY, (bar_x, bar_y, bar_w, bar_h), border_radius=4)
        fill_h = int(bar_h * self.fire_power)
        if fill_h > 0:
            col = AMBER if self.fire_power < 0.5 else (ORANGE if self.fire_power < 0.8 else CORAL)
            pygame.draw.rect(self.screen, col,
                             (bar_x, bar_y + bar_h - fill_h, bar_w, fill_h), border_radius=4)
        self._draw_text("🔥", "sm", WHITE, bar_x + bar_w // 2, bar_y - 14)

        gap_start, gap_end = (0, 0)
        if self.gap_index < len(GAP_WIDTHS):
            gap_start, gap_end = self._gap_info()
            self._draw_text(f"Gap: {GAP_WIDTHS[self.gap_index]}px wide", "sm", AMBER,
                            self.W // 2, self.H - 24)
            self._draw_text("Blow hard and long to shoot fire across! 🐉", "sm", LIGHT_GRAY,
                            self.W // 2, self.H - 48)

    def _draw_dragon(self):
        x = self.DRAGON_X
        y = self._dragon_y_base + int(math.sin(self._dragon_bob) * 5)

        # tail
        for i in range(6):
            t = i / 5
            tx = x - 20 - int(t * 70)
            ty = y + 20 + int(math.sin(self._tail_t * 4 + t * 3) * 12)
            r = max(3, int(14 - t * 10))
            pygame.draw.circle(self.screen, (60, 140, 40), (tx, ty), r)

        # body
        pygame.draw.ellipse(self.screen, (50, 130, 40), (x - 40, y, 80, 50))
        # belly
        pygame.draw.ellipse(self.screen, (100, 200, 80), (x - 25, y + 10, 50, 30))
        # head
        pygame.draw.ellipse(self.screen, (50, 130, 40), (x + 20, y - 10, 55, 40))
        # eye
        pygame.draw.circle(self.screen, GOLD, (x + 55, y), 8)
        pygame.draw.circle(self.screen, BLACK, (x + 57, y), 4)
        # nostril / mouth
        pygame.draw.circle(self.screen, (30, 100, 20), (x + 70, y + 8), 4)
        # horns
        pygame.draw.polygon(self.screen, (80, 60, 20), [
            (x + 30, y - 10), (x + 25, y - 35), (x + 38, y - 10)
        ])
        pygame.draw.polygon(self.screen, (80, 60, 20), [
            (x + 45, y - 12), (x + 42, y - 32), (x + 55, y - 10)
        ])
        # wing
        wing_angle = math.sin(self._dragon_bob * 1.5) * 0.25
        wing_pts = [
            (x - 10, y + 5),
            (x - 10 + int(math.cos(wing_angle - 0.8) * 60),
             y + 5 + int(math.sin(wing_angle - 0.8) * 60)),
            (x - 10 + int(math.cos(wing_angle - 0.4) * 70),
             y + 5 + int(math.sin(wing_angle - 0.4) * 50)),
            (x - 10 + int(math.cos(wing_angle) * 55),
             y + 5 + int(math.sin(wing_angle) * 35)),
        ]
        pygame.draw.polygon(self.screen, (70, 30, 120), wing_pts)
        pygame.draw.polygon(self.screen, (100, 50, 160), wing_pts, 2)
