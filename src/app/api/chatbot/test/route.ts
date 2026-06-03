import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "No API Key found" }, { status: 500 });
        }

        // Log the first 5 chars of key
        console.log("API Key loaded:", apiKey.substring(0, 5) + "...");

        // Let's do a direct fetch to Gemini API to bypass SDK parsing
        const aiModel = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3.1-flash-lite';
        const fetchResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=\${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Halo" }] }]
            })
        });

        const rawText = await fetchResponse.text();
        console.log("Raw Gemini API Output:", rawText.slice(0, 200));

        let asJson = {};
        try {
            asJson = JSON.parse(rawText);
        } catch (e) {
            console.log("JSON parse error:", e);
        }

        return NextResponse.json({
            statusResponse: fetchResponse.status,
            rawText,
            asJson
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
