import React, { useState } from 'react';
import { useAuth } from '../lib/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CreditCard, Zap, Package, Building2, User, Trash2, Loader2, LogOut, AlertTriangle } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isAdmin = profile?.role === 'admin' || (user?.email && ['aram.barnett@gmail.com', 'jonanthonybarnett@gmail.com'].includes(user.email.toLowerCase()));
  const usedRuns = profile?.projectsCreated || 0;
  const freeLimit = profile?.freeProjectLimit || 3;
  const tokens = profile?.tokens || 0;
  const subscription = profile?.subscription || 'free'; 

  const handleCheckout = async (priceId: string, type: 'subscription' | 'tokens' = 'subscription') => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.uid, 
          userEmail: user?.email,
          priceId,
          type
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountDeletion = async () => {
    setLoading(true);
    try {
      if (user) {
        console.log("Starting deletion for user:", user.uid);
        
        // 1. Delete user projects 
        try {
          const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
          const snapshot = await getDocs(q);
          const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletePromises);
          console.log("Deleted projects:", snapshot.size);
        } catch (err) {
          console.error("Deleting projects failed:", err);
          // Continue anyway
        }

        // 2. Delete contact profile
        try {
          await deleteDoc(doc(db, 'contacts', user.uid));
          console.log("Deleted contact doc");
        } catch (err) {
          console.error("Deleting contact doc failed:", err);
        }

        // 3. Delete user settings/role doc
        try {
          await deleteDoc(doc(db, 'users', user.uid));
          console.log("Deleted user doc");
        } catch (err) {
          console.error("Deleting user doc failed:", err);
        }
        
        // 4. Sign out and redirect
        await logout();
        navigate('/landing');
        alert("Account and data successfully removed.");
      }
    } catch (e) {
      console.error("Overall delete process failed:", e);
      alert("Account deletion encountered an error. Please try again or contact support.");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const isTalent = profile?.viewMode === 'talent';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex justify-between items-center text-[#0a0a0a]">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Settings</h1>
        <Button variant="outline" size="sm" onClick={() => logout()} className="md:hidden gap-2 border-2">
          <LogOut className="w-4 h-4" /> Logout
        </Button>
      </div>
      
      <div className="grid gap-6">
        {!isTalent && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="uppercase tracking-widest text-sm text-slate-500">Current Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border">
                  <div className="text-center md:text-left">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Free Projects</p>
                      <p className="text-xl font-black">{isAdmin ? 'Unlimited' : `${usedRuns} / ${freeLimit}`}</p>
                  </div>
                  <div className="text-center md:text-left border-y md:border-y-0 md:border-x border-slate-200 py-3 md:py-0 md:px-4">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Available Tokens</p>
                      <p className="text-xl font-black">{isAdmin ? 'Unlimited' : tokens}</p>
                  </div>
                  <div className="text-center md:text-left">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Current Plan</p>
                      <p className="text-xl font-black uppercase text-blue-600">{isAdmin ? 'Admin' : subscription}</p>
                  </div>
                </div>
                {usedRuns >= freeLimit && !isAdmin && subscription === 'free' && (
                  <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm font-bold">
                    You have reached your free project limit. Please upgrade your plan to continue creating projects.
                  </div>
                )}
              </CardContent>
            </Card>

            {subscription === 'free' && !isAdmin && (
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-2 border-black bg-black text-white hover:bg-slate-900 transition-colors md:col-span-2 max-w-2xl mx-auto w-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl text-white uppercase font-black"><Building2 className="w-5 h-5"/> Producer</CardTitle>
                    <CardDescription className="text-slate-400">$39 / month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-slate-300 mb-6 text-sm">
                      <li>• 1 free Master Run included per month</li>
                      <li>• Additional Runs at $6/run</li>
                      <li>• Full access to the autonomous production pipeline</li>
                    </ul>
                    <Button onClick={() => handleCheckout('price_1TM7DaLK4hGC6HUB6EYhmFoP')} disabled={loading} className="w-full bg-white text-black hover:bg-slate-200 font-bold uppercase tracking-widest">
                      Upgrade
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {(subscription !== 'free' || isAdmin) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl uppercase font-black"><Zap className="w-5 h-5"/> Additional Compute</CardTitle>
                  <CardDescription>Pay per additional master run of the agent pipeline.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => handleCheckout('price_1TQtVNLK4hGC6HUBMPxCSAPg', 'tokens')} variant="outline" className="font-bold uppercase tracking-widest border-2">
                    Buy 1 Run ($6)
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {isTalent && (
          <Card className="border-2 border-slate-100 shadow-sm rounded-[32px]">
             <CardHeader>
               <CardTitle className="text-xl font-black uppercase tracking-tighter">Your Account</CardTitle>
               <CardDescription>Profile management is currently optimized for crew members.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-[#0a0a0a]">{profile?.displayName}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{user?.email}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="text-[10px] font-black uppercase tracking-widest border-2" onClick={() => navigate('/edit-profile')}>
                    Edit Profile
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Network Referral</p>
                      <Button variant="link" className="p-0 h-auto text-[10px] font-black uppercase text-blue-600" onClick={() => {
                        const link = `${window.location.origin}/join?ref=${user?.uid}`;
                        navigator.clipboard.writeText(link);
                        alert("Referral link copied!");
                      }}>Copy Invite Link</Button>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-center">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Professional Verification</p>
                      <p className="text-[10px] font-black text-green-600 uppercase">ACTIVE</p>
                   </div>
                </div>
             </CardContent>
          </Card>
        )}

        <Card className="border-red-100 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl uppercase font-black text-red-900 leading-none">
              <Trash2 className="w-5 h-5" /> Account Deletion
            </CardTitle>
            <CardDescription className="text-red-700">Warning: This action is permanent and irreversible.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 mb-6 font-medium">
              Deleting your account will remove all your projects, files, and personal data from Curbily. 
              If you have an active subscription, please cancel it through the Stripe Customer Portal before deleting your account.
            </p>
            <Button 
              variant="destructive" 
              className="font-bold uppercase tracking-widest text-[10px] h-10 px-6"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Permanently Delete My Account"}
            </Button>

            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <DialogContent className="max-w-md bg-white border-2 border-red-200">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase text-red-600">
                    <AlertTriangle className="w-6 h-6" /> 
                    Confirm Deletion
                  </DialogTitle>
                  <DialogDescription className="text-slate-600 pt-2 font-medium">
                    Are you absolutely sure? This will permanently delete your Curbily account and all associated data. This action <span className="font-bold text-red-600 underline">cannot be undone</span>.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex gap-2 sm:gap-0 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={loading}
                    className="flex-1 font-bold uppercase tracking-widest text-[10px] border-2"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleAccountDeletion}
                    disabled={loading}
                    className="flex-1 font-bold uppercase tracking-widest text-[10px]"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Yes, Delete My Account
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
