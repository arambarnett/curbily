import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, getDocs, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { ChatMessage, Project, Scene } from '../../types';
import { useAuth } from '../../lib/AuthProvider';
import { producer } from '../../lib/gemini';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Send, Bot, User, Loader2, MessageSquare, Minimize2, AlertCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export default function ProjectChat({ projectId, currentTab, onHide, onRunAgent }: { 
  projectId: string, 
  currentTab: string, 
  onHide?: () => void,
  onRunAgent?: (agent: string, payload?: any) => Promise<void> | void
}) {
  const { user, profile, updateProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingActions, setProcessingActions] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if user has tokens
  const hasTokens = (profile?.tokens ?? 0) > 0 || (profile?.isSubscribed);

  useEffect(() => {
    const q = query(
      collection(db, `projects/${projectId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/messages`);
    });

    return unsubscribe;
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleClearChat = async () => {
    if (!window.confirm('Are you sure you want to clear the chat history for this project?')) return;
    
    try {
      const q = query(collection(db, `projects/${projectId}/messages`));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    
    if (!hasTokens) {
      alert("You have run out of Production Assistant tokens. Please upgrade your plan or wait for your daily reset.");
      return;
    }

    const userMessage = input;
    setInput('');
    setLoading(true);

    try {
      // Add user message to Firestore
      await addDoc(collection(db, `projects/${projectId}/messages`), {
        role: 'user',
        content: userMessage,
        createdAt: serverTimestamp(),
        tabContext: currentTab
      });

      // Fetch context
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      const scenesSnapshot = await getDocs(collection(db, 'projects', projectId, 'scenes'));
      const budgetSnapshot = await getDocs(collection(db, 'projects', projectId, 'budget'));
      const scheduleSnapshot = await getDocs(collection(db, 'projects', projectId, 'schedule'));
      const venuesSnapshot = await getDocs(collection(db, 'projects', projectId, 'venues'));
      const gearSnapshot = await getDocs(collection(db, 'projects', projectId, 'gear'));
      const propsSnapshot = await getDocs(collection(db, 'projects', projectId, 'props'));
      const wardrobeSnapshot = await getDocs(collection(db, 'projects', projectId, 'wardrobe'));

      const context = {
        project: projectDoc.data(),
        scenes: scenesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
        budget: budgetSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
        schedule: scheduleSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
        sourcing: {
          venues: venuesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
          gear: gearSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
          props: propsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
          wardrobe: wardrobeSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
        },
        currentTab
      };

      // Get AI response using the Producer Orchestrator
      const producerResponse = await producer(userMessage, context);

      // Decrement tokens
      if (!profile?.isSubscribed) {
        await updateProfile({ tokens: Math.max(0, (profile?.tokens || 0) - 1) });
      }

      let content = producerResponse.result || "I've processed your request.";
      let pendingActions = producerResponse.suggestedActions || [];

      if (producerResponse.status === 'ok') {
        // Add AI response to Firestore with pending data actions
        await addDoc(collection(db, `projects/${projectId}/messages`), {
          role: 'assistant',
          content: content,
          createdAt: serverTimestamp(),
          tabContext: currentTab,
          invokedSubagents: producerResponse.invokedSubagents || [],
          pendingActions: pendingActions
        });
      } else {
        content = "I encountered an error: " + (producerResponse.errors?.join(', ') || 'Unknown error');
        await addDoc(collection(db, `projects/${projectId}/messages`), {
          role: 'assistant',
          content: content,
          createdAt: serverTimestamp(),
          tabContext: currentTab
        });
      }
    } catch (error) {
      console.error('Error in chat:', error);
      await addDoc(collection(db, `projects/${projectId}/messages`), {
        role: 'assistant',
        content: "I'm sorry, I encountered an error while processing your request.",
        createdAt: serverTimestamp(),
        tabContext: currentTab
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAction = async (messageId: string, action: any, idx: number) => {
    const actionKey = `${messageId}-${idx}`;
    setProcessingActions(prev => ({ ...prev, [actionKey]: true }));
    
    try {
      console.log('Executing action:', action.type, action.payload);
      
      if (action.type.startsWith('run')) {
        if (onRunAgent) {
          await onRunAgent(action.type, action.payload);
        }
      } else {
        switch (action.type) {
          case 'updateProject': {
          const payload = { ...action.payload };
          if (typeof payload.targetBudget === 'string') {
            payload.targetBudget = Number(payload.targetBudget.replace(/[^0-9.-]+/g, ""));
          }
          await updateDoc(doc(db, 'projects', projectId), payload);
          break;
        }
        case 'addScene':
          await addDoc(collection(db, 'projects', projectId, 'scenes'), {
            ...action.payload,
            projectId,
            createdAt: serverTimestamp()
          });
          break;
        case 'updateScene':
          if (action.payload.id) {
            const { id, ...data } = action.payload;
            await updateDoc(doc(db, 'projects', projectId, 'scenes', id), data);
          }
          break;
        case 'addBudgetItem': {
          let payload = { ...action.payload };
          const rate = Number(payload.rate);
          const qty = Number(payload.quantity);
          if (!isNaN(rate) && !isNaN(qty)) {
            payload.rate = rate;
            payload.quantity = qty;
            payload.amount = rate * qty;
          }
          await addDoc(collection(db, 'projects', projectId, 'budget'), {
            ...payload,
            projectId,
            createdAt: serverTimestamp()
          });
          break;
        }
        case 'updateBudgetItem': {
          if (action.payload.id) {
            const { id, ...data } = action.payload;
            const rate = data.rate !== undefined ? Number(data.rate) : undefined;
            const qty = data.quantity !== undefined ? Number(data.quantity) : undefined;
            
            if (rate !== undefined && !isNaN(rate)) data.rate = rate;
            if (qty !== undefined && !isNaN(qty)) data.quantity = qty;

            // If we have both (either from payload or existing, though here we only have payload)
            // To be safe, if the transition provides enough info, recalculate
            if (data.rate !== undefined && data.quantity !== undefined) {
              data.amount = data.rate * data.quantity;
            }
            
            await updateDoc(doc(db, 'projects', projectId, 'budget', id), data);
          }
          break;
        }
        case 'deleteScene':
          if (action.payload.id) {
            await deleteDoc(doc(db, 'projects', projectId, 'scenes', action.payload.id));
          }
          break;
        case 'deleteBudgetItem':
          if (action.payload.id) {
            await deleteDoc(doc(db, 'projects', projectId, 'budget', action.payload.id));
          }
          break;
        case 'updateSchedule':
          if (action.payload.id) {
            const { id, ...data } = action.payload;
            await updateDoc(doc(db, 'projects', projectId, 'schedule', id), data);
          }
          break;
        case 'addContact':
          await addDoc(collection(db, 'contacts'), {
            ...action.payload,
            createdAt: serverTimestamp()
          });
          break;
        case 'updateContact':
          if (action.payload.id) {
            const { id, ...data } = action.payload;
            await updateDoc(doc(db, 'contacts', id), data);
          }
          break;
        case 'updateVenue':
        case 'updateGear':
        case 'updateProp':
        case 'updateWardrobe': {
          const collectionBase = action.type.toLowerCase().replace('update', '');
          const coll = collectionBase === 'wardrobe' ? 'wardrobe' : (collectionBase === 'gear' ? 'gear' : (collectionBase + 's'));
          if (action.payload.id) {
            const { id, ...data } = action.payload;
            await updateDoc(doc(db, `projects/${projectId}/${coll}`, id), data);
          }
          break;
        }
        case 'addVenue':
        case 'addGear':
        case 'addProp':
        case 'addWardrobe': {
          const collectionBase = action.type.toLowerCase().replace('add', '');
          const coll = collectionBase === 'wardrobe' ? 'wardrobe' : (collectionBase === 'gear' ? 'gear' : (collectionBase + 's'));
          await addDoc(collection(db, `projects/${projectId}/${coll}`), {
            ...action.payload,
            projectId,
            createdAt: serverTimestamp()
          });
          break;
        }
      }
    }

    // Mark the action as approved in the message
      const msg = messages.find(m => m.id === messageId);
      if (msg && msg.pendingActions) {
        const updatedActions = [...msg.pendingActions];
        updatedActions[idx] = { ...updatedActions[idx], approved: true };
        await updateDoc(doc(db, `projects/${projectId}/messages`, messageId), {
          pendingActions: updatedActions,
          actionsPerformed: [...((msg as any).actionsPerformed || []), action.type]
        });
      }
    } catch (err) {
      console.error('Failed to execute approved action:', err);
      alert('Failed to execute action. Check console for details.');
    } finally {
      const actionKey = `${messageId}-${idx}`;
      setProcessingActions(prev => {
        const next = { ...prev };
        delete next[actionKey];
        return next;
      });
    }
  };

  const handleDismissAction = async (messageId: string, idx: number) => {
    const msg = messages.find(m => m.id === messageId);
    if (msg && msg.pendingActions) {
      const updatedActions = [...msg.pendingActions];
      updatedActions[idx] = { ...updatedActions[idx], dismissed: true };
      await updateDoc(doc(db, `projects/${projectId}/messages`, messageId), {
        pendingActions: updatedActions
      });
    }
  };

  return (
    <Card className="flex flex-col h-full border-slate-200 rounded-none border-0 shadow-none">
      <CardHeader className="py-3 border-b bg-slate-50/50 shrink-0">
        <CardTitle className="text-sm font-bold flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-600" />
            Production Assistant
            <span className="text-[10px] font-normal px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded uppercase">
              {currentTab}
            </span>
          </div>
          {onHide && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={handleClearChat} title="Clear Chat">
                <Trash2 className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onHide}>
                <Minimize2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" ref={scrollRef as any}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 px-4">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bot className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-sm mb-1">How can I help with production?</h3>
                <p className="text-xs text-slate-500">
                  I can orchestrate breakdown, scheduling, budgeting, and sourcing.
                </p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-blue-100 text-blue-700'
                }`}>
                  {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? 'bg-slate-900 text-white rounded-tr-none' 
                    : 'bg-slate-100 text-slate-900 rounded-tl-none'
                }`}>
                  {m.content}
                  {(m as any).invokedSubagents?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(m as any).invokedSubagents.map((agent: string, idx: number) => (
                        <span key={`${agent}-${idx}`} className="text-[9px] bg-white/50 px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 uppercase font-bold">
                          {agent}
                        </span>
                      ))}
                    </div>
                  )}
                  {(m as any).actionsPerformed?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(m as any).actionsPerformed.map((action: string, idx: number) => (
                        <span key={`${action}-${idx}`} className="text-[9px] bg-green-100/50 px-1.5 py-0.5 rounded border border-green-200 text-green-700 uppercase font-bold">
                          DONE: {action}
                        </span>
                      ))}
                    </div>
                  )}
                  {(m as any).pendingActions?.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Suggested Changes:</p>
                        {(m as any).pendingActions.filter((a: any) => !a.approved && !a.dismissed).length > 1 && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="h-4 p-0 text-[10px] text-blue-600 font-bold uppercase"
                            disabled={Object.keys(processingActions).some(k => k.startsWith(m.id!))}
                            onClick={async () => {
                              const pending = (m as any).pendingActions;
                              for (let i = 0; i < pending.length; i++) {
                                if (!pending[i].approved && !pending[i].dismissed) {
                                  await handleApproveAction(m.id!, pending[i], i);
                                }
                              }
                            }}
                          >
                            Approve All
                          </Button>
                        )}
                      </div>
                      {(m as any).pendingActions.map((action: any, idx: number) => {
                        if (action.approved || action.dismissed) return null;
                        return (
                          <div key={`${action.type}-${idx}`} className="bg-white/80 border border-slate-200 rounded-xl p-2 flex flex-col gap-2">
                             <div className="flex items-center justify-between">
                             <div className="flex flex-col gap-1">
                               <span className="text-[10px] font-black text-blue-600 uppercase italic">
                                 {action?.type?.replace(/([A-Z])/g, ' $1').trim() || 'Action'}
                               </span>
                               {action.reason && (
                                 <p className="text-[9px] text-slate-400 font-medium leading-tight">
                                   {action.reason}
                                 </p>
                               )}
                               {action.type.startsWith('run') && (
                                 <div className="flex items-start gap-1 p-1.5 bg-amber-50 rounded border border-amber-100 mt-1">
                                   <AlertCircle className="w-3 h-3 text-amber-600 mt-0.5" />
                                   <p className="text-[9px] text-amber-700 font-medium leading-snug">
                                     Running agents may overwrite existing data (like your budget). You can revert changes using the versions button in the relevant tab.
                                   </p>
                                 </div>
                               )}
                               {action.payload && (
                                 <div className="text-[9px] bg-slate-50 p-1.5 rounded-lg border border-slate-100 flex flex-col gap-0.5">
                                   {action.payload.description && <p className="font-bold text-slate-700">Item: {action.payload.description}</p>}
                                   {action.payload.rate !== undefined && (
                                     <p className="text-slate-500">
                                       ${action.payload.rate.toLocaleString()} x {action.payload.quantity || 1} {action.payload.unit || 'unit'} 
                                       <span className="font-bold text-blue-600 ml-1">
                                         = ${((Number(action.payload.rate) || 0) * (Number(action.payload.quantity) || 1)).toLocaleString()}
                                       </span>
                                     </p>
                                   )}
                                 </div>
                               )}
                             </div>
                               <div className="flex gap-1">
                                 <Button 
                                   size="sm" 
                                   variant="ghost" 
                                   className="h-6 px-2 text-[9px] font-bold uppercase text-slate-400 hover:text-red-500"
                                   onClick={() => handleDismissAction(m.id!, idx)}
                                 >
                                   Dismiss
                                 </Button>
                                 <Button 
                                   size="sm" 
                                   className="h-6 px-3 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase rounded-lg shadow-sm"
                                   onClick={() => handleApproveAction(m.id!, action, idx)}
                                   disabled={processingActions[`${m.id}-${idx}`]}
                                 >
                                   {processingActions[`${m.id}-${idx}`] ? (
                                     <>
                                       <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />
                                       Running...
                                     </>
                                   ) : 'Approve'}
                                 </Button>
                               </div>
                             </div>
                             <div className="text-[10px] text-slate-600 font-medium bg-slate-50/50 p-1.5 rounded-lg border border-slate-100 italic">
                               {action.type.includes('BudgetItem') ? (
                                 <span>{action.payload.description || action.payload.category}: ${action.payload.amount || (action.payload.rate * action.payload.quantity) || '...'}</span>
                               ) : (
                                 <span>{JSON.stringify(action.payload).substring(0, 50)}...</span>
                               )}
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-xs text-slate-500">Producer is thinking...</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="text-[10px] text-center text-slate-400 py-2 border-t bg-slate-50 px-4 leading-tight shrink-0">
          <strong>Tip:</strong> You can ask the AI to "Rerun the budget" or "Change the target budget to 50k".
        </div>
        <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex gap-2 shrink-0">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the Executive Producer..."
            className="bg-slate-50 border-slate-200 rounded-xl"
            disabled={loading}
          />
          <Button type="submit" size="icon" className="rounded-xl bg-slate-900" disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
