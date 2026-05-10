import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { parseJSON } from "../../utils";

export const outreach = async (contact: any, role: string, project: any) => {
  if (!contact || !role || !project) throw new Error("contact, role, and project are required for outreach");

  const apiKey = "dummy-key";
  const ai = new GoogleGenAI({ apiKey, httpOptions: { baseUrl: typeof window !== 'undefined' ? window.location.origin + (window.location.pathname.startsWith('/projects') ? '/projects/gemini-api-proxy/' : '/gemini-api-proxy/') : 'http://localhost:3000/gemini-api-proxy/' } });
  const FLASH_MODEL = "models/gemini-3-flash-preview";

  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts: [{ text: `Project: ${JSON.stringify(project)}\nContact: ${JSON.stringify(contact)}\nRole: ${role}` }] }],
    config: { maxOutputTokens: 8192,
      responseMimeType: "application/json",
            systemInstruction: "Draft concise outreach for this contact and role.\nProvide channel-specific variants (email/SMS/call script) with clear ask, compensation context, timeline, and CTA.\nReturn JSON with subject/body/script and follow-up suggestion."
    },
  });

  return parseJSON(response.text || "{}");
};
