import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shield, Zap, Globe, ArrowRight, Menu, X, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import CalendlyEmbed from '@/components/common/CalendlyEmbed';

export default function Landing() {
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#f8f8f7] text-[#0a0a0a] font-sans selection:bg-[#0a0a0a] selection:text-white overflow-x-hidden">
      {/* Background Grid Accent */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ 
        backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }}></div>
      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 w-full z-50 px-4 md:px-8 py-4 md:py-6 flex justify-between items-center transition-all duration-300",
        isMenuOpen ? "bg-white text-[#0a0a0a] shadow-lg" : "mix-blend-difference text-white"
      )}>
        <div className="text-lg md:text-xl font-bold tracking-tighter">Curbily</div>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex gap-8 items-center">
          <button onClick={() => navigate('/pricing')} className="text-sm font-medium uppercase tracking-widest hover:opacity-70 transition-opacity">Pricing</button>
          <button onClick={() => document.getElementById('calendly-section')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-medium uppercase tracking-widest hover:opacity-70 transition-opacity">Book Demo</button>
          <button onClick={() => navigate('/network-info')} className="text-sm font-medium uppercase tracking-widest hover:opacity-70 transition-opacity">Network</button>
          <button onClick={() => navigate('/influencer-marketplace')} className="text-sm font-medium uppercase tracking-widest hover:opacity-70 transition-opacity">Brands</button>
          <button onClick={() => {
            localStorage.setItem('target_view_mode', 'talent');
            navigate('/login?mode=talent');
          }} className="text-sm font-medium uppercase tracking-widest hover:opacity-70 transition-opacity">Crew Login</button>
          <Button 
            onClick={() => {
              localStorage.setItem('target_view_mode', 'producer');
              navigate('/login?mode=producer');
            }}
            className="rounded-full px-8 py-6 bg-white text-black hover:bg-white/90 border-none text-sm font-bold uppercase tracking-widest h-auto"
          >
            Studio Login
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={cn(
            "md:hidden p-2 transition-colors",
            isMenuOpen ? "text-[#0a0a0a]" : "text-white"
          )}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="absolute top-full left-0 right-0 bg-white text-[#0a0a0a] p-8 border-t border-black/5 flex flex-col gap-8 md:hidden shadow-2xl overflow-hidden backdrop-blur-xl"
            >
              <div className="flex flex-col gap-6">
                <button onClick={() => { setIsMenuOpen(false); navigate('/pricing'); }} className="text-2xl font-black uppercase tracking-tighter text-left">Pricing</button>
                <button onClick={() => { setIsMenuOpen(false); navigate('/network-info'); }} className="text-2xl font-black uppercase tracking-tighter text-left">Network</button>
                <button onClick={() => { setIsMenuOpen(false); navigate('/influencer-marketplace'); }} className="text-2xl font-black uppercase tracking-tighter text-left">Brands</button>
                <button onClick={() => { 
                  setIsMenuOpen(false); 
                  localStorage.setItem('target_view_mode', 'talent');
                  navigate('/login?mode=talent'); 
                }} className="text-2xl font-black uppercase tracking-tighter text-left">Crew Login</button>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <Button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    localStorage.setItem('target_view_mode', 'producer');
                    navigate('/login?mode=producer');
                  }}
                  className="rounded-2xl w-full py-6 bg-[#0a0a0a] text-white hover:bg-slate-800 border-none text-xs font-black uppercase tracking-[0.2em] h-auto shadow-xl"
                >
                  Studio Login
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="min-h-screen">
        {/* Cinematic Hero Section */}
        <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 px-6 overflow-hidden bg-black">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/30 blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/30 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>

          <div className="relative z-10 text-center max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
                <Zap className="w-4 h-4 text-blue-400 fill-blue-400" />
                <span className="text-[10px] uppercase tracking-[0.25em] font-black text-white/80">Built for Creators</span>
              </div>
              
              <h1 className="text-[14vw] lg:text-[160px] leading-[0.8] font-black tracking-tighter text-white mb-8">
                CREATE <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">CONTENT</span> <br />
                AT SCALE.
              </h1>

              <p className="text-lg md:text-2xl text-white/60 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
                The first agentic production suite for creators, digital content studios, and short-form filmmakers. 
                Script to shoot in minutes, not weeks.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  onClick={() => {
                    localStorage.setItem('target_view_mode', 'producer');
                    navigate('/login?mode=producer');
                  }}
                  className="rounded-2xl w-full sm:w-[280px] h-20 bg-white text-black hover:bg-slate-200 text-xl font-black uppercase tracking-tighter group transition-all hover:scale-105"
                >
                  Start Producing
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  onClick={() => {
                    localStorage.setItem('target_view_mode', 'talent');
                    navigate('/login?mode=talent');
                  }}
                  className="rounded-2xl w-full sm:w-[280px] h-20 bg-white text-black hover:bg-slate-200 text-xl font-black uppercase tracking-tighter group transition-all"
                >
                  Join as Crew
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Vertical Mockup Elements */}
          <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 flex gap-6 opacity-30 pointer-events-none">
            <div className="w-[180px] h-[320px] bg-slate-800 rounded-3xl border border-white/10 hidden md:block transform -rotate-12 translate-y-12"></div>
            <div className="w-[200px] h-[360px] bg-slate-700 rounded-3xl border border-white/10 transform -rotate-3"></div>
            <div className="w-[180px] h-[320px] bg-slate-800 rounded-3xl border border-white/10 hidden md:block transform rotate-12 translate-y-12"></div>
          </div>
        </section>

        {/* Feature Grid: Scaling Success */}
        <section className="py-32 px-6 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div className="space-y-12">
                <div>
                  <h2 className="text-6xl md:text-[90px] font-black tracking-tighter text-black uppercase leading-[0.9] mb-6">
                    Beat the <br />
                    <span className="text-blue-600">Algorithm.</span>
                  </h2>
                  <p className="text-xl text-slate-500 max-w-md font-medium">
                    Digital content production demands speed. Our AI agents handle the logistics while you focus on the viral moments.
                  </p>
                </div>

                <div className="grid gap-8">
                  {[
                    { icon: Zap, title: "AI Breakdown Engine", desc: "Transform complex scripts into line items, schedules, and budgets instantly." },
                    { icon: Globe, title: "Talent Network", desc: "Access crew members and cast specialized in the digital content ecosystem." },
                    { icon: Shield, title: "Autonomous Logistics", desc: "Automate call sheets, legal agreements, and production calendars." }
                  ].map((feat, i) => (
                    <div key={i} className="flex gap-6 group">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-black group-hover:text-white transition-all">
                        <feat.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black uppercase tracking-tight mb-1">{feat.title}</h4>
                        <p className="text-slate-500 text-sm font-medium">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="aspect-[9/16] w-full max-w-[400px] mx-auto bg-slate-950 rounded-[3rem] shadow-2xl relative overflow-hidden ring-8 ring-slate-100">
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 to-purple-600/20"></div>
                  <div className="absolute inset-0 flex flex-col p-8 justify-between">
                    <div className="flex justify-between items-center bg-white/10 backdrop-blur-md rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800"></div>
                        <div>
                          <p className="text-xs font-bold text-white">Scene #42</p>
                          <p className="text-[10px] text-white/60 uppercase">The Confrontation</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500 text-white border-none">Ready</Badge>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Crew Assigned</p>
                        <div className="flex gap-2">
                          <div className="w-8 h-8 rounded-lg bg-white/20"></div>
                          <div className="w-8 h-8 rounded-lg bg-white/20"></div>
                          <div className="w-8 h-8 rounded-lg bg-white/20"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Floating tags */}
                <div className="absolute top-20 -right-4 bg-black text-white p-4 rounded-2xl shadow-xl font-black text-xs uppercase tracking-widest -rotate-6">
                  9:16 Optimized
                </div>
                <div className="absolute bottom-20 -left-4 bg-blue-600 text-white p-4 rounded-2xl shadow-xl font-black text-xs uppercase tracking-widest rotate-6">
                  Micro-Drama Ready
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Showcase: Vertical Mastery */}
        <section className="py-32 px-6 bg-[#0a0a0a] text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8 text-left">
              <div className="max-w-2xl">
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9] mb-6 text-white">
                  One Tool. <br />
                  <span className="text-white/40">Infinite Series.</span>
                </h2>
                <p className="text-xl text-white/50 font-medium">
                  Whether you're building a YouTube studio or producing 50 episodes of a micro-drama, 
                  Curbily is your automated line producer.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "Digital Content", label: "ReelShort / DramaBox", color: "bg-blue-600" },
                { title: "Creator Originals", label: "Solo Creators / Studios", color: "bg-purple-600" },
                { title: "Studio Builds", label: "Creators / Agencies", color: "bg-emerald-600" }
              ].map((type, i) => (
                <div key={i} className="group relative aspect-[4/5] rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent border border-white/10 p-8 flex flex-col justify-end overflow-hidden hover:border-white/30 transition-all text-left">
                  <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 -translate-y-1/2 translate-x-1/2", type.color)}></div>
                  <Badge className={cn("inline-flex w-fit mb-4 border-none text-[10px] font-black uppercase tracking-widest px-3 py-1", type.color)}>{type.label}</Badge>
                  <h4 className="text-3xl font-black uppercase tracking-tight mb-2 leading-none text-white">{type.title}</h4>
                  <p className="text-white/40 text-sm font-medium leading-tight">Full AI automation for {type.title.toLowerCase()} pipelines.</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      {/* Calendly Section */}
      <section id="calendly-section" className="py-32 bg-black px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center mb-20 relative z-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
            <CalendarIcon className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] uppercase tracking-[0.25em] font-black text-white/60">Executive Access</span>
          </div>
          
          <h2 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 uppercase leading-[0.8] text-white">
            BOOK A <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 italic">PRIVATE DEMO.</span>
          </h2>
          
          <p className="text-xl text-white/40 max-w-2xl mx-auto leading-relaxed font-medium">
            See how Curbily's AI agents can transform your specific production workflow. 
            Schedule a 30-minute deep dive with our founding team.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 bg-white relative z-10"
        >
          <CalendlyEmbed url="https://calendly.com/team-curbily/30min" />
        </motion.div>
      </section>

      {/* Footer Rail */}
      <footer className="fixed bottom-0 w-full px-4 md:px-8 py-4 flex justify-between items-center text-[8px] md:text-[10px] uppercase tracking-[0.3em] font-bold opacity-40 mix-blend-difference text-white pointer-events-none">
        <div className="hidden sm:block">© 2026 Curbily SYSTEMS</div>
        <div className="flex gap-4 md:gap-8 pointer-events-auto">
          <button onClick={() => navigate('/terms')} className="hover:opacity-70 transition-opacity">Terms</button>
          <button onClick={() => navigate('/privacy')} className="hover:opacity-70 transition-opacity">Privacy</button>
        </div>
        <div className="hidden sm:block">ALL RIGHTS RESERVED</div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .rail-text {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          letter-spacing: 0.08em;
          font-size: 11px;
          text-transform: uppercase;
        }
      `}} />
      </main>
    </div>
  );
}
