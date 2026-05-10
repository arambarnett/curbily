import { GoogleGenAI } from "@google/genai";
import { parseJSON } from "../../utils";

export const schedule = async (
  scenes: any[], 
  shots: any[], 
  dayLength: number = 10, 
  contentType: string = "feature", 
  availabilityConstraint: string = "",
  onProgress?: (msg: string) => void,
  budgetData?: any[]
) => {
  if (!scenes || scenes.length === 0) return [];

  const apiKey = "dummy-key";
  const ai = new GoogleGenAI({ 
    apiKey, 
    httpOptions: { 
      baseUrl: typeof window !== 'undefined' ? 
        window.location.origin + (window.location.pathname.startsWith('/projects') ? '/projects/gemini-api-proxy/' : '/gemini-api-proxy/') : 
        'http://localhost:3000/gemini-api-proxy/' 
    } 
  });
  const MODEL = "models/gemini-3-flash-preview";

  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);
  const startDateStr = nextMonth.toISOString().split('T')[0];

  const responseSchema = {
    type: "ARRAY" as any,
    items: {
      type: "OBJECT" as any,
      properties: {
        dayNumber: { type: "NUMBER" as any },
        date: { type: "STRING" as any },
        sceneNumbers: { type: "ARRAY" as any, items: { type: "STRING" as any } },
        estimatedLength: { type: "NUMBER" as any },
        callTime: { type: "STRING" as any },
        setupTime: { type: "NUMBER" as any },
        wrapTime: { type: "NUMBER" as any },
        travelTime: { type: "NUMBER" as any },
        sceneTimes: { 
          type: "ARRAY" as any, 
          items: {
            type: "OBJECT" as any,
            properties: {
              sceneNumber: { type: "STRING" as any },
              durationHours: { type: "NUMBER" as any }
            }
          }
        },
        weather: { type: "STRING" as any },
        adNotes: { type: "STRING" as any },
        sidesOverview: { type: "STRING" as any, description: "A summary of the script portions/sides needed for this day." }
      },
      required: ["dayNumber", "date", "sceneNumbers", "estimatedLength", "sidesOverview"]
    }
  };

  const CHUNK_SIZE = 30;
  const totalScenes = scenes.length;
  let allScheduledDays: any[] = [];
  let remainingScenes = [...scenes];
  let currentStartDay = 1;
  let lastDayDate = startDateStr;

  while (remainingScenes.length > 0) {
    const chunk = remainingScenes.slice(0, CHUNK_SIZE);
    remainingScenes = remainingScenes.slice(CHUNK_SIZE);
    
    if (onProgress) onProgress(`[Scheduling Agent] Scheduling scenes ${allScheduledDays.reduce((acc, d) => acc + (d.sceneNumbers?.length || 0), 0) + 1} to ${allScheduledDays.reduce((acc, d) => acc + (d.sceneNumbers?.length || 0), 0) + chunk.length} of ${totalScenes}...`);

    let chunkResult: any[] = [];
    const retries = 2;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        let promptText = `SCENES TO SCHEDULE (THIS CHUNK): ${JSON.stringify(chunk)}\n`;
        promptText += `PREVIOUSLY SCHEDULED DAYS (CONTEXT): ${JSON.stringify(allScheduledDays.slice(-3))}\n`; // Last 3 days for context
        promptText += `START SCHEDULING FROM: Day ${currentStartDay}, Date ${lastDayDate}\n`;
        promptText += `SHOTLIST (FOR COVERAGE): ${JSON.stringify(shots.filter(s => chunk.some(c => c.sceneNumber === s.sceneNumber)))}\n`;
        promptText += `CONTENT TYPE: ${contentType}\nMAX DAY LENGTH: ${dayLength} hours.\n`;
        
        if (availabilityConstraint) {
          promptText += `\nTEAM & CAST AVAILABILITY: ${availabilityConstraint}\n`;
        }
        if (budgetData && budgetData.length > 0) {
          promptText += `\nBUDGET CONTEXT (Personnel & Resources): ${JSON.stringify(budgetData.slice(0, 50))}\n`; // Limit size
        }

        const response = await ai.models.generateContent({
          model: MODEL,
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          config: { 
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema,
            systemInstruction: `You are a professional Hollywood 1st Assistant Director (AD).
Purpose: Distribute the provided scenes into a shooting schedule starting from the specified Day and Date.

REALISTIC SCHEDULING RULES:
1. MAX DAY LENGTH: Never exceed ${dayLength} hours total.
2. DURATION: Use 0.25 hour increments (15 mins). No random decimals.
3. ADJACENCY: If the last scene of a day and the first scene of the next day are in the same location, setup time is reduced.
4. WEEKEND BREAKS: You MUST skip Saturdays and Sundays. Movies shoot on a 5-day on, 2-day off cycle (unless specified otherwise, but default to 5/2).
5. PRODUCTION SPEEDS (VARY BY TYPE): 
   - Feature Films ($1M+): 2-4 pages per day. A $10M feature should take 20-30 days to shoot if it is 90-120 pages.
   - Micro-Dramas / Vertical Content: 5-8 pages per day (faster, less coverage).
   - Commercials: 1-2 pages per day.
6. PAGE WEIGHTING: Action, Night, Exterior, and cast-heavy scenes take LONGER. Use the page count and complexity to accurately estimate.
7. SIDES: Generate a 'sidesOverview' which is a professional summary of which character's script portions are needed for these specific scenes.

OUTPUT: Return a JSON array of the NEW day objects scheduled for these scenes. Do not repeat previous days.`
          },
        });

        const text = response.text || "[]";
        chunkResult = parseJSON(text) || [];
        if (chunkResult.length > 0) break;
        throw new Error("Empty response from AI");
      } catch (e) {
        console.error(`Schedule Chunk Error (Attempt ${attempt}):`, e);
        if (attempt <= retries) {
          if (onProgress) onProgress(`[Scheduling] Error. Retrying (${attempt}/${retries})...`);
          await new Promise(r => setTimeout(r, 2000 * attempt));
        }
      }
    }

    if (chunkResult.length > 0) {
      allScheduledDays = [...allScheduledDays, ...chunkResult];
      const lastDay = chunkResult[chunkResult.length - 1];
      currentStartDay = (lastDay.dayNumber || allScheduledDays.length) + 1;
      
      // Calculate next working day
      if (lastDay.date) {
        let d = new Date(lastDay.date);
        d.setDate(d.getDate() + 1);
        
        // Ensure the loop for the next chunk starts on a working day
        while (d.getDay() === 0 || d.getDay() === 6) {
          d.setDate(d.getDate() + 1);
        }
        
        lastDayDate = d.toISOString().split('T')[0];
      }
    } else {
      if (onProgress) onProgress(`[Scheduling] Fatal error in chunk. Scene processing may be incomplete.`);
      break; 
    }
  }

  // Final cleanup and formatting
  let formatted = allScheduledDays.map((day, idx) => {
    let sceneNumbers: string[] = day.sceneNumbers || [];
    const sceneTimesObj: Record<string, number> = {};
    
    if (Array.isArray(day.sceneTimes)) {
      day.sceneTimes.forEach((st: any) => {
        if (st && st.sceneNumber) {
          sceneTimesObj[String(st.sceneNumber)] = st.durationHours || 0.5;
        }
      });
    }
    
    return { 
      ...day, 
      sceneNumbers, 
      sceneTimes: sceneTimesObj, 
      dayNumber: day.dayNumber || (idx + 1) 
    };
  });

  return formatted;
};
