import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  UserPlus, 
  Check, 
  ArrowRight, 
  LogIn, 
  Loader2, 
  Camera, 
  Briefcase, 
  Store,
  Plus,
  Trash2,
  X as ExitIcon
} from 'lucide-react';
import { collection, serverTimestamp, doc, setDoc, getDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthProvider';
import LocationAutocomplete from '../components/project/LocationAutocomplete';
import { cn, compressImage } from '../lib/utils';
import { RateValidation } from '../components/common/RateValidation';

export default function Join() {
  const navigate = useNavigate();
  const { user, signIn, profile, updateProfile, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedContactId, setClaimedContactId] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<('cast' | 'crew' | 'vendor')[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: '',
    headshotUrl: '',
    professionalLinks: [] as { label: string, url: string }[],
    
    // Cast specific
    age: '',
    isMinor: false,
    gender: '',
    contentStyles: [] as string[],
    
    // Crew specific
    crewRoles: [] as string[],
    minRate: '',
    maxRate: '',
    equipmentList: '',
    imdbUrl: '',
    union: '',
    
    // Vendor specific
    companyName: '',
    website: '',
    services: ''
  });

  const isStep3Valid = () => {
    return formData.firstName && formData.lastName && formData.email && formData.location && selectedTypes.length > 0;
  };

  const isStep4Valid = () => {
    if (selectedTypes.includes('crew')) {
      if (formData.crewRoles.length === 0 || !formData.minRate) return false;
    }
    if (selectedTypes.includes('cast')) {
      if (!formData.gender || !formData.age) return false;
    }
    if (selectedTypes.includes('vendor')) {
      if (!formData.companyName) return false;
    }
    return true;
  };

  const isStep5Valid = () => {
    return (formData.headshotUrl || formData.professionalLinks.length > 0) && formData.bio.length >= 20;
  };

  const contentStyleOptions = [
    "Commercial", "Narrative", "Music Video", "Documentary", 
    "Corporate", "Social Media", "Short Film", "Reality TV", "Content Creation"
  ];

  const crewRoleOptions = [
    "Producer", "Line Producer", "UPM", "Production Coordinator", "Production Assistant",
    "Director", "Director of Photography", "Gaffer", "Sound Mixer", "Editor", "HMU Artist", "Wardrobe Stylist"
  ];

  // Effects for redirection and initial state
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: user.email || '' }));
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user && profile?.onboarded) {
      console.log("User already onboarded, redirecting to home...");
      navigate('/');
    } else if (!authLoading && user && !profile?.onboarded && profile?.viewMode === 'producer') {
      navigate('/studio-join');
    }
  }, [user, profile, navigate, authLoading]);

  // If Auth is still stabilizing, show a dedicated loader to avoid "flicker" of the join form
  if (authLoading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-[#f5f5f4] flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#0a0a0a] mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-black uppercase tracking-tighter">Verifying Session</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Securing your professional identity...</p>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (user) {
      const checkExisting = async () => {
        try {
          const docRef = doc(db, 'contacts', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            // Only auto-advance to step 3 if we are at step 1
            if (step === 1) setStep(3);
          } else if (step === 1) {
            setStep(3);
          }
        } catch (error) {
          console.error("Error checking contact:", error);
          if (step === 1) setStep(3);
        }
      };
      checkExisting();
    }
  }, [user]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signIn('talent');
      setStep(3);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };



  const toggleType = (type: 'cast' | 'crew' | 'vendor') => {
    setSelectedTypes(prev => {
      const next = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type];
      if (next.length > 0 && !next.includes(activeTab as any)) {
        setActiveTab(next[0]);
      }
      return next;
    });
  };

  const toggleCrewRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      crewRoles: prev.crewRoles.includes(role) ? prev.crewRoles.filter(r => r !== role) : [...prev.crewRoles, role]
    }));
  };

  const toggleContentStyle = (style: string) => {
    setFormData(prev => ({
      ...prev,
      contentStyles: prev.contentStyles.includes(style) ? prev.contentStyles.filter(s => s !== style) : [...prev.contentStyles, style]
    }));
  };

  const handleSubmit = async () => {
    if (!user || selectedTypes.length === 0) return;
    setLoading(true);
    try {
      const roles = [];
      if (selectedTypes.includes('cast')) roles.push('Cast');
      if (selectedTypes.includes('crew')) roles.push(...formData.crewRoles);
      if (selectedTypes.includes('vendor')) roles.push('Vendor');

      const contactData = {
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        minRate: parseInt(String(formData.minRate)) || 0,
        maxRate: parseInt(String(formData.maxRate)) || 0,
        uid: user.uid,
        type: selectedTypes,
        roles: roles,
        status: 'pending_verification',
        createdAt: serverTimestamp(),
        agreedToTermsAt: serverTimestamp(),
        isGlobal: true 
      };

      try {
        await setDoc(doc(db, 'contacts', user.uid), contactData);
        if (isClaiming && claimedContactId) {
          await deleteDoc(doc(db, 'contacts', claimedContactId));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `contacts/${user.uid}`);
        throw error;
      }

      const isProducer = formData.crewRoles.includes('Producer');
      
      try {
        await updateProfile({
          onboarded: true,
          displayName: contactData.name,
          firstName: formData.firstName,
          lastName: formData.lastName,
          types: selectedTypes,
          role: isProducer ? 'producer' : 'user',
          viewMode: 'talent', // Always stay in talent/crew hub when joining through the Network
          updatedAt: serverTimestamp() as any
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        throw error;
      }

      setStep(6);
    } catch (error) {
      console.error('Error joining:', error);
      alert('Failed to submit profile. This is often due to an image being too large or a network error. Please try a smaller photo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 6) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, navigate]);

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-start relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-blue-600/20 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-600/20 blur-[100px] rounded-full"></div>
      </div>

      <div className="absolute top-8 left-8 z-50">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/landing')} 
          className="text-white hover:bg-white/10 gap-2 font-black uppercase tracking-widest text-[10px]"
        >
          <ExitIcon className="w-4 h-4" />
          Abort Sign-up
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 w-full min-h-screen">
        {/* Left Panel: The Vision */}
        <div className="hidden lg:flex flex-col justify-center px-24 relative overflow-hidden border-r border-white/10 bg-black">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-1 bg-blue-500"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Step {step} of 6</span>
            </div>
            
            <h2 className="text-[80px] leading-[0.8] font-black tracking-tighter text-white mb-8">
              THE <br />
              NETWORK <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 italic">HUB.</span>
            </h2>

            <div className="space-y-6 max-w-sm">
               <p className="text-xl text-white/50 font-medium leading-normal">
                 Join creators and professional crew members scaling the next generation of digital content.
               </p>
               <div className="flex gap-2">
                 <Badge className="bg-white/10 text-white/60 border-none uppercase text-[8px] font-black tracking-widest">9:16 Optimized</Badge>
                 <Badge className="bg-white/10 text-white/60 border-none uppercase text-[8px] font-black tracking-widest">AI Logistics</Badge>
                 <Badge className="bg-white/10 text-white/60 border-none uppercase text-[8px] font-black tracking-widest">Instant Booking</Badge>
               </div>
            </div>
          </motion.div>
        </div>

        {/* Right Panel: Interactive Form */}
        <div className="flex flex-col items-center justify-center p-8 lg:p-24 bg-white/5 backdrop-blur-3xl overflow-y-auto">
          <div className="w-full max-w-md mx-auto space-y-8">
            {step === 1 && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="text-center md:text-left space-y-4 mb-12">
                   <h1 className="text-5xl font-black uppercase tracking-tighter">Verified <br />Access</h1>
                   <p className="text-white/40 font-medium">Start your professional verification by signing in with Google.</p>
                </div>
                <Card className="bg-white rounded-[2rem] overflow-hidden border-none shadow-2xl">
                  <CardContent className="p-10">
                    <Button 
                      onClick={handleGoogleLogin} 
                      disabled={loading} 
                      className="w-full h-20 bg-black text-white hover:bg-slate-800 font-black uppercase tracking-widest gap-4 rounded-2xl transition-all active:scale-95 text-sm shadow-xl"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                      Verify with Google
                    </Button>
                    <p className="text-[9px] text-center text-slate-400 mt-8 font-black uppercase tracking-widest px-4 leading-relaxed">
                      Secure single-sign on ensures your professional identity is protected.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Account Details</p>
                   <h1 className="text-4xl font-black uppercase tracking-tighter">Who are you?</h1>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">First Name</Label>
                       <Input className="h-14 bg-white/5 border-white/10 text-white rounded-xl focus:border-blue-500" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Last Name</Label>
                       <Input className="h-14 bg-white/5 border-white/10 text-white rounded-xl focus:border-blue-500" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Your Location</Label>
                     <div className="bg-white/5 rounded-xl border border-white/10">
                       <LocationAutocomplete 
                         value={formData.location} 
                         onChange={(val) => setFormData({...formData, location: val})}
                         onSelect={(res) => setFormData({...formData, location: res.display_name.split(',')[0]})}
                       />
                     </div>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Register as:</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'cast', label: 'Talent', icon: Camera },
                        { id: 'crew', label: 'Crew', icon: Briefcase },
                        { id: 'vendor', label: 'Vendor', icon: Store }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => toggleType(t.id as any)}
                          className={cn(
                            "h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all",
                            selectedTypes.includes(t.id as any) 
                              ? "border-blue-500 bg-blue-600/10 text-blue-400" 
                              : "border-white/10 bg-white/5 hover:border-white/30 text-white/40 hover:text-white"
                          )}
                        >
                          <t.icon className="w-5 h-5" />
                          <span className="font-black uppercase tracking-widest text-[10px]">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={() => setStep(4)} disabled={!isStep3Valid()} className="w-full h-16 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 mt-8">
                    Continue to Details <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-purple-500">Expertise</p>
                   <h1 className="text-4xl font-black uppercase tracking-tighter">Your Skillset</h1>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 space-y-8">
                  <Tabs value={activeTab || (selectedTypes.length > 0 ? selectedTypes[0] : '')} onValueChange={setActiveTab} className="w-full">
                    {selectedTypes.length > 1 && (
                      <TabsList className="bg-black/40 border border-white/10 p-1 rounded-xl mb-8 flex">
                        {selectedTypes.map(t => (
                          <TabsTrigger key={t} value={t} className="flex-1 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-black rounded-lg">{t}</TabsTrigger>
                        ))}
                      </TabsList>
                    )}

                    {selectedTypes.includes('cast') && (
                      <TabsContent value="cast" className="space-y-6 outline-none">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 text-left block">Gender</Label>
                            <select className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black text-white text-sm focus:border-blue-500" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                              <option value="">Select...</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="non-binary">Non-Binary</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 text-left block">Age</Label>
                            <Input className="h-12 bg-black border-white/10 text-white rounded-xl" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} />
                          </div>
                        </div>
                      </TabsContent>
                    )}

                    {selectedTypes.includes('crew') && (
                      <TabsContent value="crew" className="space-y-6 outline-none">
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 text-left block text-left">Primary Roles</Label>
                          <div className="flex flex-wrap gap-2">
                            {crewRoleOptions.map(role => (
                              <button key={role} onClick={() => toggleCrewRole(role)} className={cn("px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all", formData.crewRoles.includes(role) ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/10 hover:border-white/30")}>
                                {role}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 text-left block text-left">Standard Day Rate ($)</Label>
                          <div className="flex items-center gap-4">
                            <Input placeholder="Min" className="h-12 bg-black border-white/10 text-white rounded-xl" value={formData.minRate} onChange={(e) => setFormData({...formData, minRate: e.target.value})} />
                            <div className="h-px grow bg-white/10"></div>
                            <Input placeholder="Max" className="h-12 bg-black border-white/10 text-white rounded-xl" value={formData.maxRate} onChange={(e) => setFormData({...formData, maxRate: e.target.value})} />
                          </div>
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1 h-16 border-white/10 text-white hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px]">Back</Button>
                  <Button onClick={() => setStep(5)} disabled={!isStep4Valid()} className="flex-1 h-16 bg-white text-black hover:bg-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px]">Next Step</Button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                 <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Identity</p>
                   <h1 className="text-4xl font-black uppercase tracking-tighter text-left">The Showcase</h1>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-8">
                  <div className="space-y-4">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 text-left block">Profile Visibility</Label>
                     <div className="flex items-center gap-6 p-6 border-2 border-dashed border-white/10 rounded-2xl relative overflow-hidden group">
                        <input type="file" id="headshot-upload" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                             if (file.size > 5 * 1024 * 1024) { alert("Max 5MB"); return; }
                             setIsCompressing(true);
                             const reader = new FileReader();
                             reader.onloadend = async () => {
                                try {
                                   const comp = await compressImage(reader.result as string);
                                   setFormData({...formData, headshotUrl: comp});
                                } catch { setFormData({...formData, headshotUrl: reader.result as string}); }
                                finally { setIsCompressing(false); }
                             };
                             reader.readAsDataURL(file);
                          }
                        }} />
                        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center relative shrink-0">
                           {isCompressing ? <Loader2 className="w-6 h-6 animate-spin text-white/40" /> : 
                            formData.headshotUrl ? <img src={formData.headshotUrl} alt="Me" className="w-full h-full object-cover" /> :
                            <Camera className="w-8 h-8 text-white/20" /> }
                        </div>
                        <div className="space-y-2 text-left">
                           <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Upload Headshot</p>
                           <Button 
                             size="sm" 
                             variant="secondary" 
                             className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white text-black hover:bg-slate-200"
                             onClick={() => document.getElementById('headshot-upload')?.click()}
                           >
                             {formData.headshotUrl ? "Change Photo" : "Select File"}
                           </Button>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4 text-left">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Professional Bio</Label>
                     <Textarea 
                       className="min-h-[120px] bg-black border-white/10 rounded-2xl text-white placeholder:text-white/20"
                       placeholder="Explain your short-form experience, digital content credits, or studio specialization..."
                       value={formData.bio}
                       onChange={(e) => setFormData({...formData, bio: e.target.value})}
                     />
                     <div className="flex justify-end">
                        <span className={cn("text-[9px] font-black uppercase tracking-widest", formData.bio.length >= 20 ? "text-emerald-500" : "text-white/20")}>
                           {formData.bio.length} / 20 chars
                        </span>
                     </div>
                  </div>

                  <div className="p-6 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl flex gap-4 items-center">
                     <input type="checkbox" id="join-terms" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="w-6 h-6 rounded-lg bg-black border-white/10 text-emerald-500 focus:ring-emerald-500" />
                     <label htmlFor="join-terms" className="text-[10px] font-black uppercase tracking-widest text-emerald-400 cursor-pointer">Agree to Curbily Professional Terms</label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(4)} className="flex-1 h-16 border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]">Back</Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={loading || isCompressing || !agreedToTerms || !isStep5Valid()}
                    className="flex-1 h-16 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : "Complete Profile"}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 6 && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-12 py-12">
                <div className="relative inline-block">
                  <div className="w-32 h-32 bg-emerald-500 text-black rounded-[2.5rem] flex items-center justify-center rotate-12 relative z-10 shadow-2xl">
                     <Check className="w-16 h-16" />
                  </div>
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-[2.5rem] animate-ping" />
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-6xl font-black uppercase tracking-tighter text-white">ACCESS <br />GRANTED</h1>
                  <p className="text-white/40 font-black uppercase tracking-widest text-xs">Redirecting to project hub...</p>
                </div>

                <Button onClick={() => navigate('/')} className="w-full h-20 bg-white text-black rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-slate-200 shadow-2xl">
                  Enter Dashboard
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
