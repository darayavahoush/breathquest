import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../../components/ui'
import { loadScores, isUnlocked, LEVEL_ORDER, DIFFICULTY } from '../../game/scoring/index.js'

const LEVELS = [
  { id: 'pinwheel',    name: 'Pinwheel Spin',    emoji: '🌀', desc: 'Blow steady to spin!' },
  { id: 'float_rider', name: 'Kite Flyer',        emoji: '🪁', desc: 'Lift the kite through rings!' },
  { id: 'candle',      name: 'Candle Gauntlet',   emoji: '🕯️', desc: 'One puff per candle!' },
  { id: 'balloon',     name: 'Balloon Pop',        emoji: '🎈', desc: 'Inflate to the sweet spot!' },
  { id: 'dandelion',   name: 'Dandelion Storm',    emoji: '🌼', desc: 'Quick puffs — fly seeds!' },
  { id: 'dragon',      name: 'Dragon Fire',        emoji: '🐉', desc: 'Breathe fire across lava!' },
]

const CARD_THEMES = [
  { from: '#1a4a2e', border: '#A8FF6F', glow: 'rgba(168,255,111,0.15)' },
  { from: '#1a2e4a', border: '#60A5FA', glow: 'rgba(96,165,250,0.15)'  },
  { from: '#3a2e1a', border: '#FAC775', glow: 'rgba(250,199,117,0.15)' },
  { from: '#3a1a2e', border: '#F472B6', glow: 'rgba(244,114,182,0.15)' },
  { from: '#2e1a0a', border: '#F97316', glow: 'rgba(249,115,22,0.15)'  },
  { from: '#3a1a1a', border: '#EF4444', glow: 'rgba(239,68,68,0.15)'   },
]

export default function LevelSelect() {
  const { patient, logout } = useAuth()
  const navigate = useNavigate()
  const [scores, setScores] = useState({})
  const [hovering, setHovering] = useState(null)

  useEffect(() => { setScores(loadScores()) }, [])

  const totalStars = LEVEL_ORDER.reduce((sum, id) => sum + (scores[id]?.stars || 0), 0)
  const maxStars   = LEVEL_ORDER.length * 3

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse at 50% -10%, #1a2a4a 0%, #0d0d1a 60%)'
    }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Avatar avatar={patient?.avatar} size="sm" />
          <div>
            <span className="font-display font-bold text-white">{patient?.first_name}</span>
            <span className="text-white/30 text-xs ml-2">#{patient?.player_code}</span>
          </div>
        </div>
        {/* Total stars */}
        <div className="flex items-center gap-2">
          <span className="text-brand-amber font-bold text-sm">⭐ {totalStars} / {maxStars}</span>
          {totalStars === maxStars && <span className="text-xs bg-brand-amber/20 text-brand-amber px-2 py-0.5 rounded-full">Perfect!</span>}
        </div>
        <button onClick={logout} className="text-white/30 hover:text-white/60 text-sm transition-colors">
          Switch player
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-black text-white">
            Choose a <span className="text-brand-green">Level!</span>
          </h1>
          <p className="text-white/40 mt-2">Complete levels to unlock the next one 💨</p>
        </div>

        {/* Level grid */}
        <div className="grid grid-cols-2 gap-4">
          {LEVELS.map((level, i) => {
            const unlocked = isUnlocked(level.id, scores)
            const score    = scores[level.id]
            const stars    = score?.stars || 0
            const diff     = DIFFICULTY[level.id]
            const theme    = CARD_THEMES[i]
            const isHover  = hovering === level.id

            return (
              <button key={level.id}
                onClick={() => unlocked && navigate(`/play/game/${level.id}`)}
                onMouseEnter={() => setHovering(level.id)}
                onMouseLeave={() => setHovering(null)}
                disabled={!unlocked}
                className="relative text-left rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  background: `linear-gradient(135deg, ${theme.from}, #12122A)`,
                  border: `2px solid ${unlocked ? theme.border : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: isHover && unlocked ? `0 0 30px ${theme.glow}` : 'none',
                  transform: isHover && unlocked ? 'scale(1.03)' : 'scale(1)',
                  opacity: unlocked ? 1 : 0.5,
                }}>

                {/* Locked overlay */}
                {!unlocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10">
                    <span className="text-4xl mb-2">🔒</span>
                    <span className="text-white/50 text-sm">
                      Complete {LEVELS[i-1]?.name} first
                    </span>
                  </div>
                )}

                <div className="p-5">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-5xl">{level.emoji}</span>
                    <div className="flex flex-col items-end gap-1">
                      {/* Difficulty badge */}
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: diff.color + '25', color: diff.color }}>
                        {diff.label}
                      </span>
                      {/* Play count */}
                      {score?.plays > 0 && (
                        <span className="text-xs text-white/25">{score.plays} plays</span>
                      )}
                    </div>
                  </div>

                  {/* Level name + desc */}
                  <h3 className="font-display font-bold text-white text-base leading-tight mb-1">
                    {level.name}
                  </h3>
                  <p className="text-white/40 text-xs mb-3">{level.desc}</p>

                  {/* Stars */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {Array.from({length: 3}, (_, j) => (
                        <span key={j} className="text-xl transition-all"
                              style={{ color: j < stars ? '#FAC775' : 'rgba(255,255,255,0.12)' }}>
                          ★
                        </span>
                      ))}
                    </div>
                    {unlocked && (
                      <span className="text-xs font-semibold transition-all duration-200"
                            style={{ color: isHover ? theme.border : 'rgba(255,255,255,0.3)' }}>
                        {stars > 0 ? 'Play again →' : 'Play now →'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Completion bar at bottom */}
                {stars > 0 && (
                  <div className="h-1.5 w-full" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="h-full transition-all duration-700"
                         style={{
                           width: `${(stars/3)*100}%`,
                           background: `linear-gradient(90deg, ${theme.border}88, ${theme.border})`,
                         }} />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* All complete! */}
        {totalStars === maxStars && (
          <div className="mt-8 p-6 rounded-2xl text-center border border-brand-amber/30 bg-brand-amber/5">
            <div className="text-4xl mb-2">🏆</div>
            <p className="font-display text-xl font-bold text-brand-amber">All levels complete!</p>
            <p className="text-white/50 text-sm mt-1">You're a BreathQuest champion!</p>
          </div>
        )}

        <p className="text-center text-white/20 text-xs mt-8">
          Make sure your microphone is allowed! 🎤
        </p>
      </div>
    </div>
  )
}
