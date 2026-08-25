import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowDownRight, BarChart3, CheckCircle2, Clock, CreditCard,
  Database, DollarSign, Eye, Filter, FlaskConical, Gauge, Globe, HeartPulse, Radio, Receipt,
  RefreshCw, Scale, ShoppingCart, Smartphone, Target, TrendingDown, Undo2, Users,
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { EVENTS_TABLE, isSupabaseConfigured, supabase } from '../lib/supabase'
import { PERIODS, loadSnapshot, type LiveSnapshot, type Period } from '../lib/liveData'
import { usePresenceObserver } from '../hooks/usePresenceObserver'
import { BreakdownTable, Donut, FunnelMap, MetricCard, Panel, money, nf, pct } from './live/parts'
import { VariantControl } from './live/VariantControl'

const TABS = ['Visão Geral', 'Funil', 'Campanhas', 'Criativos', 'Teste A/B', 'Vendas', 'Dispositivos', 'Auditoria'] as const
type Tab = (typeof TABS)[number]

function StepRow({ step, max, live }: {
  step: LiveSnapshot['steps'][number]; max: number; live: number
}) {
  const [open, setOpen] = useState(false)
  const width = max ? (step.viewed / max) * 100 : 0
  const heavy = step.dropOff >= 40 && step.viewed > 0
  return (
    <>
      <tr
        className={`border-b border-white/5 hover:bg-white/[0.03] ${step.answers.length ? 'cursor-pointer' : ''}`}
        onClick={() => step.answers.length && setOpen((v) => !v)}
      >
        <td className="py-2.5 pl-3 pr-2 text-xs tabular-nums text-white/35">{step.index}</td>
        <td className="py-2.5 pr-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{step.title}</span>
            {live > 0 && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[10px] font-medium text-emerald-400">
                {live} agora
              </span>
            )}
          </div>
          <div className="font-mono text-[11px] text-white/25">{step.slug}</div>
        </td>
        <td className="hidden min-w-[110px] py-2.5 pr-3 sm:table-cell">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${width}%` }} />
          </div>
        </td>
        <td className="py-2.5 pr-3 text-right text-sm tabular-nums text-white">{nf.format(step.viewed)}</td>
        <td className="hidden py-2.5 pr-3 text-right text-sm tabular-nums text-white/55 sm:table-cell">{nf.format(step.completed)}</td>
        <td className="hidden py-2.5 pr-3 text-right text-sm tabular-nums text-white/55 md:table-cell">{pct(step.reach)}</td>
        <td className={`py-2.5 pr-3 text-right text-sm font-medium tabular-nums ${heavy ? 'text-rose-400' : 'text-white/45'}`}>
          {step.viewed ? pct(step.dropOff) : '—'}
        </td>
      </tr>
      {open && step.answers.length > 0 && (
        <tr className="border-b border-white/5 bg-black/40">
          <td />
          <td colSpan={6} className="px-3 py-3">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-white/35">Respostas</div>
            <div className="flex flex-col gap-1.5">
              {step.answers.map((a) => {
                const total = step.answers.reduce((s, x) => s + x.count, 0)
                const share = total ? (a.count / total) * 100 : 0
                return (
                  <div key={a.label} className="flex items-center gap-3">
                    <div className="w-32 shrink-0 truncate text-xs text-white/65 sm:w-56">{a.label}</div>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-sky-500/70" style={{ width: `${share}%` }} />
                    </div>
                    <div className="w-16 text-right text-xs tabular-nums text-white/45 sm:w-20">
                      {nf.format(a.count)} · {share.toFixed(0)}%
                    </div>
                  </div>
                )
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function Live() {
  const [period, setPeriod] = useState<Period>('today')
  const [tab, setTab] = useState<Tab>('Visão Geral')
  const [data, setData] = useState<LiveSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clock, setClock] = useState(() => new Date())
  const presence = usePresenceObserver()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await loadSnapshot(period))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Novos eventos e vendas recarregam o painel em lote (5s), para não
  // disparar uma consulta por evento em pico de tráfego.
  useEffect(() => {
    const client = supabase
    if (!client) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) return
      timer = setTimeout(() => { timer = null; void refresh() }, 5000)
    }
    const channel = client
      .channel('painel-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: EVENTS_TABLE }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, schedule)
      .subscribe()
    return () => {
      if (timer) clearTimeout(timer)
      void client.removeChannel(channel)
    }
  }, [refresh])

  const maxViewed = useMemo(() => Math.max(1, ...(data?.steps.map((s) => s.viewed) ?? [1])), [data])
  const worst = useMemo(
    () => [...(data?.steps ?? [])].filter((s) => s.viewed > 5).sort((a, b) => b.dropOff - a.dropOff).slice(0, 3),
    [data],
  )
  const noSales = (data?.gateway.total ?? 0) === 0

  return (
    <div className="min-h-screen bg-[#0a0b0d] px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-[1600px]">
        {/* ---- cabeçalho ---- */}
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
              <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-1.5">
                <Activity className="h-4 w-4 text-emerald-400" />
              </span>
              Dashboard
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {presence.total} online
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/55">
                <Globe className="h-3 w-3" /> {nf.format(data?.sessions ?? 0)} visitas
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 tabular-nums text-white/35">
                <Clock className="h-3 w-3" /> {clock.toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSupabaseConfigured ? (
              <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-400">
                <Radio className="h-3 w-3 animate-pulse" /> ao vivo
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-400">
                <Database className="h-3 w-3" /> demo
              </span>
            )}
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              {(Object.keys(PERIODS) as Period[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1.5 text-[11px] transition-colors ${period === p ? 'bg-emerald-500/20 text-emerald-300' : 'text-white/45 hover:bg-white/5'}`}>
                  {PERIODS[p]}
                </button>
              ))}
            </div>
            <button onClick={() => void refresh()} aria-label="Atualizar"
              className="rounded-lg border border-white/10 p-2 text-white/55 hover:bg-white/5">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {!isSupabaseConfigured && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-[12px] text-amber-200/85">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>
              Supabase não configurado — os números são <strong>simulados</strong>. Preencha{' '}
              <code className="font-mono">VITE_SUPABASE_URL</code> e <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> no <code className="font-mono">.env</code>.
            </span>
          </div>
        )}
        {isSupabaseConfigured && noSales && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-3 text-[12px] text-sky-200/85">
            <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
            <span>
              Sem vendas registradas. Receita, ticket e aprovação só saem do zero depois que o
              <strong> webhook do Ticto</strong> estiver apontado para a função <code className="font-mono">ticto-webhook</code>.
            </span>
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-200">{error}</div>
        )}

        {/* ---- linha 1 ---- */}
        <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard title="Receita" value={money(data?.revenue ?? 0)} icon={DollarSign}
            sub={`projeção do dia: ${money(data?.revenueProjection ?? 0)}`} />
          <MetricCard title="Vendas" value={nf.format(data?.sales ?? 0)} icon={ShoppingCart}
            sub={`${nf.format(data?.gateway.pending ?? 0)} pend. | ${nf.format(data?.gateway.refused ?? 0)} recus.`} />
          <MetricCard title="Leads" value={nf.format(data?.leads ?? 0)} icon={Users} accent="sky"
            sub="completaram o quiz" />
          <MetricCard title="IC para Vendas" value={pct(data?.icToSale ?? 0)} icon={Target} accent="violet"
            sub={`${nf.format(data?.checkouts ?? 0)} ICs | ${nf.format(data?.sales ?? 0)} vendas`} />
        </div>

        {/* ---- abas ---- */}
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111214] p-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] transition-colors ${
                tab === t ? 'bg-emerald-500/15 text-emerald-300' : 'text-white/45 hover:bg-white/5'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'Visão Geral' && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <MetricCard title="Taxa de Aprovação" value={pct(data?.approvalRate ?? 0)} icon={CheckCircle2}
                sub={`${nf.format(data?.gateway.paid ?? 0)} pagos | ${nf.format(data?.gateway.refused ?? 0)} recusados`} />
              <MetricCard title="Ticket Médio" value={money(data?.ticket ?? 0)} icon={Scale} accent="violet"
                valueClass="text-violet-300" sub={`receita total: ${money(data?.revenue ?? 0)}`} />
              <MetricCard title="Taxa Interação" value={pct(data?.interactionRate ?? 0)} icon={Activity} accent="amber"
                valueClass="text-amber-300" sub={`${nf.format(data?.sessions ?? 0)} visitantes`} />
              <MetricCard title="Bounce Etapa 1" value={pct(data?.bounceStep1 ?? 0)} icon={TrendingDown} accent="rose"
                valueClass={(data?.bounceStep1 ?? 0) > 35 ? 'text-rose-400' : 'text-white'}
                sub={(data?.bounceStep1 ?? 0) > 35 ? '⚠ acima de 35% — revisar criativos' : 'saíram na primeira etapa'} />
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Donut title="Aprovação Gateway" icon={Globe} percent={data?.approvalRate ?? 0}
                centerLabel={pct(data?.approvalRate ?? 0)} caption="Aprovação"
                items={[
                  { label: `${nf.format(data?.gateway.paid ?? 0)} Pagos`, color: '#34d399' },
                  { label: `${nf.format(data?.gateway.pending ?? 0)} Pendentes`, color: '#fbbf24' },
                  { label: `${nf.format(data?.gateway.refused ?? 0)} Recusados`, color: '#fb7185' },
                  { label: `${nf.format(data?.gateway.total ?? 0)} Total`, color: '#64748b' },
                ]} />
              <Donut title="Funil IC para Venda" icon={Target} percent={data?.icToSale ?? 0}
                centerLabel={pct(data?.icToSale ?? 0)} caption="Conversão"
                items={[
                  { label: `${nf.format(data?.checkouts ?? 0)} ICs`, color: '#fbbf24' },
                  { label: `${nf.format(data?.sales ?? 0)} Vendas`, color: '#34d399' },
                ]} />
              <Donut title="Sessões Únicas" icon={Eye} percent={data?.quizCompletion ?? 0}
                centerLabel={nf.format(data?.sessions ?? 0)} caption="Ativas"
                items={[
                  { label: `${presence.total} Online`, color: '#38bdf8' },
                  { label: `${nf.format(data?.checkouts ?? 0)} ICs`, color: '#fbbf24' },
                  { label: `${nf.format(data?.sales ?? 0)} Compraram`, color: '#34d399' },
                ]} />
              <Donut title="Saúde do Funil" icon={HeartPulse} percent={data?.health.score ?? 0}
                centerLabel={`${data?.health.score ?? 0}`} caption="Nota de 0 a 100"
                items={[
                  { label: `Quiz: ${pct(data?.health.quiz ?? 0)}`, color: '#34d399' },
                  { label: `Checkout: ${pct(data?.health.checkout ?? 0)}`, color: '#38bdf8' },
                  { label: `Aprovação: ${pct(data?.health.approval ?? 0)}`, color: '#a78bfa' },
                ]} />
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <MetricCard title="Quiz Completion" value={pct(data?.quizCompletion ?? 0)} icon={CheckCircle2} accent="sky"
                sub="Intro → IA liberada" />
              <MetricCard title="Checkout Rate" value={pct(data?.checkoutRate ?? 0)} icon={CreditCard} accent="violet"
                sub="Pitch → Checkout" />
              <MetricCard title="Horário de pico" value={data?.buyerProfile.peakHour ?? '—'} icon={Clock} accent="amber"
                sub="quando mais vende" />
              <MetricCard title="Dispositivo top" value={data?.buyerProfile.topDevice ?? '—'} icon={Smartphone}
                sub="mais usado pelos leads" />
            </div>
          </>
        )}

        {/* ---- mapa do funil ao vivo (sempre visível) ---- */}
        <Panel
          className="mb-4"
          title={
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              Mapa do Funil — Tempo Real
              <span className="text-[11px] font-normal text-white/30">presença instantânea</span>
            </span>
          }
          right={
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> {presence.total}
            </span>
          }
        >
          <FunnelMap presence={presence} />
          {!isSupabaseConfigured && (
            <div className="border-t border-white/5 px-4 py-2 text-[11px] text-white/30">
              A presença ao vivo depende do Supabase Realtime — sem as chaves, os quadros ficam zerados.
            </div>
          )}
        </Panel>

        {(tab === 'Visão Geral' || tab === 'Funil') && worst.length > 0 && (
          <Panel className="mb-4" title={<span className="flex items-center gap-2"><ArrowDownRight className="h-4 w-4 text-rose-400" /> Maiores quedas</span>}>
            <div className="grid gap-2 p-4 sm:grid-cols-3">
              {worst.map((s) => (
                <div key={s.id} className="rounded-xl border border-rose-500/15 bg-rose-500/[0.04] p-3">
                  <div className="truncate text-sm font-medium text-white">{s.title}</div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-rose-400">{pct(s.dropOff)}</div>
                  <div className="text-[11px] text-white/35">
                    {nf.format(s.viewed - s.completed)} de {nf.format(s.viewed)} pararam aqui
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {(tab === 'Visão Geral' || tab === 'Funil') && (
          <Panel className="mb-4" title="Funil etapa por etapa · toque numa etapa de quiz para ver as respostas">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] uppercase tracking-wide text-white/30">
                    <th className="py-2 pl-3 pr-2 text-left font-medium">#</th>
                    <th className="py-2 pr-3 text-left font-medium">Etapa</th>
                    <th className="hidden py-2 pr-3 text-left font-medium sm:table-cell">Volume</th>
                    <th className="py-2 pr-3 text-right font-medium">Viram</th>
                    <th className="hidden py-2 pr-3 text-right font-medium sm:table-cell">Avançaram</th>
                    <th className="hidden py-2 pr-3 text-right font-medium md:table-cell">Alcance</th>
                    <th className="py-2 pr-3 text-right font-medium">Queda</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.steps.map((s) => (
                    <StepRow key={s.id} step={s} max={maxViewed} live={presence.countByStep[s.id] ?? 0} />
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {tab === 'Campanhas' && (
          <Panel className="mb-4" title="Campanhas · funil completo por origem">
            <BreakdownTable rows={data?.campaignRows ?? []} firstCol="Campanha"
              emptyHint="Nenhuma sessão com UTM ainda. Rode tráfego com ?utm_source=&utm_campaign= para popular." />
          </Panel>
        )}

        {tab === 'Criativos' && (
          <Panel className="mb-4" title="Criativos · desempenho por utm_content / utm_term">
            <BreakdownTable rows={data?.creativeRows ?? []} firstCol="Criativo"
              emptyHint="Nenhum criativo identificado. Use ?utm_content=<nome-do-criativo> nos anúncios." />
          </Panel>
        )}

        {tab === 'Teste A/B' && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {(data?.variantRows ?? []).map((v) => (
                <MetricCard key={v.key} title={v.label} value={pct(v.convRate)} icon={FlaskConical}
                  accent={v.convRate >= Math.max(...(data?.variantRows ?? []).map((x) => x.convRate)) ? 'emerald' : 'sky'}
                  sub={`${nf.format(v.sessions)} sessões · ${nf.format(v.checkouts)} ICs`}
                  extra={`quiz completo: ${pct(v.completion)}`} />
              ))}
            </div>
            <Panel className="mb-4" title="Divisão do tráfego · quanto cada hook recebe">
              <VariantControl />
            </Panel>
            <Panel className="mb-4" title="Teste A/B de hook · desempenho de cada variante">
              <BreakdownTable rows={data?.variantRows ?? []} firstCol="Variante"
                emptyHint="Sem dados de variante ainda." />
              <div className="border-t border-white/5 px-4 py-2 text-[11px] text-white/30">
                Force uma variante para conferir com <code className="font-mono">?variant=C</code>.
              </div>
            </Panel>
          </>
        )}

        {tab === 'Auditoria' && (
          <Panel className="mb-4" title="Auditoria · trilha crua dos eventos">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[720px]">
                <thead className="sticky top-0 bg-[#111214]">
                  <tr className="text-[11px] uppercase tracking-wide text-white/30">
                    <th className="py-2 pl-4 text-left font-medium">Quando</th>
                    <th className="py-2 text-left font-medium">Evento</th>
                    <th className="py-2 text-left font-medium">Etapa</th>
                    <th className="py-2 text-left font-medium">Var.</th>
                    <th className="py-2 text-left font-medium">Sessão</th>
                    <th className="py-2 pr-4 text-right font-medium">Tempo</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.audit ?? []).map((a) => (
                    <tr key={a.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                      <td className="py-2 pl-4 font-mono text-[11px] tabular-nums text-white/45">
                        {new Date(a.created_at).toLocaleTimeString('pt-BR')}
                      </td>
                      <td className="py-2">
                        <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60">
                          {a.event_name}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs text-white/70">{a.step_title}</td>
                      <td className="py-2 pr-3 text-xs text-white/45">{a.variant}</td>
                      <td className="py-2 pr-3 font-mono text-[10px] text-white/25">{a.session_id.slice(0, 8)}</td>
                      <td className="py-2 pr-4 text-right text-xs tabular-nums text-white/50">
                        {a.duration_ms != null ? `${(a.duration_ms / 1000).toFixed(1)}s` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {tab === 'Visão Geral' && (
          <div className="mb-4 grid gap-3 lg:grid-cols-3">
            <Panel className="lg:col-span-2" title="Sessões e checkouts por dia">
              <div className="h-56 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.timeline ?? []}>
                    <defs>
                      <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} width={28} />
                    <Tooltip contentStyle={{ background: '#111318', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="sessions" name="Sessões" stroke="#34d399" fill="url(#gS)" strokeWidth={2} />
                    <Area type="monotone" dataKey="checkouts" name="Checkouts" stroke="#38bdf8" fill="url(#gC)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title={<span className="flex items-center gap-2"><Filter className="h-4 w-4 text-white/30" /> Origem do tráfego</span>}>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full">
                  <tbody>
                    {data?.campaigns.map((c) => (
                      <tr key={`${c.source}-${c.campaign}`} className="border-b border-white/5">
                        <td className="py-2 pl-4 text-xs text-white">{c.source}</td>
                        <td className="py-2 text-xs text-white/45">{c.campaign}</td>
                        <td className="py-2 pr-2 text-right text-xs tabular-nums text-white/65">{nf.format(c.sessions)}</td>
                        <td className="py-2 pr-4 text-right text-xs tabular-nums text-emerald-400">
                          {c.sessions ? pct((c.checkouts / c.sessions) * 100) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        {tab === 'Vendas' && (
          <Panel className="mb-4" title="Vendas registradas">
            <div className="max-h-[520px] overflow-y-auto">
              {data?.purchases.length ? (
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#111214]">
                    <tr className="text-[11px] uppercase tracking-wide text-white/30">
                      <th className="py-2 pl-4 text-left font-medium">Quando</th>
                      <th className="py-2 text-left font-medium">Status</th>
                      <th className="hidden py-2 text-left font-medium sm:table-cell">Método</th>
                      <th className="py-2 pr-4 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.purchases.map((p) => (
                      <tr key={p.id} className="border-t border-white/5">
                        <td className="py-2 pl-4 text-xs tabular-nums text-white/55">
                          {new Date(p.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 text-xs">
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                            p.status === 'paid' ? 'bg-emerald-500/15 text-emerald-400'
                            : p.status === 'pending' ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-rose-500/15 text-rose-400'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="hidden py-2 text-xs text-white/45 sm:table-cell">{p.payment_method ?? '—'}</td>
                        <td className="py-2 pr-4 text-right text-xs tabular-nums text-white">{money(Number(p.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-sm text-white/35">
                  Nenhuma venda ainda. Conecte o webhook do Ticto para popular esta aba.
                </div>
              )}
            </div>
          </Panel>
        )}

        {tab === 'Dispositivos' && (
          <Panel className="mb-4" title="Dispositivos · aparelho, sistema e navegador">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] uppercase tracking-wide text-white/30">
                    <th className="py-2 pl-4 text-left font-medium">Aparelho</th>
                    <th className="py-2 text-left font-medium">Sistema</th>
                    <th className="py-2 text-left font-medium">Navegador</th>
                    <th className="py-2 pr-3 text-right font-medium">Sessões</th>
                    <th className="py-2 pr-4 text-left font-medium">Participação</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.devices.map((d) => {
                    const total = data.devices.reduce((s, x) => s + x.count, 0)
                    const share = total ? (d.count / total) * 100 : 0
                    return (
                      <tr key={`${d.label}-${d.os}-${d.browser}`} className="border-b border-white/5">
                        <td className="py-2.5 pl-4 text-xs text-white">{d.label}</td>
                        <td className="py-2.5 text-xs text-white/60">{d.os}</td>
                        <td className="py-2.5 text-xs text-white/60">{d.browser}</td>
                        <td className="py-2.5 pr-3 text-right text-xs tabular-nums text-white/70">{nf.format(d.count)}</td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                              <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${share}%` }} />
                            </div>
                            <span className="text-[11px] tabular-nums text-white/35">{share.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          <Panel title={<span className="flex items-center gap-2"><Gauge className="h-4 w-4 text-white/30" /> Quem está online agora</span>}>
            <div className="max-h-64 divide-y divide-white/5 overflow-y-auto">
              {presence.online.length ? presence.online.map((u) => (
                <div key={u.session_id} className="flex items-center gap-3 px-4 py-2">
                  <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
                  <span className="min-w-0 flex-1 truncate text-xs text-white/70">{u.step_label}</span>
                  <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/45">
                    {u.traffic_source}
                  </span>
                </div>
              )) : (
                <div className="p-6 text-center text-xs text-white/30">Ninguém no funil neste momento.</div>
              )}
            </div>
          </Panel>
          <Panel title="Eventos recentes">
            <div className="max-h-64 divide-y divide-white/5 overflow-y-auto">
              {data?.recent.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="w-12 shrink-0 font-mono text-[11px] text-white/25">
                    {new Date(e.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/55">
                    {e.event_name}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-white/65">
                    {String(e.event_data?.step_title ?? e.event_data?.answer ?? '—')}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
