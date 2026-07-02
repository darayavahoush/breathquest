import { drawGradientBg, drawText, makeStars, drawStars, ParticleSystem, rand, clamp } from '../engine/render.js'

export function createPinwheelLevel() {
  const GOAL   = 1440
  let angle    = 0
  let spinSpd  = 0
  let total    = 0
  let done     = false
  let t        = 0
  const stars  = makeStars(50)
  const ps     = new ParticleSystem()
  let completeTimer = 0

  return {
    id: 'pinwheel',
    update(breath, dt) {
      t += dt
      const target = breath > 0.04 ? Math.pow(breath, 0.7) * 680 : 0
      spinSpd += (target - spinSpd) * (target > 0 ? 6 : 12) * dt
      const delta = spinSpd * dt
      angle += delta
      if (breath > 0.04) total += Math.abs(delta)

      // wind particles
      if (breath > 0.05 && Math.random() < breath * 0.4) {
        ps.emit(200 - 160 + rand(-20, 20), 240 + rand(-30, 30), {
          count: 1, color: `hsl(${120 + breath * 60},80%,70%)`,
          speed: breath * 220 + 40, life: 0.5, size: 5,
          spread: 0.4, gravity: 0,
        })
      }
      ps.update(dt)

      if (total >= GOAL && !done) {
        completeTimer += dt
        if (completeTimer > 0.6) done = true
      }
      return done ? { stars: 3, message: 'Perfect spin! You\'re a natural! 🌟' } : null
    },

    draw(ctx, W, H, breath) {
      // Sky
      drawGradientBg(ctx, W, H, '#1a4a6a', '#0d2a3a')
      drawStars(ctx, W, H, stars, t)

      // Ground
      ctx.fillStyle = '#1a5c2a'; ctx.fillRect(0, H - 80, W, 80)
      ctx.fillStyle = '#2d8a3e'; ctx.fillRect(0, H - 80, W, 14)

      // Stem
      ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 5
      ctx.beginPath(); ctx.moveTo(W/2, 240); ctx.lineTo(W/2, H - 80); ctx.stroke()

      // Particles (wind)
      ps.draw(ctx)

      // Pinwheel blades
      const colors = ['#E24B4A', '#1D9E75', '#FAC775', '#A8FF6F']
      ctx.save(); ctx.translate(W/2, 240)
      for (let i = 0; i < 4; i++) {
        ctx.save(); ctx.rotate(angle * Math.PI / 180 + i * Math.PI / 2)
        ctx.beginPath()
        ctx.moveTo(0, 0); ctx.lineTo(-38, -18); ctx.lineTo(-10, -55); ctx.closePath()
        ctx.fillStyle = colors[i]
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5; ctx.stroke()
        ctx.restore()
      }
      // Center pin
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2)
      ctx.fillStyle = '#FAC775'; ctx.fill()
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2)
      ctx.fillStyle = '#F59E0B'; ctx.fill()
      ctx.restore()

      // Progress arc
      const prog = Math.min(1, total / GOAL)
      if (prog > 0) {
        ctx.beginPath()
        ctx.arc(W/2, 240, 72, -Math.PI/2, -Math.PI/2 + prog * Math.PI * 2)
        ctx.strokeStyle = '#A8FF6F'; ctx.lineWidth = 5
        ctx.lineCap = 'round'; ctx.stroke()
      }

      // HUD
      const arrows = '▶'.repeat(clamp(Math.floor(Math.abs(spinSpd) / 144), 0, 5))
      drawText(ctx, total < GOAL ? 'Blow to spin the pinwheel! 💨' : 'Amazing! 🎉',
               W/2, 44, { size: 20, bold: true, shadow: true,
               color: total < GOAL ? '#fff' : '#FAC775' })
      drawText(ctx, `Spin ${arrows}`, W/2, H - 36, { size: 16, color: 'rgba(255,255,255,0.5)' })

      // Progress bar
      const bx = W/2 - 120, by = 72
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.roundRect(bx, by, 240, 8, 4); ctx.fill()
      if (prog > 0) {
        ctx.fillStyle = '#A8FF6F'; ctx.beginPath(); ctx.roundRect(bx, by, 240 * prog, 8, 4); ctx.fill()
      }
    }
  }
}
