import { useEffect, useState } from 'react'
import { Check, Image as ImageIcon, Loader2, PlayCircle, Save } from 'lucide-react'
import { VARIANTS } from '../../lib/abtest'
import { DEFAULT_WEIGHTS, getWeights, refreshWeights, saveWeights, type VariantWeights } from '../../lib/config'
import { isSupabaseConfigured } from '../../lib/supabase'

const PRESETS: { label: string; weights: VariantWeights }[] = [
  { label: 'Só a V.1 (original)', weights: { A: 100, B: 0, C: 0, D: 0 } },
  { label: 'Foto vs Vídeo', weights: { A: 50, B: 0, C: 25, D: 25 } },
  { label: 'As 4 igualmente', weights: { A: 25, B: 25, C: 25, D: 25 } },
]

/**
 * Divisão de tráfego do teste A/B. O que for salvo aqui passa a valer para
 * as próximas sessões do funil.
 */
export function VariantControl() {
  const [weights, setWeights] = useState<VariantWeights>(getWeights)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    void refreshWeights().then(setWeights)
  }, [])

  const total = VARIANTS.reduce((s, v) => s + (weights[v.id] ?? 0), 0)
  const dirty = VARIANTS.some((v) => (weights[v.id] ?? 0) !== (getWeights()[v.id] ?? 0))

  const setOne = (id: string, value: number) => {
    setFeedback(null)
    setWeights((w) => ({ ...w, [id]: Math.max(0, Math.min(100, Math.round(value))) }))
  }

  const persist = async () => {
    setSaving(true)
    setFeedback(null)
    // Normaliza para somar 100 — o sorteio é proporcional, mas guardar
    // number redondo evita confusão na hora de ler o painel.
    const normalized: VariantWeights = {}
    if (total > 0) {
      let acc = 0
      VARIANTS.forEach((v, i) => {
        const share = Math.round(((weights[v.id] ?? 0) / total) * 100)
        normalized[v.id] = i === VARIANTS.length - 1 ? Math.max(0, 100 - acc) : share
        acc += normalized[v.id]
      })
    } else {
      Object.assign(normalized, DEFAULT_WEIGHTS)
    }
    const res = await saveWeights(normalized)
    setWeights(normalized)
    setSaving(false)
    setFeedback(
      res.ok
        ? { ok: true, msg: 'Divisão salva. Vale para as próximas sessões.' }
        : { ok: false, msg: res.error ?? 'Não foi possível salvar.' },
    )
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-white/35">Atalhos</span>
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => { setFeedback(null); setWeights(p.weights) }}
            className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/5">
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {VARIANTS.map((v) => {
          const value = weights[v.id] ?? 0
          const Icon = v.media === 'video' ? PlayCircle : ImageIcon
          return (
            <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                value > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                {v.id}
              </span>
              <div className="min-w-[150px] flex-1">
                <div className="flex items-center gap-1.5 text-sm text-white">
                  <Icon className="h-3.5 w-3.5 text-white/35" />
                  {v.label}
                </div>
                <div className="text-[11px] text-white/30">
                  {v.media === 'video' ? 'hook em vídeo' : 'hook em imagem'}
                </div>
              </div>
              <input
                type="range" min={0} max={100} value={value}
                onChange={(e) => setOne(v.id, Number(e.target.value))}
                className="h-1 flex-1 min-w-[120px] cursor-pointer accent-emerald-500"
                aria-label={`Tráfego para ${v.label}`}
              />
              <div className="flex items-center gap-1">
                <input
                  type="number" min={0} max={100} value={value}
                  onChange={(e) => setOne(v.id, Number(e.target.value))}
                  className="w-16 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-right text-sm tabular-nums text-white"
                />
                <span className="text-xs text-white/35">%</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs">
          <span className="text-white/40">Soma: </span>
          <span className={`font-medium tabular-nums ${total === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>{total}%</span>
          {total !== 100 && total > 0 && (
            <span className="ml-2 text-white/35">— será ajustado proporcionalmente para 100% ao salvar</span>
          )}
          {total === 0 && <span className="ml-2 text-amber-400">— com tudo em zero, o funil volta para a V.1</span>}
        </div>
        <button
          onClick={() => void persist()}
          disabled={saving || !dirty}
          className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar divisão
        </button>
      </div>

      {feedback && (
        <div className={`mt-3 flex items-start gap-2 rounded-lg border p-2.5 text-[11px] ${
          feedback.ok ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
                      : 'border-amber-500/20 bg-amber-500/5 text-amber-200'}`}>
          {feedback.ok && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-white/30">
        A sessão sorteia a variante na primeira visita e permanece nela. A troca vale para
        quem chegar depois — quem já está no funil não muda de tela.
        {!isSupabaseConfigured && ' Sem Supabase, a divisão fica só neste navegador.'}
      </p>
    </div>
  )
}
