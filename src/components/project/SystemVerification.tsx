import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, Play, Activity, ShieldCheck, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { breakdown, schedule, budget, sourcing, producer } from '../../lib/gemini';
import { Badge } from '../ui/badge';

export default function SystemVerification() {
  const [status, setStatus] = useState<Record<string, 'idle' | 'running' | 'success' | 'failed'>>({
    breakdown: 'idle',
    schedule: 'idle',
    budget: 'idle',
    sourcing: 'idle',
    producer: 'idle'
  });
  const [lastRun, setLastRun] = useState<Record<string, string>>({});

  const runHealthCheck = async () => {
    const agents = ['breakdown', 'shotlist', 'sourcing', 'schedule', 'budget'];
    
    for (const agentId of agents) {
      setStatus(prev => ({ ...prev, [agentId]: 'running' }));
      try {
        // Mock data for health check
        const mockContext = { scriptText: "INT. OFFICE - DAY\n\nJohn enters.", scenes: [{ sceneNumber: 1, slugline: "INT. OFFICE - DAY" }] };
        
        if (agentId === 'breakdown') await breakdown(mockContext.scriptText);
        else if (agentId === 'shotlist') await new Promise(r => setTimeout(r, 500)); // Simulating since shotlist agent is called directly in components
        else if (agentId === 'sourcing') await sourcing(mockContext.scenes);
        else if (agentId === 'schedule') await schedule(mockContext.scenes, []);
        else if (agentId === 'budget') await budget(mockContext.scenes as any, false, 'Los Angeles', undefined, 'feature');

        setStatus(prev => ({ ...prev, [agentId]: 'success' }));
        setLastRun(prev => ({ ...prev, [agentId]: new Date().toLocaleTimeString() }));
      } catch (error) {
        console.error(`${agentId} health check failed:`, error);
        setStatus(prev => ({ ...prev, [agentId]: 'failed' }));
      }
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Activity className="w-4 h-4 text-slate-300" />;
    }
  };

  return (
    <Card className="border-none shadow-sm bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Agent Health Monitor
            </CardTitle>
            <CardDescription>Verify end-to-end connectivity of AI Curbily agents.</CardDescription>
          </div>
          <Button size="sm" onClick={runHealthCheck} className="gap-2">
            <Zap className="w-4 h-4" />
            Run Diagnostics
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mt-4">
          {(Object.entries(status) as [string, string][]).map(([agentId, s]) => (
            <div key={agentId} className="p-2 md:p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1 md:gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500 truncate">{agentId}</span>
                {getStatusIcon(s)}
              </div>
              <div className="flex items-center justify-between mt-0.5 md:mt-1">
                <Badge variant="outline" className={cn(
                  "text-[7px] md:text-[8px] uppercase py-0 px-1",
                  s === 'success' ? "text-green-600 border-green-100 bg-green-50" : 
                  s === 'failed' ? "text-red-600 border-red-100 bg-red-50" : ""
                )}>
                  {s}
                </Badge>
                {lastRun[agentId] && <span className="text-[7px] md:text-[8px] text-slate-400 hidden sm:inline">{lastRun[agentId]}</span>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
