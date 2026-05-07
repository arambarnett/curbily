import React from 'react';
import { ArrowRight, BadgeDollarSign, Briefcase, CheckCircle2, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

export default function InfluencerMarketplace() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#0a0a0a] overflow-hidden">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-[#f7f6f2]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <button onClick={() => navigate('/landing')} className="text-xl font-black tracking-tighter">Curbily</button>
          <div className="hidden items-center gap-6 md:flex">
            <button onClick={() => navigate('/brands')} className="text-[10px] font-black uppercase tracking-[0.24em] hover:opacity-60">For Brands</button>
            <button onClick={() => navigate('/managers')} className="text-[10px] font-black uppercase tracking-[0.24em] hover:opacity-60">For Managers</button>
            <Button onClick={() => navigate('/brands')} className="rounded-full bg-black px-6 text-white hover:bg-slate-800">
              Create Account
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="absolute -left-40 top-20 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -right-40 bottom-20 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />

          <div className="relative z-10 space-y-8">
            <Badge className="rounded-full border-none bg-blue-600 px-4 py-1 text-white">Creator Marketplace</Badge>
            <h1 className="max-w-4xl text-6xl font-black uppercase leading-[0.83] tracking-tighter md:text-[116px]">
              Real creators. Real managers. Real picks.
            </h1>
            <p className="max-w-2xl text-xl font-medium leading-relaxed text-slate-500">
              Curbily turns the manual influencer email workflow into an account-based marketplace. Brands post briefs, managers submit ten qualified creators, and brands pick the three they want to move forward with.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button onClick={() => navigate('/brands')} className="h-16 rounded-2xl bg-blue-600 px-8 text-[10px] font-black uppercase tracking-[0.22em] text-white hover:bg-blue-700">
                Create Brand Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button onClick={() => navigate('/managers')} className="h-16 rounded-2xl bg-black px-8 text-[10px] font-black uppercase tracking-[0.22em] text-white hover:bg-slate-800">
                Create Manager Account
              </Button>
            </div>

            <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
              {[
                ['1', 'Brand submits budget brief'],
                ['2', 'Managers send ten names'],
                ['3', 'Brand selects three'],
              ].map(([step, label]) => (
                <Card key={step} className="rounded-3xl border-2 border-black bg-white shadow-[5px_5px_0_#000]">
                  <CardContent className="p-5">
                    <div className="text-3xl font-black">{step}</div>
                    <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-500">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <Card className="overflow-hidden rounded-[2.75rem] border-[3px] border-black bg-black text-white shadow-[14px_14px_0_#2563eb]">
              <CardContent className="space-y-8 p-8 md:p-10">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-400">Brand Access</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-7xl font-black tracking-tighter">$199</span>
                      <span className="text-sm font-black uppercase tracking-widest text-white/40">/ month</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-amber-400/30 bg-amber-400/10 text-amber-200">Not enabled yet</Badge>
                </div>

                <p className="text-sm leading-relaxed text-white/55">
                  Billing is planned, but disabled for now. The current CTA is account creation so brands and managers can start onboarding into the marketplace.
                </p>

                <div className="grid gap-3">
                  {[
                    [BadgeDollarSign, 'Budget-first briefs replace subject-line rate emails'],
                    [Users, 'Manager rosters keep real people in the loop'],
                    [CheckCircle2, 'Brands shortlist exactly three creators'],
                    [Sparkles, 'Future AI matching ranks creators by fit and minimums'],
                  ].map(([Icon, text]) => (
                    <div key={text as string} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-3">
                        {React.createElement(Icon as typeof Sparkles, { className: 'h-4 w-4 text-blue-400' })}
                        <span className="text-xs font-black uppercase tracking-widest text-white/80">{text as string}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/25" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y border-black/10 bg-white px-6 py-20">
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
            <AudienceCard
              icon={<Briefcase className="h-7 w-7" />}
              title="For Brands"
              body="Create an account, submit a campaign brief, set the budget, and review shortlists from manager-submitted rosters."
              cta="Start as a Brand"
              onClick={() => navigate('/brands')}
            />
            <AudienceCard
              icon={<Users className="h-7 w-7" />}
              title="For Managers"
              body="Create an account, upload creator rosters with channels, genres, follower counts, and minimum rates, then submit ten-name shortlists."
              cta="Start as a Manager"
              onClick={() => navigate('/managers')}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function AudienceCard({ icon, title, body, cta, onClick }: { icon: React.ReactNode; title: string; body: string; cta: string; onClick: () => void }) {
  return (
    <Card className="rounded-[2rem] border-2 border-slate-200 bg-[#f8f8f7] transition hover:-translate-y-1 hover:shadow-xl">
      <CardContent className="space-y-8 p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">{icon}</div>
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter">{title}</h2>
          <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-slate-500">{body}</p>
        </div>
        <Button onClick={onClick} className="h-12 rounded-xl bg-black px-6 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800">
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}
