import { GoogleGenAI } from "@google/genai";
import { parseJSON } from "../../utils";

export const crewRecommendations = async (project: any, contacts: any[]) => {
  if (!project || !contacts) throw new Error("project and contacts are required for recommendations");

  const apiKey = ((process.env.GEMINI_API_KEY || process.env.API_KEY) || "") as string;
  

  const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key', httpOptions: { baseUrl: typeof window !== 'undefined' ? window.location.origin + (window.location.pathname.startsWith('/projects') ? '/projects/gemini-api-proxy/' : '/gemini-api-proxy/') : 'http://localhost:3000/gemini-api-proxy/' } });
  const FLASH_MODEL = "models/gemini-3-flash-preview";
  const availableContacts = contacts.slice(0, 120).map((contact) => ({
    id: contact.id,
    name: contact.name,
    roles: contact.roles || [],
    location: contact.location || '',
    rate: contact.rate || contact.minRate || 0,
    reliability: contact.reliability || 0,
    union: contact.union || '',
    notes: contact.notes || contact.bio || '',
  }));

  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ 
      role: "user", 
      parts: [{ 
        text: `Project Details:
Title: ${project.title || 'Untitled project'}
Location: ${project.location}
Target Budget: $${project.targetBudget || 'Not specified'}
Script Context: ${project.scriptText?.substring(0, 500) || 'None provided'}
Production Type: ${project.contentType || 'unspecified'}

Available Network:
${JSON.stringify(availableContacts)}

Mission:
Recommend the strongest crew/talent matches from the available network. Prefer people whose roles, location, rates, and notes fit the project. Return JSON only in this shape:
[
  {
    "role": "DP",
    "matches": [
      { "contactId": "contact document id", "reason": "short reason grounded in the contact data" }
    ]
  }
]`
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
