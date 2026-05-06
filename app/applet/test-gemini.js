import { GoogleGenAI } from "@google/genai";
async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: "Test",
      config: {
        maxOutputTokens: 65536,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: { type: "OBJECT", properties: { result: { type: "STRING" } } }
      }
    });
    console.log("Success");
  } catch (e) {
    console.error(e.message);
  }
}
test();
