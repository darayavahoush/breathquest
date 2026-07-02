import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { dashboardAPI, patientsAPI } from '../../api/client'
import { Button, Card, Badge, Avatar, StarRating, Spinner, PageLoader } from '../../components/ui'
import AddPatientModal from '../../components/therapist/AddPatientModal'

export default function TherapistDashboard() {
  const { therapist, logout } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [search,  setSearch]        = useState('')

  const load = async () => {
    try {
      const { data } = await dashboardAPI.summary()
      setSummary(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <PageLoader />

  const patients = (summary?.patients || []).filter(p =>
    p.first_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Top nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-brand-dark/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💨</span>
          <span className="font-display text-xl font-bold text-white">
            Breath<span className="text-brand-green">Quest</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/50 text-sm">{therapist?.full_name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-white/40 mt-1">Welcome back, {therapist?.full_name?.split(' ')[0]}</p>
          </div>
          <Button onClick={() => setShowAdd(true)}>+ Add Patient</Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Patients',    value: summary?.total_patients    ?? 0, icon: '👥', color: 'text-brand-green' },
            { label: 'Active Patients',   value: summary?.active_patients   ?? 0, icon: '✅', color: 'text-brand-teal' },
            { label: 'Sessions This Week',value: summary?.sessions_this_week ?? 0, icon: '🎮', color: 'text-brand-amber' },
            { label: 'Avg Stars / Session',value: summary?.avg_stars_this_week != null
                ? `${summary.avg_stars_this_week.toFixed(1)} ★` : '—',           icon: '⭐', color: 'text-yellow-400' },
          ].map(({ label, value, icon, color }) => (
            <Card key={label} className="flex flex-col gap-1">
              <span className="text-2xl">{icon}</span>
              <span className={`text-2xl font-bold font-display ${color}`}>{value}</span>
              <span className="text-white/40 text-xs">{label}</span>
            </Card>
          ))}
        </div>

        {/* Patient list */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Patients</h2>
          <input
            className="input w-64 py-2 text-sm"
            placeholder="Search patients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {patients.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-5xl mb-4">🌱</div>
            <p className="text-white/50">No patients yet — add your first one!</p>
            <Button className="mt-4" onClick={() => setShowAdd(true)}>Add Patient</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map(p => (
              <PatientCard key={p.id} patient={p}
                           onClick={() => navigate(`/therapist/patients/${p.id}`)} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddPatientModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}

function PatientCard({ patient, onClick }) {
  const starsColor = patient.total_stars >= 12 ? 'green'
                   : patient.total_stars >= 6  ? 'amber'
                   : 'gray'
  return (
    <button onClick={onClick}
      className="card text-left hover:border-brand-green/40 hover:bg-brand-green/5
                 transition-all duration-200 hover:scale-[1.02] group w-full">
      <div className="flex items-center gap-3 mb-4">
        <Avatar avatar={patient.avatar} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{patient.first_name}</p>
          {patient.age && <p className="text-white/40 text-xs">Age {patient.age}</p>}
        </div>
        <Badge color={patient.is_active ? 'green' : 'gray'}>
          {patient.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-brand-amber">{patient.total_sessions}</p>
          <p className="text-white/30 text-xs">sessions</p>
        </div>
        <div>
          <p className="text-lg font-bold text-yellow-400">{patient.total_stars}</p>
          <p className="text-white/30 text-xs">stars</p>
        </div>
        <div>
          <p className="text-lg font-bold text-brand-green">
            {patient.last_session_at
              ? new Date(patient.last_session_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })
              : '—'}
          </p>
          <p className="text-white/30 text-xs">last session</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-white/30 text-xs">View progress</span>
        <span className="text-brand-green text-xs group-hover:translate-x-1 transition-transform">→</span>
      </div>
    </button>
  )
}
