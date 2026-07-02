"""
BreathQuest — shared constants and color palette.
Designed for easy porting: all game logic is display-agnostic.
"""

# Window
WIDTH, HEIGHT = 900, 600
FPS = 60
TITLE = "BreathQuest"

# Audio
SAMPLE_RATE = 44100
CHUNK = 1024
CALIBRATION_FRAMES = 40       # ~1 second of silence sampling
NOISE_MULTIPLIER = 1.5        # noise floor headroom
BREATH_SMOOTHING = 0.25       # EMA alpha for breath value (lower = smoother)

# Breath thresholds (normalised 0-1 after noise subtraction)
BREATH_SOFT   = 0.08          # gentle puff
BREATH_MEDIUM = 0.20          # steady blow
BREATH_HARD   = 0.45          # sharp burst

# Palette
BLACK       = (10,  10,  18)
DARK_BG     = (18,  18,  36)
NIGHT_BG    = (12,  20,  50)
WHITE       = (255, 255, 255)
ACID_GREEN  = (168, 255, 111)
TEAL        = (29,  158, 117)
CORAL       = (226,  75,  74)
AMBER       = (250, 199, 117)
SKY_BLUE    = (100, 180, 255)
DEEP_BLUE   = (25,  60, 130)
PURPLE      = (120,  80, 220)
GOLD        = (255, 200,  50)
GRASS_GREEN = (60,  160,  50)
DARK_GREEN  = (20,   80,  30)
BROWN       = (139, 105,  20)
GRAY        = (120, 120, 130)
LIGHT_GRAY  = (200, 200, 210)
ORANGE      = (240, 130,  30)
FLAME_CORE  = (255, 240, 180)

# UI
HUD_HEIGHT  = 60
PANEL_COLOR = (25, 25, 50, 200)

# Stars
STAR_FULL  = "★"
STAR_EMPTY = "☆"

# Level IDs (order = play order)
LEVEL_IDS = [
    "pinwheel",
    "float_rider",
    "candle",
    "balloon",
    "dandelion",
    "dragon",
]

LEVEL_NAMES = {
    "pinwheel":   "🌀 Pinwheel Spin",
    "float_rider":"🐥 Float Rider",
    "candle":     "🕯️  Candle Gauntlet",
    "balloon":    "🎈 Balloon Pop",
    "dandelion":  "🌼 Dandelion Storm",
    "dragon":     "🐉 Dragon Fire",
}

LEVEL_TAGLINES = {
    "pinwheel":   "Blow to spin — get the feel!",
    "float_rider":"Keep the chick flying with your breath!",
    "candle":     "One sharp puff per candle. Then stop.",
    "balloon":    "Inflate to just the right size!",
    "dandelion":  "Quick puffs — send the seeds flying!",
    "dragon":     "Blow long and hard to breathe fire!",
}
