import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-[#0a0a0a] font-sans p-8 md:p-24 selection:bg-[#0a0a0a] selection:text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-3xl mx-auto"
      >
        <Button 
          variant="ghost" 
          className="mb-12 hover:bg-transparent p-0 flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <h1 className="text-6xl font-bold tracking-tighter mb-4 uppercase">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-12 uppercase tracking-[0.2em] font-bold">Last Updated: April 2026</p>

        <div className="space-y-12 text-lg leading-relaxed text-slate-800">
          <section>
            <h2 className="text-2xl font-bold text-black uppercase tracking-tight mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Curbily, you agree to be bound by these Terms of Service. Curbily is a service 
              provided by <strong>Curbily LLC</strong>, a Delaware Limited Liability Company ("Company", "We", "Us"). If you do not agree to all terms and conditions, you must not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black uppercase tracking-tight mb-4">2. Subscription & Payments</h2>
            <p>
              Curbily operates on a subscription with additional compute costs. Subscription fees are billed in advance on a monthly or annual basis and are non-refundable. Paid subscriptions include a specified amount of compute credits. Any compute usage exceeding the included credit limits will be automatically billed at our current overage rates (e.g., $6.00 per additional run). You authorize us to store your payment method and automatically charge any overage fees. We reserve the right to modify our pricing structure upon 30 days prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black uppercase tracking-tight mb-4">3. Talent Bench & Outreach</h2>
            <p>
              By creating a profile on Curbily, you grant Curbily LLC the irrevocable right to include your information 
              in the <strong>Curbily Talent Bench</strong>. We reserve the right to share your profile with third-party 
              producers, studios, and hiring managers within our network. Furthermore, Curbily LLC and its partners 
              may reach out to you directly for professional opportunities, gig offers, or talent searches.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black uppercase tracking-tight mb-4">4. Production Credits & Obligations</h2>
            <p>
              As a condition of using Curbily's autonomous production tools for any film, media, or creative production, 
              the user (the "Producer") agrees to the following:
            </p>
            <ul className="list-disc pl-6 space-y-4 mt-4">
              <li>
                <strong>Producer Credits:</strong> Curbily LLC shall be granted a formal credit as "Producer" or 
                "Associate Producer" in the main or end credits of the production. The specific placement shall be 
                comparable to other major technical or production services.
              </li>
              <li>
                <strong>Event Attendance:</strong> Curbily LLC shall receive invitations for up to two (2) company 
                representatives to attend all major production events, including but not limited to: premieres, 
                wrap parties, industry screenings, and festival events associated with the production.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black uppercase tracking-tight mb-4">5. Transparency of Rates</h2>
            <p>
              By participating on the platform as a crew member or production staff, you acknowledge and agree that your 
              base rates, day rates, and union classifications will be made <strong>publicly visible</strong> to other users 
              on the platform. This is to facilitate accurate budgeting and scheduling across the Curbily network.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black uppercase tracking-tight mb-4">6. AI Processing & Content Rights</h2>
            <p>
              The platform utilizes Artificial Intelligence (AI) and Large Language Models (LLMs) to process scripts, schedules, budgets, and communication. The algorithms, methodologies, outputs, and interface design remain the exclusive property of Curbily LLC. While you retain full copyright ownership of your original scripts and input materials, you grant Curbily LLC a worldwide, royalty-free, perpetual license to ingest, process, and use this data to provide and improve our services, including the training, refinement, and optimization of our production models.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black uppercase tracking-tight mb-4">7. Limitation of Liability</h2>
            <p>
              The services are provided "AS IS" without warranties of any kind. Curbily LLC relies on third-party AI frameworks processing natural language inputs which may generate inaccurate or incomplete outputs. You remain solely responsible for reviewing all budgets, union agreements, call sheets, and schedules before implementation. Under no circumstances shall Curbily LLC, its directors, employees, or affiliates be liable for any indirect, incidental, special, or consequential damages, including loss of profits, data, production delays, or union penalties arising from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black uppercase tracking-tight mb-4">8. Governing Law</h2>
            <p>
              These terms are governed by the laws of the State of Delaware. Any disputes shall be resolved in the 
              competent courts of Delaware. We reserve the right to suspend or terminate your account at any time for violation of these Terms.
            </p>
          </section>
        </div>

        <footer className="mt-24 pt-12 border-t border-slate-200 text-sm text-slate-400 uppercase tracking-widest font-bold">
          © Curbily LLC — Delaware, USA
        </footer>
      </motion.div>
    </div>
  );
}
