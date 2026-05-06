import React, { useState } from 'react';
import { useAuth } from '../lib/AuthProvider';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Shield, Check, Zap, Lock } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY || '');
const ENABLE_PAYMENTS = (import.meta as any).env.VITE_ENABLE_PAYMENTS === 'true';
const ADMIN_EMAILS = ['aram.barnett@gmail.com', 'jonanthonybarnett@gmail.com'];

interface SubscriptionGateProps {
  children: React.ReactNode;
  featureName?: string;
  isPaid?: boolean;
}

export default function SubscriptionGate({ children, featureName = "this feature", isPaid = false }: SubscriptionGateProps) {
  const { profile, user } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const isAdmin = profile?.role === 'admin' || (user?.email && ['aram.barnett@gmail.com', 'jonanthonybarnett@gmail.com'].includes(user.email.toLowerCase()));
  const tokens = profile?.tokens || 0;
  const subscription = profile?.subscription || 'free';
  const freeLimit = profile?.freeProjectLimit || 3;
  const usedRuns = profile?.projectsCreated || 0;
  
  const isWithinFreeLimit = usedRuns < freeLimit;
  const hasTokens = tokens > 0;
  const hasSubscription = subscription !== 'free';

  // Bypass if payments are disabled globally, or if user is admin, or has sub/tokens/freebies
  const isSubscribed = !ENABLE_PAYMENTS || isAdmin || hasSubscription || hasTokens || isWithinFreeLimit;

  const handleSubscribe = async () => {
    if (!user) return;
    setIsRedirecting(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          priceId: 'price_1TQtVNLK4hGC6HUBMPxCSAPg',
          type: 'tokens'
        }),
      });
      
      const session = await response.json();
      const stripe = await stripePromise;
      
      if (stripe) {
        const { error } = await (stripe as any).redirectToCheckout({
          sessionId: session.id,
        });
        if (error) console.error(error);
      }
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsRedirecting(false);
    }
  };

  if (isSubscribed) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      {/* Blurred Content Overlay */}
      <div className="filter blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>

      {/* Paywall Card */}
      <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
        <Card className="w-full max-w-md border-2 border-[#0a0a0a] shadow-2xl bg-white">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-[#0a0a0a] text-white rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight">Premium Feature</CardTitle>
            <CardDescription className="text-lg">
              Unlock {featureName} and full production execution capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {[
                "Unlimited Outreach (Call, Text, Email)",
                "Autonomous Purchasing & Bookings",
                "Real-time Logistics Execution",
                "Priority AI Agent Support"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-sm font-medium opacity-80">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t border-dashed border-gray-200">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">Additional Compute Run</div>
                  <div className="text-3xl font-black tracking-tighter">$6.00</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-green-600">Free Trial</div>
                  <div className="text-sm font-medium">1 Free Run/Month Included</div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter flex-col gap-2>
            <Button 
              onClick={handleSubscribe} 
              disabled={isRedirecting}
              className="w-full py-8 rounded-full bg-[#0a0a0a] text-white hover:bg-[#0a0a0a]/90 text-lg font-bold uppercase tracking-widest group"
            >
              {isRedirecting ? "Redirecting..." : "Purchase Run - $6"}
              <Zap className="ml-2 group-hover:scale-125 transition-transform fill-current" />
            </Button>
            <div className="w-full text-center mt-2">
              <a href="/pricing" className="text-xs text-slate-500 hover:text-black transition-colors underline underline-offset-4">View Subscriptions ($39/mo Base)</a>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
