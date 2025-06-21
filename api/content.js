// Serverless function for content management
export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Mock content data
    const mockContent = [
        {
            id: 1,
            niche_id: 1,
            type: 'tweet',
            title: 'AI Innovation Tweet',
            content: '🚀 Just discovered an amazing new AI tool that\'s revolutionizing content creation! The future is here and it\'s incredible. Who else is excited about AI innovations? #AI #Innovation #TechTrends',
            hashtags: '#AI #Innovation #TechTrends #Future #Technology',
            status: 'draft',
            created_at: '2024-01-15T10:30:00Z'
        },
        {
            id: 2,
            niche_id: 2,
            type: 'instagram',
            title: 'Fitness Motivation Post',
            content: '💪 Transform your body, transform your life! \n\n🎯 Today\'s workout focus:\n• 30 min cardio\n• Strength training\n• Proper nutrition\n• Rest & recovery\n\nConsistency is key! 🔥',
            hashtags: '#Fitness #Motivation #Workout #HealthyLifestyle #Transformation',
            status: 'posted',
            created_at: '2024-01-14T08:15:00Z'
        }
    ];

    if (req.method === 'GET') {
        const { status, niche_id } = req.query;
        
        let filteredContent = mockContent;
        
        if (status && status !== 'all') {
            filteredContent = filteredContent.filter(item => item.status === status);
        }
        
        if (niche_id) {
            filteredContent = filteredContent.filter(item => item.niche_id === parseInt(niche_id));
        }

        res.status(200).json({
            success: true,
            content: filteredContent,
            total: filteredContent.length
        });
    } else if (req.method === 'POST') {
        // Handle content creation
        const newContent = {
            id: mockContent.length + 1,
            ...req.body,
            created_at: new Date().toISOString()
        };

        res.status(201).json({
            success: true,
            content: newContent
        });
    } else if (req.method === 'PUT') {
        // Handle content update
        const { id } = req.query;
        const updatedContent = {
            id: parseInt(id),
            ...req.body,
            updated_at: new Date().toISOString()
        };

        res.status(200).json({
            success: true,
            content: updatedContent
        });
    } else if (req.method === 'DELETE') {
        // Handle content deletion
        const { id } = req.query;
        
        res.status(200).json({
            success: true,
            message: `Content ${id} deleted successfully`
        });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
