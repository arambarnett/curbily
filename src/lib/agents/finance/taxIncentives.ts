import { parseJSON } from "../../utils";
import { getGeminiClient, MODEL_NAME } from "../../geminiClient";

export const getTaxIncentives = async (location: string, budget: number, contentType: string) => {
  const ai = getGeminiClient();
  const MODEL = MODEL_NAME;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: `Location: ${location}\nTotal Budget: $${budget}\nContent Type: ${contentType}` }] }],
    config: { maxOutputTokens: 8192,
      responseMimeType: "application/json",
      systemInstruction: `You are a Global Film Incentive Consultant. 
Analyze the tax credits and incentives available for the given location and budget.

Provide:
1. Primary Credit: Percentage and type (Refundable/Transferable).
2. Eligibility requirements (Minimum spend, residency).
3. Estimated Rebate Amount: Calculate based on standard qualifying spend (approx 70-85% of total budget usually qualifies).
4. Suggestion: Areas to shift spend to maximize the credit.
5. Watch-outs: Common audit pitfalls.

Return a JSON object.`
    },
  });

  return parseJSON(response.text || "{}");
};
