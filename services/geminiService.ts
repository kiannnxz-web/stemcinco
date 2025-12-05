
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseRosterFromImage = async (base64Image: string): Promise<{ name: string; gender: 'M' | 'F' }[]> => {
  try {
    // gemini-2.5-flash is efficient for multimodal tasks like document OCR/Extraction
    const model = 'gemini-2.5-flash';
    const prompt = `
      Analyze this image of a classroom class list or ledger.
      Your task is to extract the list of student names.
      
      Rules:
      1. Identify the names in the list.
      2. Detect the gender based on the sectioning of the list (e.g., if there is a 'Boys' section and 'Girls' section) or common naming conventions if explicit sections are missing.
      3. Return ONLY a valid JSON array of objects. Each object must have:
         - "name": string (The full name of the student)
         - "gender": "M" or "F"
      
      Example Output:
      [{"name": "John Doe", "gender": "M"}, {"name": "Jane Smith", "gender": "F"}]
      
      Do not include markdown formatting, explanations, or code blocks. Just the raw JSON string.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      }
    });

    const text = response.text || '[]';
    // Clean up potential markdown code blocks if the model adds them
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return [];
  }
};
