import { drawGradientBg, drawText, makeStars, ParticleSystem, rand, clamp, lerp } from '../engine/render.js'

/**
 * Float Rider → Kite Flyer 🪁
 * Blow to lift the kite higher. Guide it through star rings.
 * Much more forgiving than Geometry Dash — kite drifts slowly, rings are big.
 */

const N_RINGS   = 4
const KITE_X    = 160    // kite stays at fixed X, world scrolls
const SCROLL    = 60     // very slow
const RISE_SPD  = 220    // how fast kite rises when blowing
const FALL_SPD  = 55     // very slow sink
const RING_R    = 72     // very big rings
const FLOOR_Y   = 500
const CEIL_Y    = 70

export function createFloatRiderLevel() {
  let kiteY       = 310
  let t           = 0
  let worldX      = 0
  let score       = 0
  let complete    = false
  let completeTimer = 0
  let tailPhase   = 0
  const ps        = new ParticleSystem()

  // Generate rings spread across the level
  const rings = Array.from({ length: N_RINGS }, (_, i) => ({
    x: 350 + i * 280,
    y: rand(160, 400),
    hit: false,
    pulse: rand(0, Math.PI * 2),
  }))

  const FINISH_X = 350 + N_RINGS * 280 + 200

  // Clouds for parallax
  const clouds = Array.from({ length: 8 }, () => ({
    x: rand(0, 900), y: rand(60, 300),
    w: rand(60, 140), h: rand(25, 55),
    spd: rand(15, 35), layer: Math.random() > 0.5 ? 1 : 0.6,
  }))

  // String points (tail of kite — physics spring chain)
  const STRING_POINTS = 12
  const string = Array.from({ length: STRING_POINTS }, (_, i) => ({
    x: KITE_X - 20 - i * 18,
    y: 290 + i * 8,
  }))

  return {
    id: 'float_rider',
    update(breath, dt) {
      t += dt; tailPhase += dt * 3

      // Kite movement — very smooth
      const targetVY = breath > 0.05 ? -RISE_SPD * Math.min(1, breath * 1.8) : FALL_SPD
      kiteY = clamp(kiteY + targetVY * dt, CEIL_Y, FLOOR_Y - 40)

      // Breath particles (wind)
      if (breath > 0.06 && Math.random() < 0.4) {
        ps.emit(KITE_X - 30, kiteY + rand(-20, 20), {
          count: 1, color: `hsla(${140 + breath*40}, 80%, 70%, 0.7)`,
          speed: 40 + breath * 80, life: 0.6, size: 3 + breath * 5,
          spread: 0.5, gravity: -10,
        })
      }
      ps.update(dt)

      // Scroll
      worldX += SCROLL * dt
      rings.forEach(r => r.x -= SCROLL * dt)
      clouds.forEach(c => {
        c.x -= c.spd * c.layer * dt
        if (c.x + c.w < 0) { c.x = 900 + c.w; c.y = rand(60, 300) }
      })

      // Ring collision
      for (const r of rings) {
        if (!r.hit && Math.hypot(KITE_X - r.x, kiteY - r.y) < RING_R + 22) {
          r.hit = true; score++
          ps.emit(r.x, r.y, {
            count: 18, color: '#FAC775', speed: 120, life: 0.8,
            size: 7, spread: Math.PI * 2, gravity: 50,
          })
          ps.emit(r.x, r.y, {
            count: 10, color: '#A8FF6F', speed: 80, life: 0.6,
            size: 4, spread: Math.PI * 2, gravity: 30,
          })
        }
      }

      // Update string physics (lazy follow)
      string[0].x = KITE_X - 18
      string[0].y = kiteY + 30
      for (let i = 1; i < STRING_POINTS; i++) {
        string[i].x = lerp(string[i].x, string[i-1].x - 16 + Math.sin(tailPhase + i * 0.8) * 6, 0.3)
        string[i].y = lerp(string[i].y, string[i-1].y + 14, 0.25)
      }

      if (worldX >= FINISH_X && !complete) complete = true
      if (complete) {
        completeTimer += dt
        if (completeTimer > 1.0) {
          const stars = score >= N_RINGS ? 3 : score >= Math.ceil(N_RINGS * 0.6) ? 2 : 1
          return { stars, message: score >= N_RINGS ? 'Perfect flight! ⭐ All rings!' : `Got ${score}/${N_RINGS} rings! 🪁` }
        }
      }
      return null
    },

    draw(ctx, W, H, breath) {
      // Sky gradient — warm daytime
      drawGradientBg(ctx, W, H, '#87CEEB', '#E0F4FF')

      // Sun
      const sunGrd = ctx.createRadialGradient(W - 80, 80, 0, W - 80, 80, 70)
      sunGrd.addColorStop(0, 'rgba(255,240,100,0.9)')
      sunGrd.addColorStop(0.5, 'rgba(255,200,50,0.5)')
      sunGrd.addColorStop(1, 'rgba(255,180,0,0)')
      ctx.fillStyle = sunGrd; ctx.beginPath(); ctx.arc(W-80, 80, 70, 0, Math.PI*2); ctx.fill()

      // Clouds (parallax)
      for (const c of clouds) {
        const a = c.layer * 0.85
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w, c.h*0.5, 0, 0, Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(c.x - c.w*0.3, c.y - c.h*0.25, c.w*0.55, c.h*0.45, 0, 0, Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(c.x + c.w*0.25, c.y - c.h*0.2, c.w*0.45, c.h*0.4, 0, 0, Math.PI*2); ctx.fill()
      }

      // Ground
      ctx.fillStyle = '#4a9e30'; ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y)
      ctx.fillStyle = '#5dc43a'; ctx.fillRect(0, FLOOR_Y, W, 12)
      // Rolling hills
      ctx.fillStyle = '#3d8a25'
      ctx.beginPath(); ctx.moveTo(0, FLOOR_Y)
      for (let x = 0; x <= W; x += 20) {
        ctx.lineTo(x, FLOOR_Y - 18 * Math.sin((x + worldX * 0.3) * 0.015))
      }
      ctx.lineTo(W, FLOOR_Y); ctx.closePath(); ctx.fill()

      // Rings
      for (const r of rings) {
        if (r.x < -80 || r.x > W + 80) continue
        if (r.hit) continue
        const pulse = 0.7 + 0.3 * Math.sin(t * 3 + r.pulse)
        // Outer glow
        const rg = ctx.createRadialGradient(r.x, r.y, RING_R - 8, r.x, r.y, RING_R + 20)
        rg.addColorStop(0, `rgba(255,215,0,${0.15 * pulse})`)
        rg.addColorStop(1, 'rgba(255,215,0,0)')
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(r.x, r.y, RING_R + 20, 0, Math.PI*2); ctx.fill()
        // Ring
        ctx.strokeStyle = `rgba(255,215,0,${0.9 * pulse})`
        ctx.lineWidth = 8; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14
        ctx.beginPath(); ctx.arc(r.x, r.y, RING_R, 0, Math.PI*2); ctx.stroke()
        ctx.shadowBlur = 0
        // Star inside
        drawText(ctx, '⭐', r.x, r.y, { size: 22 })
        // Score label
        drawText(ctx, `${N_RINGS - rings.filter(r=>r.hit).length} left`,
                 r.x, r.y + RING_R + 18, { size: 12, color: 'rgba(0,0,0,0.4)' })
      }

      // Breath particles
      ps.draw(ctx)

      // Kite string
      ctx.strokeStyle = 'rgba(80,50,20,0.6)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(string[0].x, string[0].y)
      for (let i = 1; i < STRING_POINTS; i++) {
        ctx.lineTo(string[i].x, string[i].y)
      }
      ctx.stroke()

      // Kite body — diamond shape
      const kx = KITE_X, ky = kiteY
      const tilt = (breath > 0.05 ? -0.25 : 0.1) + Math.sin(t * 1.5) * 0.06

      ctx.save()
      ctx.translate(kx, ky)
      ctx.rotate(tilt)

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.beginPath()
      ctx.moveTo(0, -36); ctx.lineTo(26, 0); ctx.lineTo(0, 28); ctx.lineTo(-26, 0)
      ctx.closePath(); ctx.fill()

      // Main panels
      const kiteCols = ['#E24B4A', '#FAC775', '#E24B4A', '#FAC775']
      const panels = [
        [[0,-36],[26,0],[0,0]],
        [[26,0],[0,28],[0,0]],
        [[0,-36],[-26,0],[0,0]],
        [[-26,0],[0,28],[0,0]],
      ]
      panels.forEach((pts, i) => {
        ctx.fillStyle = kiteCols[i]
        ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2])
        ctx.closePath(); ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke()
      })

      // Cross struts
      ctx.strokeStyle = 'rgba(100,60,20,0.7)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(0,-36); ctx.lineTo(0,28); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-26,0); ctx.lineTo(26,0); ctx.stroke()

      // Center gem
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill()

      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.beginPath(); ctx.ellipse(-8, -18, 5, 9, -0.5, 0, Math.PI*2); ctx.fill()
      ctx.restore()

      // Kite tail ribbons
      for (let r = 0; r < 3; r++) {
        const offset = r * 8 - 8
        ctx.strokeStyle = r === 1 ? '#E24B4A' : '#FAC775'
        ctx.lineWidth = 2.5; ctx.globalAlpha = 0.7
        ctx.beginPath()
        ctx.moveTo(kx + offset, ky + 28)
        for (let s = 1; s <= 5; s++) {
          const tx = kx + offset + Math.sin(tailPhase + s * 1.2 + r) * (8 + s*2)
          const ty = ky + 28 + s * 18
          ctx.lineTo(tx, ty)
        }
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      // Finish flag
      const flagSX = FINISH_X - worldX + KITE_X
      if (flagSX > 0 && flagSX < W + 60) {
        ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(flagSX, FLOOR_Y); ctx.lineTo(flagSX, FLOOR_Y - 90); ctx.stroke()
        ctx.fillStyle = '#E24B4A'
        ctx.beginPath(); ctx.moveTo(flagSX, FLOOR_Y-90); ctx.lineTo(flagSX+38, FLOOR_Y-74); ctx.lineTo(flagSX, FLOOR_Y-58); ctx.fill()
        drawText(ctx, 'FINISH! 🎉', flagSX, FLOOR_Y-104, { size: 14, color: '#E24B4A', bold: true })
      }

      // HUD
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.beginPath(); ctx.roundRect(8, 8, 200, 46, 10); ctx.fill()
      drawText(ctx, `⭐ ${score} / ${N_RINGS} rings`, 108, 31, { size: 16, bold: true, color: '#1a1a2e' })

      const prog = clamp(worldX / FINISH_X, 0, 1)
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.roundRect(W-175, 16, 160, 10, 5); ctx.fill()
      if (prog > 0) {
        ctx.fillStyle = '#E24B4A'; ctx.beginPath(); ctx.roundRect(W-175, 16, 160*prog, 10, 5); ctx.fill()
      }
      drawText(ctx, '🏁', W-10, 21, { size: 14 })

      if (t < 5) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.beginPath(); ctx.roundRect(W/2 - 130, H - 46, 260, 34, 8); ctx.fill()
        drawText(ctx, 'Blow to lift the kite through the rings! 🪁', W/2, H - 29,
                 { size: 14, bold: true, color: '#1a1a2e' })
      }

      if (complete) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(0,0,W,H)
        drawText(ctx, '🎉 You made it!', W/2, H/2, { size: 32, bold: true, color: '#1a1a2e', shadow: true })
      }
    }
  }
}
