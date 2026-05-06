import { getGeminiClient, MODEL_NAME } from "../../geminiClient";
import { parseJSON } from "../../utils";

export const travelLodging = async (scenes: any[], location?: string) => {
  if (!scenes) throw new Error("scenes are required for travelLodging");

  const ai = getGeminiClient();
  const MODEL = MODEL_NAME;

  const responseStream = await ai.models.generateContentStream({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: `Location: ${location}\nScenes: ${JSON.stringify(scenes)}` }] }],
    config: { 
      maxOutputTokens: 8192,
      systemInstruction: `Purpose: Coordinate travel and lodging logistics based on shoot location and schedule.
      
SEARCH GROUNDING:
- Use Google Search to find LIVE hotels, current flight pricing (estimates), and actual car rental availability in ${location}.
- Prioritize reputable travel platforms (Expedia, Booking.com, Kayak, Google Flights, Hertz, Enterprise, etc.).
- Ensure all provided URLs are REAL and lead directly to the service or search results.

CRITICAL GUIDELINES:
- Provide direct, working links.
- For lodging, find options near ${location}.
- For ground transport, include car rentals or local shuttle services.
- Return a JSON object with a 'logistics' key containing an array of items.`,
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
  let items = parsed.logistics || [];

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
