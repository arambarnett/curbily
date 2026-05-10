import { parseJSON } from "../../utils";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

export const processResponse = async (message: string, thread: any) => {
  if (!message || !thread) throw new Error("message and thread are required for processResponse");

  const apiKey = "dummy-key";
  const ai = new GoogleGenAI({ apiKey, httpOptions: { baseUrl: typeof window !== 'undefined' ? window.location.origin + (window.location.pathname.startsWith('/projects') ? '/projects/gemini-api-proxy/' : '/gemini-api-proxy/') : 'http://localhost:3000/gemini-api-proxy/' } });
  const FLASH_MODEL = "models/gemini-3-flash-preview";

  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts: [{ text: `Message: "${message}"\nRole: ${thread.role}` }] }],
    config: { maxOutputTokens: 8192,
      responseMimeType: "application/json",
            systemInstruction: "You are an expert Production Manager analyzing crew/talent responses.\n\nTASKS:\n1. Classify intent: accept, decline, bidding, question, other.\n2. Extract 'requestedRate' (the talent's bid) if a specific number is mentioned.\n3. Extract 'commitments' (dates, travel, gear).\n4. Summarize the message concisely.\n5. Suggest 'nextStep' for the producer (e.g., 'Review bid', 'Ask for portfolio').\n\nReturn JSON: { status: string, summary: string, nextStep: string, requestedRate: number | null, commitments: string }"
    },
  });

  return parseJSON(response.text || "{}");
};
