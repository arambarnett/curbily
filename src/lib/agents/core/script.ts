import { getGeminiClient, IDEA_MODEL_NAME } from "../../geminiClient";
import { parseJSON } from "../../utils";

export const generateScriptFromIdea = async (idea: string, contentType: string = 'feature') => {
  if (!idea) throw new Error("idea is required for script generation");

  const ai = getGeminiClient();
  const MODEL = IDEA_MODEL_NAME;

  console.log('ScriptAgent: Starting generation...', { model: MODEL, contentType, ideaLength: idea.length });

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ 
        role: "user", 
        parts: [{ 
          text: `Turn this film/content Idea into a professional project package.
          
          ContentType: ${contentType}
          
          Idea: ${idea}
          
          Return a JSON object with:
          {
            "title": "A catchy title",
            "description": "A compelling logline/synopsis",
            "targetBudget": 5000,
            "location": "A suggested city/state",
            "script": "A complete script in Fountain/Standard format with scenes, dialogue, and action."
          }` 
        }] 
      }],
      config: { 
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        systemInstruction: "You are a professional Creative Producer and Screenwriter. Expand ideas into fully formatted scripts and production summaries."
      },
    });

    const text = response.text || "";
    console.log('ScriptAgent: Received response length:', text.length);
    const parsed = parseJSON(text);
    
    if (!parsed) {
      console.warn('ScriptAgent: Failed to parse JSON, returning raw text');
      return { script: text, title: "", description: "" };
    }
    
    return parsed;
  } catch (error: any) {
    console.error('ScriptAgent: FULL ERROR OBJECT:', error);
    if (error.response) {
      console.error('ScriptAgent: Response Data:', error.response.data);
      console.error('ScriptAgent: Response Status:', error.response.status);
    }
    // Re-throw to be handle by caller
    throw error;
  }
};
