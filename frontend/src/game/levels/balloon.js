import { drawText, ParticleSystem, rand, clamp } from '../engine/render.js'

/**
 * Balloon Pop — simplified fun version
 * One big balloon on screen. Blow to inflate it to the star zone. 
 * It slowly deflates if you stop. Hit the zone = star collected = new balloon!
 * Very forgiving, very visual, very satisfying.
 */

const COLORS  = ['#E24B4A','#A855F7','#3B82F6','#10B981','#F97316','#EC4899','#06B6D4']
const NEEDED  = 5
const TARGET_MIN = 0.52
const TARGET_MAX = 0.82

export function createBalloonLevel() {
  let score      = 0
  let t          = 0
  let wobbleT    = 0
  let size       = 0.1
  let lockT      = 0
  let done       = false
  let doneTimer  = 0
  let popAnim    = 0    // 0 = not popping, >0 = popping
  let nextColor  = COLORS[0]
  let curColor   = COLORS[0]
  let hintPulse  = 0
  const ps       = new ParticleSystem()
  const floaties = Array.from({ length: 6 }, (_, i) => ({
    x: rand(50, 750), y: rand(100, 500),
    vy: -rand(20, 45), size: rand(18, 32),
    color: COLORS[i % COLORS.length], opacity: rand(0.08, 0.18),
  }))

  function triggerPop() {
    score++
    popAnim = 0.6
    for (let i = 0; i < 40; i++) {
      ps.emit(400, 290, {
        count: 1, color: curColor,
        speed: rand(80, 300), life: rand(0.5, 1.1),
        size: rand(5, 14), spread: Math.PI * 2, gravity: 150,
      })
    }
    // Confetti
    const cols = ['#FAC775','#A8FF6F','#fff','#F97316']
    for (let i = 0; i < 20; i++) {
      ps.emit(400, 290, {
        count: 1, color: cols[i % cols.length],
        speed: rand(120, 260), life: rand(0.7, 1.3),
        size: rand(4, 9), spread: Math.PI * 2, gravity: 200,
      })
    }
    curColor  = nextColor
    nextColor = COLORS[score % COLORS.length]
    size      = 0.05
    lockT     = 0
  }

  return {
    id: 'balloon',
    update(breath, dt) {
      t += dt; wobbleT += dt * 3; hintPulse += dt * 2
      ps.update(dt)
      if (popAnim > 0) popAnim -= dt

      // Floating bg balloons
      for (const f of floaties) {
        f.y += f.vy * dt
        if (f.y < -50) { f.y = 600; f.x = rand(50, 750) }
      }

      if (done) {
        doneTimer += dt
        if (doneTimer > 0.8)
          return { stars: 3, message: `Popped ${score} balloons! 🎈 Amazing!` }
        return null
      }

      // Inflate / deflate
      if (breath > 0.03) {
        size = clamp(size + (breath + 0.12) * 0.55 * dt, 0, 1.02)
      } else {
        size = clamp(size - 0.018 * dt, 0.05, 1.02)
      }

      // Over-inflate = pop but no score, reset
      if (size >= 1.0 && popAnim <= 0) {
        for (let i = 0; i < 20; i++) {
          ps.emit(400, 290, {
            count: 1, color: '#888',
            speed: rand(60, 200), life: rand(0.3, 0.7),
            size: rand(3, 8), spread: Math.PI * 2, gravity: 120,
          })
        }
        size = 0.05; lockT = 0
      }

      // In target zone
      const inZone = size >= TARGET_MIN && size <= TARGET_MAX
      if (inZone) {
        lockT += dt
        if (lockT >= 0.55) {
          triggerPop()
          if (score >= NEEDED) done = true
        }
      } else {
        lockT = Math.max(0, lockT - dt * 1.5)
      }

      return null
    },

    draw(ctx, W, H, breath) {
      // Fun gradient background
      const bgGrd = ctx.createLinearGradient(0, 0, W, H)
      bgGrd.addColorStop(0, '#0f0c29')
      bgGrd.addColorStop(0.5, '#302b63')
      bgGrd.addColorStop(1, '#24243e')
      ctx.fillStyle = bgGrd; ctx.fillRect(0, 0, W, H)

      // Floating ghost balloons in bg
      for (const f of floaties) {
        ctx.globalAlpha = f.opacity
        ctx.fillStyle = f.color
        ctx.beginPath()
        ctx.ellipse(f.x, f.y, f.size, f.size * 1.2, 0, 0, Math.PI*2)
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // Sparkle dots
      for (let i = 0; i < 25; i++) {
        const sx = (i * 139 + 30) % W
        const sy = (i * 97 + 20) % H
        const sa = 0.2 + 0.3 * Math.abs(Math.sin(t * 0.7 + i * 0.5))
        ctx.fillStyle = `rgba(255,255,255,${sa})`
        ctx.beginPath(); ctx.arc(sx, sy, 1.2, 0, Math.PI*2); ctx.fill()
      }

      const cx = W / 2, cy = H / 2 - 10
      const r  = 38 + size * 160
      const wx = Math.sin(wobbleT) * 5 * size

      if (popAnim <= 0) {
        // Target zone ring (dashed)
        const minR = 38 + TARGET_MIN * 160
        const maxR = 38 + TARGET_MAX * 160
        const inZone = size >= TARGET_MIN && size <= TARGET_MAX

        // Zone fill
        ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI*2)
        ctx.fillStyle = inZone ? 'rgba(168,255,111,0.07)' : 'rgba(255,255,255,0.03)'
        ctx.fill()

        // Zone borders
        ctx.setLineDash([8, 5])
        ctx.lineWidth = 2.5
        ctx.strokeStyle = inZone
          ? `rgba(168,255,111,${0.6 + 0.3*Math.sin(hintPulse*3)})`
          : 'rgba(255,255,255,0.25)'
        ctx.beginPath(); ctx.arc(cx, cy, minR, 0, Math.PI*2); ctx.stroke()
        ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI*2); ctx.stroke()
        ctx.setLineDash([])

        // Zone label
        drawText(ctx, inZone ? '✨ Hold it!' : 'Target Zone',
                 cx, cy - maxR - 18,
                 { size: 14, bold: true,
                   color: inZone ? '#A8FF6F' : 'rgba(255,255,255,0.3)' })

        // Lock progress arc
        if (lockT > 0) {
          const prog = lockT / 0.55
          ctx.strokeStyle = '#A8FF6F'; ctx.lineWidth = 6
          ctx.shadowColor = '#A8FF6F'; ctx.shadowBlur = 12
          ctx.beginPath()
          ctx.arc(cx, cy, r + 18, -Math.PI/2, -Math.PI/2 + prog * Math.PI * 2)
          ctx.stroke()
          ctx.shadowBlur = 0
        }

        // Balloon shadow
        ctx.fillStyle = 'rgba(0,0,0,0.18)'
        ctx.beginPath()
        ctx.ellipse(cx + wx, cy + r * 1.15 + 16, r * 0.55, 12, 0, 0, Math.PI*2)
        ctx.fill()

        // Balloon body
        const bGrd = ctx.createRadialGradient(
          cx + wx - r*0.3, cy - r*0.3, r*0.05,
          cx + wx, cy, r
        )
        bGrd.addColorStop(0, lighten(curColor, 55))
        bGrd.addColorStop(0.55, curColor)
        bGrd.addColorStop(1, darken(curColor, 50))
        ctx.fillStyle = bGrd
        ctx.beginPath()
        ctx.ellipse(cx + wx, cy, r, r * 1.18, 0, 0, Math.PI*2)
        ctx.fill()

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.beginPath()
        ctx.ellipse(cx + wx - r*0.3, cy - r*0.35, r*0.24, r*0.17, -0.5, 0, Math.PI*2)
        ctx.fill()

        // Secondary shine
        ctx.fillStyle = 'rgba(255,255,255,0.1)'
        ctx.beginPath()
        ctx.ellipse(cx + wx + r*0.2, cy + r*0.3, r*0.12, r*0.09, 0.5, 0, Math.PI*2)
        ctx.fill()

        // Knot
        ctx.fillStyle = darken(curColor, 60)
        ctx.beginPath(); ctx.arc(cx + wx, cy + r*1.18, 7, 0, Math.PI*2); ctx.fill()
        // Knot tie marks
        ctx.strokeStyle = darken(curColor, 80); ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(cx + wx - 5, cy + r*1.18 - 3)
        ctx.lineTo(cx + wx + 5, cy + r*1.18 + 3)
        ctx.stroke()

        // String
        ctx.strokeStyle = 'rgba(220,220,220,0.4)'; ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(cx + wx, cy + r*1.18 + 7)
        ctx.quadraticCurveTo(cx + wx*1.5, cy + r*1.18 + 50, cx, H - 60)
        ctx.stroke()

        // Size % label inside balloon
        if (size > 0.2) {
          const pct = Math.round(size * 100)
          drawText(ctx, `${pct}%`, cx + wx, cy,
                   { size: Math.max(14, r * 0.28), bold: true,
                     color: 'rgba(255,255,255,0.85)', shadow: true })
        }

        // Arrow hint when not in zone
        if (!inZone && size < TARGET_MIN && breath < 0.03) {
          const pulse = 0.5 + 0.4 * Math.sin(hintPulse * 2)
          ctx.fillStyle = `rgba(168,255,111,${pulse})`
          const arrowX = cx + r + 30, arrowY = cy
          ctx.beginPath()
          ctx.moveTo(arrowX, arrowY - 14)
          ctx.lineTo(arrowX + 20, arrowY)
          ctx.lineTo(arrowX, arrowY + 14)
          ctx.fill()
          drawText(ctx, 'Blow!', arrowX + 36, arrowY,
                   { size: 16, bold: true, color: `rgba(168,255,111,${pulse})` })
        }
      }

      ps.draw(ctx)

      // Next balloon preview
      if (score < NEEDED - 1) {
        const nr = 14
        ctx.fillStyle = nextColor + 'cc'
        ctx.beginPath(); ctx.ellipse(W - 44, 80, nr, nr*1.15, 0, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.beginPath(); ctx.ellipse(W-50, 72, nr*0.25, nr*0.18, -0.4, 0, Math.PI*2); ctx.fill()
        drawText(ctx, 'Next', W - 44, 104, { size: 11, color: 'rgba(255,255,255,0.4)' })
      }

      // HUD bar
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.beginPath(); ctx.roundRect(0, 0, W, 52, [0,0,14,14]); ctx.fill()

      // Stars collected
      for (let i = 0; i < NEEDED; i++) {
        drawText(ctx, i < score ? '🌟' : '⭐', 36 + i * 36, 27, { size: i < score ? 20 : 16 })
      }

      // Instruction
      drawText(ctx, 'Blow to inflate • Stop in the ✨ zone!',
               W/2 + 40, 27, { size: 13, color: 'rgba(255,255,255,0.45)' })
    }
  }
}

function darken(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${Math.max(0,(n>>16)-amt)},${Math.max(0,((n>>8)&0xff)-amt)},${Math.max(0,(n&0xff)-amt)})`
}
function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${Math.min(255,(n>>16)+amt)},${Math.min(255,((n>>8)&0xff)+amt)},${Math.min(255,(n&0xff)+amt)})`
}
