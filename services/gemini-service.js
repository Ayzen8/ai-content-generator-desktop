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

    async generateContentWithStyle(niche, style, emotion) {
        if (!this.model) {
            throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
        }

        await this.waitForRateLimit();

        const prompt = this.buildStyleSpecificPrompt(niche, style, emotion);

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return this.parseGeneratedContent(text, 'variation');
        } catch (error) {
            console.error('Gemini API Error:', error);
            throw new Error(`Content variation generation failed: ${error.message}`);
        }
    }

    buildPrompt(niche, contentType) {
        // Enhanced prompt engineering with context awareness
        const currentTime = new Date();
        const timeContext = this.getTimeContext(currentTime);
        const contentVariations = this.getContentVariations();
        const selectedVariation = contentVariations[Math.floor(Math.random() * contentVariations.length)];

        const enhancedPrompt = `
You are a world-class content creator and social media strategist with 10+ years of experience in ${niche.name}. You have a proven track record of creating viral content that drives engagement, builds communities, and provides genuine value.

🎯 CONTEXT & TIMING:
- Current: ${timeContext.day}, ${timeContext.month} ${currentTime.getDate()}, ${currentTime.hour}:00
- Season: ${timeContext.season}
- Content style: ${selectedVariation.style}
- Target emotion: ${selectedVariation.emotion}

👤 BRAND PERSONA: ${niche.persona}

🔑 STRATEGIC KEYWORDS: ${niche.keywords}

📊 CONTENT OBJECTIVES:
1. Drive meaningful engagement (comments, shares, saves)
2. Establish thought leadership in ${niche.name}
3. Build authentic community connections
4. Provide actionable value to followers
5. Optimize for platform algorithms

🎨 CONTENT REQUIREMENTS:

**X POST** (280 characters max):
Create a ${selectedVariation.style} X post that:
- Opens with a compelling hook that stops scrolling
- Incorporates 1-2 strategic keywords naturally
- Includes a clear call-to-action or conversation starter
- Uses X-native language and culture
- Optimizes for retweets and replies
- Evokes ${selectedVariation.emotion}

**INSTAGRAM CAPTION** (150-300 words optimal):
Craft an engaging Instagram caption that:
- Starts with a powerful first line (crucial for engagement)
- Tells a story or shares valuable insights
- Uses 3-5 emojis naturally integrated (not overwhelming)
- Includes strategic line breaks for readability
- Incorporates keywords organically
- Ends with an engaging question or call-to-action
- Matches the ${selectedVariation.style} tone
- Provides genuine value to the ${niche.name} community

**HASHTAG STRATEGY** (12-15 hashtags):
Create a balanced mix of:
- 3-4 broad reach hashtags (100K+ posts)
- 4-5 niche-specific hashtags (10K-100K posts)
- 3-4 micro-niche hashtags (<10K posts)
- 1-2 trending hashtags (if relevant)
- Include both ${niche.name} keywords and related terms

**IMAGE PROMPT** (detailed visual description):
Design a compelling image prompt that:
- Specifies visual style (photo-realistic, illustration, minimalist, etc.)
- Describes composition, colors, and mood
- Aligns with current visual trends
- Complements the content message
- Optimizes for platform aesthetics
- Considers ${timeContext.season} and current trends

🎯 ADVANCED OPTIMIZATION:
- Persona voice: Ensure every word reflects ${niche.persona}
- Timing relevance: Consider it's ${timeContext.day} ${timeContext.season}
- Emotional trigger: Target ${selectedVariation.emotion}
- Value proposition: Each piece must provide clear value
- Community building: Encourage meaningful interactions
- Algorithm optimization: Use proven engagement patterns

🚀 VIRAL POTENTIAL CHECKLIST:
✓ Relatable to target audience
✓ Shareable and save-worthy
✓ Conversation-starting
✓ Visually appealing
✓ Emotionally resonant
✓ Actionable insights

Generate content that feels authentic, provides genuine value, and has viral potential while staying true to the ${niche.persona} voice.

IMPORTANT: Respond with content sections clearly marked as shown below:

**X POST**
[Your optimized X post here]

**INSTAGRAM CAPTION**
[Your engaging Instagram caption here]

**HASHTAGS**
[Your strategic hashtag mix here]

**IMAGE PROMPT**
[Your detailed image generation prompt here]
`;

        return enhancedPrompt;
    }

    buildStyleSpecificPrompt(niche, style, emotion) {
        const currentTime = new Date();
        const timeContext = this.getTimeContext(currentTime);

        const styleInstructions = this.getStyleInstructions(style);
        const emotionInstructions = this.getEmotionInstructions(emotion);

        const styleSpecificPrompt = `
You are a world-class content creator specializing in ${niche.name} with expertise in ${style} content creation.

🎯 SPECIFIC STYLE FOCUS: ${style.toUpperCase()}
🎭 TARGET EMOTION: ${emotion.toUpperCase()}

👤 BRAND PERSONA: ${niche.persona}
🔑 KEYWORDS: ${niche.keywords}
⏰ CONTEXT: ${timeContext.day}, ${timeContext.season}

${styleInstructions}

${emotionInstructions}

🎨 CONTENT CREATION GUIDELINES:

**X POST** (280 characters max):
${this.getXPostInstructions(style, emotion)}

**INSTAGRAM CAPTION** (150-300 words):
${this.getInstagramInstructions(style, emotion)}

**HASHTAG STRATEGY** (12-15 hashtags):
${this.getHashtagInstructions(style, emotion)}

**IMAGE PROMPT**:
${this.getImagePromptInstructions(style, emotion)}

🚀 STYLE-SPECIFIC REQUIREMENTS:
- Every word must reflect the ${style} approach
- Content must evoke ${emotion} in the audience
- Maintain ${niche.persona} voice throughout
- Optimize for ${style} content engagement patterns
- Consider ${timeContext.season} relevance

Generate content that perfectly embodies ${style} style while targeting ${emotion} emotion.

IMPORTANT: Respond with clearly marked sections:

**X POST**
[Your ${style} X post here]

**INSTAGRAM CAPTION**
[Your ${style} Instagram caption here]

**HASHTAGS**
[Your strategic hashtags here]

**IMAGE PROMPT**
[Your ${style} image prompt here]
`;

        return styleSpecificPrompt;
    }

    getStyleInstructions(style) {
        const instructions = {
            'inspirational': `
🚀 INSPIRATIONAL CONTENT MASTERY:
- Use powerful, uplifting language that motivates action
- Include success stories, overcoming challenges, and growth mindset
- Focus on possibility, potential, and transformation
- Use strong action verbs and empowering statements
- Create content that makes people feel they can achieve anything`,

            'educational': `
📚 EDUCATIONAL CONTENT MASTERY:
- Present information in clear, digestible formats
- Use step-by-step explanations and practical examples
- Include facts, statistics, and expert insights
- Structure content for easy learning and retention
- Provide actionable takeaways and next steps`,

            'entertaining': `
😄 ENTERTAINING CONTENT MASTERY:
- Use humor, wit, and playful language
- Include relatable situations and funny observations
- Create content that makes people smile or laugh
- Use entertaining formats like lists, comparisons, or scenarios
- Balance entertainment with value`,

            'thoughtful': `
🤔 THOUGHT-PROVOKING CONTENT MASTERY:
- Ask deep questions that challenge assumptions
- Present different perspectives and nuanced viewpoints
- Encourage reflection and critical thinking
- Use philosophical or analytical approaches
- Create content that sparks meaningful discussions`,

            'conversational': `
💬 CONVERSATIONAL CONTENT MASTERY:
- Write as if talking to a close friend
- Use casual, relatable language and personal anecdotes
- Ask questions and encourage responses
- Share personal experiences and vulnerabilities
- Create content that feels like a genuine conversation`,

            'authoritative': `
🎯 AUTHORITATIVE CONTENT MASTERY:
- Demonstrate deep expertise and industry knowledge
- Use confident, professional language
- Include data, research, and expert opinions
- Position yourself as a trusted thought leader
- Provide definitive guidance and expert recommendations`,

            'storytelling': `
📖 STORYTELLING CONTENT MASTERY:
- Use narrative structure with beginning, middle, and end
- Include characters, conflict, and resolution
- Paint vivid pictures with descriptive language
- Connect stories to broader lessons or insights
- Make content emotionally engaging through narrative`,

            'controversial': `
🔥 CONTROVERSIAL CONTENT MASTERY:
- Present bold, contrarian viewpoints respectfully
- Challenge common beliefs or industry norms
- Use strong, confident language while remaining professional
- Encourage healthy debate and discussion
- Back up controversial statements with logic or evidence`
        };

        return instructions[style] || instructions['conversational'];
    }

    getEmotionInstructions(emotion) {
        const instructions = {
            'empowerment': 'Make readers feel capable, strong, and ready to take action. Use empowering language that builds confidence.',
            'curiosity': 'Spark interest and make readers want to learn more. Use intriguing questions and fascinating insights.',
            'joy': 'Create positive feelings and make readers smile. Use uplifting language and celebratory tone.',
            'contemplation': 'Encourage deep thinking and reflection. Use thoughtful language that promotes introspection.',
            'connection': 'Build relationships and make readers feel understood. Use inclusive, relatable language.',
            'trust': 'Establish credibility and reliability. Use authoritative, professional language backed by expertise.',
            'engagement': 'Encourage interaction and participation. Use language that invites responses and discussions.',
            'passion': 'Ignite strong feelings and enthusiasm. Use energetic, compelling language that motivates action.'
        };

        return `🎭 EMOTION TARGET: ${instructions[emotion] || instructions['engagement']}`;
    }

    getXPostInstructions(style, emotion) {
        return `Create a ${style} X post that immediately evokes ${emotion}. Use platform-native language, include strategic hashtags, and end with a compelling call-to-action that encourages engagement.`;
    }

    getInstagramInstructions(style, emotion) {
        return `Write a ${style} Instagram caption that tells a story or provides value while evoking ${emotion}. Use line breaks for readability, include 3-5 emojis naturally, and end with an engaging question.`;
    }

    getHashtagInstructions(style, emotion) {
        return `Create hashtags that align with ${style} content and ${emotion} targeting. Mix broad reach, niche-specific, and trending hashtags for maximum impact.`;
    }

    getImagePromptInstructions(style, emotion) {
        return `Design an image prompt that visually represents ${style} content and evokes ${emotion}. Consider colors, composition, and visual elements that align with the content style.`;
    }

    getTimeContext(currentTime) {
        return {
            hour: currentTime.getHours(),
            day: currentTime.toLocaleDateString('en-US', { weekday: 'long' }),
            month: currentTime.toLocaleDateString('en-US', { month: 'long' }),
            season: this.getSeason(currentTime.getMonth())
        };
    }

    getSeason(month) {
        if (month >= 2 && month <= 4) return 'Spring';
        if (month >= 5 && month <= 7) return 'Summer';
        if (month >= 8 && month <= 10) return 'Fall';
        return 'Winter';
    }

    getContentVariations() {
        return [
            { style: 'inspirational and motivating', emotion: 'empowerment' },
            { style: 'educational and informative', emotion: 'curiosity' },
            { style: 'entertaining and humorous', emotion: 'joy' },
            { style: 'thought-provoking and insightful', emotion: 'contemplation' },
            { style: 'conversational and relatable', emotion: 'connection' },
            { style: 'authoritative and expert', emotion: 'trust' },
            { style: 'storytelling and narrative', emotion: 'engagement' },
            { style: 'controversial and debate-worthy', emotion: 'passion' }
        ];
    }

    parseGeneratedContent(text, contentType) {
        try {
            // Enhanced parsing with multiple pattern attempts
            const patterns = {
                tweet: [
                    /\*\*X POST\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s,
                    /\*\*TWEET\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s,
                    /X POST[:\s]*\n(.*?)(?=\n(?:INSTAGRAM|HASHTAGS|\*\*)|$)/s
                ],
                instagram: [
                    /\*\*INSTAGRAM CAPTION\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s,
                    /INSTAGRAM CAPTION[:\s]*\n(.*?)(?=\n(?:HASHTAGS|IMAGE|\*\*)|$)/s,
                    /\*\*INSTAGRAM\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s
                ],
                hashtags: [
                    /\*\*HASHTAGS\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s,
                    /\*\*HASHTAG STRATEGY\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s,
                    /HASHTAGS[:\s]*\n(.*?)(?=\n(?:IMAGE|\*\*)|$)/s
                ],
                imagePrompt: [
                    /\*\*IMAGE PROMPT\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s,
                    /IMAGE PROMPT[:\s]*\n(.*?)$/s,
                    /\*\*IMAGE\*\*[:\s]*\n(.*?)$/s
                ]
            };

            const content = {
                tweet: '',
                instagram: '',
                hashtags: '',
                imagePrompt: '',
                rawResponse: text
            };

            // Try multiple patterns for each content type
            for (const [key, patternList] of Object.entries(patterns)) {
                for (const pattern of patternList) {
                    const match = text.match(pattern);
                    if (match && match[1]) {
                        content[key] = match[1].trim();
                        break;
                    }
                }
            }

            // Enhanced content cleaning
            content.tweet = this.cleanContent(content.tweet);
            content.instagram = this.cleanInstagramContent(content.instagram);
            content.hashtags = this.cleanHashtags(content.hashtags);
            content.imagePrompt = this.cleanContent(content.imagePrompt);

            // Advanced tweet optimization
            content.tweet = this.optimizeTweet(content.tweet);

            // Quality validation
            this.validateContent(content);

            return content;
        } catch (error) {
            console.error('Error parsing generated content:', error);
            return {
                tweet: 'Content generation error - please try again',
                instagram: 'Content generation error - please try again',
                hashtags: '#contentgeneration #ai',
                imagePrompt: 'A professional social media content creation workspace',
                rawResponse: text,
                error: error.message
            };
        }
    }

    cleanInstagramContent(content) {
        return content
            .replace(/^\[|\]$/g, '') // Remove brackets
            .replace(/^["']|["']$/g, '') // Remove quotes
            .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks
            .trim();
    }

    optimizeTweet(tweet) {
        // Ensure tweet is within character limit
        if (tweet.length > 280) {
            // Try to cut at a word boundary
            const truncated = tweet.substring(0, 277);
            const lastSpace = truncated.lastIndexOf(' ');
            if (lastSpace > 200) {
                tweet = truncated.substring(0, lastSpace) + '...';
            } else {
                tweet = truncated + '...';
            }
        }

        // Ensure it doesn't end with incomplete hashtags
        if (tweet.endsWith('#')) {
            tweet = tweet.slice(0, -1).trim();
        }

        return tweet;
    }

    validateContent(content) {
        // Ensure minimum content quality
        if (!content.tweet || content.tweet.length < 10) {
            content.tweet = 'Exciting content coming soon! 🚀 #content #socialmedia';
        }

        if (!content.instagram || content.instagram.length < 20) {
            content.instagram = 'Creating amazing content for our community! ✨\n\nStay tuned for more updates and insights.';
        }

        if (!content.hashtags || content.hashtags.length < 5) {
            content.hashtags = '#content #socialmedia #digital #marketing #community';
        }

        if (!content.imagePrompt || content.imagePrompt.length < 20) {
            content.imagePrompt = 'A modern, clean social media post design with vibrant colors and professional typography';
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
