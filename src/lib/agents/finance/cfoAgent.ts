import { getGeminiClient, MODEL_NAME } from "../../geminiClient";
import { parseJSON } from "../../utils";

export const executeCfoReview = async (
  combinedChunks: any[],
  targetBudget: number,
  budgetTier: string,
  commonContext: string,
  baseInstruction: string,
  responseSchema: any,
  retries = 2,
  onProgress?: (message: string) => void
) => {
  const ai = getGeminiClient();
  const MODEL = MODEL_NAME;

  if (onProgress) onProgress("[CFO Master Agent] Reviewing line items and auditing math against Target Budget...");
  
  let finalBudget = [];
  
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const cfoResponse = await ai.models.generateContent({
        model: MODEL,
        contents: [{ 
          role: "user", 
          parts: [{ 
            text: JSON.stringify({
              initialChunks: combinedChunks,
              context: commonContext
            }) 
          }] 
        }],
        config: { 
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema,
          systemInstruction: `Purpose: You are the CFO Master Agent.
You are given the combined budget line items from 3 sub-agents ('initialChunks').
Your job is to:
1. REVIEW the items. Fix any math errors (amount must equal rate * quantity) and adjust rates if they are wildly inappropriate.
2. DISCOVER TARGET BUDGET BLINDSPOTS: Compare the total sum of all items (including manualItems in the context) against the Target Budget of $${targetBudget.toLocaleString()}. 
3. If the total is severely under-budget, ADD missing industry-standard line items (e.g. Contingency, Completion Bond, PR/Marketing, legal buffers, additional days, higher standard equipment packages) to realistically hit the target budget while adhering to the specified tier (${budgetTier || 'Non-Union Skeleton Crew'}). Do not just add a "Misc" line—add explicit realistic professional items until the target budget is reasonably matched. 
4. If it's over budget, intelligently trim unessential crew or days.
5. You MUST ensure union minimums correspond to ${budgetTier || 'Non-Union Skeleton Crew'}.
6. CRITICAL: PRESERVE MANUAL ITEMS. Do not duplicate or contradict them. Your output should focus on filling GAPS.
7. SOURCING DATA: If there are venues, gear, or other items in the 'sourcingData' (found in the context), ENSURE they are represented in the final budget and their prices match the sourcing data precisely.

${baseInstruction}

OUTPUT: Return the FINAL exhaustive flat JSON array of budget line items (excluding the manualItems, as the frontend will merge them).`,
        },
      });

      if (onProgress) onProgress("[CFO Master Agent] Budget Finalized.");
      finalBudget = parseJSON(cfoResponse.candidates?.[0]?.content?.parts?.[0]?.text || cfoResponse.text || "[]") || [];
      break; 
    } catch (error: any) {
      console.error(`Error in CFO Master Agent (Attempt ${attempt}/${retries + 1}):`, error);
      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        throw new Error(`ApiError: Gemini API Quota Exceeded (CFO Agent). Please try again later.`);
      }
      if (attempt <= retries) {
        if (onProgress) onProgress(`[CFO Master Agent] Error occurred. Retrying (${attempt}/${retries})...`);
        await new Promise(r => setTimeout(r, 2000 * attempt)); 
      } else {
        if (onProgress) onProgress(`[CFO Master Agent] Failed after ${retries + 1} attempts. Returning combined chunks.`);
      }
    }
  }

  return finalBudget.length > 0 ? finalBudget : combinedChunks;
};
