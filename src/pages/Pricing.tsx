import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Zap, Building2, Globe, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Pricing() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-600/10 blur-[100px] rounded-full"></div>
      </div>

      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center mix-blend-difference">
        <div className="text-xl font-black tracking-tighter cursor-pointer" onClick={() => navigate('/landing')}>CURBILY</div>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/landing')}
          className="text-white hover:bg-white/10 font-black uppercase tracking-widest text-[10px]"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </nav>

      <main className="relative z-10 pt-32 pb-24 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
            <Zap className="w-3 h-3 text-blue-400 fill-blue-400" />
            <span className="text-[10px] uppercase tracking-[0.25em] font-black text-white/60">Scale Your Production</span>
          </div>

          <h1 className="text-6xl md:text-8xl lg:text-[100px] leading-[0.8] font-black tracking-tighter uppercase mb-8">
            TRANSPARENT <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 italic">COSTS.</span>
          </h1>
          
          <p className="text-xl text-white/40 max-w-2xl mx-auto mb-12 font-medium">
            Choose the tier that fits your production scale. All plans include automated agent sequences and digital content optimization.
          </p>

          <div className="flex items-center justify-center gap-6 bg-white/5 p-2 rounded-2xl w-fit mx-auto border border-white/10">
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${billingCycle === 'monthly' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${billingCycle === 'annual' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
            >
              Annual <span className="ml-1 opacity-60">-20%</span>
            </button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Producer Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="group relative p-12 rounded-[2.5rem] bg-white/5 border border-white/10 flex flex-col justify-between hover:border-blue-500/50 transition-all"
          >
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <div className="p-4 rounded-2xl bg-blue-600/10 text-blue-400">
                  <Building2 className="w-8 h-8" />
                </div>
                <Badge className="bg-blue-600 text-white border-none text-[10px] uppercase font-black tracking-widest">Most Popular</Badge>
              </div>

              <div>
                <h3 className="text-4xl font-black uppercase tracking-tight mb-2">Producer</h3>
                <p className="text-white/40 text-sm font-medium">Full access to the autonomous production pipeline.</p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-7xl font-black">${billingCycle === 'annual' ? '30' : '39'}</span>
                <span className="text-white/20 font-black uppercase tracking-widest text-[10px]">/ Month</span>
              </div>

              <ul className="space-y-4">
                {[
                  "1 free Master Run included per month",
                  "AI Breakdown & Basic Scheduling",
                  "Automated Budgeting & Top Sheets",
                  "AI Outreach (Email/Text)",
                  "SAG-AFTRA, DGA, WGA Engine",
                  "Complex DOOD & Call Sheets",
                  "Strict Accounting Exports"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white/60">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button onClick={() => navigate('/login?mode=producer')} className="w-full h-20 bg-white text-black hover:bg-slate-200 mt-12 rounded-2xl text-lg font-black uppercase tracking-tighter">
              Start Producing
            </Button>
          </motion.div>

          {/* Studios Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="group relative p-12 rounded-[2.5rem] bg-white/5 border border-white/10 flex flex-col justify-between hover:border-purple-500/50 transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="space-y-8 relative z-10">
              <div className="p-4 rounded-2xl bg-purple-600/10 text-purple-400 w-fit">
                <Globe className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-4xl font-black uppercase tracking-tight mb-2">Studios</h3>
                <p className="text-white/40 text-sm font-medium">Enterprise-grade scale for production houses.</p>
              </div>

              <div>
                <span className="text-5xl font-black italic tracking-tighter">Custom Pricing</span>
              </div>

              <ul className="space-y-4">
                {[
                  "Unlimited Master Runs",
                  "Custom Agent Training (Your Style)",
                  "Team Collaboration & Hierarchy",
                  "Custom Legal & Contract Templates",
                  "White-label Talent Portal",
                  "API Access & Custom Webhooks",
                  "Priority 24/7 Agent Support"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white/60">
                    <Check className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button 
              onClick={() => document.getElementById('calendly-section')?.scrollIntoView({ behavior: 'smooth' })} 
              variant="outline"
              className="w-full h-20 border-white/10 text-white hover:bg-white/10 mt-12 rounded-2xl text-lg font-black uppercase tracking-tighter relative z-10"
            >
              Book a Demo
            </Button>
          </motion.div>
        </div>

        {/* Compute Add-on */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-r from-blue-600/20 to-transparent border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <h3 className="text-2xl font-black uppercase tracking-tight">Additional Compute</h3>
              <Badge className="bg-white/10 text-white/60 border-none text-[8px] uppercase font-black tracking-widest">Pay As You Go</Badge>
            </div>
            <p className="text-white/40 max-w-md text-sm font-medium">
              Need more AI power? Be billed for additional production runs once your included monthly limit is exhausted.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <span className="text-[64px] font-black leading-none">$6 <span className="text-sm font-normal text-white/20 uppercase tracking-widest">/ Run</span></span>
          </div>
        </motion.div>

        {/* Support CTA */}
        <div className="mt-32 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-8">Ready to evolve?</p>
          <div className="space-y-4">
            <h2 className="text-4xl font-black uppercase tracking-tighter">Enterprise Needs?</h2>
            <a href="mailto:contact@curbily.com" className="inline-flex items-center gap-2 text-xl font-bold border-b-2 border-white hover:text-white/60 hover:border-white/60 transition-all pb-1">
              Contact for Volume Pricing
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </main>

      {/* Footer Rail */}
      <footer className="fixed bottom-0 w-full px-8 py-4 flex justify-between items-center text-[10px] uppercase tracking-[0.3em] font-black opacity-40 mix-blend-difference text-white pointer-events-none">
        <div>© 2026 Curbily</div>
        <div className="flex gap-8 pointer-events-auto">
          <button onClick={() => navigate('/terms')} className="hover:opacity-100 transition-opacity">Terms</button>
          <button onClick={() => navigate('/privacy')} className="hover:opacity-100 transition-opacity">Privacy</button>
        </div>
        <div>ALL RIGHTS RESERVED</div>
      </footer>
    </div>
  );
}
