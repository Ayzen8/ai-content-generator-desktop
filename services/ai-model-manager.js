const GeminiService = require('./gemini-service');

class AIModelManager {
    constructor() {
        this.models = {
            'gemini-2.5-flash': {
                name: 'Gemini 2.5 Flash',
                provider: 'Google',
                description: 'Latest Gemini model with fast response times and high quality',
                icon: '🚀',
                service: new GeminiService(),
                available: true,
                features: ['Fast Generation', 'High Quality', 'Context Aware', 'Latest Model']
            },
            'gpt-4-turbo': {
                name: 'GPT-4 Turbo',
                provider: 'OpenAI',
                description: 'Latest GPT-4 model with improved speed and capabilities',
                icon: '⚡',
                service: null, // Will be implemented
                available: false,
                features: ['Latest GPT', 'Fast Response', 'Versatile', 'Creative']
            },
            'gpt-3.5-turbo': {
                name: 'GPT-3.5 Turbo',
                provider: 'OpenAI',
                description: 'Cost-effective OpenAI model with good performance',
                icon: '💰',
                service: null, // Will be implemented
                available: false,
                features: ['Cost Effective', 'Fast', 'Reliable', 'Good Quality']
            }
        };

        this.currentModel = 'gemini-2.5-flash';
        this.fallbackModel = 'gpt-3.5-turbo';
    }

    // Get all available models
    getAvailableModels() {
        return Object.entries(this.models)
            .filter(([_, model]) => model.available)
            .map(([id, model]) => ({
                id,
                ...model,
                isCurrent: id === this.currentModel
            }));
    }

    // Get all models (including unavailable ones)
    getAllModels() {
        return Object.entries(this.models).map(([id, model]) => ({
            id,
            ...model,
            isCurrent: id === this.currentModel
        }));
    }

    // Set current model
    setCurrentModel(modelId) {
        if (this.models[modelId] && this.models[modelId].available) {
            this.currentModel = modelId;
            return true;
        }
        return false;
    }

    // Get current model info
    getCurrentModel() {
        return {
            id: this.currentModel,
            ...this.models[this.currentModel]
        };
    }

    // Generate content using current model
    async generateContent(niche, contentType = 'complete') {
        const model = this.models[this.currentModel];
        
        if (!model || !model.available || !model.service) {
            throw new Error(`Model ${this.currentModel} is not available`);
        }

        try {
            return await model.service.generateContent(niche, contentType);
        } catch (error) {
            console.error(`Error with ${this.currentModel}:`, error);
            
            // Try fallback model if available
            if (this.fallbackModel !== this.currentModel && this.models[this.fallbackModel]?.available) {
                console.log(`Falling back to ${this.fallbackModel}`);
                try {
                    return await this.models[this.fallbackModel].service.generateContent(niche, contentType);
                } catch (fallbackError) {
                    console.error(`Fallback model ${this.fallbackModel} also failed:`, fallbackError);
                    throw new Error(`Both primary and fallback models failed: ${error.message}`);
                }
            }
            
            throw error;
        }
    }

    // Generate content with specific style
    async generateContentWithStyle(niche, style, emotion) {
        const model = this.models[this.currentModel];
        
        if (!model || !model.available || !model.service) {
            throw new Error(`Model ${this.currentModel} is not available`);
        }

        try {
            if (model.service.generateContentWithStyle) {
                return await model.service.generateContentWithStyle(niche, style, emotion);
            } else {
                // Fallback to regular generation if style-specific method not available
                return await model.service.generateContent(niche, 'variation');
            }
        } catch (error) {
            console.error(`Error with ${this.currentModel}:`, error);
            
            // Try fallback model
            if (this.fallbackModel !== this.currentModel && this.models[this.fallbackModel]?.available) {
                console.log(`Falling back to ${this.fallbackModel} for style generation`);
                try {
                    const fallbackService = this.models[this.fallbackModel].service;
                    if (fallbackService.generateContentWithStyle) {
                        return await fallbackService.generateContentWithStyle(niche, style, emotion);
                    } else {
                        return await fallbackService.generateContent(niche, 'variation');
                    }
                } catch (fallbackError) {
                    console.error(`Fallback model ${this.fallbackModel} also failed:`, fallbackError);
                    throw new Error(`Both primary and fallback models failed: ${error.message}`);
                }
            }
            
            throw error;
        }
    }

    // Test model connection
    async testModel(modelId) {
        const model = this.models[modelId];
        
        if (!model) {
            return { success: false, error: 'Model not found' };
        }

        if (!model.available) {
            return { success: false, error: 'Model not available' };
        }

        if (!model.service) {
            return { success: false, error: 'Model service not implemented' };
        }

        try {
            if (model.service.testConnection) {
                return await model.service.testConnection();
            } else {
                return { success: false, error: 'Test method not available' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get model statistics
    getModelStats() {
        const available = Object.values(this.models).filter(m => m.available).length;
        const total = Object.keys(this.models).length;
        const providers = [...new Set(Object.values(this.models).map(m => m.provider))];
        
        return {
            available,
            total,
            providers,
            current: this.currentModel,
            fallback: this.fallbackModel
        };
    }

    // Update model availability (for future implementations)
    updateModelAvailability(modelId, available) {
        if (this.models[modelId]) {
            this.models[modelId].available = available;
            
            // If current model becomes unavailable, switch to fallback
            if (!available && this.currentModel === modelId) {
                if (this.models[this.fallbackModel]?.available) {
                    this.currentModel = this.fallbackModel;
                } else {
                    // Find first available model
                    const firstAvailable = Object.entries(this.models)
                        .find(([_, model]) => model.available);
                    if (firstAvailable) {
                        this.currentModel = firstAvailable[0];
                    }
                }
            }
            
            return true;
        }
        return false;
    }

    // Get model comparison data
    getModelComparison() {
        return Object.entries(this.models).map(([id, model]) => ({
            id,
            name: model.name,
            provider: model.provider,
            available: model.available,
            features: model.features,
            description: model.description,
            icon: model.icon,
            isCurrent: id === this.currentModel,
            isFallback: id === this.fallbackModel
        }));
    }

    // Set fallback model
    setFallbackModel(modelId) {
        if (this.models[modelId] && this.models[modelId].available && modelId !== this.currentModel) {
            this.fallbackModel = modelId;
            return true;
        }
        return false;
    }
}

module.exports = AIModelManager;
