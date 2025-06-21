// Serverless function for niches API
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

    // Mock niches data for now (we'll connect to database later)
    const mockNiches = [
        {
            id: 1,
            name: "Tech & Innovation",
            description: "Latest technology trends and innovations",
            persona: "Tech enthusiast who loves cutting-edge innovations",
            keywords: "technology, innovation, AI, startups",
            parent_id: null,
            active: true
        },
        {
            id: 2,
            name: "Fitness & Health",
            description: "Health, fitness, and wellness content",
            persona: "Fitness coach focused on healthy lifestyle",
            keywords: "fitness, health, workout, nutrition",
            parent_id: null,
            active: true
        },
        {
            id: 3,
            name: "Business & Entrepreneurship",
            description: "Business insights and entrepreneurship tips",
            persona: "Successful entrepreneur sharing business wisdom",
            keywords: "business, entrepreneurship, startup, success",
            parent_id: null,
            active: true
        },
        {
            id: 4,
            name: "Travel & Adventure",
            description: "Travel experiences and adventure stories",
            persona: "World traveler sharing amazing experiences",
            keywords: "travel, adventure, destinations, culture",
            parent_id: null,
            active: true
        },
        {
            id: 5,
            name: "Food & Cooking",
            description: "Delicious recipes and cooking tips",
            persona: "Passionate chef sharing culinary expertise",
            keywords: "food, cooking, recipes, cuisine",
            parent_id: null,
            active: true
        }
    ];

    if (req.method === 'GET') {
        // Return mock niches
        res.status(200).json({
            success: true,
            niches: mockNiches
        });
    } else if (req.method === 'POST') {
        // Handle niche creation (mock response)
        const { name, description, persona, keywords } = req.body;
        
        const newNiche = {
            id: mockNiches.length + 1,
            name,
            description,
            persona,
            keywords,
            parent_id: null,
            active: true
        };

        res.status(201).json({
            success: true,
            niche: newNiche
        });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
