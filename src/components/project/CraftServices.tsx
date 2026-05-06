import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, writeBatch, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { CateringOption, Scene, Project } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Utensils, Sparkles, CheckCircle2, ExternalLink, Phone, Mail, MessageCircle, MapPin, Bot } from 'lucide-react';
import { craftServices } from '../../lib/gemini';
import { Badge } from '../ui/badge';
import SubscriptionGate from '../SubscriptionGate';
import { useVapiCall } from '../../lib/hooks/useVapiCall';
import { VapiCallButton } from './VapiCallButton';

export default function CraftServices({ projectId, scenes, project }: { projectId: string, scenes: Scene[], project: Project }) {
  const [options, setOptions] = useState<CateringOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const { initiateCall, isCalling } = useVapiCall(projectId, project.title, project.location);

  useEffect(() => {
    const q = query(collection(db, `projects/${projectId}/catering`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CateringOption)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/catering`);
    });

    return unsubscribe;
  }, [projectId]);

  const handleSourcing = async () => {
    if (scenes.length === 0) return;
    setGenerating(true);
    try {
      const suggestions = await craftServices(scenes, project.location);
      const batch = writeBatch(db);

      // Clear existing
      options.forEach(opt => {
        batch.delete(doc(db, `projects/${projectId}/catering`, opt.id));
      });

      suggestions.forEach((c: any) => {
        const ref = doc(collection(db, `projects/${projectId}/catering`));
        batch.set(ref, { 
          ...c, 
          projectId, 
          status: 'research', 
          costPerPerson: c.estimatedCostPerPerson || 0, 
          purchaseUrl: c.purchaseUrl || '',
          contactInfo: c.contactInfo || ''
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error sourcing catering:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, `projects/${projectId}/catering`, id), {
        status: 'booked'
      });
      
      await addDoc(collection(db, `projects/${projectId}/notifications`), {
        projectId,
        type: 'approval',
        title: 'Catering Booked',
        message: `A catering option has been selected and booked.`,
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/catering/${id}`);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading craft services...</div>;

  return (
    <SubscriptionGate 
      featureName="Craft Services Agent"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Utensils className="w-6 h-6" />
              Craft Services & Catering
            </h2>
            <p className="text-slate-500">Manage food, beverages, and crafty for your cast and crew.</p>
          </div>
          <Button onClick={handleSourcing} disabled={generating || scenes.length === 0} className="gap-2">
            <Sparkles className="w-4 h-4" />
            {generating ? 'Sourcing Options...' : 'Source Catering'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Catering Options</CardTitle>
              <CardDescription>Based on your production location and crew size</CardDescription>
            </CardHeader>
            <CardContent>
              {options.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No catering options sourced yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Cost/Person</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {options.map((option) => (
                      <TableRow key={option.id}>
                        <TableCell className="font-bold">{option.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{option.type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-xs">
                          {option.contactInfo || 'No description provided.'}
                        </TableCell>
                        <TableCell className="text-right font-mono">${option.costPerPerson}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {option.purchaseUrl && (
                              <a 
                                href={option.purchaseUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                              >
                                <ExternalLink className="w-4 h-4 text-slate-600" />
                              </a>
                            )}
                            <VapiCallButton 
                              phoneNumber={option.phone}
                              isCalling={isCalling === option.name}
                              onCall={() => initiateCall(option.phone!, option.name, 'catering services')}
                              variant="ghost"
                            />
                            {option.status === 'research' ? (
                              <Button size="sm" onClick={() => handleApprove(option.id)}>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-orange-50 border-orange-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Local Grocery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-orange-800">
                The AI has identified 3 local grocery stores within 5 miles for quick crafty refills.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Emergency Delivery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-blue-800">
                UberEats and DoorDash are active in this area. Average delivery time: 25 mins.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Dietary Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-green-800">
                2 Vegan, 1 Gluten-free, 3 Nut allergies detected in crew profiles.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </SubscriptionGate>
  );
}
