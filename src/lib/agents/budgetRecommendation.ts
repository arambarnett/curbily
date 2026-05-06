import { getGeminiClient, MODEL_NAME } from "../geminiClient";
import { parseJSON } from "../utils";

export const budgetRecommendation = async (scriptText: string, targetBudget: number) => {
  if (!scriptText || targetBudget === undefined) throw new Error("scriptText and targetBudget are required for budgetRecommendation");

  const ai = getGeminiClient();
  const FLASH_MODEL = MODEL_NAME;

  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts: [{ text: `Script: ${scriptText}\nTarget Budget: $${targetBudget}` }] }],
    config: { maxOutputTokens: 8192,
      responseMimeType: "application/json",
            systemInstruction: `Produce three budget scenarios (low/medium/high) around targetBudget. 
CRITICAL: You MUST returned detailed ITEMIZIED line items for EVERY scenario. DO NOT group costs into general categories only.
- Each scenario returns line items with category, description, rate, quantity, amount, unit, and rationale trade-offs.
- BREAK OUT every cast and crew role individually (e.g. Director, DP, Sound, Lead Actor, Supporting Actor).
- Return strict JSON only as an object with keys: low, medium, high. Each key should be an array of budget items.`,
      tools: [{ googleSearch: {} }]
    },
  });

  return parseJSON(response.text || "{}") || {};
};
