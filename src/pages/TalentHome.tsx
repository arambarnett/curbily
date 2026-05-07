import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthProvider';
import { OutreachThread, Contact } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { 
  MapPin, 
  Star, 
  Clock,
  Settings,
  UserPlus,
  FileText,
  Calendar as CalendarIcon,
  Globe,
  Mail,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  X as CloseIcon,
  LogOut,
  CreditCard,
  DollarSign,
  Briefcase,
  User,
  Linkedin,
  Instagram,
  Twitter,
  ExternalLink
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { cn, compressImage } from '../lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '../components/ui/dialog';
import { Input } from '../components/ui/input';

export default function CrewHome() {
  const { user, profile, updateProfile, logout } = useAuth();
  const [invites, setInvites] = useState<OutreachThread[]>([]);
  const [myContact, setMyContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  
  // Advanced Calendar State
  const [viewDate, setViewDate] = useState(new Date());
  const [availability, setAvailability] = useState<Record<string, { off: boolean, slots: string[] }>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState('09:00');
  
  const navigate = useNavigate();

  const getDayKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const isHoliday = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday...

    // Static holidays
    const staticHolidays: Record<string, string> = {
      '01-01': "New Year's Day",
      '06-19': 'Juneteenth',
      '07-04': 'Independence Day',
      '11-11': 'Veterans Day',
      '12-25': 'Christmas Day',
      '12-31': "New Year's Eve",
    };

    const key = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (staticHolidays[key]) return staticHolidays[key];

    // Dynamic holidays
    // MLK: 3rd Monday in Jan
    if (month === 1 && dayOfWeek === 1 && day >= 15 && day <= 21) return 'MLK Day';
    
    // Presidents Day: 3rd Monday in Feb
    if (month === 2 && dayOfWeek === 1 && day >= 15 && day <= 21) return "Presidents' Day";
    
    // Memorial Day: Last Monday in May
    if (month === 5 && dayOfWeek === 1 && day > 24) return 'Memorial Day';
    
    // Labor Day: 1st Monday in Sep
    if (month === 9 && dayOfWeek === 1 && day <= 7) return 'Labor Day';
    
    // Columbus/Indigenous Peoples' Day: 2nd Monday in Oct
    if (month === 10 && dayOfWeek === 1 && day >= 8 && day <= 14) return 'Indigenous Peoples Day';
    
    // Thanksgiving: 4th Thursday in Nov
    if (month === 11 && dayOfWeek === 4 && day >= 22 && day <= 28) return 'Thanksgiving';

    return null;
  };

  // Load and persist availability
  useEffect(() => {
    if (myContact?.availability) {
      setAvailability(myContact.availability as any);
    }
  }, [myContact]);

  const saveAvailability = async (newAvailability: typeof availability) => {
    if (!user) return;
    try {
      const contactRef = doc(db, 'contacts', user.uid);
      await updateDoc(contactRef, {
        availability: newAvailability,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save changes');
    }
  };

  const toggleDay = async (date: Date) => {
    const key = getDayKey(date);
    const weekend = isWeekend(date);
    const holiday = isHoliday(date);
    const currentStatus = availability[key];
    
    // Determine if it is currently perceived as blocked
    const isCurrentlyBlocked = currentStatus?.off || (weekend && currentStatus?.off !== false) || !!holiday;
    
    const updated = {
      ...availability,
      [key]: {
        ...availability[key],
        off: !isCurrentlyBlocked // If blocked, explicitly set available (off: false). If available, set blocked (off: true).
      }
    };
    setAvailability(updated);
    await saveAvailability(updated);
  };

  const addTimeSlot = async () => {
    if (!selectedDate || !newSlot) return;
    const updated = {
      ...availability,
      [selectedDate]: {
        ...availability[selectedDate],
        slots: [...(availability[selectedDate]?.slots || []), newSlot].sort()
      }
    };
    setAvailability(updated);
    setNewSlot('09:00');
    await saveAvailability(updated);
  };

  const removeTimeSlot = async (slot: string) => {
    if (!selectedDate) return;
    const updated = {
      ...availability,
      [selectedDate]: {
        ...availability[selectedDate],
        slots: (availability[selectedDate]?.slots || []).filter(s => s !== slot)
      }
    };
    setAvailability(updated);
    await saveAvailability(updated);
  };

  const escapeCalendarText = (value: string) =>
    value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

  const downloadAvailabilityCalendar = () => {
    const entries = Object.entries(availability) as [string, { off: boolean; slots: string[] }][];
    if (entries.length === 0) {
      toast.info('Block dates or add availability slots before exporting your calendar.');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const name = profile?.displayName || myContact?.name || user?.email || 'Curbily Crew';
    const events = entries.flatMap(([date, value]) => {
      const dateKey = date.replace(/-/g, '');
      const eventsForDay: string[] = [];

      if (value.off) {
        const end = new Date(`${date}T00:00:00`);
        end.setDate(end.getDate() + 1);
        eventsForDay.push([
          'BEGIN:VEVENT',
          `UID:curbily-blocked-${date}-${user?.uid || 'crew'}@curbily`,
          `DTSTAMP:${timestamp}`,
          `DTSTART;VALUE=DATE:${dateKey}`,
          `DTEND;VALUE=DATE:${getDayKey(end).replace(/-/g, '')}`,
          'SUMMARY:Curbily - Unavailable',
          'TRANSP:OPAQUE',
          'END:VEVENT',
        ].join('\r\n'));
      }

      (value.slots || []).forEach((slot) => {
        const start = new Date(`${date}T${slot}:00`);
        const end = new Date(start);
        end.setHours(end.getHours() + 1);
        const formatDateTime = (eventDate: Date) =>
          eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        eventsForDay.push([
          'BEGIN:VEVENT',
          `UID:curbily-available-${date}-${slot}-${user?.uid || 'crew'}@curbily`,
          `DTSTAMP:${timestamp}`,
          `DTSTART:${formatDateTime(start)}`,
          `DTEND:${formatDateTime(end)}`,
          'SUMMARY:Curbily - Available Window',
          'TRANSP:TRANSPARENT',
          'END:VEVENT',
        ].join('\r\n'));
      });

      return eventsForDay;
    });

    const calendar = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Curbily//Crew Availability//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeCalendarText(`${name} Availability`)}`,
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'curbily-availability.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Calendar file downloaded. Import it into your external calendar.');
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUpdatingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const compressed = await compressImage(base64String);
          await updateDoc(doc(db, 'users', user.uid), { photoURL: compressed });
          if (myContact?.id) {
            await updateDoc(doc(db, 'contacts', myContact.id), { headshotUrl: compressed });
          }
          await updateProfile({ photoURL: compressed });
          toast.success("Profile photo updated");
        } catch (err) {
          console.error("Upload failed:", err);
          toast.error("Failed to upload image. Try a smaller file.");
        } finally {
          setUpdatingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error updating photo:', error);
      setUpdatingPhoto(false);
    }
  };

  const handleAcceptInvite = async (invite: OutreachThread) => {
    try {
      const inviteRef = doc(db, 'outreachThreads', invite.id);
      await updateDoc(inviteRef, { 
        status: 'accepted',
        updatedAt: new Date()
      });
      toast.success('Invitation accepted!');
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast.error('Failed to accept invitation');
    }
  };

  useEffect(() => {
    if (!user) return;
    const contactQ = query(collection(db, 'contacts'), where('uid', '==', user.uid));
    const unsubscribeContact = onSnapshot(contactQ, (snapshot) => {
      if (!snapshot.empty) {
        const contactData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Contact;
        setMyContact(contactData);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, `contacts`));

    const invitesQ = query(collection(db, 'outreachThreads'), where('contactId', '==', user.uid));
    const unsubscribeInvites = onSnapshot(invitesQ, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutreachThread));
      setInvites(fetched);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'outreachThreads'));

    return () => {
        unsubscribeContact();
        unsubscribeInvites();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Clock className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* High-Level Header / Stats Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-black text-white border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Crew Account</Badge>
          </div>
          <h1 className="text-6xl md:text-[80px] font-black tracking-tighter text-black uppercase leading-[0.85]">
            Welcome <br />
            <span className="text-slate-200">{profile?.displayName?.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] max-w-md">
            Manage your talent profile, availability, and active job inquiries.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex flex-col items-end mr-4">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profile Strength</span>
             <div className="w-40 h-2 bg-slate-100 rounded-full mt-2 overflow-hidden border border-slate-200">
                <div className="w-[85%] h-full bg-black" />
             </div>
          </div>
          <Button variant="outline" className="rounded-2xl border-[3px] border-black h-14 px-8 font-black uppercase tracking-widest text-[10px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all" onClick={() => navigate('/edit-profile')}>
            <Settings className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-8">
        <div className="sticky top-0 z-30 bg-[#f5f5f4]/80 backdrop-blur-md py-4 border-b border-slate-200 -mx-4 px-4 md:-mx-8 md:px-8">
          <TabsList className="bg-slate-100 p-1 rounded-2xl border-2 border-[#0a0a0a] w-full md:w-auto h-14 md:h-12 shadow-[4px_4px_0_0_#0a0a0a]">
            <TabsTrigger value="dashboard" className="rounded-xl data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-white font-black uppercase tracking-widest text-[10px] flex-1 md:px-6">
              <Briefcase className="w-3.5 h-3.5 mr-2 hidden md:inline" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="availability" className="rounded-xl data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-white font-black uppercase tracking-widest text-[10px] flex-1 md:px-6">
              <CalendarIcon className="w-3.5 h-3.5 mr-2 hidden md:inline" />
              Availability
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-xl data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-white font-black uppercase tracking-widest text-[10px] flex-1 md:px-6">
              <User className="w-3.5 h-3.5 mr-2 hidden md:inline" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-xl data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-white font-black uppercase tracking-widest text-[10px] flex-1 md:px-6">
              <DollarSign className="w-3.5 h-3.5 mr-2 hidden md:inline" />
              Payments
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="space-y-8 mt-0 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-[2.5rem] overflow-hidden bg-white col-span-1 md:col-span-2">
              <CardHeader className="pb-4 bg-slate-50 border-b-2 border-black">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-black" /> Recent Job Inquiries
                  </span>
                  <Badge className="bg-black text-white border-none font-black px-3 py-1 rounded-full">{invites.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {invites.length === 0 ? (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Inbox is empty</p>
                    </div>
                  ) : (
                    invites.slice(0, 4).map(invite => (
                      <div key={invite.id} className="group p-4 bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-300 rounded-2xl transition-all cursor-pointer shadow-sm hover:shadow-md" onClick={() => navigate('/invites')}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-black text-sm uppercase tracking-tight">{invite.draftEmail || 'Untitled Inquiry'}</p>
                            <p className="text-[10px] font-bold text-blue-600 uppercase mt-1 px-2 py-0.5 bg-blue-50 rounded-full inline-block">{invite.role}</p>
                            <div className="mt-3 flex items-center gap-2">
                               <Badge variant="outline" className="text-[8px] font-black uppercase">{invite.status}</Badge>
                               <span className="text-[9px] text-slate-400 font-bold">{new Date(invite.createdAt as any).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {invites.length > 4 && (
                  <Button variant="ghost" className="w-full mt-4 text-[10px] font-black uppercase tracking-widest text-[#0a0a0a] h-12 rounded-xl bg-slate-50 hover:bg-slate-100" onClick={() => navigate('/invites')}>
                     View All Inquiries
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-[#0a0a0a] shadow-xl rounded-[32px] overflow-hidden bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" /> Active Productions
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                 <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center mb-4 border border-orange-100">
                    <FileText className="w-8 h-8 text-orange-200" />
                 </div>
                 <p className="text-[11px] font-black uppercase text-slate-900 tracking-widest mb-1">No call sheets active</p>
                 <p className="text-[9px] font-bold text-slate-400 uppercase max-w-[180px]">Your current projects' call sheets and schedules will appear here.</p>
                 <Button variant="outline" className="text-[9px] font-black uppercase tracking-widest mt-6 h-9 px-6 rounded-xl border-2 hover:bg-slate-50">Browse History</Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="border-2 border-blue-600 bg-blue-600 text-white shadow-xl rounded-[32px] overflow-hidden">
               <CardContent className="p-8 space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                        <UserPlus className="w-6 h-6 text-white" />
                     </div>
                     <div>
                        <h3 className="text-lg font-black uppercase tracking-tighter">Grow the Network</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Refer and Earn Tokens</p>
                     </div>
                  </div>
                  <p className="text-xs font-medium leading-relaxed opacity-90">
                    Know a DP, Gaffer, or Editor who belongs here? Invite them to Curbily. You'll both earn network credits upon their first verification.
                  </p>
                  <Button 
                    className="w-full bg-white text-blue-600 hover:bg-blue-50 font-black uppercase tracking-widest text-[10px] h-12 rounded-2xl shadow-xl transition-all active:scale-95 mt-2"
                    onClick={() => {
                      const link = `${window.location.origin}/join?ref=${user?.uid}`;
                      navigator.clipboard.writeText(link);
                      toast.success("Invite link active!");
                    }}
                  >
                     Copy Referral Code
                  </Button>
               </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="availability" className="mt-0 outline-none">
          <Card className="border-2 border-[#0a0a0a] shadow-2xl rounded-[40px] overflow-hidden bg-white">
            <div className="p-2 px-6 bg-[#0a0a0a] text-white flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Real-Time Calendar Console</span>
               <div className="flex gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[8px] font-black uppercase opacity-60">Global Sync On</span>
                  </div>
               </div>
            </div>
            <CardContent className="p-0">
               <div className="flex flex-col xl:flex-row">
                  <div className="flex-1 p-6 md:p-10">
                    {/* Compact Calendar Header */}
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-6">
                        <h3 className="font-black uppercase text-3xl md:text-4xl tracking-tighter">
                          {viewDate.toLocaleString('default', { month: 'long' })} <span className="text-slate-200">'{viewDate.getFullYear().toString().slice(2)}</span>
                        </h3>
                        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-9 w-9 rounded-lg hover:bg-white shadow-sm">
                            <ChevronLeft className="w-5 h-5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9 rounded-lg hover:bg-white shadow-sm">
                            <ChevronRight className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                      <div className="hidden md:flex items-center gap-4">
                        <div className="text-right">
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Month Status</p>
                           <p className="text-xs font-black uppercase">{Object.values(availability).filter((a: any) => a.off).length} Dates Blocked</p>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[9px] h-10 px-6 rounded-xl shadow-xl shadow-blue-200"
                          onClick={() => toast.info("Syncing with Global Database...")}
                        >
                          Quick Sync
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-slate-200 border-2 border-slate-200 rounded-[32px] overflow-hidden shadow-inner">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                        <div key={i} className="bg-slate-50 py-4 text-[9px] font-black text-slate-500 text-center uppercase tracking-widest border-b-2 border-slate-200 hidden md:block">{day}</div>
                      ))}
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                         <div key={`mob-${i}`} className="bg-slate-50 py-3 text-[9px] font-black text-slate-500 text-center uppercase tracking-widest border-b-2 border-slate-200 md:hidden">{day}</div>
                      ))}
                      {(() => {
                        const days = [];
                        const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
                        const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
                        const today = new Date();
                        
                        for (let i = 0; i < firstDayOfMonth; i++) {
                          days.push(<div key={`pad-${i}`} className="bg-slate-100/20 h-20 md:h-32" />);
                        }
                        
                        for (let i = 1; i <= daysInMonth; i++) {
                          const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), i);
                          const key = getDayKey(date);
                          const isToday = date.toDateString() === today.toDateString();
                          const weekend = isWeekend(date);
                          const holidayName = isHoliday(date);
                          const dayStatus = availability[key];
                          
                          const isManuallyAvailable = dayStatus?.off === false;
                          const isManuallyBlocked = dayStatus?.off === true;
                          const isAutoBlocked = (weekend && !isManuallyAvailable) || (!!holidayName && !isManuallyAvailable);
                          const blocked = isManuallyBlocked || isAutoBlocked;
                          
                          days.push(
                            <React.Fragment key={i}>
                              <Dialog>
                                <DialogTrigger 
                                  onClick={() => setSelectedDate(key)}
                                  className={cn(
                                    "h-20 md:h-32 xl:h-40 bg-white text-xs font-black transition-all relative group text-left p-3 hover:bg-slate-50",
                                    isAutoBlocked && !isManuallyAvailable ? "bg-slate-100/50" : "bg-white",
                                    isToday && "bg-blue-50/50 ring-2 ring-inset ring-blue-600 z-10"
                                  )}
                                >
                                  <div className="flex justify-between items-start">
                                    <span className={cn(
                                      "w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-xs font-bold",
                                      isToday ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-400 group-hover:text-slate-900 border border-transparent group-hover:border-slate-200"
                                    )}>
                                      {i}
                                    </span>
                                    {blocked && (
                                       <div className="flex flex-col items-end gap-1">
                                          <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                          <span className="text-[7px] font-black text-red-600 uppercase hidden md:inline">OFF</span>
                                       </div>
                                    )}
                                    {!blocked && holidayName && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                                  </div>
                                  <div className="mt-2 space-y-1">
                                     {holidayName && (
                                       <p className="text-[7px] font-black uppercase text-amber-600 truncate leading-none bg-amber-50 px-1 py-0.5 rounded md:hidden">H</p>
                                     )}
                                     {holidayName && (
                                       <p className="text-[8px] font-black uppercase text-amber-600 truncate leading-none bg-amber-50 px-1.5 py-1 rounded hidden md:block">
                                          {holidayName}
                                       </p>
                                     )}
                                     {dayStatus?.slots?.length > 0 && (
                                       <div className="flex flex-wrap gap-1 mt-2">
                                          {dayStatus.slots.slice(0, 2).map((_, idx) => (
                                            <div key={idx} className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                                          ))}
                                          {dayStatus.slots.length > 2 && <span className="text-[8px] text-blue-400">+</span>}
                                       </div>
                                     )}
                                  </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-md rounded-[40px] border-4 border-[#0a0a0a] shadow-2xl p-8">
                                  <DialogHeader>
                                    <DialogTitle className="text-3xl font-black uppercase tracking-tighter mb-4">
                                      {date.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-8 pt-4">
                                    <div className="flex flex-col gap-4 p-6 bg-slate-50 rounded-3xl border-2 border-slate-100">
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Network Visibility</p>
                                        <p className={cn("font-black text-xl uppercase italic", blocked ? "text-red-600" : "text-green-600")}>
                                          {blocked ? 'Currently Blocked' : 'Open for Hire'}
                                        </p>
                                      </div>
                                      <Button 
                                        variant={blocked ? "default" : "outline"}
                                        className={cn(
                                          "font-black uppercase tracking-widest text-xs h-14 w-full rounded-2xl shadow-xl transition-all active:scale-95",
                                          blocked ? "bg-red-600 hover:bg-red-700 text-white" : "border-3 border-[#0a0a0a]"
                                        )}
                                        onClick={() => toggleDay(date)}
                                      >
                                        {blocked ? 'Set as Available' : 'Restrict Availability'}
                                      </Button>
                                    </div>
                                    {!blocked && (
                                      <div className="space-y-6">
                                         <div className="space-y-2">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custom Shift Hours</h4>
                                            <div className="flex gap-3">
                                               <Input type="time" value={newSlot} onChange={(e) => setNewSlot(e.target.value)} className="h-14 rounded-2xl border-2 border-slate-200 text-lg font-black focus:border-[#0a0a0a] transition-all" />
                                               <Button onClick={addTimeSlot} className="bg-[#0a0a0a] text-white rounded-2xl px-6 h-14 shadow-xl hover:bg-slate-800 transition-all"><PlusCircle className="w-6 h-6" /></Button>
                                            </div>
                                         </div>
                                         <div className="flex flex-wrap gap-2">
                                            {(dayStatus?.slots || []).length === 0 && <p className="text-[10px] font-bold text-slate-400 uppercase italic">Full day availability is active</p>}
                                            {(dayStatus?.slots || []).map(slot => (
                                              <Badge key={slot} className="bg-white border-2 border-slate-200 text-slate-900 h-10 pl-4 pr-2 gap-3 rounded-xl font-black text-xs shadow-sm">
                                                {slot}
                                                <button onClick={() => removeTimeSlot(slot)} className="text-slate-300 hover:text-red-500 transition-colors"><CloseIcon className="w-4 h-4" /></button>
                                              </Badge>
                                            ))}
                                         </div>
                                      </div>
                                    )}
                                  </div>
                                  <DialogFooter className="mt-10">
                                    <DialogClose asChild><Button className="w-full h-14 bg-[#0a0a0a] text-white font-black uppercase tracking-widest rounded-2xl shadow-2xl hover:bg-slate-800 transition-all">Save Records</Button></DialogClose>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </React.Fragment>
                          );
                        }
                        return days;
                      })()}
                    </div>
                  </div>

                  {/* Calendar Sidebar (Internal) */}
                  <div className="w-full xl:w-80 bg-slate-50 border-t xl:border-t-0 xl:border-l border-slate-200 p-10 space-y-10">
                    <div className="space-y-6">
                       <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-2">Legend</h4>
                       <div className="space-y-4">
                          {[
                            { color: 'bg-blue-600', label: 'Today (Live)' },
                            { color: 'bg-white border-slate-300', label: 'Standard Open' },
                            { color: 'bg-red-400', label: 'Manually Blocked' },
                            { color: 'bg-amber-400', label: 'Federal Holiday' }
                          ].map(item => (
                            <div key={item.label} className="flex items-center gap-4">
                               <div className={cn("w-5 h-5 rounded-lg shadow-sm", item.color)} />
                               <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">{item.label}</span>
                            </div>
                          ))}
                       </div>
                    </div>

                    <Card className="bg-[#0a0a0a] text-white border-0 rounded-[32px] overflow-hidden shadow-2xl">
                       <CardContent className="p-6 space-y-4">
                          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                             <Globe className="w-5 h-5 text-blue-400" />
                          </div>
                          <h4 className="text-sm font-black uppercase tracking-tighter">Global Calendar Integration</h4>
                          <p className="text-[10px] font-medium opacity-60 leading-relaxed">Export blocked dates and available windows into Apple Calendar, Google Calendar, or Outlook.</p>
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl text-[10px] font-black uppercase tracking-widest" onClick={downloadAvailabilityCalendar}>Sync External Calendar</Button>
                       </CardContent>
                    </Card>

                    <div className="pt-6 border-t border-slate-200">
                       <Button variant="outline" className="w-full border-2 border-[#0a0a0a] h-12 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-[4px_4px_0_0_#0a0a0a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all" onClick={() => toast.info("Generating professional schedule PDF...")}>
                          <FileText className="w-4 h-4 mr-2" /> Export Availability
                       </Button>
                    </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-0 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Seller Sidebar - Marketplace Style */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-[2.5rem] overflow-hidden bg-white">
                <CardContent className="p-8 pt-10 text-center space-y-6">
                  <div className="relative inline-block group mb-8">
                    <Avatar className="w-40 h-40 border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,120,255,1)] mx-auto rounded-[3rem]">
                      <AvatarImage src={profile?.photoURL || myContact?.headshotUrl} />
                      <AvatarFallback className="bg-black text-white font-black text-5xl">{profile?.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-2 right-2 w-8 h-8 bg-black border-4 border-white rounded-full shadow-lg flex items-center justify-center">
                       <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-[0.9]">{profile?.displayName}</h2>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center justify-center gap-2">
                      <MapPin className="w-3 h-3" /> {myContact?.location || 'Global Member'}
                    </p>
                  </div>

                  <div className="mt-8">
                     <Button className="w-full rounded-2xl h-12 bg-[#0a0a0a] text-white font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-slate-800 transition-all active:scale-95" onClick={() => navigate('/edit-profile')}>
                        Update Professional Resume
                     </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-[2rem] overflow-hidden bg-white">
                <CardContent className="p-8 space-y-4">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-black">Mastered Skills</h3>
                   <div className="flex flex-wrap gap-2">
                      {myContact?.roles?.map(role => (
                        <Badge key={role} className="bg-slate-50 text-black border-2 border-black text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">
                           {role}
                        </Badge>
                      ))}
                   </div>
                </CardContent>
              </Card>
            </div>

            {/* Seller Main Content */}
            <div className="lg:col-span-8 space-y-8">
              <Card className="border-[3px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-[3rem] bg-white overflow-hidden">
                <CardContent className="p-10 md:p-16 space-y-16">
                   <section className="space-y-6">
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-black border-b-2 border-black inline-block pb-2">Mission Statement</h3>
                      <p className="text-3xl font-black text-black leading-[1.1] tracking-tighter italic pr-6">
                         "{myContact?.bio || "No professional narrative deployed. Update your profile to stand out to producers."}"
                      </p>
                   </section>

                   <section className="space-y-6">
                      <h3 className="text-sm font-black uppercase tracking-widest text-[#0a0a0a]">Professional Presence</h3>
                      <div className="flex flex-wrap gap-4">
                         {myContact?.portfolioUrl && (
                           <a href={myContact.portfolioUrl.startsWith('http') ? myContact.portfolioUrl : `https://${myContact.portfolioUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
                              <Globe className="w-3.5 h-3.5" /> Portfolio
                           </a>
                         )}
                         {myContact?.imdbUrl && (
                           <a href={myContact.imdbUrl.startsWith('http') ? myContact.imdbUrl : `https://${myContact.imdbUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#dba506] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                              <ExternalLink className="w-3.5 h-3.5" /> IMDb
                           </a>
                         )}
                         {myContact?.linkedinUrl && (
                           <a href={myContact.linkedinUrl.startsWith('http') ? myContact.linkedinUrl : `https://${myContact.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#0077b5] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                              <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                           </a>
                         )}
                         {myContact?.instagramUrl && (
                           <a href={`https://instagram.com/${myContact.instagramUrl.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                              <Instagram className="w-3.5 h-3.5" /> Instagram
                           </a>
                         )}
                         {myContact?.twitterUrl && (
                           <a href={`https://twitter.com/${myContact.twitterUrl.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                              <Twitter className="w-3.5 h-3.5" /> Twitter / X
                           </a>
                         )}
                         {myContact?.professionalLinks?.filter(l => l.label && l.url).map((link, idx) => (
                            <a key={idx} href={link.url.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                               <ExternalLink className="w-3.5 h-3.5" /> {link.label}
                            </a>
                         ))}
                         {!(myContact?.portfolioUrl || myContact?.imdbUrl || myContact?.linkedinUrl || myContact?.instagramUrl || myContact?.twitterUrl || (myContact?.professionalLinks && myContact.professionalLinks.length > 0)) && (
                            <p className="text-[10px] font-bold text-slate-400 uppercase italic">No professional links added yet.</p>
                         )}
                      </div>
                   </section>

                   <section className="space-y-6">
                      <div className="flex items-center justify-between border-b-2 border-[#0a0a0a] pb-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-[#0a0a0a]">Hire Details</h3>
                        <Badge className="bg-green-100 text-green-700 border-none font-black text-[9px] px-3">Available for Hire</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Base Day Rate</p>
                            <p className="text-3xl font-black">${(myContact as any)?.rateRaw || 0}<span className="text-xs text-slate-300 ml-1">/DAY</span></p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Union Affiliation</p>
                            <p className="text-base font-black uppercase">{(myContact as any)?.union || 'Non-Union'}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Travel Radius</p>
                            <p className="text-base font-black uppercase">{myContact?.canTravel || 'Local'}</p>
                         </div>
                      </div>
                   </section>

                   <section className="space-y-6">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                        <Badge variant="outline" className="border-blue-100 text-blue-600 bg-blue-50 text-[8px] font-black uppercase">Professional Verification</Badge>
                      </h3>
                      <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] text-center">
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Client endorsements will appear here after your first production.</p>
                      </div>
                   </section>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-0 outline-none">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                 <Card className="border-2 border-slate-200 shadow-xl rounded-[40px] overflow-hidden bg-white grayscale">
                    <CardHeader className="p-8 border-b border-slate-100">
                       <div className="flex items-center justify-between mb-4">
                          <CardTitle className="text-3xl font-black uppercase tracking-tighter">Financial Ledger</CardTitle>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-600 border-none font-black text-[10px] uppercase px-4 py-1 animate-pulse">Coming Soon</Badge>
                       </div>
                       <CardDescription className="text-md font-medium text-slate-400">Automated invoicing, daily payment tracking, and production settlements.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                       <div className="p-16 flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                          <div className="w-24 h-24 bg-slate-100 rounded-[40px] flex items-center justify-center">
                             <CreditCard className="w-12 h-12 text-slate-300" />
                          </div>
                          <div className="space-y-2">
                             <h4 className="text-xl font-black uppercase tracking-widest">No Transactions Found</h4>
                             <p className="text-sm text-slate-400 max-w-sm font-medium">Integration with Stripe Connect and autonomous invoicing is currently in closed beta.</p>
                          </div>
                       </div>
                    </CardContent>
                 </Card>
              </div>

              <div className="space-y-6">
                 <Card className="border-2 border-[#0a0a0a] shadow-xl rounded-[32px] overflow-hidden bg-white p-8 space-y-6">
                    <div className="space-y-1">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Career Earnings</span>
                       <p className="text-4xl font-black text-[#0a0a0a] tabular-nums">$0.00</p>
                    </div>
                    <div className="space-y-1 pt-4 border-t border-slate-100">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Owed to Curbily (Fees)</span>
                       <p className="text-xl font-black text-slate-300">$0.00</p>
                    </div>
                    <div className="pt-4">
                       <Button disabled className="w-full h-14 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs">Request Payout</Button>
                    </div>
                 </Card>
                 
                 <div className="p-8 bg-blue-50 rounded-[32px] border-2 border-blue-100 space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Next Step: Verification</h5>
                    <p className="text-[11px] font-bold text-blue-800 leading-relaxed italic">"Get paid within 24 hours of wrap with autonomous settlements. Enable your banking credentials to start."</p>
                    <Button variant="link" className="p-0 h-auto text-xs font-black uppercase text-blue-600" onClick={() => toast.info("Financial onboarding starting soon.")}>Learn about Curbily Pay</Button>
                 </div>
              </div>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
