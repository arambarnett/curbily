import { getGeminiClient, MODEL_NAME } from "../geminiClient";
import { parseJSON } from "../utils";

export const budget = async (
  scenes: any[], 
  isSAG: boolean = false, 
  location: string = "", 
  availablePersonnel?: any[], 
  contentType: string = "feature", 
  permitSummary?: string, 
  scheduleDays?: any[],
  unionRates?: any[],
  targetBudget: number = 0,
  sourcingData?: any,
  budgetTier?: string,
  onProgress?: (message: string) => void,
  existingItems: any[] = []
) => {
  if (!scenes) throw new Error("scenes are required for budget");

  const ai = getGeminiClient();
  const MODEL = MODEL_NAME;

  const manualItems = existingItems.filter(i => i.status === 'manual');

  const baseInstruction = `DATASET RULES, THRESHOLDS, AND EFFECTIVE WINDOWS:
A) SAG-AFTRA / DGA / WGA / IATSE: Use industry-standard rules to assign correct scale rates based on tier.
F) Non-Union Skeleton Crew: Use bare minimum industry standard rates for a non-union shoot.

BUDGET SNAPSHOT & LOCKING (CRITICAL):
- You have been provided with 'manualItems' which are lines manually added or edited by the user.
- DO NOT duplicate any item that is already covered by a manualItem.
- DO NOT propose an alternative for a manualItem. Treat manualItems as "LOCKED".
- Your job is to fill in the GAPS around the manualItems to create a complete, professional budget.
- The user's manual work MUST be preserved.

BUDGET NORMALIZATION:
Map the target budget to the canonical tier. The specified tier for this project is: "${budgetTier || 'Non-Union Skeleton Crew'}". 
If the user's selected tier mismatches the mathematical budget target (e.g. target is $1M but tier is Micro-Budget), anchor the crew rates strictly to the specified tier (${budgetTier || 'Non-Union Skeleton Crew'}) and flag it in the description details.
CRITICAL FORMAT OVERRIDE: 
- If the content type is "feature", "tv_series", or "commercial", you MUST use standard industry or union (SAG-AFTRA, DGA, IATSE, Teamsters) scale minimum rates based on the exact budget tier ("${budgetTier || 'Non-Union Skeleton Crew'}". Do NOT use arbitrarily low custom rates or flat indie day rates for these formats. The film's exact budget tier determines the scale.
- If the content type is "digital_series", "social_media", "short", or the tier is strictly "Non-Union Skeleton Crew" or "Micro-Budget", you MUST use non-union or freelance flat-day rates rather than strict union scale.

KEY RULES:
- BE EXHAUSTIVE: Do NOT omit any obvious roles (e.g. 1st AD, Script Supervisor, PAs). If the shoot lasts more than 1 day, ensure you have multiple days of payroll.
- PREVENT SHRINKAGE: On reruns, do NOT optimize by removing items. Every production requires a full crew. If the budget is tight, lower the rates, do NOT remove the roles.
- TIERED ESTIMATION FOR EVERYTHING: You must generate \`rateLow\`, \`rateMedium\`, and \`rateHigh\` for EVERY item. 
- PRIORITIZE SOURCED DATA: You have been provided 'sourcingData' (venues, gear, props, wardrobe). You MUST create individual line items for EACH item in the sourcingData arrays using the exact actual cost as the \`rate\`, and extrapolate rateLow/rateHigh based on that baseline. Description should cite "Sourced marketplace link".
- CURBILY PRODUCTION SUITE: Always include a line item for "Curbily Production Suite" under "Production Operations & Supplies" at a fixed rate of $39.
- PERMITS & CONTINGENCY: Include dedicated line items for Contingency (usually 10-15% of total budget) and all needed Permits from permitSummary.
- TARGET ALIGNMENT: Adjust the total budget to closely approximate the user's \`targetBudget\` if provided. Ensure the COMBINED total (manualItems + your new items) matches the target.
- STRICT DAYS CONSTRAINT: Calculate the TOTAL SHOOT DAYS from \`scheduleDays\`. For rentals, crew, and daily costs, the \`quantity\` MUST NOT arbitrarily exceed the actual total shoot days plus reasonable prep/wrap days. Equipment rentals should align exactly with the shooting schedule. Do not inflate days just to hit the target budget.
- PRODUCER CONSTANT: Be realistic about the number of producers. A skeleton crew or indie film usually has 1-3 producers. Do not over-saturate this category.
- VFX GRANULARITY: Provide granular line items for VFX (e.g. Roto/Paint, Compositing, 3D Tracking, Data Wrangler) rather than one massive "VFX Shots" line. 
- AVAILABLE PERSONNEL RATES MUST BE RESPECTED: If a person in 'availablePersonnel' has a non-zero day rate, you MUST use that day rate as the base \`rate\`, and ignore union scale. If they don't have a rate, default to union/tier scale.
- ONE LINE ITEM PER PERSON: Do absolutely NOT merge multiple names into the 'personName' field. Each person MUST have their own single line item. Keep 'personName' extremely short and concise (e.g. "John Doe").
- WEEKLY RATES TO DAILY: If a role has a weekly rate but the schedule dictates they are working a certain number of days (the quantity is in days), you MUST divide the weekly rate by 5 to determine their daily rate (accounting for union rules and 5-day work weeks). Output only the base daily rate in the 'rate' property and use 'days' for the 'unit' property.
- PERSONNEL: You MUST explicitly include line items for EVERY SINGLE cast member and crew role mentioned or implied by the scenes, script context, availablePersonnel, or schedule. Do NOT assume characters are extras if they have dialogue. Every character with a name in the script breakdown MUST have their own 'Cast' line item.
- MICRO DRAMA SPECIALIZATION: For projects with ContentType "micro_drama" or ContentType "digital_series", do NOT use arbitrary minimums. You MUST still perform a full professional breakdown. The budget should reflect the actual scope of the script, including all necessary local location rentals, specialized equipment, and a full professional crew (1st AD, Sound Mixer, Gaffer, etc.), even if the target budget is low. If the target budget is tight, lower the day rates for everyone, but do NOT omit the roles.
- NO BUNDLING: Absolutely DO NOT bundle costs together. Every individual expense must be its own distinct line item (e.g. separate line items for 'General Liability Insurance', 'Fire Marshal Fees', 'Location Permits' rather than a single 'Insurance & Permits' line).
- VENUE/LOCATION SOURCING: If venue pricing is not in 'sourcingData', you MUST perform an intelligent market evaluation for ${location}. For 'micro_drama', prioritize high-production-value but cost-effective residential locations or small studio spaces.
- TARGET ALIGNMENT: Adjust the total budget to closely approximate the user's targetBudget if provided. Ensure the COMBINED total (manualItems + your new items) matches the target. 
- PRODUCER/DIRECTOR FEES: Ensure producers and directors are accounted for fairly regardless of tier.
- WORK DESCRIPTION: Ensure the details field for every item describes specifically what that person/item is doing for THIS specific script (e.g. "Managing 4 heavy dialogue scenes in the loft" instead of generic "Sound Mixer").
- CATEGORY EXACT MATCHING: The category property MUST be one of the following exact strings: "Cast", "Stunts", "Producers", "Directors", "Writers", "Camera", "Grip", "Electric", "Art Department", "Wardrobe", "Hair & Makeup", "Sound", "Locations", "Editing", "VFX", "Coloring", "Sound Mixing", "Permits", "Insurance", "Legal", "Production Operations & Supplies", "Contingency".
- VENUE COSTS: If not available in sourcingData, use market rates for ${location}. Larger places $2,500-$15k/day.`;

  const commonContext = JSON.stringify({ 
    scenes, 
    isSAG, 
    location, 
    availablePersonnel, 
    contentType, 
    permitSummary, 
    scheduleDays: scheduleDays || [],
    unionRates: unionRates || [],
    targetBudget,
    sourcingData: sourcingData || {},
    budgetTier: budgetTier || "Non-Union Skeleton Crew",
    manualItems: manualItems.map(i => ({ category: i.category, description: i.description, amount: i.amount }))
  });

  const responseSchema = {
    type: "ARRAY" as any,
    items: {
      type: "OBJECT" as any,
      properties: {
        category: { type: "STRING" as any },
        description: { type: "STRING" as any, description: "The overarching description of this item. E.g., SAG-AFTRA Day Player" },
        details: { type: "STRING" as any, description: "Expanded details, reasoning, pricing source." },
        personName: { type: "STRING" as any },
        characterName: { type: "STRING" as any },
        contactId: { type: "STRING" as any },
        rate: { type: "NUMBER" as any, description: "The base rate used for final budget calculation" },
        rateLow: { type: "NUMBER" as any, description: "Low-end estimate or minimum union scale for this line item" },
        rateMedium: { type: "NUMBER" as any, description: "Medium-end standard market estimate for this line item" },
        rateHigh: { type: "NUMBER" as any, description: "High-end or premium tier estimate for this line item" },
        quantity: { type: "NUMBER" as any },
        unit: { type: "STRING" as any },
        amount: { type: "NUMBER" as any },
        tier: { type: "STRING" as any, description: "The industry tier applied" },
        sourcingLink: { type: "STRING" as any, description: "If sourced from marketplace, provide the URL" },
        hourlyRate: { type: "NUMBER" as any, description: "If a venue, personnel or rental has an hourly rate, specify it here." },
        dayRate: { type: "NUMBER" as any, description: "If a venue, personnel or rental has a day rate, specify it here." }
      },
      required: ["category", "description", "rate", "rateLow", "rateMedium", "rateHigh", "quantity", "unit", "amount", "tier"]
    }
  };

  const generateChunk = async (agentName: string, focus: string, retries = 2) => {
    if (onProgress) onProgress(`[${agentName}] Analyzing ${focus}...`);
    
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model: MODEL,
          contents: [{ role: "user", parts: [{ text: commonContext }] }],
          config: { 
            maxOutputTokens: 8192,
      responseMimeType: "application/json",
                        systemInstruction: `Purpose: You are the ${agentName}. Generate EXHAUSTIVE, highly detailed budget line items strictly for: ${focus}.
            ${baseInstruction}
            OUTPUT: Return a flat JSON array of budget line items with correct rate, quantity, and unit. DO NOT return items outside of your focus area.`,
            responseSchema
          },
        });
        return parseJSON(res.text || "[]") || [];
      } catch (e) {
        console.error(`Error in ${agentName} (Attempt ${attempt}/${retries + 1}):`, e);
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

  // Step 1: Run Subagents in Parallel
  if (onProgress) onProgress("Initializing Subagents Pipeline...");

  const [aboveTheLine, production, postAndOps] = await Promise.all([
    generateChunk("Above-The-Line Agent", "Cast, Stunts, Producers, Executive Producers, Directors, and Writers. Include individual talent fees based on 'availablePersonnel', union tier minimums, and scene breakdown."),
    generateChunk("Production & Below-The-Line Agent", "Camera, Grip, Electric, Art Department, Wardrobe, Hair/Makeup, Sound, and specific Locations/Venues from 'sourcingData'."),
    generateChunk("Post-Production & Operations Agent", "Editing, VFX, Coloring, Sound Mixing, Permits (from permitSummary), Insurance, Legal, Catering, and standard Production Operations & Supplies.")
  ]);

  let combinedChunks = [...aboveTheLine, ...production, ...postAndOps];

  // Step 2: CFO Master Agent
  if (onProgress) onProgress("[CFO Master Agent] Reviewing line items and auditing math against Target Budget...");
  
  let finalBudget: any[] = [];
  let cfoRetries = 2;
  
  for (let attempt = 1; attempt <= cfoRetries + 1; attempt++) {
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
                    systemInstruction: `Purpose: You are the CFO Master Agent.
You are given the combined budget line items from 3 sub-agents ('initialChunks').
Your job is to:
1. REVIEW the items. Fix any math errors (amount must equal rate * quantity) and adjust rates if they are wildly inappropriate.
2. DISCOVER TARGET BUDGET BLINDSPOTS: Compare the total sum of all items (including manualItems from context) against the Target Budget of $${targetBudget.toLocaleString()}. 
3. If the total is severely under-budget, ADD missing industry-standard line items (e.g. Contingency, Completion Bond, PR/Marketing, legal buffers, additional days, higher standard equipment packages) to realistically hit the target budget while adhering to the specified tier (${budgetTier || 'Non-Union Skeleton Crew'}). Do not just add a "Misc" line—add explicit realistic professional items until the target budget is reasonably matched. 
4. If it's over budget, intelligently trim unessential crew or days.
5. You MUST ensure union minimums correspond to ${budgetTier || 'Non-Union Skeleton Crew'}.
6. CRITICAL: PRESERVE MANUAL ITEMS. If the context contains 'manualItems', ensure they are not replaced or contradicted. Your output should only contain NEW or UPDATED non-manual items. (Note: the budget rendering logic will merge your output with manual items, so you should focus on the gaps).

${baseInstruction}

OUTPUT: Return the FINAL exhaustive flat JSON array of budget line items (excluding the manualItems, as the frontend will merge them).`,
          responseSchema
        },
      });

      if (onProgress) onProgress("[CFO Master Agent] Budget Finalized.");
      finalBudget = parseJSON(cfoResponse.text || "[]") || [];
      break; // break retry loop on success
    } catch (e) {
      console.error(`Error in CFO Master Agent (Attempt ${attempt}/${cfoRetries + 1}):`, e);
      if (attempt <= cfoRetries) {
        if (onProgress) onProgress(`[CFO Master Agent] Error occurred. Retrying (${attempt}/${cfoRetries})...`);
        await new Promise(r => setTimeout(r, 2000 * attempt)); // Exponential backoff
      } else {
        if (onProgress) onProgress(`[CFO Master Agent] Failed after ${cfoRetries + 1} attempts. Returning combined chunks.`);
      }
    }
  }

  // Base fallback if something goes wrong
  return finalBudget.length > 0 ? finalBudget : combinedChunks;
};
