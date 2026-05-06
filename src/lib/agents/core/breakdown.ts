import { getGeminiClient, MODEL_NAME } from "../../geminiClient";
import { parseJSON } from "../../utils";

export const breakdown = async (scriptText: string, agentInstructions?: string) => {
  if (!scriptText) throw new Error("scriptText is required for breakdown");

  const ai = getGeminiClient();
  const MODEL = MODEL_NAME;

  // Approximate tokens/chars per page. 1 page is ~250 words / 1500 chars.
  // We chunk into roughly 15-20 page segments to ensure high granularity in the output without hitting output token limits.
  const CHUNK_SIZE_CHARS = 30000; 
  const chunks = [];
  
  if (scriptText.length <= CHUNK_SIZE_CHARS * 1.2) {
    chunks.push(scriptText);
  } else {
    // Basic chunking logic - we try to split on line breaks to avoid cutting through a scene slugline
    let remaining = scriptText;
    while (remaining.length > 0) {
      if (remaining.length <= CHUNK_SIZE_CHARS) {
        chunks.push(remaining);
        break;
      }
      
      let splitIdx = remaining.lastIndexOf('\n\n', CHUNK_SIZE_CHARS);
      if (splitIdx === -1) splitIdx = remaining.lastIndexOf('\n', CHUNK_SIZE_CHARS);
      if (splitIdx === -1) splitIdx = CHUNK_SIZE_CHARS;
      
      chunks.push(remaining.substring(0, splitIdx));
      remaining = remaining.substring(splitIdx).trim();
    }
  }

  const allScenes: any[] = [];
  let lastSceneNumber = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    let text = "[]";
    let attempts = 0;
    const MAX_ATTEMPTS = 2;
    let success = false;

    while (attempts < MAX_ATTEMPTS && !success) {
      try {
        const response = await ai.models.generateContent({
          model: MODEL,
          contents: [{ 
            role: "user", 
            parts: [{ 
              text: `This is Part ${i + 1} of ${chunks.length} of the production script.
${i > 0 ? `The last scene in the previous part was scene #${lastSceneNumber}. Start numbering from #${lastSceneNumber + 1}.` : ''}

Script Chunk:\n${chunk}\n\n${agentInstructions ? `SPECIAL USER INSTRUCTIONS: ${agentInstructions}` : ''}` 
            }] 
          }],
          config: { 
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY" as any,
              items: {
                type: "OBJECT" as any,
                properties: {
                  sceneNumber: { type: "INTEGER" as any },
                  slugline: { type: "STRING" as any },
                  location: { type: "STRING" as any },
                  timeOfDay: { type: "STRING" as any },
                  setting: { type: "STRING" as any },
                  cast: { type: "ARRAY" as any, items: { type: "STRING" as any } },
                  props: { type: "ARRAY" as any, items: { type: "STRING" as any } },
                  wardrobe: { type: "ARRAY" as any, items: { type: "STRING" as any } },
                  duration: { type: "NUMBER" as any },
                  pageCount: { type: "NUMBER" as any },
                  pagesEighths: { type: "STRING" as any },
                  isAction: { type: "BOOLEAN" as any },
                  notes: { type: "STRING" as any }
                },
                required: ["sceneNumber", "slugline", "location", "timeOfDay", "setting", "cast", "props", "duration", "pageCount"]
              }
            },
            systemInstruction: "Purpose: Extract an EXHAUSTIVE scene-level production structure from script text.\n" +
              "CRITICAL: Be extraordinarily granular. If a scene mentions a character wearing 'a blue sweater', list 'blue sweater' in wardrobe. If they pick up a 'silver key', list 'silver key' in props.\n" +
              "PROPS BREAKOUT: Every single physical item mentioned, touched, or interacting with characters MUST be broken out into individual items in the props list.\n" +
              "SCREEN TIME RULE: Every 1 page of script text translates to exactly 1 minute of estimated screen time (duration). Calculate the duration based on the page count for each scene.\n" +
              "PAGE EIGHTHS: For each scene, calculate the length of the scene in script page eighths using the standard film 1/8th system (e.g., '1/8', '3/8', '1 4/8', '2'). Include this as the `pagesEighths` string field. The `pageCount` field should be the decimal representation (e.g. 0.125 for 1/8).\n" +
              "Every single object, vehicle, animal, or specific piece of clothing mentioned or implied by the action MUST be extracted.\n" +
              "Analyze script into production-ready scene breakdown; return JSON array only.\n" +
              "duration numeric (estimated screen time in minutes).\n" +
              "pageCount numeric (number of script pages for this scene as decimal).\n" +
              "isAction boolean (true if the scene is primarily action/stunts/chase).\n" +
              "Scene order consistent with script flow."
          },
        });
        
        text = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text || "[]";
        const parsedChunk = parseJSON(text);
        if (Array.isArray(parsedChunk)) {
          allScenes.push(...parsedChunk);
          if (parsedChunk.length > 0) {
            const maxNum = Math.max(...parsedChunk.map(s => s.sceneNumber || 0));
            lastSceneNumber = maxNum > 0 ? maxNum : lastSceneNumber + parsedChunk.length;
          }
          success = true;
        } else {
          throw new Error("Invalid JSON returned from breakdown");
        }
      } catch (error: any) {
        attempts++;
        console.error(`Breakdown API Error on chunk ${i + 1} (attempt ${attempts}):`, error);
        if (attempts >= MAX_ATTEMPTS) {
          if (i === 0) throw error; // If first chunk fails after retries, fail the whole thing
          // Otherwise we continue with what we have
        } else {
          // Wait a bit before retrying
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  }

  return allScenes.sort((a, b) => (a.sceneNumber || 0) - (b.sceneNumber || 0));
};
