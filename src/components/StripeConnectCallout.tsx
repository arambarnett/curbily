import React from 'react';
import { CreditCard, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/AuthProvider';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

/**
 * Opens Stripe-hosted Connect onboarding (Phase D).
 * Requires `server.ts` routes and a platform Stripe secret key.
 */
export function StripeConnectCallout() {
  const { profile, user } = useAuth();
  const [busy, setBusy] = React.useState(false);

  const startOnboarding = async () => {
    const u = auth.currentUser;
    if (!u) {
      toast.error('Sign in again to connect payouts.');
      return;
    }
    setBusy(true);
    try {
      const token = await u.getIdToken();
      const res = await fetch('/api/stripe/connect/onboarding-link', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnPath: window.location.pathname }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Stripe Connect unavailable');
      if (!data.url) throw new Error('No onboarding URL returned');
      window.location.assign(data.url);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Could not open Stripe onboarding');
    } finally {
      setBusy(false);
    }
  };

  const checkStatus = React.useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      const token = await u.getIdToken();
      const res = await fetch('/api/stripe/connect/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { payoutsEnabled?: boolean; detailsSubmitted?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not refresh status');
      if (data.payoutsEnabled) toast.success('Stripe payouts are enabled.');
      else if (data.detailsSubmitted) toast.info('Stripe account submitted — payouts may finish verification soon.');
      else toast.info('Stripe Connect not finished yet — open onboarding.');
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Status check failed');
    }
  }, []);

  React.useEffect(() => {
    const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (!q?.get('stripe_return')) return;
    void checkStatus();
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash || ''}`);
  }, [checkStatus]);

  if (!user || !profile) return null;

  const payoutsLive = !!(profile as { stripeConnectPayoutsEnabled?: boolean }).stripeConnectPayoutsEnabled;

  return (
    <Card className="rounded-3xl border-2 border-slate-200 bg-white mb-8">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="w-11 h-11 rounded-2xl bg-violet-600 text-white flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-black uppercase tracking-tight">Stripe Connect</CardTitle>
            <CardDescription>
              Optional onboarding for eventual payouts directly from Stripe. Built-in escrow remains off—we only store your connected account ID.
            </CardDescription>
          </div>
        </div>
        {payoutsLive ? (
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Verified</span>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="rounded-xl bg-violet-600 hover:bg-violet-700 gap-2"
          disabled={busy}
          onClick={() => void startOnboarding()}
        >
          {busy ? 'Opening…' : 'Start or resume onboarding'}
          <ExternalLink className="w-4 h-4" />
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => void checkStatus()}>
          Refresh status
        </Button>
      </CardContent>
    </Card>
  );
}
