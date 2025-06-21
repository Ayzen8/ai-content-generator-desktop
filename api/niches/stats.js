// Serverless function for niche statistics
export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Mock niche statistics
    const stats = {
        total: 5,
        active: 5,
        inactive: 0,
        mostPopular: "Technology & Innovation",
        recentlyAdded: 2,
        performance: {
            topPerforming: "Fitness & Health",
            averageEngagement: 78.5,
            totalContent: 45
        }
    };

    return res.status(200).json(stats);
}
