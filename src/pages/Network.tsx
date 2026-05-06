import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, writeBatch, doc, where, or, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ensureAbsoluteUrl } from '../lib/utils';
import { useAuth } from '../lib/AuthProvider';
import { Contact, PROJECT_TYPES, ProjectTypeRate } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Search, Mail, Phone, Star, Plus, Upload, FileSpreadsheet, MapPin, Plane, Utensils, ShieldCheck, Share2, Copy, Check, Globe, Link as LinkIcon, Camera, Trash2, DollarSign, ShieldAlert, MessageSquare, Clock } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import Papa from 'papaparse';
import { GLOBAL_CONTACTS } from '../lib/seedData';
import { RateValidation } from '../components/common/RateValidation';
import { UNION_ROLES, UNION_OCC_CODES } from '../constants/unionData';
import { unionRateService } from '../services/unionRateService';

export default function Network() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeNetworkTab, setActiveNetworkTab] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [editedRate, setEditedRate] = useState({ 
    base: 0, 
    projectRates: [] as ProjectTypeRate[] 
  });
  const [isSheetsDialogOpen, setIsSheetsDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteClaimLink, setInviteClaimLink] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const ADMIN_EMAILS = ['aram.barnett@gmail.com', 'jonanthonybarnett@gmail.com'];
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1jS49T1xG9WZJQcLGPvdAkFWOycVONgFs9tv1QTOOheg/edit?usp=sharing');
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    roles: '',
    rate: 0,
    minRate: 0,
    maxRate: 0,
    projectTypeRates: [] as ProjectTypeRate[],
    location: '',
    notes: '',
    union: '',
    occCode: ''
  });

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'contacts'),
      or(
        where('isGlobal', '==', true),
        where('ownerId', '==', user.uid)
      )
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
      
      // Filter: Show global contacts OR contacts owned by the current user
      const visibleContacts = fetched.filter(c => c.isGlobal || c.ownerId === user?.uid);
      
      setContacts(visibleContacts);
      setLoading(false);
      
      // Auto-sync from master data if no global contacts exist
      const globalCount = fetched.filter(c => c.isGlobal).length;
      if (globalCount === 0 && !importing) {
        prepopulateNetwork();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contacts');
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddContact = async () => {
    try {
      await addDoc(collection(db, 'contacts'), {
        ...newContact,
        roles: newContact.roles.split(',').map(r => r.trim()),
        reliability: 5,
        tags: ['crew'],
        isGlobal: false,
        ownerId: user?.uid,
        union: newContact.union || null,
        occCode: newContact.occCode || null,
        projectTypeRates: newContact.projectTypeRates.map(r => ({ type: r.type, rate: Number(r.rate) }))
      });
      setIsDialogOpen(false);
      setNewContact({ name: '', email: '', phone: '', roles: '', rate: 0, projectTypeRates: [], location: '', notes: '', union: '', occCode: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'contacts');
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const batch = writeBatch(db);
        results.data.forEach((row: any) => {
          const name = row.name || row.Name || `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim();
          if (name) {
            const ref = doc(collection(db, 'contacts'));
            batch.set(ref, {
              name,
              email: row.email || row.Email || '',
              phone: row.phone || row.Phone || '',
              roles: (row.roles || row.Roles || row.Position || '').split(';').map((r: string) => r.trim()).filter(Boolean),
              rate: Number(row.rate || row.Rate || row['Day Rate']) || 0,
              location: row.location || row.Location || 'Remote',
              reliability: Number(row.reliability || row.Reliability) || 5,
              tags: (row.tags || row.Tags || 'imported').split(';').map((t: string) => t.trim()).filter(Boolean),
              isGlobal: false,
              ownerId: user?.uid
            });
          }
        });
        await batch.commit();
        setImporting(false);
      }
    });
  };

  const handleConnectSheets = async () => {
    if (!sheetUrl) return;
    setImporting(true);
    try {
      const exportUrl = sheetUrl.replace('/edit?usp=sharing', '/export?format=csv').replace('/edit', '/export?format=csv');
      
      const response = await fetch(exportUrl);
      if (!response.ok) throw new Error('Failed to fetch sheet data');
      
      const text = await response.text();
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const batch = writeBatch(db);
          results.data.forEach((row: any) => {
            // Normalize keys to lowercase for easier matching
            const normalizedRow: any = {};
            Object.keys(row).forEach(key => {
              normalizedRow[key.toLowerCase().trim()] = row[key];
            });

            const firstName = normalizedRow['first name'] || normalizedRow['name'];
            if (firstName && (normalizedRow.email || normalizedRow.phone)) {
              // Try to find a rate in common column names
              const rateKeys = [
                'day rate', 'rate', 'price', 'daily rate', 'cost', 'fee', 'salary', 
                'daily', 'base rate', 'pay', 'labor', 'compensation', 'usd/day'
              ];
              let detectedRate = 0;
              for (const key of rateKeys) {
                if (normalizedRow[key]) {
                  const val = String(normalizedRow[key]).replace(/[^0-9.]/g, '');
                  if (val && !isNaN(Number(val))) {
                    detectedRate = Number(val);
                    break;
                  }
                }
              }

              // Fallback: search entire row for price-like patterns if rate is still 0
              if (detectedRate === 0) {
                const rowString = Object.values(row).join(' ');
                const priceMatch = rowString.match(/\$\s?(\d{2,5})/);
                if (priceMatch && priceMatch[1]) {
                  detectedRate = Number(priceMatch[1]);
                }
              }

              const roles = (normalizedRow.position || normalizedRow.roles || normalizedRow.role || normalizedRow.title || 'Crew')
                .split(/[,;/]/)
                .map((r: string) => r.trim())
                .filter(Boolean);

              const ref = doc(collection(db, 'contacts'));
              batch.set(ref, {
                name: normalizedRow['first name'] ? `${normalizedRow['first name']} ${normalizedRow['last name'] || ''}`.trim() : normalizedRow.name,
                email: normalizedRow.email || '',
                phone: normalizedRow.phone || '',
                roles: roles.length > 0 ? roles : ['Crew'],
                rate: detectedRate,
                location: normalizedRow.location || normalizedRow.city || normalizedRow.address || 'Remote',
                canTravel: normalizedRow.travel || normalizedRow['can travel'] || 'Unknown',
                dietary: normalizedRow.dietary || normalizedRow['dietary restrictions'] || 'None',
                vouchedBy: normalizedRow['vouched by'] || '',
                tags: ['global', 'pocket-watch'],
                reliability: 5,
                notes: 'Imported from Master Contact List',
                isGlobal: true,
                createdAt: serverTimestamp()
              });
            }
          });
          await batch.commit();
          setImporting(false);
          setIsSheetsDialogOpen(false);
        }
      });
    } catch (error) {
      console.error('Sheet sync failed:', error);
      setImporting(false);
    }
  };

  const prepopulateNetwork = async (force = false) => {
    if (!force && contacts.some(c => c.isGlobal)) return;
    
    setImporting(true);
    try {
      console.log('Starting seed of', GLOBAL_CONTACTS.length, 'contacts...');
      const batch = writeBatch(db);
      GLOBAL_CONTACTS.forEach((contact) => {
        const ref = doc(collection(db, 'contacts'));
        batch.set(ref, {
          name: contact.name || 'Unknown',
          email: contact.email || '',
          phone: contact.phone || '',
          roles: contact.roles || [],
          location: contact.location || 'Remote',
          notes: contact.notes || '',
          reliability: contact.reliability || 5,
          rate: contact.rate || 0,
          tags: contact.tags || ['global', 'pocket-watch'],
          isGlobal: true,
          ownerId: 'system',
          createdAt: new Date().toISOString()
        });
      });
      await batch.commit();
      console.log('Seeding complete.');
      if (force) alert('Global database re-seeded with ' + GLOBAL_CONTACTS.length + ' contacts!');
    } catch (error) {
      console.error('Seeding failed:', error);
      alert('Seeding failed. Check console for details.');
    } finally {
      setImporting(false);
    }
  };

  const handleResetDatabase = async () => {
    setImporting(true);
    try {
      const globalContacts = contacts.filter(c => c.isGlobal);
      console.log('Deleting', globalContacts.length, 'old global contacts...');
      
      // Delete in chunks if more than 500
      for (let i = 0; i < globalContacts.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = globalContacts.slice(i, i + 500);
        chunk.forEach(c => {
          batch.delete(doc(db, 'contacts', c.id));
        });
        await batch.commit();
      }
      
      await prepopulateNetwork(true);
    } catch (error) {
      console.error('Reset failed:', error);
      alert('Reset failed.');
    } finally {
      setImporting(false);
    }
  };

  const filteredContacts = contacts.filter(c => {
    const roles = c.roles || [];
    const tags = c.tags || [];
    const name = c.name || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roles.some(r => r.toLowerCase().includes(searchTerm.toLowerCase())) ||
      tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (activeNetworkTab === 'all') return true;
    
    // Support type-based and role-based filtering
    if (activeNetworkTab === 'producer') return roles.some(r => r.toLowerCase().includes('producer'));
    if (activeNetworkTab === 'crew') return roles.some(r => 
      !r.toLowerCase().includes('vendor') && 
      !r.toLowerCase().includes('cast') && 
      !r.toLowerCase().includes('actor') && 
      !r.toLowerCase().includes('talent') &&
      !r.toLowerCase().includes('equipment') &&
      !r.toLowerCase().includes('props')
    );
    if (activeNetworkTab === 'vendors') return roles.some(r => 
      r.toLowerCase().includes('vendor') || 
      r.toLowerCase().includes('equipment') || 
      r.toLowerCase().includes('props') || 
      r.toLowerCase().includes('lighting') || 
      r.toLowerCase().includes('costume') || 
      r.toLowerCase().includes('locations') ||
      r.toLowerCase().includes('various') ||
      r.toLowerCase().includes('vehicles')
    );
    if (activeNetworkTab === 'cast') return roles.some(r => r.toLowerCase().includes('cast') || r.toLowerCase().includes('actor') || r.toLowerCase().includes('talent'));
    
    return true;
  });

  const getTabCount = (tab: string) => {
    return contacts.filter(c => {
      const roles = c.roles || [];
      if (tab === 'all') return true;
      if (tab === 'producer') return roles.some(r => r.toLowerCase().includes('producer'));
      if (tab === 'crew') return roles.some(r => !r.toLowerCase().includes('vendor') && !r.toLowerCase().includes('cast') && !r.toLowerCase().includes('equipment') && !r.toLowerCase().includes('props'));
      if (tab === 'vendors') return roles.some(r => r.toLowerCase().includes('vendor') || r.toLowerCase().includes('equipment') || r.toLowerCase().includes('props') || r.toLowerCase().includes('lighting') || r.toLowerCase().includes('costume') || r.toLowerCase().includes('locations') || r.toLowerCase().includes('various') || r.toLowerCase().includes('vehicles'));
      if (tab === 'cast') return roles.some(r => r.toLowerCase().includes('cast') || r.toLowerCase().includes('actor') || r.toLowerCase().includes('talent'));
      return true;
    }).length;
  };



  const handleCopyLink = () => {
    const url = `${window.location.origin}/join`;
    navigator.clipboard.writeText(url);
    alert('Join link copied to clipboard!');
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const generateInviteLink = async (contact: Contact) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      await updateDoc(doc(db, 'contacts', contact.id), {
        inviteCode: code,
        inviteSentAt: serverTimestamp(),
        claimed: false
      });
      const link = `${window.location.origin}/join?code=${code}`;
      setInviteClaimLink(link);
      setSelectedContact({ ...contact, inviteCode: code });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contacts/${contact.id}`);
    }
  };

  const viewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setEditedRate({
      base: contact.rate || 0,
      projectRates: contact.projectTypeRates || []
    });
    setIsEditingRate(false);
    setIsContactDialogOpen(true);
  };

  const handleUpdateRate = async () => {
    if (!selectedContact) return;
    try {
      await updateDoc(doc(db, 'contacts', selectedContact.id), {
        rate: Number(editedRate.base),
        projectTypeRates: editedRate.projectRates.map(r => ({ type: r.type, rate: Number(r.rate) }))
      });
      setSelectedContact({
        ...selectedContact,
        rate: Number(editedRate.base),
        projectTypeRates: editedRate.projectRates as ProjectTypeRate[]
      });
      setIsEditingRate(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contacts/${selectedContact.id}`);
    }
  };

  const addProjectRate = () => {
    setEditedRate(prev => ({
      ...prev,
      projectRates: [...prev.projectRates, { type: 'feature', rate: 0 }]
    }));
  };

  const updateProjectRate = (index: number, field: 'type' | 'rate', value: string | number) => {
    const newRates = [...editedRate.projectRates];
    newRates[index] = { ...newRates[index], [field]: field === 'rate' ? Number(value) : value };
    setEditedRate(prev => ({ ...prev, projectRates: newRates }));
  };

  const removeProjectRate = (index: number) => {
    setEditedRate(prev => ({
      ...prev,
      projectRates: prev.projectRates.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-[80px] font-black tracking-tighter text-black uppercase leading-[0.85]">
              Talent <br />
              <span className="text-slate-200">Network</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] max-w-md">
              The world's first autonomous talent network for the digital content ecosystem.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger render={
              <Button variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                <Share2 className="w-4 h-4" />
                Invite Crew
              </Button>
            } />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Talent to Network</DialogTitle>
                <DialogDescription>
                  Share this code and link with crew members to have them join your private network.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {isAdmin && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <p className="text-[10px] font-bold uppercase text-amber-700">Admin Tip: Diverse Sign-ins</p>
                    <p className="text-[11px] text-amber-800">
                      Want to invite people without Google accounts? Go to your 
                      <b> Firebase Console &gt; Authentication &gt; Sign-in Method</b> and enable <b>Email/Password</b> or <b>Magic Link</b>.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Join Link</label>
                  <div className="flex gap-2">
                    <Input readOnly value={`${window.location.origin}/join`} className="h-10 bg-slate-50" />
                    <Button variant="secondary" size="sm" onClick={handleCopyLink}>Copy</Button>
                  </div>
                </div>
              </div>
              <DialogFooter className="sm:justify-start">
                <p className="text-[10px] text-slate-400 italic">
                  New signups will appear in your network after they complete their profile.
                </p>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isSheetsDialogOpen} onOpenChange={setIsSheetsDialogOpen}>
            <DialogTrigger render={
              <Button variant="outline" className="gap-2 border-green-200 text-green-700 hover:bg-green-50">
                <FileSpreadsheet className="w-4 h-4" />
                Sync Sheets
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sync with Google Sheets</DialogTitle>
                <DialogDescription>
                  Enter the URL of your master contact list to sync with the global database.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input 
                  placeholder="Google Sheets URL" 
                  value={sheetUrl}
                  onChange={e => setSheetUrl(e.target.value)}
                />
                <div className="grid grid-cols-1 gap-2">
                  <Button className="bg-green-600 hover:bg-green-700 w-full" onClick={handleConnectSheets} disabled={importing}>
                    {importing ? 'Syncing...' : 'Sync from URL'}
                  </Button>
                  {isAdmin && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => prepopulateNetwork(true)} disabled={importing}>
                        Seed Master Data
                      </Button>
                      <Button variant="destructive" onClick={handleResetDatabase} disabled={importing}>
                        Reset Global DB
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="relative">
            <Button variant="outline" className="gap-2" disabled={importing}>
              <Upload className="w-4 h-4" />
              {importing ? 'Importing...' : 'Import CSV'}
            </Button>
            <input 
              type="file" 
              accept=".csv" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleCSVImport}
              disabled={importing}
            />
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="w-4 h-4" />
            Add Contact
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Name</label>
                  <Input value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Location</label>
                  <Input value={newContact.location} onChange={e => setNewContact({...newContact, location: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Union Affinity</label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm"
                    value={newContact.union}
                    onChange={e => {
                      const union = e.target.value;
                      const roles = UNION_ROLES[union];
                      const primaryRole = roles ? roles[0] : '';
                      const occCode = (union && roles && UNION_OCC_CODES[union]?.[primaryRole]) || '';
                      setNewContact({
                        ...newContact, 
                        union, 
                        roles: primaryRole,
                        occCode
                      });
                    }}
                  >
                    <option value="">Non-Union / Other</option>
                    <option value="SAG-AFTRA">SAG-AFTRA</option>
                    <option value="DGA">DGA</option>
                    <option value="WGA">WGA</option>
                    <option value="IATSE">IATSE</option>
                    <option value="TEAMSTERS">TEAMSTERS</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Primary Role (Standardized)</label>
                  {newContact.union && UNION_ROLES[newContact.union] ? (
                    <select 
                      className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm"
                      value={newContact.roles.split(',')[0]}
                      onChange={e => {
                        const role = e.target.value;
                        const occCode = (newContact.union && UNION_OCC_CODES[newContact.union]?.[role]) || '';
                        setNewContact({ ...newContact, roles: role, occCode });
                      }}
                    >
                      <option value="">Select industry role...</option>
                      {UNION_ROLES[newContact.union].map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  ) : (
                    <Input 
                      placeholder="e.g. Director of Photography" 
                      value={newContact.roles} 
                      onChange={e => setNewContact({...newContact, roles: e.target.value})} 
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Occupation Code</label>
                  <Input 
                    placeholder="e.g. 600-DP" 
                    value={newContact.occCode} 
                    onChange={e => setNewContact({...newContact, occCode: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Additional Roles / Skills</label>
                  <Input placeholder="DP, Gaffer (Optional)" value={newContact.roles} onChange={e => setNewContact({...newContact, roles: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Email</label>
                  <Input value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Target Day Rate ($)</label>
                  <Input 
                    type="text" 
                    value={newContact.rate || ''} 
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setNewContact({...newContact, rate: val === '' ? 0 : Number(val)});
                    }} 
                  />
                  {newContact.union && (
                    <RateValidation 
                      rate={newContact.rate} 
                      params={{ 
                        union: newContact.union, 
                        occCode: newContact.occCode,
                        positionTitle: newContact.roles.split(',')[0]
                      }} 
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Min Acceptable Rate ($)</label>
                  <Input 
                    type="text" 
                    value={newContact.minRate || ''} 
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setNewContact({...newContact, minRate: val === '' ? 0 : Number(val)});
                    }} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Max Acceptable Rate ($)</label>
                  <Input 
                    type="text" 
                    value={newContact.maxRate || ''} 
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setNewContact({...newContact, maxRate: val === '' ? 0 : Number(val)});
                    }} 
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Project-Specific Tiers</label>
                  <Button variant="ghost" size="sm" className="h-6 text-[9px] gap-1" onClick={() => setNewContact(prev => ({ 
                    ...prev, 
                    projectTypeRates: [...prev.projectTypeRates, { type: 'feature', rate: 0 }] 
                  }))}>
                    <Plus className="w-3 h-3" /> Add Tier
                  </Button>
                </div>
                <div className="space-y-2">
                  {newContact.projectTypeRates.map((r, idx) => (
                    <div key={idx} className="flex gap-2">
                      <select 
                        className="flex-1 h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs"
                        value={r.type}
                        onChange={(e) => {
                          const newRates = [...newContact.projectTypeRates];
                          newRates[idx] = { ...newRates[idx], type: e.target.value as any };
                          setNewContact({ ...newContact, projectTypeRates: newRates });
                        }}
                      >
                        {PROJECT_TYPES.map(pt => (
                          <option key={pt.id} value={pt.id}>{pt.label}</option>
                        ))}
                      </select>
                      <Input 
                        placeholder="Rate" 
                        className="w-24 h-9 text-xs"
                        value={r.rate || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          const newRates = [...newContact.projectTypeRates];
                          newRates[idx] = { ...newRates[idx], rate: Number(val) };
                          setNewContact({ ...newContact, projectTypeRates: newRates });
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500" onClick={() => setNewContact(prev => ({
                        ...prev,
                        projectTypeRates: prev.projectTypeRates.filter((_, i) => i !== idx)
                      }))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddContact}>Save Contact</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    <Tabs value={activeNetworkTab} onValueChange={setActiveNetworkTab} className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="all" className="text-xs uppercase font-bold px-6 gap-2">
            All <Badge variant="secondary" className="text-[8px] px-1 h-3">{getTabCount('all')}</Badge>
          </TabsTrigger>
          <TabsTrigger value="producer" className="text-xs uppercase font-bold px-6 gap-2">
            Producers <Badge variant="secondary" className="text-[8px] px-1 h-3">{getTabCount('producer')}</Badge>
          </TabsTrigger>
          <TabsTrigger value="crew" className="text-xs uppercase font-bold px-6 gap-2">
            Crew <Badge variant="secondary" className="text-[8px] px-1 h-3">{getTabCount('crew')}</Badge>
          </TabsTrigger>
          <TabsTrigger value="vendors" className="text-xs uppercase font-bold px-6 gap-2">
            Vendors <Badge variant="secondary" className="text-[8px] px-1 h-3">{getTabCount('vendors')}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cast" className="text-xs uppercase font-bold px-6 gap-2">
            Cast <Badge variant="secondary" className="text-[8px] px-1 h-3">{getTabCount('cast')}</Badge>
          </TabsTrigger>
        </TabsList>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search by name, role, or tag..." 
            className="pl-10 h-10 bg-white border-slate-200"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <TabsContent value={activeNetworkTab} className="mt-0">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContacts.map((contact) => (
              <Card 
                key={contact.id} 
                className="hover:border-slate-400 transition-all group overflow-hidden cursor-pointer"
                onClick={() => viewContact(contact)}
              >
                <CardHeader className="flex flex-row items-start gap-4 pb-2">
                  <Avatar className="w-12 h-12 border border-slate-100 shadow-sm">
                    <AvatarImage src={contact.headshotUrl} />
                    <AvatarFallback className="bg-slate-900 text-white font-black">
                      {contact.name?.charAt(0) || 'M'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg truncate">
                        {contact.name || (contact.roles && contact.roles.length > 0 ? contact.roles[0] : 'Unnamed Member')}
                      </CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {contact.roles.map(role => (
                        <Badge key={role} variant="secondary" className="text-[10px] py-0">{role}</Badge>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contact.bio && (
                    <p className="text-xs text-slate-500 line-clamp-2 italic">"{contact.bio}"</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{contact.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Plane className="w-3 h-3" />
                      <span>{contact.canTravel || 'No Travel'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Utensils className="w-3 h-3" />
                      <span className="truncate">{contact.dietary || 'None'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-green-500" />
                      <span className="truncate">{contact.vouchedBy || 'Self'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span>{contact.reliability}/5</span>
                    </div>
                    <div className="font-bold text-slate-900">
                      {contact.roles?.some(r => r.toLowerCase().includes('vendor')) 
                        ? 'Quote Basis' 
                        : `$${contact.rate || unionRateService.getMinRate(contact.roles?.[0] || '', contact.location)}/day`}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-2 text-xs h-8"
                        disabled={contact.isGlobal && contact.ownerId !== user?.uid && !contact.roles?.some(r => r.toLowerCase().includes('vendor'))}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (contact.email) handleEmail(contact.email);
                        }}
                      >
                        <Mail className="w-3 h-3" />
                        {contact.isGlobal && contact.ownerId !== user?.uid && !contact.roles?.some(r => r.toLowerCase().includes('vendor')) ? 'Restricted' : 'Email'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-2 text-xs h-8"
                        disabled={contact.isGlobal && contact.ownerId !== user?.uid && !contact.roles?.some(r => r.toLowerCase().includes('vendor'))}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (contact.phone) handleCall(contact.phone);
                        }}
                      >
                        <Phone className="w-3 h-3" />
                        {contact.isGlobal && contact.ownerId !== user?.uid && !contact.roles?.some(r => r.toLowerCase().includes('vendor')) ? 'Locked' : 'Call'}
                      </Button>
                    </div>
                    <Button 
                      className="w-full h-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open internal chat
                        setSelectedContact(contact);
                      }}
                    >
                      <MessageSquare className="w-3 h-3" />
                      In-App Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>

    <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
      <DialogContent className="sm:max-w-md">
        {selectedContact && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-16 h-16 border-2 border-slate-100 shadow-lg">
                  <AvatarImage src={selectedContact.headshotUrl} />
                  <AvatarFallback className="bg-slate-900 text-white text-2xl font-black">
                    {selectedContact.name?.charAt(0) || 'M'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter">{selectedContact.name}</DialogTitle>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedContact.roles.map(role => (
                      <Badge key={role} variant="secondary" className="text-[10px] py-0">{role}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Email Address</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {selectedContact.isGlobal && selectedContact.ownerId !== user?.uid && !selectedContact.roles?.some(r => r.toLowerCase().includes('vendor'))
                      ? '••••••••@••••.com' 
                      : (selectedContact.email || 'Not provided')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Phone Number</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {selectedContact.isGlobal && selectedContact.ownerId !== user?.uid && !selectedContact.roles?.some(r => r.toLowerCase().includes('vendor'))
                      ? '555-•••-••••' 
                      : (selectedContact.phone || 'Not provided')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Location</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {selectedContact.location}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Day Rate</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">
                      {selectedContact.roles?.some(r => r.toLowerCase().includes('vendor')) 
                        ? 'Quote Basis' 
                        : `$${selectedContact.rate || unionRateService.getMinRate(selectedContact.roles?.[0] || '', selectedContact.location)}/day`}
                    </p>
                    {!selectedContact.roles?.some(r => r.toLowerCase().includes('vendor')) && (
                      <Button variant="ghost" size="sm" className="h-6 text-[9px] uppercase" onClick={() => setIsEditingRate(!isEditingRate)}>
                        {isEditingRate ? 'Cancel' : 'Edit Rates'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  {selectedContact.roles?.some(r => r.toLowerCase().includes('vendor')) ? 'Business Information' : 'Availability & Status'}
                </h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  {selectedContact.roles?.some(r => r.toLowerCase().includes('vendor')) ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{selectedContact.location || 'Address not provided'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">Hours: 8:00 AM - 6:00 PM (PT)</span>
                      </div>
                      {selectedContact.notes && (
                        <div className="pt-2 border-t mt-2">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Vendor Notes</p>
                          <p className="text-xs text-slate-500 mt-1">{selectedContact.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-xs font-bold text-slate-900 uppercase">Available for Work</span>
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        This member manages their live production calendar through the Crew Hub. You can view their full availability during crew matching.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {isEditingRate && (
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-4 shadow-xl ring-1 ring-white/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-white tracking-widest">Rate Management</h4>
                    <Button size="sm" className="h-7 text-[10px] bg-white text-black hover:bg-slate-200" onClick={handleUpdateRate}>Save Changes</Button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Base Day Rate ($)</label>
                    <Input 
                      type="text" 
                      className="h-9 bg-slate-800 border-slate-700 text-white text-xs"
                      value={editedRate.base || ''} 
                      onChange={e => setEditedRate({...editedRate, base: Number(e.target.value.replace(/[^0-9]/g, ''))})} 
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-bold uppercase text-slate-400">Project-Specific Rates</label>
                      <Button variant="ghost" size="sm" className="h-6 text-white text-[9px] gap-1 hover:bg-slate-800" onClick={addProjectRate}>
                        <Plus className="w-3 h-3" /> Add Tier
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {editedRate.projectRates.map((r, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select 
                            className="flex-1 h-9 px-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs"
                            value={r.type}
                            onChange={(e) => updateProjectRate(idx, 'type', e.target.value)}
                          >
                            {PROJECT_TYPES.map(pt => (
                              <option key={pt.id} value={pt.id}>{pt.label}</option>
                            ))}
                          </select>
                          <div className="relative flex-1">
                            <DollarSign className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                            <Input 
                              placeholder="Rate" 
                              className="h-9 pl-6 bg-slate-800 border-slate-700 text-white text-xs"
                              value={r.rate || ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                updateProjectRate(idx, 'rate', val);
                              }}
                            />
                          </div>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => removeProjectRate(idx)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedContact.projectTypeRates && selectedContact.projectTypeRates.length > 0 && !isEditingRate && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Rate Tiers</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedContact.projectTypeRates.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                        <span className="text-[10px] font-medium text-slate-500 capitalize">{r.type.replace('_', ' ')}</span>
                        <span className="text-xs font-bold text-slate-900">${r.rate}/day</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedContact.bio && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Bio</p>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {selectedContact.bio}
                  </p>
                </div>
              )}

              {(selectedContact.portfolioUrl || selectedContact.imdbUrl || selectedContact.actingReelUrl) && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Links & Portfolio</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedContact.portfolioUrl && (
                      <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={() => window.open(ensureAbsoluteUrl(selectedContact.portfolioUrl), '_blank')}>
                        <Globe className="w-3 h-3 mr-2" /> Portfolio
                      </Button>
                    )}
                    {selectedContact.imdbUrl && (
                      <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={() => window.open(ensureAbsoluteUrl(selectedContact.imdbUrl), '_blank')}>
                        <LinkIcon className="w-3 h-3 mr-2" /> IMDb
                      </Button>
                    )}
                    {selectedContact.actingReelUrl && (
                      <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={() => window.open(ensureAbsoluteUrl(selectedContact.actingReelUrl), '_blank')}>
                        <Camera className="w-3 h-3 mr-2" /> Acting Reel
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {selectedContact.type?.includes('cast') && (
                <div className="space-y-2 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-bold uppercase text-blue-600 tracking-widest">Physical Attributes (Cast)</p>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div><span className="text-slate-400">Height:</span> {selectedContact.height || 'N/A'}</div>
                    <div><span className="text-slate-400">Weight:</span> {selectedContact.weight || 'N/A'}</div>
                    <div><span className="text-slate-400">Eyes:</span> {selectedContact.eyeColor || 'N/A'}</div>
                    <div><span className="text-slate-400">Hair:</span> {selectedContact.hairColor || 'N/A'}</div>
                  </div>
                </div>
              )}

              {selectedContact.type?.includes('crew') && selectedContact.equipmentList && (
                <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Equipment List (Crew)</p>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{selectedContact.equipmentList}</p>
                </div>
              )}

              {selectedContact.type?.includes('vendor') && (
                <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Vendor Information</p>
                  <div className="space-y-2">
                    {selectedContact.companyName && <p className="text-sm font-bold">{selectedContact.companyName}</p>}
                    {selectedContact.website && (
                      <Button variant="link" className="p-0 h-auto text-xs" onClick={() => window.open(ensureAbsoluteUrl(selectedContact.website), '_blank')}>
                        {selectedContact.website}
                      </Button>
                    )}
                    {selectedContact.services && (
                      <div className="mt-2">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Services</p>
                        <p className="text-xs text-slate-600">{selectedContact.services}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button className="flex-1 gap-2" onClick={() => handleEmail(selectedContact.email)}>
                  <Mail className="w-4 h-4" />
                  Send Email
                </Button>
                {selectedContact.phone && (
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => handleCall(selectedContact.phone)}>
                    <Phone className="w-4 h-4" />
                    Call Mobile
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  </div>
);
}
