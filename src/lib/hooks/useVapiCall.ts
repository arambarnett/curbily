import { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export function useVapiCall(projectId: string, projectTitle: string, projectLocation?: string) {
  const [isCalling, setIsCalling] = useState<string | null>(null);

  const initiateCall = async (phoneNumber: string, itemName: string, type: string) => {
    if (!phoneNumber) return;
    
    setIsCalling(itemName);
    try {
      const response = await fetch('/api/vapi/outbound-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          assistantOverrides: {
            name: "Production AI Agent",
            firstMessage: `Hello, I'm an AI assistant for ${projectTitle}. I'm calling to inquire about ${type}: ${itemName}.`,
            model: {
              provider: "openai",
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: `You are a professional film production assistant. You are calling about ${type}: ${itemName}. 
                  Project: ${projectTitle}
                  Location: ${projectLocation || 'Unspecified'}
                  
                  Goal: Check availability, current pricing, and specific requirements (like insurance or deposits). 
                  Be concise, professional, and friendly.`
                }
              ]
            },
            voice: {
              provider: "11labs",
              voiceId: "pNInz6obpgDQGcFmaJcg" // standard human-like voice if possible, or playht
            }
          }
        })
      });

      if (!response.ok) throw new Error("Vapi outbound call failed");
      
      await addDoc(collection(db, `projects/${projectId}/notifications`), {
        projectId,
        type: 'system',
        title: 'AI Call Initiated',
        message: `An AI agent is currently calling about "${itemName}" (${phoneNumber}). status: "ON AIR"`,
        isRead: false,
        createdAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error("Vapi Call Error:", error);
      alert("Failed to initiate AI call. Ensure Vapi keys are configured in your configuration.");
    } finally {
      setTimeout(() => setIsCalling(null), 3000);
    }
  };

  return {
    initiateCall,
    isCalling
  };
}
