import React, { useState } from 'react';
import { Contact } from '../../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Search, Users, Mail, Phone, Check, MapPin, DollarSign, Bot, Info, Star } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';

interface PersonnelAssignmentProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (contact: Contact) => void;
  onRequestBid: (contact: Contact) => void;
  contacts: Contact[];
  roleDescription: string;
  category: string;
}

export default function PersonnelAssignment({ 
  isOpen, 
  onOpenChange, 
  onAssign, 
  onRequestBid,
  contacts, 
  roleDescription,
  category
}: PersonnelAssignmentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Clean up role description for better matching
  const targetRole = roleDescription.toLowerCase()
    .replace('desired:', '')
    .replace('suggested:', '')
    .trim();

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.location.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.roles.some(r => r.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const recommendations = filteredContacts.filter(c => 
    c.roles.some(r => 
      r.toLowerCase().includes(targetRole) || 
      targetRole.includes(r.toLowerCase())
    )
  ).sort((a, b) => (b.reliability || 0) - (a.reliability || 0));

  const others = filteredContacts.filter(c => !recommendations.find(r => r.id === c.id));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tighter">Assign Personnel</DialogTitle>
              <DialogDescription className="text-xs font-medium">Matching talent for: <span className="text-blue-600 font-bold uppercase">{roleDescription}</span></DialogDescription>
            </div>
          </div>
          
          <div className="relative group mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <Input 
              placeholder="Search your network by name, role, or location..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-slate-100/50 border-none focus:bg-white transition-all rounded-xl"
            />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-8 py-4">
            {recommendations.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5" /> Recommended Candidates
                  </h4>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] font-bold uppercase py-0 px-2">Top Matches</Badge>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {recommendations.map(contact => (
                    <ContactCard key={contact.id} contact={contact} onAssign={onAssign} onRequestBid={onRequestBid} isRecommended />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {recommendations.length > 0 ? "Other Candidates" : "All Network Contacts"}
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {others.length > 0 ? (
                  others.map(contact => (
                    <ContactCard key={contact.id} contact={contact} onAssign={onAssign} onRequestBid={onRequestBid} />
                  ))
                ) : recommendations.length === 0 && (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">No relevant talent found</p>
                    <p className="text-xs text-slate-400 mt-1">Try expanding your search term</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface ContactCardProps {
  contact: Contact;
  onAssign: (c: Contact) => void;
  onRequestBid: (c: Contact) => void;
  isRecommended?: boolean;
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, onAssign, onRequestBid, isRecommended = false }) => {
  return (
    <div 
      className={cn(
        "group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
        isRecommended ? "bg-blue-50/20 border-blue-100 hover:border-blue-300" : "bg-white border-slate-100 hover:border-slate-300"
      )}
      onClick={() => onAssign(contact)}
    >
      <div className="flex items-center gap-4">
        <Avatar className="w-12 h-12 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
          <AvatarFallback className={cn(
            "font-black text-sm",
            isRecommended ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"
          )}>
            {contact.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h5 className="font-bold text-slate-900">{contact.name}</h5>
            {isRecommended && <Badge className="bg-emerald-500/10 text-emerald-600 border-none h-4 px-1 text-[8px] font-black uppercase tracking-tighter">Match</Badge>}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {contact.roles.slice(0, 2).map(r => (
              <span key={r} className="text-[9px] font-bold text-slate-400 border px-2 py-0.5 rounded-full uppercase tracking-tighter bg-white">{r}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-500">
             <div className="flex items-center gap-1">
               <MapPin className="w-2.5 h-2.5 text-slate-300" />
               {contact.location}
             </div>
             <div className="flex items-center gap-1 text-blue-600">
               <DollarSign className="w-2.5 h-2.5" />
               ${contact.rate}/day
             </div>
             {contact.reliability && (
               <div className="flex items-center gap-1">
                 <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                 {contact.reliability}
               </div>
             )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button 
          variant={isRecommended ? "default" : "secondary"} 
          size="sm" 
          className={cn(
              "rounded-xl font-black uppercase tracking-widest text-[9px] h-8 px-4 transition-all",
              isRecommended ? "bg-blue-600 hover:bg-blue-700" : ""
          )}
          onClick={(e) => {
            e.stopPropagation();
            onAssign(contact);
          }}
        >
          <Check className="w-3.5 h-3.5 mr-1" /> Assign
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-xl font-bold uppercase tracking-widest text-[8px] h-7 px-3 border-slate-200"
          onClick={(e) => {
            e.stopPropagation();
            onRequestBid(contact);
          }}
        >
          <Mail className="w-3 h-3 mr-1" /> Request Quote
        </Button>
      </div>
    </div>
  );
}
