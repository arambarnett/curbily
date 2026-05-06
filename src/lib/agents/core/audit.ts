import { parseJSON } from "../../utils";
import { getGeminiClient, MODEL_NAME } from "../../geminiClient";

export const auditAgent = async (channelData: any, analyticsData: any, demographicsData: any) => {
  const ai = getGeminiClient();
  const MODEL = MODEL_NAME;
  const systemInstruction = `You are the Creator Audience Auditor & Channel Strategist. Your mission is to analyze raw YouTube channel metadata, 30-day analytics, and long-term demographics to spark a deep AUDIENCE PRESENTATION.
... (rest of systemInstruction stays the same) ...`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ 
      role: "user", 
      parts: [{ 
        text: `Channel Metadata: ${JSON.stringify(channelData)}\n30-Day Analytics: ${JSON.stringify(analyticsData)}\nDemographics: ${JSON.stringify(demographicsData)}` 
      }] 
    }],
    config: { maxOutputTokens: 8192,
      responseMimeType: "application/json",
            systemInstruction
    },
  });

  try {
    return parseJSON(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse audit agent response:", response.text);
    throw new Error("Invalid format returned from AI Audit Agent");
  }
};
