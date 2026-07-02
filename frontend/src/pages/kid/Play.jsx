import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui'

const AVATARS = ['chick', 'dragon', 'cloud', 'star', 'rocket', 'fish']
const AVATAR_EMOJIS = { chick:'🐥', dragon:'🐉', cloud:'☁️', star:'⭐', rocket:'🚀', fish:'🐠' }
const AVATAR_NAMES  = { chick:'Chicky', dragon:'Dino', cloud:'Cloudy', star:'Starry', rocket:'Zoom', fish:'Finley' }

export default function KidPlay() {
  const [mode, setMode]         = useState('choose')   // choose | register | login
  const [avatar, setAvatar]     = useState('chick')
  const [firstName, setFirstName] = useState('')
  const [playerCode, setPlayerCode] = useState('')
  const [pin, setPin]           = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [registered, setRegistered] = useState(null)  // {player_code, first_name}
  const { loginKid, registerKid } = useAuth()
  const navigate = useNavigate()

  const handlePin = (digit) => { if (pin.length < 4) setPin(p => p + digit) }
  const deletePin = () => setPin(p => p.slice(0, -1))

  const handleRegister = async () => {
    if (!firstName.trim()) { setError('What should we call you?'); return }
    if (pin.length < 4)    { setError('Choose a 4-digit PIN'); return }
    setError(''); setLoading(true)
    try {
      const data = await registerKid(firstName.trim(), avatar, pin)
      setRegistered({ player_code: data.player_code, first_name: data.first_name })
    } catch (e) {
      setError(e.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!playerCode.trim()) { setError('Enter your player code'); return }
    if (pin.length < 4)     { setError('Enter your PIN'); return }
    setError(''); setLoading(true)
    try {
      await loginKid(playerCode.trim().toUpperCase(), pin)
      navigate('/play/levels')
    } catch {
      setError('Wrong code or PIN — try again!')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  // ---- Show player code after register ----
  if (registered) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
           style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a3a2a 0%, #12122A 60%)' }}>
        <div className="text-7xl mb-4 animate-bounce">{AVATAR_EMOJIS[avatar]}</div>
        <h1 className="font-display text-4xl font-black text-white mb-2">You're in! 🎉</h1>
        <p className="text-white/50 mb-8">Write this down so you can log back in:</p>
        <div className="bg-brand-card border-2 border-brand-green rounded-2xl p-8 mb-6 w-full max-w-xs">
          <p className="text-white/40 text-sm mb-1">Your Player Code</p>
          <p className="font-display text-4xl font-black text-brand-green tracking-widest mb-4">
            {registered.player_code}
          </p>
          <p className="text-white/40 text-sm mb-1">Your PIN</p>
          <p className="font-display text-3xl font-bold text-brand-amber tracking-widest">
            {'•'.repeat(pin.length)}
          </p>
        </div>
        <p className="text-white/30 text-xs mb-8">Show this to your therapist too!</p>
        <Button size="lg" onClick={() => navigate('/play/levels')}>Let's Play! 🚀</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
         style={{ background: 'radial-gradient(ellipse at 50% 0%, #2a1a4a 0%, #12122A 60%)' }}>
      <Link to="/" className="absolute top-6 left-6 text-white/30 hover:text-white/60 text-sm">← Back</Link>

      {/* Mode chooser */}
      {mode === 'choose' && (
        <div className="text-center w-full max-w-sm">
          <div className="text-7xl mb-4 animate-float">🎮</div>
          <h1 className="font-display text-4xl font-black text-white mb-2">BreathQuest</h1>
          <p className="text-white/40 mb-10">Ready to play?</p>
          <div className="flex flex-col gap-4">
            <button onClick={() => setMode('register')}
              className="p-6 rounded-2xl bg-gradient-to-br from-brand-amber/20 to-brand-coral/20
                         border-2 border-brand-amber/40 hover:border-brand-amber
                         transition-all hover:scale-105 text-left">
              <div className="text-3xl mb-2">✨</div>
              <p className="font-display text-xl font-bold text-white">New Player</p>
              <p className="text-white/40 text-sm">Create your account</p>
            </button>
            <button onClick={() => setMode('login')}
              className="p-6 rounded-2xl bg-gradient-to-br from-brand-green/20 to-brand-teal/20
                         border-2 border-brand-green/40 hover:border-brand-green
                         transition-all hover:scale-105 text-left">
              <div className="text-3xl mb-2">🔑</div>
              <p className="font-display text-xl font-bold text-white">I have a code</p>
              <p className="text-white/40 text-sm">Log back in</p>
            </button>
          </div>
        </div>
      )}

      {/* Register */}
      {mode === 'register' && (
        <div className="w-full max-w-sm">
          <button onClick={() => { setMode('choose'); setPin(''); setError('') }}
                  className="text-white/30 hover:text-white/60 text-sm mb-6 transition-colors">← Back</button>
          <h1 className="font-display text-3xl font-black text-white mb-6 text-center">Create Account</h1>

          {/* Name */}
          <div className="mb-4">
            <label className="text-sm text-white/50 block mb-1">Your first name</label>
            <input className="input text-lg" placeholder="e.g. Alex"
                   value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>

          {/* Avatar */}
          <label className="text-sm text-white/50 block mb-2">Pick your character</label>
          <div className="grid grid-cols-6 gap-2 mb-6">
            {AVATARS.map(av => (
              <button key={av} onClick={() => setAvatar(av)}
                className={`h-12 rounded-xl text-2xl transition-all border-2
                  ${avatar === av ? 'border-brand-green bg-brand-green/20 scale-110' : 'border-white/10 bg-white/5'}`}>
                {AVATAR_EMOJIS[av]}
              </button>
            ))}
          </div>

          {/* PIN */}
          <label className="text-sm text-white/50 block mb-2">Choose a 4-digit PIN</label>
          <div className="flex justify-center gap-3 mb-4">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all
                ${pin.length > i ? 'bg-brand-green border-brand-green' : 'border-white/30'}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d,i) => (
              <button key={i}
                onClick={() => d === '⌫' ? deletePin() : d !== '' ? handlePin(String(d)) : null}
                disabled={d === ''}
                className={`h-14 rounded-xl font-display text-xl font-bold transition-all active:scale-95
                  ${d==='' ? 'invisible' : d==='⌫' ? 'bg-white/5 text-white/50 hover:bg-white/10'
                    : 'bg-white/10 text-white hover:bg-brand-green/20 hover:text-brand-green'}`}>
                {d}
              </button>
            ))}
          </div>

          {error && <p className="text-brand-coral text-sm text-center mb-3">{error}</p>}
          <Button className="w-full" size="lg" onClick={handleRegister} disabled={loading}>
            {loading ? 'Creating…' : 'Create Account! 🎉'}
          </Button>
        </div>
      )}

      {/* Login */}
      {mode === 'login' && (
        <div className="w-full max-w-sm">
          <button onClick={() => { setMode('choose'); setPin(''); setError('') }}
                  className="text-white/30 hover:text-white/60 text-sm mb-6 transition-colors">← Back</button>
          <h1 className="font-display text-3xl font-black text-white mb-6 text-center">Welcome Back!</h1>

          <div className="mb-4">
            <label className="text-sm text-white/50 block mb-1">Your Player Code</label>
            <input className="input text-center text-xl font-bold tracking-widest uppercase"
                   placeholder="e.g. CHICK42"
                   value={playerCode} onChange={e => setPlayerCode(e.target.value.toUpperCase())} />
          </div>

          <label className="text-sm text-white/50 block mb-2">Your PIN</label>
          <div className="flex justify-center gap-3 mb-4">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all
                ${pin.length > i ? 'bg-brand-green border-brand-green' : 'border-white/30'}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d,i) => (
              <button key={i}
                onClick={() => d === '⌫' ? deletePin() : d !== '' ? handlePin(String(d)) : null}
                disabled={d === ''}
                className={`h-14 rounded-xl font-display text-xl font-bold transition-all active:scale-95
                  ${d==='' ? 'invisible' : d==='⌫' ? 'bg-white/5 text-white/50 hover:bg-white/10'
                    : 'bg-white/10 text-white hover:bg-brand-green/20 hover:text-brand-green'}`}>
                {d}
              </button>
            ))}
          </div>

          {error && <p className="text-brand-coral text-sm text-center mb-3">{error}</p>}
          <Button className="w-full" size="lg" onClick={handleLogin} disabled={loading}>
            {loading ? 'Checking…' : "Let's Play! 🚀"}
          </Button>
        </div>
      )}
    </div>
  )
}
