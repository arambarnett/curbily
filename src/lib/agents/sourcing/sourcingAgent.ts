import { getGeminiClient, MODEL_NAME } from "../../geminiClient";
import { parseJSON } from "../../utils";

export const executeSourcingCategory = async (
  scenes: any[],
  location: string,
  category: string,
  budgetItems: any[],
  agentInstructions?: string
) => {
  const ai = getGeminiClient();
  const FLASH_MODEL = MODEL_NAME;

  const categoryInstruction = `FOCUS: Only source items for the "${category.toUpperCase()}" category. DO NOT suggest items for other categories. Spend your entire token budget and search effort on ${category.toUpperCase()}. Provide 10-15 varied, high-quality options if possible to ensure script coverage without exceeding output token limits.`;

  const systemInstruction = `You are the Production Sourcing & Specialized Marketplace Agent. Your mission is to find EXACT, REAL-WORLD items (venues, gear, props, wardrobe) with DIRECT PURCHASE/RENTAL LINKS and CURRENT MARKET PRICES.

${categoryInstruction}

SEARCH GROUNDING & URL STRICTNESS:
- You MUST use Google Search for EVERY item to find a specific product page or rental listing.
- STATED GOAL: Provide an EXHAUSTIVE list of every prop, wardrobe item, and gear piece mentioned in the script. DO NOT summarize. If the script mentions 20 props, source 20 props.
- PEERSPACE LINKING: For locations, you MUST prioritize Peerspace, Giggster, or similar platforms. You MUST use Google Search to find exact listings. The venue "purchaseUrl" MUST be a direct link to a specific listing.
- VENUE PRICING: You MUST check the actual listing page and extract the real hourly or daily price from the platform. Do NOT guess prices. Give real prices for venues.
- DEPRIORITIZE AMAZON: Avoid Amazon links where possible (score them lower during search). User reports too many 404s/expired links from Amazon.
- PREFERRED RETAILERS: Prioritize specialized marketplaces like B&H, Adorama, ShareGrid, KitSplit, West Elm, IKEA (for props), specialized wardrobe retailers (Zappos, Nordstrom, etc.), or direct brand/retailer sites.
- FORBIDDEN: Do NOT return generic site URLs (e.g., bhphotovideo.com, homedepot.com).
- MANDATORY: Every URL MUST be a direct link to a SPECIFIC ITEM.
- LINK VERIFICATION: Before returning a link, you MUST ensure it is a valid, usable product page.

PRICING ACCURACY:
- You MUST extract the EXACT price listed on the product page.
- DO NOT provide "estimates" like "Approx $100". Use the actual number: 124.99.
- For gear, check daily rental rates on ShareGrid or KitSplit.
- For props/wardrobe, check B&H, Adorama, or specialized film prop houses.

PERMIT & LEGAL COMPLIANCE RESEARCH:
- Your MISSION includes researching specific film permit LAWS and REQUIREMENTS for ${location}.
- SEARCH GROUNDING: You MUST perform a targeted search for "[City] filming permits".
- MANDATORY: In "permitSummary", provide a detailed breakdown of PERMISSION LEVEL, TIMELINE, INSURANCE, and FEES.
- "permitContacts": Provide an EXHAUSTIVE list of the specific departments (Film Office, Police, Fire, Parks) involved.

${agentInstructions ? `SPECIAL USER INSTRUCTIONS: ${agentInstructions}` : ''}

Return a JSON object with keys: venues, gear, props, wardrobe, permitContacts, permitSummary.`;

  const responseStream = await ai.models.generateContentStream({
    model: FLASH_MODEL,
    contents: [{ 
      role: "user", 
      parts: [{ 
        text: `Target Location: ${location}\nRequested Category: ${category}\nBudget Context: ${JSON.stringify(budgetItems)}\nScript Breakdown (Scenes): ${JSON.stringify(scenes)}` 
      }] 
    }],
    config: { 
      maxOutputTokens: 8192,
      systemInstruction,
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }]
    },
  });

  let text = '';
  for await (const chunk of responseStream) {
    if (chunk.text) text += chunk.text;
  }
  try {
    const parsed = parseJSON(text) || {};
    return Array.isArray(parsed) ? parsed : (parsed[category] || []);
  } catch (e) {
    const match = text.match(/\\{[\\s\\S]*\\}/);
    if (match) {
      try {
        const p = parseJSON(match[0]);
        return p[category] || [];
      } catch (inner) {}
    }
    return [];
  }
};
