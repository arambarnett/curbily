export const ensureApiKey = async () => {
    // API Key dialog is disabled; the app now automatically proxies Gemini API requests 
    // to the backend to use the server-side API key for a seamless experience.
    return true;
};
