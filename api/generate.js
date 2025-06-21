// Serverless function for content generation
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { nicheId, contentType, customPrompt } = req.body;

        // Mock content generation (replace with actual AI service later)
        const mockContent = {
            tweet: {
                content: "🚀 Just discovered an amazing new AI tool that's revolutionizing content creation! The future is here and it's incredible. Who else is excited about AI innovations? #AI #Innovation #TechTrends",
                hashtags: "#AI #Innovation #TechTrends #Future #Technology"
            },
            instagram: {
                content: "✨ Transform your content game with AI! \n\n🎯 Key benefits:\n• Save hours of time\n• Boost engagement\n• Scale your content\n• Stay consistent\n\nReady to level up? 💪",
                hashtags: "#ContentCreation #AI #SocialMedia #DigitalMarketing #Productivity #Innovation #TechLife #CreatorEconomy #Automation #Growth"
            }
        };

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));

        const generatedContent = mockContent[contentType] || mockContent.tweet;

        res.status(200).json({
            success: true,
            content: {
                id: Date.now(),
                niche_id: nicheId,
                type: contentType,
                content: generatedContent.content,
                hashtags: generatedContent.hashtags,
                status: 'draft',
                created_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate content'
        });
    }
}
