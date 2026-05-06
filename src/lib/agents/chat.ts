import { getGeminiClient, MODEL_NAME } from "../geminiClient";

export const chat = async (messages: any[], context: string) => {
  if (!messages) throw new Error("messages are required for chat");

  const ai = getGeminiClient();
  const FLASH_MODEL = MODEL_NAME;

  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ 
      role: "user", 
      parts: [{ text: `Current context: ${context}\n\nConversation history: ${JSON.stringify(messages)}` }] 
    }],
    config: { maxOutputTokens: 8192,
      responseMimeType: "application/json",
            systemInstruction: "You are a production execution copilot.\nAnswer with actionable, concise guidance grounded in current project context.\nIf data is missing, ask a specific follow-up.\nNever invent confirmed bookings/purchases.",
    },
  });

  return response.text || "";
};
