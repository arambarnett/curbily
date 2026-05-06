import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Check, 
  ArrowRight, 
  Loader2, 
  Briefcase,
  Globe,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthProvider';

export default function StudioJoin() {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleFinishOnboarding = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Mark as onboarded and ensure role is producer
      await updateProfile({
        onboarded: true,
        role: 'producer',
        viewMode: 'producer',
        updatedAt: serverTimestamp() as any
      });

      setStep(2);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Error finishing studio onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-[#0a0a0a] font-sans selection:bg-[#0a0a0a] selection:text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="text-xl font-bold tracking-tighter mb-4">Curbily Studio</div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Welcome to the Ops Center</h1>
          <p className="text-slate-500 mt-2 italic">Streamlined production management for the modern studio.</p>
        </div>

        {step === 1 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-2 border-[#0a0a0a] shadow-2xl">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-8 text-center">
                <div className="mx-auto w-16 h-16 bg-[#0a0a0a] rounded-2xl flex items-center justify-center mb-4">
                  <Briefcase className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="uppercase tracking-tight font-black text-2xl">Initialize Studio Experience</CardTitle>
                <CardDescription>One click to activate your production tools.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 space-y-8 text-left">
                <div className="grid gap-6">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold uppercase tracking-widest text-[10px]">Global Access</h4>
                      <p className="text-sm text-slate-500 italic">Seamlessly source talent and crew across the entire network.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold uppercase tracking-widest text-[10px]">Automation Suite</h4>
                      <p className="text-sm text-slate-500 italic">AI script breakdowns, budgeting, and logistics in one console.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold uppercase tracking-widest text-[10px]">Secure Ops</h4>
                      <p className="text-sm text-slate-500 italic">Enterprise-grade security for your script and talent data.</p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleFinishOnboarding} 
                  disabled={loading} 
                  className="w-full h-16 bg-[#0a0a0a] text-white hover:bg-[#0a0a0a]/90 font-bold uppercase tracking-widest text-lg group shadow-xl"
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      Enter Studio Dashboard
                      <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
                
                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
                  By entering, you agree to the Curbily Studio Terms of Service <br />
                  and Privacy Protocol.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 text-[#0a0a0a]">Studio Activated</h2>
            <p className="text-slate-500 italic mb-8">Redirecting to your production headquarters...</p>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" />
          </motion.div>
        )}
      </div>
    </div>
  );
}
