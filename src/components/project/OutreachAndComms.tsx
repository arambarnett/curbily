import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Project } from '../../types';
import CrewMatcher from './CrewMatcher';
import Outreach from './Outreach';
import CommunicationHub from './CommunicationHub';
import { Users, Mail, MessageSquare } from 'lucide-react';

export default function OutreachAndComms({ projectId, project }: { projectId: string, project: Project }) {
  const [activeSubTab, setActiveSubTab] = useState('matcher');

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="matcher" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Users className="w-4 h-4" />
            Find Crew
          </TabsTrigger>
          <TabsTrigger value="outreach" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Mail className="w-4 h-4" />
            Outreach List
          </TabsTrigger>
          <TabsTrigger value="messages" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <MessageSquare className="w-4 h-4" />
            Messages
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="matcher" className="mt-0 focus-visible:ring-0">
            <CrewMatcher projectId={projectId} />
          </TabsContent>
          <TabsContent value="outreach" className="mt-0 focus-visible:ring-0">
            <Outreach projectId={projectId} project={project} />
          </TabsContent>
          <TabsContent value="messages" className="mt-0 focus-visible:ring-0">
            <CommunicationHub projectId={projectId} project={project} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
