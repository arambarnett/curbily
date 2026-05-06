import React from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, 
  ShieldCheck, 
  Zap, 
  Users, 
  ArrowRight, 
  CheckCircle2,
  Camera,
  Briefcase,
  Store,
  User,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NetworkInfo() {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: Zap,
      title: "AI-Powered Matching",
      desc: "Our agents analyze script requirements and match them directly to your skills, gear, and availability."
    },
    {
      icon: ShieldCheck,
      title: "Verified Network",
      desc: "Join an elite circle of production professionals. Every member is verified to ensure high-quality execution."
    },
    {
      icon: Globe,
      title: "Global Opportunities",
      desc: "Access productions happening worldwide. Whether you're local or willing to travel, we find the work for you."
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-600/10 blur-[100px] rounded-full"></div>
      </div>

      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center mix-blend-difference">
        <div className="text-xl font-black tracking-tighter cursor-pointer" onClick={() => navigate('/landing')}>CURBILY</div>
        <div className="flex gap-4 items-center">
          <button onClick={() => navigate('/login?mode=talent')} className="text-[10px] font-black uppercase tracking-widest hover:opacity-70 transition-opacity">Crew Login</button>
          <Button 
            onClick={() => navigate('/join')}
            className="rounded-full px-8 py-3 bg-white text-black hover:bg-slate-200 border-none text-[10px] font-black uppercase tracking-[0.2em] h-auto"
          >
            Join
          </Button>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex flex-col justify-center pt-32 pb-20 px-6 md:px-12 lg:px-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-6xl"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-1 bg-blue-500"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Global Production Engine</span>
            </div>
            
            <h1 className="text-[12vw] lg:text-[140px] leading-[0.8] font-black tracking-tighter mb-12 uppercase">
              TALENT <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 italic font-medium text-wrap">NETWORK.</span>
            </h1>

            <p className="text-xl lg:text-3xl text-white/50 max-w-2xl mb-16 leading-tight font-medium">
              Join elite crew members. We match your skills to projects with real budgets, optimized for Digital Content production.
            </p>

            <div className="flex flex-col sm:flex-row gap-6">
              <Button 
                onClick={() => navigate('/join')}
                className="rounded-[2rem] px-12 py-10 bg-white text-[#000000] hover:bg-slate-200 text-2xl font-black uppercase tracking-tighter group h-auto"
              >
                Apply to Join
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <button className="flex items-center px-8 border border-white/10 rounded-[2rem] bg-white text-[#000000] cursor-default pointer-events-none">
                 <p className="text-[10px] font-black uppercase tracking-widest">Zero Cost. Professional Only.</p>
              </button>
            </div>
          </motion.div>
        </section>

        {/* Benefits Grid */}
        <section className="py-32 bg-white text-black px-6 md:px-12 lg:px-24 rounded-t-[4rem]">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-24">
              {benefits.map((benefit, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="space-y-8"
                >
                  <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center">
                    <benefit.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tight leading-none">{benefit.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">{benefit.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section className="py-32 px-6 md:px-12 lg:px-24 bg-white text-black">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
               <div className="max-w-2xl">
                  <h2 className="text-6xl md:text-[90px] font-black uppercase tracking-tighter leading-[0.85] mb-8 text-black">VERIFIED <br />CREDITS.</h2>
                  <p className="text-xl text-slate-500 font-medium">We're hunting for specialized talent across all sectors of the digital content ecosystem.</p>
               </div>
               <Badge variant="outline" className="border-black/10 text-black/40 py-3 px-6 rounded-full font-black uppercase tracking-widest text-[10px]">Database Open</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "Actors", icon: User, roles: ["Lead Actors", "Digital Content Leads", "Influencers", "Stunt Choreographers"], color: "bg-blue-600" },
                { title: "Crew", icon: Briefcase, roles: ["DPs (9:16)", "Gaffers", "Sound Mixers", "Digital Content Editors"], color: "bg-purple-600" },
                { title: "Vendors", icon: Store, roles: ["Equipment Hire", "Catering", "Location Scouts", "Logistics"], color: "bg-emerald-600" }
              ].map((category, i) => (
                <div key={i} className="p-12 rounded-[3rem] border-2 border-slate-100 hover:border-black transition-all group flex flex-col justify-between aspect-square relative overflow-hidden">
                  <category.icon className="absolute top-12 right-12 w-24 h-24 text-slate-50 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all" />
                  <div>
                    <h3 className="text-5xl font-black uppercase tracking-tight mb-12 leading-none text-black">{category.title}</h3>
                    <ul className="space-y-6">
                      {category.roles.map((role, j) => (
                        <li key={j} className="flex items-center gap-3 text-black font-bold uppercase tracking-widest text-xs">
                          <div className={cn("w-2 h-2 rounded-full", category.color)}></div>
                          {role}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-48 px-12 lg:px-24 bg-black text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 border border-white/5 rounded-full blur-[120px]"></div>
          </div>
          
          <div className="relative z-10">
            <h2 className="text-8xl md:text-[180px] font-black uppercase tracking-tighter leading-[0.75] mb-12">STOP <br />WAITING.</h2>
            <p className="text-xl md:text-3xl text-white/40 mb-16 max-w-2xl mx-auto font-medium">
              Digital content is a $10B industry. Get your credits in the system and start booking high-frequency work.
            </p>
            <Button 
              onClick={() => navigate('/join')}
              className="rounded-[2.5rem] px-24 py-12 bg-white text-black hover:bg-slate-200 text-4xl font-black uppercase tracking-tighter h-auto shadow-[0_40px_100px_rgba(255,255,255,0.1)] hover:scale-105 transition-all"
            >
              Join the Network
            </Button>
          </div>
        </section>
      </main>

      {/* Footer Rail */}
      <footer className="px-8 py-16 bg-black border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-12 text-white/20">
        <div className="text-xl font-black tracking-tighter">CURBILY</div>
        <div className="flex gap-12 text-[10px] uppercase font-black tracking-[0.3em]">
          <button className="hover:text-white transition-colors">Terms</button>
          <button className="hover:text-white transition-colors">Privacy</button>
          <button className="hover:text-white transition-colors">Support</button>
        </div>
        <div className="text-[10px] uppercase font-black tracking-[0.3em]">
          © 2026 Curbily SYSTEMS
        </div>
      </footer>
    </div>
  );
}
