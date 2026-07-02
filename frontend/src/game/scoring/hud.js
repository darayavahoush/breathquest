/**
 * GameHUD — draws on top of canvas, shows live stats
 * Used by GamePage to overlay HUD info
 */

export function drawHUD(ctx, W, H, {
  breathVal, levelName, emoji, color,
  timeSeconds, stars, maxStars = 3,
  score, scoreLabel, showCombo, combo,
}) {
  // Top bar background
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.beginPath(); ctx.roundRect(0, 0, W, 52, [0,0,16,16]); ctx.fill()

  // Emoji + level name (left)
  ctx.font = '700 15px Nunito, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText(`${emoji}  ${levelName}`, 16, 26)

  // Timer (center)
  const mins = Math.floor(timeSeconds / 60)
  const secs = Math.floor(timeSeconds % 60).toString().padStart(2,'0')
  ctx.textAlign = 'center'
  ctx.fillStyle = timeSeconds > 60 ? '#FAC775' : 'rgba(255,255,255,0.6)'
  ctx.fillText(`⏱ ${mins}:${secs}`, W/2, 26)

  // Stars preview (right of center)
  ctx.textAlign = 'center'
  for (let i = 0; i < maxStars; i++) {
    ctx.fillStyle = i < stars ? '#FAC775' : 'rgba(255,255,255,0.15)'
    ctx.font = '16px sans-serif'
    ctx.fillText('★', W/2 + 60 + i * 22, 27)
  }

  // Breath bar (right side)
  const bx = W - 120, by = 18, bw = 100, bh = 14
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 7); ctx.fill()
  if (breathVal > 0) {
    const grd = ctx.createLinearGradient(bx, 0, bx + bw, 0)
    grd.addColorStop(0, '#A8FF6F')
    grd.addColorStop(1, color)
    ctx.fillStyle = grd
    ctx.beginPath(); ctx.roundRect(bx, by, bw * Math.min(1, breathVal), bh, 7); ctx.fill()
    if (breathVal > 0.3) {
      ctx.shadowColor = color; ctx.shadowBlur = 8
      ctx.fillStyle = grd
      ctx.beginPath(); ctx.roundRect(bx, by, bw * Math.min(1, breathVal), bh, 7); ctx.fill()
      ctx.shadowBlur = 0
    }
  }
  ctx.font = '700 10px Nunito, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
  ctx.fillText('💨', bx - 6, by + bh/2)

  // Score label (bottom right)
  if (scoreLabel) {
    ctx.font = '700 13px Nunito, sans-serif'
    ctx.fillStyle = color
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText(scoreLabel, W - 12, H - 10)
  }

  // Combo
  if (showCombo && combo > 1) {
    ctx.font = `700 ${14 + Math.min(combo, 8)}px Nunito, sans-serif`
    ctx.fillStyle = '#FAC775'
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
    ctx.shadowColor = '#FAC775'; ctx.shadowBlur = 10
    ctx.fillText(`${combo}x COMBO! 🔥`, 14, H - 10)
    ctx.shadowBlur = 0
  }
}

// Animated star burst on completion
export function drawStarBurst(ctx, W, H, stars, t) {
  const cx = W/2, cy = H/2 - 30
  const starPositions = [
    { x: cx, y: cy - 10, delay: 0 },
    { x: cx - 55, y: cy + 30, delay: 0.15 },
    { x: cx + 55, y: cy + 30, delay: 0.3 },
  ]
  starPositions.forEach((pos, i) => {
    if (i >= stars) return
    const age  = Math.max(0, t - pos.delay)
    const scale = Math.min(1, age * 4)
    const wobble = Math.sin(t * 4 + i) * 3
    ctx.save()
    ctx.translate(pos.x + wobble, pos.y)
    ctx.scale(scale, scale)
    ctx.font = '52px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.shadowColor = '#FAC775'; ctx.shadowBlur = 20
    ctx.fillText('★', 0, 0)
    ctx.shadowBlur = 0
    ctx.restore()
  })
}
