import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Target, 
  Zap, 
  ArrowRight, 
  Briefcase, 
  TrendingUp, 
  Globe,
  Building2,
  Camera,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

import PasswordGate from '../components/common/PasswordGate';

const outreachSegments = [
  {
    id: 'influencers',
    title: "Influencers & Digital Creators",
    icon: Camera,
    color: "bg-blue-500",
    targets: [
      "Mid-tier YouTube Creators ($100k-$500k revenue)",
      "High-output Instagram/TikTok collectives",
      "MrBeast-style production houses looking for efficiency"
    ],
    pitch: "You are a mini-studio. Stop losing 40% of your time to spreadsheets and booking logistics. Curbily gives you a professional AD and Producer in your browser.",
    cta: "Scale your reach without increasing your burnout."
  },
  {
    id: 'managers',
    title: "Talent Managers & Agencies",
    icon: Briefcase,
    color: "bg-amber-500",
    targets: [
      "CAA, WME Digital Departments",
      "Independent Creator Management firms",
      "Studio Ops directors"
    ],
    pitch: "Enable your roster to produce higher quality long-form content for streamers. Give your talent the infrastructure to turn a brand deal into a production reality in 60 seconds.",
    cta: "Professionalize your roster's output."
  },
  {
    id: 'studios',
    title: "Production Studios & Networks",
    icon: Building2,
    color: "bg-purple-500",
    targets: [
      "Digital-first production companies (e.g., Rooster Teeth, Night Media)",
      "Fast-turnaround unscripted studios",
      "Network digital wings (NBC/CBS digital teams)"
    ],
    pitch: "Transition from legacy Movie Magic workflows to real-time autonomous agents. Reduce your overhead by 30% by automating breakdown and scheduling logic.",
    cta: "Define the digital production standard."
  }
];

export default function TargetOutreach() {
  const navigate = useNavigate();

  return (
    <PasswordGate storageKey="outreach">
    <div className="min-h-screen bg-slate-50 selection:bg-slate-900 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-xl tracking-tighter">CURBILY</span>
        </div>
        <Button variant="ghost" onClick={() => navigate('/landing')} className="gap-2 font-bold uppercase tracking-widest text-[10px]">
          Back to Site
        </Button>
      </nav>

      <main className="pt-32 pb-24 px-8 max-w-6xl mx-auto">
        <div className="mb-16">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full">Strategic Lead Gen</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter mb-6 uppercase italic">
            High-Value <br />
            <span className="text-slate-400">Outreach Targets</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl leading-relaxed">
            These are the three core segments we can capture right now. Use these specific angles to pitch the immediate value of Curbily.
          </p>
        </div>

        <div className="grid gap-8">
          {outreachSegments.map((segment, i) => (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white border-2 border-slate-900 rounded-[2.5rem] p-12 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)]"
            >
              <div className="grid md:grid-cols-[1fr_2fr] gap-12">
                <div className="space-y-6">
                  <div className={`w-16 h-16 ${segment.color} rounded-2xl flex items-center justify-center text-white`}>
                    <segment.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight mb-2 uppercase italic">{segment.title}</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Primary Segment {i + 1}</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">The Target List</h4>
                    <ul className="space-y-3">
                      {segment.targets.map((target, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                          <Target className="w-4 h-4 text-slate-300" />
                          {target}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">The Pitch Angle</h4>
                    <p className="text-lg font-bold text-slate-900 leading-snug">
                      "{segment.pitch}"
                    </p>
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                      <Zap className="w-4 h-4" />
                      {segment.cta}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-24 bg-slate-900 rounded-[3rem] p-16 text-white text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-8 text-blue-400" />
          <h2 className="text-4xl font-black mb-6 uppercase tracking-tighter italic">Why Outreach Now?</h2>
          <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto text-left py-12">
            {[
              { title: "First Mover", text: "Legacy media hasn't figured out creator infrastructure. We own the standard." },
              { title: "Production Glut", text: "Creators are drowning in brand deals with no way to execute high-quality sets." },
              { title: "Network Effect", text: "Every vendor and crew member on the platform is a potential node for growth." }
            ].map((item, i) => (
              <div key={i} className="space-y-3">
                <div className="text-blue-400 font-black text-2xl tracking-tighter italic uppercase">{item.title}</div>
                <p className="text-slate-400 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 mb-8">
          <h2 className="text-3xl font-black tracking-tighter mb-8 uppercase italic">Email Templates</h2>
          
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-8 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold">Funding Announcement Draft</h3>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
{`Hi [Name],

Hope you've been doing well!

I wanted to send a quick note because I'm getting ready to open a funding round for my company, Curbily, and I wanted to share the news with you first since you know how passionate I am about this space.

Over the last several months, we've built an AI-driven production management platform specifically designed to handle breakdowns, budgets, scheduling, and sourcing. Curbily effectively operates as a digital Line Producer and 1st AD—automating the chaotic logistics of entertainment and physical event production, so creators and studios can focus purely on execution.

We recently smashed through some big technical milestones, pushed a huge update, and are now gearing up to scale our network of employers and talent.

I'm raising [Amount, e.g., $500k] to accelerate our go-to-market strategy and expand the engineering team. I'd love to grab 15 minutes next week to show you the live product and share our traction.

Do you have some time on [Day of week] or [Day of week]?

Best,
Jon`}
            </div>
          </div>
        </div>
      </main>

      <footer className="px-8 py-12 border-t border-slate-100 text-center">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          © 2026 Curbily Growth Strategy — Internal Use Only
        </p>
      </footer>
    </div>
    </PasswordGate>
  );
}
