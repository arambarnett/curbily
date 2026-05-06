import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, writeBatch, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { TravelLogistics, Scene, Project } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button, buttonVariants } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Plane, Sparkles, CheckCircle2, ExternalLink, Hotel, Car, MapPin, Loader2, Bot } from 'lucide-react';
import { travelLodging } from '../../lib/gemini';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { useVapiCall } from '../../lib/hooks/useVapiCall';
import { VapiCallButton } from './VapiCallButton';

function DescriptionCell({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 100;

  return (
    <div className="relative">
      <p className={cn(
        "transition-all duration-200",
        !expanded && isLong && "line-clamp-2"
      )}>
        {text}
      </p>
      {isLong && (
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-blue-600 font-bold hover:underline mt-1 uppercase"
        >
          {expanded ? 'Show Less' : 'Show More'}
        </button>
      )}
    </div>
  );
}

export default function TravelAgent({ projectId, scenes, project }: { projectId: string, scenes: Scene[], project: Project }) {
  const [travel, setTravel] = useState<TravelLogistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const { initiateCall, isCalling } = useVapiCall(projectId, project.title, project.location);

  useEffect(() => {
    const travelQ = query(collection(db, `projects/${projectId}/travel`));
    const unsubTravel = onSnapshot(travelQ, (snapshot) => {
      setTravel(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TravelLogistics)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/travel`);
    });

    return () => unsubTravel();
  }, [projectId]);

  const handleSourcing = async () => {
    if (scenes.length === 0) return;
    setGenerating(true);
    try {
      const suggestions = await travelLodging(scenes, project.location);
      const batch = writeBatch(db);

      // Clear existing travel
      travel.forEach(t => batch.delete(doc(db, `projects/${projectId}/travel`, t.id)));

      suggestions.forEach((t: any) => {
        const ref = doc(collection(db, `projects/${projectId}/travel`));
        batch.set(ref, { 
          ...t, 
          projectId, 
          status: 'needed', 
          cost: t.estimatedCost || 0, 
          purchaseUrl: t.purchaseUrl || '' 
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error sourcing travel:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleBook = async (id: string) => {
    try {
      await updateDoc(doc(db, `projects/${projectId}/travel`, id), {
        status: 'booked'
      });
      
      await addDoc(collection(db, `projects/${projectId}/notifications`), {
        projectId,
        type: 'booking',
        title: 'Travel Booked',
        message: `A travel arrangement has been confirmed.`,
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/travel/${id}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'hotel': return <Hotel className="w-4 h-4" />;
      case 'car-rental': return <Car className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  if (loading) return <div className="p-8 text-center">Loading travel logistics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Plane className="w-6 h-6" />
            Travel & Lodging Agent
          </h2>
          <p className="text-slate-500">Coordinate flights, hotels, and ground transport for your production.</p>
        </div>
        <Button onClick={handleSourcing} disabled={generating || scenes.length === 0} className="gap-2">
          <Sparkles className="w-4 h-4" />
          {generating ? 'Searching Travel...' : 'Source Travel & Hotels'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Logistics Plan</CardTitle>
            <CardDescription>Recommended travel and housing based on your shoot schedule and location</CardDescription>
          </CardHeader>
          <CardContent>
            {travel.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <Plane className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No travel arrangements sourced yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Est. Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {travel.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 capitalize font-medium">
                          {getIcon(t.type)}
                          {t.type.replace('-', ' ')}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-md">
                        <DescriptionCell text={t.description} />
                      </TableCell>
                      <TableCell className="text-right font-mono">${t.cost}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {t.purchaseUrl && (
                            <a 
                              href={t.purchaseUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <VapiCallButton 
                            phoneNumber={t.phone}
                            isCalling={isCalling === t.description}
                            onCall={() => initiateCall(t.phone!, t.description, t.type)}
                            variant="ghost"
                          />
                          {t.status === 'needed' ? (
                            <Button size="sm" onClick={() => handleBook(t.id)}>
                              Book
                            </Button>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Booked
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Production Base
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-blue-800">
              {project.location ? `Production is centered around ${project.location}.` : 'Set a project location to get more accurate travel suggestions.'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Travel Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">
              Agent is configured to prioritize refundable bookings and stays within 15 miles of the primary location.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
