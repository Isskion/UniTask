"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROK_MODEL = exports.getGrokClient = void 0;
const openai_1 = require("openai");
/**
 * Creates an OpenAI-compatible client pointed at xAI's Grok API.
 */
function getGrokClient(apiKey) {
    return new openai_1.default({
        apiKey: apiKey.trim(),
        baseURL: "https://api.x.ai/v1"
    });
}
exports.getGrokClient = getGrokClient;
/** Default Grok model for all AI functions */
exports.GROK_MODEL = "grok-4-latest";
//# sourceMappingURL=grok.js.map