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
            - **Blockchain**: Built on Algorand (TestNet). Transactions are immutable and transparent.
            - **Goal**: Transparency, Trust, Automation without centralized databases.

            Key Features & Logic:
            1. **Smart Attendance (Geo-Fenced)**:
               - Students must be within **100 meters** of the teacher to be marked "Present/In-Class".
               - If > 100m, they are marked "Remote" (but data is still recorded).
               - **IMPORTANT**: The History List only shows "Geo: Yes" if coordinates were sent. It does *not* verify distance retrospectively because the classroom location is effectively "stateless" (only on teacher's device during session, not on-chain).
               - New sessions generate an ID with coordinates (e.g., \`CLASS-..._LAT_LONG\`) to allow future verification.
            
            2. **Voting**:
               - Decentralized voting using Algorand Smart Contracts.
               - One wallet = One vote. No double voting possible.
            
            3. **Digital Certificates**:
               - Certificates are hashed and stored on-chain.
               - Verify by dragging/dropping the file to check its hash against the blockchain record.
            
            4. **Mobile Experience**:
               - Fully responsive.
               - Bottom navigation bar includes: Home, Vote, Attend, Certs, and Share.

            Direct Links (Use these to guide users):
            - **Mark Attendance**: https://strotas-algorand.vercel.app/attendance
            - **View History**: https://strotas-algorand.vercel.app/attendance/list
            - **Cast Vote**: https://strotas-algorand.vercel.app/vote
            - **My Certificates**: https://strotas-algorand.vercel.app/certificate
            - **Verify Certificate**: https://strotas-algorand.vercel.app/certificate (Upload here)
            - **Share Certificate**: https://strotas-algorand.vercel.app/share (Share via WhatsApp, LinkedIn, etc.)

            Your Role:
            - Provide ONLY the relevant link when asked. Do not list multiple options unless requested.
            - Answer questions about how the app works (especially the 100m logic).
            - Explain blockchain concepts (Immutable, Hash, Consensus) simply.
            - Be concise, friendly, and helpful.
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
