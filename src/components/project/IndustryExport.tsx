import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Download, FileDown, CheckCircle2, Loader2, FileJson, FileType, Table as TableIcon } from 'lucide-react';
import { Scene, BudgetItem, ScheduleDay } from '../../types';
import { toast } from 'sonner';

interface IndustryExportProps {
  project: any;
  scenes: Scene[];
  days: ScheduleDay[];
  budget: BudgetItem[];
}

export default function IndustryExport({ project, scenes, days, budget }: IndustryExportProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const simulateExport = (type: string) => {
    setIsExporting(type);
    setTimeout(() => {
      // Create a blob for demo purposes
      let content = '';
      let filename = `${project.title.replace(/\s+/g, '_')}_${type}`;
      
      if (type === 'Movie Magic Scheduling') {
        // Mocking MMS format (simplified CSV that MMS can import)
        content = "Scene,Slugline,Location,Cast,Props\n";
        scenes.forEach(s => {
          content += `"${s.sceneNumber}","${s.slugline}","${s.location}","${s.cast?.join('; ')}","${s.props?.join('; ')}"\n`;
        });
        filename += '.csv';
      } else if (type === 'Movie Magic Budgeting') {
        content = "Category,Description,Rate,Quantity,Unit,Total\n";
        budget.forEach(b => {
          content += `"${b.category}","${b.description}",${b.rate},${b.quantity},"${b.unit}",${b.amount}\n`;
        });
        filename += '.csv';
      } else {
        content = JSON.stringify({ project, scenes, days, budget }, null, 2);
        filename += '.json';
      }

      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(null);
      toast.success(`${type} package generated successfully!`);
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex flex-col gap-1 mb-4">
        <h2 className="display-title text-4xl">Studio Export</h2>
        <p className="text-slate-500 font-medium">Export your production data to industry-standard scheduling and budgeting software.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 hover:border-black transition-all group">
          <CardHeader>
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-black transition-colors">
              <TableIcon className="w-6 h-6 text-slate-600 group-hover:text-white" />
            </div>
            <CardTitle className="text-xl">Movie Magic Scheduling</CardTitle>
            <CardDescription>Export scene breakdown and talent data formatted for MMS (.csv import).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
                onClick={() => simulateExport('Movie Magic Scheduling')}
                className="w-full gap-2 rounded-xl h-11 font-bold uppercase tracking-widest text-[10px]"
                disabled={!!isExporting}
            >
              {isExporting === 'Movie Magic Scheduling' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting === 'Movie Magic Scheduling' ? 'Compiling Breakdown...' : 'Export MMS Script'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-black transition-all group">
          <CardHeader>
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-black transition-colors">
              <FileType className="w-6 h-6 text-slate-600 group-hover:text-white" />
            </div>
            <CardTitle className="text-xl">Movie Magic Budgeting</CardTitle>
            <CardDescription>Export detailed line items, unit rates, and totals for MMB (.csv import).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
                onClick={() => simulateExport('Movie Magic Budgeting')}
                className="w-full gap-2 rounded-xl h-11 font-bold uppercase tracking-widest text-[10px]"
                disabled={!!isExporting}
            >
              {isExporting === 'Movie Magic Budgeting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting === 'Movie Magic Budgeting' ? 'Compiling Budget...' : 'Export MMB Budget'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-black transition-all group">
          <CardHeader>
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-black transition-colors">
              <FileJson className="w-6 h-6 text-slate-600 group-hover:text-white" />
            </div>
            <CardTitle className="text-xl">Digital Production Report</CardTitle>
            <CardDescription>Full JSON package containing all analysis, sourcing, and agent outputs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
                onClick={() => simulateExport('Full Package')}
                className="w-full gap-2 rounded-xl h-11 font-bold uppercase tracking-widest text-[10px]"
                disabled={!!isExporting}
            >
              {isExporting === 'Full Package' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              {isExporting === 'Full Package' ? 'Bundling Agents...' : 'Download Digital Wrap'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-50 border-none shadow-none p-6 rounded-[2rem]">
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm uppercase tracking-tight">Sync Status: Ready</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
              Your production data is automatically synchronized across all export formats. Any changes made by AI agents in the Breakdown, Schedule, or Budget modules will be reflected in your next export.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
