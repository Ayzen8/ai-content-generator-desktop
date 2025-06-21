// Simple test API endpoint for Vercel
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

    // Simple test response
    res.status(200).json({
        message: 'AI Content Generator API is working!',
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url
    });
}
