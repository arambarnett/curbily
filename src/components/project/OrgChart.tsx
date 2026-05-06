import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Project, BudgetItem, Contact } from '../../types';
import { Users, User, ArrowRight, ShieldCheck, Briefcase, Camera, Music, Palette, Hammer, Truck } from 'lucide-react';
import { motion } from 'motion/react';

interface OrgChartProps {
  projectId: string;
  project: Project;
  budget?: BudgetItem[];
  contacts?: Contact[];
}

const DEPARTMENT_ICONS: Record<string, React.ReactNode> = {
  'production': <Briefcase className="w-4 h-4" />,
  'camera': <Camera className="w-4 h-4" />,
  'sound': <Music className="w-4 h-4" />,
  'art': <Palette className="w-4 h-4" />,
  'construction': <Hammer className="w-4 h-4" />,
  'transportation': <Truck className="w-4 h-4" />,
  'direction': <User className="w-4 h-4" />,
  'executive': <ShieldCheck className="w-4 h-4" />,
};

const OrgChart: React.FC<OrgChartProps> = ({ projectId, project, budget: initialBudget, contacts: initialContacts }) => {
  const [budget, setBudget] = useState<BudgetItem[]>(initialBudget || []);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts || []);
  const [loading, setLoading] = useState(!initialBudget || !initialContacts);

  useEffect(() => {
    if (initialBudget && initialContacts) return;

    setLoading(true);
    const budgetUnsub = onSnapshot(collection(db, `projects/${projectId}/budget`), (snap) => {
      setBudget(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/budget`);
    });

    const contactsUnsub = onSnapshot(collection(db, 'contacts'), (snap) => {
      setContacts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contacts');
    });

    return () => {
      budgetUnsub();
      contactsUnsub();
    };
  }, [projectId, initialBudget, initialContacts]);

  useEffect(() => {
    if (budget.length > 0 && contacts.length > 0) {
      setLoading(false);
    }
  }, [budget, contacts]);

  // Group crew by department based on budget categories or contact roles
  const departments: Record<string, any[]> = {};
  
  // Also include union roles if possible
  const crewPersonnel = budget.filter(item => 
    item.category.toLowerCase().includes('personnel') || 
    item.category.toLowerCase().includes('crew') || 
    item.category.toLowerCase().includes('labor') ||
    item.category.toLowerCase().includes('cast')
  );

  crewPersonnel.forEach(item => {
    const dept = item.category || 'Other';
    if (!departments[dept]) departments[dept] = [];
    departments[dept].push(item);
  });

  // If no budget items, try contacts or if we want to enrich with contacts
  // For the Org Chart, we want to know WHO is in the role.
  // The budget items often have 'personName' if assigned.
  
  const executiveTeam = budget.filter(item => 
    item.category.toLowerCase().includes('executive') ||
    item.description.toLowerCase().includes('producer') || 
    item.description.toLowerCase().includes('director') ||
    item.description.toLowerCase().includes('u.p.m') ||
    item.description.toLowerCase().includes('manager')
  );

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Building organizational structure...</div>;

  return (
    <div className="space-y-8 p-6 bg-slate-50/50 rounded-3xl min-h-[600px]">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-display font-black tracking-tighter">Organization Structure</h2>
        <p className="text-slate-500 max-w-2xl">
          Visualizing the chain of command for {project.title}. Understand reporting lines and accountability across all departments.
        </p>
      </div>

      {/* Level 1: Executive Control */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="label-caps mb-2">Executive Leadership</div>
          <div className="flex flex-wrap justify-center gap-4">
            {executiveTeam.length > 0 ? (
              executiveTeam.map((leader, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={leader.id} 
                  className="bg-black text-white p-4 rounded-2xl shadow-xl min-w-[200px] text-center"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{leader.description}</p>
                  <p className="font-bold">{leader.personName || 'Unassigned'}</p>
                </motion.div>
              ))
            ) : (
              <div className="bg-black text-white p-4 rounded-2xl shadow-xl min-w-[200px] text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Director / Producer</p>
                <p className="font-bold italic opacity-50">Pending Assignment</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="h-12 w-px bg-slate-300 relative">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-300" />
        </div>
      </div>

      {/* Level 2: Departments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(departments).map(([dept, crew], idx) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + idx * 0.05 }}
            key={dept}
            className="space-y-4"
          >
            <Card className="border-2 border-slate-100 hover:border-black transition-all overflow-hidden bg-white shadow-sm hover:shadow-md">
              <CardHeader className="bg-slate-50/50 py-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white rounded-lg border shadow-sm">
                    {DEPARTMENT_ICONS[dept.toLowerCase()] || <Users className="w-4 h-4" />}
                  </div>
                  <CardTitle className="text-sm font-black uppercase tracking-tight">{dept}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {crew.map((member, mIdx) => (
                  <div key={mIdx} className="flex items-center justify-between group">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                        {member.description || member.role}
                      </span>
                      <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {member.personName || 'TBA'}
                      </span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-200 group-hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100 group-hover:translate-x-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="bg-emerald-50 border-emerald-100 p-6 rounded-[2rem]">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-display font-black text-emerald-900 text-xl">Command Safety Protocol</h4>
            <p className="text-emerald-700/80 text-sm leading-relaxed max-w-2xl mt-1">
              All department heads (HODs) have direct reporting lines to the Executive Leadership team. 
              Crew members should report to their respective HOD for daily operations. 
              In case of safety issues, anyone can use the "Stop Work" authority regardless of position.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OrgChart;
