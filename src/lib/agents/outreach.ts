import { parseJSON } from "../utils";
import { getGeminiClient, MODEL_NAME } from "../geminiClient";

export const outreach = async (contact: any, role: string, project: any) => {
  if (!contact || !role || !project) throw new Error("contact, role, and project are required for outreach");

  const ai = getGeminiClient();
  const FLASH_MODEL = MODEL_NAME;

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
