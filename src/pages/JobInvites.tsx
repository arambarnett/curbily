import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { MessageSquare, Clock, DollarSign, Send, CheckCircle2, User, MapPin, Briefcase, Eye, ThumbsUp, XCircle } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthProvider';
import { OutreachThread, Project, Contact } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';

export default function JobInvites() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<OutreachThread[]>([]);
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<OutreachThread | null>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [isBidDialogOpen, setIsBidDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'outreachThreads'),
      where('contactId', '==', user.uid)
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const threadData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutreachThread));
      setThreads(threadData);

      // Fetch projects for these threads
      const projectIds = Array.from(new Set(threadData.map(t => t.projectId)));
      projectIds.forEach(pid => {
        if (!projects[pid]) {
          const unsubProject = onSnapshot(doc(db, 'projects', pid), (docSnap) => {
            if (docSnap.exists()) {
              setProjects(prev => ({ ...prev, [pid]: { id: docSnap.id, ...docSnap.data() } as Project }));
            }
          });
        }
      });
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'outreachThreads');
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleOpenBid = (thread: OutreachThread) => {
    setSelectedThread(thread);
    setBidAmount(thread.requestedRate?.toString() || '');
    setIsBidDialogOpen(true);
  };

  const handleSubmitBid = async () => {
    if (!selectedThread || !bidAmount) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'outreachThreads', selectedThread.id), {
        status: 'bid_received',
        requestedRate: parseFloat(bidAmount),
        updatedAt: serverTimestamp()
      });
      toast.success('Bid submitted successfully!');
      setIsBidDialogOpen(false);
    } catch (error) {
      console.error('Failed to submit bid:', error);
      toast.error('Failed to submit bid.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (thread: OutreachThread) => {
    try {
      await updateDoc(doc(db, 'outreachThreads', thread.id), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });
      toast.success('Project invitation accepted!');
    } catch (error) {
       console.error('Failed to accept:', error);
       toast.error('Failed to accept invitation.');
    }
  };

  const handleDecline = async (thread: OutreachThread) => {
    if (!confirm('Are you sure you want to decline this inquiry?')) return;
    try {
      await updateDoc(doc(db, 'outreachThreads', thread.id), {
        status: 'declined',
        updatedAt: serverTimestamp()
      });
      toast.success('Inquiry declined.');
    } catch (error) {
      console.error('Failed to decline:', error);
      toast.error('Failed to decline.');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading job opportunities...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Job Opportunities</h1>
        <p className="text-slate-500">View and respond to production inquiries from our network.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-2 border-[#0a0a0a] shadow-xl overflow-hidden">
          <CardHeader className="bg-white border-b">
            <CardTitle className="uppercase tracking-tight flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" /> Active Inquiries
            </CardTitle>
            <CardDescription>Direct messages and job offers from producers.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <Clock className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center">
                  No active inquiries at the moment.
                </p>
                <p className="text-xs text-slate-500 mt-2 text-center max-w-xs">
                  When a producer finds your profile in our network, you'll receive a notification here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {threads.map(thread => {
                  const project = projects[thread.projectId];
                  return (
                    <div key={thread.id} className="p-6 hover:bg-slate-50/80 transition-colors">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={cn(
                              "font-black uppercase tracking-widest text-[9px]",
                              thread.status === 'awaiting_bid' ? "bg-amber-100 text-amber-700" :
                              thread.status === 'bid_received' ? "bg-blue-100 text-blue-700" :
                              thread.status === 'confirmed' ? "bg-green-100 text-green-700" :
                              "bg-slate-100 text-slate-700"
                            )}>
                              {thread.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {thread.role}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold uppercase tracking-tight">
                            {project?.title || 'Loading project...'}
                          </h3>
                          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              {project?.location || 'TBD'}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5" />
                              {project?.contentType || 'Project'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 self-end md:self-center">
                          {['delivered', 'draft', 'awaiting_bid'].includes(thread.status) && (
                            <Button 
                              onClick={() => handleAccept(thread)}
                              className="bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-widest text-[10px] gap-2 px-6"
                            >
                              <ThumbsUp className="w-4 h-4" /> Accept Invite
                            </Button>
                          )}
                          {thread.status === 'awaiting_bid' && (
                            <Button 
                              variant="outline"
                              onClick={() => handleOpenBid(thread)}
                              className="font-bold uppercase tracking-widest text-[10px] gap-2 px-6"
                            >
                              <DollarSign className="w-4 h-4" /> Place Bid
                            </Button>
                          )}
                          {thread.status === 'bid_received' && (
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Bid</span>
                              <span className="text-lg font-black">${thread.requestedRate}/day</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-[10px] uppercase font-bold h-7 underline"
                                onClick={() => handleOpenBid(thread)}
                              >
                                Edit Bid
                              </Button>
                            </div>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="font-bold uppercase tracking-widest text-[9px] gap-1"
                            onClick={() => setSelectedThread(thread)}
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Messages
                          </Button>
                          {thread.status !== 'accepted' && thread.status !== 'declined' && (
                             <Button 
                               variant="ghost" 
                               size="sm"
                               className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold uppercase tracking-widest text-[9px]"
                               onClick={() => handleDecline(thread)}
                             >
                               <XCircle className="w-3.5 h-3.5" />
                             </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={selectedThread !== null && !isBidDialogOpen} onOpenChange={(open) => !open && setSelectedThread(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Communication Thread</DialogTitle>
            <DialogDescription>Project: {projects[selectedThread?.projectId || '']?.title}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-6 py-6 pr-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Original Inquiry</p>
               <p className="text-sm text-slate-700 leading-relaxed italic">"{selectedThread?.draftEmail}"</p>
            </div>

            <div className="space-y-4">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center border-b pb-2">Message History</p>
               <div className="space-y-3">
                  <div className="flex justify-end">
                     <div className="bg-blue-600 text-white rounded-2xl p-3 max-w-[80%] shadow-lg">
                        <p className="text-sm font-medium">Hello! I'm interested in the {selectedThread?.role} position. Could you share more about the shoot dates?</p>
                        <span className="text-[9px] opacity-70 block mt-1">Sent 2 hours ago</span>
                     </div>
                  </div>
                  <div className="flex justify-start">
                     <div className="bg-slate-100 text-slate-800 rounded-2xl p-3 max-w-[80%] shadow-sm">
                        <p className="text-sm font-medium">Sure! We are looking at the week of May 12th. Does that work for you?</p>
                        <span className="text-[9px] text-slate-400 block mt-1">Producer • Just now</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
          <div className="pt-4 border-t flex gap-3">
             <Input placeholder="Type your message..." className="flex-1 h-12 bg-slate-50 rounded-xl" />
             <Button className="h-12 w-12 bg-slate-900 text-white" size="icon">
                <Send className="w-5 h-5" />
             </Button>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
             {['delivered', 'draft', 'awaiting_bid'].includes(selectedThread?.status || '') && (
               <Button className="bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-widest text-xs flex-1" onClick={() => handleAccept(selectedThread!)}>
                  Accept Project Invite
               </Button>
             )}
             <Button variant="outline" onClick={() => setSelectedThread(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBidDialogOpen} onOpenChange={setIsBidDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Submit Your Quote</DialogTitle>
            <DialogDescription> Enter your desired day rate for this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="text-sm font-bold text-blue-900 italic">"The producer has requested a formal bid for the {selectedThread?.role} role on '{projects[selectedThread?.projectId || '']?.title}'."</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Day Rate (USD)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  className="pl-10 h-14 text-xl font-black"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsBidDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button 
              onClick={handleSubmitBid} 
              disabled={isSubmitting || !bidAmount}
              className="bg-[#0a0a0a] text-white font-bold uppercase tracking-widest gap-2 flex-1"
            >
              {isSubmitting ? 'Submitting...' : <><Send className="w-4 h-4" /> Submit Bid</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
