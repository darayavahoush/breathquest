import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsAPI } from '../../api/client'
import { BreathEngine } from '../../game/engine/BreathEngine.js'
import { LEVEL_FACTORIES, LEVEL_META } from '../../game/index.js'
import { calcStars, saveScore, loadScores, isUnlocked, LEVEL_ORDER } from '../../game/scoring/index.js'

const W = 800, H = 580

export default function GamePage() {
  const { levelId } = useParams()
  const navigate    = useNavigate()
  const meta        = LEVEL_META[levelId]

  const canvasRef   = useRef(null)
  const engineRef   = useRef(null)
  const levelRef    = useRef(null)
  const rafRef      = useRef(null)
  const sessionRef  = useRef(null)
  const breathLog   = useRef([])
  const eventBatch  = useRef([])
  const flushTimer  = useRef(null)
  const lastTime    = useRef(null)
  const metricsRef  = useRef({ timeSeconds: 0, mistakes: 0, targetHits: 0, puffs: 0, progress: 0 })
  const startTime   = useRef(null)

  const [phase,       setPhase]       = useState('ready')
  const [calProgress, setCalProgress] = useState(0)
  const [breathVal,   setBreathVal]   = useState(0)
  const [result,      setResult]      = useState(null)
  const [earnedStars, setEarnedStars] = useState(0)
  const [starAnim,    setStarAnim]    = useState(0)
  const [debug,       setDebug]       = useState({ raw: 0, floor: 0, above: 0, breath: 0 })

  // Check unlock
  const scores   = loadScores()
  const unlocked = isUnlocked(levelId, scores)
  const bestStars = scores[levelId]?.stars || 0

  const startGame = async () => {
    if (!unlocked) return
    try {
      const { data } = await sessionsAPI.start({ level_id: levelId })
      sessionRef.current = data.id
    } catch {}

    const engine = new BreathEngine()
    engineRef.current = engine

    engine.onCalibrated = () => {
      setPhase('playing')
      startTime.current = performance.now()
      startGameLoop()
      flushTimer.current = setInterval(flushEvents, 2500)
    }

    engine.onBreath = (v) => {
      setBreathVal(v)
      breathLog.current.push(v)
      eventBatch.current.push({ event_type: 'breath_sample', breath_value: v })
      setDebug({
        raw:   +(engine._lastRaw    || 0).toFixed(3),
        floor: +(engine._baseline   || 0).toFixed(3),
        above: +(Math.max(0,(engine._lastRaw||0)-(engine._baseline||0))).toFixed(3),
        breath: +v.toFixed(3),
      })
    }

    setPhase('calibrating')
    try { await engine.start() }
    catch { setPhase('error') }

    const calTick = () => {
      if (engine.calibrating) { setCalProgress(engine.calProgress); requestAnimationFrame(calTick) }
    }
    requestAnimationFrame(calTick)
  }

  const startGameLoop = () => {
    const factory = LEVEL_FACTORIES[levelId]
    if (!factory) { setPhase('error'); return }
    levelRef.current = factory()
    lastTime.current = performance.now()

    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const tick = (now) => {
      const dt     = Math.min((now - lastTime.current) / 1000, 0.05)
      lastTime.current = now
      const breath = engineRef.current?.breathValue ?? 0
      const elapsed = (now - startTime.current) / 1000
      metricsRef.current.timeSeconds = elapsed

      const res = levelRef.current.update(breath, dt)
      levelRef.current.draw(ctx, W, H, breath)

      // Draw breath bar overlay on top
      drawBreathOverlay(ctx, W, breath, meta.color)

      if (res) { endGame(res); return }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const endGame = useCallback(async (res) => {
    cancelAnimationFrame(rafRef.current)
    clearInterval(flushTimer.current)
    engineRef.current?.stop()

    const m = metricsRef.current
    // Let level pass its own metrics via result object
    if (res.targetHits !== undefined) m.targetHits = res.targetHits
    if (res.mistakes   !== undefined) m.mistakes   = res.mistakes
    if (res.puffs      !== undefined) m.puffs      = res.puffs
    m.progress = 1

    const stars = calcStars(levelId, m)
    saveScore(levelId, stars)
    setEarnedStars(stars)
    setResult(res)
    setPhase('complete')

    // Animate stars in
    let s = 0
    const starInterval = setInterval(() => {
      s++; setStarAnim(s)
      if (s >= stars) clearInterval(starInterval)
    }, 400)

    const log = breathLog.current
    const avg = log.length ? log.reduce((a,b)=>a+b,0)/log.length : 0
    const max = log.length ? Math.max(...log) : 0
    if (sessionRef.current) {
      try {
        await sessionsAPI.end(sessionRef.current, {
          stars_earned: stars, completed: true,
          completion_message: res.message,
          avg_breath_strength: +avg.toFixed(3),
          max_breath_strength: +max.toFixed(3),
        })
      } catch {}
    }
  }, [levelId])

  const flushEvents = async () => {
    const batch = eventBatch.current.splice(0)
    if (batch.length && sessionRef.current) {
      try { await sessionsAPI.logEvents(sessionRef.current, batch) } catch {}
    }
  }

  const cleanup = () => {
    cancelAnimationFrame(rafRef.current)
    clearInterval(flushTimer.current)
    engineRef.current?.stop()
  }

  const replay = () => {
    cleanup()
    breathLog.current = []; eventBatch.current = []
    metricsRef.current = { timeSeconds:0, mistakes:0, targetHits:0, puffs:0, progress:0 }
    setPhase('ready'); setResult(null); setBreathVal(0); setStarAnim(0)
  }

  useEffect(() => () => cleanup(), [])

  if (!meta) return <div className="text-white p-8">Unknown level</div>

  // Find next level
  const curIdx  = LEVEL_ORDER.indexOf(levelId)
  const nextId  = LEVEL_ORDER[curIdx + 1]

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
        <button onClick={() => { cleanup(); navigate('/play/levels') }}
                className="text-white/40 hover:text-white/70 text-sm transition-colors">
          ← Levels
        </button>
        <span className="font-display font-bold text-white">{meta.emoji} {meta.name}</span>
        <div className="flex items-center gap-2">
          {bestStars > 0 && (
            <span className="text-xs text-brand-amber">Best: {'★'.repeat(bestStars)}{'☆'.repeat(3-bestStars)}</span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="relative w-full" style={{ maxWidth: W }}>

          {/* Canvas */}
          <canvas ref={canvasRef} width={W} height={H}
            className="rounded-2xl shadow-2xl w-full"
            style={{ display: phase === 'playing' ? 'block' : 'none' }} />

          {/* READY */}
          {phase === 'ready' && (
            <div className="flex flex-col items-center justify-center text-center py-16 rounded-2xl"
                 style={{ minHeight: H, background: 'linear-gradient(135deg, #1a1a2e, #12122A)',
                          border: `2px solid ${meta.color}33` }}>
              <div className="text-8xl mb-5" style={{ animation: 'float 3s ease-in-out infinite' }}>
                {meta.emoji}
              </div>
              <h2 className="font-display text-4xl font-black text-white mb-1">{meta.name}</h2>
              <p className="text-white/40 mb-2">{meta.tagline}</p>

              {!unlocked ? (
                <div className="mt-6 text-center">
                  <div className="text-5xl mb-3">🔒</div>
                  <p className="text-white/50">Complete the previous level first!</p>
                  <button onClick={() => navigate('/play/levels')}
                    className="mt-4 px-6 py-2 rounded-xl border border-white/20 text-white/60 hover:bg-white/10 text-sm">
                    Back to levels
                  </button>
                </div>
              ) : (
                <>
                  {bestStars > 0 && (
                    <div className="flex gap-1 mb-6">
                      {Array.from({length:3},(_,i) => (
                        <span key={i} className="text-2xl" style={{ color: i<bestStars ? '#FAC775' : 'rgba(255,255,255,0.15)' }}>★</span>
                      ))}
                    </div>
                  )}
                  <button onClick={startGame}
                    className="px-10 py-4 rounded-2xl font-display text-xl font-black text-brand-dark
                               transition-all active:scale-95 shadow-lg mt-4"
                    style={{ background: meta.color,
                             boxShadow: `0 0 30px ${meta.color}44` }}>
                    🎤 Start!
                  </button>
                  <p className="text-white/20 text-xs mt-4">Allow mic when asked</p>
                </>
              )}
            </div>
          )}

          {/* CALIBRATING */}
          {phase === 'calibrating' && (
            <div className="flex flex-col items-center justify-center text-center py-16 rounded-2xl"
                 style={{ minHeight: H, background: 'linear-gradient(135deg, #1a1a2e, #12122A)' }}>
              <div className="text-7xl mb-6" style={{ animation: 'pulse 1.5s infinite' }}>🎤</div>
              <h2 className="font-display text-3xl font-black text-white mb-2">Getting Ready…</h2>
              <p className="text-white/60 mb-1">Stay <strong className="text-white">completely quiet!</strong> 🤫</p>
              <p className="text-white/30 text-sm mb-8">Don't blow yet — learning your room's sound</p>
              <div className="w-72 h-3 bg-white/10 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-100"
                     style={{ width: `${calProgress * 100}%`, background: meta.color }} />
              </div>
              <p className="text-white/20 text-xs">Filtering background noise…</p>
            </div>
          )}

          {/* COMPLETE */}
          {phase === 'complete' && result && (
            <div className="flex flex-col items-center justify-center text-center py-10 rounded-2xl relative overflow-hidden"
                 style={{ minHeight: H, background: 'linear-gradient(135deg, #0d1a0d, #12122A)',
                          border: '2px solid rgba(168,255,111,0.3)' }}>

              {/* Confetti */}
              {Array.from({length:20},(_,i)=>(
                <div key={i} className="absolute w-3 h-3 rounded-full pointer-events-none"
                     style={{
                       left:`${(i*97+10)%100}%`, top:`${(i*67+5)%100}%`,
                       background:['#A8FF6F','#FAC775','#E24B4A','#60A5FA','#A855F7'][i%5],
                       animation:`float ${1.5+i*0.1}s ease-in-out infinite`,
                       animationDelay:`${i*0.07}s`, opacity: 0.7,
                     }} />
              ))}

              <div className="text-7xl mb-4" style={{ animation: 'float 1s ease-in-out infinite' }}>
                {earnedStars === 3 ? '🏆' : earnedStars === 2 ? '🎉' : '👍'}
              </div>

              <h2 className="font-display text-4xl font-black text-white mb-1">
                {earnedStars === 3 ? 'Perfect!' : earnedStars === 2 ? 'Great job!' : 'Level done!'}
              </h2>
              <p className="text-white/50 mb-6">{result.message}</p>

              {/* Stars */}
              <div className="flex gap-3 mb-2">
                {Array.from({length:3},(_,i)=>(
                  <span key={i} className="text-5xl transition-all duration-300"
                        style={{
                          color: i < starAnim ? '#FAC775' : 'rgba(255,255,255,0.1)',
                          transform: i < starAnim ? 'scale(1.2)' : 'scale(0.8)',
                          filter: i < starAnim ? 'drop-shadow(0 0 10px #FAC775)' : 'none',
                        }}>★</span>
                ))}
              </div>

              {/* Time */}
              <p className="text-white/30 text-sm mb-8">
                Time: {Math.floor(metricsRef.current.timeSeconds)}s
                {bestStars > 0 && earnedStars > bestStars && (
                  <span className="ml-2 text-brand-green">↑ New best!</span>
                )}
              </p>

              {/* Buttons */}
              <div className="flex gap-3 flex-wrap justify-center">
                <button onClick={replay}
                  className="px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-all font-semibold text-sm">
                  Play Again
                </button>
                {nextId && (
                  <button onClick={() => { cleanup(); navigate(`/play/game/${nextId}`) }}
                    className="px-8 py-3 rounded-xl font-display font-black text-brand-dark transition-all active:scale-95 text-sm"
                    style={{ background: meta.color }}>
                    Next Level →
                  </button>
                )}
                <button onClick={() => { cleanup(); navigate('/play/levels') }}
                  className="px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-all font-semibold text-sm">
                  All Levels
                </button>
              </div>
            </div>
          )}

          {/* ERROR */}
          {phase === 'error' && (
            <div className="flex flex-col items-center justify-center text-center py-20 rounded-2xl"
                 style={{ minHeight: H, background: 'linear-gradient(135deg, #1a1a2e, #12122A)' }}>
              <div className="text-6xl mb-4">😕</div>
              <p className="text-white/60 mb-2 text-lg">Couldn't access microphone</p>
              <p className="text-white/30 text-sm mb-8">Check mic permissions in your browser</p>
              <button onClick={() => setPhase('ready')}
                className="px-8 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all"
                style={{ background: meta.color, color: '#12122A' }}>
                Try Again
              </button>
            </div>
          )}

          {/* Debug panel */}
          {phase === 'playing' && (
            <div className="mt-2 bg-black/50 border border-white/10 rounded-xl p-2.5 font-mono text-xs flex gap-4 flex-wrap">
              <span>🎤 Raw:<span className={debug.raw > debug.floor ? ' text-green-400' : ' text-red-400'}> {debug.raw}</span></span>
              <span>〰 Base:<span className="text-yellow-400"> {debug.floor}</span></span>
              <span>📊 Above:<span className={debug.above > 0.028 ? ' text-green-400' : ' text-white/30'}> {debug.above}</span></span>
              <span>💨 Breath:<span className={debug.breath > 0.05 ? ' text-green-400 font-bold' : ' text-white/30'}> {debug.breath}</span></span>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-green-400"
                     style={{ width:`${debug.breath*100}%`, transition:'none' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>
    </div>
  )
}

function drawBreathOverlay(ctx, W, breath, color) {
  // Minimal breath bar at very bottom of canvas
  const bx = 20, by = 560, bw = W - 40, bh = 10
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.fill()
  if (breath > 0) {
    const grd = ctx.createLinearGradient(bx, 0, bx + bw, 0)
    grd.addColorStop(0, '#A8FF6F')
    grd.addColorStop(1, color)
    ctx.fillStyle = grd
    ctx.beginPath(); ctx.roundRect(bx, by, bw * Math.min(1, breath), bh, 5); ctx.fill()
    if (breath > 0.2) {
      ctx.shadowColor = color; ctx.shadowBlur = 10
      ctx.fillStyle = grd
      ctx.beginPath(); ctx.roundRect(bx, by, bw * Math.min(1, breath), bh, 5); ctx.fill()
      ctx.shadowBlur = 0
    }
  }
  ctx.fillStyle = breath > 0.05 ? '#A8FF6F' : 'rgba(255,255,255,0.2)'
  ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText('💨', bx - 2, by - 10)
}
