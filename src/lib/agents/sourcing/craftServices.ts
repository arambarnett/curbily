import { getGeminiClient, MODEL_NAME } from "../../geminiClient";
import { parseJSON } from "../../utils";

export const craftServices = async (breakdownData: any, location?: string) => {
  if (!breakdownData) throw new Error("breakdownData is required for craftServices");

  const ai = getGeminiClient();
  const MODEL = MODEL_NAME;

  const responseStream = await ai.models.generateContentStream({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: `Location: ${location}\nBreakdown: ${JSON.stringify(breakdownData)}` }] }],
    config: { 
      maxOutputTokens: 8192,
      systemInstruction: `Purpose: Create a practical craft services and meal plan for the shoot schedule.
      
SEARCH GROUNDING:
- Use Google Search to find REAL catering vendors, popular local food delivery options, and bulk "crafty" (craft services) suppliers in ${location}.
- Verify that these vendors are active and ideally have experience with production catering.
- Prioritize vendors with online menus or direct order links.

CRITICAL GUIDELINES:
- Include vendor options, estimated per-person pricing, dietary accommodations, and delivery windows.
- Provide direct, working links.
- Return a JSON object with a 'catering' key containing an array of items.`,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json"
    },
  });

  let text = '';
  for await (const chunk of responseStream) {
    if (chunk.text) {
      text += chunk.text;
    }
  }

  const parsed = parseJSON(text || "{}") || {};
  let items = parsed.catering || [];

  try {
    const linksToVerify: string[] = [];
    items.forEach((i: any) => { if (i.purchaseUrl) linksToVerify.push(i.purchaseUrl); });
    
    if (linksToVerify.length > 0) {
      const verifyRes = await fetch('/api/verify-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: [...new Set(linksToVerify)] })
      });
      
      if (verifyRes.ok) {
        const verificationResults = await verifyRes.json();
        const validUrls = new Set(verificationResults.filter((v: any) => v.ok).map((v: any) => v.url));
        items = items.filter((i: any) => !i.purchaseUrl || validUrls.has(i.purchaseUrl));
      }
    }
  } catch (verifyError) {
    console.error("Failed to verify links:", verifyError);
  }

  return items;
};
