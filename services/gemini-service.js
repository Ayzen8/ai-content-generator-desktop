const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        if (!this.apiKey) {
            console.warn('⚠️  GEMINI_API_KEY not found in environment variables');
            console.warn('   Please set your Gemini API key to enable content generation');
        }
        this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;

        // Try different model names in order of preference
        this.modelNames = [
            'gemini-2.5-flash',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro',
            'gemini-1.0-pro'
        ];

        this.model = null;
        this.currentModelName = null;

        if (this.genAI) {
            // We'll initialize the model on first use to handle errors gracefully
            this.currentModelName = this.modelNames[0];
            this.model = this.genAI.getGenerativeModel({ model: this.currentModelName });
        }
        
        // Rate limiting
        this.lastRequestTime = 0;
        this.minRequestInterval = 1000; // 1 second between requests
    }

    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
            const waitTime = this.minRequestInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.lastRequestTime = Date.now();
    }

    async generateContent(niche, contentType = 'complete') {
        if (!this.model) {
            throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
        }

        await this.waitForRateLimit();

        const prompt = this.buildPrompt(niche, contentType);
        
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            return this.parseGeneratedContent(text, contentType);
        } catch (error) {
            console.error('Gemini API Error:', error);
            throw new Error(`Content generation failed: ${error.message}`);
        }
    }

    buildPrompt(niche, contentType) {
        const basePrompt = `
You are a content creator specializing in ${niche.name}. 

PERSONA: ${niche.persona}

KEYWORDS TO INCORPORATE: ${niche.keywords}

Generate engaging social media content that:
1. Matches the persona's voice and expertise level
2. Incorporates relevant keywords naturally
3. Is optimized for engagement and shareability
4. Stays current with trends in ${niche.name}
5. Provides value to the audience

Create a complete content package with:

**X POST** (max 280 characters):
[Write an engaging X (formerly Twitter) post that captures attention and encourages interaction. Focus on X platform culture and engagement patterns.]

**INSTAGRAM CAPTION** (engaging, with line breaks for readability):
[Write a longer-form caption that tells a story or provides value, optimized for Instagram platform and audience.]

**HASHTAGS** (mix of popular and niche-specific, 10-15 hashtags):
[Provide hashtags that balance reach with relevance for both platforms]

**IMAGE PROMPT** (for AI image generation):
[Create a detailed prompt for generating an eye-catching image that complements the content]

Make sure each piece of content:
- Reflects the persona's expertise and tone
- Uses keywords naturally (not forced)
- Is platform-appropriate (X for quick engagement and viral potential, Instagram for visual storytelling)
- Encourages engagement
- Provides genuine value to followers
- X posts should focus on X platform culture, not Instagram references

Remember: The persona is ${niche.persona}

Focus on creating content about current trends, tips, insights, or interesting facts related to ${niche.name}.
`;

        return basePrompt;
    }

    parseGeneratedContent(text, contentType) {
        try {
            // Extract sections using regex patterns
            const tweetMatch = text.match(/\*\*(?:X POST|TWEET)\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s);
            const instagramMatch = text.match(/\*\*INSTAGRAM CAPTION\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s);
            const hashtagsMatch = text.match(/\*\*HASHTAGS\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s);
            const imagePromptMatch = text.match(/\*\*IMAGE PROMPT\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s);

            const content = {
                tweet: tweetMatch ? tweetMatch[1].trim() : '',
                instagram: instagramMatch ? instagramMatch[1].trim() : '',
                hashtags: hashtagsMatch ? hashtagsMatch[1].trim() : '',
                imagePrompt: imagePromptMatch ? imagePromptMatch[1].trim() : '',
                rawResponse: text
            };

            // Clean up content
            content.tweet = this.cleanContent(content.tweet);
            content.instagram = this.cleanContent(content.instagram);
            content.hashtags = this.cleanHashtags(content.hashtags);
            content.imagePrompt = this.cleanContent(content.imagePrompt);

            // Validate tweet length
            if (content.tweet.length > 280) {
                content.tweet = content.tweet.substring(0, 277) + '...';
            }

            return content;
        } catch (error) {
            console.error('Error parsing generated content:', error);
            return {
                tweet: 'Content generation error',
                instagram: 'Content generation error',
                hashtags: '',
                imagePrompt: 'Content generation error',
                rawResponse: text,
                error: error.message
            };
        }
    }

    cleanContent(content) {
        return content
            .replace(/^\[|\]$/g, '') // Remove brackets
            .replace(/^["']|["']$/g, '') // Remove quotes
            .trim();
    }

    cleanHashtags(hashtags) {
        return hashtags
            .replace(/^\[|\]$/g, '') // Remove brackets
            .split(/[,\n]/) // Split by comma or newline
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
            .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
            .join(' ');
    }

    async generateMultipleIdeas(niche, count = 3) {
        const ideas = [];
        
        for (let i = 0; i < count; i++) {
            try {
                const content = await this.generateContent(niche);
                ideas.push({
                    id: Date.now() + i,
                    niche_id: niche.id,
                    niche_name: niche.name,
                    ...content,
                    created_at: new Date().toISOString(),
                    status: 'pending'
                });
            } catch (error) {
                console.error(`Error generating idea ${i + 1}:`, error);
                ideas.push({
                    id: Date.now() + i,
                    niche_id: niche.id,
                    niche_name: niche.name,
                    tweet: 'Generation failed',
                    instagram: 'Generation failed',
                    hashtags: '',
                    imagePrompt: 'Generation failed',
                    error: error.message,
                    created_at: new Date().toISOString(),
                    status: 'error'
                });
            }
        }
        
        return ideas;
    }

    // Test method to verify API connection
    async testConnection() {
        if (!this.model) {
            return { success: false, error: 'API key not configured' };
        }

        try {
            const result = await this.model.generateContent('Say "Hello, Gemini API is working!" in a creative way.');
            const response = await result.response;
            const text = response.text();
            
            return { 
                success: true, 
                message: 'Gemini API connection successful',
                response: text 
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
}

module.exports = GeminiService;
