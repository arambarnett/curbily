import Vapi from "@vapi-ai/web";

// Public API Key for client-side SDK access
const PUBLIC_KEY = (import.meta as any).env.VITE_VAPI_PUBLIC_KEY || "25d83c1c-4714-4a1d-b0ca-7d683c914d2a";

export const vapi = new Vapi(PUBLIC_KEY);

export interface VapiCallConfig {
  assistantName: string;
  firstMessage: string;
  phoneNumber?: string;
}

export const startVapiWebCall = async (assistantId: string) => {
  try {
    await vapi.start(assistantId);
  } catch (error) {
    console.error("Vapi Web Call Error:", error);
    throw error;
  }
};

export const stopVapiWebCall = () => {
  vapi.stop();
};
