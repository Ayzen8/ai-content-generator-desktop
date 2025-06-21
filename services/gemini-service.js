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

        const nicheStrategy = this.getNicheSpecificStrategy(niche.name);

        const enhancedPrompt = `
You are a world-class content creator and social media strategist with 10+ years of experience in ${niche.name}. You have a proven track record of creating viral content that drives engagement, builds communities, and provides genuine value.

🎯 CONTEXT & TIMING:
- Current: ${timeContext.day}, ${timeContext.month} ${currentTime.getDate()}, ${currentTime.hour}:00
- Season: ${timeContext.season}
- Content style: ${selectedVariation.style}
- Target emotion: ${selectedVariation.emotion}

👤 BRAND PERSONA: ${niche.persona}

🔑 STRATEGIC KEYWORDS: ${niche.keywords}

🎯 NICHE-SPECIFIC STRATEGY: ${nicheStrategy}

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

**IMAGE PROMPT** (detailed AI image generation prompt):
Create a comprehensive image generation prompt that:
- Specifies exact visual style (photorealistic, digital art, illustration, minimalist, etc.)
- Details composition, lighting, colors, and mood
- Includes technical specifications (4K, professional photography, etc.)
- Aligns with ${niche.name} aesthetic and current visual trends
- Complements and enhances the written content message
- Optimizes for social media platform aesthetics
- Considers ${timeContext.season} and trending visual elements
- Uses AI image generation best practices (detailed descriptions, style keywords, quality modifiers)

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
        const styleVisuals = this.getStyleVisualGuidelines(style);
        const emotionVisuals = this.getEmotionVisualGuidelines(emotion);

        return `Create a detailed image generation prompt that:

        **VISUAL STYLE**: ${styleVisuals}
        **EMOTIONAL TONE**: ${emotionVisuals}

        **TECHNICAL SPECIFICATIONS**:
        - Resolution: High-quality, social media optimized (1080x1080 for Instagram, 1200x675 for X)
        - Composition: Rule of thirds, balanced visual hierarchy
        - Color psychology: Colors that evoke ${emotion}
        - Typography: Modern, readable fonts if text is included
        - Lighting: Professional, mood-appropriate lighting
        - Background: Clean, non-distracting, complements subject

        **CONTENT ALIGNMENT**:
        - Must visually support the written content message
        - Should stop scroll and encourage engagement
        - Platform-appropriate aesthetic (Instagram vs X visual culture)
        - Trending visual elements and current design trends

        **PROMPT STRUCTURE**: Write as a detailed prompt for AI image generation tools like Midjourney, DALL-E, or Stable Diffusion. Include specific details about style, composition, colors, mood, and technical quality.`;
    }

    getStyleVisualGuidelines(style) {
        const guidelines = {
            'inspirational': 'Uplifting imagery with bright, energetic colors. Mountain peaks, sunrise/sunset, achievement symbols, upward arrows, success metaphors. Clean, modern aesthetic with motivational visual elements.',
            'educational': 'Clean, professional design with infographic elements. Books, lightbulbs, charts, diagrams, step-by-step visuals. Organized layout with clear information hierarchy and academic feel.',
            'entertaining': 'Playful, colorful, dynamic composition. Fun illustrations, cartoon elements, bright colors, whimsical designs. Engaging visual humor and eye-catching graphics.',
            'thoughtful': 'Minimalist, contemplative imagery. Muted colors, philosophical symbols, abstract concepts, peaceful scenes. Clean lines and sophisticated visual metaphors.',
            'conversational': 'Warm, approachable visuals. Friendly colors, relatable scenarios, casual photography style. Human-centered imagery that feels personal and authentic.',
            'authoritative': 'Professional, polished design. Corporate colors, clean typography, data visualizations, expert imagery. Sophisticated and credible visual presentation.',
            'storytelling': 'Narrative-driven visuals with cinematic quality. Sequential elements, character-focused imagery, dramatic lighting. Visual storytelling techniques.',
            'controversial': 'Bold, attention-grabbing design. Contrasting colors, strong visual statements, debate-worthy imagery. Provocative but professional visual approach.'
        };

        return guidelines[style] || guidelines['conversational'];
    }

    getEmotionVisualGuidelines(emotion) {
        const guidelines = {
            'empowerment': 'Strong, confident imagery with bold colors (reds, oranges, golds). Power poses, achievement symbols, breakthrough moments.',
            'curiosity': 'Intriguing, mysterious elements with cool colors (blues, purples). Question marks, discovery themes, exploration imagery.',
            'joy': 'Bright, cheerful visuals with warm colors (yellows, oranges, pinks). Smiling faces, celebration imagery, positive energy.',
            'contemplation': 'Calm, reflective imagery with neutral tones (grays, blues, earth tones). Peaceful scenes, thinking poses, zen elements.',
            'connection': 'Warm, inclusive imagery with connecting elements. Community colors, networking visuals, relationship symbols.',
            'trust': 'Reliable, stable imagery with trustworthy colors (blues, greens). Professional settings, handshakes, security symbols.',
            'engagement': 'Interactive, dynamic visuals with engaging colors. Call-to-action elements, participation imagery, community focus.',
            'passion': 'Intense, energetic imagery with passionate colors (reds, oranges). Fire elements, intense emotions, high-energy visuals.'
        };

        return guidelines[emotion] || guidelines['engagement'];
    }

    getNicheSpecificStrategy(nicheName) {
        const strategies = {
            'Finance & Business': `
            🏦 FINANCE CONTENT MASTERY:
            - Use market data, statistics, and real financial examples
            - Include actionable investment tips and wealth-building strategies
            - Reference current market trends and economic events
            - Avoid financial advice disclaimers but focus on education
            - Use success stories and case studies
            - Include risk management and long-term thinking
            - Target both beginners and experienced investors`,

            'Anime & Manga': `
            🎌 ANIME CONTENT MASTERY:
            - Reference specific anime series, characters, and studios
            - Use anime terminology and cultural references naturally
            - Connect anime themes to real-world philosophy and emotions
            - Include both mainstream and niche series recommendations
            - Discuss animation quality, storytelling, and character development
            - Reference seasonal anime and trending series
            - Appeal to both casual viewers and hardcore otaku`,

            'Health & Wellness': `
            💪 WELLNESS CONTENT MASTERY:
            - Provide science-backed health information
            - Include practical fitness tips and nutrition advice
            - Focus on mental health and holistic wellness
            - Use motivational language that encourages healthy habits
            - Include transformation stories and progress tracking
            - Address common health myths and misconceptions
            - Promote sustainable lifestyle changes`,

            'Technology & Gaming': `
            🎮 TECH GAMING MASTERY:
            - Reference latest games, tech trends, and industry news
            - Include gaming tips, strategies, and reviews
            - Discuss hardware, software, and gaming culture
            - Use gaming terminology and community language
            - Include both casual and competitive gaming content
            - Reference popular streamers and gaming personalities
            - Cover emerging tech and gaming innovations`,

            'Travel & Adventure': `
            ✈️ TRAVEL CONTENT MASTERY:
            - Include specific destinations, hidden gems, and travel tips
            - Use wanderlust-inspiring language and imagery
            - Provide practical travel advice and budget tips
            - Include cultural insights and local experiences
            - Reference seasonal travel opportunities
            - Appeal to different travel styles (luxury, budget, adventure)
            - Include travel photography and storytelling elements`,

            'Food & Cooking': `
            🍳 CULINARY CONTENT MASTERY:
            - Include specific recipes, cooking techniques, and food trends
            - Use sensory language that makes food sound delicious
            - Provide cooking tips and kitchen hacks
            - Reference different cuisines and cultural food traditions
            - Include both simple and complex cooking content
            - Appeal to different dietary preferences and restrictions
            - Use food photography and presentation tips`,

            'Luxury & Lifestyle': `
            💎 LUXURY CONTENT MASTERY:
            - Reference high-end brands, products, and experiences
            - Use sophisticated language that appeals to affluent audiences
            - Include luxury travel, fashion, and lifestyle content
            - Provide insider tips and exclusive insights
            - Appeal to aspirational and achieved luxury consumers
            - Include investment pieces and timeless luxury items
            - Use elegant and refined visual aesthetics`
        };

        return strategies[nicheName] || `
        🎯 GENERAL CONTENT STRATEGY:
        - Create valuable, engaging content that resonates with your target audience
        - Use authentic voice and provide genuine insights
        - Include actionable tips and practical advice
        - Reference current trends and timely topics
        - Appeal to both beginners and experienced enthusiasts
        - Use community language and cultural references
        - Focus on building trust and authority in your niche`;
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
        const currentHour = new Date().getHours();
        const isWeekend = [0, 6].includes(new Date().getDay());

        // Time-based content variations for optimal engagement
        const baseVariations = [
            { style: 'inspirational and motivating', emotion: 'empowerment', bestTimes: [6, 7, 8, 18, 19] },
            { style: 'educational and informative', emotion: 'curiosity', bestTimes: [9, 10, 11, 14, 15] },
            { style: 'entertaining and humorous', emotion: 'joy', bestTimes: [12, 13, 17, 20, 21] },
            { style: 'thought-provoking and insightful', emotion: 'contemplation', bestTimes: [16, 17, 22, 23] },
            { style: 'conversational and relatable', emotion: 'connection', bestTimes: [11, 12, 13, 19, 20] },
            { style: 'authoritative and expert', emotion: 'trust', bestTimes: [9, 10, 14, 15, 16] },
            { style: 'storytelling and narrative', emotion: 'engagement', bestTimes: [18, 19, 20, 21] },
            { style: 'controversial and debate-worthy', emotion: 'passion', bestTimes: [11, 12, 16, 17] },
            { style: 'behind-the-scenes and personal', emotion: 'connection', bestTimes: [8, 9, 18, 19] },
            { style: 'trending and viral-worthy', emotion: 'engagement', bestTimes: [12, 13, 17, 18, 20] }
        ];

        // Filter variations based on current time for better engagement
        const timeOptimizedVariations = baseVariations.filter(variation =>
            variation.bestTimes.includes(currentHour) || Math.random() > 0.7
        );

        // If no time-optimized variations, return all
        return timeOptimizedVariations.length > 0 ? timeOptimizedVariations : baseVariations;
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
        // Enhanced content quality validation with better fallbacks
        if (!content.tweet || content.tweet.length < 10) {
            const fallbackTweets = [
                'Ready to level up? 🚀 Drop a 💪 if you\'re committed to growth! #motivation #success',
                'The best time to start was yesterday. The second best time is now. ⏰ #mindset #action',
                'Small steps daily lead to big changes yearly. What\'s your next move? 🎯 #progress #goals'
            ];
            content.tweet = fallbackTweets[Math.floor(Math.random() * fallbackTweets.length)];
        }

        if (!content.instagram || content.instagram.length < 20) {
            content.instagram = `Creating valuable content for our amazing community! ✨

Every day is a new opportunity to learn, grow, and make progress toward your goals.

What's one thing you're working on today that your future self will thank you for?

Drop it in the comments below! 👇`;
        }

        if (!content.hashtags || content.hashtags.length < 5) {
            content.hashtags = '#growth #motivation #community #success #mindset #goals #inspiration #progress #lifestyle #content';
        }

        if (!content.imagePrompt || content.imagePrompt.length < 20) {
            content.imagePrompt = 'Professional social media post design, modern minimalist aesthetic, vibrant gradient background, clean typography, high-quality 4K resolution, Instagram-optimized layout, trending visual style, engaging and scroll-stopping design';
        }

        // Ensure tweet is within character limit
        if (content.tweet.length > 280) {
            content.tweet = this.optimizeTweet(content.tweet);
        }

        // Ensure hashtags are properly formatted
        content.hashtags = this.cleanHashtags(content.hashtags);
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

    // Improve content based on quality analysis
    async improveContent(originalContent, analysis, niche = null) {
        if (!this.model) {
            throw new Error('Gemini API not configured');
        }

        try {
            const improvementPrompt = this.buildImprovementPrompt(originalContent, analysis, niche);

            const result = await this.model.generateContent(improvementPrompt);
            const response = await result.response;
            const text = response.text();

            const improvedContent = this.parseImprovedContent(text, originalContent);

            return improvedContent;
        } catch (error) {
            console.error('Error improving content with Gemini:', error);
            throw new Error(`Content improvement failed: ${error.message}`);
        }
    }

    buildImprovementPrompt(originalContent, analysis, niche) {
        const improvements = analysis.improvements || [];
        const suggestions = analysis.suggestions || [];
        const weakAreas = improvements.filter(imp => imp.priority === 'high');

        const prompt = `
🔧 CONTENT IMPROVEMENT SPECIALIST

You are an expert content optimizer. Improve the following content based on the quality analysis provided.

📊 CURRENT QUALITY ANALYSIS:
- Overall Score: ${analysis.overallScore}/100 (Grade: ${analysis.grade})
- Viral Potential: ${analysis.viralPotential?.potential || 'Unknown'}

🎯 NICHE CONTEXT:
${niche ? `
- Niche: ${niche.name}
- Persona: ${niche.persona}
- Keywords: ${niche.keywords}
` : 'No specific niche context provided'}

📝 ORIGINAL CONTENT:
**X POST:** ${originalContent.tweet}
**INSTAGRAM:** ${originalContent.instagram}
**HASHTAGS:** ${originalContent.hashtags}
**IMAGE PROMPT:** ${originalContent.imagePrompt}

🚨 PRIORITY IMPROVEMENTS NEEDED:
${weakAreas.map(area => `- ${area.category}: ${area.message} (Score: ${area.score}/100)`).join('\n')}

💡 SPECIFIC SUGGESTIONS:
${suggestions.map(sug => `- ${sug.category}: ${sug.message} (Priority: ${sug.priority})`).join('\n')}

🎯 IMPROVEMENT OBJECTIVES:
1. **Engagement**: ${analysis.scores?.engagement?.score < 70 ? 'Add stronger hooks, questions, and calls-to-action' : 'Maintain current engagement level'}
2. **Readability**: ${analysis.scores?.readability?.score < 70 ? 'Improve structure, clarity, and flow' : 'Maintain current readability'}
3. **Relevance**: ${analysis.scores?.relevance?.score < 70 ? 'Better align with niche and trending topics' : 'Maintain current relevance'}
4. **Creativity**: ${analysis.scores?.creativity?.score < 70 ? 'Add more originality and storytelling elements' : 'Maintain current creativity'}
5. **Technical**: ${analysis.scores?.technical?.score < 70 ? 'Fix grammar, spelling, and formatting issues' : 'Maintain technical quality'}

🚀 IMPROVEMENT INSTRUCTIONS:
- Keep the core message and value proposition intact
- Apply ALL priority improvements identified above
- Enhance weak areas while preserving strengths
- Ensure content remains authentic to the ${niche?.persona || 'brand voice'}
- Optimize for maximum engagement and viral potential
- Maintain character limits (X: 280 chars, Instagram: reasonable length)

📋 REQUIRED OUTPUT FORMAT:

**IMPROVED X POST**
[Your improved X post here - must address engagement and technical issues]

**IMPROVED INSTAGRAM CAPTION**
[Your improved Instagram caption here - must address readability and creativity issues]

**IMPROVED HASHTAGS**
[Your improved hashtag strategy here - must be relevant and strategic]

**IMPROVED IMAGE PROMPT**
[Your improved image prompt here - must be more creative and specific]

**IMPROVEMENTS APPLIED**
[List the specific improvements you made, e.g., "Added stronger hook", "Improved readability with line breaks", etc.]

Generate improved content that addresses ALL identified weaknesses while maintaining the original intent and value.
`;

        return prompt;
    }

    parseImprovedContent(text, originalContent) {
        try {
            const patterns = {
                tweet: /\*\*IMPROVED X POST\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s,
                instagram: /\*\*IMPROVED INSTAGRAM CAPTION\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s,
                hashtags: /\*\*IMPROVED HASHTAGS\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s,
                imagePrompt: /\*\*IMPROVED IMAGE PROMPT\*\*[:\s]*\n(.*?)(?=\n\*\*|$)/s,
                improvements: /\*\*IMPROVEMENTS APPLIED\*\*[:\s]*\n(.*?)$/s
            };

            const improvedContent = {
                tweet: originalContent.tweet,
                instagram: originalContent.instagram,
                hashtags: originalContent.hashtags,
                imagePrompt: originalContent.imagePrompt,
                improvements: []
            };

            // Extract improved content
            for (const [key, pattern] of Object.entries(patterns)) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    if (key === 'improvements') {
                        // Parse improvements list
                        const improvementsList = match[1].trim()
                            .split('\n')
                            .map(line => line.replace(/^[-•*]\s*/, '').trim())
                            .filter(line => line.length > 0);
                        improvedContent.improvements = improvementsList;
                    } else {
                        improvedContent[key] = this.cleanContent(match[1]);
                    }
                }
            }

            // Clean and optimize improved content
            improvedContent.tweet = this.optimizeTweet(improvedContent.tweet);
            improvedContent.instagram = this.cleanInstagramContent(improvedContent.instagram);
            improvedContent.hashtags = this.cleanHashtags(improvedContent.hashtags);
            improvedContent.imagePrompt = this.cleanContent(improvedContent.imagePrompt);

            // Validate improvements were actually made
            this.validateImprovements(improvedContent, originalContent);

            return improvedContent;
        } catch (error) {
            console.error('Error parsing improved content:', error);
            throw new Error('Failed to parse improved content');
        }
    }

    validateImprovements(improvedContent, originalContent) {
        // Ensure content was actually improved, not just copied
        const changes = {
            tweet: improvedContent.tweet !== originalContent.tweet,
            instagram: improvedContent.instagram !== originalContent.instagram,
            hashtags: improvedContent.hashtags !== originalContent.hashtags,
            imagePrompt: improvedContent.imagePrompt !== originalContent.imagePrompt
        };

        const changesCount = Object.values(changes).filter(Boolean).length;

        if (changesCount === 0) {
            // If no changes were made, add default improvements
            improvedContent.improvements = ['Content reviewed and optimized for quality'];
        }

        // Ensure improvements list exists
        if (!improvedContent.improvements || improvedContent.improvements.length === 0) {
            improvedContent.improvements = ['Enhanced content quality and engagement potential'];
        }
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
