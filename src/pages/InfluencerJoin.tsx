import React from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthProvider';

const STORAGE_KEY = 'pending_manager_invite_code';

export default function InfluencerJoin() {
  const navigate = useNavigate();
  const { user, profile, updateProfile, signIn } = useAuth();
  const [code, setCode] = React.useState('');
  const [handle, setHandle] = React.useState('');
  const [platform, setPlatform] = React.useState('Instagram');
  const [submitting, setSubmitting] = React.useState(false);

  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  const linkToManager = React.useCallback(async () => {
    if (!user || !normalized || normalized.length < 6) {
      toast.error('Enter the 8-character code from your manager');
      return;
    }
    setSubmitting(true);
    try {
      const snap = await getDoc(doc(db, 'managerInviteCodes', normalized));
      if (!snap.exists()) {
        toast.error('That code was not found. Ask your manager for their Curbily invite code.');
        return;
      }
      const managerId = snap.data()?.managerId as string | undefined;
      if (!managerId) {
        toast.error('Invalid invite record');
        return;
      }
      await updateProfile({
        marketplaceRole: 'influencer',
        linkedManagerId: managerId,
        viewMode: 'talent',
        onboarded: true,
      });
      const display = (handle || user.displayName || '').replace(/^@/, '');
      await setDoc(
        doc(db, 'contacts', user.uid),
        {
          uid: user.uid,
          name: user.displayName || display || 'Creator',
          email: user.email || '',
          linkedManagerId: managerId,
          type: ['influencer'],
          roles: [],
          isGlobal: false,
          ownerId: user.uid,
          ...(display
            ? {
                channels: [{ platform, handle: display, url: '', followers: 0, genre: '' }],
              }
            : {}),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      sessionStorage.removeItem(STORAGE_KEY);
      toast.success("You're linked to your manager");
      navigate('/', { replace: true });
    } catch (e) {
      console.error(e);
      toast.error('Could not complete signup');
    } finally {
      setSubmitting(false);
    }
  }, [user, normalized, handle, platform, updateProfile, navigate]);

  const goSignIn = async () => {
    if (!normalized || normalized.length < 6) {
      toast.error('Enter your manager code first');
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, normalized);
    await signIn('talent');
  };

  React.useEffect(() => {
    const pending = sessionStorage.getItem(STORAGE_KEY);
    if (pending) setCode((prev) => prev || pending);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
      <Card className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur">
        <CardHeader>
          <Sparkles className="h-8 w-8 text-blue-400 mb-2" />
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Influencer signup</CardTitle>
          <p className="text-sm text-white/50 font-medium leading-relaxed">
            Enter your manager&apos;s invite code, then sign in with Google. You can add your handle in one step—no full crew profile required.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Manager code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. K7NP2Q9A"
              className="h-12 rounded-xl border-white/20 bg-black/40 font-mono tracking-widest"
              maxLength={12}
              autoComplete="off"
            />
          </div>
          {user && (
            <>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Primary handle (optional)</Label>
                <Input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@yourhandle"
                  className="h-12 rounded-xl border-white/20 bg-black/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Platform</Label>
                <select
                  className="w-full h-12 rounded-xl border border-white/20 bg-black/40 px-3 text-sm"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option>Instagram</option>
                  <option>TikTok</option>
                  <option>YouTube</option>
                  <option>Other</option>
                </select>
              </div>
              <Button
                disabled={submitting}
                onClick={() => void linkToManager()}
                className="w-full h-12 rounded-xl bg-blue-600 font-black uppercase tracking-widest text-xs"
              >
                {submitting ? 'Linking…' : 'Complete signup'}
              </Button>
            </>
          )}
          {!user && (
            <Button
              onClick={() => void goSignIn()}
              className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-widest text-xs gap-2"
            >
              Continue with Google
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          <button type="button" onClick={() => navigate('/influencer-marketplace')} className="w-full text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white/70">
            Back to marketplace
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
