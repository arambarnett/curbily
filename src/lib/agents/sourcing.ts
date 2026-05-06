import { getGeminiClient, MODEL_NAME } from "../geminiClient";
import { parseJSON } from "../utils";

export const sourcing = async (scenes: any[], location: string = "Los Angeles, CA", category?: string, budgetItems: any[] = [], agentInstructions?: string) => {
  if (!scenes) throw new Error("scenes are required for sourcing");

  const ai = getGeminiClient();

  const model = MODEL_NAME;
  const result: any = {
    venues: [], gear: [], props: [], wardrobe: [], permitContacts: [], permitSummary: ""
  };

  const commonContext = `
Target Location: ${location}
Budget Context: ${JSON.stringify(budgetItems)}
Script Breakdown (Scenes): ${JSON.stringify(scenes.map(s => ({ title: s.title, description: s.description, location: s.location, time: s.time })))}
${agentInstructions ? `SPECIAL USER INSTRUCTIONS: ${agentInstructions}` : ''}
  `.trim();

  // Helper for internal phases to ensure SERIALIZED execution
  const runPhase = async (phaseName: string, phaseInstruction: string, manifestContext?: string) => {
    console.log(`[Sourcing Agent] Running Phase: ${phaseName}...`);
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ 
          role: "user", 
          parts: [{ 
            text: `${commonContext}\n\n${manifestContext ? `PRODUCTION MANIFEST:\n${manifestContext}\n\n` : ''}MISSION (PHASE: ${phaseName}):\n${phaseInstruction}\n\nReturn EXACTLY a JSON object. No markdown, no preamble.` 
          }] 
        }],
        config: { 
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }]
        },
      });

      const text = response.text || "{}";
      return parseJSON(text);
    } catch (err) {
      console.error(`Phase ${phaseName} failed:`, err);
      return {};
    }
  };

  // Phase 0: Sourcing Manifest (Exhaustive analysis)
  const manifestData = await runPhase('Manifest Extraction', `
    Analyze the script breakdown and scenes. 
    You MUST walk through EVERY SINGLE SCENE one by one and identify requirements.
    DO NOT skip any scenes. DO NOT generalize. 
    If a scene has a "Table", it's a prop. If a character is "Wearing a suit", it's wardrobe.
    If a scene needs a "Camera Crane", it's gear.
    Create an EXHAUSTIVE list of every physical item and service needed.
    Include specific prop descriptions, specialized gear (e.g. "Steadicam", "Underwater housing"), 
    wardrobe requirements for EVERY character (list them by character name), and unique venue requirements.
    Return ONLY the following keys in your JSON object: 
    - neededVenues (list of descriptions)
    - neededProps (list of specific items)
    - neededGear (list of technical equipment)
    - neededWardrobe (list of outfits/styles per character)
  `);
  const manifestString = JSON.stringify(manifestData);

  // Phase 1: Permits & Contacts
  if (!category || category === 'permits') {
    const permitData = await runPhase('Permits & Legal', `
      Research specific film permit requirements for ${location}.
      Provide application fees, timelines, and insurance minimums.
      Provide permitContacts with Entity Name, URL, Phone, and specific film coordinator EMAIL.
      Return keys: permitContacts (array), permitSummary (string).
    `, manifestString);
    result.permitContacts = permitData.permitContacts || [];
    result.permitSummary = permitData.permitSummary || "";
  }

  // Phase 2: Venues
  if (!category || category === 'venues') {
    const venueData = await runPhase('Venue Sourcing', `
      Search for REAL-WORLD film locations in ${location} that EXACTLY match the aesthetic and functional needs of the manifest venues: ${manifestData.neededVenues?.join(', ')}.
      PRIORITIZE HIGH-CONVERSION READINESS: Look for spaces on Peerspace, Giggster, or Tagvenue that explicitly mention "production", "filming", or "photo shoot".
      SPECIFICITY RULE: If the manifest asks for a "Dilapidated Warehouse", search exactly for that, plus "industrial filming location ${location}". 
      If it's for a "Micro Drama", prioritize high-production-value residential interiors (lofts, modern apartments, mid-century homes) that offer deep perspective.
      Search for EACH specific venue requirement separately. Return at least 3 distinct options for each requirement.
      Return keys: venues (array of objects with: title, description, price, purchaseUrl, imageUrl).
    `, manifestString);
    result.venues = venueData.venues || (Array.isArray(venueData) ? venueData : []);
  }

  // Phase 3: Gear
  if (!category || category === 'gear') {
    const gearData = await runPhase('Gear & Tech Sourcing', `
      Source the specific technical gear identified: ${manifestData.neededGear?.join(', ')}.
      SEARCH GROUNDING: Look for rentals in ${location} at ShareGrid, KitSplit, or local rental houses.
      Return keys: gear (array of objects with: title, description, price, purchaseUrl, imageUrl).
    `, manifestString);
    result.gear = gearData.gear || (Array.isArray(gearData) ? gearData : []);
  }

  // Phase 4: Props & Wardrobe
  if (!category || category === 'props' || category === 'wardrobe') {
    const itemsData = await runPhase('Props & Wardrobe Sourcing', `
      Source EVERY specific prop from manifest: ${manifestData.neededProps?.join(', ')} 
      AND EVERY wardrobe item: ${manifestData.neededWardrobe?.join(', ')}.
      YOU MUST RETURN A LINE FOR EVERY ITEM IN THE MANIFEST. DO NOT BUNDLE OR OMIT.
      Return keys: props (array), wardrobe (array). 
      Format each as objects with: title, description, price, purchaseUrl, imageUrl.
    `, manifestString);
    if (!category || category === 'props') result.props = itemsData.props || [];
    if (!category || category === 'wardrobe') result.wardrobe = itemsData.wardrobe || [];
  }

  return result;
};

