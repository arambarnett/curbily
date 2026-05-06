import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Check, 
  ArrowRight, 
  X as ExitIcon,
  Loader2, 
  Camera, 
  Briefcase, 
  Store,
  Trash2,
  AlertTriangle,
  LogOut,
  Plus
} from 'lucide-react';
import { doc, serverTimestamp, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthProvider';
import LocationAutocomplete from '../components/project/LocationAutocomplete';
import { cn, compressImage } from '../lib/utils';
import { PROJECT_TYPES } from '../types';
import { RateValidation } from '../components/common/RateValidation';

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, logout, updateProfile, profile } = useAuth();
  const [step, setStep] = useState(3);
  const [loading, setLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<('cast' | 'crew' | 'vendor')[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    canTravel: 'yes',
    dietaryRestrictions: [] as string[],
    allergies: '',
    bio: '',
    headshotUrl: '',
    professionalLinks: [] as { label: string, url: string }[],
    imdbUrl: '',
    linkedinUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    portfolioUrl: '',
    heightFt: '',
    heightIn: '',
    weight: '',
    eyeColor: '',
    hairColor: '',
    age: '',
    isMinor: false,
    gender: '',
    contentStyles: [] as string[],
    actingReelLinks: [] as { label: string, url: string }[],
    
    // Adult specific
    isAdultContentActor: false,
    adultContentDetails: '',
    onscreenCapabilities: [] as string[],
    
    // Crew specific
    crewRoles: [] as string[],
    minRate: '',
    maxRate: '',
    projectTypeRates: [] as { type: string, minRate: string, maxRate: string }[],
    equipmentList: '',
    union: '',
    occCode: '',
    isSAG: false,
    
    // Vendor specific
    companyName: '',
    website: '',
    services: '',

    // Producer specific
    productionCompany: '',
    yearsExperience: '',
    specialties: [] as string[]
  });

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, 'contacts', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const nameParts = (data.name || '').split(' ');
            const fName = data.firstName || nameParts[0] || '';
            const lName = data.lastName || nameParts.slice(1).join(' ') || '';
            
            setFormData(prev => ({
              ...prev,
              ...data,
              firstName: fName,
              lastName: lName,
              email: data.email || user.email || '',
              minRate: String(data.minRate || data.rate || ''),
              maxRate: String(data.maxRate || ''),
              projectTypeRates: data.projectTypeRates?.map((r: any) => ({ 
                type: r.type, 
                minRate: String(r.minRate || r.rate || ''), 
                maxRate: String(r.maxRate || '') 
              })) || [],
              professionalLinks: data.professionalLinks || (data.portfolioUrl ? [{ label: 'Portfolio', url: data.portfolioUrl }] : []),
              imdbUrl: data.imdbUrl || '',
              linkedinUrl: data.linkedinUrl || '',
              instagramUrl: data.instagramUrl || '',
              twitterUrl: data.twitterUrl || '',
              portfolioUrl: data.portfolioUrl || '',
              actingReelLinks: data.actingReelLinks || (data.actingReelUrl ? [{ label: 'Acting Reel', url: data.actingReelUrl }] : []),
              dietaryRestrictions: data.dietaryRestrictions || (data.dietary ? [data.dietary] : [])
            }));
            if (data.type) {
              setSelectedTypes(data.type);
              setActiveTab(data.type[0]);
            }
          } else {
            // No profile found, redirect to join
            navigate('/join');
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [user, navigate]);

  useEffect(() => {
    if (formData.isMinor) {
      setFormData(prev => ({
        ...prev,
        contentStyles: prev.contentStyles.filter(s => s !== "Adult"),
        onscreenCapabilities: prev.onscreenCapabilities.filter(c => !["Intimacy/Adult", "BDSM/Fetish", "Solo Work"].includes(c)),
        isAdultContentActor: false
      }));
    }
  }, [formData.isMinor]);

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
    "Corporate", "Social Media", "Short Film", "Experimental",
    "Reality TV", "Voice Over", "Animation", "Content Creation", "Adult"
  ];

  const dietaryOptions = [
    "Vegan", "Vegetarian", "Gluten-Free", "Dairy-Free", "Nut-Free", 
    "Keto", "Paleo", "Halal", "Kosher", "None"
  ];

  const advancedCapabilityOptions = [
    "Technical/Practical", "Physical Stunts", "Intimacy/Adult", "Specialized Talent",
    "BDSM/Fetish", "Solo Work", "Multi-Performer"
  ];

  const crewRoleOptions = [
    "Producer", "Line Producer", "UPM", "Production Coordinator", "Production Assistant",
    "Director", "1st AD", "2nd AD", "Script Supervisor", "Production Designer", "Art Director", "Set Decorator", "Prop Master",
    "Director of Photography", "1st AC", "2nd AC", "Key Grip", "Gaffer", "Best Boy", "Electrician", "Grip", "DIT",
    "Sound Mixer", "Boom Operator", "Editor", "Assistant Editor", "Colorist", "VFX Artist", "Composer", "Sound Designer",
    "HMU Artist", "Wardrobe Stylist", "Costumer", "Set Teacher", "Location Manager", "Craft Services"
  ];

  const industryOccupationCodes: Record<string, string> = {
    "Producer": "PROD-001",
    "Director": "DIR-001",
    "Director of Photography": "CAM-001",
    "Gaffer": "ELE-001",
    "Sound Mixer": "SND-001",
    "Editor": "POST-001"
  };

  const toggleType = (type: 'cast' | 'crew' | 'vendor') => {
    setSelectedTypes(prev => {
      const next = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type];
      if (next.length > 0 && !next.includes(activeTab as any)) {
        setActiveTab(next[0]);
      } else if (next.length === 0) {
        setActiveTab('');
      }
      return next;
    });
  };

  const toggleCrewRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      crewRoles: prev.crewRoles.includes(role) 
        ? prev.crewRoles.filter(r => r !== role)
        : [...prev.crewRoles, role]
    }));
  };

  const toggleContentStyle = (style: string) => {
    setFormData(prev => ({
      ...prev,
      contentStyles: prev.contentStyles.includes(style)
        ? prev.contentStyles.filter(s => s !== style)
        : [...prev.contentStyles, style]
    }));
  };

  const toggleAdultCapability = (capability: string) => {
    setFormData(prev => ({
      ...prev,
      onscreenCapabilities: prev.onscreenCapabilities.includes(capability)
        ? prev.onscreenCapabilities.filter(c => c !== capability)
        : [...prev.onscreenCapabilities, capability]
    }));
  };

  const toggleDietary = (option: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(option)
        ? prev.dietaryRestrictions.filter(o => o !== option)
        : [...prev.dietaryRestrictions, option]
    }));
  };

  const addProjectTypeRate = () => {
    setFormData(prev => ({
      ...prev,
      projectTypeRates: [...prev.projectTypeRates, { type: 'feature', minRate: '', maxRate: '' }]
    }));
  };

  const updateProjectTypeRate = (index: number, field: 'type' | 'minRate' | 'maxRate', value: string) => {
    const newRates = [...formData.projectTypeRates];
    newRates[index] = { ...newRates[index], [field]: value };
    setFormData(prev => ({ ...prev, projectTypeRates: newRates }));
  };

  const removeProjectTypeRate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      projectTypeRates: prev.projectTypeRates.filter((_, i) => i !== index)
    }));
  };

  const addLink = (type: 'professional' | 'reel') => {
    const key = type === 'professional' ? 'professionalLinks' : 'actingReelLinks';
    setFormData(prev => ({
      ...prev,
      [key]: [...prev[key], { label: '', url: '' }]
    }));
  };

  const updateLink = (type: 'professional' | 'reel', index: number, field: 'label' | 'url', value: string) => {
    const key = type === 'professional' ? 'professionalLinks' : 'actingReelLinks';
    const newLinks = [...formData[key]];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setFormData(prev => ({ ...prev, [key]: newLinks }));
  };

  const removeLink = (type: 'professional' | 'reel', index: number) => {
    const key = type === 'professional' ? 'professionalLinks' : 'actingReelLinks';
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index)
    }));
  };

  const handleDeleteProfile = async () => {
    if (!user) return;
    const confirmDelete = window.confirm("Are you sure you want to delete your Crew Profile? This will remove you from our network search. Your Studio Ops account will remain unaffected.");
    if (!confirmDelete) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'contacts', user.uid));
      await setDoc(doc(db, 'users', user.uid), {
        onboarded: selectedTypes.includes('producer'),
        types: selectedTypes.filter(t => t === 'producer'),
        viewMode: 'producer',
      }, { merge: true });

      alert("Crew profile deleted successfully.");
      navigate('/');
    } catch (error) {
      console.error("Error deleting profile:", error);
      alert("Failed to delete profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || selectedTypes.length === 0) return;
    setLoading(true);
    try {
      const roles = [];
      if (selectedTypes.includes('cast')) roles.push('Cast');
      if (selectedTypes.includes('crew')) roles.push(...formData.crewRoles);
      if (selectedTypes.includes('vendor')) roles.push('Vendor');

      const roleCodes = roles.map(r => industryOccupationCodes[r]).filter(Boolean);

      const contactData = {
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        occCode: roleCodes[0] || formData.occCode,
        allOccCodes: roleCodes,
        minRate: formData.minRate ? parseInt(String(formData.minRate)) || 0 : 0,
        maxRate: formData.maxRate ? parseInt(String(formData.maxRate)) || 0 : 0,
        rateRaw: `${formData.minRate}-${formData.maxRate}`,
        imdbUrl: formData.imdbUrl,
        linkedinUrl: formData.linkedinUrl,
        instagramUrl: formData.instagramUrl,
        twitterUrl: formData.twitterUrl,
        projectTypeRates: formData.projectTypeRates
          .filter(r => r.type && (r.minRate || r.maxRate))
          .map(r => ({ type: r.type, minRate: parseInt(String(r.minRate)) || 0, maxRate: parseInt(String(r.maxRate)) || 0, rateRaw: `${r.minRate}-${r.maxRate}` })),
        portfolioUrl: formData.portfolioUrl || formData.professionalLinks.find(l => l.label.toLowerCase().includes('portfolio'))?.url || formData.professionalLinks[0]?.url || '',
        uid: user.uid,
        type: selectedTypes,
        roles: roles.length > 0 ? roles : [],
        updatedAt: serverTimestamp(),
        tags: roles.length > 0 ? roles : selectedTypes,
      };

      try {
        await setDoc(doc(db, 'contacts', user.uid), contactData, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `contacts/${user.uid}`);
        throw error;
      }

      const isProducer = formData.crewRoles.includes('Producer') || formData.crewRoles.includes('Line Producer') || formData.crewRoles.includes('UPM');
      
      try {
        await updateProfile({
          displayName: `${formData.firstName} ${formData.lastName}`.trim(),
          firstName: formData.firstName,
          lastName: formData.lastName,
          types: selectedTypes,
          role: isProducer ? 'producer' : 'user',
          // Preserve current viewMode or default to talent
          viewMode: profile?.viewMode || 'talent',
          updatedAt: serverTimestamp() as any
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        throw error;
      }

      setStep(6);
    } catch (error) {
      console.error('Error updating:', error);
      alert('Failed to update profile. This is often due to an image being too large. Please try a smaller photo.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = isStep3Valid() && isStep4Valid() && isStep5Valid();

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-[#0a0a0a] font-sans selection:bg-[#0a0a0a] selection:text-white flex flex-col items-center justify-center p-2 md:p-4 py-8 md:py-20 relative">
      <div className="w-full max-w-3xl">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 border-b border-slate-200 pb-4 gap-4">
          <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter">Edit Professional Profile</h2>
          <div className="flex gap-2 w-full md:w-auto">
            <Button 
              onClick={() => handleSubmit()} 
              disabled={loading || !isFormValid}
              className="flex-1 md:flex-none text-[10px] md:text-xs uppercase font-bold tracking-widest h-9 md:h-8 px-4 bg-[#0a0a0a] text-white hover:bg-slate-800"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Changes'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="flex-1 md:flex-none text-[10px] md:text-xs uppercase font-bold tracking-widest gap-2 hover:bg-slate-200 h-9 md:h-8 px-4">
              <ExitIcon className="w-4 h-4" /> Exit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => logout()} className="flex-1 md:flex-none text-[10px] md:text-xs uppercase font-bold tracking-widest gap-2 text-red-500 hover:bg-red-50 h-9 md:h-8 px-4">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>

        <div className="text-center mb-8 md:mb-12">
          <div className="text-lg md:text-xl font-bold tracking-tighter mb-2">Curbily</div>
          <p className="text-xs md:text-sm text-slate-500 italic font-medium">Keep your professional identity up to date across the production network.</p>
        </div>

        {step < 6 && (
          <div className="space-y-8">
            {/* Step 3 Part: Basic Info */}
            <Card className="border-2 border-[#0a0a0a] shadow-xl overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="uppercase tracking-tight font-black">Basic Profile Information</CardTitle>
                <CardDescription>How should we identify you in the network?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 text-left p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">First Name</label>
                    <Input className="h-10 text-sm" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Last Name</label>
                    <Input className="h-10 text-sm" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Email Address</label>
                    <Input className="h-10 text-sm" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Phone Number</label>
                    <Input className="h-10 text-sm" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Travel Capability</label>
                    <select 
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                      value={formData.canTravel}
                      onChange={(e) => setFormData({...formData, canTravel: e.target.value})}
                    >
                      <option value="Local Only">Local Only</option>
                      <option value="Within 50 Miles">Within 50 Miles</option>
                      <option value="Within 100 Miles">Within 100 Miles</option>
                      <option value="National">National</option>
                      <option value="International">International</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Base Location</label>
                  <LocationAutocomplete 
                    value={formData.location} 
                    onChange={(val) => setFormData({...formData, location: val})}
                    onSelect={(res) => setFormData({...formData, location: res.display_name.split(',')[0]})}
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">I am registered as:</label>
                  <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4">
                    {[
                      { id: 'cast', label: 'Cast', icon: Camera },
                      { id: 'crew', label: 'Crew', icon: Briefcase },
                      { id: 'vendor', label: 'Vendor', icon: Store }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => toggleType(t.id as any)}
                        className={cn(
                          "p-2 md:p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all",
                          selectedTypes.includes(t.id as any) 
                            ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" 
                            : "border-slate-200 hover:border-slate-400"
                        )}
                      >
                        <t.icon className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="font-bold uppercase tracking-widest text-[7px] md:text-[8px]">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 4 Part: Pro Details */}
            <Card className="border-2 border-[#0a0a0a] shadow-xl overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="uppercase tracking-tight font-black">Professional Roles & Rates</CardTitle>
                <CardDescription>Manage your specialized roles and compensation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pt-6 p-4 md:p-6">
                <Tabs value={activeTab || (selectedTypes.length > 0 ? selectedTypes[0] : '')} onValueChange={setActiveTab} className="w-full">
                  {selectedTypes.length > 1 && (
                    <TabsList className="grid grid-cols-3 w-full mb-4 h-auto p-1 bg-slate-100">
                      {selectedTypes.includes('cast') && <TabsTrigger value="cast" className="text-[10px] uppercase font-bold py-2">Cast</TabsTrigger>}
                      {selectedTypes.includes('crew') && <TabsTrigger value="crew" className="text-[10px] uppercase font-bold py-2">Crew</TabsTrigger>}
                      {selectedTypes.includes('vendor') && <TabsTrigger value="vendor" className="text-[10px] uppercase font-bold py-2">Vendor</TabsTrigger>}
                    </TabsList>
                  )}

                  {selectedTypes.includes('cast') && (
                    <TabsContent value="cast" className="m-0 text-left">
                      <div className="space-y-6 p-4 md:p-6 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Cast Rate Range ($)</label>
                          <div className="flex items-center gap-2">
                            <Input className="h-10 text-sm" placeholder="Min" value={formData.minRate} onChange={(e) => setFormData({...formData, minRate: e.target.value.replace(/[^\d]/g, '')})} />
                            <span className="text-slate-400 font-bold">-</span>
                            <Input className="h-10 text-sm" placeholder="Max" value={formData.maxRate} onChange={(e) => setFormData({...formData, maxRate: e.target.value.replace(/[^\d]/g, '')})} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Gender Identity</Label>
                            <select 
                              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                              value={formData.gender}
                              onChange={(e) => setFormData({...formData, gender: e.target.value})}
                            >
                              <option value="">Select...</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="non-binary">Non-Binary</option>
                              <option value="transgender">Transgender</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Age</Label>
                            <Input className="h-10 text-sm" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value.replace(/[^\d]/g, '')})} />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Industry Specializations</Label>
                          <div className="flex flex-wrap gap-2">
                            {contentStyleOptions
                              .filter(style => !formData.isMinor || style !== "Adult")
                              .map(style => (
                              <button
                                key={style}
                                onClick={() => toggleContentStyle(style)}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
                                  formData.contentStyles.includes(style)
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white text-slate-500 border-slate-200"
                                )}
                              >
                                {style}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  )}

                  {selectedTypes.includes('crew') && (
                    <TabsContent value="crew" className="m-0 text-left">
                      <div className="space-y-6 p-4 md:p-6 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Roles</label>
                          <div className="flex flex-wrap gap-2">
                            {crewRoleOptions.map(role => (
                              <button
                                key={role}
                                onClick={() => toggleCrewRole(role)}
                                className={cn(
                                  "px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest border",
                                  formData.crewRoles.includes(role) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"
                                )}
                              >
                                {role}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Base Day Rate Range ($)</Label>
                          <div className="flex items-center gap-2">
                            <Input className="h-10 text-sm" placeholder="Min" value={formData.minRate} onChange={(e) => setFormData({...formData, minRate: e.target.value.replace(/[^\d]/g, '')})} />
                            <span className="text-slate-400 font-bold">-</span>
                            <Input className="h-10 text-sm" placeholder="Max" value={formData.maxRate} onChange={(e) => setFormData({...formData, maxRate: e.target.value.replace(/[^\d]/g, '')})} />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>

            {/* Step 5 Part: Assets */}
            <Card className="border-2 border-[#0a0a0a] shadow-xl overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="uppercase tracking-tight font-black">Work Portfolio & Assets</CardTitle>
                <CardDescription>Professional visibility and bio.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 text-left p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Portfolio Website</label>
                    <Input className="h-10 text-sm" placeholder="https://..." value={formData.portfolioUrl} onChange={(e) => setFormData({...formData, portfolioUrl: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">IMDb URL</label>
                    <Input className="h-10 text-sm" placeholder="https://imdb.com/name/..." value={formData.imdbUrl} onChange={(e) => setFormData({...formData, imdbUrl: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">LinkedIn</label>
                    <Input className="h-10 text-sm" placeholder="linkedin.com/in/..." value={formData.linkedinUrl} onChange={(e) => setFormData({...formData, linkedinUrl: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Instagram</label>
                    <Input className="h-10 text-sm" placeholder="@username" value={formData.instagramUrl} onChange={(e) => setFormData({...formData, instagramUrl: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Twitter / X</label>
                    <Input className="h-10 text-sm" placeholder="@username" value={formData.twitterUrl} onChange={(e) => setFormData({...formData, twitterUrl: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Additional Professional Links</label>
                    <Button variant="ghost" size="sm" onClick={() => addLink('professional')} className="h-6 text-[8px] uppercase font-black tracking-widest">
                      <Plus className="w-3 h-3 mr-1" /> Add Link
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.professionalLinks.map((link, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input className="h-9 text-[10px] uppercase font-bold flex-1" placeholder="Label (e.g. My Site)" value={link.label} onChange={(e) => updateLink('professional', idx, 'label', e.target.value)} />
                        <Input className="h-9 text-xs flex-[2]" placeholder="https://..." value={link.url} onChange={(e) => updateLink('professional', idx, 'url', e.target.value)} />
                        <Button variant="ghost" size="icon" onClick={() => removeLink('professional', idx)} className="h-9 w-9 text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Profile Image</label>
                  <div className="flex items-center gap-4 md:gap-6 p-4 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 relative">
                    <input 
                      type="file" 
                      id="headshot-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            alert("Image size must be less than 5MB");
                            e.target.value = '';
                            return;
                          }
                          setIsCompressing(true);
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const base64 = reader.result as string;
                            try {
                              const compressed = await compressImage(base64);
                              setFormData({...formData, headshotUrl: compressed});
                            } catch (err) {
                              console.error("Compression failed:", err);
                              setFormData({...formData, headshotUrl: base64});
                            } finally {
                              setIsCompressing(false);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div className="flex items-center gap-4 md:gap-6 p-4 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 relative w-full overflow-hidden">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded bg-white border border-slate-200 overflow-hidden flex items-center justify-center relative group shrink-0">
                        {isCompressing ? (
                          <Loader2 className="w-5 h-5 animate-spin text-[#0a0a0a]" />
                        ) : formData.headshotUrl ? (
                          <>
                            <img src={formData.headshotUrl} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({...formData, headshotUrl: ''});
                              }}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <Trash2 className="w-5 h-5 text-white" />
                            </button>
                          </>
                        ) : (
                          <Camera className="w-5 h-5 md:w-6 md:h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-600">
                          {isCompressing ? "Compressing..." : formData.headshotUrl ? "Photo Recieved" : "Photo Required (Max 5MB)"}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-[8px] md:text-[9px] font-bold uppercase tracking-widest w-fit"
                          onClick={() => document.getElementById('headshot-upload')?.click()}
                        >
                          {formData.headshotUrl ? "Change Photo" : "Select File"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Bio</label>
                    <span className={cn("text-[9px] font-bold uppercase tracking-widest", formData.bio.length >= 20 ? "text-green-500" : "text-slate-400")}>
                      {formData.bio.length} / 20 characters min
                    </span>
                  </div>
                  <Textarea 
                    className={cn("min-h-[100px] text-sm", formData.bio.length > 0 && formData.bio.length < 20 && "border-amber-300")} 
                    value={formData.bio} 
                    onChange={(e) => setFormData({...formData, bio: e.target.value})} 
                  />
                  {formData.bio.length > 0 && formData.bio.length < 20 && (
                    <p className="text-[9px] text-amber-600 font-bold uppercase italic">Bio must be at least 20 characters.</p>
                  )}
                </div>

                <div className="pt-8 mt-8 border-t border-red-100">
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-4">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-1" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-red-900 uppercase tracking-tight mb-1">Delete Professional Profile</h4>
                      <p className="text-[10px] text-red-700 mb-4 font-bold uppercase tracking-tight">This will remove you from the production network search.</p>
                      <Button variant="destructive" size="sm" onClick={handleDeleteProfile} className="font-bold uppercase tracking-widest text-[9px] h-8 px-4">Delete Profile</Button>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => handleSubmit()} 
                  disabled={loading || isCompressing || !isFormValid}
                  className="w-full text-white font-bold uppercase tracking-widest text-[10px] h-12 bg-[#0a0a0a] hover:bg-slate-800"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Personal Profile'}
                </Button>
                {!isFormValid && !isCompressing && (
                  <p className="text-[9px] text-center text-red-500 font-bold uppercase italic mt-2">
                    Please ensure all required fields are filled and bio is 20+ characters.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {step === 6 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center bg-white p-12 rounded-3xl border-2 border-slate-900 shadow-2xl">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Profile Updated</h2>
            <p className="text-slate-500 mb-8 font-medium">Your professional hub has been synced with the latest changes.</p>
            <Button onClick={() => navigate('/')} className="rounded-full px-12 py-8 bg-[#0a0a0a] text-white font-bold uppercase tracking-widest shadow-xl hover:translate-y-[-2px] transition-transform">
              Back to Dashboard
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
