import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { OutreachThread, Contact, Project } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Mail, Send, CheckCircle2, Clock, UserPlus, MessageSquare, Bot, Loader2, Phone, MessageCircle, Check, DollarSign } from 'lucide-react';
import { outreach, processResponse } from '../../lib/gemini';
import { useVapiCall } from '../../lib/hooks/useVapiCall';
import { VapiCallButton } from './VapiCallButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import SubscriptionGate from '../SubscriptionGate';
import { toast } from 'sonner';

export default function Outreach({ projectId, project }: { projectId: string, project: Project }) {
  const { initiateCall, isCalling } = useVapiCall(projectId, project.title, project.location);

  const [threads, setThreads] = useState<OutreachThread[]>([]);
  const [contacts, setContacts] = useState<Record<string, Contact>>({});
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<OutreachThread | null>(null);
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [isPortOpen, setIsPortOpen] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isBulkSending, setIsBulkSending] = useState(false);

  useEffect(() => {
    const threadsQ = query(
      collection(db, 'outreachThreads'), 
      where('projectId', '==', projectId),
      where('ownerId', '==', project.ownerId)
    );
    const contactsQ = query(collection(db, 'contacts'));

    const unsubThreads = onSnapshot(threadsQ, (snapshot) => {
      setThreads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutreachThread)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'outreachThreads');
    });

    const unsubContacts = onSnapshot(contactsQ, (snapshot) => {
      const contactMap: Record<string, Contact> = {};
      snapshot.docs.forEach(doc => {
        contactMap[doc.id] = { id: doc.id, ...doc.data() } as Contact;
      });
      setContacts(contactMap);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contacts');
    });

    return () => {
        unsubThreads();
        unsubContacts();
      };
  }, [projectId]);

  const handleSendOutreach = async (thread: OutreachThread) => {
    await updateDoc(doc(db, 'outreachThreads', thread.id), {
      status: 'sent',
      updatedAt: new Date()
    });
    setIsDraftOpen(false);
  };

  const handleHire = async (thread: OutreachThread) => {
    if (!confirm('Are you sure you want to hire this person?')) return;
    try {
      await updateDoc(doc(db, 'outreachThreads', thread.id), {
        status: 'confirmed',
        updatedAt: new Date()
      });

      if (thread.budgetItemId) {
        const contact = contacts[thread.contactId];
        await updateDoc(doc(db, `projects/${projectId}/budget`, thread.budgetItemId), {
          personName: contact?.name || 'Unknown',
          personId: contact?.id || '',
          actualRate: thread.requestedRate || contact?.rate || 0,
          status: 'contracted'
        });

        // Trigger payment lifecycle
        await updateDoc(doc(db, 'projects', projectId), {
          paymentStatus: 'active',
          updatedAt: new Date()
        });
      }
      
      toast.success('Talent hired and budget updated!');
    } catch (error) {
      console.error('Hire failed:', error);
      toast.error('Failed to hire talent.');
    }
  };

  const handleBulkSend = async () => {
    const drafts = threads.filter(t => t.status === 'draft');
    if (drafts.length === 0) return;
    setIsBulkSending(true);
    try {
      const promises = drafts.map(thread => 
        updateDoc(doc(db, 'outreachThreads', thread.id), {
          status: 'sent',
          updatedAt: new Date()
        })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Bulk send failed:', error);
    } finally {
      setIsBulkSending(false);
    }
  };

  const handlePortContact = async (contact: Contact) => {
    if (threads.some(t => t.contactId === contact.id)) {
      alert('Outreach already started for this contact.');
      return;
    }
    try {
      const role = contact.roles[0] || 'Crew';
      const draft = await outreach(contact, role, project);
      
      await addDoc(collection(db, 'outreachThreads'), {
        projectId,
        contactId: contact.id,
        ownerId: project.ownerId || '',
        role,
        status: 'draft',
        draftEmail: draft.body,
        subject: draft.subject,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setIsPortOpen(false);
    } catch (error) {
      console.error('Port contact failed:', error);
    }
  };

  const handleSimulateResponse = async (thread: OutreachThread) => {
    setProcessing(thread.id);
    try {
      const simulatedMessages = [
        "I'm interested! I'm available for those dates. What's the rate?",
        "Sorry, I'm booked on another project during those dates.",
        "Sounds great, let's chat further. I'm available.",
        "I can do it, but I'll need a kit fee for my gear."
      ];
      const randomMessage = simulatedMessages[Math.floor(Math.random() * simulatedMessages.length)];
      
      // Process with AI
      const result = await processResponse(randomMessage, thread);
      
      await updateDoc(doc(db, 'outreachThreads', thread.id), {
        status: result.status === 'bidding' ? 'bid_received' : result.status,
        lastMessage: randomMessage,
        aiSummary: result.summary,
        nextStep: result.nextStep,
        requestedRate: result.requestedRate || null,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error simulating response:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleText = (phone: string) => {
    window.location.href = `sms:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  if (loading) return <div className="p-8 text-center">Loading outreach...</div>;

  return (
    <SubscriptionGate 
      featureName="Outreach & Execution"
    >
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="w-6 h-6" />
          Personnel Outreach
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setIsPortOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            Port Contacts
          </Button>
          {threads.some(t => t.status === 'draft') && (
            <Button 
              onClick={handleBulkSend} 
              disabled={isBulkSending}
              className="bg-slate-900 text-white font-bold gap-2"
            >
              {isBulkSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send All Drafts ({threads.filter(t => t.status === 'draft').length})
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isPortOpen} onOpenChange={setIsPortOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Port Contacts to Project</DialogTitle>
            <DialogDescription>Select a contact from your global network to start outreach.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2 py-4">
              {(Object.values(contacts) as Contact[]).map(contact => (
                <div 
                  key={contact.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => handlePortContact(contact)}
                >
                  <div>
                    <p className="text-sm font-bold">{contact.name}</p>
                    <p className="text-[10px] text-slate-500">{contact.roles.join(', ')}</p>
                  </div>
                  <Button size="sm" variant="ghost">Select</Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {threads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                  No outreach threads started. Go to "Crew Match" to find and contact crew.
                </TableCell>
              </TableRow>
            ) : (
              threads.map((thread) => {
                const contact = contacts[thread.contactId];
                return (
                  <TableRow key={thread.id} className="data-table-row">
                    <TableCell>
                      <div className="font-medium">{contact?.name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{contact?.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{thread.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {thread.status === 'awaiting_bid' && <Clock className="w-3 h-3 text-amber-500" />}
                          {thread.status === 'bid_received' && <DollarSign className="w-3 h-3 text-emerald-500" />}
                          {thread.status === 'draft' && <Clock className="w-3 h-3 text-amber-500" />}
                          {thread.status === 'sent' && <Send className="w-3 h-3 text-blue-500" />}
                          {thread.status === 'negotiating' && <MessageSquare className="w-3 h-3 text-purple-500" />}
                          {thread.status === 'confirmed' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                          <span className="capitalize text-sm">{thread.status}</span>
                        </div>
                        {thread.aiSummary && (
                          <div className="text-[10px] text-slate-500 flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <Bot className="w-2 h-2" />
                              {thread.aiSummary}
                            </div>
                            {thread.requestedRate && (
                              <div className="text-amber-600 font-bold">Talent Bid: ${thread.requestedRate}/day</div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {contact?.phone && (
                          <>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleCall(contact.phone)}
                              title="Call"
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => handleText(contact.phone)}
                              title="Text"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <VapiCallButton 
                              phoneNumber={contact.phone}
                              isCalling={isCalling === contact.name}
                              onCall={() => initiateCall(contact.phone!, contact.name, `crew member (${thread.role})`)}
                            />
                          </>
                        )}
                        {contact?.email && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => handleEmail(contact.email)}
                            title="Email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                        {thread.status === 'bid_received' && (
                          <Button 
                            className="bg-emerald-600 text-white h-8 text-xs gap-1"
                            size="sm"
                            onClick={() => handleHire(thread)}
                          >
                            <Check className="w-3 h-3" /> Hire
                          </Button>
                        )}
                        {thread.status === 'sent' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs gap-1"
                            onClick={() => handleSimulateResponse(thread)}
                            disabled={processing === thread.id}
                          >
                            {processing === thread.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                            Simulate Response
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedThread(thread);
                            setIsDraftOpen(true);
                          }}
                        >
                          {thread.status === 'draft' ? 'Review Draft' : 'View Thread'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDraftOpen} onOpenChange={setIsDraftOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Outreach Thread</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">To</label>
                <div className="p-2 bg-slate-50 rounded border text-sm">
                  {selectedThread && contacts[selectedThread.contactId]?.name}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Role</label>
                <div className="p-2 bg-slate-50 rounded border text-sm">
                  {selectedThread?.role}
                </div>
              </div>
            </div>

            {selectedThread?.lastMessage && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Last Message from Crew</label>
                <div className="p-3 bg-blue-50 text-blue-900 rounded-lg border border-blue-100 text-sm italic">
                  "{selectedThread.lastMessage}"
                </div>
              </div>
            )}

            {selectedThread?.nextStep && (
              <div className="p-3 bg-amber-50 text-amber-900 rounded-lg border border-amber-100 text-sm flex gap-2">
                <Bot className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">AI Suggestion:</span> {selectedThread.nextStep}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400">
                {selectedThread?.status === 'draft' ? 'Draft Email' : 'Thread History'}
              </label>
              <Textarea 
                className="min-h-[200px] font-sans text-sm leading-relaxed"
                value={selectedThread?.draftEmail || ''}
                onChange={(e) => {
                  if (selectedThread) {
                    setSelectedThread({ ...selectedThread, draftEmail: e.target.value });
                  }
                }}
                readOnly={selectedThread?.status !== 'draft'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDraftOpen(false)}>Close</Button>
            {selectedThread?.status === 'draft' && (
              <Button onClick={() => handleSendOutreach(selectedThread)} className="gap-2">
                <Send className="w-4 h-4" />
                Send Outreach
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </SubscriptionGate>
  );
}
