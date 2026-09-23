/**
 * SIGMA Resilient Gemini AI Client with Automatic Multi-Model Failover
 * 
 * Mengatasi error "503 High Demand", "429 Rate Limit", dan terpotongnya token (MAX_TOKENS)
 * dengan adaptif thinking budget, minimum output token safety floor (3500+ tokens),
 * serta failover otomatis antar model Gemini generasi terbaru.
 */

export const GEMINI_FALLBACK_MODELS = [
    "gemini-3.6-flash",       // Model utama: Google Gemini 3.6 Flash (Cepat & Akurat)
    "gemini-3.5-flash-lite",  // Fallback 1: Sangat cepat, hemat kuota & jarang overload
];

export interface GeminiContentPart {
    text: string;
}

export interface GeminiContentMessage {
    role: "user" | "model" | "assistant";
    parts: GeminiContentPart[];
}

export interface GeminiRequestOptions {
    systemInstruction?: string | { parts: GeminiContentPart[] };
    generationConfig?: {
        temperature?: number;
        topP?: number;
        topK?: number;
        maxOutputTokens?: number;
        responseMimeType?: string;
        thinkingConfig?: {
            thinkingBudget?: number;
        };
    };
}

export async function generateGeminiContentWithFallback(
    messages: GeminiContentMessage[],
    options?: GeminiRequestOptions
): Promise<{ success: boolean; text?: string; error?: string; modelUsed?: string; finishReason?: string }> {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
        return { success: false, error: "Konfigurasi GOOGLE_API_KEY tidak ditemukan di server." };
    }

    // Format systemInstruction if string
    let systemInstructionObj = undefined;
    if (options?.systemInstruction) {
        if (typeof options.systemInstruction === "string") {
            systemInstructionObj = { parts: [{ text: options.systemInstruction }] };
        } else {
            systemInstructionObj = options.systemInstruction;
        }
    }

    // Sanitize message roles: Gemini expects "user" or "model"
    const sanitizedContents = messages.map(m => ({
        role: m.role === "assistant" ? "model" : m.role,
        parts: m.parts,
    }));

    let lastErrorMessage = "";

    for (let i = 0; i < GEMINI_FALLBACK_MODELS.length; i++) {
        const modelName = GEMINI_FALLBACK_MODELS[i];
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        try {
            // Safety Floor: Pastikan maxOutputTokens minimal 3500 agar output tidak terputus di tengah jalan
            const requestedTokens = options?.generationConfig?.maxOutputTokens || 3500;
            const safeMaxOutputTokens = Math.max(requestedTokens, 3500);

            const genConfig: any = {
                temperature: options?.generationConfig?.temperature ?? 0.3,
                topP: options?.generationConfig?.topP ?? 0.8,
                maxOutputTokens: safeMaxOutputTokens,
            };

            if (options?.generationConfig?.topK !== undefined) {
                genConfig.topK = options.generationConfig.topK;
            }
            if (options?.generationConfig?.responseMimeType) {
                genConfig.responseMimeType = options.generationConfig.responseMimeType;
            }

            // Untuk model Gemini 3.6 (yang memiliki fitur reasoning/thinking terintegrasi):
            // Defaultkan thinkingBudget ke 0 agar token output tidak habis terkuras untuk proses thinking internal,
            // sehingga hasil teks analisis dapat keluar secara utuh dan instan (tidak terputus).
            if (modelName.includes("3.6") || modelName.includes("thinking")) {
                if (options?.generationConfig?.thinkingConfig) {
                    genConfig.thinkingConfig = options.generationConfig.thinkingConfig;
                } else {
                    genConfig.thinkingConfig = { thinkingBudget: 0 };
                }
            }

            const bodyPayload: any = {
                contents: sanitizedContents,
                generationConfig: genConfig,
            };

            if (systemInstructionObj) {
                bodyPayload.systemInstruction = systemInstructionObj;
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyPayload),
            });

            const data = await response.json();

            if (response.ok && !data.error) {
                const parts = data.candidates?.[0]?.content?.parts || [];
                const text = parts.map((p: any) => p.text || "").join("");
                const finishReason = data.candidates?.[0]?.finishReason;

                // Jika terpotong karena MAX_TOKENS dan teksnya terlalu pendek (< 300 char), lanjut coba model cadangan
                if (finishReason === "MAX_TOKENS" && text.length < 300) {
                    console.warn(`[Gemini Failover] Model '${modelName}' terpotong (MAX_TOKENS, ${text.length} chars). Mencoba model fallback...`);
                    continue;
                }

                if (text.trim().length > 0) {
                    return { success: true, text, modelUsed: modelName, finishReason };
                }
            }

            const status = response.status;
            const errMsg = data.error?.message || `HTTP ${status}`;
            lastErrorMessage = errMsg;

            console.warn(`[Gemini Failover] Model '${modelName}' gagal (Status ${status}): ${errMsg}. Mencoba model cadangan berikutnya...`);

            // If it's a 503 (High demand) or 429 (Resource exhausted) or 404, loop will try next model
        } catch (netErr: any) {
            lastErrorMessage = netErr.message || "Network Error";
            console.warn(`[Gemini Failover] Koneksi error ke '${modelName}': ${netErr.message}. Beralih...`);
        }
    }

    return {
        success: false,
        error: `Seluruh model AI cadangan sedang padat: ${lastErrorMessage}. Silakan coba beberapa saat lagi.`,
    };
}
