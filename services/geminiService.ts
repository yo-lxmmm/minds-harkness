
import { GoogleGenAI, Type } from "@google/genai";
import { InteractionType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    interactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          speakerId: { type: Type.STRING },
          recipientId: { type: Type.STRING, description: "ID or 'GROUP' or null" },
          type: { 
            type: Type.STRING, 
            enum: Object.values(InteractionType) 
          },
          text: { type: Type.STRING },
          summary: { type: Type.STRING },
        },
        required: ["speakerId", "type", "text", "summary"]
      }
    },
    report: {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.OBJECT,
          properties: {
            what: { type: Type.STRING },
            why: { type: Type.STRING },
            starConcept: { type: Type.STRING, description: "The overlap of What and Why" }
          },
          required: ["what", "why", "starConcept"]
        },
        profiles: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              participantId: { type: Type.STRING },
              role: { type: Type.STRING },
              sixHats: { type: Type.ARRAY, items: { type: Type.STRING } },
              primaryInteractedWith: { type: Type.STRING }
            },
            required: ["participantId", "role", "sixHats", "primaryInteractedWith"]
          }
        },
        keyInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
        divergence: { type: Type.STRING },
        coherence: { type: Type.STRING },
        unfinishedThreads: { type: Type.ARRAY, items: { type: Type.STRING } },
        silentMoments: { type: Type.ARRAY, items: { type: Type.STRING } },
        negativeSpace: { type: Type.STRING }
      },
      required: ["summary", "profiles", "keyInsights", "divergence", "coherence", "unfinishedThreads", "silentMoments", "negativeSpace"]
    }
  },
  required: ["interactions", "report"]
};

export async function analyzeTranscript(
  transcript: string, 
  participants: { id: string, name: string, isFacilitator: boolean }[]
) {
  const prompt = `
    Analyze the following meeting transcript based on the Harkness Table mapping method.
    
    Participants:
    ${participants.map(p => `- ${p.name} (ID: ${p.id})${p.isFacilitator ? ' [FACILITATOR]' : ''}`).join('\n')}
    
    Transcript:
    ${transcript}
    
    Tasks:
    1. Classify every turn in the transcript into one of these types:
       - OPEN_QUESTION: Question to the group.
       - DIRECT_QUESTION: Question to specific person.
       - OPEN_STATEMENT: Contribution not directed at anyone specifically.
       - DIRECT_RESPONSE: Response directed at a specific person.
       - FACILITATOR_META: Prompts, invitations, or redirects from the facilitator.
    2. Extract interactions (who spoke to whom).
    3. Generate a detailed analytical report including What/Why summary, Participant Profiles (Role, Six Thinking Hats), Key Insights, Divergence, Coherence, Unfinished Threads, Silent Moments, and Negative Space.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  return JSON.parse(response.text);
}
