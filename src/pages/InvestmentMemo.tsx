import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Users,
  TrendingUp,
  Zap,
  Briefcase,
  FileText,
  Target,
  ArrowRight,
  DollarSign,
  FileDown,
  ChevronDown,
  Loader2,
  Activity,
  Shield,
  Building2,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

/** Default body typography for slide content */
const body = 'text-lg xl:text-[1.3125rem] text-slate-700 leading-relaxed';
const bodySm = 'text-base xl:text-lg text-slate-600 leading-relaxed';
/** Tighter prose for slides sized to avoid PDF / print overflow */
const deckTight = 'text-[15px] sm:text-[16px] text-slate-700 leading-snug';
const deckTightSm = 'text-[13px] sm:text-sm text-slate-600 leading-snug';

const growthData = [
  { year: '2020', value: 50 },
  { year: '2021', value: 80 },
  { year: '2022', value: 120 },
  { year: '2023', value: 200 },
  { year: '2024', value: 350 },
  { year: '2025', value: 580 },
  { year: '2026', value: 920 },
  { year: '2027', value: 1500 },
];

/** Illustrative model — same assumptions as internal seed readiness canvas */
const FIN = {
  studioMonthly: 39,
  brandMonthly: 199,
  avgGmv: 2500,
  takeRate: 0.05,
  stripeRate: 0.029,
  stripeFixed: 0.3,
  fullScriptCost: 0.5,
  scriptsPerStudioMo: 4,
  launch: { studios: 20, brands: 5, tx: 10 },
  seedBar: { studios: 250, brands: 50, tx: 150 },
  /** Later horizon reference from internal model — not a near-term operating target */
  postSeedCompass: { studios: 1000, brands: 200, tx: 1000 },
} as const;

const MOM_FACTOR = 2.5;
const MOM_MONTH_LABELS = ['June (launch)', 'July', 'August', 'September', 'October'] as const;

function buildMomOperatingRows(): {
  label: (typeof MOM_MONTH_LABELS)[number];
  studios: number;
  brands: number;
  tx: number;
  prevLabel: string;
}[] {
  let studios: number = FIN.launch.studios;
  let brands: number = FIN.launch.brands;
  let tx: number = FIN.launch.tx;
  return MOM_MONTH_LABELS.map((label, idx) => {
    const row = {
      label,
      studios,
      brands,
      tx,
      prevLabel: idx === 0 ? '—' : `${MOM_FACTOR}× vs prior month-end`,
    };
    studios = Math.max(1, Math.round(studios * MOM_FACTOR));
    brands = Math.max(1, Math.round(brands * MOM_FACTOR));
    tx = Math.max(1, Math.round(tx * MOM_FACTOR));
    return row;
  });
}

const momOperatingRows = buildMomOperatingRows();
const takePerDeal = FIN.avgGmv * FIN.takeRate;
const stripeOnGmv = FIN.avgGmv * FIN.stripeRate + FIN.stripeFixed;
const contribFromTake = takePerDeal - stripeOnGmv;

function mrr(studios: number, brands: number, tx: number) {
  return studios * FIN.studioMonthly + brands * FIN.brandMonthly + tx * takePerDeal;
}

function grossProfitMonthly(studios: number, brands: number, tx: number) {
  const rev = mrr(studios, brands, tx);
  const marketplaceVar = tx * stripeOnGmv;
  const studioAi = studios * FIN.scriptsPerStudioMo * FIN.fullScriptCost;
  return rev - marketplaceVar - studioAi;
}

function blendedGrossMarginPct(studios: number, brands: number, tx: number) {
  const rev = mrr(studios, brands, tx);
  if (!rev) return 0;
  return (grossProfitMonthly(studios, brands, tx) / rev) * 100;
}

const gmAtSeedBar = blendedGrossMarginPct(
  FIN.seedBar.studios,
  FIN.seedBar.brands,
  FIN.seedBar.tx,
);
const mrrAtSeedBar = mrr(FIN.seedBar.studios, FIN.seedBar.brands, FIN.seedBar.tx);
const gpAtSeedBar = grossProfitMonthly(FIN.seedBar.studios, FIN.seedBar.brands, FIN.seedBar.tx);
const mrrLaunch = mrr(FIN.launch.studios, FIN.launch.brands, FIN.launch.tx);
const gpLaunch = grossProfitMonthly(FIN.launch.studios, FIN.launch.brands, FIN.launch.tx);

const marginOnTakePct = takePerDeal > 0 ? (contribFromTake / takePerDeal) * 100 : 0;

/** Illustrative wedge for opportunity slide (indexed %, narrative only — not audited TAM) */
const opportunityWedgeData = [
  { name: 'Creator economy wedge', pct: 100, fill: '#1d4ed8' },
  { name: 'Monetizing cohort', pct: 42, fill: '#3b82f6' },
  { name: 'Ops / workflow monetization slice', pct: 16, fill: '#7dd3fc' },
];

const INDEX_VISION_SLIDE = 1;
const INDEX_CUSTOMERS_SLIDE = 6;
const INDEX_MOAT_SLIDE = 12;

const slides = [
  {
    title: 'Curbily',
    subtitle: 'Hollywood in a box — operating system for brands, talent, and production',
    content: (
      <div className="flex flex-col justify-center items-center text-center gap-8 py-8">
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md">
          <img
            src="/deck-landing-screenshot.png"
            alt="Preview of curbily.com marketing homepage"
            className="block w-full h-auto object-cover aspect-[800/440]"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/deck-landing-preview.svg';
            }}
          />
        </div>
        <div className="space-y-5 max-w-3xl px-4">
          <p className={`${body} font-medium text-slate-800 max-w-2xl mx-auto`}>
            Unified workflows across brand spend, representation, influencer profiles, crew, and producer tooling—built for
            teams that finance and ship sponsored and original content every week.
          </p>
          <p className={`${bodySm} text-slate-500`}>Confidential · Pre-seed / angel materials</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Vision',
    subtitle: 'The addressable market is already enormous—and still professionalizing fast',
    content: (
      <div className="grid gap-5 lg:grid-cols-12 lg:gap-6 items-stretch">
        <div className="lg:col-span-7 space-y-3 rounded-xl border border-slate-100 bg-white p-5">
          <p className={deckTight}>
            Creator-led branded content is a full budget line—tens of millions of monetizing creators worldwide, with spend
            routed through influencer and short-form pipelines each year.
          </p>
          <p className={deckTight}>
            The gap is not audience; it is the <span className="font-semibold text-slate-900">operating system</span> where
            bids, escrow, approvals, staffing, and delivery meet in one graph.
          </p>
          <div className="flex items-start gap-2 rounded-lg bg-blue-50/80 px-3 py-2.5 border border-blue-100">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" aria-hidden />
            <p className={deckTightSm}>
              Vision: every financed brief spins up scoped work on real spend with routed talent and auditable payouts—no
              reinventing the machinery each campaign.
            </p>
          </div>
        </div>
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">Market scale (directional)</p>
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-lg bg-white border border-slate-200 px-4 py-3">
              <p className="text-2xl font-semibold text-slate-900">$250B+</p>
              <p className={`${deckTightSm} mt-1`}>Economy sizing range often cited in reports—verify for diligence.</p>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 px-4 py-3">
              <p className="text-2xl font-semibold text-slate-900">~50M</p>
              <p className={`${deckTightSm} mt-1`}>Monetizing creators (magnitude consensus; platform definitions vary).</p>
            </div>
            <div className="rounded-lg bg-blue-600/95 text-white px-4 py-3">
              <p className="text-sm font-semibold">Throughput bottleneck</p>
              <p className="text-[13px] text-blue-50 mt-1 leading-snug">
                Approvals, counterparties, payouts—not reach—usually cap financed output.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Market context',
    subtitle: 'Professional creators are scaling faster than legacy production software',
    content: (
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
        <div className="space-y-8">
          <p className={`${body} font-medium text-slate-900`}>
            Spending on creator-led production and brand-funded content keeps growing; teams need one place for money,
            coordination, and delivery—not ad hoc email and spreadsheets.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 space-y-3">
            <p className="text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-slate-900">$250B</p>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Creator economy trajectory (indexed chart; illustrative axis)
            </p>
          </div>
          <p className={`${bodySm} text-slate-500`}>
            Indexed spend shown for narrative only. Source historically cited as Goldman Sachs Global Investment Research;
            independently verify current third-party sizing for diligence.
          </p>
        </div>
        <div className="min-h-[320px] rounded-2xl border border-slate-200 p-8">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={growthData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="invMemoChart" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 14 }} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} fill="url(#invMemoChart)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    ),
  },
  {
    title: 'Founders',
    subtitle: 'Operator and engineer building production-grade automation',
    content: (
      <div className="grid md:grid-cols-2 gap-10 lg:gap-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 lg:p-12 space-y-5">
          <h3 className="text-2xl font-semibold text-slate-900">Jon Barnett — CEO</h3>
          <p className={body}>
            Two decades in video production; deep relationships across major platforms and studios. Focus: market access,
            partnerships, creative operations.
          </p>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide leading-relaxed">
            Hulu · Netflix · Kimmel · CBS · DreamWorks · Tubi (highlights)
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 lg:p-12 space-y-5">
          <h3 className="text-2xl font-semibold text-slate-900">Aram Barnett — CTO</h3>
          <p className={body}>
            Ten years building software systems; exited a prior venture. Focus: reliability, integrations, AI agents,
            secure money movement.
          </p>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide leading-relaxed">
            Full‑stack architecture · Automation · Agents
          </p>
        </div>
      </div>
    ),
  },
  {
    title: 'The problem',
    subtitle: 'Value chain fragmentation hurts everyone who touches a campaign or shoot',
    content: (
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        <div className="space-y-6">
          <p className={body}>
            Brands, managers, talent, crew, and producers each use different tools. Deals stall, rework multiplies,
            and economics are opaque. There is no single system of record for how money and work move together.
          </p>
        </div>
        <ul className="space-y-4">
          {[
            'Brand commitments scattered across decks, email threads, and DMs.',
            'Managers juggling rate cards, approvals, and status without shared workflow.',
            'Influencers under pressure to coordinate legal, deliverables, and revisions manually.',
            'Crew and cast discovery is slow; utilization is inefficient.',
            'Producers carry schedule, budget, and compliance overhead in disconnected files.',
          ].map((item) => (
            <li key={item} className={`flex gap-4 ${body}`}>
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    title: 'The five pillars',
    subtitle: 'Every production pulls on the same constituencies—we connect them deliberately',
    content: (
      <div className="space-y-12">
        <p className={`${body} max-w-4xl`}>
          Curbily treats these roles as layers of one operating model, not unrelated point solutions.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5 lg:gap-6">
          {[
            { name: 'Brands', icon: Target, desc: 'Budget and objectives' },
            { name: 'Managers', icon: Briefcase, desc: 'Roster and deal flow' },
            { name: 'Influencers', icon: Users, desc: 'Profiles and rates' },
            { name: 'Crew & cast', icon: Activity, desc: 'Availability and fulfillment' },
            { name: 'Producers', icon: Zap, desc: 'Schedules and execution' },
          ].map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.name}
                className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-7 flex flex-col gap-4 min-h-[160px]"
              >
                <Icon className="w-10 h-10 text-blue-600" strokeWidth={1.75} />
                <p className="text-lg font-semibold text-slate-900">{pillar.name}</p>
                <p className={`${bodySm} leading-snug`}>{pillar.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    ),
  },
  {
    title: 'Customers',
    subtitle: 'Who buys the operating system—and what they are trying to get done',
    content: (
      <div className="space-y-4">
        <p className={`${deckTight} max-w-4xl`}>
          Subscription access for tooling plus marketplace take when capital moves across the stack—studios, brands, managers,
          and creators align on one ledger.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            {
              title: 'Brand & growth teams',
              text: 'Campaign finance, milestones, payouts, and delivery—not static PDFs.',
            },
            {
              title: 'Studios & producers',
              text: 'Schedules, staffing, contracting, and spend on one repeatable rail.',
            },
            {
              title: 'Representation',
              text: 'Rates, approvals, and simultaneous deal status across a roster.',
            },
            {
              title: 'Creators & crew',
              text: 'Tighter scope and faster settlement; more time on-camera vs admin.',
            },
          ].map((row) => (
            <div key={row.title} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[15px] font-semibold text-slate-900">{row.title}</p>
              <p className={`${deckTightSm} mt-2`}>{row.text}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Solution',
    subtitle: 'Vertical coordination—data and payments in one workflow',
    content: (
      <div className="grid lg:grid-cols-2 gap-14 items-start">
        <div className="space-y-6">
          <p className={body}>
            The product combines subscription access for studios and brands with transactional revenue on funded work.
            Workflows tie briefs to talent, contracting, escrow, and delivery so teams see one timeline and one ledger.
          </p>
        </div>
        <ol className="space-y-6 list-none">
          {[
            'Brand brief enters the workflow and becomes structured scope.',
            'Matching surfaces influencers, managers, and crew against requirements.',
            'Agreements and funding use platform-native rails where applicable.',
            'Production dashboards keep deliverables and cash milestones aligned.',
          ].map((step, i) => (
            <li key={step} className="flex gap-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-base font-semibold text-white">
                {i + 1}
              </span>
              <p className={`${body} pt-1`}>{step}</p>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    title: 'Revenue model',
    subtitle: 'Subscription plus take rate on escrowed GMV',
    content: (
      <div className="grid lg:grid-cols-2 gap-12 xl:gap-16">
        <div className="rounded-2xl border border-slate-200 p-10 lg:p-12 space-y-5">
          <h3 className="text-2xl font-semibold text-slate-900">Subscriptions</h3>
          <ul className={`space-y-5 ${body}`}>
            <li>
              Studio dashboard:{' '}
              <span className="font-semibold text-slate-900">${FIN.studioMonthly}/month</span> base plan.
            </li>
            <li>
              Brand access:{' '}
              <span className="font-semibold text-slate-900">${FIN.brandMonthly}/month</span> base plan.
            </li>
            <li className={`${bodySm} text-slate-500 pt-1`}>
              Card-processing fees on subscriptions omitted here; reserve ~3% if billed through Stripe.
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 lg:p-12 space-y-5">
          <h3 className="text-2xl font-semibold text-slate-900">Marketplace</h3>
          <ul className={`space-y-5 ${body}`}>
            <li>
              Illustrative average GMV per financed deal:{' '}
              <span className="font-semibold text-slate-900">${FIN.avgGmv.toLocaleString()}</span>
            </li>
            <li>
              Platform take: <span className="font-semibold text-slate-900">{FIN.takeRate * 100}%</span> →{' '}
              <span className="font-semibold text-slate-900">${takePerDeal.toFixed(2)}</span> per deal (illustrative)
            </li>
            <li>
              Payment rails modeled as Stripe on GMV (~{FIN.stripeRate * 100}% + ${FIN.stripeFixed.toFixed(2)} per transaction) unless the payer covers fees → ~$
              {stripeOnGmv.toFixed(2)} per deal leaving ~$
              <span className="font-semibold text-slate-900">{contribFromTake.toFixed(2)}</span> contribution from take before other costs.
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    title: 'Unit economics snapshot',
    subtitle: 'Model outputs at launch vs internal seed diligence bar',
    content: (
      <div className="space-y-8">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="p-5 font-semibold text-slate-700">Checkpoint</th>
                <th className="p-5 font-semibold text-slate-700">Studios</th>
                <th className="p-5 font-semibold text-slate-700">Brands</th>
                <th className="p-5 font-semibold text-slate-700">Monthly TX</th>
                <th className="p-5 font-semibold text-slate-700">MRR (illus.)</th>
                <th className="p-5 font-semibold text-slate-700">Gross profit (illus.)</th>
                <th className="p-5 font-semibold text-slate-700">Blended GM%</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: 'June-style launch footprint',
                  s: FIN.launch.studios,
                  b: FIN.launch.brands,
                  t: FIN.launch.tx,
                },
                { label: 'Seed KPI bar', s: FIN.seedBar.studios, b: FIN.seedBar.brands, t: FIN.seedBar.tx },
              ].map((row) => {
                const r = mrr(row.s, row.b, row.t);
                const g = grossProfitMonthly(row.s, row.b, row.t);
                const gm = blendedGrossMarginPct(row.s, row.b, row.t);
                return (
                  <tr key={row.label} className="border-b border-slate-100 last:border-0">
                    <td className="p-5 text-slate-700">{row.label}</td>
                    <td className="p-5 tabular-nums">{row.s}</td>
                    <td className="p-5 tabular-nums">{row.b}</td>
                    <td className="p-5 tabular-nums">{row.t}</td>
                    <td className="p-5 tabular-nums">${Math.round(r).toLocaleString()}</td>
                    <td className="p-5 tabular-nums">${Math.round(g).toLocaleString()}</td>
                    <td className="p-5 tabular-nums">{gm.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={`rounded-xl border border-slate-100 bg-slate-50 px-7 py-5 ${bodySm} space-y-3`}>
          <p>
            <span className="font-semibold text-slate-800">Marketplace gross profit</span> deducts Stripe on GMV per
            deal only. Heavy studio workflows (full script pipelines) modeled at ${FIN.fullScriptCost.toFixed(2)} each,
            multiplied by illustrative {FIN.scriptsPerStudioMo} runs per studio-month—booked against studio subscription economics, not deducted from Brand GMV.
          </p>
          <p>
            Seed KPI bar is <span className="font-semibold">{FIN.seedBar.studios}</span> /{' '}
            <span className="font-semibold">{FIN.seedBar.brands}</span> /{' '}
            <span className="font-semibold">{FIN.seedBar.tx}</span> — not assumed to arrive in one month; internal model paces recurring operating counts month over month (~2.5× MoM in conservative planning scenarios—verify with audited traction).
          </p>
        </div>
      </div>
    ),
  },
  {
    title: 'Product flow',
    subtitle: 'From script to staffed production',
    content: (
      <div className="grid md:grid-cols-4 gap-7 lg:gap-8">
        {[
          {
            step: 'Ingest',
            title: 'Script & scope',
            desc: 'Parse creative intent into production structure and resource needs.',
          },
          {
            step: 'Plan',
            title: 'Budget & schedule',
            desc: 'Align cost, calendars, and risk before commitments harden.',
          },
          {
            step: 'Match',
            title: 'Talent & crew',
            desc: 'Route opportunities to rostered talent and vetted specialists.',
          },
          {
            step: 'Operate',
            title: 'Shoot & settle',
            desc: 'Deliverables tracked through completion and payouts.',
          },
        ].map((item) => (
          <div key={item.step} className="rounded-2xl border border-slate-200 p-7 lg:p-8 flex flex-col gap-4 min-h-[200px]">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">{item.step}</p>
            <h4 className="text-xl font-semibold text-slate-900">{item.title}</h4>
            <p className={`${bodySm} leading-relaxed grow`}>{item.desc}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Opportunity sizing',
    subtitle: 'Demand signal from professional creators—not a substitute for your own underwriting',
    content: (
      <div className="grid gap-5 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-5 space-y-4">
          <p className={deckTight}>
            The pool of monetizing creators and brand-funded production is already huge; the product opportunity is software
            that increases <span className="font-semibold text-slate-900">velocity</span> on funded work.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-xl bg-gradient-to-br from-slate-900 to-blue-900 text-white p-5">
              <p className="text-3xl font-semibold tracking-tight">${Math.round(mrrAtSeedBar / 1000)}k</p>
              <p className="text-sm text-blue-100 mt-1 leading-snug">
                Illustrative MRR at internal seed KPI footprint ({FIN.seedBar.studios}/{FIN.seedBar.brands}/{FIN.seedBar.tx}).
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 flex justify-between items-end gap-4">
              <div>
                <p className="text-2xl font-semibold text-slate-900">${Math.round(gpAtSeedBar / 1000)}k</p>
                <p className={`${deckTightSm} mt-1`}>Illustrative gross profit / mo @ same KPI bar (~{gmAtSeedBar.toFixed(0)}% blended GM).</p>
              </div>
              <div className="text-right min-w-[7rem]">
                <TrendingUp className="inline w-8 h-8 text-emerald-600 mb-1" aria-hidden />
                <p className={`${deckTightSm}`}>More financed throughput → more monetizable workflows.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4 flex flex-col min-h-[220px]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2 px-1">
            Indexed penetration wedge (illustrative — diligence should replace with your underwriting)
          </p>
          <div className="flex-1 min-h-[196px]">
            <ResponsiveContainer width="100%" height="196">
              <BarChart
                layout="vertical"
                data={opportunityWedgeData}
                margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
                barCategoryGap={10}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 105]} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={200}
                  tick={{ fill: '#475569', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, 'indexed']}
                  contentStyle={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={20}>
                  {opportunityWedgeData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className={`${deckTightSm} text-slate-500 px-1 pt-3 border-t border-slate-100`}>
            Bars are <span className="font-medium text-slate-700">stylized relativities only</span>—anchors like $250B+ TAM
            remain third-party sizing you confirm independently.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: 'Moat',
    subtitle: 'Why this is hard to replicate with generic creative software',
    content: (
      <div className="space-y-4">
        <p className={`${deckTight} max-w-4xl`}>
          <span className="font-semibold text-slate-900">Capital + counterparties + deliverables</span> in one system create
          longitudinal signal—hard for horizontal creative tools to match without the same payment and milestone surface area.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            {
              icon: Building2,
              title: 'Vertical operating graph',
              text: 'Brief → scope → people → escrow → milestones on one rail.',
            },
            {
              icon: Shield,
              title: 'Trust & reconciliation',
              text: 'Statuses and payouts tied to fulfillment reduce dispute surface vs file-only workflows.',
            },
            {
              icon: Zap,
              title: 'Automation depth',
              text: 'Structured hires, disbursements, and scope changes train routing—not only chat.',
            },
            {
              icon: TrendingUp,
              title: 'Network routing',
              text: 'Each staffed job improves who you match next at which rate band.',
            },
          ].map((m) => {
            const Ico = m.icon;
            return (
              <div key={m.title} className="rounded-xl border border-slate-200 bg-white p-4 flex gap-3">
                <Ico className="w-9 h-9 text-blue-600 shrink-0" strokeWidth={1.5} aria-hidden />
                <div>
                  <h4 className="text-[15px] font-semibold text-slate-900">{m.title}</h4>
                  <p className={`${deckTightSm} mt-1`}>{m.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ),
  },
  {
    title: 'Use of angel capital',
    subtitle: 'Runway through Q3 2026 pacing toward seed readiness milestones',
    content: (
      <div className="space-y-12 lg:space-y-14">
        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              icon: Zap,
              title: 'Ship core OS',
              body: 'Agents, escrow and marketplace workflows, uptime, observability—what customers pay for.',
            },
            {
              icon: TrendingUp,
              title: 'Instrumentation',
              body: 'Measure every monetizing event—studio workloads, financed briefs, work started, crew hire—against revenue.',
            },
            {
              icon: DollarSign,
              title: 'Path to priced round',
              body: 'Close the funnel on diligence KPIs transparently rather than implying single-month jumps.',
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-10 flex flex-col gap-5 min-h-[200px]">
                <Icon className="w-11 h-11 text-blue-600" strokeWidth={1.75} />
                <h4 className="text-xl font-semibold text-slate-900">{item.title}</h4>
                <p className={body}>{item.body}</p>
              </div>
            );
          })}
        </div>
        <p className={`${body} max-w-4xl border-t border-slate-100 pt-10 text-slate-600`}>
          Capital concentrates on repeatable operating leverage—engineering, compliance scaffolding, onboarding—so angels
          can track progress against audited metrics tied to bookings and disbursements rather than anecdotal narratives.
        </p>
      </div>
    ),
  },
  {
    title: 'Investment opportunity',
    subtitle: 'Discuss allocation, timing, and materials',
    content: (
      <div className="flex flex-col items-center justify-center text-center gap-11 py-10 max-w-2xl mx-auto">
        <p className={`${body} text-slate-600`}>
          We welcome accredited investors aligned with disciplined execution toward a broader seed conversation. Detailed
          data room requests and references are coordinated through{' '}
          <a href="mailto:team@curbily.com" className="font-semibold text-blue-600 hover:underline">
            team@curbily.com
          </a>
          .
        </p>
        <a
          href="mailto:team@curbily.com"
          className="inline-flex items-center gap-3 rounded-xl bg-slate-900 px-12 py-5 text-lg text-white font-semibold hover:bg-slate-800 transition-colors"
        >
          Schedule a conversation
          <ArrowRight className="w-5 h-5" />
        </a>
        <p className={`${bodySm} text-slate-500 uppercase tracking-[0.12em]`}>Pre-seed / angel round</p>
      </div>
    ),
  },
  {
    title: 'Seed readiness — roadmap',
    subtitle: 'Operating counts compound (2.5× MoM) toward separate KPI checkpoints',
    content: (
      <div className="space-y-3">
        <p className={deckTightSm}>
          <span className="font-semibold text-slate-800">2.5× MoM</span> multiplies rounded month-end studios, brands, and
          marketplace TX versus the prior month (≈<span className="font-semibold">+150%</span> vs prior). It is a planning
          mechanic—not a claim that KPI bars arrive in one step.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-[12px] sm:text-[13px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-2.5 font-semibold text-slate-700">Month</th>
                <th className="p-2.5 font-semibold text-slate-700 tabular-nums">Studios</th>
                <th className="p-2.5 font-semibold text-slate-700 tabular-nums">Brands</th>
                <th className="p-2.5 font-semibold text-slate-700 tabular-nums">Mo. TX</th>
                <th className="p-2.5 font-semibold text-slate-700 tabular-nums">MRR (~)</th>
                <th className="p-2.5 font-semibold text-slate-700 tabular-nums">GP (model)</th>
                <th className="p-2.5 font-semibold text-slate-700">Step</th>
              </tr>
            </thead>
            <tbody>
              {momOperatingRows.map((r) => {
                const mr = mrr(r.studios, r.brands, r.tx);
                const gp = grossProfitMonthly(r.studios, r.brands, r.tx);
                return (
                  <tr key={r.label} className="border-b border-slate-100">
                    <td className="p-2.5 text-slate-700">{r.label}</td>
                    <td className="p-2.5 tabular-nums">{r.studios}</td>
                    <td className="p-2.5 tabular-nums">{r.brands}</td>
                    <td className="p-2.5 tabular-nums">{r.tx}</td>
                    <td className="p-2.5 tabular-nums">${Math.round(mr).toLocaleString()}</td>
                    <td className="p-2.5 tabular-nums">${Math.round(gp).toLocaleString()}</td>
                    <td className="p-2.5 text-slate-600">{r.prevLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className={deckTightSm}>
          Internal diligence bar (not assumed simultaneous with the compounded path above):{' '}
          <span className="font-semibold">{FIN.seedBar.studios}</span> studios /{' '}
          <span className="font-semibold">{FIN.seedBar.brands}</span> brands /{' '}
          <span className="font-semibold">{FIN.seedBar.tx}</span> monthly TX—benchmark how you cite traction.
        </p>
      </div>
    ),
  },
  {
    title: 'Seed readiness — economics',
    subtitle: 'Unit economics, checkpoints, and platform velocity definitions',
    content: (
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-[12px] sm:text-[13px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-2.5 font-semibold text-slate-700">Metric</th>
                <th className="p-2.5 font-semibold text-slate-700">Model value</th>
                <th className="p-2.5 font-semibold text-slate-700">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="p-2.5 text-slate-700">Avg. escrow GMV / deal</td>
                <td className="p-2.5 tabular-nums">${FIN.avgGmv.toLocaleString()}</td>
                <td className="p-2.5 text-slate-600">Illustrative AOV</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="p-2.5 text-slate-700">Take</td>
                <td className="p-2.5">${takePerDeal.toFixed(2)}</td>
                <td className="p-2.5 text-slate-600">{FIN.takeRate * 100}% of GMV → marketplace revenue line</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="p-2.5 text-slate-700">Stripe on GMV</td>
                <td className="p-2.5">${stripeOnGmv.toFixed(2)}</td>
                <td className="p-2.5 text-slate-600">{FIN.stripeRate * 100}% + ${FIN.stripeFixed}; payer-of-fees can move this</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="p-2.5 text-slate-700">Contribution after Stripe</td>
                <td className="p-2.5">${contribFromTake.toFixed(2)}</td>
                <td className="p-2.5 text-slate-600">{marginOnTakePct.toFixed(1)}% of take; studio AI not netted vs Brand GMV</td>
              </tr>
              <tr>
                <td className="p-2.5 text-slate-700">Studio AI COGS example @ KPI bar</td>
                <td className="p-2.5">${(FIN.seedBar.studios * FIN.scriptsPerStudioMo * FIN.fullScriptCost).toFixed(2)}</td>
                <td className="p-2.5 text-slate-600">
                  {FIN.seedBar.studios} × {FIN.scriptsPerStudioMo} full scripts × ${FIN.fullScriptCost}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-[12px] sm:text-[13px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-2.5 font-semibold text-slate-700">Checkpoint</th>
                <th className="p-2.5 font-semibold text-slate-700 tabular-nums">S / B / TX</th>
                <th className="p-2.5 font-semibold text-slate-700 tabular-nums">MRR (~)</th>
                <th className="p-2.5 font-semibold text-slate-700 tabular-nums">Blended GM</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  lab: 'Launch footprint',
                  s: FIN.launch.studios,
                  b: FIN.launch.brands,
                  t: FIN.launch.tx,
                },
                { lab: 'Seed KPI bar', s: FIN.seedBar.studios, b: FIN.seedBar.brands, t: FIN.seedBar.tx },
                {
                  lab: 'Post-seed compass (later)',
                  s: FIN.postSeedCompass.studios,
                  b: FIN.postSeedCompass.brands,
                  t: FIN.postSeedCompass.tx,
                },
              ].map((row) => (
                <tr key={row.lab} className="border-b border-slate-100 last:border-0">
                  <td className="p-2.5 text-slate-700">{row.lab}</td>
                  <td className="p-2.5 tabular-nums">
                    {row.s}/{row.b}/{row.t}
                  </td>
                  <td className="p-2.5 tabular-nums">${Math.round(mrr(row.s, row.b, row.t)).toLocaleString()}</td>
                  <td className="p-2.5 tabular-nums">{blendedGrossMarginPct(row.s, row.b, row.t).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1.5">
            Velocity events (tracked against revenue)
          </p>
          <ul className={`${deckTightSm} grid sm:grid-cols-2 gap-x-6 gap-y-1`}>
            <li>
              • <span className="font-semibold text-slate-800">Studio TX</span> — breakdown / schedule automation uptake
            </li>
            <li>
              • <span className="font-semibold text-slate-800">Brand bid</span> — offer surfaced to talent
            </li>
            <li>
              • <span className="font-semibold text-slate-800">Work started</span> — deliverables live in workspace
            </li>
            <li>
              • <span className="font-semibold text-slate-800">Talent hire</span> — crew hired from pooled roster
            </li>
          </ul>
        </div>
      </div>
    ),
  },
];

export default function InvestmentMemo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const isPrintMode = searchParams.get('print') === 'true';
  const exportPdfFilter = searchParams.get('export');
  const slidesToExport = React.useMemo(() => {
    if (exportPdfFilter !== 'seed') return slides;
    const i = slides.findIndex((s) => s.title.startsWith('Seed readiness'));
    return i >= 0 ? slides.slice(i) : slides;
  }, [exportPdfFilter]);

  const NO_SCROLL_SLIDE_INDEX = new Set([
    INDEX_VISION_SLIDE,
    INDEX_CUSTOMERS_SLIDE,
    INDEX_MOAT_SLIDE,
  ]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  const downloadMemo = () => {
    window.open('/curbily-investor-memo.md', '_blank');
  };

  const exportRealPDF = () => {
    window.open(window.location.pathname + '?print=true', '_blank');
  };

  React.useEffect(() => {
    if (!isPrintMode) return;
    if (searchParams.get('autoprint') === 'false') return;
    const t = window.setTimeout(() => {
      window.print();
    }, 1000);
    return () => window.clearTimeout(t);
  }, [isPrintMode, searchParams]);

  return (
    <div className={`min-h-screen bg-slate-50 ${isPrintMode ? 'print:bg-white print:p-0' : ''}`}>
      <div
        id="pdf-export-container"
        className={
          isPrintMode ? 'w-[1024px] bg-white print:block' : 'absolute pointer-events-none'
        }
        style={!isPrintMode ? { top: 0, left: '-9999px', width: '1024px', zIndex: -100 } : undefined}
      >
        {slidesToExport.map((slide, i) => (
          <div
            key={`${slide.title}-${i}`}
            className="export-slide w-[1024px] min-h-[768px] p-10 flex flex-col bg-white relative break-after-page border-b border-slate-100 print:border-none"
          >
            <div className="w-full max-w-4xl mx-auto flex flex-col grow">
              <div className="mb-6 shrink-0">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900 mb-1.5">{slide.title}</h2>
                <p className="text-[15px] text-slate-500 leading-snug max-w-prose">{slide.subtitle}</p>
              </div>
              <div className="flex-1 min-h-0">{slide.content}</div>
            </div>
          </div>
        ))}
      </div>

      {!isPrintMode && (
        <div className="print:hidden min-h-screen flex flex-col bg-slate-50">
          <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 leading-tight">Curbily</p>
                  <p className="text-[11px] text-slate-500">Investment deck</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {currentSlide + 1} / {slides.length}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 border-slate-200 bg-white">
                      {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Export
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 border-slate-200 bg-white">
                    <DropdownMenuItem onClick={downloadMemo} className="text-sm gap-2 cursor-pointer">
                      <FileText className="h-4 w-4" />
                      Investor one-pager
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportRealPDF} disabled={isExporting} className="text-sm gap-2 cursor-pointer">
                      <FileDown className="h-4 w-4 text-blue-600" />
                      Print / Save as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-slate-600">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Exit
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 flex flex-col pb-28">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="mx-auto w-full max-w-6xl flex-1 flex flex-col px-6 lg:px-8 py-10 lg:py-16 min-h-0"
              >
                <header className="mb-8 lg:mb-12 shrink-0">
                  <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-tight text-slate-900 mb-4">
                    {slides[currentSlide].title}
                  </h1>
                  <p className="text-xl text-slate-500 max-w-4xl leading-relaxed">{slides[currentSlide].subtitle}</p>
                </header>
                <div
                  className={`flex-1 min-h-0 pr-2 pb-2 ${
                    NO_SCROLL_SLIDE_INDEX.has(currentSlide) ? 'overflow-hidden' : 'overflow-y-auto'
                  }`}
                >
                  <div className="max-w-6xl pb-6">{slides[currentSlide].content}</div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur-sm py-5 z-40">
            <div className="mx-auto flex max-w-6xl items-center justify-center gap-10 px-6">
              <Button
                variant="outline"
                size="icon"
                onClick={prevSlide}
                className="h-12 w-12 rounded-full border-slate-200"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <div className="flex gap-2 max-w-md flex-wrap justify-center">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === currentSlide}
                    className={`h-2 rounded-full transition-all ${i === currentSlide ? 'w-8 bg-slate-900' : 'w-2 bg-slate-200 hover:bg-slate-400'}`}
                    onClick={() => setCurrentSlide(i)}
                  />
                ))}
              </div>
              <Button
                size="icon"
                onClick={nextSlide}
                className="h-12 w-12 rounded-full bg-slate-900 hover:bg-slate-800"
                aria-label="Next slide"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}