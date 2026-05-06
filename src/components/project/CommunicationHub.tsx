import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { OutreachThread, OutreachMessage, Contact, Project } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { MessageSquare, Send, Bot, User, Loader2, CheckCircle2, XCircle, Clock, Sparkles, Zap } from 'lucide-react';
import { processResponse } from '../../lib/gemini';
import { cn } from '../../lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';

export default function CommunicationHub({ projectId, project }: { projectId: string, project: Project }) {
  const [threads, setThreads] = useState<OutreachThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [contacts, setContacts] = useState<Record<string, Contact>>({});
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const qThreads = query(collection(db, 'projects', projectId, 'outreach'), orderBy('updatedAt', 'desc'));
    const unsubThreads = onSnapshot(qThreads, (snapshot) => {
      setThreads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutreachThread)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/outreach`);
    });

    const unsubContacts = onSnapshot(collection(db, 'contacts'), (snapshot) => {
      const contactMap: Record<string, Contact> = {};
      snapshot.docs.forEach(doc => {
        contactMap[doc.id] = { id: doc.id, ...doc.data() } as Contact;
      });
      setContacts(contactMap);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contacts');
    });

    return () => {
        unsubThreads();
        unsubContacts();
      };
  }, [projectId]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }

    const qMessages = query(
      collection(db, 'projects', projectId, 'outreach', selectedThreadId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutreachMessage)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/outreach/${selectedThreadId}/messages`);
    });

    return unsubMessages;
  }, [projectId, selectedThreadId]);

  const selectedThread = threads.find(t => t.id === selectedThreadId);
  const selectedContact = selectedThread ? contacts[selectedThread.contactId] : null;

  const handleSendMessage = async (role: 'sender' | 'receiver' = 'sender', contentOverride?: string) => {
    if (!selectedThreadId || (!replyText && !contentOverride)) return;

    const content = contentOverride || replyText;
    setIsProcessing(true);

    try {
      // Add message
      await addDoc(collection(db, 'projects', projectId, 'outreach', selectedThreadId, 'messages'), {
        threadId: selectedThreadId,
        role,
        content,
        createdAt: serverTimestamp()
      });

      // Update thread
      await updateDoc(doc(db, 'projects', projectId, 'outreach', selectedThreadId), {
        lastMessage: content,
        updatedAt: serverTimestamp(),
        status: role === 'sender' ? 'sent' : 'negotiating'
      });

      if (role === 'receiver') {
        // AI Analysis of the response
        const analysis = await processResponse(content, selectedThread);
        
        await updateDoc(doc(db, 'projects', projectId, 'outreach', selectedThreadId), {
          status: analysis.status,
          aiSummary: analysis.summary,
          nextStep: analysis.nextStep,
          commitments: analysis.commitments || '',
          requestedRate: analysis.requestedRate || null
        });

        // Add system notification
        if (analysis.requestedRate) {
          await addDoc(collection(db, `projects/${projectId}/messages`), {
            projectId,
            sender: 'system',
            text: `${selectedThread.contactName} has submitted a bid of $${analysis.requestedRate}/day.`,
            timestamp: serverTimestamp()
          });
        }

        // Add system notification
        await addDoc(collection(db, `projects/${projectId}/notifications`), {
          projectId,
          type: 'response',
          title: `Response from ${selectedContact?.name}`,
          message: analysis.summary,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }

      setReplyText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateResponse = () => {
    const responses = [
      "I'm interested! What's the daily rate? I'm available on those dates.",
      "Thanks for reaching out. Unfortunately, I'm booked on another project during those dates.",
      "Sounds like a great project. I can do it for $800/day. Let me know if that works.",
      "I'd love to join the crew. Can you send over the script or a treatment?",
      "Yes, I'm in. Send me the contract and I'll get it signed today."
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    handleSendMessage('receiver', randomResponse);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-green-600">Confirmed</Badge>;
      case 'declined': return <Badge variant="destructive">Declined</Badge>;
      case 'negotiating': return <Badge className="bg-amber-500">Negotiating</Badge>;
      case 'sent': return <Badge variant="secondary">Sent</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const runAutomation = async () => {
    setIsProcessing(true);
    try {
      const sentThreads = threads.filter(t => t.status === 'sent');
      for (const thread of sentThreads) {
        const responses = [
          "I'm interested! What's the daily rate?",
          "I'm available. Send me more details.",
          "Can we negotiate the rate?",
          "I'm booked, sorry!"
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        // Add message
        await addDoc(collection(db, 'projects', projectId, 'outreach', thread.id, 'messages'), {
          threadId: thread.id,
          role: 'receiver',
          content: randomResponse,
          createdAt: serverTimestamp()
        });

        // AI Analysis
        const analysis = await processResponse(randomResponse, thread);
        
        await updateDoc(doc(db, 'projects', projectId, 'outreach', thread.id), {
          status: analysis.status,
          aiSummary: analysis.summary,
          nextStep: analysis.nextStep,
          lastMessage: randomResponse,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Automation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div>Loading communication hub...</div>;

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-6">
      {/* Thread List */}
      <div className="w-80 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Outreach Threads</CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={runAutomation}
              disabled={isProcessing || threads.filter(t => t.status === 'sent').length === 0}
              title="Run AI Outreach Automation"
            >
              <Zap className="w-4 h-4" />
            </Button>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="divide-y divide-slate-50">
              {threads.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm italic">
                  No outreach started yet.
                </div>
              ) : (
                threads.map((thread) => {
                  const contact = contacts[thread.contactId];
                  return (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={cn(
                        "w-full text-left p-4 hover:bg-slate-50 transition-colors flex flex-col gap-1",
                        selectedThreadId === thread.id ? "bg-blue-50/50 border-r-2 border-blue-600" : ""
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{contact?.name || 'Unknown'}</span>
                        <span className="text-[10px] text-slate-400">{thread.role}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{thread.lastMessage || 'No messages yet'}</p>
                      <div className="mt-1">{getStatusBadge(thread.status)}</div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col gap-4">
        {selectedThreadId ? (
          <>
            <Card className="flex-1 flex flex-col border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 py-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-slate-100 text-slate-900 font-bold">
                      {selectedContact?.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base font-bold">{selectedContact?.name}</CardTitle>
                    <CardDescription className="text-xs">{selectedThread?.role} • {selectedContact?.email}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={simulateResponse} disabled={isProcessing} className="gap-2 text-[10px] uppercase font-bold">
                    <Bot className="w-3 h-3" />
                    Simulate Response
                  </Button>
                </div>
              </CardHeader>
              
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                      <p className="text-sm text-slate-400">Start the conversation by sending the first outreach.</p>
                      {selectedThread?.draftEmail && (
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => handleSendMessage('sender', selectedThread.draftEmail)}
                        >
                          Send AI Draft Outreach
                        </Button>
                      )}
                    </div>
                  )}
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex gap-3 max-w-[80%]",
                        msg.role === 'sender' ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className={cn(
                          "text-[10px] font-bold",
                          msg.role === 'sender' ? "bg-slate-900 text-white" : "bg-blue-100 text-blue-700"
                        )}>
                          {msg.role === 'sender' ? 'ME' : selectedContact?.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "p-3 rounded-2xl text-sm",
                        msg.role === 'sender' ? "bg-slate-900 text-white rounded-tr-none" : "bg-slate-100 text-slate-900 rounded-tl-none"
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8 animate-pulse">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px] font-bold">AI</AvatarFallback>
                      </Avatar>
                      <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 bg-white border-t border-slate-100">
                <div className="flex gap-2">
                  <Textarea 
                    placeholder="Type a reply..." 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[80px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    className="h-auto px-6 bg-slate-900 hover:bg-slate-800"
                    onClick={() => handleSendMessage()}
                    disabled={!replyText || isProcessing}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {selectedThread?.aiSummary && (
              <Card className="bg-blue-50 border-blue-100 shadow-none">
                <CardContent className="p-4 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-blue-900 uppercase tracking-widest">AI Analysis</p>
                    <p className="text-sm text-blue-800">{selectedThread.aiSummary}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge className="bg-blue-600 text-[10px]">Next Step: {selectedThread.nextStep}</Badge>
                      {selectedThread.requestedRate && (
                        <Badge className="bg-amber-600 text-[10px]">Talent Bid: ${selectedThread.requestedRate}</Badge>
                      )}
                      {selectedThread.commitments && (
                        <span className="text-[10px] text-blue-600 font-medium italic">Commitments: {selectedThread.commitments}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-200">
            <MessageSquare className="w-16 h-16 text-slate-100 mb-4" />
            <p className="text-slate-400 font-medium">Select a thread to view the conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
