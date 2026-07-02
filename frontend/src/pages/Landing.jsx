import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
         style={{ background: 'radial-gradient(ellipse at 50% 0%, #1D3A6A 0%, #12122A 60%)' }}>

      {/* Floating orbs */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-brand-green/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-64 h-64 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="text-center mb-16 animate-float">
        <div className="text-7xl mb-4">💨</div>
        <h1 className="font-display text-5xl font-black text-white mb-2">
          Breath<span className="text-brand-green">Quest</span>
        </h1>
        <p className="text-white/50 text-lg">A breath-training adventure for kids</p>
      </div>

      {/* Two portals */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">

        {/* Kid portal */}
        <button
          onClick={() => navigate('/play')}
          className="flex-1 group relative overflow-hidden rounded-3xl p-8 text-center
                     bg-gradient-to-br from-brand-amber/20 to-brand-coral/20
                     border-2 border-brand-amber/30 hover:border-brand-amber/60
                     transition-all duration-300 hover:scale-105 hover:shadow-2xl
                     hover:shadow-brand-amber/20"
        >
          <div className="text-6xl mb-3 group-hover:animate-bounce">🐥</div>
          <h2 className="font-display text-2xl font-bold text-brand-amber mb-1">I'm a Kid!</h2>
          <p className="text-white/50 text-sm">Play the game</p>
          <div className="absolute inset-0 bg-gradient-to-br from-brand-amber/5 to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Therapist portal */}
        <button
          onClick={() => navigate('/therapist/login')}
          className="flex-1 group relative overflow-hidden rounded-3xl p-8 text-center
                     bg-gradient-to-br from-brand-green/20 to-brand-teal/20
                     border-2 border-brand-green/30 hover:border-brand-green/60
                     transition-all duration-300 hover:scale-105 hover:shadow-2xl
                     hover:shadow-brand-green/20"
        >
          <div className="text-6xl mb-3 group-hover:animate-bounce">🩺</div>
          <h2 className="font-display text-2xl font-bold text-brand-green mb-1">Therapist</h2>
          <p className="text-white/50 text-sm">View dashboard</p>
          <div className="absolute inset-0 bg-gradient-to-br from-brand-green/5 to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      <p className="mt-12 text-white/20 text-xs">BreathQuest © 2025</p>
    </div>
  )
}
