import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  ExternalLink, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  Presentation, 
  TrendingUp, 
  Users, 
  Target, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Project } from '../../types';
import { auditAgent } from '../../lib/agents/core/audit';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function ChannelAudit({ project }: { project: Project }) {
  const [tokens, setTokens] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage for tokens for the demo
    const savedTokens = localStorage.getItem(`yt_tokens_${project.id}`);
    if (savedTokens) {
      setTokens(JSON.parse(savedTokens));
    }

    const handleMessage = (event: MessageEvent) => {
      // Validate origin if needed
      if (event.data?.type === 'YOUTUBE_AUTH_SUCCESS') {
        const newTokens = event.data.tokens;
        setTokens(newTokens);
        localStorage.setItem(`yt_tokens_${project.id}`, JSON.stringify(newTokens));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [project.id]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/google/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(url, 'youtube_auth', `width=${width},height=${height},left=${left},top=${top}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const runAudit = async () => {
    if (!tokens) return;
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Analytics Data
      const response = await fetch('/api/youtube/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch analytics');
      }
      
      const data = await response.json();
      
      // 2. Run AI Audit Agent
      const result = await auditAgent(data.channel, data.analytics, data.demographics);
      setAuditResult(result);

      // Add notification
      await addDoc(collection(db, `projects/${project.id}/notifications`), {
        projectId: project.id,
        type: 'approval',
        title: 'Channel Audit Complete',
        message: `Personalized audience audit for ${data.channel.title} is ready.`,
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (err: any) {
      setError(err.message);
      if (err.message.includes('invalid_grant')) {
        setTokens(null);
        localStorage.removeItem(`yt_tokens_${project.id}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!tokens) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-600 mb-4">
            <BarChart2 className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Connect your Channel</h2>
          <p className="text-slate-500 text-sm">
            Connect your YouTube account to let the Audience Audit Agent analyze your viewership data and build a professional growth presentation.
          </p>
          <div className="pt-6">
            <Button 
              size="lg" 
              className="px-8 h-12 gap-2 bg-red-600 hover:bg-red-700 font-bold"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5" />}
              Connect YouTube Studio
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            Read-only Access • Secure OAuth 2.0
          </div>
        </div>
      </div>
    );
  }

  if (!auditResult && !isLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-12">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter">Channel Connected!</h2>
          <p className="text-slate-500 text-sm mt-2 mb-8">
            The AI Agent is ready to perform a deep dive into your channel's 30-day analytics and audience demographics.
          </p>
          <Button 
            size="lg" 
            className="w-full h-14 gap-3 bg-slate-900 font-black uppercase tracking-widest text-xs"
            onClick={runAudit}
          >
            <Presentation className="w-5 h-5" />
            Generate Audience Presentation
          </Button>
          {error && (
            <p className="text-red-500 text-xs mt-4 bg-red-50 p-2 rounded-lg border border-red-100 italic">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-24 text-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-6" />
        <h2 className="text-2xl font-black uppercase tracking-tighter animate-pulse">Analyzing Audience DNA</h2>
        <div className="space-y-2 mt-4">
          <p className="text-blue-600 text-[10px] font-bold uppercase tracking-widest">Processing YouTube Big Data</p>
          <p className="text-slate-400 text-xs italic">Finding patterns in viewership, retention, and demographics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-8">
        <div className="space-y-2">
          <Badge className="bg-blue-600 hover:bg-blue-700 font-bold text-[10px] uppercase tracking-widest px-3 py-1">
            AI Audience Presentation
          </Badge>
          <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mt-2">
            {auditResult.title}
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl">
            {auditResult.summary}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 text-[10px] font-black uppercase tracking-widest h-10"
          onClick={runAudit}
        >
          <TrendingUp className="w-3 h-3" />
          Refresh Stats
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Audience Persona Card */}
        <Card className="lg:col-span-1 bg-slate-900 border-none text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 opacity-20 blur-3xl -mr-16 -mt-16" />
          <CardHeader>
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Primary Persona</span>
            </div>
            <CardTitle className="text-3xl font-black uppercase tracking-tighter text-white">
              {auditResult.audiencePersona.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-slate-400 text-xs italic border-l-2 border-blue-500 pl-4 py-1">
              "{auditResult.audiencePersona.description}"
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-3 rounded-xl">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Age Group</p>
                <p className="text-lg font-black tracking-tight">{auditResult.audiencePersona.primaryAgeGroup}</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Gender</p>
                <p className="text-lg font-black tracking-tight">{auditResult.audiencePersona.primaryGender}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Key Interests</p>
              <div className="flex flex-wrap gap-2">
                {auditResult.audiencePersona.interests.map((interest: string) => (
                  <Badge key={interest} variant="secondary" className="bg-white/10 text-white border-none text-[9px] uppercase font-bold px-2 py-0.5">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Growth Opportunity Card */}
        <Card className="lg:col-span-2 bg-blue-50 border-blue-100 overflow-hidden relative">
           <CardHeader>
             <div className="flex items-center gap-2 mb-2 text-blue-600">
               <Zap className="w-4 h-4" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Killer Growth Pivot</span>
             </div>
             <CardTitle className="text-2xl font-black uppercase tracking-tighter text-blue-900">
               Strategic Opportunity
             </CardTitle>
           </CardHeader>
           <CardContent className="pb-8">
             <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm">
                <p className="text-blue-900 font-bold leading-relaxed">
                  {auditResult.growthOpportunity}
                </p>
                <div className="mt-6 flex items-center gap-3 text-blue-600 font-black uppercase tracking-widest text-[10px]">
                  <span>Action This Now</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
             </div>
           </CardContent>
        </Card>
      </div>

      {/* Presentation Slides */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Presentation Slides</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
          {auditResult.slides.map((slide: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="h-full bg-white border-slate-200 hover:border-blue-300 transition-colors shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Slide 0{idx + 1}</span>
                  <Target className="w-3 h-3 text-blue-500" />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase tracking-tighter text-slate-900">
                    {slide.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-6">
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                    <p className="text-sm font-bold text-blue-900">
                      {slide.insight}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Data Evidence</p>
                    <ul className="space-y-1">
                      {slide.dataPoints.map((point: string, pIdx: number) => (
                        <li key={pIdx} className="text-xs text-slate-600 flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-green-600 mb-2">Strategy</p>
                    <p className="text-xs text-slate-700 font-medium">
                      {slide.recommendation}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
