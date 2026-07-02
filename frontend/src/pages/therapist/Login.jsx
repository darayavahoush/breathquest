import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button, Input, Card } from '../../components/ui'

export default function TherapistLogin() {
  const [mode, setMode]     = useState('login')   // 'login' | 'register'
  const [form, setForm]     = useState({ email: '', password: '', full_name: '', clinic_name: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const { loginTherapist, registerTherapist } = useAuth()
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await loginTherapist(form.email, form.password)
      } else {
        await registerTherapist(form)
      }
      navigate('/therapist/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a3a2a 0%, #12122A 60%)' }}>

      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white/70
                                transition-colors mb-8 text-sm">
          ← Back
        </Link>

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🩺</div>
          <h1 className="font-display text-3xl font-bold text-white">Therapist Portal</h1>
          <p className="text-white/40 mt-1">BreathQuest dashboard</p>
        </div>

        <Card>
          {/* Toggle */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
                  ${mode === m ? 'bg-brand-green text-brand-dark' : 'text-white/50 hover:text-white'}`}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <>
                <Input label="Full Name" placeholder="Dr. Jane Smith"
                       value={form.full_name} onChange={set('full_name')} required />
                <Input label="Clinic Name (optional)" placeholder="Happy Kids Clinic"
                       value={form.clinic_name} onChange={set('clinic_name')} />
              </>
            )}
            <Input label="Email" type="email" placeholder="you@clinic.com"
                   value={form.email} onChange={set('email')} required />
            <Input label="Password" type="password" placeholder="••••••••"
                   value={form.password} onChange={set('password')} required />

            {error && (
              <div className="bg-brand-coral/10 border border-brand-coral/30 rounded-xl px-4 py-3
                              text-brand-coral text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
