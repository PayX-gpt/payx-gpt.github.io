import { useEffect, useState, type ReactNode } from 'react'
import { KeyRound, Loader2, LogOut, ShieldAlert } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

/**
 * Portão de acesso do painel.
 *
 * O /live mostra métricas de campanha e deixa mudar a divisão do tráfego,
 * então não pode ficar aberto na internet. Exige login do Supabase Auth;
 * é o mesmo usuário que a policy `authenticated` reconhece para gravar a
 * configuração do teste A/B.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const client = supabase
    if (!client) {
      setChecking(false)
      return
    }
    void client.auth.getSession().then(({ data }) => {
      setAuthed(Boolean(data.session))
      setChecking(false)
    })
    const { data: sub } = client.auth.onAuthStateChange((_e, session) => setAuthed(Boolean(session)))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Sem Supabase configurado não há o que proteger: o painel roda com dados
  // simulados. Assim o modo demonstração continua abrindo direto.
  if (!isSupabaseConfigured) return <>{children}</>

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0b0d]">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
      </div>
    )
  }

  if (authed) {
    return (
      <div className="relative">
        <button
          onClick={() => void supabase?.auth.signOut()}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#111214] px-2.5 py-1.5 text-[11px] text-white/50 hover:bg-white/5"
        >
          <LogOut className="h-3 w-3" /> Sair
        </button>
        {children}
      </div>
    )
  }

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (err) setError(err.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0b0d] px-4">
      <form onSubmit={signIn} className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111214] p-6">
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-1.5">
            <KeyRound className="h-4 w-4 text-emerald-400" />
          </span>
          <h1 className="text-base font-bold text-white">Painel restrito</h1>
        </div>
        <p className="mb-5 text-xs text-white/40">Entre para ver as métricas do funil.</p>

        <label className="mb-1 block text-[11px] text-white/50">E-mail</label>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username"
          className="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40"
        />
        <label className="mb-1 block text-[11px] text-white/50">Senha</label>
        <input
          type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
          className="mb-4 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40"
        />

        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-[11px] text-rose-200">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit" disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/20 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Entrar
        </button>

        <p className="mt-4 text-[11px] leading-relaxed text-white/25">
          O usuário é criado em Authentication → Users, no painel do Supabase.
        </p>
      </form>
    </div>
  )
}
