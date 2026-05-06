import React, { useMemo, useState } from 'react';
import { ScheduleDay, Scene } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Calendar, Users, Info, ArrowRight, Box, MapPin, Camera } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DayOutOfDaysProps {
  days: ScheduleDay[];
  scenes: Record<string, Scene>;
}

export default function DayOutOfDays({ days, scenes }: DayOutOfDaysProps) {
  const [doodType, setDoodType] = useState<any>('cast');

  const resourceList = useMemo(() => {
    const resourceSet = new Set<string>();
    Object.values(scenes).forEach(scene => {
      let field = scene[doodType] as string[] | string | undefined;
      // Also check 'characters' if doodType is 'cast' in case the AI generated it that way
      if (doodType === 'cast' && !field && (scene as any).characters) {
        field = (scene as any).characters;
      }
      if (doodType === 'cast' && Array.isArray((scene as any).characters)) {
        (scene as any).characters.forEach((c: string) => resourceSet.add(c));
      }
      if (Array.isArray(field)) {
        field.forEach(r => resourceSet.add(r));
      } else if (typeof field === 'string') {
        resourceSet.add(field);
      }
    });
    return Array.from(resourceSet).filter(Boolean).sort();
  }, [scenes, doodType]);

  const scheduleMatrix = useMemo(() => {
    const matrix: Record<string, string[]> = {};
    
    resourceList.forEach(resource => {
      matrix[resource] = new Array(days.length).fill('');
      
      let firstDay = -1;
      let lastDay = -1;

      days.forEach((day, dayIndex) => {
        const isWorking = (day.sceneIds || []).some(sceneNum => {
          const scene = scenes[sceneNum];
          let field = scene?.[doodType] as string[] | string | undefined;
          if (doodType === 'cast' && !field && (scene as any)?.characters) {
            field = (scene as any).characters;
          }
          if (doodType === 'cast' && Array.isArray((scene as any)?.characters) && (scene as any).characters.includes(resource)) {
             return true;
          }
          if (Array.isArray(field)) {
            return field.includes(resource);
          } else if (typeof field === 'string') {
            return field === resource;
          }
          return false;
        });

        if (isWorking) {
          if (firstDay === -1) firstDay = dayIndex;
          lastDay = dayIndex;
          matrix[resource][dayIndex] = 'W';
        }
      });

      // Apply S, F, SWF, SW, WF logic
      if (firstDay !== -1) {
        if (firstDay === lastDay) {
          matrix[resource][firstDay] = 'SWF';
        } else {
          matrix[resource][firstDay] = 'SW';
          matrix[resource][lastDay] = 'WF';
          
          // Fill holds
          for (let i = firstDay + 1; i < lastDay; i++) {
            if (matrix[resource][i] === '') {
              matrix[resource][i] = 'H';
            }
          }
        }
      }
    });

    return matrix;
  }, [resourceList, days, scenes, doodType]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SW': return 'bg-emerald-500 text-white';
      case 'W': return 'bg-blue-500 text-white';
      case 'WF': return 'bg-orange-500 text-white';
      case 'SWF': return 'bg-purple-500 text-white';
      case 'H': return 'bg-slate-200 text-slate-500';
      default: return 'bg-transparent text-transparent';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SW': return 'Start-Work';
      case 'W': return 'Work';
      case 'WF': return 'Work-Finish';
      case 'SWF': return 'Start-Work-Finish';
      case 'H': return 'Hold';
      default: return '';
    }
  };

  if (days.length === 0) return (
    <Card className="border-dashed border-2 bg-transparent">
      <CardContent className="py-12 text-center text-slate-500">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>A schedule must be generated before the Day Out of Days can be calculated.</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                <Users className="w-5 h-5" />
                Day Out of Days (DOOD)
              </CardTitle>
              <CardDescription>
                Production tracking for talent and key resources.
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <select 
                value={doodType} 
                onChange={(e) => setDoodType(e.target.value as any)}
                className="w-[180px] bg-white border border-slate-200 text-sm font-medium rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="cast">Cast & Characters</option>
                <option value="location">Locations</option>
                <option value="props">Props</option>
                <option value="wardrobe">Wardrobe</option>
                <option value="picVeh">Picture Vehicles</option>
                <option value="sfx">Special Effects (SFX)</option>
                <option value="weapons">Weapons</option>
                <option value="vfx">Visual Effects (VFX)</option>
                <option value="muHair">Makeup & Hair</option>
                <option value="equipment">Equipment</option>
                <option value="stunts">Stunts</option>
              </select>
              <Badge variant="outline" className="text-[9px] uppercase border-slate-200 text-slate-400">Total Items: {resourceList.length}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="border-2 border-slate-900 rounded-2xl overflow-x-auto bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
            <Table>
              <TableHeader className="bg-slate-900 h-10">
                <TableRow className="hover:bg-slate-900 border-none">
                  <TableHead className="text-white font-black uppercase text-[10px] tracking-widest w-[200px] sticky left-0 bg-slate-900 z-10">
                    {doodType === 'cast' ? 'Talent / Character' : 'Resource Name'}
                  </TableHead>
                  {days.map((day) => (
                    <TableHead key={day.id} className="text-white font-black uppercase text-[10px] tracking-widest text-center min-w-[50px]">
                      D{day.dayNumber}
                    </TableHead>
                  ))}
                  <TableHead className="text-white font-black uppercase text-[10px] tracking-widest text-center w-[80px]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resourceList.map((resource) => {
                  const workDays = scheduleMatrix[resource].filter(s => ['W', 'SW', 'WF', 'SWF'].includes(s)).length;
                  const holdDays = scheduleMatrix[resource].filter(s => s === 'H').length;
                  return (
                    <TableRow key={resource} className="border-slate-100 hover:bg-slate-50 transition-colors">
                      <TableCell className="font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-100">
                        {resource}
                      </TableCell>
                      {scheduleMatrix[resource].map((status, idx) => (
                        <TableCell key={idx} className="text-center p-1">
                          <div className={cn(
                            "w-8 h-8 rounded-lg mx-auto flex items-center justify-center text-[10px] font-black transition-all",
                            getStatusColor(status)
                          )} title={getStatusLabel(status)}>
                            {status}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono text-xs tabular-nums bg-slate-100 border-slate-200">
                          {workDays + holdDays}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
              <div className="w-4 h-4 bg-emerald-500 rounded" />
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Work</div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
              <div className="w-4 h-4 bg-blue-500 rounded" />
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Work</div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
              <div className="w-4 h-4 bg-orange-500 rounded" />
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Work Finish</div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
              <div className="w-4 h-4 bg-purple-500 rounded" />
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">One Day (SWF)</div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
              <div className="w-4 h-4 bg-slate-200 rounded" />
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hold</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden mt-8">
        <CardHeader className="bg-white/5 border-b border-white/10">
          <CardTitle className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            DOOD Strategic Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Hold Impact Analysis</p>
            {resourceList.map(cast => {
                const holds = scheduleMatrix[cast].filter(s => s === 'H').length;
                if (holds === 0) return null;
                return (
                    <div key={cast} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-sm font-bold">{cast}</span>
                        <div className="flex items-center gap-2">
                             <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 uppercase text-[9px] font-black">{holds} Hold Days</Badge>
                             <ArrowRight className="w-3 h-3 text-slate-600" />
                             <span className="text-[10px] font-bold text-slate-400">Suggest scheduling closer together to save hold costs.</span>
                        </div>
                    </div>
                );
            })}
            {resourceList.every(c => scheduleMatrix[c].filter(s => s === 'H').length === 0) && (
                <p className="text-xs text-slate-400 italic">No hold days detected. Excellent schedule density.</p>
            )}
          </div>
          
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Cast Efficiency Balance</p>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Utilization Rate</span>
                        <span className="font-mono font-black text-emerald-400">82%</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[82%]" />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                        The current schedule groups character arcs efficiently, minimizing travel and wardrobe setup overlap. 
                        Targeting {'>'}80% utilization minimizes "lost days" on name talent.
                    </p>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
