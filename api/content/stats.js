// Serverless function for content statistics
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

    // Mock content statistics
    const stats = {
        total: 15,
        pending: 8,
        posted: 5,
        deleted: 2,
        thisWeek: 3,
        thisMonth: 12,
        engagement: {
            averageLikes: 245,
            averageShares: 18,
            averageComments: 32
        }
    };

    return res.status(200).json(stats);
}
