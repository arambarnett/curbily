import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, orderBy, limit, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { AppNotification } from '../../types';
import { Bell, CheckCircle2, ShoppingCart, ThumbsUp, MessageSquare, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

export default function NotificationCenter({ projectId }: { projectId: string }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, `projects/${projectId}/notifications`),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      setNotifications(fetched);
      setUnreadCount(fetched.filter(n => !n.isRead).length);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/notifications`);
    });

    return unsubscribe;
  }, [projectId]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, `projects/${projectId}/notifications`, id), {
        isRead: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/notifications/${id}`);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        const ref = doc(db, `projects/${projectId}/notifications`, n.id);
        batch.update(ref, { isRead: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/notifications`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking': return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case 'approval': return <ThumbsUp className="w-4 h-4 text-green-500" />;
      case 'response': return <MessageSquare className="w-4 h-4 text-purple-500" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger render={
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-red-500 text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </Button>
      } />
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm">Notifications</h3>
            {unreadCount > 0 && <Badge variant="secondary" className="text-[10px]">{unreadCount} New</Badge>}
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[10px] h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No notifications yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${!n.isRead ? 'bg-blue-50/30' : ''}`}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                >
                  <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.isRead ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {n.createdAt?.toDate ? (
                        <>
                          {n.createdAt.toDate().toLocaleDateString() !== new Date().toLocaleDateString() && (
                            <span className="mr-1">{n.createdAt.toDate().toLocaleDateString()}</span>
                          )}
                          {n.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </>
                      ) : 'Just now'}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
