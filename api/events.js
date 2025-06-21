// Serverless function for SSE events (mock implementation)
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

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // SSE is not supported in serverless functions
    // Return a simple response instead
    res.status(200).json({
        message: 'SSE not supported in serverless environment',
        type: 'info',
        timestamp: new Date().toISOString()
    });
}
