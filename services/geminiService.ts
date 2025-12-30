import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, UrgencyLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeRepairImage = async (base64Image: string): Promise<AnalysisResult> => {
  try {
    const model = 'gemini-2.5-flash-image';
    
    // Remove data URL prefix if present for the API call
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/jpeg', 
            },
          },
          {
            text: `Analyze this image for a property maintenance application. 
                   Identify the damage or maintenance issue shown.
                   Return a structured JSON response with a short title, a concise description of the problem, an urgency level (Low, Medium, High, Critical), and a general category (e.g., Plumbing, Electrical, HVAC, Structural).`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            urgency: { type: Type.STRING, enum: [UrgencyLevel.LOW, UrgencyLevel.MEDIUM, UrgencyLevel.HIGH, UrgencyLevel.CRITICAL] },
            category: { type: Type.STRING }
          },
          required: ["title", "description", "urgency", "category"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Error analyzing image:", error);
    // Fallback for demo purposes if API fails or key is missing
    return {
      title: "Unknown Issue",
      description: "Could not analyze the image automatically. Please add details manually.",
      urgency: UrgencyLevel.MEDIUM,
      category: "General"
    };
  }
};
