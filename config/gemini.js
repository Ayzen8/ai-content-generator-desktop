const config = {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-pro',
    maxTokens: 1024,
    temperature: 0.7,
    rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 60000
    }
};

module.exports = config;
