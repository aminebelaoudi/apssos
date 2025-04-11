// Gemini API configuration
export const GEMINI_API_KEY = 'AIzaSyCuLxmmj6PzD6GrGcXN-zLWx2apGkoa8-c'; // Replace with your actual API key
export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Fetches a response from the Google Gemini API
 * @param userInput The user's question or prompt
 * @param context Additional context for the prompt
 * @returns The generated response text
 */
export async function fetchGeminiResponse(
  userInput: string,
  context: string = 'Tu es un assistant médical d\'urgence spécialisé dans les soins d\'urgence de base.'
): Promise<string> {
  try {
    const prompt = `
      ${context}
      Réponds à la question suivante de manière concise et utile:
      ${userInput}
      
      Si la question concerne une urgence médicale grave, conseille toujours d'appeler les services d'urgence (112 ou 15).
    `;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the response text from the Gemini API response
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    } else {
      return "Je suis désolé, je n'ai pas pu générer une réponse appropriée. Veuillez reformuler votre question.";
    }
  } catch (error) {
    console.error('Error fetching from Gemini API:', error);
    throw error;
  }
} 