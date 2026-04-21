/**
 * Utility to wrap AI calls with exponential backoff and retry logic.
 * Specifically handles 429 (Rate Limit / Resource Exhausted) errors.
 */

export async function withAiRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 2000 // Start with 2s as 429s often need a bit of cooldown
): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            
            // Detection logic for Gemini/Google AI SDK 429 errors
            const errorMessage = error.message || "";
            const isRateLimit = 
                errorMessage.includes("429") || 
                errorMessage.includes("Too Many Requests") || 
                errorMessage.includes("Resource exhausted") ||
                error.status === 429;

            // If it's not a rate limit error or we've exhausted retries, throw
            if (!isRateLimit || i === maxRetries) {
                throw error;
            }

            // Exponential backoff: 2s, 4s, 8s... + jitter
            const delay = (initialDelay * Math.pow(2, i)) + (Math.random() * 500);
            
            console.warn(`[AI Retry] Attempt ${i + 1} failed (429). Retrying in ${Math.round(delay)}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}
