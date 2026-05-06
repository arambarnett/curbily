import { GoogleGenAI } from "@google/genai";
import { parseJSON } from "../../utils";

export const crewRecommendations = async (project: any, contacts: any[]) => {
  if (!project || !contacts) throw new Error("project and contacts are required for recommendations");

  const apiKey = ((process.env.GEMINI_API_KEY || process.env.API_KEY) || "") as string;
  

  const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key', httpOptions: { baseUrl: typeof window !== 'undefined' ? window.location.origin + (window.location.pathname.startsWith('/projects') ? '/projects/gemini-api-proxy/' : '/gemini-api-proxy/') : 'http://localhost:3000/gemini-api-proxy/' } });
  const FLASH_MODEL = "models/gemini-3-flash-preview";

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
    return parseJSON(jsonText) || { recommendations: [] };
  } catch (e) {
    console.error("Failed to parse staffing recommendations AI response", e);
    return { recommendations: [] };
  }
};
