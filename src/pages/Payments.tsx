import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { DollarSign } from 'lucide-react';

export default function Payments() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Payments & Invoices</h1>
        <p className="text-slate-500">Track your earnings and payment status.</p>
      </div>

      <Card className="border-dashed border-2 bg-slate-50/50 py-20">
        <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
            <DollarSign className="w-8 h-8 text-slate-300" />
          </div>
          <div className="max-w-xs">
            <h3 className="font-bold uppercase tracking-tight text-lg text-slate-900">No payment history</h3>
            <p className="text-sm text-slate-500 mt-1 italic">Submit invoices and track processing status for completed productions. Payments are typically processed within 30 days of wrap.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
