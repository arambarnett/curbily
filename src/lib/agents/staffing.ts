import { parseJSON } from "../utils";
import { getGeminiClient, MODEL_NAME } from "../geminiClient";

export const crewRecommendations = async (project: any, contacts: any[]) => {
  if (!project || !contacts) throw new Error("project and contacts are required for recommendations");

  const ai = getGeminiClient();
  const FLASH_MODEL = MODEL_NAME;

  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ 
      role: "user", 
      parts: [{ 
        text: `Project Details:
Location: ${project.location}
Target Budget: $${project.targetBudget || 'Not specified'}
Script Context: ${project.scriptText?.substring(0, 500) || 'None provided'}
... (Available Network and Mission strings remain the same) ...`
      }] 
    }],
    config: { maxOutputTokens: 8192,
      responseMimeType: "application/json",
            systemInstruction: "You are an expert Production Manager. Recommend crew from the provided list based on project constraints.\nRespond in JSON format."
    },
  });

  try {
    const jsonText = response.text || "{\"recommendations\": []}";
    return parseJSON(jsonText.replace(/```json\s?|```/g, "").trim());
  } catch (e) {
    console.error("Failed to parse staffing recommendations AI response", e);
    return { recommendations: [] };
  }
};
