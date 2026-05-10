import React from 'react';
import { useAuth } from '../lib/AuthProvider';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Film, User, Briefcase, X, Zap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '../lib/firebase';

export default function Login() {
  const { signIn, user, loading: authLoading } = useAuth();
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const mode = searchParams.get('mode') as 'producer' | 'talent' || 'producer';
  const isIframe = window.self !== window.top;
  const { switchViewMode, profile, updateProfile } = useAuth();

  const handlingRef = React.useRef(false);
  
  React.useEffect(() => {
    if (user && !authLoading && !handlingRef.current) {
      const handleExistingUser = async () => {
        handlingRef.current = true;

        const pendingInviteEarly = sessionStorage.getItem('pending_manager_invite_code')?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (pendingInviteEarly && pendingInviteEarly.length >= 6) {
          sessionStorage.removeItem('pending_manager_invite_code');
          const snap = await getDoc(doc(db, 'managerInviteCodes', pendingInviteEarly));
          if (!snap.exists()) {
            toast.error('Invalid manager invite code');
            navigate('/influencer-join', { replace: true });
            return;
          }
          const managerId = snap.data()?.managerId as string | undefined;
          if (managerId) {
            await updateProfile({
              marketplaceRole: 'influencer',
              linkedManagerId: managerId,
              viewMode: 'talent',
              onboarded: true,
            });
            await setDoc(
              doc(db, 'contacts', user.uid),
              {
                uid: user.uid,
                name: profile?.displayName || user.displayName || '',
                email: profile?.email || user.email || '',
                linkedManagerId: managerId,
                type: ['influencer'],
                roles: [],
                isGlobal: false,
                ownerId: user.uid,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
            toast.success('Linked to your manager');
          }
          navigate('/', { replace: true });
          return;
        }
        
        // If the intended mode differs from the current profile mode
        if (profile && profile.viewMode !== mode) {
          await switchViewMode(mode);
          // If switching to producer, ensure they are onboarded for studio
          if (mode === 'producer' && !profile.onboarded) {
            await updateProfile({ onboarded: true });
          }
        } else if (profile && mode === 'producer' && !profile.onboarded) {
          // Ensure studio users are always marked onboarded if they come through studio login
          await updateProfile({ onboarded: true });
        }

        const pendingMarketplaceRole = localStorage.getItem('pending_marketplace_role') as 'brand' | 'manager' | null;
        if (pendingMarketplaceRole) {
          localStorage.removeItem('pending_marketplace_role');
          await updateProfile({ marketplaceRole: pendingMarketplaceRole, viewMode: 'producer', onboarded: true });
          navigate(pendingMarketplaceRole === 'brand' ? '/brands' : '/managers', { replace: true });
          return;
        }

        navigate('/', { replace: true });
      };
      
      handleExistingUser();
    }
  }, [user, authLoading, navigate, mode, profile, switchViewMode, updateProfile]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn(mode);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black overflow-hidden relative font-sans">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-600/30 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-purple-600/30 blur-[150px] rounded-full"></div>
      </div>

      <div className="absolute top-8 left-8 z-50">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')} 
          className="text-white hover:bg-white/10 gap-2 font-black uppercase tracking-widest text-[10px]"
        >
          <X className="w-4 h-4" />
          Back to Curbily
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 w-full">
        {/* Left Panel: Visual/Statement */}
        <div className="hidden lg:flex flex-col justify-center px-24 relative overflow-hidden border-r border-white/10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-1 bg-white"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Studio Member Access</span>
            </div>
            
            <h2 className="text-[100px] leading-[0.8] font-black tracking-tighter text-white mb-8">
              BACKSTAGE <br />
              <span className="text-blue-500">CONTROL.</span>
            </h2>

            <p className="text-xl text-white/50 max-w-sm font-medium leading-normal">
              {mode === 'producer' 
                ? 'Manage your shorts, oversee your budget, and direct your AI crew from one central hub.'
                : 'Manage your portfolio, accept job offers, and coordinate with world-class drama studios.'
              }
            </p>
          </motion.div>
        </div>

        {/* Right Panel: Login Flow */}
        <div className="flex flex-col items-center justify-center p-8 bg-black/40 backdrop-blur-2xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm space-y-8"
          >
            <div className="text-center lg:text-left space-y-2">
              <div className="mb-6 lg:mb-8 inline-flex items-center justify-center p-4 bg-white rounded-3xl shadow-xl">
                 {mode === 'producer' ? <Briefcase className="w-8 h-8 text-black" /> : <User className="w-8 h-8 text-black" />}
              </div>
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                {mode === 'producer' ? 'Producer Login' : 'Creative Login'}
              </h1>
              <p className="text-white/50 font-medium">
                Unlock the full power of your production suite.
              </p>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={handleSignIn} 
                disabled={isSigningIn || authLoading}
                className="w-full h-20 text-lg font-black uppercase tracking-widest bg-white text-black hover:bg-slate-200 transition-all rounded-[1.5rem] group"
              >
                {isSigningIn ? (
                  <span className="flex items-center gap-3">
                    <Zap className="w-5 h-5 animate-spin" />
                    Initializing...
                  </span>
                ) : 'Sign in with Google'}
              </Button>

              <div className="flex items-center gap-4 py-4">
                <div className="h-px grow bg-white/10"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20 whitespace-nowrap">Secure Gate</span>
                <div className="h-px grow bg-white/10"></div>
              </div>

              <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Notice</p>
                <p className="text-[11px] text-white/60 leading-relaxed font-medium italic">
                  Advanced script-parsing features optimized for desktop browsers.
                </p>
              </div>
            </div>

            <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-white/20 pt-8">
              Powered by Curbily OS 4.0
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
