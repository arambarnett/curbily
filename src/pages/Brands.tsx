import React from 'react';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowRight, BadgeDollarSign, Briefcase, CheckCircle2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthProvider';

export default function Brands() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [savingBrief, setSavingBrief] = React.useState(false);
  const [brandBrief, setBrandBrief] = React.useState({
    brandName: '',
    campaignName: '',
    budget: '',
    goals: '',
    influencerType: 'Micro creators',
    platforms: '',
    targetAudience: '',
    deliverables: '',
    influencerCount: '3',
    minFollowers: '',
    categoriesInput: '',
    subcategoriesInput: '',
    timelineStart: '',
    timelineEnd: '',
    backupSlots: '0',
    visibilityState: 'open' as 'open' | 'draft',
  });

  const createBrandAccount = async () => {
    if (!user) {
      localStorage.setItem('pending_marketplace_role', 'brand');
      navigate('/login?mode=producer');
      return;
    }

    await updateProfile({ marketplaceRole: 'brand', viewMode: 'producer', onboarded: true, companyName: brandBrief.brandName });
    await setDoc(doc(db, 'marketplaceAccounts', user.uid), {
      uid: user.uid,
      email: user.email || '',
      marketplaceRole: 'brand',
      companyName: brandBrief.brandName,
      status: 'active',
      updatedAt: serverTimestamp(),
    }, { merge: true });
    toast.success('Brand account ready');
  };

  const saveBrief = async () => {
    if (!user) {
      localStorage.setItem('pending_marketplace_role', 'brand');
      navigate('/login?mode=producer');
      return;
    }
    if (!brandBrief.brandName || !brandBrief.campaignName || !brandBrief.budget) {
      toast.error('Brand, campaign, and budget are required');
      return;
    }

    setSavingBrief(true);
    try {
      await createBrandAccount();
      const categories = brandBrief.categoriesInput
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      const subcategories = brandBrief.subcategoriesInput
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      const influencerCount = Math.min(99, Math.max(1, Number(brandBrief.influencerCount) || 3));
      const backupSlots = Math.min(99, Math.max(0, Number(brandBrief.backupSlots) || 0));
      const minFollowers = brandBrief.minFollowers === '' ? undefined : Math.max(0, Number(brandBrief.minFollowers) || 0);
      await addDoc(collection(db, 'brandBriefs'), {
        brandName: brandBrief.brandName,
        campaignName: brandBrief.campaignName,
        budget: Number(brandBrief.budget),
        goals: brandBrief.goals,
        influencerType: brandBrief.influencerType,
        platforms: brandBrief.platforms,
        targetAudience: brandBrief.targetAudience,
        deliverables: brandBrief.deliverables,
        influencerCount,
        minFollowers,
        categories,
        subcategories,
        timelineStart: brandBrief.timelineStart || undefined,
        timelineEnd: brandBrief.timelineEnd || undefined,
        backupSlots,
        brandId: user.uid,
        brandEmail: user.email || '',
        status: brandBrief.visibilityState === 'draft' ? 'draft' : 'open',
        visibility: 'marketplace',
        pricingPlan: 'brand_access_199',
        billingEnabled: false,
        createdAt: serverTimestamp(),
      });
      toast.success('Brand brief created');
      navigate('/influencer-marketplace/dashboard');
    } catch (error) {
      console.error(error);
      toast.error('Could not create brand brief');
    } finally {
      setSavingBrief(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#0a0a0a]">
      <Header onBack={() => navigate('/influencer-marketplace')} />
      <main className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="space-y-8">
          <Badge className="rounded-full border-none bg-blue-600 px-4 py-1 text-white">For Brands</Badge>
          <h1 className="text-6xl font-black uppercase leading-[0.85] tracking-tighter md:text-[92px]">
            Submit a brief. Pick three creators.
          </h1>
          <p className="max-w-xl text-lg font-medium leading-relaxed text-slate-500">
            Brand access will be $199/month, but billing is disabled while we onboard early users. Create an account and brief now so managers can send ten-name creator shortlists.
          </p>

          <Card className="rounded-[2rem] border-2 border-black bg-white shadow-[6px_6px_0_#000]">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Planned Brand Access</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-6xl font-black tracking-tighter">$199</span>
                    <span className="text-sm font-black uppercase tracking-widest text-slate-400">/ month</span>
                  </div>
                </div>
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Not enabled</Badge>
              </div>
              {['Budget-first brief intake', 'Managers send ten real names', 'Brand selects up to three', 'Texting and payments come later'].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-[2.25rem] border-2 border-slate-200 bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-3xl font-black uppercase tracking-tighter">
              <Briefcase className="h-7 w-7 text-blue-600" />
              Create Brand Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Brand name" value={brandBrief.brandName} onChange={(event) => setBrandBrief({ ...brandBrief, brandName: event.target.value })} />
            <Input placeholder="Campaign name" value={brandBrief.campaignName} onChange={(event) => setBrandBrief({ ...brandBrief, campaignName: event.target.value })} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input type="number" placeholder="Budget / rate from email subject" value={brandBrief.budget} onChange={(event) => setBrandBrief({ ...brandBrief, budget: event.target.value })} />
              <select className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={brandBrief.influencerType} onChange={(event) => setBrandBrief({ ...brandBrief, influencerType: event.target.value })}>
                <option>Micro creators</option>
                <option>Mid-tier influencers</option>
                <option>Macro influencers</option>
                <option>Celebrity talent</option>
                <option>UGC creators</option>
              </select>
            </div>
            <Input placeholder="Preferred platforms, e.g. TikTok, Instagram, YouTube Shorts" value={brandBrief.platforms} onChange={(event) => setBrandBrief({ ...brandBrief, platforms: event.target.value })} />
            <Input placeholder="Target audience" value={brandBrief.targetAudience} onChange={(event) => setBrandBrief({ ...brandBrief, targetAudience: event.target.value })} />
            <Textarea placeholder="Campaign goals" value={brandBrief.goals} onChange={(event) => setBrandBrief({ ...brandBrief, goals: event.target.value })} />
            <Textarea placeholder="Deliverables, usage rights, timing, must-haves" value={brandBrief.deliverables} onChange={(event) => setBrandBrief({ ...brandBrief, deliverables: event.target.value })} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input type="number" placeholder="Creator slots (#)" value={brandBrief.influencerCount} onChange={(event) => setBrandBrief({ ...brandBrief, influencerCount: event.target.value })} />
              <Input type="number" placeholder="Minimum followers / subs" value={brandBrief.minFollowers} onChange={(event) => setBrandBrief({ ...brandBrief, minFollowers: event.target.value })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input placeholder="Categories — comma-separated" value={brandBrief.categoriesInput} onChange={(event) => setBrandBrief({ ...brandBrief, categoriesInput: event.target.value })} />
              <Input placeholder="Subcategories — comma-separated" value={brandBrief.subcategoriesInput} onChange={(event) => setBrandBrief({ ...brandBrief, subcategoriesInput: event.target.value })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input type="date" value={brandBrief.timelineStart} onChange={(event) => setBrandBrief({ ...brandBrief, timelineStart: event.target.value })} />
              <Input type="date" value={brandBrief.timelineEnd} onChange={(event) => setBrandBrief({ ...brandBrief, timelineEnd: event.target.value })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4 items-center">
              <Input type="number" placeholder="Backup roster slots (#)" value={brandBrief.backupSlots} onChange={(event) => setBrandBrief({ ...brandBrief, backupSlots: event.target.value })} />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-bold"
                value={brandBrief.visibilityState}
                onChange={(event) =>
                  setBrandBrief({ ...brandBrief, visibilityState: event.target.value === 'draft' ? 'draft' : 'open' })
                }
              >
                <option value="open">Publish open — managers can respond</option>
                <option value="draft">Save as draft</option>
              </select>
            </div>
            <Button onClick={saveBrief} disabled={savingBrief} className="h-14 w-full rounded-2xl bg-blue-600 text-[10px] font-black uppercase tracking-[0.22em] text-white hover:bg-blue-700">
              Create Account & Brief
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <header className="border-b border-black/10 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <button onClick={onBack} className="text-xl font-black tracking-tighter">Curbily</button>
        <BadgeDollarSign className="h-5 w-5 text-blue-600" />
      </div>
    </header>
  );
}
