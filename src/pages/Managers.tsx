import React from 'react';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowRight, Sparkles, Upload, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthProvider';

const parseRosterCsv = (text: string) => {
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  if (!headerLine) return [];

  const headers = headerLine.split(',').map((header) => header.trim().toLowerCase());
  return lines.map((line) => {
    const values = line.split(',').map((value) => value.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const platform = row.platform || 'Instagram';
    const handle = row.handle || row.username || '';
    const followers = Number(row.followers || row.audience || 0);
    const genre = row.genre || row.niche || row.category || '';
    const minimumRate = Number(row.minimum || row.minimum_rate || row.rate || row.fee || 0);

    return {
      id: crypto.randomUUID(),
      name: row.name || row.influencer || row.creator || '',
      handle,
      platform,
      channels: [{
        platform,
        handle,
        url: row.url || row.channel || '',
        followers,
        genre,
      }],
      niche: row.niche || row.category || '',
      contentGenre: genre,
      followers,
      rate: minimumRate,
      minimumRate,
      location: row.location || '',
      email: row.email || '',
    };
  }).filter((row) => row.name || row.handle);
};

export default function Managers() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [managerName, setManagerName] = React.useState('');
  const [rosterName, setRosterName] = React.useState('');
  const [rosterRows, setRosterRows] = React.useState<any[]>([]);
  const [savingRoster, setSavingRoster] = React.useState(false);

  const createManagerAccount = async () => {
    if (!user) {
      localStorage.setItem('pending_marketplace_role', 'manager');
      navigate('/login?mode=producer');
      return false;
    }

    await updateProfile({ marketplaceRole: 'manager', viewMode: 'producer', onboarded: true, companyName: managerName });
    await setDoc(doc(db, 'marketplaceAccounts', user.uid), {
      uid: user.uid,
      email: user.email || '',
      marketplaceRole: 'manager',
      companyName: managerName,
      status: 'active',
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return true;
  };

  const handleRosterUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseRosterCsv(text);
    setRosterRows(rows);
    if (!rosterName) setRosterName(file.name.replace(/\.[^.]+$/, ''));
    toast.success(`Parsed ${rows.length} creators`);
  };

  const saveRoster = async () => {
    const hasAccount = await createManagerAccount();
    if (!hasAccount || !user) return;
    if (rosterRows.length === 0) {
      toast.error('Upload a CSV roster first');
      return;
    }

    setSavingRoster(true);
    try {
      await addDoc(collection(db, 'influencerRosters'), {
        managerId: user.uid,
        managerEmail: user.email || '',
        managerName,
        rosterName: rosterName || `${managerName || 'Manager'} Roster`,
        influencers: rosterRows,
        visibility: 'marketplace',
        createdAt: serverTimestamp(),
        status: 'active',
      });
      toast.success('Manager roster saved');
      navigate('/influencer-marketplace/dashboard');
    } catch (error) {
      console.error(error);
      toast.error('Could not save roster');
    } finally {
      setSavingRoster(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10 bg-black/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <button onClick={() => navigate('/influencer-marketplace')} className="text-xl font-black tracking-tighter">Curbily</button>
          <Button onClick={() => navigate('/brands')} variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">Brand side</Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-8">
          <Badge className="rounded-full border-none bg-white text-black px-4 py-1">For Managers</Badge>
          <h1 className="text-6xl font-black uppercase leading-[0.85] tracking-tighter md:text-[92px]">
            Turn your roster into paid brand shortlists.
          </h1>
          <p className="max-w-xl text-lg font-medium leading-relaxed text-white/55">
            Upload real creators with channels, genres, audience size, and minimum rates. When a brand brief fits, send ten names and let the brand pick three.
          </p>
          <div className="grid gap-3">
            {[
              'Roster upload with channel and follower fields',
              'Minimum rates captured before shortlisting',
              'Brand briefs sorted by budget fit',
              'Future social OAuth for follower verification',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs font-black uppercase tracking-widest text-white/80">
                <Sparkles className="h-4 w-4 text-blue-400" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <Card className="rounded-[2.25rem] border-2 border-white/10 bg-white text-black shadow-[12px_12px_0_#2563eb]">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-3xl font-black uppercase tracking-tighter">
              <Users className="h-7 w-7 text-blue-600" />
              Create Manager Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Manager or agency name" value={managerName} onChange={(event) => setManagerName(event.target.value)} />
            <Input placeholder="Roster name" value={rosterName} onChange={(event) => setRosterName(event.target.value)} />
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
              <Upload className="mx-auto mb-3 h-9 w-9 text-slate-300" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                CSV columns: name, handle, platform, genre, followers, minimum/rate, location, email
              </p>
              <Input type="file" accept=".csv" onChange={handleRosterUpload} className="mt-5" />
            </div>
            {rosterRows.length > 0 && (
              <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
                Parsed {rosterRows.length} creators. First creator: {rosterRows[0]?.name || rosterRows[0]?.handle}
              </div>
            )}
            <Button onClick={saveRoster} disabled={savingRoster} className="h-14 w-full rounded-2xl bg-black text-[10px] font-black uppercase tracking-[0.22em] text-white hover:bg-slate-800">
              Create Account & Upload Roster
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
