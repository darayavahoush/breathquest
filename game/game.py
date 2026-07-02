"""
game.py — Main game loop, state machine, level manager.
States: MENU → CALIBRATING → PLAYING → LEVEL_COMPLETE → MENU
"""

import pygame
from assets.constants import *
from audio import AudioEngine
from ui import UI
from levels.pinwheel   import PinwheelLevel
from levels.float_rider import FloatRiderLevel
from levels.candle     import CandleLevel
from levels.balloon    import BalloonLevel
from levels.dandelion  import DandelionLevel
from levels.dragon     import DragonLevel


LEVEL_CLASSES = {
    "pinwheel":   PinwheelLevel,
    "float_rider": FloatRiderLevel,
    "candle":     CandleLevel,
    "balloon":    BalloonLevel,
    "dandelion":  DandelionLevel,
    "dragon":     DragonLevel,
}


def make_fonts():
    pygame.font.init()
    base = pygame.font.SysFont("segoeui,helvetica,arial", 16)
    return {
        "xs":    pygame.font.SysFont("segoeui,helvetica,arial", 13),
        "sm":    pygame.font.SysFont("segoeui,helvetica,arial", 16),
        "md":    pygame.font.SysFont("segoeui,helvetica,arial", 22),
        "lg":    pygame.font.SysFont("segoeui,helvetica,arial", 32),
        "title": pygame.font.SysFont("segoeui,helvetica,arial", 48, bold=True),
    }


class Game:
    STATE_MENU      = "menu"
    STATE_CALIB     = "calibrating"
    STATE_PLAYING   = "playing"
    STATE_COMPLETE  = "complete"

    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        pygame.display.set_caption(TITLE)
        self.clock = pygame.time.Clock()
        self.fonts = make_fonts()

        self.audio = AudioEngine()
        self.ui = UI(self.screen, self.fonts)

        self.state = self.STATE_MENU
        self.level_stars: dict[int, int] = {}   # level_index → stars earned
        self.current_level_idx: int | None = None
        self.current_level = None

        self._back_btn = pygame.Rect(10, 10, 90, 36)
        self._menu_buttons: list[tuple[pygame.Rect, int]] = []
        self._complete_next_rect: pygame.Rect | None = None
        self._complete_menu_rect: pygame.Rect | None = None
        self._last_result: dict | None = None

    # ------------------------------------------------------------------ #

    def run(self):
        running = True
        while running:
            dt = self.clock.tick(FPS) / 1000.0

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                    self._go_menu()
                if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    self._handle_click(event.pos)

            self._update(dt)
            self._draw()
            pygame.display.flip()

        self.audio.stop()
        pygame.quit()

    # ------------------------------------------------------------------ #

    def _update(self, dt):
        self.ui.update(dt)

        if self.state == self.STATE_CALIB:
            if self.audio.calibrated:
                self.state = self.STATE_PLAYING

        if self.state == self.STATE_PLAYING and self.current_level:
            breath = self.audio.breath_value if self.audio.calibrated else 0.0
            self.current_level.update(breath, dt)
            if self.current_level.is_complete():
                self._last_result = self.current_level.get_result()
                stars = self._last_result.get("stars", 1)
                self.level_stars[self.current_level_idx] = stars
                self.state = self.STATE_COMPLETE

    def _draw(self):
        if self.state == self.STATE_MENU:
            self._menu_buttons = self.ui.draw_main_menu(self.level_stars)

        elif self.state == self.STATE_CALIB:
            self.ui.draw_calibrating(self.audio.calibration_progress())

        elif self.state == self.STATE_PLAYING:
            breath = self.audio.breath_value
            self.current_level.draw()
            lid = LEVEL_IDS[self.current_level_idx]
            self.ui.draw_level_hud(LEVEL_NAMES[lid], breath, self._back_btn)

        elif self.state == self.STATE_COMPLETE:
            # draw level underneath
            if self.current_level:
                self.current_level.draw()
            next_avail = (self.current_level_idx + 1) < len(LEVEL_IDS)
            self._complete_next_rect, self._complete_menu_rect = \
                self.ui.draw_level_complete(self._last_result, next_avail)

    def _handle_click(self, pos):
        if self.state == self.STATE_MENU:
            for rect, idx in self._menu_buttons:
                if rect.collidepoint(pos):
                    self._start_level(idx)
                    return

        elif self.state == self.STATE_PLAYING:
            if self._back_btn.collidepoint(pos):
                self._go_menu()

        elif self.state == self.STATE_COMPLETE:
            if self._complete_next_rect and self._complete_next_rect.collidepoint(pos):
                next_idx = self.current_level_idx + 1
                if next_idx < len(LEVEL_IDS):
                    self._start_level(next_idx)
            if self._complete_menu_rect and self._complete_menu_rect.collidepoint(pos):
                self._go_menu()

    def _start_level(self, idx: int):
        self.current_level_idx = idx
        lid = LEVEL_IDS[idx]
        cls = LEVEL_CLASSES[lid]
        self.current_level = cls(self.screen, self.fonts)

        if not self.audio._running:
            self.audio.start()
            self.state = self.STATE_CALIB
        elif not self.audio.calibrated:
            self.state = self.STATE_CALIB
        else:
            self.state = self.STATE_PLAYING

    def _go_menu(self):
        self.state = self.STATE_MENU
        self.current_level = None
