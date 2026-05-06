import { getGeminiClient, MODEL_NAME } from "../../geminiClient";
import { parseJSON } from "../../utils";

export const sourcing = async (scenes: any[], location: string = "Los Angeles, CA", category?: string, budgetItems: any[] = [], agentInstructions?: string) => {
  if (!scenes) throw new Error("scenes are required for sourcing");

  const ai = getGeminiClient();
  const MODEL = MODEL_NAME;

  // Phase 1: Manifest Extraction
  // We extract a clean manifest of all required items first to ensure exhaustiveness
  const manifestSystemInstruction = `You are a Production Asset Architect. Your task is to extract a DEEP, EXHAUSTIVE MANIFEST of every required production asset from the provided script breakdown.

  CRITICAL DIRECTIVE:
  - Extract ALL unique Venues/Locations.
  - Extract ALL Equipment/Gear.
  - Extract ALL Props.
  - Extract ALL Wardrobe requirements.
  
  DESCRIPTIVE TITLES: 
  For Wardrobe and Props, do NOT use generic names. Include the character or context.
  - BAD: "Dress"
  - GOOD: "Protagonist's Wedding Dress (Scene 4-12)"
  - GOOD: "Police Uniform - Lead Officer"

  Return a clean JSON manifest.`;

  const manifestSchema: any = {
    type: "object",
    properties: {
      venueNames: { type: "array", items: { type: "string" } },
      gearNames: { type: "array", items: { type: "string" } },
      propNames: { type: "array", items: { type: "string" } },
      characterWardrobe: { type: "array", items: { type: "string" } }
    },
    required: ["venueNames", "gearNames", "propNames", "characterWardrobe"]
  };

  const manifestResp = await ai.models.generateContent({ 
    model: MODEL,
    contents: `Location: ${location}\nScript Breakdown: ${JSON.stringify(scenes)}`,
    config: { 
      responseMimeType: "application/json", 
      responseSchema: manifestSchema,
      systemInstruction: manifestSystemInstruction
    }
  });

  const manifestText = manifestResp.text;
  const manifest = parseJSON(manifestText) || { venueNames: [], gearNames: [], propNames: [], characterWardrobe: [] };

  // Phase 1.5: Detailed Validation & Logging
  console.log(`[Sourcing] Manifest extraction raw text length: ${manifestText.length}`);
  
  // Validation: If manifest is empty, research will be pointless
  const totalItems = (manifest.venueNames?.length || 0) + (manifest.gearNames?.length || 0) + (manifest.propNames?.length || 0) + (manifest.characterWardrobe?.length || 0);
  
  console.log(`[Sourcing] Manifest items extracted: 
    - Venues: ${manifest.venueNames?.join(', ') || 'None'}
    - Gear: ${manifest.gearNames?.join(', ') || 'None'}
    - Props: ${manifest.propNames?.join(', ') || 'None'}
    - Wardrobe: ${manifest.characterWardrobe?.join(', ') || 'None'}
  `);
  
  if (totalItems === 0 && !category) {
    console.warn("Manifest extraction returned 0 items from breakdown. Research phase skipped.");
    return { venues: [], gear: [], props: [], wardrobe: [], permitContacts: [], permitSummary: "No items found in breakdown to source. Please ensure your breakdown is detailed." };
  }

  // Phase 2: Research
  // We now research each category with grounding for maximum precision
  const systemInstruction = `You are a Professional Production Sourcing Agent. 
  
  MISSION: Find real-world sourcing options for the provided production manifest in ${location}.
  
  TARGET LOCATION: ${location}

  SOURCE LINKS & PRICING:
  - Every item MUST have a 'purchaseUrl' which is a direct link to the product or booking page.
  - EVERY item must have an accurate price. Use REAL market prices.
  - For Venues/Gear: Populate 'hourlyRate' or 'dayRate' based on real listings.
  - For Wardrobe: Ensure titles are descriptive (e.g., "Character Name - Description of Outfit").

  JSON FORMAT: Return ONLY valid JSON.
  
  PERMIT RESEARCH:
  - Summarize the specific film permit requirements for ${location}.`;

  const optionSchema: any = {
    type: "object",
    properties: {
      store: { type: "string" },
      price: { type: "number" },
      url: { type: "string" }
    },
    required: ["store", "url"]
  };

  const itemSchema: any = {
    type: "object",
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      cost: { type: "number" },
      price: { type: "number" },
      purchaseUrl: { type: "string" },
      platform: { type: "string" },
      hourlyRate: { type: "number" },
      dayRate: { type: "number" },
      requiresPermit: { type: "boolean" },
      category: { type: "string" },
      source: { type: "string", description: "'rental' or 'purchase'" },
      options: { type: "array", items: optionSchema }
    },
    required: ["name"]
  };

  const responseSchema: any = {
    type: "object",
    properties: {
      venues: { type: "array", items: itemSchema },
      gear: { type: "array", items: itemSchema },
      props: { type: "array", items: itemSchema },
      wardrobe: { 
        type: "array", 
        items: {
          ...itemSchema,
          properties: {
            ...itemSchema.properties,
            character: { type: "string" }
          }
        }
      },
      permitContacts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            office: { type: "string" },
            contact: { type: "string" },
            link: { type: "string" }
          }
        }
      },
      permitSummary: { type: "string" }
    },
    required: ["venues", "gear", "props", "wardrobe"]
  };

  const researchSystemInstruction = `You are a professional film production sourcer. Use Google Search grounding to find real listings. 
    Focus on price accuracy and descriptive naming. Populate rates for venues and gear.
    Ensure 'purchaseUrl' is populated for items found.`;

  console.log(`[Sourcing] Starting comprehensive research phase for ${location}...`);
  
  // Chunking research to prevent "stopping short" and stay within output limits/search quality thresholds
  const researchCategories = [
    { name: 'venues', manifest: manifest.venueNames },
    { name: 'gear', manifest: manifest.gearNames },
    { name: 'props', manifest: manifest.propNames },
    { name: 'wardrobe', manifest: manifest.characterWardrobe }
  ];

  let result: any = {
    venues: [], gear: [], props: [], wardrobe: [], permitContacts: [], permitSummary: ""
  };

  for (const cat of researchCategories) {
    if (!cat.manifest || cat.manifest.length === 0) continue;

    console.log(`[Sourcing] Researching ${cat.name}...`);
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ 
          role: "user", 
          parts: [{ 
            text: `
              Target Location: ${location}
              Budget context: ${JSON.stringify(budgetItems)}
              
              PRODUCTION MANIFEST (Research these ${cat.name.toUpperCase()}):
              ${cat.manifest.join(', ')}
              
              ${agentInstructions ? `USER PREFERENCES: ${agentInstructions}` : ''}
              
              TASK: Find real sourcing options for exactly these items in ${location}. 
              1. Find real day/hourly rates where applicable.
              2. Use the descriptive names from the manifest.
              3. Ensure every item has a direct purchase/rental link.
              4. Provide multiple options if possible.
            `
          }]
        }],
        config: { 
          systemInstruction: researchSystemInstruction,
          responseMimeType: "application/json", 
          responseSchema, // We'll reuse the full schema but only expect the current category to be filled
          maxOutputTokens: 8192,
          tools: [{ googleSearch: {} }]
        }
      });

      const parsed = parseJSON(response.text || "{}");
      if (parsed) {
        if (parsed.venues) result.venues.push(...(parsed.venues || []));
        if (parsed.gear) result.gear.push(...(parsed.gear || []));
        if (parsed.props) result.props.push(...(parsed.props || []));
        if (parsed.wardrobe) result.wardrobe.push(...(parsed.wardrobe || []));
        if (parsed.permitContacts) result.permitContacts.push(...(parsed.permitContacts || []));
        if (parsed.permitSummary && !result.permitSummary) result.permitSummary = parsed.permitSummary;
      }
      
      // Small cooldown to avoid hitting Search API rate limits too hard
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`[Sourcing] Failed to research ${cat.name}:`, e);
    }
  }

  console.log(`[Sourcing] Research complete. Total items found: 
    - Venues: ${result.venues.length}
    - Gear: ${result.gear.length}
    - Props: ${result.props.length}
    - Wardrobe: ${result.wardrobe.length}
  `);

  // Fallback map so "cost" and "source" are consistent for the frontend
  const mapItem = (item: any) => {
    // Priority for cost: explicit cost > dayRate > price > hourlyRate
    const cost = Number(item.cost || item.dayRate || item.price || item.hourlyRate || 0);
    const purchaseUrl = item.purchaseUrl || item.url || (typeof item.source === 'string' && item.source.startsWith('http') ? item.source : "");
    
    // Determine source type
    let sourceType = item.source;
    if (sourceType !== 'rental' && sourceType !== 'purchase') {
      sourceType = (item.dayRate || item.hourlyRate || item.platform) ? 'rental' : 'purchase';
    }

    return {
      name: item.name || item.character || "Unnamed Item",
      ...item,
      cost,
      purchaseUrl,
      source: sourceType,
      hourlyRate: Number(item.hourlyRate || 0),
      dayRate: Number(item.dayRate || 0)
    };
  };

  result.venues = (result.venues || []).map(mapItem);
  result.gear = (result.gear || []).map(mapItem);
  result.props = (result.props || []).map(mapItem);
  result.wardrobe = (result.wardrobe || []).map(mapItem);

  return result;
};
