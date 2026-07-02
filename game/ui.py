"""
ui.py — Menus, HUD, overlays, transition screens.
"""
import pygame
import math
from assets.constants import *


class UI:
    def __init__(self, screen: pygame.Surface, fonts: dict):
        self.screen = screen
        self.fonts = fonts
        self.W, self.H = screen.get_size()
        self._t = 0.0

    def update(self, dt):
        self._t += dt

    # ------------------------------------------------------------------ #
    #  Calibration screen                                                  #
    # ------------------------------------------------------------------ #

    def draw_calibrating(self, progress: float):
        """Shown while noise floor is being measured."""
        self.screen.fill(DARK_BG)
        cx, cy = self.W // 2, self.H // 2

        # animated mic icon (pulsing dots)
        for i in range(5):
            a = self._t * 3 + i * 0.6
            r = 12 + int(math.sin(a) * 6)
            alpha = int(128 + 127 * math.sin(a))
            s = pygame.Surface((r * 2, r * 2), pygame.SRCALPHA)
            pygame.draw.circle(s, (*TEAL, alpha), (r, r), r)
            self.screen.blit(s, (cx - 80 + i * 40 - r, cy - r))

        self._draw_text("Listening for background noise…", "md", LIGHT_GRAY, cx, cy + 50)
        self._draw_text("Stay quiet for a moment! 🤫", "sm", GRAY, cx, cy + 80)

        # progress bar
        bw = 320
        bx = cx - bw // 2
        pygame.draw.rect(self.screen, GRAY, (bx, cy + 110, bw, 10), border_radius=5)
        if progress > 0:
            pygame.draw.rect(self.screen, ACID_GREEN,
                             (bx, cy + 110, int(bw * progress), 10), border_radius=5)

        self._draw_text("BreathQuest", "title", WHITE, cx, 80)

    # ------------------------------------------------------------------ #
    #  Main menu                                                           #
    # ------------------------------------------------------------------ #

    def draw_main_menu(self, level_stars: dict):
        self.screen.fill(DARK_BG)

        # animated starfield
        for i in range(40):
            a = (self._t * 0.4 + i * 0.7) % (math.pi * 2)
            x = int((i * 73 + 40) % self.W)
            y = int((i * 57 + 30) % (self.H - 80))
            r = 1 + int(math.sin(a) * 0.5)
            bright = int(100 + 155 * abs(math.sin(a + i)))
            pygame.draw.circle(self.screen, (bright, bright, bright), (x, y), r)

        # title
        self._draw_text("BreathQuest", "title", ACID_GREEN, self.W // 2, 70)
        self._draw_text("A breath training adventure!", "md", AMBER, self.W // 2, 112)

        # level grid
        cols = 3
        cell_w = (self.W - 100) // cols
        cell_h = 110
        start_x = 50
        start_y = 160

        buttons = []
        for i, lid in enumerate(LEVEL_IDS):
            col = i % cols
            row = i // cols
            x = start_x + col * cell_w
            y = start_y + row * cell_h
            rect = pygame.Rect(x, y, cell_w - 10, cell_h - 10)

            # card bg
            stars = level_stars.get(i, 0)
            done = stars > 0
            card_col = (25, 50, 35) if done else (25, 25, 50)
            border_col = ACID_GREEN if done else (60, 60, 100)
            pygame.draw.rect(self.screen, card_col, rect, border_radius=12)
            pygame.draw.rect(self.screen, border_col, rect, 2, border_radius=12)

            # level name
            name = LEVEL_NAMES[lid]
            self._draw_text(name, "sm", WHITE, rect.centerx, rect.y + 22)
            self._draw_text(LEVEL_TAGLINES[lid], "xs", GRAY, rect.centerx, rect.y + 44)

            # stars
            star_str = (STAR_FULL * stars) + (STAR_EMPTY * (3 - stars))
            self._draw_text(star_str, "md", GOLD, rect.centerx, rect.y + 70)

            buttons.append((rect, i))

        # total stars
        total = sum(level_stars.values())
        self._draw_text(f"Total: {total} / {len(LEVEL_IDS) * 3} ⭐", "md", GOLD,
                        self.W // 2, self.H - 40)

        return buttons   # caller uses these for click detection

    # ------------------------------------------------------------------ #
    #  In-level HUD                                                        #
    # ------------------------------------------------------------------ #

    def draw_level_hud(self, level_name: str, breath: float,
                       back_btn_rect: pygame.Rect):
        # top bar
        pygame.draw.rect(self.screen, (0, 0, 0, 180),
                         (0, 0, self.W, HUD_HEIGHT))
        pygame.draw.line(self.screen, (60, 60, 100),
                         (0, HUD_HEIGHT), (self.W, HUD_HEIGHT), 1)

        # back button
        pygame.draw.rect(self.screen, (40, 40, 70), back_btn_rect, border_radius=8)
        pygame.draw.rect(self.screen, GRAY, back_btn_rect, 1, border_radius=8)
        self._draw_text("← Menu", "sm", LIGHT_GRAY,
                        back_btn_rect.centerx, back_btn_rect.centery)

        # level name
        self._draw_text(level_name, "md", WHITE, self.W // 2, HUD_HEIGHT // 2)

        # breath meter (right side)
        bx, by, bw, bh = self.W - 210, 18, 180, 14
        pygame.draw.rect(self.screen, (40, 40, 60), (bx, by, bw, bh), border_radius=7)
        if breath > 0:
            fill_col = ACID_GREEN if breath < 0.7 else AMBER
            pygame.draw.rect(self.screen, fill_col,
                             (bx, by, int(bw * breath), bh), border_radius=7)
        self._draw_text("💨", "sm", WHITE, bx - 14, by + 7)

    # ------------------------------------------------------------------ #
    #  Level complete overlay                                              #
    # ------------------------------------------------------------------ #

    def draw_level_complete(self, result: dict, next_available: bool):
        """Returns (next_btn_rect, menu_btn_rect)."""
        overlay = pygame.Surface((self.W, self.H), pygame.SRCALPHA)
        overlay.fill((0, 0, 10, 200))
        self.screen.blit(overlay, (0, 0))

        cx, cy = self.W // 2, self.H // 2 - 40

        # confetti
        for i in range(30):
            a = self._t * 2 + i * 0.4
            x = int((i * 97 + self._t * 40) % self.W)
            y = int((self._t * 60 + i * 33) % self.H)
            col = [ACID_GREEN, AMBER, CORAL, TEAL, PURPLE, GOLD][i % 6]
            pygame.draw.circle(self.screen, col, (x, y), 4)

        self._draw_text("Level Complete!", "lg", ACID_GREEN, cx, cy - 60)

        stars = result.get("stars", 1)
        star_str = (STAR_FULL * stars) + (STAR_EMPTY * (3 - stars))
        self._draw_text(star_str, "title", GOLD, cx, cy - 10)
        self._draw_text(result.get("message", "Well done!"), "md", WHITE, cx, cy + 50)

        # buttons
        next_rect = pygame.Rect(cx - 160, cy + 100, 150, 46)
        menu_rect = pygame.Rect(cx + 10, cy + 100, 150, 46)

        for rect, label, col in [
            (next_rect, "Next Level →", ACID_GREEN if next_available else GRAY),
            (menu_rect, "← Menu", WHITE),
        ]:
            pygame.draw.rect(self.screen, (30, 30, 50), rect, border_radius=10)
            pygame.draw.rect(self.screen, col, rect, 2, border_radius=10)
            self._draw_text(label, "md", col, rect.centerx, rect.centery)

        return next_rect, menu_rect

    # ------------------------------------------------------------------ #
    #  helpers                                                             #
    # ------------------------------------------------------------------ #

    def _draw_text(self, text, font_key, color, cx, cy, anchor="center"):
        surf = self.fonts[font_key].render(text, True, color)
        r = surf.get_rect()
        setattr(r, anchor, (cx, cy))
        self.screen.blit(surf, r)
