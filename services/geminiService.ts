
import { GoogleGenAI } from "@google/genai";

// Fix: Use a world-class initialization pattern with named parameters as per @google/genai guidelines.
export const generateProductDescription = async (name: string, category: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a compelling, concise product description (max 2 sentences) for an item named "${name}" in the category "${category}".`,
      config: {
        temperature: 0.7,
        topP: 0.9,
      },
    });
    
    // Fix: Access response.text as a property directly, do not call as a method.
    return response.text?.trim() || "Quality product for everyday use.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "A premium quality item available in our store.";
  }
};
