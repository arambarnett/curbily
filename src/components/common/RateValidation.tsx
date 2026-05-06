import React, { useEffect, useState } from 'react';
import { canonicalRateService, RateQueryParams, RateSelectionResult } from '../../services/canonicalRateService';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ShieldAlert, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { useAuth } from '../../lib/AuthProvider';

interface RateValidationProps {
  rate: number | string;
  params: RateQueryParams;
  onValidation?: (isValid: boolean, minRate?: number) => void;
}

export function RateValidation({ rate, params, onValidation }: RateValidationProps) {
  const { user } = useAuth();
  const [result, setResult] = useState<RateSelectionResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Extract the lowest number from the rate string to check against union minimums
  const parsedRateMatch = String(rate).match(/\d+/);
  const parsedRate = parsedRateMatch ? Number(parsedRateMatch[0]) : 0;

  useEffect(() => {
    async function checkRate() {
      if (!user) return;
      if (!params.union && !params.occCode && !params.positionTitle) return;
      setLoading(true);
      try {
        const res = await canonicalRateService.queryMinimumRate(params);
        setResult(res);
        
        if (res.selectedRate) {
          const minRate = res.selectedRate.amountUsd;
          onValidation?.(parsedRate >= minRate, minRate);
        } else {
          onValidation?.(true); // Default to valid if no rule found
        }
      } catch (err) {
        console.error("Rate validation error:", err);
      } finally {
        setLoading(false);
      }
    }
    checkRate();
  }, [parsedRate, JSON.stringify(params), user?.uid]);

  if (loading) return <div className="text-[10px] animate-pulse text-slate-400">Verifying union minimums...</div>;
  if (!result || !result.selectedRate) return null;

  const minRate = result.selectedRate.amountUsd;
  const isBelow = parsedRate > 0 && parsedRate < minRate;

  return (
    <div className="space-y-2 mt-2">
      {isBelow ? (
        <Alert variant="destructive" className="py-2 bg-red-50 border-red-200">
          <ShieldAlert className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-[10px] font-black uppercase text-red-700">Union Minimum Alert</AlertTitle>
          <AlertDescription className="text-[11px] text-red-800">
            Current base rate {rate} is below the {result.selectedRate.union} minimum of <strong>${minRate}</strong> for this {params.productionType || 'production'}.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg">
          <CheckCircle2 className="w-3 h-3 text-green-600" />
          <span className="text-[10px] font-bold text-green-700">
            Adheres to {result.selectedRate.union} {result.selectedRate.agreementCode || 'Standards'} (${minRate} min)
          </span>
        </div>
      )}
      
      {result.verificationNote && (
        <div className="flex items-start gap-1.5 px-2 py-1 bg-amber-50 rounded border border-amber-100 italic">
          <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5" />
          <span className="text-[9px] text-amber-700 leading-tight">{result.verificationNote}</span>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[8px] h-4 py-0 font-normal text-slate-400">
          Source: {result.selectedRate.sourceFile}
        </Badge>
        <Badge variant="outline" className={cn(
          "text-[8px] h-4 py-0 font-black uppercase",
          result.confidence === 'high' ? "text-green-600 border-green-200 bg-green-50" :
          result.confidence === 'medium' ? "text-amber-600 border-amber-200 bg-amber-50" :
          "text-red-600 border-red-200 bg-red-50"
        )}>
          {result.confidence} Confidence
        </Badge>
      </div>
    </div>
  );
}
