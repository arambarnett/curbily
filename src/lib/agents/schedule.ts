import { getGeminiClient, MODEL_NAME } from "../geminiClient";
import { parseJSON } from "../utils";

export const schedule = async (scenes: any[], dayLength: number = 10, contentType: string = "feature", availabilityConstraint: string = "") => {
  if (!scenes) throw new Error("scenes are required for schedule");

  const ai = getGeminiClient();
  const MODEL = MODEL_NAME;

  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);
  const startDateStr = nextMonth.toISOString().split('T')[0];

  let promptText = `Scenes to schedule: ${JSON.stringify(scenes)}\nContent Type: ${contentType}`;
  if (availabilityConstraint) {
    promptText += `\n\nTEAM & CAST AVAILABILITY:\n${availabilityConstraint}\n\nYou MUST strictly adhere to these availability constraints when placing scenes on specific days.`;
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    config: { maxOutputTokens: 8192,
            responseMimeType: "application/json",
      systemInstruction: `You are a professional Hollywood 1st Assistant Director (AD) with 30 years of experience.
      
Purpose: Distribute scenes into a shooting schedule.

REAL YEAR & DATE: The current date is ${today.toISOString().split('T')[0]}. You MUST start the production shoot on or after ${startDateStr}. Dates MUST be formatted as "YYYY-MM-DD" inside 'date' field.

REALISTIC SCHEDULING RULES:
1. SHOOT DURATION: Duration must ONLY be in 15-minute increments (15, 30, 45, 60, 75, 90, etc.). Never use decimals or other minute values like 0.7 or 12.
2. MINIMUM SETUP: Every new location or major setup change requires 30-60 minutes.
3. COMPANY MOVES: Moving locations during the day takes 60-90 minutes.
4. CAST READINESS: Factor in Hair/Makeup/Wardrobe prep (usually parallel but affects start).
5. SHOOT SPEED: 
   - Feature/Indie: 2-3 pages per day (approx 3-4 hours per page shoot time).
   - Commercial/Short: High coverage, higher complexity per page.
6. SCENE COMPLEXITY: Action, children, animals, or complex lighting setups double the time.
7. PAGE EIGHTHS: Rely on "pagesEighths" from the scene data to estimate speed accurately. 1/8th of a page is exactly how ADs measure how much they can shoot in a day. Group scenes that shoot efficiently together based on 1/8th coverage.

Output MUST be a valid JSON array of day objects. DO NOT use trailing commas inside the JSON. DO NOT include markdown code blocks, just raw JSON text.
Each day object must have: 
- dayNumber (number)
- date (string, YYYY-MM-DD)
- scenesScheduled (number array of scene numbers)
- estimatedLength (number in hours)
- callTime (string, HH:MM)
- weather (string, realistic atmospheric conditions with potential filming impacts)
- adNotes (string, comprehensive logistical notes from the 1st AD regarding company moves, cast holding, special setups, meal breaks, and schedule complexities. Identify WHY scenes are grouped this way.)
Do not include scene-by-scene minute duration breakouts, as 1 page = 1 minute is runtime, not shoot time. Focus on the macro-day plan in the adNotes.`
    },
  });

  const text = response.text || "[]";
  let parsed = parseJSON(text) || [];
  
  return parsed;
};
