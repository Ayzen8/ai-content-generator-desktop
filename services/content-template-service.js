const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class ContentTemplateService {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'content.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.initializeTemplatesTables();
    }

    // Initialize content templates tables
    initializeTemplatesTables() {
        const createTemplatesTables = `
            CREATE TABLE IF NOT EXISTS content_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL,
                niche_id INTEGER,
                template_type TEXT NOT NULL, -- 'prompt', 'structure', 'complete'
                content_structure TEXT NOT NULL, -- JSON string
                variables TEXT, -- JSON array of variable names
                usage_count INTEGER DEFAULT 0,
                is_public BOOLEAN DEFAULT 0,
                is_featured BOOLEAN DEFAULT 0,
                created_by TEXT DEFAULT 'system',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (niche_id) REFERENCES niches (id)
            );

            CREATE TABLE IF NOT EXISTS saved_prompts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                prompt_text TEXT NOT NULL,
                niche_id INTEGER,
                style TEXT,
                emotion TEXT,
                variables TEXT, -- JSON array of variable names
                usage_count INTEGER DEFAULT 0,
                is_favorite BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (niche_id) REFERENCES niches (id)
            );

            CREATE TABLE IF NOT EXISTS template_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                icon TEXT,
                sort_order INTEGER DEFAULT 0
            );
        `;

        this.db.exec(createTemplatesTables, (err) => {
            if (err) {
                console.error('Error creating templates tables:', err);
            } else {
                console.log('✅ Content templates tables initialized');
                this.seedDefaultTemplates();
            }
        });
    }

    // Seed default templates and categories
    async seedDefaultTemplates() {
        try {
            // Check if categories already exist
            const existingCategories = await this.getTemplateCategories();
            if (existingCategories.length === 0) {
                await this.createDefaultCategories();
                await this.createDefaultTemplates();
                console.log('✅ Default content templates seeded');
            }
        } catch (error) {
            console.error('Error seeding default templates:', error);
        }
    }

    // Create default template categories
    async createDefaultCategories() {
        const categories = [
            { name: 'Educational', description: 'Templates for educational and informative content', icon: '📚', sort_order: 1 },
            { name: 'Promotional', description: 'Templates for marketing and promotional content', icon: '📢', sort_order: 2 },
            { name: 'Engagement', description: 'Templates designed to boost engagement', icon: '💬', sort_order: 3 },
            { name: 'Storytelling', description: 'Templates for narrative and story-based content', icon: '📖', sort_order: 4 },
            { name: 'Question & Answer', description: 'Templates for Q&A and interactive content', icon: '❓', sort_order: 5 },
            { name: 'Tips & Tricks', description: 'Templates for sharing tips and advice', icon: '💡', sort_order: 6 }
        ];

        for (const category of categories) {
            await this.createTemplateCategory(category);
        }
    }

    // Create default content templates
    async createDefaultTemplates() {
        const templates = [
            {
                name: 'Educational Thread Starter',
                description: 'Perfect for starting educational X threads',
                category: 'Educational',
                template_type: 'structure',
                content_structure: JSON.stringify({
                    hook: 'Did you know that {fact}?',
                    introduction: 'Let me break down {topic} for you:',
                    points: [
                        '1/ {point_1}',
                        '2/ {point_2}',
                        '3/ {point_3}'
                    ],
                    conclusion: 'What do you think about {topic}? Share your thoughts below! 👇',
                    hashtags: '#{niche_hashtag} #education #learning'
                }),
                variables: JSON.stringify(['fact', 'topic', 'point_1', 'point_2', 'point_3', 'niche_hashtag'])
            },
            {
                name: 'Product Launch Announcement',
                description: 'Template for announcing new products or services',
                category: 'Promotional',
                template_type: 'structure',
                content_structure: JSON.stringify({
                    announcement: '🚀 Exciting news! We\'re launching {product_name}!',
                    description: '{product_description}',
                    benefits: 'Here\'s what makes it special:\n• {benefit_1}\n• {benefit_2}\n• {benefit_3}',
                    cta: 'Ready to try it? {call_to_action}',
                    hashtags: '#{product_hashtag} #launch #innovation'
                }),
                variables: JSON.stringify(['product_name', 'product_description', 'benefit_1', 'benefit_2', 'benefit_3', 'call_to_action', 'product_hashtag'])
            },
            {
                name: 'Engagement Question',
                description: 'Simple template to boost engagement with questions',
                category: 'Engagement',
                template_type: 'structure',
                content_structure: JSON.stringify({
                    question: '{engaging_question}',
                    context: '{context_or_reason}',
                    call_to_action: 'Drop your answer in the comments! I\'ll reply to everyone 👇',
                    hashtags: '#{niche_hashtag} #community #discussion'
                }),
                variables: JSON.stringify(['engaging_question', 'context_or_reason', 'niche_hashtag'])
            },
            {
                name: 'Personal Story',
                description: 'Template for sharing personal experiences and stories',
                category: 'Storytelling',
                template_type: 'structure',
                content_structure: JSON.stringify({
                    hook: '{story_hook}',
                    story: '{personal_story}',
                    lesson: 'The lesson I learned: {key_lesson}',
                    question: 'Have you experienced something similar? {related_question}',
                    hashtags: '#{niche_hashtag} #story #experience'
                }),
                variables: JSON.stringify(['story_hook', 'personal_story', 'key_lesson', 'related_question', 'niche_hashtag'])
            },
            {
                name: 'Quick Tip',
                description: 'Template for sharing quick tips and advice',
                category: 'Tips & Tricks',
                template_type: 'structure',
                content_structure: JSON.stringify({
                    tip_intro: '💡 Quick {niche} tip:',
                    tip_content: '{tip_description}',
                    why_it_works: 'Why this works: {explanation}',
                    action: 'Try this and let me know how it goes! 🚀',
                    hashtags: '#{niche_hashtag} #tips #advice'
                }),
                variables: JSON.stringify(['niche', 'tip_description', 'explanation', 'niche_hashtag'])
            },
            {
                name: 'Behind the Scenes',
                description: 'Template for sharing behind-the-scenes content',
                category: 'Engagement',
                template_type: 'structure',
                content_structure: JSON.stringify({
                    intro: '🎬 Behind the scenes of {activity_or_project}',
                    process: '{process_description}',
                    insight: 'What surprised me most: {surprising_insight}',
                    question: 'What would you like to see behind the scenes of next?',
                    hashtags: '#{niche_hashtag} #behindthescenes #process'
                }),
                variables: JSON.stringify(['activity_or_project', 'process_description', 'surprising_insight', 'niche_hashtag'])
            }
        ];

        for (const template of templates) {
            await this.createContentTemplate(template);
        }
    }

    // Create a new template category
    async createTemplateCategory(category) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO template_categories (name, description, icon, sort_order)
                VALUES (?, ?, ?, ?)
            `;

            this.db.run(query, [
                category.name,
                category.description,
                category.icon,
                category.sort_order
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Create a new content template
    async createContentTemplate(template) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO content_templates 
                (name, description, category, niche_id, template_type, content_structure, variables, is_public, is_featured)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                template.name,
                template.description,
                template.category,
                template.niche_id || null,
                template.template_type,
                template.content_structure,
                template.variables,
                template.is_public || 1,
                template.is_featured || 0
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Get all template categories
    async getTemplateCategories() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM template_categories 
                ORDER BY sort_order, name
            `;

            this.db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Get templates by category
    async getTemplatesByCategory(category = null) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT ct.*, n.name as niche_name
                FROM content_templates ct
                LEFT JOIN niches n ON ct.niche_id = n.id
                WHERE ct.is_public = 1
            `;
            
            const params = [];
            
            if (category) {
                query += ` AND ct.category = ?`;
                params.push(category);
            }
            
            query += ` ORDER BY ct.is_featured DESC, ct.usage_count DESC, ct.name`;

            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Parse JSON fields
                    const templates = rows.map(row => ({
                        ...row,
                        content_structure: JSON.parse(row.content_structure),
                        variables: JSON.parse(row.variables || '[]')
                    }));
                    resolve(templates);
                }
            });
        });
    }

    // Get template by ID
    async getTemplateById(templateId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT ct.*, n.name as niche_name
                FROM content_templates ct
                LEFT JOIN niches n ON ct.niche_id = n.id
                WHERE ct.id = ?
            `;

            this.db.get(query, [templateId], (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    // Parse JSON fields
                    const template = {
                        ...row,
                        content_structure: JSON.parse(row.content_structure),
                        variables: JSON.parse(row.variables || '[]')
                    };
                    resolve(template);
                } else {
                    resolve(null);
                }
            });
        });
    }

    // Apply template with variables
    applyTemplate(template, variables = {}) {
        let appliedStructure = { ...template.content_structure };
        
        // Replace variables in all fields
        const replaceVariables = (obj) => {
            if (typeof obj === 'string') {
                let result = obj;
                template.variables.forEach(variable => {
                    const value = variables[variable] || `{${variable}}`;
                    result = result.replace(new RegExp(`{${variable}}`, 'g'), value);
                });
                return result;
            } else if (Array.isArray(obj)) {
                return obj.map(item => replaceVariables(item));
            } else if (typeof obj === 'object' && obj !== null) {
                const newObj = {};
                for (const [key, value] of Object.entries(obj)) {
                    newObj[key] = replaceVariables(value);
                }
                return newObj;
            }
            return obj;
        };

        appliedStructure = replaceVariables(appliedStructure);
        
        return {
            template_id: template.id,
            template_name: template.name,
            applied_content: appliedStructure,
            variables_used: variables
        };
    }

    // Increment template usage count
    async incrementTemplateUsage(templateId) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE content_templates 
                SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            this.db.run(query, [templateId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Save a custom prompt
    async savePrompt(prompt) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO saved_prompts 
                (name, description, prompt_text, niche_id, style, emotion, variables)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                prompt.name,
                prompt.description,
                prompt.prompt_text,
                prompt.niche_id || null,
                prompt.style || null,
                prompt.emotion || null,
                JSON.stringify(prompt.variables || [])
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Get saved prompts
    async getSavedPrompts(nicheId = null) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT sp.*, n.name as niche_name
                FROM saved_prompts sp
                LEFT JOIN niches n ON sp.niche_id = n.id
            `;
            
            const params = [];
            
            if (nicheId) {
                query += ` WHERE sp.niche_id = ? OR sp.niche_id IS NULL`;
                params.push(nicheId);
            }
            
            query += ` ORDER BY sp.is_favorite DESC, sp.usage_count DESC, sp.created_at DESC`;

            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Parse JSON fields
                    const prompts = rows.map(row => ({
                        ...row,
                        variables: JSON.parse(row.variables || '[]')
                    }));
                    resolve(prompts);
                }
            });
        });
    }
}

module.exports = new ContentTemplateService();
