export class ApiService {
    private static baseUrl = window.location.hostname === 'localhost'
        ? "http://localhost:3000"
        : window.location.origin;

    static async get(endpoint: string) {
        console.log(`Making GET request to: ${this.baseUrl}${endpoint}`);
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            console.log(`Response status: ${response.status}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log(`Response data:`, data);
            return data;
        } catch (error) {
            console.error(`API GET error for ${endpoint}:`, error);
            throw error;
        }
    }

    static async post(endpoint: string, data: any) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    static async put(endpoint: string, data: any) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    static async patch(endpoint: string, data: any) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    static async delete(endpoint: string) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: "DELETE",
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    // Advanced Analytics Methods
    static async getAdvancedAnalytics(timeframe: string = '30d') {
        return this.get(`/api/analytics/dashboard/${timeframe}`);
    }

    static async getPredictiveAnalytics() {
        return this.get('/api/analytics/predictive');
    }

    static async recordContentPerformance(contentId: number, platform: string, metrics: any) {
        return this.post('/api/analytics/content-performance', { contentId, platform, metrics });
    }

    static async recordGrowthMetrics(platform: string, metrics: any) {
        return this.post('/api/analytics/growth-metrics', { platform, metrics });
    }

    static async recordGrowthBotAnalytics(metrics: any) {
        return this.post('/api/analytics/growth-bot', { metrics });
    }
}

export default ApiService;
