import type { ReactNode } from 'react'
import { STEPS } from '../../lib/steps'
import type { PresenceState } from '../../hooks/usePresenceObserver'

export const nf = new Intl.NumberFormat('pt-BR')
export const money = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const pct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`

export const ACCENTS = {
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
} as const
export type Accent = keyof typeof ACCENTS

/** Card de métrica do topo — mesmo formato do painel de referência. */
export function MetricCard({
  title, value, sub, extra, icon: Icon, accent = 'emerald', valueClass = '',
}: {
  title: string; value: string; sub?: string; extra?: string
  icon: React.ElementType; accent?: Accent; valueClass?: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111214] p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <div className={`rounded-lg border p-1.5 ${ACCENTS[accent]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[13px] font-medium text-white/70">{title}</span>
      </div>
      <div className={`mt-3 text-2xl font-bold tabular-nums sm:text-3xl ${valueClass || 'text-white'}`}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-white/35">{sub}</div>}
      {extra && <div className="mt-0.5 text-[11px] text-white/35">{extra}</div>}
    </div>
  )
}

/** Donut em SVG puro, com legenda ao lado. */
export function Donut({
  title, centerLabel, percent, caption, items, icon: Icon,
}: {
  title: string; centerLabel: string; percent: number; caption: string
  items: { label: string; color: string }[]; icon: React.ElementType
}) {
  const r = 34
  const c = 2 * Math.PI * r
  const filled = Math.max(0, Math.min(100, percent))
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111214] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-medium text-white/70">{title}</span>
        <Icon className="h-4 w-4 text-white/25" />
      </div>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
            <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
            <circle
              cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round"
              className="text-emerald-400 transition-all duration-500"
              strokeDasharray={c} strokeDashoffset={c - (filled / 100) * c}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base font-bold tabular-nums text-white">{centerLabel}</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          {items.map((it) => (
            <div key={it.label} className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: it.color }} />
              <span className="truncate text-[11px] text-white/60">{it.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 text-center text-[11px] text-white/30">{caption}</div>
    </div>
  )
}

export function Panel({ title, right, children, className = '' }: {
  title: ReactNode; right?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111214] ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div className="text-[13px] font-medium text-white/70">{title}</div>
        {right}
      </div>
      {children}
    </section>
  )
}

/**
 * Mapa do funil em tempo real.
 *
 * Cada quadro é uma etapa; o número é quantas sessões estão nela **agora**,
 * vindo do canal de presença. Quem sai da etapa some do quadro na hora.
 */
export function FunnelMap({ presence }: { presence: PresenceState }) {
  return (
    <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10">
      {STEPS.map((step) => {
        const count = presence.countByStep[step.id] ?? 0
        const active = count > 0
        const Icon = step.icon
        return (
          <div
            key={step.id}
            title={step.title}
            className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all duration-300 ${
              active
                ? 'border-emerald-500/40 bg-emerald-500/[0.08] shadow-[0_0_20px_-6px] shadow-emerald-500/40'
                : 'border-white/[0.06] bg-white/[0.02]'
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? 'text-emerald-400' : 'text-white/25'}`} />
            <span className={`text-lg font-bold tabular-nums ${active ? 'text-emerald-400' : 'text-white/40'}`}>
              {count}
            </span>
            <span className="w-full truncate text-[10px] leading-tight text-white/45">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Tabela de recorte (campanha, criativo, variante). Mostra o funil inteiro
 * da dimensão: sessões -> leads -> checkouts -> vendas -> receita.
 */
export function BreakdownTable({
  rows, firstCol, emptyHint,
}: {
  rows: { key: string; label: string; sublabel?: string; sessions: number; leads: number
          checkouts: number; sales: number; revenue: number; convRate: number }[]
  firstCol: string
  emptyHint: string
}) {
  if (!rows.length) {
    return <div className="p-8 text-center text-sm text-white/35">{emptyHint}</div>
  }
  const max = Math.max(...rows.map((r) => r.sessions), 1)
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-white/5 text-[11px] uppercase tracking-wide text-white/30">
            <th className="py-2 pl-4 text-left font-medium">{firstCol}</th>
            <th className="py-2 pr-3 text-right font-medium">Sessões</th>
            <th className="py-2 pr-3 text-right font-medium">Leads</th>
            <th className="py-2 pr-3 text-right font-medium">ICs</th>
            <th className="py-2 pr-3 text-right font-medium">Vendas</th>
            <th className="py-2 pr-3 text-right font-medium">Receita</th>
            <th className="py-2 pr-4 text-right font-medium">Conv.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-white/5 hover:bg-white/[0.03]">
              <td className="py-2.5 pl-4">
                <div className="text-sm text-white">{r.label}</div>
                {r.sublabel && <div className="text-[11px] text-white/30">{r.sublabel}</div>}
                <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${(r.sessions / max) * 100}%` }} />
                </div>
              </td>
              <td className="py-2.5 pr-3 text-right text-xs tabular-nums text-white/70">{nf.format(r.sessions)}</td>
              <td className="py-2.5 pr-3 text-right text-xs tabular-nums text-white/70">{nf.format(r.leads)}</td>
              <td className="py-2.5 pr-3 text-right text-xs tabular-nums text-amber-300/80">{nf.format(r.checkouts)}</td>
              <td className="py-2.5 pr-3 text-right text-xs tabular-nums text-emerald-400">{nf.format(r.sales)}</td>
              <td className="py-2.5 pr-3 text-right text-xs tabular-nums text-white">{money(r.revenue)}</td>
              <td className="py-2.5 pr-4 text-right text-xs font-medium tabular-nums text-emerald-400">{pct(r.convRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
