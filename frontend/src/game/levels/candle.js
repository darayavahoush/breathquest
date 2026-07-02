import { drawText, ParticleSystem, rand, clamp } from '../engine/render.js'

const N = 5

// Candle colors
const CANDLE_COLS = ['#E24B4A', '#FAC775', '#A8FF6F', '#60A5FA', '#C084FC']

export function createCandleLevel() {
  const candles  = Array.from({ length: N }, () => ({ lit: true }))
  let current    = 0
  let puffCd     = 0
  let wobbleT    = 0
  let t          = 0
  let done       = false
  let doneTimer  = 0
  const ps       = new ParticleSystem()
  const confetti = []

  function spawnConfetti(cx, cy) {
    const cols = ['#E24B4A','#FAC775','#A8FF6F','#60A5FA','#C084FC','#F97316']
    for (let i = 0; i < 32; i++) {
      confetti.push({
        x: cx, y: cy,
        vx: rand(-130, 130), vy: rand(-200, -70),
        rot: rand(0, 360), rotSpd: rand(-220, 220),
        size: rand(5, 12), col: cols[i % cols.length],
        life: rand(0.9, 1.6), maxLife: 1.6,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      })
    }
  }

  return {
    id: 'candle',
    update(breath, dt) {
      t += dt; wobbleT += dt * 6
      puffCd = Math.max(0, puffCd - dt)

      for (const c of confetti) {
        c.x += c.vx * dt; c.y += c.vy * dt
        c.vy += 240 * dt; c.rot += c.rotSpd * dt; c.life -= dt
      }
      confetti.splice(0, confetti.length, ...confetti.filter(c => c.life > 0))
      ps.update(dt)

      if (current >= N) {
        doneTimer += dt
        if (doneTimer > 0.8 && !done) done = true
        return done ? { stars: 3, message: 'All candles out! Make a wish! 🎂' } : null
      }

      if (breath >= 0.18 && puffCd <= 0 && candles[current]?.lit) {
        candles[current].lit = false
        puffCd = 0.9
        const { cx, flameY } = candleGeom(current)
        ps.emit(cx, flameY, {
          count: 22, color: '#FAC775', speed: 95, life: 0.9,
          size: 7, spread: Math.PI * 2, gravity: -20,
        })
        ps.emit(cx, flameY, {
          count: 12, color: '#F97316', speed: 55, life: 0.6,
          size: 5, spread: Math.PI * 2, gravity: 0,
        })
        spawnConfetti(cx, flameY)
        current++
      }
      return null
    },

    draw(ctx, W, H, breath) {
      // ── Background: warm party room ──
      const bgGrd = ctx.createLinearGradient(0, 0, 0, H)
      bgGrd.addColorStop(0, '#1a0a2e')
      bgGrd.addColorStop(1, '#2d1045')
      ctx.fillStyle = bgGrd; ctx.fillRect(0, 0, W, H)

      // Bokeh dots in background
      for (let i = 0; i < 18; i++) {
        const bx = (i * 137 + 40) % W
        const by = (i * 89 + 30) % (H * 0.6)
        const br = 4 + (i * 31) % 8
        const ba = 0.06 + 0.06 * Math.abs(Math.sin(t * 0.6 + i))
        const bc = CANDLE_COLS[i % CANDLE_COLS.length]
        ctx.fillStyle = bc + Math.round(ba * 255).toString(16).padStart(2,'0')
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2); ctx.fill()
      }

      // Hanging bunting / string lights across top
      const bulbCols = ['#E24B4A','#FAC775','#A8FF6F','#60A5FA','#C084FC']
      for (let i = 0; i < 9; i++) {
        const x1 = (i / 8) * W
        const x2 = ((i + 1) / 8) * W
        const mid = { x: (x1 + x2) / 2, y: 38 + Math.sin(i * 1.4) * 10 }
        ctx.strokeStyle = 'rgba(255,220,100,0.35)'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(x1, 12); ctx.quadraticCurveTo(mid.x, mid.y + 16, x2, 12); ctx.stroke()
        // Bulb
        const bc = bulbCols[i % bulbCols.length]
        ctx.fillStyle = bc
        ctx.beginPath(); ctx.ellipse(mid.x, mid.y + 22, 8, 11, 0, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.beginPath(); ctx.ellipse(mid.x - 2, mid.y + 18, 3, 4, -0.3, 0, Math.PI*2); ctx.fill()
        // Glow
        const bg = ctx.createRadialGradient(mid.x, mid.y+22, 0, mid.x, mid.y+22, 22)
        bg.addColorStop(0, bc + '44'); bg.addColorStop(1, 'transparent')
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(mid.x, mid.y+22, 22, 0, Math.PI*2); ctx.fill()
        // Cap
        ctx.fillStyle = '#666'; ctx.fillRect(mid.x - 4, mid.y + 10, 8, 5)
      }

      // Streamers
      for (let i = 0; i < 6; i++) {
        const sx = (i / 5) * W
        ctx.strokeStyle = CANDLE_COLS[i % CANDLE_COLS.length] + '88'
        ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.moveTo(sx, 0)
        for (let y = 0; y < 130; y += 8) {
          ctx.lineTo(sx + Math.sin(t * 1.2 + i * 1.1 + y * 0.08) * 14, y)
        }
        ctx.stroke()
      }

      // ── Table ──
      const tableY = H - 100
      ctx.fillStyle = '#4a2810'
      ctx.beginPath(); ctx.roundRect(40, tableY, W - 80, H - tableY, [6,6,0,0]); ctx.fill()
      ctx.fillStyle = '#6b3a1e'
      ctx.beginPath(); ctx.roundRect(40, tableY, W - 80, 14, [6,6,0,0]); ctx.fill()
      // Tablecloth
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      for (let x = 60; x < W - 60; x += 28) {
        ctx.fillRect(x, tableY, 14, H - tableY)
      }

      // ── CAKE ──
      // Layout: bottom tier sits on table, top tier sits on bottom tier
      const cakeW1  = 340   // bottom tier width
      const cakeW2  = 220   // top tier width
      const cakeH1  = 70    // bottom tier height
      const cakeH2  = 58    // top tier height
      const cakeCX  = W / 2

      // Bottom tier top Y
      const tier1Top = tableY - cakeH1
      // Top tier top Y
      const tier2Top = tier1Top - cakeH2

      // ----- Bottom tier -----
      // Side face (3D effect)
      ctx.fillStyle = '#991b1b'
      ctx.beginPath()
      ctx.roundRect(cakeCX - cakeW1/2, tier1Top + 6, cakeW1, cakeH1, [0,0,8,8]); ctx.fill()
      // Front face
      const t1Grd = ctx.createLinearGradient(cakeCX - cakeW1/2, tier1Top, cakeCX + cakeW1/2, tier1Top)
      t1Grd.addColorStop(0, '#b91c1c')
      t1Grd.addColorStop(0.1, '#ef4444')
      t1Grd.addColorStop(0.9, '#ef4444')
      t1Grd.addColorStop(1, '#b91c1c')
      ctx.fillStyle = t1Grd
      ctx.beginPath(); ctx.roundRect(cakeCX - cakeW1/2, tier1Top, cakeW1, cakeH1, [0,0,8,8]); ctx.fill()

      // Bottom tier frosting top
      ctx.fillStyle = '#fefce8'
      ctx.beginPath(); ctx.roundRect(cakeCX - cakeW1/2, tier1Top - 6, cakeW1, 18, 5); ctx.fill()
      // Frosting drips
      for (let i = 0; i < 11; i++) {
        const dx = cakeCX - cakeW1/2 + 16 + i * 31
        const dh = 14 + Math.sin(i * 1.9 + 1) * 10
        ctx.fillStyle = '#fefce8'
        ctx.beginPath()
        ctx.moveTo(dx - 8, tier1Top + 10)
        ctx.quadraticCurveTo(dx, tier1Top + 10 + dh + 6, dx + 8, tier1Top + 10)
        ctx.fill()
      }

      // Bottom tier decorations: colored circles
      const decCols = ['#fbbf24','#f472b6','#34d399','#60a5fa','#a78bfa']
      for (let i = 0; i < 8; i++) {
        const dx = cakeCX - cakeW1/2 + 28 + i * 40
        const dy = tier1Top + 44
        ctx.fillStyle = decCols[i % decCols.length]
        ctx.beginPath(); ctx.arc(dx, dy, 9, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.beginPath(); ctx.arc(dx - 2, dy - 3, 3, 0, Math.PI*2); ctx.fill()
      }

      // "Happy Birthday" on bottom tier
      drawText(ctx, '🎂  Happy Birthday!', cakeCX, tier1Top + cakeH1/2 + 10,
               { size: 15, bold: true, color: 'rgba(255,255,255,0.95)', shadow: true })

      // ----- Top tier -----
      ctx.fillStyle = '#6b21a8'
      ctx.beginPath(); ctx.roundRect(cakeCX - cakeW2/2, tier2Top + 6, cakeW2, cakeH2, [0,0,6,6]); ctx.fill()
      const t2Grd = ctx.createLinearGradient(cakeCX - cakeW2/2, tier2Top, cakeCX + cakeW2/2, tier2Top)
      t2Grd.addColorStop(0, '#7e22ce')
      t2Grd.addColorStop(0.15, '#a855f7')
      t2Grd.addColorStop(0.85, '#a855f7')
      t2Grd.addColorStop(1, '#7e22ce')
      ctx.fillStyle = t2Grd
      ctx.beginPath(); ctx.roundRect(cakeCX - cakeW2/2, tier2Top, cakeW2, cakeH2, [0,0,6,6]); ctx.fill()

      // Top tier frosting
      ctx.fillStyle = '#fefce8'
      ctx.beginPath(); ctx.roundRect(cakeCX - cakeW2/2, tier2Top - 6, cakeW2, 18, 5); ctx.fill()
      for (let i = 0; i < 6; i++) {
        const dx = cakeCX - cakeW2/2 + 18 + i * 36
        const dh = 12 + Math.sin(i * 2.3) * 8
        ctx.fillStyle = '#fefce8'
        ctx.beginPath()
        ctx.moveTo(dx - 7, tier2Top + 10)
        ctx.quadraticCurveTo(dx, tier2Top + 10 + dh + 5, dx + 7, tier2Top + 10)
        ctx.fill()
      }

      // Stars on top tier
      for (let i = 0; i < 3; i++) {
        const sx = cakeCX - 44 + i * 44
        drawText(ctx, '✨', sx, tier2Top + cakeH2/2 + 4, { size: 18 })
      }

      // ── CANDLES — sitting ON TOP of the cake ──
      // Candle bases sit at tier2Top (the very top frosting surface)
      const CANDLE_BASE_Y = tier2Top - 6   // frosting surface
      const CANDLE_H      = 52
      const CANDLE_W      = 14

      for (let i = 0; i < N; i++) {
        const { cx } = candleGeom(i, W, CANDLE_BASE_Y, CANDLE_H)

        // Candle body — sits ON the cake top
        const col = CANDLE_COLS[i]
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)'
        ctx.beginPath(); ctx.ellipse(cx, CANDLE_BASE_Y, CANDLE_W/2 + 2, 4, 0, 0, Math.PI*2); ctx.fill()

        // Body
        const cGrd = ctx.createLinearGradient(cx - CANDLE_W/2, 0, cx + CANDLE_W/2, 0)
        cGrd.addColorStop(0, darken(col, 30))
        cGrd.addColorStop(0.3, col)
        cGrd.addColorStop(0.7, col)
        cGrd.addColorStop(1, darken(col, 30))
        ctx.fillStyle = cGrd
        ctx.beginPath()
        ctx.roundRect(cx - CANDLE_W/2, CANDLE_BASE_Y - CANDLE_H, CANDLE_W, CANDLE_H, [4,4,2,2])
        ctx.fill()

        // Stripes
        ctx.fillStyle = 'rgba(255,255,255,0.22)'
        for (let s = 0; s < 5; s++) {
          ctx.fillRect(cx - CANDLE_W/2, CANDLE_BASE_Y - CANDLE_H + 6 + s * 10, CANDLE_W, 5)
        }

        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.fillRect(cx - CANDLE_W/2 + 2, CANDLE_BASE_Y - CANDLE_H + 2, 4, CANDLE_H - 4)

        // Wax pool at base
        ctx.fillStyle = lighten(col, 40) + 'aa'
        ctx.beginPath(); ctx.ellipse(cx, CANDLE_BASE_Y - 2, CANDLE_W/2 + 3, 5, 0, 0, Math.PI*2); ctx.fill()

        // Wick
        ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.moveTo(cx + 1, CANDLE_BASE_Y - CANDLE_H)
        ctx.quadraticCurveTo(cx + 3, CANDLE_BASE_Y - CANDLE_H - 7, cx + 2, CANDLE_BASE_Y - CANDLE_H - 12)
        ctx.stroke()

        const wickTip = { x: cx + 2, y: CANDLE_BASE_Y - CANDLE_H - 12 }

        if (candles[i].lit) {
          const wb = Math.sin(wobbleT + i * 1.3) * 3 + breath * 5

          // Outer glow
          const grd = ctx.createRadialGradient(wickTip.x + wb, wickTip.y - 14, 0,
                                               wickTip.x + wb, wickTip.y - 10, 28)
          grd.addColorStop(0, 'rgba(255,220,100,0.45)')
          grd.addColorStop(0.5, 'rgba(255,140,30,0.2)')
          grd.addColorStop(1, 'rgba(255,80,0,0)')
          ctx.fillStyle = grd
          ctx.beginPath(); ctx.arc(wickTip.x + wb, wickTip.y - 14, 28, 0, Math.PI*2); ctx.fill()

          // Outer flame
          ctx.fillStyle = '#F97316'
          ctx.beginPath()
          ctx.moveTo(wickTip.x + wb - 8, wickTip.y)
          ctx.bezierCurveTo(wickTip.x + wb - 12, wickTip.y - 16,
                            wickTip.x + wb + 10, wickTip.y - 20,
                            wickTip.x + wb,       wickTip.y - 34)
          ctx.bezierCurveTo(wickTip.x + wb - 10, wickTip.y - 20,
                            wickTip.x + wb + 12, wickTip.y - 16,
                            wickTip.x + wb + 8,  wickTip.y)
          ctx.closePath(); ctx.fill()

          // Mid flame
          ctx.fillStyle = '#FAC775'
          ctx.beginPath()
          ctx.moveTo(wickTip.x + wb - 5, wickTip.y)
          ctx.bezierCurveTo(wickTip.x + wb - 7, wickTip.y - 12,
                            wickTip.x + wb + 7, wickTip.y - 16,
                            wickTip.x + wb,      wickTip.y - 26)
          ctx.bezierCurveTo(wickTip.x + wb - 7, wickTip.y - 16,
                            wickTip.x + wb + 7, wickTip.y - 12,
                            wickTip.x + wb + 5,  wickTip.y)
          ctx.closePath(); ctx.fill()

          // Inner core
          ctx.fillStyle = '#fffde7'
          ctx.beginPath(); ctx.ellipse(wickTip.x + wb, wickTip.y - 14, 3, 7, 0, 0, Math.PI*2); ctx.fill()

        } else {
          // Smoke wisps
          for (let s = 0; s < 4; s++) {
            const age   = ((t * 22 + s * 22) % 88)
            const alpha = Math.max(0, (1 - age/88) * 0.45)
            const swx   = wickTip.x + Math.sin(t * 2.5 + s * 1.8) * (s * 3 + 2)
            ctx.fillStyle = `rgba(210,210,230,${alpha})`
            ctx.beginPath(); ctx.arc(swx, wickTip.y - age * 0.7, 3 + s * 1.5, 0, Math.PI*2); ctx.fill()
          }
        }
      }

      // Confetti
      for (const c of confetti) {
        const a = clamp(c.life / c.maxLife, 0, 1)
        ctx.globalAlpha = a; ctx.fillStyle = c.col
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot * Math.PI/180)
        if (c.shape === 'rect') ctx.fillRect(-c.size/2, -c.size/4, c.size, c.size/2)
        else { ctx.beginPath(); ctx.arc(0, 0, c.size/2, 0, Math.PI*2); ctx.fill() }
        ctx.restore(); ctx.globalAlpha = 1
      }
      ps.draw(ctx)

      // Candle glow on room
      for (let i = current; i < N; i++) {
        const { cx } = candleGeom(i, W, CANDLE_BASE_Y, CANDLE_H)
        const g = ctx.createRadialGradient(cx, CANDLE_BASE_Y - CANDLE_H - 20, 0, cx, CANDLE_BASE_Y - CANDLE_H - 20, 120)
        g.addColorStop(0, 'rgba(255,180,60,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
      }

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.beginPath(); ctx.roundRect(W/2 - 220, 58, 440, 44, 10); ctx.fill()
      if (current < N) {
        drawText(ctx, `💨  Puff to blow each candle out!   ${N - current} to go`,
                 W/2, 80, { size: 16, bold: true, color: '#FAC775' })
      } else {
        drawText(ctx, '🎉  All out! Make a wish! 🌟', W/2, 80,
                 { size: 18, bold: true, color: '#FAC775', shadow: true })
      }
    }
  }
}

function candleGeom(i, W = 800, baseY = 300, candleH = 52) {
  const spacing = 240 / (N - 1)
  const cx = Math.round(W/2 - 120 + i * spacing)
  return { cx, flameY: baseY - candleH - 20 }
}

function darken(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, (n>>16) - amt)
  const g = Math.max(0, ((n>>8)&0xff) - amt)
  const b = Math.max(0, (n&0xff) - amt)
  return `rgb(${r},${g},${b})`
}
function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, (n>>16) + amt)
  const g = Math.min(255, ((n>>8)&0xff) + amt)
  const b = Math.min(255, (n&0xff) + amt)
  return `rgb(${r},${g},${b})`
}
