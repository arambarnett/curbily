import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { parseJSON } from "../../utils";

export const callSheet = async (day: any, scenes: any[], contacts: any[], location?: string, projectContext?: { isMicroDrama?: boolean; contentType?: string }, onProgress?: (msg: string) => void) => {
  if (!day || !scenes) throw new Error("day and scenes are required for callSheet");

  const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY) || "";
  const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key', httpOptions: { baseUrl: typeof window !== 'undefined' ? window.location.origin + (window.location.pathname.startsWith('/projects') ? '/projects/gemini-api-proxy/' : '/gemini-api-proxy/') : 'http://localhost:3000/gemini-api-proxy/' } });
  const FLASH_MODEL = "models/gemini-3-flash-preview";
  const retries = 2;

  const microDramaInstruction = projectContext?.isMicroDrama ? 
    "\nCRITICAL: This is a MICRO DRAMA production. Expect to shoot 2-3 episodes in one day. Ensure the timeline reflects multiple episode numbers being filmed. Bulk shooting efficiency is key." : "";

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: FLASH_MODEL,
        contents: [{ role: "user", parts: [{ text: `Day: ${JSON.stringify(day)}\nScenes: ${JSON.stringify(scenes)}\nContacts (Available Cast & Crew): ${JSON.stringify(contacts)}\nLocation: ${location}\nProject Type: ${projectContext?.contentType || 'standard'}` }] }],
        config: { maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT" as any,
            properties: {
              callTime: { type: "STRING" as any },
              location: { type: "STRING" as any },
              weather: { type: "STRING" as any },
              weatherImpact: { type: "STRING" as any },
              nearestHospital: { type: "STRING" as any },
              parkingInfo: { type: "STRING" as any },
              notes: { type: "STRING" as any },
              catering: { type: "STRING" as any },
              shotSchedule: { type: "STRING" as any },
              timeline: {
                type: "ARRAY" as any,
                items: {
                  type: "OBJECT" as any,
                  properties: {
                    time: { type: "STRING" as any },
                    activity: { type: "STRING" as any },
                    involved: { type: "STRING" as any }
                  }
                }
              },
              crew: {
                type: "ARRAY" as any,
                items: {
                  type: "OBJECT" as any,
                  properties: {
                    name: { type: "STRING" as any },
                    role: { type: "STRING" as any },
                    callTime: { type: "STRING" as any },
                    phone: { type: "STRING" as any },
                    email: { type: "STRING" as any },
                    department: { type: "STRING" as any }
                  }
                }
              },
              cast: {
                type: "ARRAY" as any,
                items: {
                  type: "OBJECT" as any,
                  properties: {
                    name: { type: "STRING" as any },
                    character: { type: "STRING" as any },
                    callTime: { type: "STRING" as any },
                    hairMakeupTime: { type: "STRING" as any },
                    onSetTime: { type: "STRING" as any },
                    phone: { type: "STRING" as any }
                  }
                }
              }
            }
          },
          systemInstruction: `Purpose: Generate a comprehensive day-specific call sheet.${microDramaInstruction}\nCRITICAL: You MUST include ALL necessary cast and crew explicitly based on the scenes provided. Match the needed cast with actual people from the Contacts list where possible.\nInclude:\n- callTime, location, weather (forecasted), nearestHospital, parkingInfo, notes.\n- weatherImpact: Assess impact.\n- timeline: Array of events (time, activity, cast/crew involved).\n- catering: Details.\n- shotSchedule: Summary.\n\nCRITICAL CONSTRAINTS:\n1. Weather: Provide actual weather forecast details (e.g. 'Sunny, 75°F', 'Partly Cloudy, chance of rain'). DO NOT repeat the project title or system strings as the weather field.\n2. Location: Respect the primary location provided. If specific address is in the data, use it.\n3. Crew: Assign roles based on standard production departments (AD, Camera, Sound, G&E, etc.) using available contacts.\n\nReturn ONLY JSON.`
        },
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text || "{}";
      const parsed = parseJSON(text);
      if (parsed) return parsed;
      throw new Error("Empty or invalid response from AI");
    } catch (error) {
      console.error(`Call Sheet Error (Day ${day.dayNumber}, Attempt ${attempt}):`, error);
      if (attempt <= retries) {
        if (onProgress) onProgress(`[Call Sheet Day ${day.dayNumber}] Error. Retrying (${attempt}/${retries})...`);
        await new Promise(r => setTimeout(r, 2000 * attempt));
      } else {
        return {};
      }
    }
  }
  return {};
};
