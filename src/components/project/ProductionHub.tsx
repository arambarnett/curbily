import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Film, 
  FileText, 
  Users, 
  Send, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Download, 
  History,
  AlertCircle,
  LayoutDashboard,
  Calendar,
  Printer,
  Layers
} from 'lucide-react';
import { Project, Scene, ScheduleDay } from '../../types';
import { cn } from '../../lib/utils';
import DayOutOfDays from './DayOutOfDays';
import MicroDramaManager from './MicroDramaManager';

interface ProductionHubProps {
  project: Project;
  days: ScheduleDay[];
  scenes: Scene[];
}

export default function ProductionHub({ project, days, scenes }: ProductionHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'dood' | 'sides' | 'reports' | 'episodes'>(
    project.contentType === 'micro_drama' ? 'episodes' : 'overview'
  );
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    revisions: false,
    sides: false,
    dpr: false,
    union: false
  });

  const toggleCheck = (id: string) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const scenesMap = scenes.reduce((acc, s) => {
    acc[s.sceneNumber] = s;
    return acc;
  }, {} as Record<string, Scene>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <Film className="w-6 h-6 text-indigo-600" />
            Production Hub
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
            Mission Control for {project.contentType?.replace('_', ' ')} Operations
          </p>
        </div>
        <div className="flex gap-2">
          <TabsButton 
            active={activeSubTab === 'overview'} 
            onClick={() => setActiveSubTab('overview')}
            icon={LayoutDashboard}
            label="Dashboard"
          />
          {project.contentType === 'micro_drama' && (
            <TabsButton 
              active={activeSubTab === 'episodes'} 
              onClick={() => setActiveSubTab('episodes')}
              icon={Layers}
              label="Episodes"
            />
          )}
          <TabsButton 
            active={activeSubTab === 'reports'} 
            onClick={() => setActiveSubTab('reports')}
            icon={FileText}
            label="DPRs"
          />
          <TabsButton 
            active={activeSubTab === 'sides'} 
            onClick={() => setActiveSubTab('sides')}
            icon={History}
            label="Digital Sides"
          />
          <TabsButton 
            active={activeSubTab === 'dood'} 
            onClick={() => setActiveSubTab('dood')}
            icon={Users}
            label="DOOD"
          />
        </div>
      </div>

      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 bg-white border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Shooting Calendar Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {days.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic text-sm">
                    No schedule generated yet. Head to the Schedule tab to start.
                  </div>
                ) : (
                  days.map((day) => (
                    <div key={day.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center font-black">
                          <span className="text-[10px] leading-tight opacity-60">DAY</span>
                          <span className="text-lg leading-tight">{day.dayNumber}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold">{day.date || 'Date TBD'}</p>
                          <div className="flex gap-2 mt-1">
                            {day.sceneNumbers?.slice(0, 3).map(n => (
                              <Badge key={n} variant="outline" className="text-[9px] bg-slate-50 text-slate-500 border-slate-200">
                                Sc {n}
                              </Badge>
                            ))}
                            {day.sceneNumbers?.length > 3 && (
                              <Badge variant="outline" className="text-[9px] text-slate-400">+{day.sceneNumbers.length - 3} more</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-[10px] font-black uppercase tracking-widest gap-2"
                          onClick={() => setActiveSubTab('sides')}
                        >
                          <FileText className="w-3 h-3" />
                          View Sides
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest gap-2">
                          <Download className="w-3 h-3" />
                          Reports
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-900 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Send className="w-16 h-16 rotate-12" />
              </div>
              <CardHeader>
                <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-60">Distribution Hub</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Latest Distribution</p>
                  <p className="text-sm font-medium">No recent distributions</p>
                  <p className="text-[10px] opacity-40 italic mt-1">Send your first Call Sheet or Sides to see history.</p>
                </div>
                <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs">
                  Distribute Today's Packet
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Industry Checklist</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <ChecklistItem label="Script Revisions Distributed" checked={checklist.revisions} onClick={() => toggleCheck('revisions')} />
                <ChecklistItem label="Cast Sides Printed/Uploaded" checked={checklist.sides} onClick={() => toggleCheck('sides')} />
                <ChecklistItem label="DPR Submitted (Previous Day)" checked={checklist.dpr} onClick={() => toggleCheck('dpr')} />
                <ChecklistItem label="Union Labor Reports Finalized" checked={checklist.union} onClick={() => toggleCheck('union')} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeSubTab === 'dood' && (
        <DayOutOfDays days={days} scenes={scenesMap} />
      )}

      {activeSubTab === 'episodes' && (
        <MicroDramaManager project={project} />
      )}

      {activeSubTab === 'sides' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {days.map(day => (
            <Card key={day.id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Day {day.dayNumber}</CardTitle>
                  <p className="text-[10px] text-slate-500">{day.date}</p>
                </div>
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none">Ready</Badge>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Characters for Sides</p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(day.sceneNumbers.flatMap(sn => scenesMap[sn]?.cast || []))).map(char => (
                      <Badge key={char} variant="secondary" className="text-[9px] bg-slate-100 text-slate-600 border-none font-bold">
                        {char}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-50">
                  <Button variant="ghost" size="sm" className="flex-1 h-8 text-[10px] font-black uppercase tracking-widest gap-2">
                    <Printer className="w-3 h-3 text-slate-400" />
                    Print
                  </Button>
                  <Button variant="default" size="sm" className="flex-1 h-8 text-[10px] font-black uppercase tracking-widest gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Send className="w-3 h-3" />
                    Distribute
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeSubTab === 'reports' && (
        <Card className="bg-white border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Daily Production Reports (DPR)
              </CardTitle>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter italic">Official log of production progress and changes</p>
            </div>
            <Button size="sm" className="bg-slate-900 text-white font-bold text-xs h-9">
              Create New DPR
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Day</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Progress</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm font-black">1</td>
                  <td className="p-4 text-sm font-medium">May 1, 2024</td>
                  <td className="p-4">
                    <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="w-1/2 h-full bg-green-500" />
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 font-bold italic">Ahead of Schedule • 14/14 Sc</p>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[9px] font-bold">Approved</Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                       <Download className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
                <tr className="bg-slate-50/10">
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic text-sm">
                    Additional DPR history will appear here as production progresses.
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TabsButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
        active 
          ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
          : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
      )}
    >
      <Icon className="w-3 h-3" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ChecklistItem({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between group cursor-pointer" onClick={onClick}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
          checked ? "bg-green-500 border-green-500" : "border-slate-200 group-hover:border-slate-400"
        )}>
          {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
        </div>
        <span className={cn("text-xs font-bold transition-colors", checked ? "text-slate-400 line-through" : "text-slate-600")}>
          {label}
        </span>
      </div>
      {!checked && <AlertCircle className="w-3 h-3 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </div>
  );
}
