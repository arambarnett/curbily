import React, { useState, useEffect } from 'react';
import { vapi } from '../../lib/vapi';
import { Button } from '../ui/button';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function VoiceAssistant({ assistantId, title = "Production Assistant" }: { assistantId?: string, title?: string }) {
  const [isCalling, setIsCalling] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  useEffect(() => {
    vapi.on('call-start', () => {
      setIsCalling(true);
      setIsConnecting(false);
    });

    vapi.on('call-end', () => {
      setIsCalling(false);
      setIsConnecting(false);
    });

    vapi.on('volume-level', (level) => {
      setVolumeLevel(level);
    });

    vapi.on('error', (error) => {
      console.error('Vapi Error:', error);
      setIsCalling(false);
      setIsConnecting(false);
    });

    return () => {
      vapi.removeAllListeners();
    };
  }, []);

  const toggleCall = async () => {
    if (isCalling) {
      vapi.stop();
    } else {
      setIsConnecting(true);
      try {
        // If no assistantId provided, we can pass a transient assistant definition
        await vapi.start((assistantId as any) || ({
          name: "Production AI",
          firstMessage: "Hello, I'm your Production AI Assistant. How can I help you coordinate your project today?",
          model: {
            provider: "openai",
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: "You are a professional film production coordinator. You help users manage their breakdowns, schedules, and budgets. You are helpful, concise, and knowledgeable about film production logistics."
              }
            ]
          },
          voice: "jennifer-playht"
        } as any));
      } catch (error) {
        console.error("Failed to start Vapi call:", error);
        setIsConnecting(false);
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isCalling && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-64"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mic className="text-blue-600 w-5 h-5" />
                </div>
                {/* Pulsing volume meter */}
                <motion.div 
                  className="absolute inset-0 bg-blue-400 rounded-full -z-10"
                  animate={{ scale: 1 + volumeLevel * 1.5, opacity: 0.2 }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{title}</p>
                <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider animate-pulse">On Air</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        size="lg"
        onClick={toggleCall}
        disabled={isConnecting}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg transition-all duration-300 p-0",
          isCalling ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
        )}
      >
        {isConnecting ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : isCalling ? (
          <PhoneOff className="w-6 h-6" />
        ) : (
          <Phone className="w-6 h-6" />
        )}
      </Button>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
