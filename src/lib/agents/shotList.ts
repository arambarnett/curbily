import { getGeminiClient, MODEL_NAME } from "../geminiClient";
import { parseJSON } from "../utils";

export const shotList = async (scenes: any[]) => {
  if (!scenes) throw new Error("scenes are required for shotList");

  const ai = getGeminiClient();
  const PRO_MODEL = MODEL_NAME;

  const response = await ai.models.generateContent({
    model: PRO_MODEL,
    contents: [{ role: "user", parts: [{ text: JSON.stringify(scenes) }] }],
    config: { maxOutputTokens: 8192,
      responseMimeType: "application/json",
            systemInstruction: "Generate production-ready shot lists from scenes.\nInclude shotNumber, description, size, angle, movement, equipment, and notes.\nYOU MUST PROVIDE VALUES FOR ALL FIELDS.\nORDINALITY: You MUST return shots in strict chronological order matching the sequence of scenes provided.\nCOVERAGE: You must generate shots that cover ALL actions, dialogue, and beats present in the provided scenes. Do not skip any actions from the script breakdown.\nWithin each scene, shots should be numbered logically (e.g., 1, 2, 3 or 1A, 1B).\nReturn a strictly valid JSON array of all shots, sorted by scene and shot sequence. DO NOT INCLUDE ANY TRAILING COMMAS AT THE END OF ARRAYS OR OBJECTS. Ensure the JSON is well-formed."
    },
  });

  return parseJSON(response.text || "[]") || [];
};
