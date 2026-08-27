import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Mail, Lock, User, ArrowRight, Loader } from 'lucide-react'
import { signIn, signUp } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

export default function AuthPage() {
  const { toast }    = useToast()
  const navigate     = useNavigate()
  const [mode, setMode]     = useState('signin')
  const [loading, setLoading] = useState(false)
  const [form, setForm]     = useState({ email: '', password: '', full_name: '' })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (form.password.length < 10) { toast({ type:'warning', title:'Password must be at least 10 characters' }); return }
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(form.email, form.password)
        if (error) throw error
        navigate('/dashboard')
      } else {
        const { error } = await signUp(form.email, form.password)
        if (error) throw error
        toast({ type:'success', title:'Account created', description:'Check your email to confirm.' })
        setMode('signin')
      }
    } catch (err) {
      toast({ type:'error', title:'Authentication error', description: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-2 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mb-3">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SOX Audit Platform</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {mode === 'signin' ? 'Sign in to your workspace' : 'Create your workspace'}
          </p>
        </div>

        <div className="card">
          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Full name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input pl-9" placeholder="Jane Smith" value={form.full_name} onChange={set('full_name')} maxLength={80} />
                </div>
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input pl-9" type="email" placeholder="you@firm.com" value={form.email} onChange={set('email')} required />
              </div>
            </div>
            <div>
              <label className="label">Password <span className="text-gray-400 normal-case font-normal">(min 10 chars)</span></label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input pl-9" type="password" placeholder="••••••••••" value={form.password} onChange={set('password')} minLength={10} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full justify-center" disabled={loading}>
              {loading ? <Loader size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <div className="divider" />
          <p className="text-center text-sm text-gray-500">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button className="text-brand-600 font-medium hover:underline" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">SOX IT Audit Platform · PCAOB AS 2201 aligned</p>
      </div>
    </div>
  )
}
