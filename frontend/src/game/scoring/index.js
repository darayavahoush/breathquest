/**
 * Scoring system for BreathQuest
 * Persists best scores per level in localStorage
 */

const STORAGE_KEY = 'bq_scores_v1'

export const LEVEL_ORDER = ['pinwheel','float_rider','candle','balloon','dandelion','dragon']

export const DIFFICULTY = {
  pinwheel:    { label: 'Starter',   color: '#A8FF6F', stars: 1 },
  float_rider: { label: 'Easy',      color: '#60A5FA', stars: 1 },
  candle:      { label: 'Medium',    color: '#FAC775', stars: 2 },
  balloon:     { label: 'Medium',    color: '#F472B6', stars: 2 },
  dandelion:   { label: 'Hard',      color: '#F97316', stars: 3 },
  dragon:      { label: 'Expert',    color: '#EF4444', stars: 3 },
}

export function loadScores() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch { return {} }
}

export function saveScore(levelId, stars, extraData = {}) {
  const scores = loadScores()
  const prev   = scores[levelId] || { stars: 0, plays: 0 }
  scores[levelId] = {
    stars:     Math.max(prev.stars, stars),
    plays:     prev.plays + 1,
    lastPlayed: Date.now(),
    ...extraData,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores))
  return scores[levelId]
}

export function isUnlocked(levelId, scores) {
  const idx = LEVEL_ORDER.indexOf(levelId)
  if (idx === 0) return true                          // first always unlocked
  const prev = LEVEL_ORDER[idx - 1]
  return (scores[prev]?.stars || 0) >= 1             // need at least 1 star on prev
}

export function getGrade(totalStars, maxStars) {
  const pct = totalStars / maxStars
  if (pct >= 0.95) return { grade: 'S', color: '#FAC775', label: 'Legendary!' }
  if (pct >= 0.80) return { grade: 'A', color: '#A8FF6F', label: 'Amazing!' }
  if (pct >= 0.60) return { grade: 'B', color: '#60A5FA', label: 'Great job!' }
  if (pct >= 0.40) return { grade: 'C', color: '#F97316', label: 'Keep going!' }
  return { grade: 'D', color: '#9CA3AF', label: 'Practice more!' }
}

// Calculate stars based on performance metrics
export function calcStars(levelId, metrics) {
  const { timeSeconds, mistakes, progress, puffs, targetHits } = metrics

  switch (levelId) {
    case 'pinwheel':
      // Stars based on how fast you spin it
      if (timeSeconds < 12) return 3
      if (timeSeconds < 20) return 2
      return 1

    case 'float_rider':
      // Stars based on rings collected
      if (targetHits >= 4) return 3
      if (targetHits >= 2) return 2
      return 1

    case 'candle':
      // Stars based on speed and no mistakes
      if (mistakes === 0 && timeSeconds < 15) return 3
      if (mistakes <= 1 && timeSeconds < 25) return 2
      return 1

    case 'balloon':
      // Stars based on balloons popped cleanly
      if (targetHits >= 5 && mistakes === 0) return 3
      if (targetHits >= 4) return 2
      return 1

    case 'dandelion':
      // Stars based on seeds collected quickly
      if (progress >= 1 && timeSeconds < 18) return 3
      if (progress >= 1 && timeSeconds < 28) return 2
      return 1

    case 'dragon':
      // Stars based on gaps crossed without dying
      if (targetHits >= 5 && mistakes === 0) return 3
      if (targetHits >= 4) return 2
      return 1

    default:
      return progress >= 1 ? 2 : 1
  }
}
