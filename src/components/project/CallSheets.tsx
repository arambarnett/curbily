import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { CallSheet, ScheduleDay, Scene, Project, Contact } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { 
  FileText, Send, MapPin, Clock, Cloud, Hospital, Info, 
  Sparkles, AlertCircle, Edit3, Save, X, Plus, Trash2, 
  Phone, Users, User, Mail, Check
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { callSheet } from '../../lib/gemini';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import SubscriptionGate from '../SubscriptionGate';
import { cn } from '../../lib/utils';

export default function CallSheets({ projectId, project }: { projectId: string, project: Project }) {
  const renderString = (val: any, fallback: string = '') => {
    if (!val) return fallback;
    if (typeof val === 'object') {
      return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join(', ');
    }
    return String(val);
  };

  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [callSheets, setCallSheets] = useState<Record<string, CallSheet>>({});
  const [scenes, setScenes] = useState<Record<string, Scene>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingSheet, setEditingSheet] = useState<CallSheet | null>(null);

  useEffect(() => {
    // Fetch schedule days
    const qDays = query(collection(db, 'projects', projectId, 'schedule'), orderBy('dayNumber'));
    const unsubDays = onSnapshot(qDays, (snapshot) => {
      setDays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleDay)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/schedule`);
    });

    // Fetch call sheets
    const qCallSheets = query(collection(db, 'projects', projectId, 'call_sheets'));
    const unsubCallSheets = onSnapshot(qCallSheets, (snapshot) => {
      const sheets: Record<string, CallSheet> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as CallSheet;
        sheets[data.dayId] = { id: doc.id, ...data };
      });
      setCallSheets(sheets);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/call_sheets`);
    });

    // Fetch scenes
    const qScenes = query(collection(db, 'projects', projectId, 'scenes'));
    const unsubScenes = onSnapshot(qScenes, (snapshot) => {
      const sceneMap: Record<string, Scene> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Scene;
        sceneMap[data.sceneNumber] = { id: doc.id, ...data };
      });
      setScenes(sceneMap);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/scenes`);
    });

    // Fetch contacts for emailing
    const qContacts = query(collection(db, 'contacts'));
    const unsubContacts = onSnapshot(qContacts, (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contacts');
    });

    return () => {
        unsubDays();
        unsubCallSheets();
        unsubScenes();
        unsubContacts();
      };
  }, [projectId]);

  const handleGenerateCallSheet = async (day: ScheduleDay) => {
    setIsGenerating(day.id);
    try {
      const existingSheet = callSheets[day.id];
      const dayScenes = (day.sceneIds || []).map(id => scenes[id]).filter(Boolean);
      
      // Use approved location if available, otherwise fallback to project main location
      const approvedLocation = project.locations?.find(l => l.isApproved);
      const locationToUse = approvedLocation ? `${approvedLocation.name} (${approvedLocation.address})` : project.location;
      
      const sheetData = await callSheet(day, dayScenes, contacts, locationToUse);
      
      if (existingSheet) {
        await updateDoc(doc(db, 'projects', projectId, 'call_sheets', existingSheet.id), {
          ...sheetData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'projects', projectId, 'call_sheets'), {
          projectId,
          dayId: day.id,
          ...sheetData,
          status: 'draft',
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Call sheet generation failed:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleUpdateCallSheet = async () => {
    if (!editingSheet || !editingSheet.id) return;
    try {
      const { id, ...data } = editingSheet;
      await updateDoc(doc(db, 'projects', projectId, 'call_sheets', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      setIsEditing(null);
      setEditingSheet(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/call_sheets/${editingSheet.id}`);
    }
  };

  const handleSendCallSheet = async (sheet: CallSheet) => {
    try {
      const recipients = contacts.map(c => c.email).filter(Boolean);
      await addDoc(collection(db, `projects/${projectId}/notifications`), {
        projectId,
        type: 'system',
        title: 'Call Sheet Sent',
        message: `Call sheet for ${sheet.date} has been emailed to ${recipients.length} cast and crew members.`,
        isRead: false,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'projects', projectId, 'call_sheets', sheet.id), { status: 'sent', sentAt: serverTimestamp() });
    } catch (error) {
      console.error('Failed to send call sheet:', error);
    }
  };

  if (loading) return <div>Loading call sheets...</div>;

  return (
    <SubscriptionGate 
      featureName="Call Sheets"
    >
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Call Sheets
        </h2>
      </div>

      <div className="grid gap-6">
        {days.map((day) => {
          const sheet = callSheets[day.id];
          return (
            <Card key={day.id} className="overflow-hidden border-none shadow-sm">
              <CardHeader className="bg-white border-b border-slate-50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Shoot Day {day.dayNumber}</CardTitle>
                  <CardDescription>
                    {day.date ? new Date(day.date).toLocaleDateString() : 'Date TBD'} • {(day.sceneIds || []).length} scenes scheduled
                  </CardDescription>
                </div>
                {!sheet ? (
                  <Button 
                    onClick={() => handleGenerateCallSheet(day)} 
                    disabled={isGenerating === day.id}
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isGenerating === day.id ? 'Generating...' : 'Generate Call Sheet'}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Badge variant={sheet.status === 'sent' ? 'default' : 'secondary'}>
                      {sheet.status === 'sent' ? 'Sent' : 'Draft'}
                    </Badge>
                    <Dialog open={isEditing === sheet.id} onOpenChange={(open) => {
                      if (open) {
                        setEditingSheet(sheet);
                        setIsEditing(sheet.id);
                      } else {
                        setIsEditing(null);
                        setEditingSheet(null);
                      }
                    }}>
                      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
                        <DialogHeader className="p-6 pb-0">
                          <DialogTitle>Edit Call Sheet: Shoot Day {day.dayNumber}</DialogTitle>
                          <DialogDescription>Manually override any AI-generated details below.</DialogDescription>
                        </DialogHeader>
                        {editingSheet && (
                          <ScrollArea className="flex-1 px-6">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-6">
                              <div className="space-y-2">
                                <Label>Call Time</Label>
                                <Input value={editingSheet.callTime} onChange={(e) => setEditingSheet({...editingSheet, callTime: e.target.value})} />
                              </div>
                              <div className="space-y-2">
                                <Label>Wrap Time</Label>
                                <Input value={editingSheet.wrapTime} onChange={(e) => setEditingSheet({...editingSheet, wrapTime: e.target.value})} />
                              </div>
                              <div className="col-span-2 space-y-2">
                                <Label>Location</Label>
                                <Input value={editingSheet.location} onChange={(e) => setEditingSheet({...editingSheet, location: e.target.value})} />
                              </div>
                              <div className="space-y-2">
                                <Label>Weather Forecast</Label>
                                <Textarea value={renderString(editingSheet.weather)} onChange={(e) => setEditingSheet({...editingSheet, weather: e.target.value})} className="min-h-[80px]" />
                              </div>
                              <div className="space-y-2">
                                <Label>Weather Impact</Label>
                                <Textarea value={renderString(editingSheet.weatherImpact)} onChange={(e) => setEditingSheet({...editingSheet, weatherImpact: e.target.value})} className="min-h-[80px]" />
                              </div>
                              <div className="col-span-2 space-y-2">
                                <Label>Catering Info</Label>
                                <Textarea value={renderString(editingSheet.catering)} onChange={(e) => setEditingSheet({...editingSheet, catering: e.target.value})} className="min-h-[100px]" />
                              </div>

                              <Separator className="col-span-2 my-2" />

                              {/* Cast Roster Editor */}
                              <div className="col-span-2 space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-600" /> Cast Roster
                                  </h4>
                                  <Button 
                                    size="sm" variant="outline" 
                                    onClick={() => setEditingSheet({
                                      ...editingSheet, 
                                      cast: [...(editingSheet.cast || []), { id: Math.random().toString(36).substr(2, 9), name: '', character: '', callTime: '', hairMakeupTime: '', onSetTime: '', phone: '' }]
                                    })}
                                    className="h-7 text-[10px] gap-1"
                                  >
                                    <Plus className="w-3 h-3" /> Add Cast
                                  </Button>
                                </div>
                                <div className="space-y-3">
                                  {(editingSheet.cast || []).map((c, idx) => (
                                    <div key={c.id} className="grid grid-cols-6 gap-2 items-end p-3 bg-slate-50 border rounded-lg relative group">
                                      <div className="col-span-2 space-y-1">
                                        <Label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Actor Name</Label>
                                        <Input value={c.name} onChange={(e) => {
                                          const newCast = [...editingSheet.cast!];
                                          newCast[idx] = { ...c, name: e.target.value };
                                          setEditingSheet({ ...editingSheet, cast: newCast });
                                        }} className="h-8 text-xs" />
                                      </div>
                                      <div className="col-span-2 space-y-1">
                                        <Label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Character</Label>
                                        <Input value={c.character} onChange={(e) => {
                                          const newCast = [...editingSheet.cast!];
                                          newCast[idx] = { ...c, character: e.target.value };
                                          setEditingSheet({ ...editingSheet, cast: newCast });
                                        }} className="h-8 text-xs" />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Set Call</Label>
                                        <Input value={c.onSetTime} onChange={(e) => {
                                          const newCast = [...editingSheet.cast!];
                                          newCast[idx] = { ...c, onSetTime: e.target.value };
                                          setEditingSheet({ ...editingSheet, cast: newCast });
                                        }} className="h-8 text-xs" />
                                      </div>
                                      <div className="flex flex-col items-center gap-1">
                                        <Label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Conf?</Label>
                                        <Button 
                                          variant={c.isConfirmed ? 'default' : 'outline'} 
                                          size="icon" 
                                          className={cn("h-8 w-8", c.isConfirmed ? "bg-green-600 hover:bg-green-700" : "")}
                                          onClick={() => {
                                            const newCast = [...editingSheet.cast!];
                                            newCast[idx] = { ...c, isConfirmed: !c.isConfirmed };
                                            setEditingSheet({ ...editingSheet, cast: newCast });
                                          }}
                                        >
                                          <Check className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <div className="space-y-1 flex justify-center">
                                        <Button 
                                          variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500"
                                          onClick={() => {
                                            const newCast = editingSheet.cast!.filter((_, i) => i !== idx);
                                            setEditingSheet({ ...editingSheet, cast: newCast });
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <Separator className="col-span-2 my-2" />

                              {/* Crew Roster Editor */}
                              <div className="col-span-2 space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                    <User className="w-4 h-4 text-orange-600" /> Crew Roster
                                  </h4>
                                  <Button 
                                    size="sm" variant="outline" 
                                    onClick={() => setEditingSheet({
                                      ...editingSheet, 
                                      crew: [...(editingSheet.crew || []), { id: Math.random().toString(36).substr(2, 9), name: '', role: '', callTime: '', phone: '', email: '', department: '' }]
                                    })}
                                    className="h-7 text-[10px] gap-1"
                                  >
                                    <Plus className="w-3 h-3" /> Add Crew
                                  </Button>
                                </div>
                                <div className="space-y-3">
                                  {(editingSheet.crew || []).map((c, idx) => (
                                    <div key={c.id} className="grid grid-cols-6 gap-2 items-end p-3 bg-slate-50 border rounded-lg relative group">
                                      <div className="col-span-2 space-y-1">
                                        <Label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Crew Name</Label>
                                        <Input value={c.name} onChange={(e) => {
                                          const newCrew = [...editingSheet.crew!];
                                          newCrew[idx] = { ...c, name: e.target.value };
                                          setEditingSheet({ ...editingSheet, crew: newCrew });
                                        }} className="h-8 text-xs" />
                                      </div>
                                      <div className="col-span-2 space-y-1">
                                        <Label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Position</Label>
                                        <Input value={c.role} onChange={(e) => {
                                          const newCrew = [...editingSheet.crew!];
                                          newCrew[idx] = { ...c, role: e.target.value };
                                          setEditingSheet({ ...editingSheet, crew: newCrew });
                                        }} className="h-8 text-xs" />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Indiv Call</Label>
                                        <Input value={c.callTime} onChange={(e) => {
                                          const newCrew = [...editingSheet.crew!];
                                          newCrew[idx] = { ...c, callTime: e.target.value };
                                          setEditingSheet({ ...editingSheet, crew: newCrew });
                                        }} className="h-8 text-xs" />
                                      </div>
                                      <div className="flex flex-col items-center gap-1">
                                        <Label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Conf?</Label>
                                        <Button 
                                          variant={c.isConfirmed ? 'default' : 'outline'} 
                                          size="icon" 
                                          className={cn("h-8 w-8", c.isConfirmed ? "bg-green-600 hover:bg-green-700" : "")}
                                          onClick={() => {
                                            const newCrew = [...editingSheet.crew!];
                                            newCrew[idx] = { ...c, isConfirmed: !c.isConfirmed };
                                            setEditingSheet({ ...editingSheet, crew: newCrew });
                                          }}
                                        >
                                          <Check className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <div className="space-y-1 flex justify-center">
                                        <Button 
                                          variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500"
                                          onClick={() => {
                                            const newCrew = editingSheet.crew!.filter((_, i) => i !== idx);
                                            setEditingSheet({ ...editingSheet, crew: newCrew });
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </ScrollArea>
                        )}
                        <DialogFooter className="p-6 border-t">
                          <Button variant="ghost" onClick={() => setIsEditing(null)}>Cancel</Button>
                          <Button onClick={handleUpdateCallSheet} className="gap-2">
                            <Save className="w-4 h-4" /> Save Changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSendCallSheet(sheet)}
                      className="gap-2"
                    >
                      <Send className="w-3 h-3" /> Email to Crew
                    </Button>
                  </div>
                )}
              </CardHeader>
              {sheet && (
                <CardContent className="p-8 bg-slate-50/30">
                  {/* Production Header Branding */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-slate-300">
                    <div>
                      <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none mb-1">
                        {project.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-none border-blue-600 text-blue-600 font-black uppercase tracking-wider text-[10px]">
                          CALL SHEET
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          DAY {day.dayNumber} OF {days.length}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</p>
                      <p className="text-xl font-bold">{sheet.date || (day.date ? new Date(day.date).toLocaleDateString() : 'TBD')}</p>
                    </div>
                  </div>

                  {/* Main Call Times & Logistical Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                    <div className="bg-blue-600 p-4 text-white rounded-lg shadow-lg transform -rotate-1">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">General Call</p>
                      <p className="text-3xl font-black">{sheet.callTime}</p>
                    </div>
                    <div className="bg-white p-4 border rounded-lg shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Expected Wrap</p>
                      <p className="text-xl font-bold text-slate-900">{sheet.wrapTime || 'TBD'}</p>
                    </div>
                    <div className="bg-white p-4 border rounded-lg shadow-sm col-span-2">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Location</p>
                          <p className="text-sm font-bold text-slate-900 leading-tight">{renderString(sheet.location)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column: Personnel & Rosters */}
                    <div className="space-y-10">
                      {/* Cast Table */}
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 flex items-center gap-2 border-b border-blue-100 pb-2">
                          <Users className="w-4 h-4" /> Cast Roster
                        </h4>
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="text-[9px] font-black uppercase h-8 py-0">Actor</TableHead>
                                <TableHead className="text-[9px] font-black uppercase h-8 py-0">Character</TableHead>
                                <TableHead className="text-[9px] font-black uppercase h-8 py-0 text-center">HMU</TableHead>
                                <TableHead className="text-[9px] font-black uppercase h-8 py-0 text-center">Set</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(sheet.cast || []).map((c, idx) => (
                                <TableRow key={idx} className="h-10 hover:bg-slate-50/50 transition-colors">
                                  <TableCell className="py-2">
                                    <div className="flex items-center gap-2">
                                      <div className="text-xs font-bold text-slate-900 leading-tight">{c.name}</div>
                                      {c.isConfirmed && <Badge className="bg-green-600 p-0.5 h-3 w-3 rounded-full flex items-center justify-center"><Check className="w-2 h-2 text-white" /></Badge>}
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-mono leading-none mt-0.5">{c.phone}</div>
                                  </TableCell>
                                  <TableCell className="py-2 text-xs text-slate-600 italic leading-tight">"{c.character}"</TableCell>
                                  <TableCell className="py-2 text-[10px] font-mono font-bold text-center text-blue-600">{c.hairMakeupTime || '-'}</TableCell>
                                  <TableCell className="py-2 text-[10px] font-mono font-bold text-center text-slate-900">{c.onSetTime || '-'}</TableCell>
                                </TableRow>
                              ))}
                              {(!sheet.cast || sheet.cast.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={4} className="h-20 text-center text-[10px] text-slate-400 italic font-mono uppercase tracking-widest">No talent assigned</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Crew Table */}
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-600 flex items-center gap-2 border-b border-orange-100 pb-2">
                          <User className="w-4 h-4" /> Crew Roster
                        </h4>
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm font-mono text-xs">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="text-[10px] font-black uppercase h-8 py-0">Name / Role</TableHead>
                                <TableHead className="text-[10px] font-black uppercase h-8 py-0">Contact</TableHead>
                                <TableHead className="text-[10px] font-black uppercase h-8 py-0 text-right">Call</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(sheet.crew || []).map((c, idx) => (
                                <TableRow key={idx} className="hover:bg-slate-50/50">
                                  <TableCell className="py-2">
                                    <div className="flex items-center gap-2">
                                      <div className="font-bold text-slate-900">{c.name}</div>
                                      {c.isConfirmed && <Badge className="bg-green-600 p-0.5 h-3 w-3 rounded-full flex items-center justify-center"><Check className="w-2 h-2 text-white" /></Badge>}
                                    </div>
                                    <div className="text-[9px] text-slate-500 uppercase tracking-tighter">{c.role}</div>
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-300" /> {c.phone}</div>
                                    <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-300" /> {c.email}</div>
                                  </TableCell>
                                  <TableCell className="py-2 text-right">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded font-black border border-slate-200">{c.callTime || sheet.callTime}</span>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {(!sheet.crew || sheet.crew.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={3} className="h-20 text-center text-[10px] text-slate-400 italic uppercase tracking-widest">No crew listed</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Schedule & Logistical Details */}
                    <div className="space-y-10">
                      {/* Timeline Card */}
                      <div className="bg-white border rounded-xl shadow-sm overflow-hidden border-t-4 border-t-blue-600">
                        <div className="p-4 bg-slate-50 border-b flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Day Timeline</h4>
                        </div>
                        <div className="p-4 space-y-4">
                          {sheet.timeline?.map((item: any, idx: number) => (
                            <div key={idx} className="flex gap-4 group">
                              <span className="font-mono font-black text-blue-600 text-xs shrink-0 w-12">{item.time}</span>
                              <div className="border-l-2 border-slate-100 pl-4 group-last:border-transparent pb-4">
                                <p className="text-xs font-black uppercase tracking-tight text-slate-900 leading-none mb-1">{item.activity}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{item.involved}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Logistical Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 border rounded-xl shadow-sm">
                          <Cloud className="w-4 h-4 text-slate-300 mb-2" />
                          <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Weather</p>
                          <p className="text-xs font-bold text-slate-900 leading-snug">{renderString(sheet.weather, 'TBD')}</p>
                          {sheet.weatherImpact && (
                            <p className="text-[9px] text-amber-600 font-black uppercase mt-1">Impact: {renderString(sheet.weatherImpact)}</p>
                          )}
                        </div>
                        <div className="bg-white p-4 border rounded-xl shadow-sm">
                          <Hospital className="w-4 h-4 text-red-300 mb-2" />
                          <p className="text-[9px] font-black uppercase text-slate-400 mb-1">ER Hospital</p>
                          <p className="text-xs font-bold text-slate-900 leading-snug">{renderString(sheet.nearestHospital, 'TBD')}</p>
                        </div>
                        <div className="bg-white p-4 border rounded-xl shadow-sm col-span-2">
                          <Info className="w-4 h-4 text-slate-300 mb-2" />
                          <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Catering / Crafty</p>
                          <p className="text-xs font-medium text-slate-700 leading-relaxed italic">{renderString(sheet.catering, 'Standard crafty provided.')}</p>
                        </div>
                      </div>

                      {/* Production Notes */}
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> Production Notes
                        </h4>
                        <div className="bg-slate-900 p-6 rounded-2xl text-slate-200 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Sparkles className="w-20 h-20" />
                          </div>
                          <p className="text-sm italic leading-relaxed font-serif tracking-wide relative z-10">
                            {renderString(sheet.notes, 'No specific production notes for this day.')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
     </div>
    </SubscriptionGate>
  );
}
