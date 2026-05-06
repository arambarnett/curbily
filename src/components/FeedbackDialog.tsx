import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useAuth } from '../lib/AuthProvider';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AlertCircle, CheckCircle2, Upload, X, Calendar as CalendarIcon } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import CalendlyEmbed from './common/CalendlyEmbed';

export default function FeedbackDialog({ 
  isOpen, 
  onOpenChange 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [type, setType] = useState<'bug' | 'feature' | 'demo'>('bug');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit for firestore document size safety
      alert('Screenshot must be less than 1MB. Please compress it or take a smaller area.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setScreenshotDataUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user?.uid || 'anonymous',
        type,
        message: feedback,
        screenshot: screenshotDataUrl,
        createdAt: serverTimestamp(),
        status: 'new'
      });
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setFeedback('');
        setScreenshotDataUrl(null);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      handleFirestoreError(error, OperationType.CREATE, 'feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Report a bug or request a new feature. We'd love to hear from you!
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-lg font-medium">Thank you for your feedback!</p>
          </div>
        ) : type === 'demo' ? (
          <div className="space-y-4">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              <button 
                onClick={() => setType('bug')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${type === 'bug' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <AlertCircle className="w-3 h-3" />
                Bug
              </button>
              <button 
                onClick={() => setType('feature')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${type === 'feature' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <CheckCircle2 className="w-3 h-3" />
                Feature
              </button>
              <button 
                onClick={() => setType('demo')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${type === 'demo' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <CalendarIcon className="w-3 h-3" />
                Demo
              </button>
            </div>
            <div className="max-h-[500px] overflow-y-auto border rounded-xl">
              <CalendlyEmbed url="https://calendly.com/team-curbily/30min" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              <button 
                onClick={() => setType('bug')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${type === 'bug' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <AlertCircle className="w-3 h-3" />
                Bug
              </button>
              <button 
                onClick={() => setType('feature')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${type === 'feature' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <CheckCircle2 className="w-3 h-3" />
                Feature
              </button>
              <button 
                onClick={() => setType('demo')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${type === 'demo' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <CalendarIcon className="w-3 h-3" />
                Demo
              </button>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder={type === 'bug' ? "What went wrong? Steps to reproduce?" : "What would you like to see?"}
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Screenshot (Optional, max 1MB)</Label>
              {screenshotDataUrl ? (
                <div className="relative rounded-md overflow-hidden bg-slate-100 border p-2">
                  <img src={screenshotDataUrl} alt="Screenshot preview" className="max-h-40 mx-auto" />
                  <button 
                    onClick={() => setScreenshotDataUrl(null)}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-6 h-6 mb-2 text-slate-500" />
                      <p className="text-xs text-slate-500 font-medium">Click to upload screenshot</p>
                    </div>
                    <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                  </label>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleSubmit} disabled={!feedback.trim() || isSubmitting} className="w-full">
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
