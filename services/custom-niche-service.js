const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const aiModelManager = require('./ai-model-manager');

class CustomNicheService {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'content.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.initializeCustomNicheTables();
    }

    // Initialize custom niche tables
    initializeCustomNicheTables() {
        const createCustomNicheTables = `
            CREATE TABLE IF NOT EXISTS custom_niches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT NOT NULL,
                target_audience TEXT NOT NULL,
                content_pillars TEXT, -- JSON array of content themes
                tone_of_voice TEXT NOT NULL,
                key_topics TEXT, -- JSON array of topics
                hashtag_strategy TEXT, -- JSON object with hashtag categories
                posting_frequency TEXT DEFAULT 'daily',
                optimal_times TEXT, -- JSON array of optimal posting times
                competitor_analysis TEXT, -- JSON object with competitor insights
                brand_voice_guidelines TEXT,
                content_formats TEXT, -- JSON array of preferred formats
                engagement_strategies TEXT, -- JSON array of engagement tactics
                growth_goals TEXT, -- JSON object with growth targets
                created_by TEXT DEFAULT 'user',
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS custom_personas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                niche_id INTEGER NOT NULL,
                persona_name TEXT NOT NULL,
                persona_description TEXT NOT NULL,
                personality_traits TEXT, -- JSON array of traits
                communication_style TEXT NOT NULL,
                expertise_areas TEXT, -- JSON array of expertise
                content_preferences TEXT, -- JSON object with content preferences
                audience_interaction_style TEXT,
                brand_values TEXT, -- JSON array of values
                unique_selling_points TEXT, -- JSON array of USPs
                content_examples TEXT, -- JSON array of example content
                is_primary BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (niche_id) REFERENCES custom_niches (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS niche_content_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                niche_id INTEGER NOT NULL,
                template_name TEXT NOT NULL,
                template_category TEXT NOT NULL,
                template_content TEXT NOT NULL,
                variables TEXT, -- JSON array of template variables
                usage_instructions TEXT,
                expected_engagement TEXT,
                best_posting_times TEXT, -- JSON array
                hashtag_suggestions TEXT, -- JSON array
                is_active BOOLEAN DEFAULT 1,
                usage_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (niche_id) REFERENCES custom_niches (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS niche_performance_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                niche_id INTEGER NOT NULL,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                platform TEXT NOT NULL,
                recorded_date DATE NOT NULL,
                notes TEXT,
                FOREIGN KEY (niche_id) REFERENCES custom_niches (id) ON DELETE CASCADE
            );
        `;

        this.db.exec(createCustomNicheTables, (err) => {
            if (err) {
                console.error('Error creating custom niche tables:', err);
            } else {
                console.log('✅ Custom niche tables initialized');
            }
        });
    }

    // Create a new custom niche with AI assistance
    async createCustomNiche(nicheData) {
        try {
            // Validate required fields
            if (!nicheData.name || !nicheData.description || !nicheData.target_audience) {
                throw new Error('Name, description, and target audience are required');
            }

            // Generate AI-enhanced niche details
            const enhancedNiche = await this.enhanceNicheWithAI(nicheData);

            // Save to database
            const nicheId = await this.saveCustomNiche(enhancedNiche);

            // Generate default persona
            const defaultPersona = await this.generateDefaultPersona(nicheId, enhancedNiche);
            await this.saveCustomPersona(defaultPersona);

            // Generate default templates
            const defaultTemplates = await this.generateDefaultTemplates(nicheId, enhancedNiche);
            for (const template of defaultTemplates) {
                await this.saveNicheTemplate(template);
            }

            console.log(`✅ Custom niche "${nicheData.name}" created successfully`);
            return { success: true, nicheId, message: 'Custom niche created successfully' };

        } catch (error) {
            console.error('Error creating custom niche:', error);
            throw error;
        }
    }

    // Enhance niche data with AI insights
    async enhanceNicheWithAI(nicheData) {
        try {
            const prompt = `
                Analyze this niche and provide comprehensive insights:
                
                Niche: ${nicheData.name}
                Description: ${nicheData.description}
                Target Audience: ${nicheData.target_audience}
                
                Please provide:
                1. 5-7 content pillars (main themes)
                2. Recommended tone of voice
                3. 10-15 key topics to cover
                4. Hashtag strategy with categories
                5. Optimal posting frequency
                6. Best posting times
                7. Competitor analysis insights
                8. Brand voice guidelines
                9. Preferred content formats
                10. Engagement strategies
                11. Growth goals and targets
                
                Format as JSON with these exact keys:
                {
                    "content_pillars": [],
                    "tone_of_voice": "",
                    "key_topics": [],
                    "hashtag_strategy": {
                        "broad": [],
                        "niche": [],
                        "micro": [],
                        "trending": []
                    },
                    "posting_frequency": "",
                    "optimal_times": [],
                    "competitor_analysis": {
                        "top_competitors": [],
                        "content_gaps": [],
                        "opportunities": []
                    },
                    "brand_voice_guidelines": "",
                    "content_formats": [],
                    "engagement_strategies": [],
                    "growth_goals": {
                        "monthly_follower_target": 0,
                        "engagement_rate_target": 0,
                        "content_frequency": ""
                    }
                }
            `;

            const response = await aiModelManager.generateContent(prompt, 'gemini');
            
            // Parse AI response
            let aiInsights;
            try {
                // Extract JSON from response
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    aiInsights = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON found in AI response');
                }
            } catch (parseError) {
                console.warn('Failed to parse AI insights, using defaults');
                aiInsights = this.getDefaultNicheInsights();
            }

            // Merge original data with AI insights
            return {
                ...nicheData,
                content_pillars: JSON.stringify(aiInsights.content_pillars || []),
                tone_of_voice: aiInsights.tone_of_voice || 'Professional and engaging',
                key_topics: JSON.stringify(aiInsights.key_topics || []),
                hashtag_strategy: JSON.stringify(aiInsights.hashtag_strategy || {}),
                posting_frequency: aiInsights.posting_frequency || 'daily',
                optimal_times: JSON.stringify(aiInsights.optimal_times || []),
                competitor_analysis: JSON.stringify(aiInsights.competitor_analysis || {}),
                brand_voice_guidelines: aiInsights.brand_voice_guidelines || '',
                content_formats: JSON.stringify(aiInsights.content_formats || []),
                engagement_strategies: JSON.stringify(aiInsights.engagement_strategies || []),
                growth_goals: JSON.stringify(aiInsights.growth_goals || {})
            };

        } catch (error) {
            console.error('Error enhancing niche with AI:', error);
            // Return original data with defaults if AI fails
            return {
                ...nicheData,
                content_pillars: JSON.stringify(['Educational', 'Inspirational', 'Behind-the-scenes']),
                tone_of_voice: 'Professional and engaging',
                key_topics: JSON.stringify(['Industry trends', 'Tips and advice', 'Success stories']),
                hashtag_strategy: JSON.stringify({ broad: [], niche: [], micro: [], trending: [] }),
                posting_frequency: 'daily',
                optimal_times: JSON.stringify(['09:00', '12:00', '17:00']),
                competitor_analysis: JSON.stringify({}),
                brand_voice_guidelines: 'Maintain a professional yet approachable tone',
                content_formats: JSON.stringify(['Text posts', 'Images', 'Carousels']),
                engagement_strategies: JSON.stringify(['Ask questions', 'Share stories', 'Provide value']),
                growth_goals: JSON.stringify({ monthly_follower_target: 1000, engagement_rate_target: 0.03 })
            };
        }
    }

    // Get default niche insights
    getDefaultNicheInsights() {
        return {
            content_pillars: ['Educational', 'Inspirational', 'Behind-the-scenes', 'Industry news', 'Personal insights'],
            tone_of_voice: 'Professional and engaging',
            key_topics: ['Industry trends', 'Tips and advice', 'Success stories', 'Challenges', 'Solutions'],
            hashtag_strategy: {
                broad: ['#business', '#entrepreneur', '#success'],
                niche: ['#industryspecific', '#niche'],
                micro: ['#specific', '#targeted'],
                trending: ['#trending', '#viral']
            },
            posting_frequency: 'daily',
            optimal_times: ['09:00', '12:00', '17:00'],
            competitor_analysis: {
                top_competitors: [],
                content_gaps: [],
                opportunities: []
            },
            brand_voice_guidelines: 'Maintain a professional yet approachable tone',
            content_formats: ['Text posts', 'Images', 'Carousels', 'Videos'],
            engagement_strategies: ['Ask questions', 'Share stories', 'Provide value', 'Engage with comments'],
            growth_goals: {
                monthly_follower_target: 1000,
                engagement_rate_target: 0.03,
                content_frequency: 'daily'
            }
        };
    }

    // Save custom niche to database
    async saveCustomNiche(nicheData) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO custom_niches 
                (name, description, target_audience, content_pillars, tone_of_voice, key_topics,
                 hashtag_strategy, posting_frequency, optimal_times, competitor_analysis,
                 brand_voice_guidelines, content_formats, engagement_strategies, growth_goals)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                nicheData.name,
                nicheData.description,
                nicheData.target_audience,
                nicheData.content_pillars,
                nicheData.tone_of_voice,
                nicheData.key_topics,
                nicheData.hashtag_strategy,
                nicheData.posting_frequency,
                nicheData.optimal_times,
                nicheData.competitor_analysis,
                nicheData.brand_voice_guidelines,
                nicheData.content_formats,
                nicheData.engagement_strategies,
                nicheData.growth_goals
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Generate default persona for niche
    async generateDefaultPersona(nicheId, nicheData) {
        try {
            const prompt = `
                Create a detailed persona for this niche:
                
                Niche: ${nicheData.name}
                Description: ${nicheData.description}
                Target Audience: ${nicheData.target_audience}
                Tone: ${nicheData.tone_of_voice}
                
                Create a persona that embodies this niche. Provide:
                1. Persona name
                2. Detailed description
                3. Personality traits
                4. Communication style
                5. Areas of expertise
                6. Content preferences
                7. Audience interaction style
                8. Brand values
                9. Unique selling points
                10. Example content pieces
                
                Format as JSON:
                {
                    "persona_name": "",
                    "persona_description": "",
                    "personality_traits": [],
                    "communication_style": "",
                    "expertise_areas": [],
                    "content_preferences": {},
                    "audience_interaction_style": "",
                    "brand_values": [],
                    "unique_selling_points": [],
                    "content_examples": []
                }
            `;

            const response = await aiModelManager.generateContent(prompt, 'gemini');
            
            let personaData;
            try {
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    personaData = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON found in AI response');
                }
            } catch (parseError) {
                console.warn('Failed to parse persona data, using defaults');
                personaData = this.getDefaultPersonaData(nicheData.name);
            }

            return {
                niche_id: nicheId,
                persona_name: personaData.persona_name || `${nicheData.name} Expert`,
                persona_description: personaData.persona_description || `Expert in ${nicheData.name}`,
                personality_traits: JSON.stringify(personaData.personality_traits || []),
                communication_style: personaData.communication_style || nicheData.tone_of_voice,
                expertise_areas: JSON.stringify(personaData.expertise_areas || []),
                content_preferences: JSON.stringify(personaData.content_preferences || {}),
                audience_interaction_style: personaData.audience_interaction_style || 'Engaging and helpful',
                brand_values: JSON.stringify(personaData.brand_values || []),
                unique_selling_points: JSON.stringify(personaData.unique_selling_points || []),
                content_examples: JSON.stringify(personaData.content_examples || []),
                is_primary: true
            };

        } catch (error) {
            console.error('Error generating default persona:', error);
            return this.getDefaultPersonaData(nicheData.name, nicheId);
        }
    }

    // Get default persona data
    getDefaultPersonaData(nicheName, nicheId) {
        return {
            niche_id: nicheId,
            persona_name: `${nicheName} Expert`,
            persona_description: `Knowledgeable and passionate expert in ${nicheName}`,
            personality_traits: JSON.stringify(['Knowledgeable', 'Passionate', 'Helpful', 'Authentic']),
            communication_style: 'Professional yet approachable',
            expertise_areas: JSON.stringify([nicheName, 'Industry trends', 'Best practices']),
            content_preferences: JSON.stringify({ format: 'Educational', tone: 'Informative' }),
            audience_interaction_style: 'Engaging and helpful',
            brand_values: JSON.stringify(['Authenticity', 'Value', 'Growth', 'Community']),
            unique_selling_points: JSON.stringify(['Expert knowledge', 'Practical advice', 'Real experience']),
            content_examples: JSON.stringify([]),
            is_primary: true
        };
    }

    // Save custom persona
    async saveCustomPersona(personaData) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO custom_personas 
                (niche_id, persona_name, persona_description, personality_traits, communication_style,
                 expertise_areas, content_preferences, audience_interaction_style, brand_values,
                 unique_selling_points, content_examples, is_primary)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                personaData.niche_id,
                personaData.persona_name,
                personaData.persona_description,
                personaData.personality_traits,
                personaData.communication_style,
                personaData.expertise_areas,
                personaData.content_preferences,
                personaData.audience_interaction_style,
                personaData.brand_values,
                personaData.unique_selling_points,
                personaData.content_examples,
                personaData.is_primary
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Generate default templates for niche
    async generateDefaultTemplates(nicheId, nicheData) {
        const templateCategories = [
            'Educational',
            'Promotional',
            'Engagement',
            'Storytelling',
            'Tips & Advice'
        ];

        const templates = [];

        for (const category of templateCategories) {
            try {
                const prompt = `
                    Create a ${category} content template for this niche:
                    
                    Niche: ${nicheData.name}
                    Target Audience: ${nicheData.target_audience}
                    Tone: ${nicheData.tone_of_voice}
                    
                    Create a template with:
                    1. Template name
                    2. Template content with variables in {variable} format
                    3. List of variables
                    4. Usage instructions
                    5. Expected engagement type
                    6. Best posting times
                    7. Hashtag suggestions
                    
                    Format as JSON:
                    {
                        "template_name": "",
                        "template_content": "",
                        "variables": [],
                        "usage_instructions": "",
                        "expected_engagement": "",
                        "best_posting_times": [],
                        "hashtag_suggestions": []
                    }
                `;

                const response = await aiModelManager.generateContent(prompt, 'gemini');
                
                let templateData;
                try {
                    const jsonMatch = response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        templateData = JSON.parse(jsonMatch[0]);
                    } else {
                        throw new Error('No JSON found in AI response');
                    }
                } catch (parseError) {
                    templateData = this.getDefaultTemplateData(category);
                }

                templates.push({
                    niche_id: nicheId,
                    template_name: templateData.template_name || `${category} Template`,
                    template_category: category,
                    template_content: templateData.template_content || `Default ${category} content`,
                    variables: JSON.stringify(templateData.variables || []),
                    usage_instructions: templateData.usage_instructions || `Use for ${category} content`,
                    expected_engagement: templateData.expected_engagement || 'Medium',
                    best_posting_times: JSON.stringify(templateData.best_posting_times || []),
                    hashtag_suggestions: JSON.stringify(templateData.hashtag_suggestions || [])
                });

            } catch (error) {
                console.error(`Error generating ${category} template:`, error);
                templates.push(this.getDefaultTemplateData(category, nicheId));
            }
        }

        return templates;
    }

    // Get default template data
    getDefaultTemplateData(category, nicheId) {
        const templates = {
            'Educational': {
                template_name: 'Educational Tip',
                template_content: 'Did you know that {fact}? Here\'s why this matters: {explanation} Try this: {actionable_tip}',
                variables: ['fact', 'explanation', 'actionable_tip'],
                usage_instructions: 'Share valuable insights and actionable tips',
                expected_engagement: 'High - educational content performs well',
                best_posting_times: ['09:00', '12:00', '15:00'],
                hashtag_suggestions: ['#tips', '#education', '#learning']
            },
            'Promotional': {
                template_name: 'Soft Promotion',
                template_content: 'Struggling with {problem}? I\'ve been there. Here\'s what helped me: {solution} {call_to_action}',
                variables: ['problem', 'solution', 'call_to_action'],
                usage_instructions: 'Promote products/services by solving problems',
                expected_engagement: 'Medium - balance value with promotion',
                best_posting_times: ['10:00', '14:00', '18:00'],
                hashtag_suggestions: ['#solution', '#help', '#business']
            },
            'Engagement': {
                template_name: 'Question Post',
                template_content: '{engaging_question} Share your thoughts in the comments! {context_or_example}',
                variables: ['engaging_question', 'context_or_example'],
                usage_instructions: 'Ask questions to boost engagement',
                expected_engagement: 'Very High - questions drive comments',
                best_posting_times: ['11:00', '16:00', '19:00'],
                hashtag_suggestions: ['#question', '#community', '#discussion']
            },
            'Storytelling': {
                template_name: 'Personal Story',
                template_content: '{story_hook} {story_details} The lesson? {key_takeaway}',
                variables: ['story_hook', 'story_details', 'key_takeaway'],
                usage_instructions: 'Share personal experiences with lessons',
                expected_engagement: 'High - stories create emotional connection',
                best_posting_times: ['08:00', '13:00', '20:00'],
                hashtag_suggestions: ['#story', '#lesson', '#experience']
            },
            'Tips & Advice': {
                template_name: 'Quick Tip',
                template_content: 'Quick tip: {tip_title} {tip_explanation} Pro tip: {bonus_advice}',
                variables: ['tip_title', 'tip_explanation', 'bonus_advice'],
                usage_instructions: 'Share quick, actionable advice',
                expected_engagement: 'High - practical tips are valuable',
                best_posting_times: ['07:00', '12:00', '17:00'],
                hashtag_suggestions: ['#tip', '#advice', '#protip']
            }
        };

        const template = templates[category] || templates['Educational'];
        return {
            niche_id: nicheId,
            template_name: template.template_name,
            template_category: category,
            template_content: template.template_content,
            variables: JSON.stringify(template.variables),
            usage_instructions: template.usage_instructions,
            expected_engagement: template.expected_engagement,
            best_posting_times: JSON.stringify(template.best_posting_times),
            hashtag_suggestions: JSON.stringify(template.hashtag_suggestions)
        };
    }

    // Save niche template
    async saveNicheTemplate(templateData) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO niche_content_templates 
                (niche_id, template_name, template_category, template_content, variables,
                 usage_instructions, expected_engagement, best_posting_times, hashtag_suggestions)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                templateData.niche_id,
                templateData.template_name,
                templateData.template_category,
                templateData.template_content,
                templateData.variables,
                templateData.usage_instructions,
                templateData.expected_engagement,
                templateData.best_posting_times,
                templateData.hashtag_suggestions
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Get all custom niches
    async getCustomNiches() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT cn.*, 
                       COUNT(cp.id) as persona_count,
                       COUNT(nct.id) as template_count
                FROM custom_niches cn
                LEFT JOIN custom_personas cp ON cn.id = cp.niche_id
                LEFT JOIN niche_content_templates nct ON cn.id = nct.niche_id
                WHERE cn.is_active = 1
                GROUP BY cn.id
                ORDER BY cn.created_at DESC
            `;

            this.db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        ...row,
                        content_pillars: JSON.parse(row.content_pillars || '[]'),
                        key_topics: JSON.parse(row.key_topics || '[]'),
                        hashtag_strategy: JSON.parse(row.hashtag_strategy || '{}'),
                        optimal_times: JSON.parse(row.optimal_times || '[]'),
                        competitor_analysis: JSON.parse(row.competitor_analysis || '{}'),
                        content_formats: JSON.parse(row.content_formats || '[]'),
                        engagement_strategies: JSON.parse(row.engagement_strategies || '[]'),
                        growth_goals: JSON.parse(row.growth_goals || '{}')
                    })));
                }
            });
        });
    }

    // Get custom niche by ID
    async getCustomNicheById(nicheId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM custom_niches WHERE id = ? AND is_active = 1`;

            this.db.get(query, [nicheId], (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    resolve(null);
                } else {
                    resolve({
                        ...row,
                        content_pillars: JSON.parse(row.content_pillars || '[]'),
                        key_topics: JSON.parse(row.key_topics || '[]'),
                        hashtag_strategy: JSON.parse(row.hashtag_strategy || '{}'),
                        optimal_times: JSON.parse(row.optimal_times || '[]'),
                        competitor_analysis: JSON.parse(row.competitor_analysis || '{}'),
                        content_formats: JSON.parse(row.content_formats || '[]'),
                        engagement_strategies: JSON.parse(row.engagement_strategies || '[]'),
                        growth_goals: JSON.parse(row.growth_goals || '{}')
                    });
                }
            });
        });
    }

    // Get personas for a niche
    async getNichePersonas(nicheId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM custom_personas WHERE niche_id = ? ORDER BY is_primary DESC, created_at ASC`;

            this.db.all(query, [nicheId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        ...row,
                        personality_traits: JSON.parse(row.personality_traits || '[]'),
                        expertise_areas: JSON.parse(row.expertise_areas || '[]'),
                        content_preferences: JSON.parse(row.content_preferences || '{}'),
                        brand_values: JSON.parse(row.brand_values || '[]'),
                        unique_selling_points: JSON.parse(row.unique_selling_points || '[]'),
                        content_examples: JSON.parse(row.content_examples || '[]')
                    })));
                }
            });
        });
    }

    // Get templates for a niche
    async getNicheTemplates(nicheId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM niche_content_templates 
                WHERE niche_id = ? AND is_active = 1 
                ORDER BY template_category, created_at ASC
            `;

            this.db.all(query, [nicheId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        ...row,
                        variables: JSON.parse(row.variables || '[]'),
                        best_posting_times: JSON.parse(row.best_posting_times || '[]'),
                        hashtag_suggestions: JSON.parse(row.hashtag_suggestions || '[]')
                    })));
                }
            });
        });
    }

    // Update custom niche
    async updateCustomNiche(nicheId, updateData) {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];

            Object.entries(updateData).forEach(([key, value]) => {
                if (key !== 'id') {
                    fields.push(`${key} = ?`);
                    if (typeof value === 'object') {
                        values.push(JSON.stringify(value));
                    } else {
                        values.push(value);
                    }
                }
            });

            if (fields.length === 0) {
                resolve({ changes: 0 });
                return;
            }

            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(nicheId);

            const query = `UPDATE custom_niches SET ${fields.join(', ')} WHERE id = ?`;

            this.db.run(query, values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Delete custom niche (soft delete)
    async deleteCustomNiche(nicheId) {
        return new Promise((resolve, reject) => {
            const query = `UPDATE custom_niches SET is_active = 0 WHERE id = ?`;

            this.db.run(query, [nicheId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }
}

module.exports = new CustomNicheService();
