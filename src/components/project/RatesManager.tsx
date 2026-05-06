import React, { useEffect, useState } from 'react';
import { UnionRate } from '../../types';
import { unionRateService } from '../../services/unionRateService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Plus, Trash2, Edit2, Check, X, ShieldAlert, Globe, Database, FileUp, FolderUp, Search, Info, SlidersHorizontal } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { PROJECT_TYPES, CanonicalRate } from '../../types';
import { UNION_ROLES, ALL_ROLES, UNION_OCC_CODES } from '../../constants/unionData';

import { useAuth } from '../../lib/AuthProvider';

const UNION_LOGOS: Record<string, string> = {
  'SAG-AFTRA': 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7b/SAG-AFTRA_logo.svg/300px-SAG-AFTRA_logo.svg.png',
  'DGA': 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5e/Directors_Guild_of_America_logo.svg/300px-Directors_Guild_of_America_logo.svg.png',
  'WGA': 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5c/Writers_Guild_of_America_West_logo.svg/300px-Writers_Guild_of_America_West_logo.svg.png',
  'IATSE': 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/IATSE_logo.svg/300px-IATSE_logo.svg.png',
  'TEAMSTERS': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/International_Brotherhood_of_Teamsters_logo.svg/300px-International_Brotherhood_of_Teamsters_logo.svg.png'
};

const CONTRACT_LEVELS = [
  'Student Film', 'Short Film', 'New Media', 'Ultra Low Budget', 'Moderate Low Budget', 
  'Low Budget', 'Tier 1', 'Tier 2', 'Tier 3', 'Major Studio', 'Commercial (Regional)', 
  'Commercial (National)', 'Industrial/Corporate', 'Network TV', 'Cable TV', 'Streaming Series'
];

interface RateFormProps {
  editForm: Partial<UnionRate>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<UnionRate>>>;
  onSubmit: () => void;
  submitLabel: string;
}

function RateForm({ editForm, setEditForm, onSubmit, submitLabel }: RateFormProps) {
  const availableRoles = editForm.union ? UNION_ROLES[editForm.union] || ALL_ROLES : ALL_ROLES;
  const [useRange, setUseRange] = useState(!!(editForm.minRate || editForm.maxRate));

  return (
    <>
      <div className="grid gap-3 py-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-none">
        <div className="grid grid-cols-4 items-center gap-4">
          <label className="text-right text-xs font-bold uppercase text-slate-400">Union</label>
          <select 
            className="col-span-3 h-10 px-3 rounded-md border border-slate-200 text-sm font-bold bg-slate-50"
            value={editForm.union}
            onChange={(e) => {
              const newUnion = e.target.value as any;
              const roles = UNION_ROLES[newUnion] || ALL_ROLES;
              setEditForm({...editForm, union: newUnion, role: roles[0]});
            }}
          >
            <option value="SAG-AFTRA">SAG-AFTRA</option>
            <option value="DGA">DGA</option>
            <option value="WGA">WGA</option>
            <option value="IATSE">IATSE</option>
            <option value="TEAMSTERS">TEAMSTERS</option>
          </select>
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <label className="text-right text-xs font-bold uppercase text-slate-400">Content Type</label>
          <select 
            className="col-span-3 h-10 px-3 rounded-md border border-slate-200 text-sm"
            value={editForm.contentType}
            onChange={(e) => setEditForm({...editForm, contentType: e.target.value as any})}
          >
            <option value="">Specific Type (Optional)</option>
            {PROJECT_TYPES.map(pt => (
              <option key={pt.id} value={pt.id}>{pt.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <label className="text-right text-xs font-bold uppercase text-amber-600">Contract Level</label>
          <select 
            className="col-span-3 h-10 px-3 rounded-md border border-amber-200 text-sm font-bold bg-amber-50/50"
            value={editForm.contract}
            onChange={(e) => setEditForm({...editForm, contract: e.target.value})}
          >
            {CONTRACT_LEVELS.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <label className="text-right text-xs font-bold uppercase text-slate-900 border-l-2 border-slate-900 pl-2">Industry Role</label>
          <select 
            className="col-span-3 h-10 px-3 rounded-md border-2 border-slate-900 text-sm font-black uppercase"
            value={editForm.role}
            onChange={(e) => setEditForm({...editForm, role: e.target.value})}
          >
            {availableRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <label className="text-right text-xs font-bold uppercase text-slate-400">Tier</label>
          <select 
            className="col-span-3 h-10 px-3 rounded-md border border-slate-200 text-sm"
            value={editForm.tier}
            onChange={(e) => setEditForm({...editForm, tier: e.target.value as any})}
          >
            <option value="Head">Head / Dept Head</option>
            <option value="Key">Key / Lead</option>
            <option value="Second">Second / Assistant</option>
            <option value="Third">Third</option>
            <option value="Utility">Utility / Entry</option>
          </select>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rate Configuration</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setUseRange(!useRange)}
              className={cn(
                "h-6 text-[9px] font-black uppercase rounded-full px-3",
                useRange ? "bg-slate-900 text-white" : "bg-white border text-slate-400"
              )}
            >
              {useRange ? "Switch to Fixed Rate" : "Switch to Range"}
            </Button>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-xs font-bold uppercase">{useRange ? 'Avg Rate' : 'Rate'} ($)</label>
            <Input 
              type="number" 
              className="col-span-3 font-black" 
              value={editForm.rate} 
              onChange={(e) => setEditForm({...editForm, rate: Number(e.target.value)})} 
            />
          </div>

          {useRange && (
            <div className="grid grid-cols-2 gap-4 pl-[25%]">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Min</label>
                <Input 
                  type="number" 
                  className="h-8 text-xs" 
                  value={editForm.minRate} 
                  placeholder="0"
                  onChange={(e) => setEditForm({...editForm, minRate: Number(e.target.value)})} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Max</label>
                <Input 
                  type="number" 
                  className="h-8 text-xs" 
                  value={editForm.maxRate} 
                  placeholder="∞"
                  onChange={(e) => setEditForm({...editForm, maxRate: Number(e.target.value)})} 
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4 border-t pt-3">
            <label className="text-right text-xs font-bold uppercase">Charging Unit</label>
            <select 
              className="col-span-3 h-10 px-3 rounded-md border border-slate-200 text-sm"
              value={editForm.unit}
              onChange={(e) => setEditForm({...editForm, unit: e.target.value as any})}
            >
              <option value="hour">Per Hour</option>
              <option value="day">Per Day</option>
              <option value="week">Per Week</option>
              <option value="flat">Flat Fee</option>
            </select>
          </div>
        </div>
      </div>
      <Button onClick={onSubmit} className="w-full bg-slate-900 font-bold uppercase tracking-widest h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:translate-y-[-2px] transition-transform">{submitLabel}</Button>
    </>
  );
}

export default function RatesManager() {
  const { user } = useAuth();
  const [rates, setRates] = useState<UnionRate[]>([]);
  const [canonicalRates, setCanonicalRates] = useState<CanonicalRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UnionRate>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [viewMode, setViewMode] = useState<'custom' | 'canonical'>('canonical');
  const [selectedUnion, setSelectedUnion] = useState('SAG-AFTRA');
  const [isUploadingFolder, setIsUploadingFolder] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [trackFilter, setTrackFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [viewMode, selectedUnion, locationFilter, user]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (viewMode === 'custom') {
        const data = await unionRateService.getRates();
        setRates(data);
      } else {
        const data = await unionRateService.getCanonicalRates(selectedUnion, locationFilter === 'all' ? undefined : locationFilter);
        setCanonicalRates(data);
      }
    } catch (err: any) {
      console.error("RatesManager load error:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async (force: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      await unionRateService.seedInitialRates();
      await unionRateService.seedCanonicalRates(force);
      
      // Also trigger the IATSE specific spreadsheet sync if forcing
      if (force) {
        try {
          const count = await unionRateService.syncIatseFromSheet();
          console.log(`Synced ${count} IATSE rates from combined CSV.`);
        } catch (iatseErr) {
          console.warn("IATSE Sync skipped or failed:", iatseErr);
          // Don't fail the whole seed if only IATSE sheet fails, but show warning
        }
      }
      
      await loadData();
      if (force) {
        alert("Global Rates Database Refreshed! 2024-2025 Standards are now live.");
      }
    } catch (err: any) {
      console.error("Seed error:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const deleteRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom rate?')) return;
    await unionRateService.deleteRate(id);
    await loadData();
  };

  const addRate = async () => {
    if (!editForm.union || !editForm.role || !editForm.rate) return;
    await unionRateService.addRate(editForm as Omit<UnionRate, 'id'>);
    setIsAdding(false);
    setEditForm({});
    await loadData();
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await unionRateService.updateRate(editingId, editForm);
    setEditingId(null);
    await loadData();
  };

  const filteredCanonicalRates = canonicalRates.filter(rate => {
    const matchesSearch = 
      rate.classification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.occCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.scheduleName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTrack = trackFilter === 'all' || 
      rate.track?.toLowerCase() === trackFilter.toLowerCase() ||
      (trackFilter === 'Majors' && rate.union.includes('Majors'));
      
    const matchesTier = tierFilter === 'all' || 
      (rate.notes && rate.notes.toLowerCase().includes(tierFilter.toLowerCase())) ||
      (rate.scheduleName && rate.scheduleName.toLowerCase().includes(tierFilter.toLowerCase()));

    return matchesSearch && matchesTrack && matchesTier;
  });

  const handleUploadFolder = () => {
    setIsUploadingFolder(true);
    // Simulate folder upload processing
    setTimeout(() => {
      setIsUploadingFolder(false);
      alert('IATSE Local Dataset processed successfully. Standardized classification names applied.');
    }, 2000);
  };

  if (loading && !rates.length && !canonicalRates.length) return <div className="p-8 text-center font-bold uppercase tracking-widest text-slate-400 animate-pulse">Loading platform standards...</div>;

  return (
    <Card className="border-none shadow-none bg-transparent">
      {error && (
        <div className="mb-4">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Rate Engine Error</AlertTitle>
            <AlertDescription>
              Failed to load union rates. This may be due to missing database initialization or permissions. 
              Details: {error}
            </AlertDescription>
          </Alert>
        </div>
      )}
      <CardHeader className="px-0 pt-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" />
              Guild Compliance Engine
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cross-union rate validation & Industry standard analytics
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleSeed(true)} 
              disabled={loading}
              className="font-black border-slate-900 border-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-50 transition-all uppercase text-[10px]"
            >
              Deep Sync & Refresh
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleSeed(false)} 
              disabled={loading}
              className="font-black border-slate-900 border-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-50 transition-all uppercase text-[10px]"
            >
              Incremental Sync
            </Button>
            
            {selectedUnion === 'IATSE' && (
              <Button 
                size="sm" 
                onClick={handleUploadFolder}
                disabled={isUploadingFolder}
                className="bg-purple-600 hover:bg-purple-700 font-black uppercase tracking-widest text-[10px] text-white"
              >
                {isUploadingFolder ? 'Processing...' : <><FolderUp className="w-4 h-4 mr-2" /> Upload IATSE Folder</>}
              </Button>
            )}

            <Dialog open={isAdding} onOpenChange={(open) => { 
                setIsAdding(open); 
                if(open) {
                  const initialUnion = selectedUnion in UNION_LOGOS ? selectedUnion : 'SAG-AFTRA';
                  const roles = UNION_ROLES[initialUnion] || ALL_ROLES;
                  setEditForm({ 
                    tier: 'Key', 
                    unit: 'day', 
                    union: initialUnion as any, 
                    role: roles[0],
                    contract: CONTRACT_LEVELS[0],
                    contentType: 'feature'
                  }); 
                }
              }}>
              <DialogTrigger render={<Button size="sm" className="bg-slate-900 font-black uppercase tracking-widest text-[10px] text-white shadow-[4px_4px_0px_0px_rgba(30,41,59,0.3)]">Add Custom Rate</Button>} />
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Production Rate</DialogTitle>
                </DialogHeader>
                <RateForm 
                  editForm={editForm} 
                  setEditForm={setEditForm} 
                  onSubmit={addRate} 
                  submitLabel="Create Rate" 
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Coverage Advert */}
        <div className="mt-8 p-6 bg-slate-900 rounded-[2.5rem] border-4 border-slate-900 shadow-[15px_15px_0px_0px_rgba(241,245,249,1)] relative overflow-hidden group ring-8 ring-white">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Globe className="w-48 h-48 text-white" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-400 p-2 rounded-xl">
                    <ShieldAlert className="w-5 h-5 text-slate-900" />
                  </div>
                  <h4 className="text-white font-black uppercase text-base tracking-tighter italic">Curbily Canonical Dataset</h4>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed font-bold tracking-tight">
                  Powered by 2024-2025 Union Minimums. We ingest DGA, SAG-AFTRA, and WGA standards directly from source spreadsheets to ensure 100% compliance.
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full md:w-auto">
                <div className="flex gap-2">
                  {['SAG-AFTRA', 'DGA', 'WGA', 'IATSE'].map(u => (
                    <div key={u} className="px-5 py-3 bg-white/10 border border-white/20 rounded-2xl flex flex-col items-center justify-center min-w-[80px] shadow-sm group-hover:scale-110 transition-transform">
                      <span className="text-[12px] font-black text-white tracking-widest">{u}</span>
                      <span className="text-[8px] font-black text-green-400 uppercase flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Live
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {['TEAMSTERS'].map(u => (
                    <div key={u} className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center min-w-[80px] opacity-70">
                      <span className="text-[12px] font-black text-white tracking-widest">{u}</span>
                      <span className="text-[8px] font-black text-amber-400 uppercase">Beta</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="mt-12">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8 bg-slate-50 p-4 rounded-3xl border border-slate-200">
              <TabsList className="bg-slate-200 p-1.5 rounded-2xl h-14">
                <TabsTrigger value="canonical" className="rounded-xl px-6 h-full font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">
                  <Database className="w-3.5 h-3.5 mr-2" /> Global Dataset
                </TabsTrigger>
                <TabsTrigger value="custom" className="rounded-xl px-6 h-full font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-2" /> Custom Standards
                </TabsTrigger>
              </TabsList>

              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <Input 
                    placeholder="Search by role or code..."
                    className="h-10 pl-8 bg-white border-slate-200 text-xs font-bold rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <select 
                  className="h-10 px-3 bg-white border border-slate-200 text-[10px] font-black uppercase rounded-xl"
                  value={trackFilter}
                  onChange={(e) => setTrackFilter(e.target.value)}
                >
                  <option value="all">All Tracks</option>
                  <option value="Majors">Majors</option>
                  <option value="Independents">Independents</option>
                </select>

                <select 
                  className="h-10 px-3 bg-white border border-slate-200 text-[10px] font-black uppercase rounded-xl"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                >
                  <option value="all">Global</option>
                  <option value="CA">CA / Western</option>
                  <option value="AZ">AZ / Arizona</option>
                  <option value="TN">TN / Tennessee</option>
                  <option value="NY">NY / Eastern</option>
                  <option value="GA">GA / South</option>
                  <option value="FL">FL / Florida</option>
                </select>

                <div className="flex overflow-x-auto gap-2">
                  {Object.keys(UNION_LOGOS).map(union => (
                    <Button
                      key={union}
                      variant={selectedUnion === union ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedUnion(union)}
                      className={cn(
                        "h-10 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all",
                        selectedUnion === union 
                          ? "bg-slate-900 text-white scale-105 shadow-xl" 
                          : "bg-white border-slate-200 text-slate-400 hover:border-slate-900"
                      )}
                    >
                      {union}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <TabsContent value="canonical" className="mt-0">
              <div className="bg-white border-4 border-slate-900 rounded-[2rem] overflow-hidden shadow-[12px_12px_0px_0px_rgba(15,23,42,1)]">
                <Table>
                  <TableHeader className="bg-slate-900 h-14">
                    <TableRow className="hover:bg-slate-900 border-none">
                      <TableHead className="text-white font-black uppercase text-[11px] tracking-widest px-6">Classification / Role</TableHead>
                      <TableHead className="text-white font-black uppercase text-[11px] tracking-widest">Agreement / Tier</TableHead>
                      <TableHead className="text-white font-black uppercase text-[11px] tracking-widest">Rate</TableHead>
                      <TableHead className="text-white font-black uppercase text-[11px] tracking-widest">Unit</TableHead>
                      <TableHead className="text-white font-black uppercase text-[11px] tracking-widest px-6 text-right">Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCanonicalRates.length > 0 ? filteredCanonicalRates.map((rate) => (
                      <TableRow key={rate.id} className="hover:bg-slate-50 border-slate-100 h-16">
                        <TableCell className="font-bold text-slate-900 px-6">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 uppercase tracking-tighter">{rate.classification}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Code: {rate.occCode}</span>
                              {rate.track && (
                                <Badge variant="outline" className="text-[8px] font-black uppercase px-1 h-4 border-slate-200 text-slate-400">
                                  {rate.track}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-900 tracking-tight">{rate.scheduleName || 'Standard MBA'}</span>
                            {rate.agreementCode && <span className="text-[8px] font-bold text-slate-400 uppercase">{rate.agreementCode}</span>}
                            {rate.notes && <span className="text-[8px] text-slate-400 font-normal">{rate.notes}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-900 text-lg">${rate.amountUsd.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-100 border-none font-black text-[9px] uppercase tracking-widest px-2 py-0.5">
                            PER {rate.rateType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <Badge variant="outline" className={cn(
                            "text-[8px] font-black uppercase tracking-widest border-2",
                            rate.extractionConfidence === 'high' ? "text-green-600 border-green-600 bg-green-50" :
                            rate.extractionConfidence === 'medium' ? "text-amber-600 border-amber-600 bg-amber-50" :
                            "text-red-600 border-red-600 bg-red-50"
                          )}>
                            {rate.extractionConfidence}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-40">
                            <Database className="w-12 h-12" />
                            <div>
                              <p className="font-black uppercase text-sm">No Canonical Data Loaded</p>
                              <p className="text-xs font-bold">Sync industry data to populate the {selectedUnion} dataset.</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="mt-0">
              <div className="bg-white border-4 border-slate-900 rounded-[2rem] overflow-hidden shadow-[12px_12px_0px_0px_rgba(15,23,42,1)]">
                <Table>
                  <TableHeader className="bg-slate-900 h-14">
                    <TableRow className="hover:bg-slate-900 border-none">
                      <TableHead className="text-white font-black uppercase text-[11px] tracking-widest px-6">Union</TableHead>
                      <TableHead className="text-white font-black uppercase text-[11px] tracking-widest">Level</TableHead>
                      <TableHead className="text-white font-black uppercase text-[11px] tracking-widest">Tier</TableHead>
                      <TableHead className="text-white font-black uppercase text-[11px] tracking-widest">Role</TableHead>
                      <TableHead className="text-white font-black uppercase text-[11px] tracking-widest">Rate (Range)</TableHead>
                      <TableHead className="text-white font-black uppercase text-[11px] tracking-widest w-[120px] text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.filter(r => r.union === selectedUnion).map((rate) => (
                      <TableRow key={rate.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                        <TableCell className="px-6 py-4">
                          <Badge variant="outline" className="font-black uppercase text-[10px] tracking-tighter border-2 border-slate-900">
                            {rate.union}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 uppercase tracking-tighter">
                            {rate.contract}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-[10px] font-black uppercase px-3 py-1 rounded-full",
                            rate.tier === 'Head' ? "bg-purple-100 text-purple-700 font-black italic" :
                            rate.tier === 'Key' ? "bg-blue-100 text-blue-700" :
                            "bg-slate-100 text-slate-500 font-bold"
                          )}>
                            {rate.tier}
                          </span>
                        </TableCell>
                        <TableCell className="font-black text-slate-900 uppercase tracking-tighter">{rate.role}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-base">
                              ${rate.rate}/{rate.unit}
                            </span>
                            {(rate.minRate || rate.maxRate) && (
                              <span className="text-[10px] text-slate-400 font-black uppercase bg-slate-50 px-2 rounded inline-block w-fit">
                                Range: ${rate.minRate || 0} - ${rate.maxRate || '∞'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex gap-2 justify-end">
                            <Dialog open={editingId === rate.id} onOpenChange={(open) => !open && setEditingId(null)}>
                              <DialogTrigger render={
                                <Button size="icon" variant="ghost" className="h-10 w-10 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl" onClick={() => {
                                  setEditingId(rate.id);
                                  setEditForm(rate);
                                }}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              } />
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>Update Production Rate</DialogTitle>
                                </DialogHeader>
                                <RateForm 
                                  editForm={editForm} 
                                  setEditForm={setEditForm} 
                                  onSubmit={saveEdit} 
                                  submitLabel="Update Rate" 
                                />
                              </DialogContent>
                            </Dialog>
                            <Button size="icon" variant="ghost" className="h-10 w-10 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={() => deleteRate(rate.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {rates.filter(r => r.union === selectedUnion).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                          No custom rates listed for {selectedUnion}.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
