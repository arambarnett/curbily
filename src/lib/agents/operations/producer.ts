import { parseJSON } from "../../utils";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

export const producer = async (query: string, context: any) => {
  if (!query) throw new Error("query is required for producer");

  const apiKey = ((process.env.GEMINI_API_KEY || process.env.API_KEY) || "") as string;
  

  const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key', httpOptions: { baseUrl: typeof window !== 'undefined' ? window.location.origin + (window.location.pathname.startsWith('/projects') ? '/projects/gemini-api-proxy/' : '/gemini-api-proxy/') : 'http://localhost:3000/gemini-api-proxy/' } });
  const MODEL = "models/gemini-3-flash-preview";

  const responseSchema = {
    type: "OBJECT" as any,
    properties: {
      status: { type: "STRING" as any, enum: ["ok", "error"] },
      result: { type: "STRING" as any, description: "A highly concise summary of actions taken." },
      invokedSubagents: { 
        type: "ARRAY" as any, 
        items: { type: "STRING" as any }
      },
      errors: {
        type: "ARRAY" as any,
        items: { type: "STRING" as any }
      },
      suggestedActions: {
        type: "ARRAY" as any,
        description: "List of actions. If adding sourcing items, include EVERY item from sourcingData the user asked for.",
        items: {
          type: "OBJECT" as any,
          properties: {
            type: { 
              type: "STRING" as any, 
              enum: [
                "updateProject", "addScene", "updateScene", "deleteScene", 
                "addBudgetItem", "updateBudgetItem", "deleteBudgetItem", 
                "updateSchedule", "addContact", "updateContact", 
                "addVenue", "updateVenue", "addGear", "updateGear", 
                "addProp", "updateProp", "addWardrobe", "updateWardrobe",
                "runBreakdown", "runSchedule", "runBudget", "runSourcing", "runShotList"
              ] 
            },
            reason: { type: "STRING" as any },
            payload: { 
              type: "OBJECT" as any,
              properties: {
                id: { type: "STRING" as any },
                category: { type: "STRING" as any },
                description: { type: "STRING" as any },
                personName: { type: "STRING" as any },
                rate: { type: "NUMBER" as any },
                quantity: { type: "NUMBER" as any },
                unit: { type: "STRING" as any },
                amount: { type: "NUMBER" as any },
                name: { type: "STRING" as any },
                location: { type: "STRING" as any },
                price: { type: "NUMBER" as any },
                status: { type: "STRING" as any },
                hourlyRate: { type: "NUMBER" as any },
                dayRate: { type: "NUMBER" as any }
              }
            }
          },
          required: ["type", "payload"]
        }
      }
    },
    required: ["status", "result"]
  };

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: `Query: ${query}\n\nContext: ${JSON.stringify(context)}\n\n${context.project?.agentInstructions ? `SPECIAL USER INSTRUCTIONS (CRITICAL): ${context.project.agentInstructions}` : ''}` }] }],
    config: { 
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      systemInstruction: `You are the Production Assistant (Executive Producer) orchestrator.
      
GOAL: High-fidelity orchestration of production data and agents.
      
SOURCING INTEGRATION (TOP PRIORITY):
- When asked to "add sourcing to budget", loop through context.sourcing items (venues, gear, props, wardrobe).
- Emit individual 'addBudgetItem' actions for EACH item found in sourcing.
- Use the item's name/description as 'description'.
- Use 'cost' or 'dayRate' as 'rate'.
- Set 'quantity' to 1 (or appropriate based on schedule).
- Set 'amount' to rate * quantity.
- Set 'status' to 'manual' for these items so they are preserved in budget reruns.

UPDATING BUDGET:
- After suggesting individual items, suggest a 'runBudget' action to refresh the top-sheet and summary.
- The user must approve 'runBudget' AFTER approving individual items.

CRITICAL RULES:
- If you say you are adding something in 'result', it MUST be present in 'suggestedActions'.
- NEVER talk about actions without emitting them.
- Be EXTREMELY CONCISE in the 'result' field.
- Ensure JSON is perfectly formed and not truncated.`,
      responseSchema
    },
  });

  try {
    const text = response.text || "{}";
    const parsed = parseJSON(text);
    if (!parsed || Object.keys(parsed).length === 0) {
      return {
        status: "error",
        result: "I'm sorry, I couldn't process that request properly.",
        errors: ["Agent returned empty or invalid response"],
        suggestedActions: []
      };
    }
    return parsed;
  } catch (error) {
    console.error("Producer response parsing failed:", error);
    return {
      status: "error",
      result: "I encountered an error while parsing my own thoughts. Please try again.",
      errors: [error instanceof Error ? error.message : "JSON parsing failed"],
      suggestedActions: []
    };
  }
};
