import { drawGradientBg, drawText, ParticleSystem, rand, clamp } from '../engine/render.js'

const SEEDS_NEEDED = 20

class Dandelion {
  constructor(x, y) {
    this.x = x; this.y = y
    this.vx = -rand(25, 55)
    this.seedsLeft = 12
  }
  update(dt) { this.x += this.vx * dt }
  get alive() { return this.x > -100 }
}

class FlyingSeed {
  constructor(x, y) {
    this.x = x; this.y = y
    this.vx = rand(60, 180)
    this.vy = rand(-120, -40)
    this.life = rand(1.4, 2.6)
    this.maxLife = this.life
    this.rot = rand(0, 360)
    this.rotSpd = rand(-120, 120)
  }
  update(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt
    this.vy += 55 * dt; this.rot += this.rotSpd * dt; this.life -= dt
  }
  get alive() { return this.life > 0 && this.x < 900 }
}

export function createDandelionLevel() {
  let collected  = 0
  let t          = 0
  let spawnT     = 0
  let spawned    = 0
  let wasBlowing = false
  let puffCd     = 0
  let done       = false
  let doneTimer  = 0
  const dandelions = []
  const seeds      = []
  const scoreFloats = []
  const ps         = new ParticleSystem()

  dandelions.push(new Dandelion(900, rand(200, 380)))

  return {
    id: 'dandelion',
    update(breath, dt) {
      t += dt; spawnT += dt; puffCd = Math.max(0, puffCd - dt)
      if (spawnT > 1.8 && spawned < 8) { dandelions.push(new Dandelion(920, rand(180,400))); spawnT=0; spawned++ }

      const isBlowing = breath >= 0.08
      const puffStart = isBlowing && !wasBlowing && puffCd <= 0
      wasBlowing = isBlowing

      for (const d of dandelions) { d.update(dt) }
      dandelions.splice(0, dandelions.length, ...dandelions.filter(d => d.alive))

      if (puffStart) {
        for (const d of dandelions) {
          if (d.seedsLeft <= 0) continue
          const dist = Math.hypot(d.x - 200, d.y - 290)
          if (dist < 450) {
            const burst = Math.min(d.seedsLeft, Math.floor(rand(4,7)))
            d.seedsLeft -= burst
            for (let i = 0; i < burst; i++) seeds.push(new FlyingSeed(d.x, d.y))
            collected += burst
            scoreFloats.push({ x: d.x, y: d.y-30, text:`+${burst}`, life:1.0 })
            puffCd = 0.32
          }
        }
      }

      for (const s of seeds) s.update(dt)
      seeds.splice(0, seeds.length, ...seeds.filter(s => s.alive))
      for (const f of scoreFloats) { f.y -= 40*dt; f.life -= dt }
      scoreFloats.splice(0, scoreFloats.length, ...scoreFloats.filter(f => f.life>0))
      ps.update(dt)

      if (collected >= SEEDS_NEEDED && !done) {
        doneTimer += dt
        if (doneTimer > 0.8) done = true
        return done ? { stars:3, message:'Seeds everywhere! Magical! 🌼' } : null
      }
      return null
    },

    draw(ctx, W, H, breath) {
      // Warm sunset sky
      drawGradientBg(ctx, W, H, '#ff9a56', '#ffcc80')
      // Horizon glow
      const hGrd = ctx.createLinearGradient(0, H*0.55, 0, H*0.82)
      hGrd.addColorStop(0, 'rgba(255,180,80,0.4)'); hGrd.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=hGrd; ctx.fillRect(0, H*0.55, W, H*0.3)

      // Ground
      ctx.fillStyle='#2d5a1e'; ctx.fillRect(0, H*0.82, W, H)
      ctx.fillStyle='#3d8a28'; ctx.fillRect(0, H*0.82, W, 16)
      // Grass tufts
      for (let i = 0; i < 20; i++) {
        const gx=(i*97+20)%W, gy=H*0.82
        ctx.strokeStyle='#4aaa30'; ctx.lineWidth=1.5
        for (let j=-1;j<=1;j++) {
          ctx.beginPath(); ctx.moveTo(gx+j*4,gy); ctx.lineTo(gx+j*3, gy-8-Math.abs(j)*3); ctx.stroke()
        }
      }

      // Dandelions
      for (const d of dandelions) {
        const x=d.x, y=d.y
        ctx.strokeStyle='#4a8a28'; ctx.lineWidth=2.5
        ctx.beginPath(); ctx.moveTo(x,y); ctx.bezierCurveTo(x,y+40,x-10,y+80,x-5,H*0.82); ctx.stroke()
        if (d.seedsLeft > 0) {
          const frac = d.seedsLeft/12
          for (let i=0;i<d.seedsLeft;i++) {
            const angle=(i/d.seedsLeft)*Math.PI*2
            const r=26*frac
            const ex=x+Math.cos(angle)*r, ey=y+Math.sin(angle)*r
            ctx.strokeStyle='rgba(220,220,220,0.8)'; ctx.lineWidth=1
            ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(ex,ey); ctx.stroke()
            ctx.fillStyle='rgba(255,255,255,0.9)'
            ctx.beginPath(); ctx.arc(ex,ey,3,0,Math.PI*2); ctx.fill()
          }
          ctx.fillStyle='#FAC775'; ctx.beginPath(); ctx.arc(x,y,8,0,Math.PI*2); ctx.fill()
        } else {
          ctx.fillStyle='#D97706'; ctx.beginPath(); ctx.arc(x,y,7,0,Math.PI*2); ctx.fill()
        }
      }

      // Flying seeds
      for (const s of seeds) {
        const a=clamp(s.life/s.maxLife,0,1)
        ctx.globalAlpha=a
        ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=1
        const rad=s.rot*Math.PI/180
        ctx.beginPath()
        ctx.moveTo(s.x,s.y)
        ctx.lineTo(s.x+Math.cos(rad)*9, s.y+Math.sin(rad)*9)
        ctx.stroke()
        ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(s.x,s.y,3,0,Math.PI*2); ctx.fill()
        ctx.globalAlpha=1
      }

      // Score floats
      for (const f of scoreFloats) {
        ctx.globalAlpha=f.life
        drawText(ctx, f.text, f.x, f.y, { size:20, bold:true, color:'#A8FF6F', shadow:true })
        ctx.globalAlpha=1
      }

      ps.draw(ctx)

      // HUD
      const prog = clamp(collected/SEEDS_NEEDED,0,1)
      ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(0,0,W,52)
      const bx=W/2-160, bw=320
      ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.roundRect(bx,16,bw,12,6); ctx.fill()
      if (prog>0) { ctx.fillStyle='#A8FF6F'; ctx.beginPath(); ctx.roundRect(bx,16,bw*prog,12,6); ctx.fill() }
      drawText(ctx, `🌼 Seeds: ${collected} / ${SEEDS_NEEDED}`, W/2, 38, { size:15, bold:true })
      drawText(ctx, 'Quick puffs to release seeds! 🌬️', W/2, H-28, { size:15, color:'rgba(255,200,80,0.8)' })
    }
  }
}
