"""
Level 2 — Float Rider 🐥
Geometry Dash–style side-scroller: breath keeps the chick afloat,
silence makes it fall. Dodge obstacles to reach the finish flag.
"""

import math
import random
import pygame
from levels.base import BaseLevel
from assets.constants import *


GRAVITY   = 620.0    # px / s²
LIFT      = 750.0    # upward force while blowing (proportional to breath)
MAX_VY    = 480.0
SCROLL_SPD = 200.0   # px / s, world scroll speed
CHICK_X   = 140      # fixed horizontal position of chick

PIPE_GAP      = 180  # vertical gap between top/bottom obstacle
PIPE_SPACING  = 340  # horizontal distance between pipe pairs
PIPE_WIDTH    = 60

NUM_PIPES = 6        # total pipes in the level (finish after last)

FLOOR_Y = HEIGHT - HUD_HEIGHT - 30
CEILING_Y = HUD_HEIGHT + 10


class Pipe:
    def __init__(self, x, gap_centre):
        self.x = float(x)
        self.gap_centre = gap_centre
        self.passed = False
        self.w = PIPE_WIDTH

    @property
    def top_rect(self):
        top_h = self.gap_centre - PIPE_GAP // 2 - CEILING_Y
        return pygame.Rect(int(self.x), CEILING_Y, self.w, max(0, top_h))

    @property
    def bottom_rect(self):
        bot_y = self.gap_centre + PIPE_GAP // 2
        return pygame.Rect(int(self.x), bot_y, self.w, FLOOR_Y - bot_y)

    def collides(self, chick_rect: pygame.Rect) -> bool:
        return (chick_rect.colliderect(self.top_rect) or
                chick_rect.colliderect(self.bottom_rect))

    def update(self, dt):
        self.x -= SCROLL_SPD * dt


class FloatRiderLevel(BaseLevel):

    def __init__(self, screen, fonts):
        super().__init__(screen, fonts)
        self.chick_y = float(self.H // 2)
        self.chick_vy = 0.0
        self.chick_w, self.chick_h = 44, 44
        self.lives = 3
        self.score = 0
        self.world_x = 0.0
        self.state = "playing"   # playing | dead | complete
        self._flash = 0.0
        self._finish_x = PIPE_SPACING + NUM_PIPES * PIPE_SPACING + 200
        self._finish_flag_x = self._finish_x
        self._wing_t = 0.0
        self._bg_clouds: list[dict] = self._make_clouds()
        self._stars_surface = self._make_stars()
        self._death_timer = 0.0
        self._complete_timer = 0.0
        self._breath_trail: list[dict] = []

        # generate pipes
        self.pipes: list[Pipe] = []
        for i in range(NUM_PIPES):
            gap_y = random.randint(
                CEILING_Y + PIPE_GAP // 2 + 30,
                FLOOR_Y - PIPE_GAP // 2 - 30
            )
            self.pipes.append(Pipe(
                x=PIPE_SPACING + i * PIPE_SPACING,
                gap_centre=gap_y
            ))

    # ------------------------------------------------------------------ #

    def _make_clouds(self):
        clouds = []
        for _ in range(6):
            clouds.append({
                "x": random.uniform(0, self.W * 2),
                "y": random.uniform(CEILING_Y + 10, self.H * 0.5),
                "r": random.randint(28, 55),
                "spd": random.uniform(20, 50),
            })
        return clouds

    def _make_stars(self):
        surf = pygame.Surface((self.W, self.H), pygame.SRCALPHA)
        for _ in range(60):
            x = random.randint(0, self.W)
            y = random.randint(0, CEILING_Y + 40)
            r = random.randint(1, 2)
            a = random.randint(80, 200)
            pygame.draw.circle(surf, (255, 255, 255, a), (x, y), r)
        return surf

    # ------------------------------------------------------------------ #

    def update(self, breath: float, dt: float):
        self.elapsed += dt
        self._wing_t += dt

        if self.state == "dead":
            self._death_timer += dt
            if self._death_timer > 1.4:
                # respawn
                self.chick_y = float(self.H // 2)
                self.chick_vy = 0.0
                self.state = "playing"
                self._death_timer = 0.0
                self._flash = 0.5
            return

        if self.state == "complete":
            self._complete_timer += dt
            if self._complete_timer > 1.0 and not self.done:
                stars = 3 if self.lives == 3 else (2 if self.lives >= 1 else 1)
                msgs = {3: "Flawless flight! 🌟", 2: "Great flying! ✨", 1: "You made it! 🎉"}
                self._finish(stars, msgs[stars])
            return

        # flash countdown
        if self._flash > 0:
            self._flash -= dt

        # physics
        lift_force = LIFT * breath
        self.chick_vy += (-lift_force + GRAVITY) * dt
        self.chick_vy = max(-MAX_VY, min(MAX_VY, self.chick_vy))
        self.chick_y += self.chick_vy * dt

        # breath trail
        if breath > 0.05:
            self._breath_trail.append({
                "x": CHICK_X - 10, "y": self.chick_y + self.chick_h // 2,
                "life": 0.4, "maxlife": 0.4,
                "r": int(4 + breath * 8),
                "breath": breath,
            })
        for p in self._breath_trail:
            p["x"] -= SCROLL_SPD * 0.3 * dt
            p["life"] -= dt
        self._breath_trail = [p for p in self._breath_trail if p["life"] > 0]

        # scroll world
        self.world_x += SCROLL_SPD * dt
        for p in self.pipes:
            p.update(dt)
        for c in self._bg_clouds:
            c["x"] -= c["spd"] * dt
            if c["x"] < -120:
                c["x"] = self.W + 60
                c["y"] = random.uniform(CEILING_Y + 10, self.H * 0.5)

        chick_rect = pygame.Rect(
            CHICK_X + 4, int(self.chick_y) + 4,
            self.chick_w - 8, self.chick_h - 8
        )

        # floor / ceiling
        if self.chick_y + self.chick_h >= FLOOR_Y:
            self.chick_y = FLOOR_Y - self.chick_h
            self._die()
            return
        if self.chick_y <= CEILING_Y:
            self.chick_y = float(CEILING_Y)
            self.chick_vy = 0

        # pipe collision & scoring
        for pipe in self.pipes:
            if pipe.collides(chick_rect):
                if self._flash <= 0:
                    self._die()
                    return
            if not pipe.passed and pipe.x + PIPE_WIDTH < CHICK_X:
                pipe.passed = True
                self.score += 1

        # finish
        if self.world_x >= self._finish_flag_x and self.state == "playing":
            self.state = "complete"

    def _die(self):
        self.lives -= 1
        if self.lives <= 0:
            self.lives = 0
            # still let them finish — reset position only
            self.lives = 1
        self.state = "dead"
        self._death_timer = 0.0
        self.chick_vy = 0.0
        # push all pipes back so player re-encounters them
        remaining = [p for p in self.pipes if not p.passed]
        if remaining:
            leftmost = remaining[0]
            if leftmost.x < CHICK_X + 200:
                shift = (CHICK_X + 300) - leftmost.x
                for p in remaining:
                    p.x += shift

    # ------------------------------------------------------------------ #

    def draw(self):
        # background gradient
        for i in range(self.H):
            t = i / self.H
            if i < CEILING_Y:
                c = (8, 12, 35)
            else:
                r = int(self._lerp(25, 80, t))
                g = int(self._lerp(80, 140, t))
                b = int(self._lerp(160, 200, t))
                c = (r, g, b)
            pygame.draw.line(self.screen, c, (0, i), (self.W, i))

        self.screen.blit(self._stars_surface, (0, 0))

        # clouds
        for cl in self._bg_clouds:
            x, y, r = int(cl["x"]), int(cl["y"]), cl["r"]
            pygame.draw.ellipse(self.screen, (200, 220, 255, 80),
                                (x - r, y - r // 2, r * 2, r))
            pygame.draw.ellipse(self.screen, (220, 235, 255, 60),
                                (x - r // 2, y - r, r, r * 2 // 3))

        # floor
        pygame.draw.rect(self.screen, DARK_GREEN,
                         (0, FLOOR_Y, self.W, self.H - FLOOR_Y))
        pygame.draw.rect(self.screen, GRASS_GREEN,
                         (0, FLOOR_Y, self.W, 8))

        # ceiling
        pygame.draw.rect(self.screen, (15, 20, 55),
                         (0, 0, self.W, CEILING_Y))
        pygame.draw.rect(self.screen, DEEP_BLUE,
                         (0, CEILING_Y - 3, self.W, 6))

        # draw pipes
        for pipe in self.pipes:
            if pipe.x + pipe.w < 0 or pipe.x > self.W:
                continue
            # body
            pygame.draw.rect(self.screen, TEAL, pipe.top_rect)
            pygame.draw.rect(self.screen, TEAL, pipe.bottom_rect)
            # highlights
            pygame.draw.rect(self.screen, (60, 200, 150), pipe.top_rect, 3)
            pygame.draw.rect(self.screen, (60, 200, 150), pipe.bottom_rect, 3)
            # caps
            cap_h = 18
            top_cap = pygame.Rect(pipe.top_rect.x - 5, pipe.top_rect.bottom - cap_h,
                                  pipe.w + 10, cap_h)
            bot_cap = pygame.Rect(pipe.bottom_rect.x - 5, pipe.bottom_rect.top,
                                  pipe.w + 10, cap_h)
            pygame.draw.rect(self.screen, (20, 140, 100), top_cap)
            pygame.draw.rect(self.screen, (20, 140, 100), bot_cap)

        # finish flag
        flag_screen_x = int(self._finish_flag_x - self.world_x + CHICK_X + 20)
        if 0 < flag_screen_x < self.W + 60:
            pygame.draw.line(self.screen, WHITE,
                             (flag_screen_x, FLOOR_Y - 100),
                             (flag_screen_x, FLOOR_Y), 4)
            pygame.draw.polygon(self.screen, GOLD, [
                (flag_screen_x, FLOOR_Y - 100),
                (flag_screen_x + 40, FLOOR_Y - 82),
                (flag_screen_x, FLOOR_Y - 64),
            ])
            self._draw_text("FINISH", "sm", GOLD,
                            flag_screen_x + 20, FLOOR_Y - 115)

        # breath trail
        for p in self._breath_trail:
            alpha = p["life"] / p["maxlife"]
            c = (
                int(168 * alpha),
                int(255 * alpha),
                int(111 * alpha),
            )
            pygame.draw.circle(self.screen, c, (int(p["x"]), int(p["y"])), p["r"])

        # draw chick
        self._draw_chick(breath_on=(len(self._breath_trail) > 0))

        # flash overlay (death)
        if self._flash > 0 and self.state != "dead":
            alpha = int(self._flash * 200)
            flash_surf = pygame.Surface((self.W, self.H), pygame.SRCALPHA)
            flash_surf.fill((255, 80, 80, min(120, alpha)))
            self.screen.blit(flash_surf, (0, 0))

        # dead state overlay
        if self.state == "dead":
            overlay = pygame.Surface((self.W, self.H), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 120))
            self.screen.blit(overlay, (0, 0))
            self._draw_text("Oops! Try again... 💪", "lg", AMBER,
                            self.W // 2, self.H // 2)

        # HUD
        self._draw_hud()

    def _draw_chick(self, breath_on=False):
        x = CHICK_X
        y = int(self.chick_y)
        w, h = self.chick_w, self.chick_h

        # body
        body_col = (255, 220, 50)
        pygame.draw.ellipse(self.screen, body_col, (x, y + 8, w, h - 8))
        # head
        pygame.draw.circle(self.screen, body_col, (x + w // 2, y + 10), 18)
        # eye
        pygame.draw.circle(self.screen, BLACK, (x + w // 2 + 7, y + 6), 5)
        pygame.draw.circle(self.screen, WHITE, (x + w // 2 + 9, y + 4), 2)
        # beak
        pygame.draw.polygon(self.screen, ORANGE, [
            (x + w // 2 + 14, y + 10),
            (x + w // 2 + 24, y + 12),
            (x + w // 2 + 14, y + 16),
        ])
        # wings (flapping)
        wing_offset = int(math.sin(self._wing_t * 8) * 6)
        if breath_on:
            wing_offset = -8  # wings up when blowing
        pygame.draw.ellipse(self.screen, (240, 190, 30),
                            (x - 10, y + 14 + wing_offset, 20, 10))
        pygame.draw.ellipse(self.screen, (240, 190, 30),
                            (x + w - 10, y + 14 + wing_offset, 20, 10))

    def _draw_hud(self):
        # lives
        for i in range(3):
            col = CORAL if i < self.lives else GRAY
            self._draw_text("❤", "md", col, 30 + i * 32, HUD_HEIGHT // 2)

        # score
        self._draw_text(f"Gates: {self.score}/{NUM_PIPES}", "md", WHITE,
                        self.W // 2, HUD_HEIGHT // 2)

        # progress bar
        prog = min(1.0, self.world_x / self._finish_flag_x)
        bar_x, bar_y, bar_w, bar_h = self.W - 160, 18, 140, 10
        pygame.draw.rect(self.screen, GRAY, (bar_x, bar_y, bar_w, bar_h), border_radius=5)
        if prog > 0:
            pygame.draw.rect(self.screen, ACID_GREEN,
                             (bar_x, bar_y, int(bar_w * prog), bar_h),
                             border_radius=5)
        self._draw_text("🏁", "sm", WHITE, bar_x + bar_w + 12, bar_y + 5)

        # breath hint
        if self.elapsed < 4:
            self._draw_text("Blow to fly! Stop to fall!", "sm", AMBER,
                            self.W // 2, self.H - 16)
