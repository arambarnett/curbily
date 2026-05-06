import { getGeminiClient, MODEL_NAME } from "../geminiClient";
import { parseJSON } from "../utils";

export const callSheet = async (day: any, scenes: any[], location?: string) => {
  if (!day || !scenes) throw new Error("day and scenes are required for callSheet");

  const ai = getGeminiClient();
  const FLASH_MODEL = MODEL_NAME;

  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts: [{ text: `Day: ${JSON.stringify(day)}\nScenes: ${JSON.stringify(scenes)}\nLocation: ${location}` }] }],
    config: { maxOutputTokens: 8192,
      responseMimeType: "application/json",
            systemInstruction: "Purpose: Generate a comprehensive day-specific call sheet.\nInclude:\n- callTime, location, weather (forecasted), nearestHospital, parkingInfo, notes.\n- weatherImpact: Assess impact (e.g., 'High chance of rain - prepare covers').\n- timeline: Array of events (time, activity, cast/crew involved).\n- catering: Details on breakfast, lunch, and crafty.\n- shotSchedule: Summary of scenes/shots planned for the day.\n- personnel: Identify all necessary cast and crew for these scenes. Provide their role, individual call time (e.g., 07:00 or same as general call), and a phone number (use format 555-01XX if not in context).\nReturn JSON."
    },
  });

  return parseJSON(response.text || "{}");
};
