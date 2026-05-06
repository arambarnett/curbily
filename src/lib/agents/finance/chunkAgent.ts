import { getGeminiClient, MODEL_NAME } from "../../geminiClient";
import { parseJSON } from "../../utils";

export const generateBudgetChunk = async (
  agentName: string, 
  focus: string, 
  commonContext: string,
  baseInstruction: string,
  responseSchema: any,
  retries = 2,
  onProgress?: (message: string) => void
) => {
  const ai = getGeminiClient();
  const MODEL = MODEL_NAME;

  if (onProgress) onProgress(`[${agentName}] Analyzing ${focus}...`);
  
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: commonContext }] }],
        config: { 
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema,
          systemInstruction: `Purpose: You are the ${agentName}. Generate EXHAUSTIVE, highly detailed budget line items strictly for: ${focus}.
          ${baseInstruction}
          
          SOURCING DATA INTEGRATION (CRITICAL):
          - You have been provided with 'sourcingData' in the common context (venues, gear, props, wardrobe).
          - If there are items in sourcingData, you MUST prioritize them as the source of truth for your line items in those categories.
          - Use the 'name' and 'cost'/'dayRate' from sourcingData.
          
          OUTPUT: Return a flat JSON array of budget line items with correct rate, quantity, and unit. DO NOT return items outside of your focus area.`,
        },
      });
      const text = res.candidates?.[0]?.content?.parts?.[0]?.text || res.text || "[]";
      return parseJSON(text) || [];
    } catch (error: any) {
      console.error(`Error in ${agentName} (Attempt ${attempt}/${retries + 1}):`, error);
      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        throw new Error(`ApiError: Gemini API Quota Exceeded (${agentName}). Please try again later.`);
      }
      if (attempt <= retries) {
        if (onProgress) onProgress(`[${agentName}] Error occurred. Retrying (${attempt}/${retries})...`);
        await new Promise(r => setTimeout(r, 2000 * attempt)); // Exponential backoff
      } else {
        if (onProgress) onProgress(`[${agentName}] Failed after ${retries + 1} attempts.`);
        return [];
      }
    }
  }
  return [];
};
