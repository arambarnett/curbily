import { getInstruction } from './utils';
import { generateBudgetChunk } from './chunkAgent';
import { executeCfoReview } from './cfoAgent';

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

  const baseInstruction = getInstruction(budgetTier || "Non-Union Skeleton Crew", location);
  const manualItems = existingItems.filter(i => i.status === 'manual');

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
        unit: { type: "STRING" as any, enum: ["day", "week", "flat", "item", "hour", "month"] },
        amount: { type: "NUMBER" as any },
        tier: { type: "STRING" as any, description: "The industry tier applied" },
        sourcingLink: { type: "STRING" as any, description: "If sourced from marketplace, provide the URL" },
        hourlyRate: { type: "NUMBER" as any, description: "If a venue, personnel or rental has an hourly rate, specify it here." },
        dayRate: { type: "NUMBER" as any, description: "If a venue, personnel or rental has a day rate, specify it here." }
      },
      required: ["category", "description", "rate", "rateLow", "rateMedium", "rateHigh", "quantity", "unit", "amount", "tier"]
    }
  };

  // Execute chunk agents Serially per user request
  if (onProgress) onProgress("Initializing Subagents Pipeline (Serial Execution)...");

  const aboveTheLine = await generateBudgetChunk(
    "Above-The-Line Agent", 
    "Cast, Stunts, Producers, Executive Producers, Directors, and Writers. Include individual talent fees based on 'availablePersonnel', union tier minimums, and scene breakdown.",
    commonContext, baseInstruction, responseSchema, 2, onProgress
  );

  const production = await generateBudgetChunk(
    "Production & Below-The-Line Agent", 
    "Camera, Grip, Electric, Art Department, Wardrobe, Hair/Makeup, Sound, and specific Locations/Venues from 'sourcingData'.",
    commonContext, baseInstruction, responseSchema, 2, onProgress
  );

  const postAndOps = await generateBudgetChunk(
    "Post-Production & Operations Agent", 
    "Editing, VFX, Coloring, Sound Mixing, Permits (from permitSummary), Insurance, Legal, and standard Production Operations & Supplies. DO NOT include Catering or Travel.",
    commonContext, baseInstruction, responseSchema, 2, onProgress
  );

  let combinedChunks = [...aboveTheLine, ...production, ...postAndOps];

  const finalBudget = await executeCfoReview(
     combinedChunks, targetBudget, budgetTier || "Non-Union Skeleton Crew", commonContext, baseInstruction, responseSchema, 2, onProgress
  );

  return finalBudget.length > 0 ? finalBudget : combinedChunks;
};
