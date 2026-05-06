import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { FileText, Clock } from 'lucide-react';

export default function CallSheets() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter">My Call Sheets</h1>
        <p className="text-slate-500">Access call sheets for your active productions.</p>
      </div>

      <Card className="border-dashed border-2 bg-slate-50/50 py-20">
        <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
            <FileText className="w-8 h-8 text-slate-300" />
          </div>
          <div className="max-w-xs">
            <h3 className="font-bold uppercase tracking-tight text-lg text-slate-900">No active call sheets</h3>
            <p className="text-sm text-slate-500 mt-1 italic">When you are booked on a production and the call sheet is published, it will appear here for quick access.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
