import React from 'react';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { claimCreatorProfileWithCode } from '../lib/claimCreatorProfile';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../types';

export function CreatorClaimBanner({ user, profile }: { user: User; profile: UserProfile | null }) {
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  if (profile?.claimedCreatorProfileId) return null;
  if (profile?.viewMode !== 'talent' && profile?.marketplaceRole !== 'influencer') return null;

  const submit = async () => {
    setBusy(true);
    try {
      await claimCreatorProfileWithCode({
        uid: user.uid,
        email: user.email || profile?.email || '',
        displayName: profile?.displayName || user.displayName || '',
        code,
      });
      toast.success('Roster claimed. You’re linked to your manager’s marketplace roster.');
      setCode('');
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Could not claim roster slot.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-[3px] border-black shadow-[8px_8px_0_0_#2563eb] rounded-[2rem] overflow-hidden bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-widest">Claim roster slot</CardTitle>
            <CardDescription className="text-xs font-medium">
              Paste the <strong>personal roster code</strong> your manager emailed you—it links your account to their creator inventory inside Curbily.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-3 pb-6">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. AB12CD34"
          maxLength={12}
          autoComplete="off"
          className="font-mono tracking-widest sm:flex-1 h-11 rounded-xl border-2 border-black"
        />
        <Button
          type="button"
          disabled={busy || !code.trim()}
          onClick={() => void submit()}
          className="h-11 rounded-xl bg-black font-black uppercase tracking-widest text-[10px] px-8"
        >
          {busy ? 'Claiming…' : 'Claim'}
        </Button>
      </CardContent>
    </Card>
  );
}
