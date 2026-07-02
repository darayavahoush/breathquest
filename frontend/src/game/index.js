import { createPinwheelLevel  } from './levels/pinwheel.js'
import { createFloatRiderLevel } from './levels/floatRider.js'
import { createCandleLevel     } from './levels/candle.js'
import { createBalloonLevel    } from './levels/balloon.js'
import { createDandelionLevel  } from './levels/dandelion.js'
import { createDragonLevel     } from './levels/dragon.js'

export const LEVEL_FACTORIES = {
  pinwheel:    createPinwheelLevel,
  float_rider: createFloatRiderLevel,
  candle:      createCandleLevel,
  balloon:     createBalloonLevel,
  dandelion:   createDandelionLevel,
  dragon:      createDragonLevel,
}

export const LEVEL_META = {
  pinwheel:    { name: 'Pinwheel Spin',   emoji: '🌀', tagline: 'Blow steady to spin!',         color: '#A8FF6F' },
  float_rider: { name: 'Kite Flyer',      emoji: '🪁', tagline: 'Lift the kite through rings!',  color: '#60A5FA' },
  candle:      { name: 'Candle Gauntlet', emoji: '🕯️', tagline: 'One sharp puff each!',          color: '#FAC775' },
  balloon:     { name: 'Balloon Pop',     emoji: '🎈', tagline: 'Inflate to the sweet spot!',    color: '#F472B6' },
  dandelion:   { name: 'Dandelion Storm', emoji: '🌼', tagline: 'Quick puffs — fly seeds!',      color: '#F97316' },
  dragon:      { name: 'Dragon Fire',     emoji: '🐉', tagline: 'Breathe fire across the lava!', color: '#EF4444' },
}
