import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, Save, Send, Lightbulb, BrainCircuit, PenTool } from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { scriptAgent } from '@/lib/gemini';

// Re-using common components if they exist, or creating quick UI here
const ButtonUI = ({ children, className, ...props }: any) => (
  <button 
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 ${className}`}
    {...props}
  >
    {children}
  </button>
);

export const IdeationView = ({ project, id }: { project: any, id: string }) => {
  const { user } = useAuth();
  const [idea, setIdea] = useState(project.idea || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveIdea = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'projects', id), {
        idea: idea,
        updatedAt: new Date()
      });
      toast.success('Idea saved successfully');
    } catch (error) {
      console.error('Error saving idea:', error);
      toast.error('Failed to save idea');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExpandIdea = async () => {
    if (!idea.trim()) return;
    setIsGenerating(true);
    try {
      const result = await scriptAgent(idea);
      // We don't overwrite the whole project here, but we can offer to update the script
      toast.success('AI expanded your idea! Review the result in the script section.', {
          description: 'The expansion includes a full synopsis and character ideas.'
      });
      
      // Update script if user confirms or just save it as expanded notes
      await updateDoc(doc(db, 'projects', id), {
        synopsis: result.synopsis || project.synopsis,
        logline: result.logline || project.logline,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error expanding idea:', error);
      toast.error('AI expansion failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-yellow-500" />
            Ideation Hub
          </h2>
          <p className="text-slate-500 text-sm">Refine your project concept, themes, and creative direction.</p>
        </div>
        <div className="flex gap-2">
           <ButtonUI 
             onClick={handleSaveIdea} 
             disabled={isSaving}
             className="bg-white border text-slate-900 border-slate-200 hover:bg-slate-50 gap-2"
           >
             {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
             Save Draft
           </ButtonUI>
           <ButtonUI 
             onClick={handleExpandIdea} 
             disabled={isGenerating || !idea.trim()}
             className="bg-slate-900 text-white hover:bg-black gap-2"
           >
             {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
             AI Expand
           </ButtonUI>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Core Concept</CardTitle>
            <CardDescription>What is the soul of this production?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="Start typing your vision... or paste a rough beat sheet."
              className="min-h-[300px] text-lg leading-relaxed font-sans border-none bg-slate-50/50 focus-visible:ring-0 resize-none p-6 rounded-2xl"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Creative Prompts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Who is the protagonist, and why now?",
                "What is the inciting incident?",
                "What is the visual language (color, mood)?",
                "What is the central theme or 'moral'?"
              ].map((prompt, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-100">
                  {prompt}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-600">AI Agents Active</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white border border-blue-200 flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-[10px]">
                  <p className="font-bold text-slate-900 uppercase">Creative Partner</p>
                  <p className="text-slate-500 uppercase tracking-tighter">Analyzing themes...</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white border border-blue-200 flex items-center justify-center">
                  <PenTool className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-[10px]">
                  <p className="font-bold text-slate-900 uppercase">Script Doctor</p>
                  <p className="text-slate-500 uppercase tracking-tighter">Ready to draft script</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
