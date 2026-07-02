import { drawGradientBg, drawText, ParticleSystem, rand, clamp } from '../engine/render.js'

const GAP_WIDTHS = [90, 105, 120, 135, 150]
const PLAT_W     = 190
const PLAT_H     = 65
const FLOOR_Y    = 520

export function createDragonLevel() {
  let gapIndex     = 0
  let firePower    = 0
  let t            = 0
  let dragonBob    = 0
  let wingT        = 0
  let tailT        = 0
  let successFlash = 0
  let done         = false
  let doneTimer    = 0
  let blinkT       = 0
  const firePs     = new ParticleSystem()
  const emberPs    = new ParticleSystem()

  const platforms = []
  let px = 0
  for (const gap of GAP_WIDTHS) {
    platforms.push({ x: px, w: PLAT_W })
    px += PLAT_W + gap
  }
  platforms.push({ x: px, w: 260 })

  function gapInfo() {
    const cur  = platforms[gapIndex]
    const next = platforms[gapIndex + 1]
    return { gapStart: cur.x + cur.w, gapEnd: next.x }
  }
  function toScreen(wx) { return wx - platforms[gapIndex].x }

  return {
    id: 'dragon',
    update(breath, dt) {
      t += dt; dragonBob += dt * 2.5; wingT += dt; tailT += dt
      blinkT += dt
      firePs.update(dt); emberPs.update(dt)
      if (successFlash > 0) successFlash -= dt

      if (gapIndex >= GAP_WIDTHS.length && !done) {
        doneTimer += dt
        if (doneTimer > 1.0) done = true
        return done ? { stars: 3, message: 'Dragon master! 🔥 All gaps crossed!' } : null
      }

      const isBlowing = breath >= 0.06
      if (isBlowing) {
        firePower = clamp(firePower + (breath + 0.2) * dt * 2.5, 0, 1)
        const mouthPos = _dragonMouthPos(dragonBob)
        const count = Math.floor(breath * 8) + 2
        for (let i = 0; i < count; i++) {
          firePs.emit(mouthPos.x, mouthPos.y, {
            count: 1,
            color: breath > 0.6 ? '#fffde7' : breath > 0.35 ? '#FAC775' : '#F97316',
            speed: rand(320, 550) * (0.6 + breath * 0.4),
            life: rand(0.45, 0.85),
            size: rand(7, 8 + breath * 18),
            spread: 0.3, gravity: 25,
          })
        }
        // Embers
        if (Math.random() < breath * 0.5) {
          emberPs.emit(mouthPos.x, mouthPos.y, {
            count: 1, color: '#FAC775',
            speed: rand(60, 180), life: rand(0.3, 0.7),
            size: rand(2, 4), spread: 1.0, gravity: 140,
          })
        }
      } else {
        firePower = clamp(firePower - dt * 0.15, 0, 1)
      }

      if (gapIndex < GAP_WIDTHS.length) {
        const { gapEnd } = gapInfo()
        const gapEndS    = toScreen(gapEnd)
        const fireMaxX   = Math.max(...firePs.particles.map(p => p.x), 0)
        if (fireMaxX >= gapEndS) {
          gapIndex++; firePs.particles = []; successFlash = 0.8; firePower = 0
        }
      }
      return null
    },

    draw(ctx, W, H, breath) {
      // Deep cave background
      drawGradientBg(ctx, W, H, '#0d0408', '#1a0812')

      // Cave texture — rock layers
      for (let layer = 0; layer < 3; layer++) {
        const ly = layer * 60 + 20
        ctx.fillStyle = `rgba(40,15,25,${0.4 - layer*0.1})`
        ctx.beginPath(); ctx.moveTo(0, ly)
        for (let x = 0; x <= W; x += 40) {
          ctx.lineTo(x, ly + Math.sin(x * 0.03 + layer * 2) * 18)
        }
        ctx.lineTo(W, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill()
      }

      // Stalactites
      ctx.fillStyle = '#1a0810'
      for (let i = 0; i < 10; i++) {
        const sx = (i / 9) * W * 1.1 - 30
        const sh = 25 + (i * 41) % 55
        const sw = 16 + (i * 17) % 20
        ctx.beginPath()
        ctx.moveTo(sx - sw/2, 0); ctx.lineTo(sx + sw/2, 0); ctx.lineTo(sx, sh)
        ctx.closePath(); ctx.fill()
        // Drip
        ctx.fillStyle = 'rgba(80,20,50,0.6)'
        ctx.beginPath(); ctx.arc(sx, sh + 4, 4, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle = '#1a0810'
      }

      // Glowing cave crystals on ceiling
      const crystalCols = ['#4a1060','#601040','#402060']
      for (let i = 0; i < 6; i++) {
        const cx2 = 60 + i * 140
        const grd = ctx.createRadialGradient(cx2, 10, 0, cx2, 10, 35)
        grd.addColorStop(0, crystalCols[i%3] + 'aa')
        grd.addColorStop(1, 'transparent')
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx2, 10, 35, 0, Math.PI*2); ctx.fill()
      }

      // Platforms — carved stone
      for (let i = 0; i < platforms.length; i++) {
        const p  = platforms[i]
        const sx = toScreen(p.x)
        if (sx + p.w < -10 || sx > W + 10) continue

        // Stone body
        const platGrd = ctx.createLinearGradient(sx, FLOOR_Y - PLAT_H, sx + p.w, FLOOR_Y)
        platGrd.addColorStop(0, '#4a2818')
        platGrd.addColorStop(0.3, '#6b3a22')
        platGrd.addColorStop(0.7, '#5a2f1a')
        platGrd.addColorStop(1, '#3a1e0e')
        ctx.fillStyle = platGrd
        ctx.beginPath(); ctx.roundRect(sx, FLOOR_Y - PLAT_H, p.w, PLAT_H, [8,8,0,0]); ctx.fill()

        // Stone cracks
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5
        for (let c = 0; c < 3; c++) {
          const crx = sx + 20 + c * (p.w - 40) / 2
          ctx.beginPath()
          ctx.moveTo(crx, FLOOR_Y - PLAT_H + 8)
          ctx.lineTo(crx + rand(-8,8), FLOOR_Y - PLAT_H/2)
          ctx.lineTo(crx + rand(-12,12), FLOOR_Y - 10)
          ctx.stroke()
        }

        // Top edge highlight
        const topGrd = ctx.createLinearGradient(sx, 0, sx + p.w, 0)
        topGrd.addColorStop(0, '#8B5e30')
        topGrd.addColorStop(0.5, '#c08040')
        topGrd.addColorStop(1, '#8B5e30')
        ctx.fillStyle = topGrd
        ctx.beginPath(); ctx.roundRect(sx+2, FLOOR_Y-PLAT_H, p.w-4, 10, [6,6,0,0]); ctx.fill()

        // Lava gap
        if (i < GAP_WIDTHS.length) {
          const gapX = sx + p.w
          const gapW = GAP_WIDTHS[i]
          if (gapX < W && gapX + gapW > 0) {
            // Lava base
            for (let j = 0; j < gapW; j++) {
              const lt  = j / gapW
              const lvy = FLOOR_Y - PLAT_H + 22 + Math.sin(t*3.5 + lt*8) * 8
              const lr  = 200 + Math.floor(55 * Math.abs(Math.sin(t*2.5 + lt*4)))
              const lg  = Math.floor(40 + lt*30)
              ctx.fillStyle = `rgb(${lr},${lg},0)`
              ctx.fillRect(gapX + j, lvy, 1, FLOOR_Y - lvy)
            }
            // Lava surface glow
            const lavaSurf = ctx.createLinearGradient(0, FLOOR_Y-PLAT_H+14, 0, FLOOR_Y-PLAT_H+38)
            lavaSurf.addColorStop(0, 'rgba(255,120,0,0.6)')
            lavaSurf.addColorStop(1, 'rgba(200,60,0,0)')
            ctx.fillStyle = lavaSurf; ctx.fillRect(gapX, FLOOR_Y-PLAT_H+14, gapW, 24)
            // Lava glow on surroundings
            const lavaGlow = ctx.createRadialGradient(gapX+gapW/2, FLOOR_Y-PLAT_H, 0, gapX+gapW/2, FLOOR_Y-PLAT_H, gapW*0.9)
            lavaGlow.addColorStop(0, 'rgba(255,80,0,0.18)')
            lavaGlow.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.fillStyle = lavaGlow; ctx.fillRect(gapX-20, FLOOR_Y-PLAT_H-80, gapW+40, 100)
          }
        }
      }

      // Fire particles
      for (const p of firePs.particles) {
        const prog = p.life / p.maxLife
        ctx.globalAlpha = prog * 0.88
        const fGrd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
        const innerCol = prog > 0.6 ? '#fffde7' : prog > 0.3 ? '#FAC775' : '#F97316'
        fGrd.addColorStop(0, innerCol)
        fGrd.addColorStop(0.5, '#F97316aa')
        fGrd.addColorStop(1, 'rgba(239,68,68,0)')
        ctx.fillStyle = fGrd
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill()
        ctx.globalAlpha = 1
      }
      emberPs.draw(ctx)

      // Dragon
      _drawDragon(ctx, dragonBob, wingT, tailT, blinkT, breath, FLOOR_Y, PLAT_H)

      // Success flash
      if (successFlash > 0) {
        ctx.fillStyle = `rgba(255,140,0,${successFlash * 0.22})`; ctx.fillRect(0,0,W,H)
        drawText(ctx, '🔥 Gap crossed!', W/2, H/2 - 60,
                 { size: 32, bold: true, color: '#FAC775', shadow: true })
      }
      if (gapIndex >= GAP_WIDTHS.length && !done) {
        drawText(ctx, '🏆 All gaps crossed!', W/2, H/2-60,
                 { size: 28, bold: true, color: '#A8FF6F', shadow: true })
      }

      // Power meter
      const bx=W-52, by=H/2-100, bh=200
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(bx,by,32,bh,8); ctx.fill()
      ctx.strokeStyle='rgba(255,100,0,0.3)'; ctx.lineWidth=1; ctx.stroke()
      if (firePower > 0) {
        const fh  = bh * firePower
        const fc  = firePower > 0.8 ? '#ff4400' : firePower > 0.5 ? '#F97316' : '#FAC775'
        const fGrd = ctx.createLinearGradient(0, by+bh-fh, 0, by+bh)
        fGrd.addColorStop(0, '#fffde7'); fGrd.addColorStop(0.4, fc); fGrd.addColorStop(1, '#7f1d00')
        ctx.fillStyle = fGrd
        ctx.beginPath(); ctx.roundRect(bx+3, by+bh-fh, 26, fh, 5); ctx.fill()
        // Glow
        ctx.shadowColor = fc; ctx.shadowBlur = 16
        ctx.fillStyle = fc; ctx.beginPath(); ctx.roundRect(bx+3, by+bh-fh, 26, fh, 5); ctx.fill()
        ctx.shadowBlur = 0
      }
      drawText(ctx, '🔥', bx+16, by-18, { size: 18 })

      // HUD
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,52)
      const label = gapIndex >= GAP_WIDTHS.length
        ? '🏆 All gaps crossed!'
        : `🐉 Gap ${gapIndex+1} / ${GAP_WIDTHS.length}  —  ${GAP_WIDTHS[gapIndex]}px wide`
      drawText(ctx, label, W/2, 28, { size: 16, bold: true })
      drawText(ctx, 'Blow to shoot fire across the lava! 🔥', W/2, H-28,
               { size: 14, color: 'rgba(255,160,80,0.8)' })
    }
  }
}

function _dragonMouthPos(bob) {
  return { x: 195, y: FLOOR_Y - PLAT_H - 62 + Math.sin(bob) * 5 }
}

function _drawDragon(ctx, bob, wingT, tailT, blinkT, breath, FLOOR_Y, PLAT_H) {
  const baseX  = 30
  const baseY  = FLOOR_Y - PLAT_H - 55 + Math.sin(bob) * 6
  const eyeBlink = Math.sin(blinkT * 0.8) > 0.92

  // ---- Tail (behind body) ----
  ctx.save()
  const tailPoints = []
  for (let i = 0; i < 8; i++) {
    const tf = i / 7
    tailPoints.push({
      x: baseX - 18 - tf * 80,
      y: baseY + 22 + Math.sin(tailT * 3 + tf * 4) * (10 + tf * 14),
      r: Math.max(3, 16 - tf * 12),
    })
  }
  // Tail gradient
  for (let i = tailPoints.length - 1; i >= 0; i--) {
    const tp  = tailPoints[i]
    const tf  = i / (tailPoints.length - 1)
    const tGrd = ctx.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, tp.r)
    tGrd.addColorStop(0, `rgb(${50+tf*20},${140+tf*20},${40+tf*10})`)
    tGrd.addColorStop(1, `rgb(${30+tf*10},${90+tf*15},${25+tf*5})`)
    ctx.fillStyle = tGrd
    ctx.beginPath(); ctx.arc(tp.x, tp.y, tp.r, 0, Math.PI*2); ctx.fill()
  }
  // Tail spines
  for (let i = 1; i < tailPoints.length - 1; i += 2) {
    const tp = tailPoints[i]
    ctx.fillStyle = '#8B3a10'
    ctx.beginPath()
    ctx.moveTo(tp.x - 4, tp.y - tp.r)
    ctx.lineTo(tp.x + 4, tp.y - tp.r)
    ctx.lineTo(tp.x, tp.y - tp.r - 10)
    ctx.closePath(); ctx.fill()
  }
  ctx.restore()

  // ---- Wing (behind body) ----
  const wingAngle = Math.sin(wingT * 2.5) * 0.28
  ctx.save()
  ctx.translate(baseX + 5, baseY + 10)
  // Wing membrane
  const wingGrd = ctx.createLinearGradient(-20, 0, -90, 80)
  wingGrd.addColorStop(0, '#5b21b6')
  wingGrd.addColorStop(0.5, '#7c3aed')
  wingGrd.addColorStop(1, '#4c1d95')
  ctx.fillStyle = wingGrd
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(
    -30 + Math.cos(wingAngle - 0.9) * 70, Math.sin(wingAngle - 0.9) * 70,
    -20 + Math.cos(wingAngle - 0.5) * 90, Math.sin(wingAngle - 0.5) * 80,
    Math.cos(wingAngle) * 65,              Math.sin(wingAngle) * 55,
  )
  ctx.bezierCurveTo(
    Math.cos(wingAngle + 0.4) * 50, Math.sin(wingAngle + 0.4) * 40,
    -10, 20, 0, 0
  )
  ctx.fill()
  // Wing veins
  ctx.strokeStyle = 'rgba(167,139,250,0.4)'; ctx.lineWidth = 1.5
  for (let v = 0; v < 3; v++) {
    const va = wingAngle - 0.6 + v * 0.3
    ctx.beginPath()
    ctx.moveTo(0,0)
    ctx.lineTo(Math.cos(va)*65, Math.sin(va)*55)
    ctx.stroke()
  }
  // Wing bone
  ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(wingAngle)*68, Math.sin(wingAngle)*58); ctx.stroke()
  ctx.restore()

  // ---- Body ----
  const bodyGrd = ctx.createRadialGradient(baseX + 5, baseY + 18, 4, baseX + 5, baseY + 22, 44)
  bodyGrd.addColorStop(0, '#4ade80')
  bodyGrd.addColorStop(0.5, '#16a34a')
  bodyGrd.addColorStop(1, '#14532d')
  ctx.fillStyle = bodyGrd
  ctx.beginPath(); ctx.ellipse(baseX + 5, baseY + 22, 42, 28, 0.1, 0, Math.PI*2); ctx.fill()

  // Body scales pattern
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const sx = baseX - 28 + col * 22 + (row%2)*11
      const sy = baseY + 8 + row * 14
      ctx.beginPath(); ctx.ellipse(sx, sy, 10, 7, 0, 0, Math.PI*2); ctx.stroke()
    }
  }

  // Belly plates
  const bellyGrd = ctx.createLinearGradient(baseX-18, baseY+14, baseX+18, baseY+40)
  bellyGrd.addColorStop(0, '#86efac')
  bellyGrd.addColorStop(1, '#4ade80')
  ctx.fillStyle = bellyGrd
  ctx.beginPath(); ctx.ellipse(baseX + 5, baseY + 30, 22, 16, 0, 0, Math.PI*2); ctx.fill()
  // Belly segment lines
  ctx.strokeStyle = 'rgba(0,100,0,0.2)'; ctx.lineWidth = 1
  for (let s = 0; s < 4; s++) {
    ctx.beginPath()
    ctx.ellipse(baseX + 5, baseY + 20 + s*5, 22 - s*2, 3, 0, 0, Math.PI); ctx.stroke()
  }

  // Back spines
  const spinePositions = [-28,-14,0,14,28]
  spinePositions.forEach((ox, i) => {
    const spineH = 10 + Math.abs(i-2) * 3
    ctx.fillStyle = '#7f1d1d'
    ctx.beginPath()
    ctx.moveTo(baseX + ox - 5, baseY + 2)
    ctx.lineTo(baseX + ox + 5, baseY + 2)
    ctx.lineTo(baseX + ox,     baseY + 2 - spineH)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#991b1b'
    ctx.beginPath()
    ctx.moveTo(baseX + ox - 2, baseY + 2)
    ctx.lineTo(baseX + ox + 2, baseY + 2)
    ctx.lineTo(baseX + ox,     baseY + 2 - spineH + 3)
    ctx.closePath(); ctx.fill()
  })

  // ---- Neck ----
  const neckGrd = ctx.createLinearGradient(baseX+35, baseY+8, baseX+80, baseY-10)
  neckGrd.addColorStop(0, '#16a34a')
  neckGrd.addColorStop(1, '#15803d')
  ctx.fillStyle = neckGrd
  ctx.beginPath()
  ctx.moveTo(baseX+28, baseY+4)
  ctx.bezierCurveTo(baseX+60, baseY-8, baseX+80, baseY-18, baseX+95, baseY-20)
  ctx.bezierCurveTo(baseX+80, baseY-6, baseX+60, baseY+8, baseX+38, baseY+20)
  ctx.closePath(); ctx.fill()

  // ---- Head ----
  const headX = baseX + 110
  const headY = baseY - 15 + Math.sin(bob * 1.2) * 3

  const headGrd = ctx.createRadialGradient(headX - 10, headY - 5, 2, headX, headY + 2, 30)
  headGrd.addColorStop(0, '#4ade80')
  headGrd.addColorStop(0.6, '#16a34a')
  headGrd.addColorStop(1, '#14532d')
  ctx.fillStyle = headGrd
  ctx.beginPath(); ctx.ellipse(headX, headY + 2, 32, 22, 0.15, 0, Math.PI*2); ctx.fill()

  // Snout
  ctx.fillStyle = '#15803d'
  ctx.beginPath(); ctx.ellipse(headX + 24, headY + 6, 16, 12, 0.3, 0, Math.PI*2); ctx.fill()

  // Nostril glow when blowing
  if (breath > 0.06) {
    const ng = ctx.createRadialGradient(headX+34, headY+8, 0, headX+34, headY+8, 16)
    ng.addColorStop(0, `rgba(255,120,0,${breath * 0.8})`)
    ng.addColorStop(1, 'rgba(255,60,0,0)')
    ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(headX+34, headY+8, 16, 0, Math.PI*2); ctx.fill()
  }
  // Nostril
  ctx.fillStyle = '#052e16'
  ctx.beginPath(); ctx.ellipse(headX+34, headY+8, 5, 3, 0.3, 0, Math.PI*2); ctx.fill()

  // Mouth line
  ctx.strokeStyle = '#052e16'; ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(headX+10, headY+10)
  ctx.quadraticCurveTo(headX+22, headY+16, headX+36, headY+12)
  ctx.stroke()

  // Teeth
  ctx.fillStyle = '#f8fafc'
  for (let ti = 0; ti < 3; ti++) {
    const tx = headX + 14 + ti * 8
    ctx.beginPath(); ctx.moveTo(tx-3, headY+11); ctx.lineTo(tx, headY+17); ctx.lineTo(tx+3, headY+11); ctx.fill()
  }

  // Eye
  const eyeX = headX + 10, eyeY = headY - 8
  // Eye white
  ctx.fillStyle = '#fef9c3'
  ctx.beginPath(); ctx.ellipse(eyeX, eyeY, 9, eyeBlink ? 1 : 8, 0, 0, Math.PI*2); ctx.fill()
  if (!eyeBlink) {
    // Iris
    ctx.fillStyle = '#d97706'
    ctx.beginPath(); ctx.arc(eyeX+1, eyeY, 5.5, 0, Math.PI*2); ctx.fill()
    // Pupil (slit)
    ctx.fillStyle = '#0c0c0c'
    ctx.beginPath(); ctx.ellipse(eyeX+1, eyeY, 2, 5, 0, 0, Math.PI*2); ctx.fill()
    // Eye shine
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(eyeX+3, eyeY-3, 2, 0, Math.PI*2); ctx.fill()
  }
  // Eye ridge
  ctx.fillStyle = '#166534'; ctx.strokeStyle = '#14532d'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.ellipse(eyeX, eyeY-7, 11, 5, 0.2, Math.PI, 0); ctx.fill(); ctx.stroke()

  // Horns
  const hornData = [
    { x: headX - 8, y: headY - 18, angle: -0.4, len: 28 },
    { x: headX + 4, y: headY - 20, angle: -0.2, len: 24 },
  ]
  hornData.forEach(h => {
    const hornGrd = ctx.createLinearGradient(h.x, h.y, h.x + Math.cos(h.angle)*h.len, h.y - h.len)
    hornGrd.addColorStop(0, '#92400e')
    hornGrd.addColorStop(1, '#d97706')
    ctx.fillStyle = hornGrd
    ctx.beginPath()
    ctx.moveTo(h.x - 6, h.y)
    ctx.lineTo(h.x + Math.cos(h.angle)*h.len, h.y - h.len)
    ctx.lineTo(h.x + 6, h.y)
    ctx.closePath(); ctx.fill()
  })

  // Ear frill
  ctx.fillStyle = 'rgba(239,68,68,0.7)'
  ctx.beginPath()
  ctx.moveTo(headX - 14, headY - 10)
  ctx.bezierCurveTo(headX-30, headY-30, headX-22, headY+5, headX-14, headY+8)
  ctx.closePath(); ctx.fill()
}
