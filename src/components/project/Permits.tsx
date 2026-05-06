import React, { useEffect, useState } from 'react';
import { FileCheck, AlertCircle, Clock, CheckCircle2, XCircle, MapPin, Bot, Mail, Info, Bell, PhoneCall, Globe, MessageSquare, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { useVapiCall } from '../../lib/hooks/useVapiCall';
import { VapiCallButton } from './VapiCallButton';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Project, Location, PermitContact } from '../../types';
import { doc, updateDoc, collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthProvider';
import { serverTimestamp } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import SubscriptionGate from '../SubscriptionGate';

export default function Permits({ project }: { project: Project }) {
  const { initiateCall, isCalling } = useVapiCall(project.id, project.title, project.location);
  const { profile } = useAuth();
  const [venues, setVenues] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, `projects/${project.id}/venues`), (snap) => {
      setVenues(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [project.id]);

  const locationsWithPermits = project.locations?.filter(loc => loc.requiresPermit) || [];
  const locationsNeedingPermits = project.locations?.filter(loc => !loc.isBase && !loc.requiresPermit) || [];
  const venuesWithPermits = venues.filter(v => v.requiresPermit);

  const totalPermitsNeeded = locationsWithPermits.filter(l => l.permitStatus === 'needed').length + venuesWithPermits.filter(v => v.permitStatus === 'needed').length;
  const totalApplied = locationsWithPermits.filter(l => l.permitStatus === 'applied').length + venuesWithPermits.filter(v => v.permitStatus === 'applied').length;
  const totalApproved = locationsWithPermits.filter(l => l.permitStatus === 'approved').length + venuesWithPermits.filter(v => v.permitStatus === 'approved').length;

  const updatePermitStatus = async (locationId: string, status: Location['permitStatus'], isVenue = false) => {
    if (isVenue) {
      try {
        await updateDoc(doc(db, `projects/${project.id}/venues`, locationId), {
          permitStatus: status
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `projects/${project.id}/venues/${locationId}`);
      }
      return;
    }
    
    const updatedLocations = project.locations?.map(loc => 
      loc.id === locationId ? { ...loc, permitStatus: status, requiresPermit: true } : loc
    );

    try {
      await updateDoc(doc(db, 'projects', project.id), {
        locations: updatedLocations
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${project.id}`);
    }
  };

  const flagForPermit = async (locationId: string) => {
    const updatedLocations = project.locations?.map(loc => 
      loc.id === locationId ? { ...loc, requiresPermit: true, permitStatus: 'needed' as const } : loc
    );

    try {
      await updateDoc(doc(db, 'projects', project.id), {
        locations: updatedLocations
      });

      // Add notification
      await addDoc(collection(db, `projects/${project.id}/notifications`), {
        projectId: project.id,
        type: 'approval',
        title: 'New Permit Flagged',
        message: `A permit requirement has been flagged for: ${project.locations?.find(l => l.id === locationId)?.name}`,
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${project.id}`);
    }
  };

  const handleEmailContact = (contact: PermitContact) => {
    if (!contact.email) return;
    
    const subject = encodeURIComponent(`Filming Permit Inquiry: ${project.title}`);
    const userEmail = profile?.email || '';
    const body = encodeURIComponent(
      `Hi ${contact.entity} team,\n\n` +
      `I am reaching out regarding a filming permit for my production "${project.title}" in ${contact.location}.\n\n` +
      `Could you please let me know the mandatory requirements for this location?\n\n` +
      `Best regards,\n${profile?.displayName || 'Production Team'}`
    );
    
    // Construct mailto with CC to user
    const mailtoLink = `mailto:${contact.email}?cc=${userEmail}&subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  };

  return (
    <SubscriptionGate 
      featureName="Permits & Law Compliance"
    >
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileCheck className="w-6 h-6" />
          Permits & Law Compliance
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 animate-pulse border-blue-200 text-blue-700 bg-blue-50">
            <Info className="w-3 h-3" />
            Sourcing Agent Monitors Laws
          </Badge>
        </div>
      </div>

      {totalPermitsNeeded > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-900 mb-1">Permit Alerts</h3>
            <p className="text-xs text-amber-700 leading-relaxed mb-3">
              You have {totalPermitsNeeded} item(s) that critically require filming permits before production can begin.
            </p>
            <div className="flex flex-wrap gap-2">
              {locationsWithPermits.filter(l => l.permitStatus === 'needed').map(loc => (
                <Badge key={loc.id} variant="outline" className="bg-white border-amber-200 text-amber-700 text-[10px] uppercase font-bold tracking-tighter">
                  LOC: {loc.name} - ACTION REQUIRED
                </Badge>
              ))}
              {venuesWithPermits.filter(v => v.permitStatus === 'needed').map(venue => (
                <Badge key={venue.id} variant="outline" className="bg-white border-amber-200 text-amber-700 text-[10px] uppercase font-bold tracking-tighter">
                  VENUE: {venue.name} - ACTION REQUIRED
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
        <Bot className="w-4 h-4 text-blue-400" />
        Trigger Note: Permits are researched and updated whenever the "Sourcing Agent" runs.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <Card className="bg-amber-50 border-amber-100">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Action Required</span>
          <AlertCircle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="text-3xl font-bold text-amber-900">
          {totalPermitsNeeded}
        </div>
      </CardContent>
    </Card>
    
    <Card className="bg-blue-50 border-blue-100">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">In Progress</span>
          <Clock className="w-4 h-4 text-blue-600" />
        </div>
        <div className="text-3xl font-bold text-blue-900">
          {totalApplied}
        </div>
      </CardContent>
    </Card>

    <Card className="bg-green-50 border-green-100">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-green-600">Approved</span>
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        </div>
        <div className="text-3xl font-bold text-green-900">
          {totalApproved}
        </div>
      </CardContent>
    </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Active Permit Tracking</CardTitle>
          <CardDescription>Manage filming permits and venue requests for your production locations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.permitSummary && (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 mb-6 font-medium text-blue-900 leading-relaxed text-xs">
              {project.permitSummary}
            </div>
          )}

          {project.permitContacts && project.permitContacts.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <Bot className="w-3 h-3" />
                Agent-Sourced Permit Offices
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.permitContacts.map((contact, idx) => (
                  <div key={idx} className="group p-5 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:border-blue-100 hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-[9px] px-1.5 h-4 uppercase bg-white border-slate-200 text-slate-400 font-bold tracking-tight">
                          {contact.location}
                        </Badge>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {contact.url && <Globe className="w-3 h-3 text-slate-300" />}
                          {contact.phone && <PhoneCall className="w-3 h-3 text-slate-300" />}
                        </div>
                      </div>
                      <h4 className="font-bold text-sm tracking-tight text-slate-900">{contact.entity}</h4>
                      
                      <div className="mt-3 space-y-2">
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <div className="w-5 h-5 rounded bg-white border border-slate-100 flex items-center justify-center shrink-0">
                              <PhoneCall className="w-2.5 h-2.5" />
                            </div>
                            {contact.phone}
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <div className="w-5 h-5 rounded bg-white border border-slate-100 flex items-center justify-center shrink-0">
                              <Mail className="w-2.5 h-2.5" />
                            </div>
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-5">
                      {contact.url && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-[10px] font-bold uppercase flex-1 gap-1.5 bg-white border-slate-200" 
                          render={<a href={contact.url} target="_blank" rel="noopener noreferrer" />} 
                          nativeButton={false}
                        >
                            <Globe className="w-3 h-3" />
                            Portal
                        </Button>
                      )}
                      {contact.phone && (
                        <VapiCallButton 
                          phoneNumber={contact.phone}
                          isCalling={isCalling === contact.entity}
                          onCall={() => initiateCall(contact.phone!, contact.entity, 'film commission')}
                          variant="outline"
                          className="h-8 w-8 p-0 bg-white border-slate-200"
                        />
                      )}
                      {contact.email && (
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-8 w-8 p-0 bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                          onClick={() => handleEmailContact(contact)}
                          title="Compose Inquiry Email"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {locationsWithPermits.length === 0 && locationsNeedingPermits.length === 0 && venuesWithPermits.length === 0 && (
            <div className="text-center py-12 text-slate-400 italic">
              No locations added yet. Add locations or run Sourcing Agent to track permits.
            </div>
          )}

          <div className="space-y-4">
            {locationsWithPermits.map(loc => (
              <div key={loc.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-bold text-sm tracking-tight">{loc.name}</p>
                    <p className="text-[11px] text-slate-500">{loc.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={cn(
                    "text-[10px] font-bold tracking-tight px-2 py-0.5",
                    loc.permitStatus === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                    loc.permitStatus === 'denied' ? 'bg-red-100 text-red-700 border-red-200' :
                    loc.permitStatus === 'applied' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    'bg-amber-100 text-amber-700 border-amber-200'
                  )}>
                    {loc.permitStatus?.toUpperCase() || 'NEEDED'}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <VapiCallButton 
                      phoneNumber={loc.phone}
                      isCalling={isCalling === loc.name}
                      onCall={() => initiateCall(loc.phone!, loc.name, 'film office / location manager')}
                      variant="ghost"
                      className="h-8 w-8"
                    />
                    <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase" onClick={() => updatePermitStatus(loc.id, 'applied')}>Applied</Button>
                    <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase text-green-600 border-green-100 hover:bg-green-50" onClick={() => updatePermitStatus(loc.id, 'approved')}>Approve</Button>
                    <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase text-red-600 border-red-100 hover:bg-red-50" onClick={() => updatePermitStatus(loc.id, 'denied')}>Deny</Button>
                  </div>
                </div>
              </div>
            ))}

            {venuesWithPermits.map(venue => (
              <div key={venue.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-blue-50/20 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <p className="font-bold text-sm tracking-tight">{venue.name}</p>
                       <Badge variant="outline" className="text-[8px] h-3.5 bg-white text-blue-600 border-blue-100">SOURCED</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{venue.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={cn(
                    "text-[10px] font-bold tracking-tight px-2 py-0.5",
                    venue.permitStatus === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                    venue.permitStatus === 'denied' ? 'bg-red-100 text-red-700 border-red-200' :
                    venue.permitStatus === 'applied' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    'bg-amber-100 text-amber-700 border-amber-200'
                  )}>
                    {venue.permitStatus?.toUpperCase() || 'NEEDED'}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {venue.phone && (
                      <VapiCallButton 
                        phoneNumber={venue.phone}
                        isCalling={isCalling === venue.name}
                        onCall={() => initiateCall(venue.phone!, venue.name, 'film office / location manager')}
                        variant="ghost"
                        className="h-8 w-8"
                      />
                    )}
                    <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase" onClick={() => updatePermitStatus(venue.id, 'applied', true)}>Applied</Button>
                    <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase text-green-600 border-green-100 hover:bg-green-50" onClick={() => updatePermitStatus(venue.id, 'approved', true)}>Approve</Button>
                    <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase text-red-600 border-red-100 hover:bg-red-50" onClick={() => updatePermitStatus(venue.id, 'denied', true)}>Deny</Button>
                  </div>
                </div>
              </div>
            ))}

            {locationsNeedingPermits.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Potential Permits Needed</h3>
                <div className="space-y-2">
                  {locationsNeedingPermits.map(loc => (
                    <div key={loc.id} className="flex items-center justify-between p-3 rounded-lg border border-dashed border-slate-200">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-slate-300" />
                        <span className="text-sm text-slate-600">{loc.name}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="text-blue-600 text-[10px] font-bold uppercase" onClick={() => flagForPermit(loc.id)}>
                        Flag for Permit
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </SubscriptionGate>
  );
}
