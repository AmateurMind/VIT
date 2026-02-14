export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const SITE_NAME = 'Campus Trust System';

/**
 * Chat with OpenRouter AI
 * Uses a cost-effective model suited for simple Q&A
 */
export async function chatWithAI(
    messages: ChatMessage[],
    context?: string
): Promise<string> {
    if (!OPENROUTER_API_KEY) {
        return "Error: OpenRouter API Key is missing. Please add NEXT_PUBLIC_OPENROUTER_API_KEY to .env.local";
    }

    try {
        const systemMessage: ChatMessage = {
            role: 'system',
            content: `You are CampusBuddy, an AI assistant for the University Blockchain System.
            
            System Context:
            - This is a blockchain-based app on Algorand.
            - Features: Voting, Attendance (Geo-Location), Digital Certificates.
            - Goal: Transparency, Trust, Automation.
            
            Your Role:
            - Answer questions about how to use the app.
            - Explain blockchain concepts (Immutable, Hash, Consensus) simply.
            - Be concise and friendly.
            ${context ? `\nCurrent Page Context: ${context}` : ''}`
        };

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": SITE_URL,
                "X-Title": SITE_NAME,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": process.env.NEXT_PUBLIC_OPENROUTER_MODEL || "mistralai/mistral-7b-instruct:free", // Use env variable or default back to free model

                "messages": [systemMessage, ...messages],
                "temperature": 0.7,
                "max_tokens": 500,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("AI API Error:", errorText);
            return "Sorry, I'm having trouble connecting to my brain right now. Please try again later.";
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "I'm not sure how to answer that.";

    } catch (error) {
        console.error("AI Service Error:", error);
        return "An internal error occurred while fetching the response.";
    }
}
