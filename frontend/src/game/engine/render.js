/** Shared canvas drawing utilities used across all levels */

export function lerp(a, b, t) { return a + (b - a) * t }
export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
export function rand(a, b) { return a + Math.random() * (b - a) }
export function randInt(a, b) { return Math.floor(rand(a, b + 1)) }

export function drawGradientBg(ctx, W, H, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, top)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

export function drawRoundRect(ctx, x, y, w, h, r, fill, stroke, strokeW = 2) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  if (fill)   { ctx.fillStyle   = fill;   ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeW; ctx.stroke() }
}

export function drawText(ctx, text, x, y, {
  size = 18, font = 'Nunito', color = '#fff',
  align = 'center', baseline = 'middle', bold = false, shadow = false
} = {}) {
  ctx.save()
  ctx.font        = `${bold ? '800' : '600'} ${size}px ${font}, sans-serif`
  ctx.fillStyle   = color
  ctx.textAlign   = align
  ctx.textBaseline = baseline
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur  = 8
    ctx.shadowOffsetY = 3
  }
  ctx.fillText(text, x, y)
  ctx.restore()
}

export function drawStars(ctx, W, H, stars, t) {
  for (const s of stars) {
    const a = 0.4 + 0.5 * Math.abs(Math.sin(t * s.spd + s.phase))
    ctx.beginPath()
    ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${a})`
    ctx.fill()
  }
}

export function makeStars(n = 60) {
  return Array.from({ length: n }, () => ({
    x: Math.random(), y: Math.random(),
    r: rand(0.8, 2.2),
    spd: rand(0.4, 1.2),
    phase: rand(0, Math.PI * 2),
  }))
}

export class ParticleSystem {
  constructor() { this.particles = [] }

  emit(x, y, { count = 10, color = '#fff', speed = 120, life = 0.8, size = 6, gravity = 60, spread = Math.PI * 2 } = {}) {
    for (let i = 0; i < count; i++) {
      const angle = rand(0, spread) - spread / 2
      const spd   = rand(speed * 0.5, speed)
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - rand(20, 60),
        life, maxLife: life,
        size: rand(size * 0.5, size),
        color,
        gravity,
      })
    }
  }

  update(dt) {
    for (const p of this.particles) {
      p.x    += p.vx * dt
      p.y    += p.vy * dt
      p.vy   += p.gravity * dt
      p.life -= dt
    }
    this.particles = this.particles.filter(p => p.life > 0)
  }

  draw(ctx) {
    for (const p of this.particles) {
      const a = p.life / p.maxLife
      ctx.globalAlpha = a
      ctx.fillStyle   = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

export function drawBreathHint(ctx, W, H, breath, t) {
  if (breath < 0.04) {
    const a = 0.4 + 0.3 * Math.sin(t * 2)
    drawText(ctx, '💨 Blow!', W / 2, H - 36, { size: 18, color: `rgba(168,255,111,${a})`, bold: true })
  }
}
