import { getGeminiClient, MODEL_NAME } from "../../geminiClient";
import { parseJSON } from "../../utils";

export const shotList = async (scenes: any[]) => {
  if (!scenes || scenes.length === 0) return [];

  const ai = getGeminiClient();
  const PRO_MODEL = MODEL_NAME;

  // Chunk scenes into batches of 3 to avoid long wait times & timeouts
  const CHUNK_SIZE = 3;
  let allShots: any[] = [];

  for (let i = 0; i < scenes.length; i += CHUNK_SIZE) {
    const chunk = scenes.slice(i, i + CHUNK_SIZE);
    
    // Attempt up to 3 times per chunk
    for (let tryIdx = 0; tryIdx < 3; tryIdx++) {
      try {
        const response = await ai.models.generateContent({
          model: PRO_MODEL,
          contents: [{ role: "user", parts: [{ text: JSON.stringify(chunk) }] }],
          config: { 
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
                        systemInstruction: "Generate production-ready shot lists from scenes.\nInclude sceneId, shotNumber, description, size, angle, movement, equipment, and notes.\nYOU MUST PROVIDE VALUES FOR ALL FIELDS.\nORDINALITY: You MUST return shots in strict chronological order matching the sequence of scenes provided.\nCOVERAGE: You must generate shots that cover ALL actions, dialogue, and beats present in the provided scenes. Do not skip any actions from the script breakdown.\nWithin each scene, shots should be numbered logically (e.g., 1, 2, 3 or 1A, 1B).\nReturn a strictly valid JSON array of all shots, sorted by scene and shot sequence. DO NOT INCLUDE ANY TRAILING COMMAS AT THE END OF ARRAYS OR OBJECTS. Ensure the JSON is well-formed."
          },
        });

        const parsed = parseJSON(response.text || "[]");
        if (parsed && Array.isArray(parsed)) {
          allShots = allShots.concat(parsed);
          break; // success, break try loop
        }
      } catch (err) {
        console.warn(`Chunk ${i/CHUNK_SIZE} try ${tryIdx + 1} failed:`, err);
        if (tryIdx === 2) throw err; // throw on last try
      }
    }
  }

  return allShots;
};
