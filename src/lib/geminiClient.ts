import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(apiKey?: string): GoogleGenAI {
  if (!geminiClient || apiKey) {
    const key = apiKey || 'dummy-key';
    
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin + (window.location.pathname.startsWith('/projects') ? '/projects/gemini-api-proxy/' : '/gemini-api-proxy/')
      : 'http://localhost:3000/gemini-api-proxy/';

    geminiClient = new GoogleGenAI({ 
      apiKey: key, 
      httpOptions: { 
        baseUrl 
      } 
    });
  }
  return geminiClient;
}

export const MODEL_NAME = "gemini-3-flash-preview";
export const PRO_MODEL_NAME = "gemini-3-flash-preview";
export const IDEA_MODEL_NAME = "gemini-3.1-flash-lite-preview";
