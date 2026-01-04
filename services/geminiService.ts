import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, UrgencyLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: 'AIzaSyCC7sOqha9tRNKnlZDvsjzHT2y8sDIPVEM' });


// Shared schema for consistency
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    urgency: { type: Type.STRING, enum: [UrgencyLevel.LOW, UrgencyLevel.MEDIUM, UrgencyLevel.HIGH, UrgencyLevel.CRITICAL] },
    category: { type: Type.STRING }
  },
  required: ["title", "description", "urgency", "category"]
};

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
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Error analyzing image:", error);
    return {
      title: "Unknown Issue",
      description: "Could not analyze the image automatically. Please add details manually.",
      urgency: UrgencyLevel.MEDIUM,
      category: "General"
    };
  }
};

export const analyzeRepairAudio = async (base64Audio: string): Promise<AnalysisResult> => {
  try {
    const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
    
    // Clean base64 string (remove data:audio/webm;base64, prefix if present)
    const cleanBase64 = base64Audio.split(',')[1] || base64Audio;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              // We assume standard web audio recording format here, usually webm or mp4 depending on browser
              mimeType: 'audio/webm', 
            },
          },
          {
            text: `Listen to this voice report for a property maintenance application. 
                   Extract the maintenance issue described.
                   Return a structured JSON response with a short title (e.g., "Leaking AC"), a concise description based on what was said, an inferred urgency level, and a category.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Error analyzing audio:", error);
    return {
      title: "Voice Report",
      description: "Could not transcribe audio. Please verify your connection or try again.",
      urgency: UrgencyLevel.MEDIUM,
      category: "General"
    };
  }
};