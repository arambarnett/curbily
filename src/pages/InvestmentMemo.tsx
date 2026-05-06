import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Sparkles, 
  Users, 
  TrendingUp, 
  Zap, 
  Globe,
  Briefcase,
  FileText,
  Target,
  ArrowRight,
  DollarSign,
  FileDown,
  ChevronDown,
  Check,
  Loader2,
  X,
  Shield,
  Activity
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import PasswordGate from '../components/common/PasswordGate';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

const slides = [
  {
    title: "CURBILY",
    subtitle: "THE INFRASTRUCTURE OF THE NEW HOLLYWOOD",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center relative overflow-hidden group">
        <motion.div 
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.4 }}
          className="absolute inset-0 z-0 bg-cover bg-center grayscale"
          style={{ backgroundImage: 'url(/src/assets/images/curbily_hypergrowth_glitch_1777610290689.png)' }}
        />
        <div className="relative z-10 space-y-4">
          <h1 className="text-[15vw] font-[900] leading-[0.8] tracking-tighter text-slate-900 mix-blend-multiply italic">
            CURBILY
          </h1>
          <div className="bg-slate-900 text-white px-8 py-4 inline-block transform -rotate-2">
             <p className="text-2xl font-black tracking-widest uppercase italic">LOGISTICS ARE SICK AS F*CK</p>
          </div>
          <div className="flex justify-center gap-12 pt-12">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Founded by</p>
              <p className="text-xl font-black">BARNETT & BARNETT</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "THE HYPERGROWTH",
    subtitle: "THE CREATOR ECONOMY IS EXPLODING",
    content: (
      <div className="grid grid-cols-12 gap-1 h-full bg-slate-950 p-1">
        {/* Left Column: Big Stats & Hook */}
        <div className="col-span-5 bg-slate-900 p-12 flex flex-col justify-between border-4 border-slate-900 group">
          <div className="space-y-4">
             <div className="inline-block px-3 py-1 bg-blue-600 text-[10px] font-black italic tracking-widest text-white mb-4">
               MARKET_TRAJECTORY // 2024-2027
             </div>
             <h2 className="text-[8vw] font-black leading-[0.8] tracking-tighter text-white italic transition-all group-hover:skew-x-[-2deg]">
               UNSTP <br />
               <span className="text-blue-500">PABLE.</span>
             </h2>
             <p className="text-blue-300 font-[900] text-3xl italic mt-6 uppercase tracking-tighter leading-none">
               THE TREND IS YOUR <br />F*CKING FRIEND.
             </p>
          </div>

          <div className="space-y-6">
             <div className="p-8 bg-white text-slate-900 transform -rotate-1 shadow-[12px_12px_0px_0px_rgba(37,99,235,1)]">
                <p className="text-[10vw] font-[900] leading-none tracking-tighter">$250B</p>
                <p className="text-2xl font-black uppercase tracking-widest mt-2 bg-slate-900 text-white px-4 py-1 inline-block">TAM BY 2027</p>
             </div>
             <p className="text-sm font-bold text-slate-500 uppercase tracking-widest italic">
               CREATORS ARE DELEGATING LOGISTICS TO AUTO-PILOT. WE ARE THE WINGS.
             </p>
          </div>
        </div>

        {/* Right Column: The Graph */}
        <div className="col-span-12 lg:col-span-7 bg-slate-900 p-12 flex flex-col border-4 border-slate-900 relative">
          <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
             <div className="grid grid-cols-20 h-full w-full">
                {Array.from({ length: 400 }).map((_, i) => (
                  <div key={i} className="border-[0.5px] border-white/20"></div>
                ))}
             </div>
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start mb-12">
               <div>
                  <h4 className="text-4xl font-black italic text-white tracking-widest uppercase">CREATOR SPEND</h4>
                  <p className="text-blue-500 font-bold uppercase tracking-widest">EXPONENTIAL VELOCITY</p>
               </div>
               <div className="bg-slate-800 p-4 border border-white/10">
                  <Activity className="w-10 h-10 text-blue-500 animate-pulse" />
               </div>
            </div>

            {/* Fixed Chart Container with Aspect Ratio and Min Height */}
            <div className="flex-1 min-h-[300px] w-full relative">
              <ResponsiveContainer width="99%" height="100%">
                <AreaChart data={growthData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="year" 
                    stroke="#475569" 
                    fontSize={14} 
                    fontWeight="bold"
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#475569' }}
                    dy={20}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '4px solid #0f172a', 
                      borderRadius: '0px', 
                      color: '#0f172a',
                      boxShadow: '8px 8px 0px 0px #3b82f6'
                    }}
                    itemStyle={{ color: '#0f172a', fontWeight: '900', textTransform: 'uppercase' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={12}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    animationDuration={3000}
                    activeDot={{ r: 12, fill: '#fff', stroke: '#3b82f6', strokeWidth: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-12 flex justify-between items-center bg-slate-950 p-6 border border-white/5">
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">SOURCE: GOLDMAN SACHS GLOBAL INVESTMENT RESEARCH</p>
               <div className="flex gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
               </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "THE FOUNDERS",
    subtitle: "BATTLE-TESTED & BLOODIED",
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center">
        <div className="p-12 border-[8px] border-slate-900 bg-white shadow-[16px_16px_0px_0px_rgba(15,23,42,1)] transform -rotate-1">
          <h3 className="text-4xl font-[900] mb-4 italic tracking-tighter">JON BARNETT / CEO</h3>
          <p className="text-xl font-bold text-slate-500 uppercase leading-none mb-6">20 YEARS. $50M REVENUE. 700M VIEWS.</p>
          <div className="space-y-2 text-sm font-black uppercase tracking-widest text-blue-600">
            <p>HULU // NETFLIX // KIMMEL</p>
            <p>CBS // DREAMWORKS // TUBI</p>
            <p>UNTOUCHABLE NETWORK</p>
          </div>
        </div>
        <div className="p-12 border-[8px] border-slate-900 bg-slate-900 text-white shadow-[16px_16px_0px_0px_rgba(37,99,235,1)] transform rotate-1">
          <h3 className="text-4xl font-[900] mb-4 italic tracking-tighter">ARAM BARNETT / CTO</h3>
          <p className="text-xl font-bold text-blue-400 uppercase leading-none mb-6">10 YEARS. EXITED. ENGINEER.</p>
          <div className="space-y-2 text-sm font-black uppercase tracking-widest text-slate-400">
            <p>FULL-STACK ARCHITECT</p>
            <p>AUTOMATION SPECIALIST</p>
            <p>2 YEARS BUILDING AGENTS</p>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "THE PROBLEM",
    subtitle: "LEGACY SYSTEMS ARE TRASH",
    content: (
      <div className="grid grid-cols-2 gap-1 h-full bg-slate-900">
        <div className="bg-white p-12 flex flex-col justify-center border-4 border-slate-900">
          <h2 className="text-[8vw] font-black leading-[0.9] tracking-tighter text-slate-900 mb-8">
            SPREADSHEETS ARE DYING.
          </h2>
          <p className="text-2xl font-bold text-slate-500 leading-tight">
            Movie Magic is 30 years old. StudioBinder is a digital filing cabinet. Creators are burning out because the software is brain-dead.
          </p>
        </div>
        <div className="bg-slate-100 p-12 flex flex-col justify-center border-4 border-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <X className="w-24 h-24 text-red-500 opacity-20 rotate-12" />
          </div>
          <div className="space-y-6 relative z-10">
             <div className="p-8 bg-red-500 text-white font-black text-4xl transform rotate-3">
               NO AUTOMATION
             </div>
             <div className="p-8 bg-slate-900 text-white font-black text-4xl transform -rotate-2">
               MANUAL DATA ENTRY
             </div>
             <div className="p-8 bg-slate-400 text-white font-black text-4xl transform rotate-1">
               ZERO SCALE
             </div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "THE SOLUTION",
    subtitle: "ACCOUNTING & LOGISTICS REIMAGINED",
    content: (
      <div className="flex flex-col justify-center h-full space-y-12">
        <div className="grid grid-cols-3 gap-8">
          {[
            { title: "AUTONOMOUS ACCOUNTING", desc: "No more receipts. No more manual ledgers. The AI manages the cash flow in real-time.", icon: DollarSign },
            { title: "ELITE LOGISTICS", desc: "Sourcing venues, gear, and crew happens while you sleep. Friction is deleted.", icon: Zap },
            { title: "CREW ORCHESTRATION", desc: "Verified pipelines for the top 3% of talent. Scalability isn't a theory; it's a script.", icon: Users },
          ].map((item, i) => (
            <div key={i} className="group p-8 border-[6px] border-slate-900 bg-white hover:bg-slate-900 hover:text-white transition-all duration-300 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)]">
              <item.icon className="w-16 h-16 mb-6 text-blue-600 group-hover:text-white group-hover:animate-bounce" />
              <h3 className="text-2xl font-black mb-4 leading-none uppercase italic">{item.title}</h3>
              <p className="text-sm font-bold opacity-70 leading-relaxed uppercase">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-blue-600 p-8 text-white text-center transform -rotate-1">
           <p className="text-3xl font-black tracking-tighter">WE TURN CREATORS INTO MEDIA EMPIRES.</p>
        </div>
      </div>
    )
  },
  {
    title: "LETHAL REVENUE",
    subtitle: "HOW WE PRINT MONEY",
    content: (
      <div className="grid grid-cols-2 gap-1 h-full bg-white">
         <div className="bg-slate-900 p-12 flex flex-col justify-center relative overflow-hidden">
            <motion.div 
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute -right-24 -bottom-24"
            >
              <Activity className="w-96 h-96 text-blue-600/10" />
            </motion.div>
            <div className="relative z-10 space-y-8">
               <h2 className="text-[6vw] font-black text-white leading-none tracking-tighter italic">THE <br />SAAS <br /><span className="text-blue-500">ENGINE.</span></h2>
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="w-4 h-4 bg-blue-500"></div>
                     <p className="text-2xl font-black text-white uppercase italic">$39/MO BASE SUBSCRIPTION</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-4 h-4 bg-slate-700"></div>
                     <p className="text-2xl font-black text-slate-400 uppercase italic">98% GROSS MARGINS</p>
                  </div>
               </div>
            </div>
         </div>
         <div className="bg-blue-600 p-12 flex flex-col justify-center relative overflow-hidden">
            <div className="relative z-10 space-y-8">
               <h2 className="text-[6vw] font-black text-white leading-none tracking-tighter italic">THE <br />TRANSACTIONAL <br /><span className="text-slate-900">TAKE.</span></h2>
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="w-4 h-4 bg-slate-900"></div>
                     <p className="text-2xl font-black text-white uppercase italic">3-5% PAYROLL FACILITATION</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-4 h-4 bg-blue-400"></div>
                     <p className="text-2xl font-black text-blue-100 uppercase italic">PROCUREMENT KICKBACKS</p>
                  </div>
               </div>
            </div>
            <div className="mt-12 p-6 border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
               <p className="text-sm font-black text-slate-900 uppercase italic">"THIS IS NOT JUST A TOOL. IT'S THE CLEARINGHOUSE FOR EVERY DOLLAR IN NEW MEDIA."</p>
            </div>
         </div>
      </div>
    )
  },
  {
    title: "THE LOGISTICS ENGINE",
    subtitle: "COORDINAION AT 10x VELOCITY",
    content: (
      <div className="grid grid-cols-4 gap-4 h-full items-center">
        {[
          { label: "INPUT", title: "RAW SCRIPT", desc: "The AI parses physical reality from text." },
          { label: "LOGIC", title: "BUDGETING", desc: "Instant fiscal sanity. No spreadsheets." },
          { label: "DEPLOY", title: "CREW MATCH", desc: "Proprietary stack hires the top 1%." },
          { label: "RESULT", title: "CALL SHEET", desc: "The job is live. The money is moving." }
        ].map((step, i) => (
          <div key={i} className="flex flex-col border-r-2 border-slate-900 last:border-0 px-6 space-y-4">
            <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 inline-block self-start tracking-tighter italic">
              STAGE_0{i + 1} // {step.label}
            </div>
            <h4 className="text-3xl font-black italic tracking-tighter leading-none">{step.title}</h4>
            <p className="text-sm font-bold uppercase text-slate-400 leading-tight">{step.desc}</p>
            <div className="h-2 w-full bg-slate-900 overflow-hidden">
               <motion.div 
                 initial={{ x: '-100%' }}
                 animate={{ x: '100%' }}
                 transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: i * 0.2 }}
                 className="h-full w-1/2 bg-blue-600"
               />
            </div>
          </div>
        ))}
      </div>
    )
  },
  {
    title: "THE NUMBERS",
    subtitle: "3 MILLION REASONS TO WIN",
    content: (
      <div className="grid grid-cols-2 gap-12 h-full items-center">
        <div className="space-y-8">
          <h2 className="text-[6vw] font-black leading-none tracking-tighter italic">
            THE MARKET IS RIGGED FOR US.
          </h2>
          <div className="border-l-8 border-slate-900 pl-8 space-y-6">
            <p className="text-2xl font-bold text-slate-600 uppercase">3 MILLION CREATORS EARNING $100K+</p>
            <p className="text-2xl font-bold text-slate-600 uppercase">88% ARE SUFFERING FROM PRODUCTION FATIGUE</p>
            <p className="text-2xl font-bold text-blue-600 uppercase">$250B ESTIMATED MARKET BY 2027</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
           <div className="p-12 bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(37,99,235,1)]">
              <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">Our Advantage</p>
              <h4 className="text-4xl font-black mb-4">98% GROSS MARGIN ON SaaS</h4>
              <p className="text-sm font-bold text-slate-500 leading-tight uppercase">High-volume users drive automated compute revenue. Every run is profit.</p>
           </div>
           <div className="p-12 bg-slate-900 text-white border-4 border-slate-900">
              <p className="text-[10px] font-black text-blue-400 mb-2 uppercase tracking-[0.2em]">The Take Rate</p>
              <h4 className="text-4xl font-black mb-4">FINTECH UPSIDE</h4>
              <p className="text-sm font-bold text-slate-400 leading-tight uppercase">Embedded payroll and autonomous procurement = massive transactional fees.</p>
           </div>
        </div>
      </div>
    )
  },
  {
    title: "THE UNCOPYABLE MOAT",
    subtitle: "LOGISTICS ARCHITECTURE > PURE AI",
    content: (
      <div className="flex flex-col justify-center h-full space-y-8">
        <div className="bg-slate-100 p-12 border-4 border-dashed border-slate-900 rounded-[4rem]">
          <h2 className="text-5xl font-black mb-8 leading-tight italic tracking-tighter">
            "SOFTWARE ORCHESTRATES.<br/>
            HUMANS EXECUTE."
          </h2>
          <p className="text-xl font-bold text-slate-600 uppercase leading-relaxed max-w-2xl">
            Anyone can write a script with AI. No one else can hire a vetted sound mixer, rent a RED Komodo, and file a film permit programmatically in one click. 
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8">
           <div className="p-8 bg-blue-600 text-white">
              <h4 className="text-2xl font-black uppercase italic mb-2">VERIFIED NETWORK</h4>
              <p className="text-sm font-bold opacity-80 uppercase tracking-wider">10,000+ vetted crew members ready to deploy.</p>
           </div>
           <div className="p-8 bg-slate-900 text-white">
              <h4 className="text-2xl font-black uppercase italic mb-2">EXECUTION LAYER</h4>
              <p className="text-sm font-bold opacity-80 uppercase tracking-wider">The AI manages real human labor. Unbeatable lock-in.</p>
           </div>
        </div>
      </div>
    )
  },
  {
    title: "THE ASK",
    subtitle: "GET THE F*CK IN OR WATCH US WIN",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-12">
        <div className="space-y-4">
          <h2 className="text-[10vw] font-black leading-[0.8] tracking-tighter uppercase italic text-slate-900">LETHAL <br /><span className="text-blue-600">GROWTH.</span></h2>
          <p className="text-4xl font-black text-slate-400 italic">40% MOAM TOP-LINE INCREASE.</p>
        </div>
        
        <div className="bg-slate-900 p-12 w-full max-w-4xl text-white transform rotate-1 relative shadow-[24px_24px_0px_0px_rgba(37,99,235,1)]">
          <div className="absolute -top-10 -left-10 bg-blue-600 p-6 font-[900] text-2xl transform -rotate-12">PRE-SEED ROUND</div>
          <h3 className="text-5xl font-black mb-8 uppercase tracking-tighter leading-tight italic">RAISING TO OWN THE GLOBAL PRODUCTION OS.</h3>
          <p className="text-xl font-bold text-slate-400 mb-12 uppercase leading-snug">
             SCALING THE CREW BENCH. DEEPENING FINTECH INTEGRATIONS. <br /> EXECUTING THE VISION FOR THE NEXT ERA OF ENTERTAINMENT.
          </p>
          <div className="flex flex-col items-center gap-4">
            <a 
              href="mailto:team@curbily.com" 
              className="group relative inline-flex items-center gap-6 bg-white text-slate-900 px-16 py-8 text-4xl font-black hover:bg-blue-600 hover:text-white transition-all duration-300"
            >
              TEAM@CURBILY.COM
              <ArrowRight className="w-12 h-12 group-hover:translate-x-6 transition-transform" />
            </a>
            <p className="text-[10px] font-black tracking-[0.5em] text-slate-600 uppercase mt-4">DO NOT SLEEP ON THIS.</p>
          </div>
        </div>
      </div>
    )
  }
];

export default function InvestmentMemo() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  const downloadMemo = () => {
    window.open('/curbily-investor-memo.md', '_blank');
  };

  const exportRealPDF = () => {
    // Open in a new tab with print=true to trigger the print dialog natively, avoiding html-to-image oklch errors
    window.open(window.location.pathname + '?print=true', '_blank');
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('print') === 'true') {
      // Small delay to ensure styles are loaded
      setTimeout(() => {
        window.print();
        // Optional: close the tab after printing
        // window.close(); 
      }, 1000);
    }
  }, []);

  const isPrintMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('print') === 'true';

  return (
    <div className={`min-h-screen bg-white ${isPrintMode ? 'print:bg-white print:p-0' : ''}`}>
      {/* Hidden offscreen container for PDF generation */}
      <div 
        id="pdf-export-container"
        className={isPrintMode ? "w-[1024px] bg-white print:block" : "absolute pointer-events-none"}
        style={!isPrintMode ? { top: 0, left: '-9999px', width: '1024px', zIndex: -100 } : undefined}
      >
        {slides.map((slide, i) => (
          <div key={i} className="export-slide w-[1024px] h-[768px] p-12 flex flex-col items-center justify-center bg-white relative break-after-page border-b border-gray-100 print:border-none">
            <div className="w-full max-w-5xl flex flex-col h-full">
              <div className="mb-8 shrink-0">
                <h2 className="text-4xl font-black tracking-tighter mb-2 italic uppercase">
                  {slide.title}
                </h2>
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">
                  {slide.subtitle}
                </p>
              </div>
              <div className="flex-1">
                {slide.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Screen-only content */}
      {!isPrintMode && (
        <div className="print:hidden">
          {/* Header */}
        <header className="fixed top-0 left-0 right-0 h-20 border-b border-slate-100 bg-white/80 backdrop-blur-md z-50 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tighter leading-none">CURBILY</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Investment Memo</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-[10px] font-black uppercase text-slate-400">
              Slide {currentSlide + 1} / {slides.length}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-2 border-2 border-slate-900 h-9" />}>
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isExporting ? 'Exporting...' : 'Export Options'}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <DropdownMenuItem onClick={downloadMemo} className="gap-2 font-bold uppercase tracking-widest text-[10px] cursor-pointer">
                  <FileText className="w-4 h-4" />
                  Download One-Pager
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportRealPDF} disabled={isExporting} className="gap-2 font-bold uppercase tracking-widest text-[10px] cursor-pointer text-blue-600">
                  <FileDown className="w-4 h-4" />
                  Export Full Deck (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="secondary" onClick={() => navigate('/')} className="h-9 font-bold text-xs">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Exit Deck
            </Button>
          </div>
        </header>

        {/* Slide Content */}
        <div className="pt-20 h-screen flex flex-col relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 max-w-5xl mx-auto w-full p-12 flex flex-col"
            >
              <div className="mb-12">
                <h2 className="text-5xl font-black tracking-tighter mb-2 italic uppercase">
                  {slides[currentSlide].title}
                </h2>
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">
                  {slides[currentSlide].subtitle}
                </p>
              </div>
              
              <div className="flex-1">
                {slides[currentSlide].content}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center gap-12">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={prevSlide}
              className="w-16 h-16 rounded-full border-2 border-slate-100 hover:border-slate-900"
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-3 h-3 rounded-full transition-all ${i === currentSlide ? 'bg-slate-900 w-8' : 'bg-slate-200'}`}
                />
              ))}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={nextSlide}
              className="w-16 h-16 rounded-full border-2 border-slate-100 hover:border-slate-900 bg-slate-900 text-white hover:text-white"
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
