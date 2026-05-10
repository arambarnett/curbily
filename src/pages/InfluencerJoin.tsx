import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

/**
 * Legacy landing: roster claiming now happens in Talent after sign-in.
 * We keep the route for old links and funnel people through login.
 */
export default function InfluencerJoin() {
  const nv = useNavigate();

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      nv('/login?mode=talent', { replace: true });
    }, 1200);
    return () => window.clearTimeout(id);
  }, [nv]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
      <Card className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur">
        <CardHeader>
          <Sparkles className="h-8 w-8 text-blue-400 mb-2" />
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Moving to Talent</CardTitle>
          <p className="text-sm text-white/50 font-medium leading-relaxed">
            Sign in here, then open <strong className="text-white/70">Talent</strong> and use <strong className="text-white/70">Claim roster slot</strong> with your personal code from your manager.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            onClick={() => nv('/login?mode=talent', { replace: true })}
            className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-widest text-xs"
          >
            Continue to sign in
          </Button>
          <button
            type="button"
            onClick={() => nv('/influencer-marketplace')}
            className="w-full text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white/70"
          >
            Back to marketplace
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
