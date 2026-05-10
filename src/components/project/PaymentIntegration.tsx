import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { PaymentMethod, Project } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { CreditCard, Shield, Zap, CheckCircle2, AlertTriangle, Plus, Trash2, Loader2, X, DollarSign, Users, Clock, ShieldCheck, BarChart3 } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { toast } from 'sonner';

const stripePk = String((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_STRIPE_PUBLISHABLE_KEY ?? '').trim();
const stripePromise: Promise<Stripe | null> | null = stripePk ? loadStripe(stripePk) : null;

function AddCardForm({ projectId, onComplete, onCancel }: { projectId: string, onComplete: () => void, onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement as any,
    });

    if (error) {
      setError(error.message || 'An error occurred');
      setIsProcessing(false);
    } else {
      try {
        await addDoc(collection(db, 'projects', projectId, 'payment_methods'), {
          projectId,
          type: 'card',
          last4: paymentMethod.card?.last4 || '4242',
          brand: paymentMethod.card?.brand || 'Visa',
          expMonth: paymentMethod.card?.exp_month || 12,
          expYear: paymentMethod.card?.exp_year || 2026,
          isDefault: true,
          autonomousPurchasingEnabled: false,
          stripePaymentMethodId: paymentMethod.id
        });
        onComplete();
      } catch (err) {
        setError('Failed to save payment method to database.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-xl bg-white shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">Add New Card</h3>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="p-3 border rounded-md bg-slate-50">
        {stripePromise ? (
          <Elements stripe={stripePromise}>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': { color: '#aab7c4' },
                  },
                  invalid: { color: '#9e2146' },
                },
              }}
            />
          </Elements>
        ) : (
          <p className="text-xs text-slate-600">Set VITE_STRIPE_PUBLISHABLE_KEY to add cards.</p>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={!stripe || isProcessing}>
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Save Card
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function PaymentIntegration({ projectId, project }: { projectId: string, project: Project }) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'methods' | 'payouts'>('overview');

  useEffect(() => {
    const q = query(collection(db, 'projects', projectId, 'payment_methods'));
    const unsub = onSnapshot(q, (snapshot) => {
      setPaymentMethods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/payment_methods`);
    });

    return () => unsub();
  }, [projectId]);

  const toggleAutonomous = async (method: PaymentMethod) => {
    try {
      await updateDoc(doc(db, `projects/${projectId}/payment_methods`, method.id), {
        autonomousPurchasingEnabled: !method.autonomousPurchasingEnabled
      });
    } catch (error) {
      console.error('Failed to toggle autonomous purchasing:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, `projects/${projectId}/payment_methods`, id));
    } catch (error) {
      console.error('Failed to delete payment method:', error);
    }
  };

  const batchPayout = async () => {
    setIsProcessing(true);
    // Simulate Global Batch Payout (Stripe/Industry Partner integration)
    setTimeout(async () => {
      try {
        const amount = 12450;
        await updateDoc(doc(db, 'projects', projectId), {
          spentBudget: (project?.spentBudget || 0) + amount,
          paymentStatus: 'disbursing',
          updatedAt: serverTimestamp()
        });
        toast.success(`Released batch payout of $${amount.toLocaleString()} to crew & vendors.`);
      } catch (e) {
        console.error(e);
      } finally {
        setIsProcessing(false);
      }
    }, 2000);
  };

  if (loading) return <div className="p-8 text-center">Loading payment settings...</div>;

  const stats = [
    { name: 'Allocated', value: `$${(project?.totalBudget || 0).toLocaleString()}`, icon: DollarSign, color: 'text-blue-600' },
    { name: 'Spent', value: `$${(project?.spentBudget || 0).toLocaleString()}`, icon: CreditCard, color: 'text-amber-600' },
    { name: 'Pending', value: `$12,450`, icon: Clock, color: 'text-slate-600' },
    { name: 'Onboarded', value: `${project?.personnel?.filter(p => p.isConfirmed).length || 0}/${project?.personnel?.length || 0}`, icon: Users, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            FinOps & Payments
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Status: {project.paymentStatus || 'Initialized'} • Phase: {project.status}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeView === 'overview' ? 'default' : 'outline'} 
            size="sm" 
            className="text-[10px] font-black uppercase tracking-widest h-8"
            onClick={() => setActiveView('overview')}
          >
            Overview
          </Button>
          <Button 
            variant={activeView === 'payouts' ? 'default' : 'outline'} 
            size="sm" 
            className="text-[10px] font-black uppercase tracking-widest h-8"
            onClick={() => setActiveView('payouts')}
          >
            Disbursements
          </Button>
          <Button 
            variant={activeView === 'methods' ? 'default' : 'outline'} 
            size="sm" 
            className="text-[10px] font-black uppercase tracking-widest h-8"
            onClick={() => setActiveView('methods')}
          >
            Payment Methods
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg bg-slate-50", stat.color)}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.name}</p>
                  <p className="text-sm font-black text-slate-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Spending Velocity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[180px] flex items-end gap-2 px-4">
                {[45, 60, 55, 80, 95, 70, 85].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${val}%` }}
                      className={cn(
                        "w-full rounded-t-sm transition-all duration-500",
                        i === 6 ? "bg-blue-600" : "bg-slate-100"
                      )}
                    />
                    <span className="text-[8px] font-bold text-slate-400">MAY {10+i}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-slate-900 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <Shield className="w-8 h-8 text-blue-400 mb-4" />
                <h4 className="text-sm font-black uppercase tracking-widest mb-2">Internal Escrow</h4>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Funds are secured in your project wallet. Payments are only released upon production approval.
                </p>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 mb-4">
                  <p className="text-[9px] font-bold uppercase text-slate-500">Available to Spend</p>
                  <p className="text-xl font-black">$31,500.00</p>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-[10px] font-black uppercase tracking-widest h-10">
                  Fund Production Wallet
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeView === 'payouts' && (
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between py-4">
            <div>
              <CardTitle className="text-xs font-black uppercase tracking-widest">Global Disbursement Hub</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Ready for One-Click Payout via Global Partner</CardDescription>
            </div>
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700 text-[10px] font-black uppercase tracking-widest gap-2 h-9"
              onClick={batchPayout}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
              {isProcessing ? 'Processing Batch...' : 'Release Batch ($12,450.00)'}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr className="border-b border-slate-50">
                    <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Payee</th>
                    <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                    <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { name: 'Sarah Jenkins', type: 'Talent (SAG-AFTRA)', amount: 4500 },
                    { name: 'Blue Heron Studios', type: 'Venue / Rental', amount: 6500 },
                    { name: 'Mike Ross', type: 'Crew / Equipment', amount: 1450 },
                  ].map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-900">{p.name}</div>
                        <div className="text-[9px] text-green-600 font-bold uppercase mt-0.5">Onboarded</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-[8px] font-bold uppercase">{p.type}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs font-black text-slate-900">${p.amount.toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === 'methods' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Saved Methods</h3>
            {paymentMethods.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CreditCard className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-xs text-slate-500 font-bold uppercase">No cards on file</p>
                </CardContent>
              </Card>
            ) : (
              paymentMethods.map((method) => (
                <Card key={method.id} className="border-none shadow-sm bg-white overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 bg-slate-900 rounded flex items-center justify-center text-[8px] font-black text-white uppercase">{method.brand}</div>
                      <div>
                        <CardTitle className="text-xs font-black">•••• {method.last4}</CardTitle>
                        <CardDescription className="text-[9px]">Exp. {method.expMonth}/{method.expYear}</CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => handleDelete(method.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                </Card>
              ))
            )}
            <Button className="w-full bg-slate-100 text-slate-900 hover:bg-slate-200 border-none text-[10px] font-black uppercase tracking-widest h-10" onClick={() => setIsAdding(!isAdding)}>
              {isAdding ? 'Cancel' : 'Add New Payment Method'}
            </Button>
            {isAdding && (
              <AddCardForm projectId={projectId} onComplete={() => setIsAdding(false)} onCancel={() => setIsAdding(false)} />
            )}
          </div>
          
          <Card className="bg-slate-50 border-none shadow-inner self-start">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-blue-600 mb-4">
                <Shield className="w-5 h-5" />
                <h4 className="text-xs font-black uppercase tracking-widest">Vendor Security</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                We handle compliance, KYC, and tax reporting for all production members. Integration with global networks allows for instant onboarding and payout.
              </p>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400">Autonomous Spend Enabled</span>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
