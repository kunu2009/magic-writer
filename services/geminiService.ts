

import { GoogleGenAI, Type, Part } from "@google/genai";
import { AttachedFile, Suggestion, GrammarError } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToPart = (file: AttachedFile): Part => {
  return {
    inlineData: {
      mimeType: file.type,
      data: file.base64,
    },
  };
};

export const generateInitialText = async (prompt: string, files: AttachedFile[]): Promise<string> => {
  try {
    const model = 'gemini-2.5-pro';
    const parts: Part[] = [{ text: prompt }];
    files.forEach(file => {
      parts.push(fileToPart(file));
    });
    
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        systemInstruction: "You are a world-class writer and a creative thought partner. Write compelling, clear, and engaging content based on the user's request."
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error generating initial text:", error);
    return "An error occurred while generating text. Please try again.";
  }
};

export const rewriteSelection = async (selectedText: string, instruction: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Rewrite the following text based on the instruction provided.\n\n**Instruction:** ${instruction}\n\n**Original Text:**\n---\n${selectedText}\n---\n\n**Rewritten Text:**`;
    
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error rewriting selection:", error);
    return selectedText; // Return original text on error
  }
};

export const getSuggestions = async (fullText: string): Promise<Suggestion[]> => {
  if (fullText.trim().length < 50) return []; // Don't run on very short text

  try {
    const model = 'gemini-2.5-pro';
    const prompt = `Analyze the following text for clarity, conciseness, and impact. Provide suggestions to improve it. For each suggestion, identify the exact original text to be replaced and provide the improved version. Focus on high-impact changes. Return an empty array if no suggestions are found.`;

    // FIX: The 'contents' field was previously an array of objects, which is an invalid format.
    // It should be a single string or a Content object. Here we combine them into a single string.
    const response = await ai.models.generateContent({
      model: model,
      contents: `${prompt}\n\n**Text to Analyze:**\n---\n${fullText}\n---`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              originalText: {
                type: Type.STRING,
                description: "The exact, original phrase or sentence from the text to be replaced."
              },
              suggestedText: {
                type: Type.STRING,
                description: "The improved version of the text."
              }
            },
            required: ["originalText", "suggestedText"],
          },
        },
      }
    });

    const jsonText = response.text.trim();
    const suggestions = JSON.parse(jsonText);
    
    // Add a unique ID to each suggestion
    return suggestions.map((s: Omit<Suggestion, 'id'>) => ({ ...s, id: Math.random().toString(36).substr(2, 9) }));
  } catch (error) {
    console.error("Error getting suggestions:", error);
    return [];
  }
};

export const checkGrammarAndSpelling = async (fullText: string): Promise<GrammarError[]> => {
    if (fullText.trim().length < 10) return [];

    try {
        const model = 'gemini-2.5-flash';
        const prompt = `You are an expert proofreader. Analyze the following text for spelling and grammatical errors. For each error you find, provide the exact incorrect text, the corrected version, and a brief explanation of the error. Return an empty array if no errors are found.`;

        // FIX: The 'contents' field was previously an array of objects, which is an invalid format.
        // It should be a single string or a Content object. Here we combine them into a single string.
        const response = await ai.models.generateContent({
            model: model,
            contents: `${prompt}\n\n**Text to Analyze:**\n---\n${fullText}\n---`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            errorText: {
                                type: Type.STRING,
                                description: "The exact word or phrase from the text that contains an error."
                            },
                            correction: {
                                type: Type.STRING,
                                description: "The corrected version of the word or phrase."
                            },
                            explanation: {
                                type: Type.STRING,
                                description: "A brief, clear explanation of the error (e.g., 'Spelling mistake', 'Subject-verb agreement')."
                            }
                        },
                        required: ["errorText", "correction", "explanation"],
                    },
                },
            }
        });

        const jsonText = response.text.trim();
        const errors = JSON.parse(jsonText);
        return errors.map((e: Omit<GrammarError, 'id'>) => ({ ...e, id: Math.random().toString(36).substr(2, 9) }));
    } catch (error) {
        console.error("Error checking grammar and spelling:", error);
        return [];
    }
};