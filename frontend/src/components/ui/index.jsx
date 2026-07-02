// Shared UI primitives

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-brand-green text-brand-dark hover:bg-opacity-90',
    ghost:   'border border-white/20 text-white hover:bg-white/10',
    danger:  'bg-brand-coral text-white hover:bg-opacity-90',
    teal:    'bg-brand-teal text-white hover:bg-opacity-90',
  }
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-brand-card border border-white/10 rounded-2xl p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-white/70">{label}</label>}
      <input
        className={`w-full bg-white/5 border ${error ? 'border-brand-coral' : 'border-white/15'}
          rounded-xl px-4 py-3 text-white placeholder-white/30
          focus:outline-none focus:border-brand-green transition-colors ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-brand-coral">{error}</span>}
    </div>
  )
}

export function Badge({ children, color = 'green' }) {
  const colors = {
    green:  'bg-brand-green/20 text-brand-green',
    amber:  'bg-brand-amber/20 text-brand-amber',
    coral:  'bg-brand-coral/20 text-brand-coral',
    purple: 'bg-brand-purple/20 text-purple-300',
    gray:   'bg-white/10 text-white/60',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  )
}

export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={`${sizes[size]} border-2 border-white/20 border-t-brand-green rounded-full animate-spin`} />
  )
}

export function StarRating({ stars = 0, max = 3, size = 'md' }) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' }
  return (
    <span className={sizes[size]}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < stars ? 'text-brand-amber' : 'text-white/20'}>★</span>
      ))}
    </span>
  )
}

export function Avatar({ avatar = 'chick', size = 'md', name = '' }) {
  const AVATARS = {
    chick:  { emoji: '🐥', bg: 'from-yellow-400 to-orange-400' },
    dragon: { emoji: '🐉', bg: 'from-green-500 to-teal-500' },
    cloud:  { emoji: '☁️',  bg: 'from-blue-400 to-indigo-400' },
    star:   { emoji: '⭐', bg: 'from-yellow-300 to-amber-400' },
    rocket: { emoji: '🚀', bg: 'from-purple-500 to-pink-500' },
    fish:   { emoji: '🐠', bg: 'from-cyan-400 to-blue-500' },
  }
  const sizes = {
    sm:  'w-8 h-8 text-base',
    md:  'w-12 h-12 text-2xl',
    lg:  'w-16 h-16 text-3xl',
    xl:  'w-24 h-24 text-5xl',
  }
  const av = AVATARS[avatar] || AVATARS.chick
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${av.bg}
      flex items-center justify-center flex-shrink-0`}
      title={name}>
      {av.emoji}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-white/50 text-sm">Loading…</p>
      </div>
    </div>
  )
}
