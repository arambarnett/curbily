import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, doc, where, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Contact, Scene, Project } from '../../types';
import { ensureAbsoluteUrl } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Sparkles, Mail, Loader2, UserPlus, Users, Search, Plus, Check, ChevronsUpDown, X, Globe, DollarSign, MapPin, RefreshCcw, Info, Star, Link as LinkIcon, Camera, ShieldCheck, Unlock, Zap, Clock } from 'lucide-react';
import { outreachAgent, crewRecommendationsAgent } from '../../lib/gemini';
import { unionRateService } from '../../services/unionRateService';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export default function CrewMatcher({ projectId }: { projectId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingOutreach, setStartingOutreach] = useState<string | null>(null);
  const [selectedCrew, setSelectedCrew] = useState<Record<string, { contact: Contact, role: string }>>({});
  const [isBulkStarting, setIsBulkStarting] = useState(false);
  const [existingThreads, setExistingThreads] = useState<Record<string, string>>({});
  const [isAddingCrew, setIsAddingCrew] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newCrewData, setNewCrewData] = useState({ name: '', email: '', phone: '', roles: '', rate: 0, minRate: 0, maxRate: 0, location: '', union: '' });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [aiRecommendations, setAiRecommendations] = useState<Record<string, { contactId: string, reason: string }[]>>({});
  const [isRefreshingAI, setIsRefreshingAI] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('recommendations');
  const [copiedLink, setCopiedLink] = useState(false);
  const [sortConfig, setSortConfig] = useState<Record<string, 'rate' | 'location' | 'none'>>({});

  useEffect(() => {
    // Retroactively update "New Member" to "Producer" if it's their only role or primary role
    const updateRoles = async () => {
      const newMembers = contacts.filter(c => c.roles?.includes('New Member'));
      for (const member of newMembers) {
        // If they "did something else" (have multiple roles like Actor), we just swap New Member for Producer
        const updatedRoles = member.roles.map(r => r === 'New Member' ? 'Producer' : r);
        try {
          // Double check if already updated to avoid infinite loops if contacts updates
          if (JSON.stringify(updatedRoles) !== JSON.stringify(member.roles)) {
            await updateDoc(doc(db, 'contacts', member.id), { roles: updatedRoles });
          }
        } catch (e) {
          console.error("Failed to retroactively update role:", e);
        }
      }
    };
    if (contacts.length > 0) updateRoles();
  }, [contacts.length]);

  const handleCopyInviteLink = () => {
    // In production, this can be configured via VITE_APP_URL or similar
    const baseUrl = (import.meta as any).env?.VITE_APP_URL || window.location.origin;
    const link = `${baseUrl}/join/${projectId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success("Invite link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleImportSheet = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      
      const newContacts = lines.slice(1).map(line => {
        const values = line.split(',');
        const contact: any = {};
        headers.forEach((header, index) => {
          const key = header.trim().toLowerCase();
          contact[key] = values[index]?.trim();
        });
        return contact;
      }).filter(c => c.name && c.email);

      for (const contact of newContacts) {
        await addDoc(collection(db, 'contacts'), {
          name: contact.name,
          email: contact.email,
          phone: contact.phone || '',
          roles: contact.roles ? contact.roles.split(';') : ['Production Assistant'],
          rate: Number(contact.rate) || 0,
          location: contact.location || 'Unknown',
          availability: 'available',
          reliability: 5,
          createdAt: new Date()
        });
      }
      setIsImporting(false);
      alert(`Successfully imported ${newContacts.length} contacts!`);
    };
    reader.readAsText(file);
  };

  const fetchAIRecommendations = async () => {
    if (!project || contacts.length === 0) return;
    setIsRefreshingAI(true);
    try {
      const result = await crewRecommendationsAgent(project, contacts);
      
      let recommendationsData = result;
      // Handle cases where the response might be the array directly or wrapped in a recommendations key
      if (result && typeof result === 'object' && 'recommendations' in result) {
        recommendationsData = result.recommendations;
      }

      const recs: Record<string, { contactId: string, reason: string }[]> = {};
      
      if (Array.isArray(recommendationsData)) {
        // If it's an array of { role, matches: [ { contactId, reason } ] }
        recommendationsData.forEach((r: any) => {
          if (r.role && Array.isArray(r.matches)) {
            recs[r.role] = r.matches;
          } else if (r.crew_member && r.role) {
            // Handle the case where it's a flat array of recommendations
            const contact = contacts.find(c => c.name?.toLowerCase().includes(r.crew_member.toLowerCase()));
            if (contact) {
              if (!recs[r.role]) recs[r.role] = [];
              recs[r.role].push({ contactId: contact.id, reason: r.reason_for_recommendation || r.reason });
            }
          }
        });
      } else if (recommendationsData && typeof recommendationsData === 'object') {
        // If it's already a Record<string, matches>
        setAiRecommendations(recommendationsData);
        return;
      }
      
      setAiRecommendations(recs);
    } catch (error) {
      console.error('Failed to get AI recommendations:', error);
    } finally {
      setIsRefreshingAI(false);
    }
  };

  useEffect(() => {
    if (project && contacts.length > 0 && Object.keys(aiRecommendations).length === 0) {
      fetchAIRecommendations();
    }
  }, [project, contacts]);

  useEffect(() => {
    const unsubProject = onSnapshot(doc(db, 'projects', projectId), (snapshot) => {
      setProject({ id: snapshot.id, ...snapshot.data() } as Project);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `projects/${projectId}`);
    });

    const unsubContacts = onSnapshot(collection(db, 'contacts'), (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contacts');
    });

    const unsubThreads = onSnapshot(query(collection(db, 'outreachThreads'), where('projectId', '==', projectId)), (snapshot) => {
      const threads: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        threads[data.contactId] = data.status;
      });
      setExistingThreads(threads);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'outreachThreads');
    });

    return () => {
        unsubProject();
        unsubContacts();
        unsubThreads();
      };
  }, [projectId]);

  const handleStartOutreach = async (contact: Contact, role: string) => {
    if (!project) return;
    if (existingThreads[contact.id]) {
      alert('Outreach already started for this contact.');
      return;
    }
    setStartingOutreach(contact.id);
    try {
      const draft = await outreachAgent(contact, role, project);
      
      // Automatic send simulation: We move straight from draft to 'delivered' status
      await addDoc(collection(db, 'outreachThreads'), {
        projectId,
        contactId: contact.id,
        ownerId: project.ownerId || '',
        role,
        status: Math.random() > 0.8 ? 'counter' : (Math.random() > 0.7 ? 'accepted' : 'delivered'), // Simulation of real-time response
        draftEmail: draft.body || '',
        subject: draft.subject || 'Creative Project Inquiry',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      toast.success(`Message automatically generated and sent to ${contact.name}`);

      // Clear from selection if it was there
      setSelectedCrew(prev => {
        const next = { ...prev };
        delete next[contact.id];
        return next;
      });
    } catch (error) {
      console.error('Outreach failed:', error);
    } finally {
      setStartingOutreach(null);
    }
  };

  const handleBulkOutreach = async () => {
    if (!project || Object.keys(selectedCrew).length === 0) return;
    setIsBulkStarting(true);
    try {
      const filteredCrew = Object.values(selectedCrew).filter(({ contact }) => !existingThreads[contact.id]);
      if (filteredCrew.length === 0) {
        alert('All selected crew already have outreach started.');
        return;
      }
      const promises = filteredCrew.map(async ({ contact, role }) => {
        const draft = await outreachAgent(contact, role, project);
        return addDoc(collection(db, 'outreachThreads'), {
          projectId,
          contactId: contact.id,
          ownerId: project.ownerId || '',
          role,
          status: 'draft',
          draftEmail: draft.body || '',
          subject: draft.subject || 'Creative Project Inquiry',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
      await Promise.all(promises);
      setSelectedCrew({});
    } catch (error) {
      console.error('Bulk outreach failed:', error);
    } finally {
      setIsBulkStarting(false);
    }
  };

  const toggleSelection = (contact: Contact, role: string) => {
    setSelectedCrew(prev => {
      const next = { ...prev };
      if (next[contact.id]) {
        delete next[contact.id];
      } else {
        next[contact.id] = { contact, role };
      }
      return next;
    });
  };

  const handleAddCrew = async () => {
    try {
      await addDoc(collection(db, 'contacts'), {
        ...newCrewData,
        roles: Array.isArray(newCrewData.roles) ? newCrewData.roles : newCrewData.roles.split(',').filter(Boolean).map(r => r.trim()),
        reliability: 5,
        rate: Number(newCrewData.rate),
        minRate: Number(newCrewData.minRate || newCrewData.rate),
        maxRate: Number(newCrewData.maxRate || newCrewData.rate),
        union: newCrewData.union || '',
        isSAG: newCrewData.union === 'SAG-AFTRA',
        createdAt: new Date(),
        inviteCode: Math.random().toString(36).substring(7).toUpperCase()
      });
      setIsAddingCrew(false);
      setNewCrewData({ name: '', email: '', phone: '', roles: '', rate: 0, minRate: 0, maxRate: 0, location: '', union: '' });
    } catch (error) {
      console.error('Failed to add crew:', error);
    }
  };

  const AVAILABLE_ROLES = [
    'Director', 'Producer', 'DP', 'Gaffer', 'Best Boy Electric', 'Electrician',
    'Key Grip', 'Best Boy Grip', 'Grip', 'Sound Mixer', 'Boom Operator',
    'HMU Artist', 'Wardrobe Stylist', 'Script Supervisor', 'Production Assistant',
    '1st AD', '2nd AD', 'DIT', 'Editor', 'Colorist', 'VFX Artist',
    'Production Designer', 'Art Director', 'Prop Master', 'Set Decorator',
    'Lead Actor', 'Supporting Actor', 'Voice Actor', 'Background Talent',
    'Stunt Coordinator', 'Stunt Performer', 'Casting Director', 'Location Manager'
  ].sort();

  const neededRoles = [
    'Director', 'Producer', 'DP', 'Gaffer', 'Sound Mixer', 'HMU Artist', 'Wardrobe Stylist', 'Production Assistant',
    'Lead Actor', 'Supporting Actor', 'Background Talent'
  ];
  
  const recommendations = neededRoles.map(role => {
    const aiMatches = aiRecommendations[role] || [];
    const matches = aiMatches.map(am => {
      const contact = contacts.find(c => c.id === am.contactId);
      return contact ? { ...contact, matchReason: am.reason } : null;
    }).filter(Boolean);

    // Fallback if AI didn't return matches or we want to supplement
    if (matches.length < 2) {
      const existingIds = matches.map(m => m!.id);
      const localMatches = contacts.filter(c => 
        c.roles.includes(role) && 
        !existingIds.includes(c.id)
      ).sort((a, b) => b.reliability - a.reliability).slice(0, 2 - matches.length);
      
      localMatches.forEach(lm => {
        const isLocal = project?.location && lm.location.toLowerCase().includes(project.location.toLowerCase().split(',')[0].trim());
        matches.push({ 
          ...lm, 
          matchReason: isLocal ? 'Local to production' : 'Strong match in network' 
        });
      });
    }

    return {
      role,
      matches: matches.slice(0, 2)
    };
  });

  const visibleRecommendations = recommendations.filter((rec) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return rec.role.toLowerCase().includes(term) || rec.matches.some((match: any) =>
      match.name?.toLowerCase().includes(term) ||
      match.location?.toLowerCase().includes(term) ||
      match.roles?.some((role: string) => role.toLowerCase().includes(term))
    );
  });

  const filteredContacts = contacts.filter(c => {
    // Hide vendors from global network as requested
    if (c.roles?.some(r => r.toLowerCase().includes('vendor'))) return false;

    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.location.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.roles.some(r => r.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesLocation = !locationSearch || c.location.toLowerCase().includes(locationSearch.toLowerCase());
    const matchesRole = roleFilter === 'All' || c.roles.some(r => r === roleFilter);

    return matchesSearch && matchesLocation && matchesRole;
  });

  const categories = ['All', ...neededRoles];

  const handleAddManualToRole = (role: string) => {
    setNewCrewData(prev => ({ ...prev, roles: role }));
    setIsAddingCrew(true);
  };

  if (loading) return <div>Analyzing network...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">Production Staffing</h3>
            <p className="text-slate-500 text-xs text-balance">Match crew based on location, budget, and reliability.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {Object.keys(selectedCrew).length > 0 && (
            <Button 
              size="sm"
              onClick={handleBulkOutreach} 
              disabled={isBulkStarting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2"
            >
              {isBulkStarting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Send Outreach ({Object.keys(selectedCrew).length})
            </Button>
          )}

          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add & Invite</Button>} />
            <PopoverContent className="w-56 p-2" align="end">
              <div className="grid gap-1">
                <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={handleCopyInviteLink}>
                  <LinkIcon className="w-3.5 h-3.5" />
                  Invite via Link
                </Button>
                <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={() => setIsImporting(true)}>
                  <Globe className="w-3.5 h-3.5" />
                  Import from Sheet
                </Button>
                <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={() => setIsAddingCrew(true)}>
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Local Crew
                </Button>
                <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={fetchAIRecommendations} disabled={isRefreshingAI}>
                  <RefreshCcw className={cn("w-3.5 h-3.5", isRefreshingAI && "animate-spin")} />
                  Refine AI Matches
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="recommendations" className="rounded-lg px-6 gap-2 transition-all">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" /> 
              Sourcing
            </TabsTrigger>
            <TabsTrigger value="offers" className="rounded-lg px-6 gap-2 transition-all relative">
              <Mail className="w-3.5 h-3.5 text-blue-500" /> 
              Active Offers
              {Object.values(existingThreads).some(s => s === 'counter' || s === 'accepted') && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
              )}
            </TabsTrigger>
            <TabsTrigger value="network" className="rounded-lg px-6 gap-2 transition-all">
              <Users className="w-3.5 h-3.5 text-slate-500" /> 
              My Network
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-lg px-6 gap-2 transition-all">
              <Globe className="w-3.5 h-3.5 text-slate-500" /> 
              Global Search
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="recommendations">
          <div className="mb-4 flex flex-col md:flex-row gap-3">
            <div className="relative group flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <Input 
                placeholder="Search production staffing by role, name, skill, or location..." 
                className="pl-10 h-11 bg-white border-slate-200 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm && (
              <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={() => setSearchTerm('')}>
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
            {visibleRecommendations.map((rec) => {
              const isNotNeeded = project?.description?.toLowerCase().includes(`no ${rec.role.toLowerCase()}`) || 
                                 (rec.role === 'Background Talent' && project?.budgetTier === 'Micro-Budget');

              return (
                <Card key={rec.role} className={cn(
                  "border-none shadow-sm flex flex-col h-[450px] bg-white group hover:shadow-md transition-all rounded-3xl overflow-hidden",
                  isNotNeeded && "opacity-60 grayscale-[0.5]"
                )}>
                  <CardHeader className="pb-3 border-b border-slate-50 shrink-0 bg-slate-50/30 group-hover:bg-slate-50/50 transition-colors px-6 uppercase">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{rec.role}</CardTitle>
                        {isNotNeeded && (
                          <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Smart Hint: Likely Not Needed</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 rounded-full hover:bg-white"
                          onClick={() => {
                            handleCopyInviteLink();
                          }}
                          title="Copy Invite Link for this Role"
                        >
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 rounded-full hover:bg-white"
                          onClick={() => {
                            setRoleFilter(rec.role);
                            setActiveTab('all');
                          }}
                          title="Search Global"
                        >
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                        <Popover>
                          <PopoverTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-white"><ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" /></Button>} />
                          <PopoverContent className="w-40 p-2" align="end">
                            <div className="flex flex-col gap-1">
                              <p className="text-[9px] font-black uppercase text-slate-400 px-2 pb-1">Sort Matches</p>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="justify-start text-[10px] font-bold uppercase tracking-widest h-8"
                                onClick={() => setSortConfig(prev => ({ ...prev, [rec.role]: 'rate' }))}
                              >
                                <DollarSign className="w-3 h-3 mr-2" /> By Rate
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="justify-start text-[10px] font-bold uppercase tracking-widest h-8"
                                onClick={() => setSortConfig(prev => ({ ...prev, [rec.role]: 'location' }))}
                              >
                                <MapPin className="w-3 h-3 mr-2" /> By Location
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4 flex-1 overflow-y-auto custom-scrollbar px-6">
                    {rec.matches.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                          <Search className="w-5 h-5 text-slate-200" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Global network scan...</p>
                        <p className="text-[9px] text-slate-400 mt-1 max-w-[140px] leading-relaxed">We're working on finding the best {rec.role}s for your project. Check back soon.</p>
                      </div>
                    ) : (
                      [...rec.matches].sort((a: any, b: any) => {
                        const sort = sortConfig[rec.role];
                        if (sort === 'rate') return (a.rate || 0) - (b.rate || 0);
                        if (sort === 'location') return a.location?.localeCompare(b.location || '');
                        return 0;
                      }).map((match: any) => (
                        <div 
                          key={match.id} 
                          onClick={() => {
                            setSelectedContact(match);
                            setIsDetailOpen(true);
                          }}
                          className={cn(
                            "flex flex-col p-4 rounded-2xl border transition-all relative overflow-hidden cursor-pointer",
                            selectedCrew[match.id] 
                              ? "border-blue-500 bg-blue-50/30" 
                              : "border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm"
                          )}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div 
                                className={cn(
                                  "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors shrink-0",
                                  selectedCrew[match.id] ? "bg-blue-600 border-blue-600" : "border-slate-200 hover:border-blue-400"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelection(match, rec.role);
                                }}
                              >
                                {selectedCrew[match.id] && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                              </div>
                              <Avatar className="w-10 h-10 border-2 border-white shadow-sm ring-1 ring-slate-100 shrink-0">
                                <AvatarImage src={match.headshotUrl} />
                                <AvatarFallback className="bg-slate-900 text-white font-black text-xs">
                                  {match.name?.charAt(0) || 'M'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-xs font-black truncate text-slate-900 uppercase tracking-tight">
                                  {match.name || 'Member'}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-black text-blue-600">
                                    ${match.rate || unionRateService.getMinRate(rec.role, project?.location || '')}/day
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[60px]">{match.location}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 p-2 bg-slate-50 rounded-xl">
                            <Zap className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-[9px] text-slate-600 leading-snug font-medium line-clamp-2">
                              {match.matchReason}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                  <CardFooter className={cn("pt-2 pb-6 px-6", !isNotNeeded && "hidden")}>
                    {isNotNeeded && (
                      <Button variant="outline" className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-amber-200 text-amber-700 bg-amber-50">
                        Override & Search
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="offers">
          <div className="space-y-4">
             {Object.keys(existingThreads).length === 0 ? (
               <div className="p-20 text-center space-y-4">
                 <Mail className="w-10 h-10 text-slate-200 mx-auto" />
                 <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No active offers yet.</p>
                 <Button variant="outline" size="sm" onClick={() => setActiveTab('recommendations')}>Source Crew</Button>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {contacts.filter(c => existingThreads[c.id]).map(contact => {
                    const status = existingThreads[contact.id];
                    return (
                      <Card key={contact.id} className="p-5 rounded-2xl border-slate-200 bg-white group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-4 mb-4">
                          <Avatar className="w-12 h-12 border-2 border-white shadow-sm ring-1 ring-slate-100">
                             <AvatarFallback className="bg-slate-900 text-white font-black">{contact.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-black uppercase tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">{contact.name}</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{contact.roles?.[0]}</p>
                          </div>
                          <Badge className={cn(
                            "ml-auto text-[8px] font-black uppercase tracking-widest px-2 py-0.5",
                            status === 'accepted' ? "bg-green-50 text-green-700 border-green-100" :
                            status === 'declined' ? "bg-red-50 text-red-700 border-red-100" :
                            status === 'counter' ? "bg-amber-50 text-amber-700 border-amber-100" :
                            "bg-blue-50 text-blue-700 border-blue-100"
                          )}>
                            {status === 'accepted' ? 'Hired' : status === 'declined' ? 'Unavailable' : status === 'counter' ? 'Counter Offer' : 'Sent/Pending'}
                          </Badge>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl mb-4">
                           <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic line-clamp-2">"Thanks for the offer! I'm interested but my day rate is now $800."</p>
                        </div>

                        <div className="flex gap-2">
                           <Button variant="outline" size="sm" className="w-full text-[10px] font-black uppercase tracking-widest h-9" onClick={() => { setSelectedContact(contact); setIsDetailOpen(true); }}>View Bio</Button>
                           {status === 'counter' && (
                             <Button size="sm" className="w-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest h-9">Accept Counter</Button>
                           )}
                           {status === 'delivered' && (
                             <Button size="sm" className="w-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest h-9">Message</Button>
                           )}
                        </div>
                      </Card>
                    )
                 })}
               </div>
             )}
          </div>
        </TabsContent>

        <TabsContent value="network">
          <Card className="border border-dashed p-12 text-center bg-slate-50/50 rounded-2xl">
            <div className="max-w-xs mx-auto space-y-4">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Build Your Private Network</h4>
                <p className="text-xs text-slate-500 mt-1">Connect your existing contacts or upload a spreadsheet to start managing your recurring crew list.</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button className="w-full gap-2" onClick={() => setIsImporting(true)}>
                  <Plus className="w-4 h-4" />
                  Connect Spreadsheets
                </Button>
                <Button variant="outline" className="w-full gap-2" onClick={() => setIsAddingCrew(true)}>
                  Add One by One
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative group flex-[2]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <Input 
                placeholder="Search name or skills..." 
                className="pl-10 h-10 bg-white border-slate-200 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative group flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="All Locations" 
                className="pl-10 h-10 bg-white border-slate-200 rounded-xl"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
              />
            </div>
            <Popover>
              <PopoverTrigger render={<Button variant="outline" className="h-10 px-4 rounded-xl font-bold text-xs gap-2 min-w-[140px] justify-between"><Badge variant="secondary" className="bg-blue-50 text-blue-600 border-transparent text-[10px]">{roleFilter === 'All' ? 'All Roles' : roleFilter}</Badge><ChevronsUpDown className="w-3 h-3 opacity-50" /></Button>} />
              <PopoverContent className="w-[200px] p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search roles..." />
                  <CommandList>
                    <CommandEmpty>No roles found.</CommandEmpty>
                    <CommandGroup>
                      {['All', ...AVAILABLE_ROLES].map(role => (
                        <CommandItem
                          key={role}
                          value={role}
                          onSelect={() => setRoleFilter(role)}
                          className="text-xs"
                        >
                          <Check className={cn("mr-2 h-3 w-3", roleFilter === role ? "opacity-100" : "opacity-0")} />
                          {role}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map(contact => (
              <Card key={contact.id} 
                onClick={() => {
                  setSelectedContact(contact);
                  setIsDetailOpen(true);
                }}
                className="group hover:border-blue-200 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 overflow-hidden bg-white border-slate-200 rounded-2xl flex flex-col h-full cursor-pointer"
              >
                <div className="relative p-6 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-14 h-14 border-4 border-slate-50 shadow-sm ring-1 ring-slate-100 group-hover:ring-blue-200 transition-all">
                        <AvatarImage src={contact.headshotUrl} />
                        <AvatarFallback className="bg-slate-900 text-white font-black text-lg">
                          {contact.name?.charAt(0) || contact.roles?.[0]?.charAt(0) || 'M'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-black uppercase tracking-tighter text-slate-900 text-lg leading-none mb-1 group-hover:text-blue-600 transition-colors">
                          {contact.name || (contact.roles && contact.roles.length > 0 ? contact.roles[0] : 'Member')}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-slate-500 border-slate-200 bg-slate-50/50">
                            {contact.roles?.[0] === 'New Member' ? 'Producer' : (contact.roles?.[0] || 'Member')}
                          </Badge>
                          <span className="text-[10px] text-slate-400">•</span>
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {contact.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    {contact.roles?.slice(0, 3).map((r: string) => (
                      <Badge key={r} variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border-transparent">
                        {r}
                      </Badge>
                    ))}
                    {contact.roles?.length > 3 && (
                      <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border-transparent">
                        +{contact.roles.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Est. Rate</span>
                    <span className="text-sm font-black text-slate-900">${contact.rate || unionRateService.getMinRate(contact.roles?.[0] || '', project?.location || '')}/day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.roles && contact.roles.length > 1 ? (
                      <Popover>
                        <PopoverTrigger render={
                          <Button 
                            size="sm" 
                            className="h-9 bg-slate-900 hover:bg-blue-600 text-white rounded-xl px-4 text-[10px] font-black uppercase tracking-wider gap-2 shadow-lg shadow-slate-900/10 transition-all w-full"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add as...
                          </Button>
                        } />
                        <PopoverContent className="w-48 p-2" align="end">
                           <div className="flex flex-col gap-1">
                              <p className="text-[9px] font-black uppercase text-slate-400 px-2 pb-1 border-b mb-1">Select Role</p>
                              {contact.roles.map(r => (
                                <Button 
                                  key={r} 
                                  variant="ghost" 
                                  size="sm" 
                                  className="justify-start text-[10px] font-bold h-8 uppercase tracking-widest"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartOutreach(contact, r);
                                  }}
                                >
                                  {r}
                                </Button>
                              ))}
                           </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Button 
                        size="sm" 
                        className="h-9 bg-slate-900 hover:bg-blue-600 text-white rounded-xl px-4 text-[10px] font-black uppercase tracking-wider gap-2 shadow-lg shadow-slate-900/10 transition-all w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartOutreach(contact, contact.roles?.[0] || 'Production Assistant');
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add to List
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddingCrew} onOpenChange={setIsAddingCrew}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Crew Network</DialogTitle>
            <DialogDescription>Input local crew or talent to your private network.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                value={newCrewData.name} 
                onChange={e => setNewCrewData({...newCrewData, name: e.target.value})} 
                placeholder="e.g. John Smith"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={newCrewData.email} 
                  onChange={e => setNewCrewData({...newCrewData, email: e.target.value})} 
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={newCrewData.phone} 
                  onChange={e => setNewCrewData({...newCrewData, phone: e.target.value})} 
                  placeholder="555-0123"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Roles</Label>
              <Popover>
                <PopoverTrigger render={
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-auto py-2 min-h-[40px]"
                  >
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(newCrewData.roles) && newCrewData.roles.length > 0 ? (
                      newCrewData.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="secondary"
                          className="text-[10px] py-0 px-1 gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            const current = Array.isArray(newCrewData.roles) ? newCrewData.roles : [];
                            const updated = current.filter(r => r !== role);
                            setNewCrewData({...newCrewData, roles: updated});
                          }}
                        >
                          {role}
                          <X className="w-2 h-2" />
                        </Badge>
                      ))
                    ) : (
                      <span className="text-slate-400">Select roles...</span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                } />
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search roles..." />
                    <CommandList>
                      <CommandEmpty>No role found.</CommandEmpty>
                      <CommandGroup>
                        {AVAILABLE_ROLES.map((role) => (
                          <CommandItem
                            key={role}
                            value={role}
                            onSelect={() => {
                              const currentRoles = Array.isArray(newCrewData.roles) ? newCrewData.roles : [];
                              const updated = currentRoles.includes(role)
                                ? currentRoles.filter(r => r !== role)
                                : [...currentRoles, role];
                              setNewCrewData({...newCrewData, roles: updated});
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                Array.isArray(newCrewData.roles) && newCrewData.roles.includes(role) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {role}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex justify-between">
                  Day Rate ($)
                  <span className="text-[9px] text-red-500 font-bold uppercase tracking-tighter">* Required</span>
                </Label>
                <Input 
                  type="text" 
                  placeholder="0"
                  value={newCrewData.rate || ''} 
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setNewCrewData({...newCrewData, rate: val === '' ? 0 : Number(val)});
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Min. Negotiable Rate ($)</Label>
                <Input 
                  type="text" 
                  placeholder="0"
                  value={newCrewData.minRate || ''} 
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setNewCrewData({...newCrewData, minRate: val === '' ? 0 : Number(val)});
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Union Affiliation</Label>
                <Input 
                  value={newCrewData.union} 
                  onChange={e => setNewCrewData({...newCrewData, union: e.target.value})} 
                  placeholder="e.g. SAG-AFTRA, IATSE 600"
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input 
                  value={newCrewData.location} 
                  onChange={e => setNewCrewData({...newCrewData, location: e.target.value})} 
                  placeholder="e.g. Los Angeles, CA"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingCrew(false)}>Cancel</Button>
            <Button onClick={handleAddCrew} disabled={!newCrewData.name || !newCrewData.email}>Add Crew Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-[95vw] lg:max-w-5xl h-[95vh] lg:h-[92vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-3xl lg:rounded-[2rem]" showCloseButton={false}>
          {selectedContact && (
            <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden relative">
              {/* Profile Header Banner */}
              <div className="h-32 lg:h-48 bg-slate-900 relative shrink-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.2),transparent)]" />
                <div className="absolute bottom-[-40px] lg:bottom-[-50px] left-6 lg:left-10">
                  <Avatar className="w-24 h-24 lg:w-40 lg:h-40 border-[6px] lg:border-[10px] border-[#f8fafc] shadow-xl">
                    <AvatarImage src={selectedContact.headshotUrl} />
                    <AvatarFallback className="bg-blue-600 text-white font-black text-3xl lg:text-5xl uppercase">
                      {selectedContact.name?.charAt(0) || 'M'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="absolute top-4 right-4 lg:top-8 lg:right-8">
                   <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-white/10 rounded-full w-8 h-8 lg:w-10 lg:h-10" onClick={() => setIsDetailOpen(false)}>
                     <X className="w-4 h-4 lg:w-6 lg:h-6" />
                   </Button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 pt-12 lg:pt-16 pb-10 px-6 lg:px-10 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8 h-full">
                  {/* Left Column: Core Info */}
                  <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter text-slate-900 leading-tight">
                          {selectedContact.name || 'Member'}
                        </h2>
                        <div className="flex gap-2">
                          {existingThreads[selectedContact.id] === 'accepted' ? (
                            <Badge className="bg-green-50 text-green-700 border-green-100 font-black uppercase tracking-widest text-[8px] lg:text-[9px] px-2 py-0.5">
                              <ShieldCheck className="w-3 h-3 mr-1" /> Confirmed
                            </Badge>
                          ) : existingThreads[selectedContact.id] === 'declined' ? (
                            <Badge className="bg-red-50 text-red-700 border-red-100 font-black uppercase tracking-widest text-[8px] lg:text-[9px] px-2 py-0.5">
                              <X className="w-3 h-3 mr-1" /> Unavailable
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-white text-slate-400 border-slate-200 font-black uppercase tracking-widest text-[8px] lg:text-[9px] px-2 py-0.5">
                               Pro Member
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-base lg:text-lg text-slate-500 font-bold uppercase tracking-widest">
                        {selectedContact.roles?.join(" • ") || "Creative Professional"}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-1 lg:mt-2">
                        <div className="flex items-center gap-2 text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-wider">{selectedContact.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-wider text-nowrap">Fast Response</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Bio & Experience</h3>
                      <div className="bg-white p-5 lg:p-6 rounded-xl lg:rounded-2xl border border-slate-200 shadow-sm leading-relaxed text-slate-600 font-sans text-xs lg:text-sm">
                        {selectedContact.bio || `${selectedContact.name} is a highly experienced professional with a focus on ${selectedContact.roles?.[0] || 'media production'}.`}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Availability & Holidays</h3>
                      <div className="bg-slate-900 p-6 rounded-2xl text-white">
                        <div className="grid grid-cols-7 gap-1 text-center mb-4">
                          {['S','M','T','W','T','F','S'].map(d => <span key={d} className="text-[8px] font-black text-slate-500">{d}</span>)}
                          {Array.from({length: 31}).map((_, i) => {
                            const day = i + 1;
                            const isHoliday = [4, 25, 31].includes(day); // Mock holidays
                            return (
                              <div key={i} className={cn(
                                "aspect-square flex items-center justify-center text-[10px] rounded-lg border border-white/5",
                                isHoliday ? "bg-red-500/20 text-red-400 border-red-500/20" : "hover:bg-white/5"
                              )}>
                                {day}
                                {isHoliday && <div className="absolute top-0 right-0 w-1 h-1 bg-red-400 rounded-full" />}
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-red-400" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Holidays Blocked</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-blue-400" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sync Active</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {(selectedContact.portfolioUrl || selectedContact.imdbUrl || selectedContact.actingReelUrl) && (
                      <div className="space-y-3">
                        <h3 className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Links</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedContact.portfolioUrl && (
                            <Button variant="outline" size="sm" className="h-9 px-4 text-[9px] uppercase font-black gap-1.5 rounded-lg border-slate-200 hover:bg-white hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm" onClick={() => window.open(ensureAbsoluteUrl(selectedContact.portfolioUrl), '_blank')}>
                              <Globe className="w-3.5 h-3.5" /> Portfolio
                            </Button>
                          )}
                          {selectedContact.imdbUrl && (
                            <Button variant="outline" size="sm" className="h-9 px-4 text-[9px] uppercase font-black gap-1.5 rounded-lg border-slate-200 hover:bg-white hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm" onClick={() => window.open(ensureAbsoluteUrl(selectedContact.imdbUrl), '_blank')}>
                              <LinkIcon className="w-3.5 h-3.5" /> IMDb
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions & Meta */}
                  <div className="space-y-6 pb-10 lg:pb-0">
                    <Card className="p-5 lg:p-6 rounded-xl border-slate-200 shadow-lg bg-white space-y-5">
                      <div className="space-y-1">
                        <p className="text-[8px] lg:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Daily Rate</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tighter">
                            ${selectedContact.rate || unionRateService.getMinRate(selectedContact.roles?.[0] || '', project?.location || '')}
                          </span>
                          <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">/day</span>
                        </div>
                      </div>

                      <div className="space-y-4 pt-5 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] lg:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reliability</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="font-black text-slate-900 text-sm">{selectedContact.reliability || '5.0'}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] lg:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Union</span>
                          <Badge variant="secondary" className="font-black text-slate-900 uppercase tracking-tighter bg-slate-100 px-2 py-0.5 text-[8px] lg:text-[9px]">
                            {selectedContact.union || 'Non-Union'}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        {existingThreads[selectedContact.id] === 'accepted' ? (
                          <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-green-700 font-black text-[9px] uppercase tracking-widest">
                              <Unlock className="w-3.5 h-3.5" /> Unlocked
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-xs font-black text-slate-900 break-all">{selectedContact.email}</p>
                              <p className="text-xs text-slate-500 font-medium">{selectedContact.phone}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Button 
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-11 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/10 transition-all active:scale-[0.98]"
                              onClick={() => {
                                handleStartOutreach(selectedContact, selectedContact.roles?.[0] || 'Production Assistant');
                                setIsDetailOpen(false);
                              }}
                            >
                               {existingThreads[selectedContact.id] ? "Check Offer Status" : "Send Move/Add to Outreach"}
                            </Button>
          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isImporting} onOpenChange={setIsImporting}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Crew from Spreadsheet</DialogTitle>
            <DialogDescription>Upload a .csv, .xlsx, or .xls file to bulk add your network.</DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center space-y-4 border border-dashed rounded-xl border-slate-200">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium">Click to upload or drag & drop</p>
              <p className="text-xs text-slate-400 mt-1">Max file size 10MB</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              id="sheet-upload" 
              accept=".csv" 
              onChange={handleImportSheet}
            />
            <Button variant="outline" onClick={() => document.getElementById('sheet-upload')?.click()}>Select File</Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsImporting(false)}>Cancel</Button>
            <Button className="bg-blue-600" onClick={() => document.getElementById('sheet-upload')?.click()}>
              Select CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
