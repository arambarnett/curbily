import React from 'react';
import { Button } from '../ui/button';
import { Bot, Loader2, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface VapiCallButtonProps {
  onCall: () => void;
  isCalling: boolean;
  phoneNumber?: string;
  size?: 'sm' | 'icon' | 'default';
  variant?: 'outline' | 'ghost' | 'secondary';
  className?: string;
  label?: string;
}

export function VapiCallButton({ 
  onCall, 
  isCalling, 
  phoneNumber, 
  size = 'icon', 
  variant = 'outline',
  className,
  label
}: VapiCallButtonProps) {
  if (!phoneNumber) return null;

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <Button
        variant={variant}
        size={size}
        onClick={(e) => {
          e.stopPropagation();
          onCall();
        }}
        disabled={isCalling}
        className={cn(
          "transition-all duration-300",
          isCalling && "border-indigo-400 bg-indigo-50 text-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.2)]",
          !label && "h-7 w-7 rounded-full"
        )}
        title={isCalling ? "AI Agent is calling..." : "AI Sourcing Agent (Vapi)"}
      >
        <AnimatePresence mode="wait">
          {isCalling ? (
            <motion.div
              key="calling"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
            >
              <Loader2 className="w-3 h-3 animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="flex items-center gap-1.5"
            >
              <Bot className={cn("w-3.5 h-3.5", !label && "w-3 h-3")} />
              {label && <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
      
      {isCalling && (
        <motion.span 
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-[9px] font-black uppercase tracking-widest text-indigo-600 animate-pulse whitespace-nowrap"
        >
          Calling...
        </motion.span>
      )}
    </div>
  );
}
