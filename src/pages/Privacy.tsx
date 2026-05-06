import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans p-8 md:p-24 selection:bg-white selection:text-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="max-w-3xl mx-auto"
      >
        <Button 
          variant="ghost" 
          className="mb-12 hover:bg-white/10 p-0 px-4 flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold text-white/50 hover:text-white"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <h1 className="text-6xl font-bold tracking-tighter mb-4 uppercase">Privacy Policy</h1>
        <p className="text-sm text-white/30 mb-12 uppercase tracking-[0.2em] font-bold">Curbily LLC — Privacy Governance</p>

        <div className="space-y-12 text-lg leading-relaxed text-white/70">
          <section>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-4">1. Data Collection</h2>
            <p>
              We collect information you provide directly to us, including your profile data, professional history, 
              skills, and media assets. We also collect project data, including scripts and budget information, 
              to enable our AI agents to perform their autonomous functions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-4">2. Talent Network Integration</h2>
            <p>
              By using our service, you acknowledge that your professional profile is integrated into our proprietary 
              <strong>Curbily Talent Bench</strong>. This data is used for matchmaking purposes, connecting production 
              needs with the right personnel. We may use your contact information to notify you of potential 
              opportunities that align with your profile.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-4">3. Use of AI</h2>
            <p>
              Our system utilizes Large Language Models (LLMs) to analyze script metadata and project logistics. 
              While we process your data through these models, we do not use your private project details to train 
              public models without explicit consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-4">4. Third-Party Services</h2>
            <p>
              We integrate with services like Stripe (for payments), Google (for authentication), and various 
              logistics providers. These parties have their own privacy policies which we encourage you to review.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-4">5. Data Security</h2>
            <p>
              Your data is stored in a secure cloud environment. Curbily LLC implements rigorous technical and 
              organizational measures to protect against unauthorized access or data breaches.
            </p>
          </section>
        </div>

        <footer className="mt-24 pt-12 border-t border-white/10 text-sm text-white/20 uppercase tracking-widest font-bold">
          © Curbily LLC — Delaware, USA
        </footer>
      </motion.div>
    </div>
  );
}
