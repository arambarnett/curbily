import { parseJSON } from "../utils";
import { getGeminiClient, MODEL_NAME } from "../geminiClient";

export const processResponse = async (message: string, thread: any) => {
  if (!message || !thread) throw new Error("message and thread are required for processResponse");

  const ai = getGeminiClient();
  const FLASH_MODEL = MODEL_NAME;

  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts: [{ text: `Message: "${message}"\nRole: ${thread.role}` }] }],
    config: { maxOutputTokens: 8192,
      responseMimeType: "application/json",
            systemInstruction: "Parse incoming vendor/talent response and classify intent (accept/decline/question/negotiation/other).\nExtract commitments, dates, rates, constraints, and required follow-up.\nReturn JSON with normalized fields and recommended next action."
    },
  });

  return parseJSON(response.text || "{}");
};
