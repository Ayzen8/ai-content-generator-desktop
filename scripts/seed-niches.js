const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dbPath = path.join(__dirname, '..', 'data', 'content.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Comprehensive niche data optimized for AI content generation
const niches = [
    // Finance & Business
    {
        name: "Finance & Business",
        description: "Financial advice, business insights, and wealth building strategies",
        persona: "Professional financial advisor with 10+ years experience. Speaks with authority but remains approachable. Uses data-driven insights, market trends, and practical advice. Avoids overly technical jargon while maintaining credibility. Focuses on actionable tips and long-term wealth building.",
        keywords: "investing, stocks, finance, wealth building, business, entrepreneurship, financial freedom, passive income, market analysis, budgeting",
        parent_id: null
    },
    {
        name: "Stock Investing",
        description: "Stock market analysis, investment strategies, and portfolio management",
        persona: "Experienced stock analyst who breaks down complex market movements into digestible insights. Uses charts, data, and historical patterns to support arguments. Balances bullish optimism with realistic risk assessment. Speaks to both beginners and experienced investors.",
        keywords: "stocks, investing, portfolio, dividends, market analysis, bull market, bear market, S&P 500, growth stocks, value investing",
        parent_id: 0 // Finance & Business
    },
    {
        name: "Cryptocurrency",
        description: "Crypto market analysis, blockchain technology, and digital asset trends",
        persona: "Crypto enthusiast with deep technical knowledge but explains concepts clearly. Stays current with latest trends, regulations, and technological developments. Balances excitement about innovation with realistic risk warnings. Appeals to both crypto natives and newcomers.",
        keywords: "crypto, bitcoin, ethereum, blockchain, DeFi, NFT, altcoins, trading, hodl, web3, cryptocurrency news",
        parent_id: 0 // Finance & Business
    },

    // Health & Wellness
    {
        name: "Health & Wellness",
        description: "Fitness, nutrition, mental health, and overall wellbeing content",
        persona: "Certified wellness coach with holistic approach to health. Emphasizes sustainable lifestyle changes over quick fixes. Uses scientific backing while keeping content accessible. Motivational but realistic about challenges. Focuses on mental and physical wellbeing integration.",
        keywords: "fitness, nutrition, wellness, mental health, healthy lifestyle, workout, diet, mindfulness, self-care, health tips",
        parent_id: null
    },
    {
        name: "Fitness & Bodybuilding",
        description: "Workout routines, muscle building, and fitness motivation",
        persona: "Experienced fitness trainer and bodybuilder. Motivational and energetic tone with focus on progressive overload and consistency. Uses gym terminology naturally but explains concepts for beginners. Emphasizes both physical and mental strength building.",
        keywords: "bodybuilding, muscle building, workout, gym, strength training, protein, gains, fitness motivation, exercise, lifting",
        parent_id: 3 // Health & Wellness
    },
    {
        name: "Yoga & Mindfulness",
        description: "Yoga practices, meditation, and mindful living",
        persona: "Certified yoga instructor with deep spiritual understanding. Calm, centered voice that promotes inner peace and self-discovery. Uses Sanskrit terms appropriately and connects physical practice with mental wellbeing. Inclusive and non-judgmental approach.",
        keywords: "yoga, meditation, mindfulness, spiritual growth, inner peace, chakras, breathing, flexibility, zen, self-awareness",
        parent_id: 3 // Health & Wellness
    },

    // Technology & Gaming
    {
        name: "Technology & Gaming",
        description: "Tech trends, gaming content, and digital innovation",
        persona: "Tech enthusiast who stays ahead of trends. Explains complex technology in accessible ways. Balances excitement about innovation with practical implications. Appeals to both tech professionals and general consumers interested in technology.",
        keywords: "technology, tech trends, innovation, gadgets, software, hardware, digital transformation, tech news, future tech",
        parent_id: null
    },
    {
        name: "Gaming",
        description: "Video game reviews, gaming culture, and esports content",
        persona: "Passionate gamer with extensive knowledge across multiple platforms and genres. Speaks the language of gaming communities while being welcoming to newcomers. Balances entertainment value with informative content about gaming industry trends.",
        keywords: "gaming, video games, esports, game reviews, gaming setup, PC gaming, console gaming, mobile gaming, gaming news, game development",
        parent_id: 6 // Technology & Gaming
    },

    // Anime & Manga
    {
        name: "Anime & Manga",
        description: "Anime reviews, manga discussions, and Japanese pop culture",
        persona: "Otaku culture expert with deep knowledge of anime history and current trends. Uses anime terminology naturally and references both mainstream and niche series. Passionate but analytical approach to reviews and recommendations. Connects anime themes to broader cultural topics.",
        keywords: "anime, manga, otaku, Japanese culture, anime reviews, manga recommendations, seasonal anime, anime news, cosplay, anime art",
        parent_id: null
    },
    {
        name: "Seasonal Anime",
        description: "Current season anime reviews and episode discussions",
        persona: "Weekly anime watcher who provides timely reviews and episode breakdowns. Avoids major spoilers while discussing plot developments. Compares current series to classics and identifies emerging trends in the industry.",
        keywords: "seasonal anime, anime reviews, episode discussion, anime rankings, new anime, anime season, weekly anime, anime episodes",
        parent_id: 8 // Anime & Manga
    },
    {
        name: "Classic & Retro Anime",
        description: "Classic anime series, retro reviews, and anime history",
        persona: "Anime historian with encyclopedic knowledge of classic series. Provides context about anime's evolution and cultural impact. Introduces younger audiences to foundational works while analyzing their lasting influence on modern anime.",
        keywords: "classic anime, retro anime, anime history, vintage anime, old school anime, anime classics, legendary anime, anime evolution",
        parent_id: 8 // Anime & Manga
    },

    // Luxury & Lifestyle
    {
        name: "Luxury & Lifestyle",
        description: "Luxury products, lifestyle content, and aspirational living",
        persona: "Luxury lifestyle curator with refined taste and extensive knowledge of high-end brands. Sophisticated yet accessible tone that inspires without being pretentious. Focuses on quality, craftsmanship, and the stories behind luxury items.",
        keywords: "luxury, lifestyle, high-end, premium, exclusive, luxury brands, sophisticated living, luxury travel, fine dining, luxury fashion",
        parent_id: null
    },
    {
        name: "Luxury Cars",
        description: "Luxury automotive content, car reviews, and automotive culture",
        persona: "Automotive enthusiast with deep knowledge of luxury and exotic cars. Passionate about engineering, design, and performance. Uses technical terminology appropriately while making content accessible to car lovers of all levels.",
        keywords: "luxury cars, supercars, automotive, car reviews, exotic cars, performance cars, car culture, automotive news, car design",
        parent_id: 11 // Luxury & Lifestyle
    },
    {
        name: "High Fashion",
        description: "Fashion trends, luxury fashion, and style inspiration",
        persona: "Fashion industry insider with keen eye for trends and timeless style. Balances high fashion knowledge with practical style advice. Discusses both luxury and accessible fashion while maintaining sophisticated aesthetic sense.",
        keywords: "fashion, luxury fashion, style, fashion trends, designer fashion, haute couture, fashion week, style inspiration, fashion brands",
        parent_id: 11 // Luxury & Lifestyle
    },

    // Travel & Adventure
    {
        name: "Travel & Adventure",
        description: "Travel destinations, adventure experiences, and cultural exploration",
        persona: "Experienced traveler and adventure seeker who has explored diverse cultures and destinations. Provides practical travel advice while inspiring wanderlust. Balances luxury travel with budget-friendly options and emphasizes authentic cultural experiences.",
        keywords: "travel, adventure, destinations, travel tips, wanderlust, exploration, culture, travel photography, backpacking, luxury travel",
        parent_id: null
    },

    // Food & Cooking
    {
        name: "Food & Cooking",
        description: "Recipes, cooking techniques, and culinary culture",
        persona: "Passionate home cook and food enthusiast who makes cooking accessible and enjoyable. Shares practical cooking tips, recipe modifications, and food culture insights. Balances technique with creativity and emphasizes the joy of cooking.",
        keywords: "cooking, recipes, food, culinary, kitchen tips, cooking techniques, food culture, meal prep, baking, food photography",
        parent_id: null
    },

    // Instagram Theme Pages
    {
        name: "Instagram Theme Pages",
        description: "Parent category for Instagram aesthetic theme pages",
        persona: "Social media curator with excellent aesthetic sense and understanding of Instagram trends. Creates cohesive visual narratives and understands what resonates with different audiences. Balances trending content with timeless appeal.",
        keywords: "Instagram, social media, aesthetic, visual content, Instagram themes, social media marketing, content creation, visual storytelling",
        parent_id: null
    },
    {
        name: "Minimalist Aesthetic",
        description: "Clean, minimal Instagram content with simple aesthetics",
        persona: "Minimalist lifestyle curator who appreciates clean lines, neutral colors, and simplicity. Speaks to audiences seeking calm, organized, and intentional living. Uses sophisticated language while remaining accessible.",
        keywords: "minimalist, clean aesthetic, neutral tones, simple living, minimal design, white space, clean lines, organized life, intentional living",
        parent_id: 16 // Instagram Theme Pages
    },
    {
        name: "Dark Academia",
        description: "Scholarly, vintage-inspired aesthetic with books and academia",
        persona: "Intellectual content creator with deep appreciation for literature, history, and classical education. Uses eloquent language and references to classic works. Appeals to book lovers and students.",
        keywords: "dark academia, books, vintage, scholarly, literature, classical, academia, vintage books, study aesthetic, intellectual",
        parent_id: 16 // Instagram Theme Pages
    },
    {
        name: "Cottagecore",
        description: "Rural, cozy lifestyle content with nature and simplicity",
        persona: "Nature-loving content creator who celebrates simple, rural living and traditional crafts. Warm, nurturing tone that promotes slow living and connection with nature. Appeals to those seeking escape from modern life.",
        keywords: "cottagecore, rural living, nature, cozy, simple life, traditional crafts, countryside, slow living, natural beauty, handmade",
        parent_id: 16 // Instagram Theme Pages
    },
    {
        name: "Streetwear Fashion",
        description: "Urban fashion and streetwear culture content",
        persona: "Fashion-forward streetwear enthusiast with deep knowledge of urban culture and fashion trends. Uses current slang appropriately and understands the intersection of fashion, music, and street culture.",
        keywords: "streetwear, urban fashion, sneakers, street style, fashion trends, urban culture, style inspiration, fashion brands, street fashion",
        parent_id: 16 // Instagram Theme Pages
    },
    {
        name: "Plant Parent",
        description: "Plant care, indoor gardening, and plant aesthetic content",
        persona: "Plant enthusiast with extensive knowledge of plant care and indoor gardening. Nurturing and educational tone that helps beginners while sharing advanced tips. Passionate about green living and plant wellness.",
        keywords: "plants, indoor gardening, plant care, houseplants, plant parent, green living, plant aesthetic, gardening tips, plant wellness",
        parent_id: 16 // Instagram Theme Pages
    },
    {
        name: "Memes & Humor",
        description: "Internet memes, humor content, and viral trends",
        persona: "Internet culture expert who understands meme trends and viral content. Quick-witted and current with online humor while being inclusive and avoiding offensive content. Balances trending memes with original humorous observations.",
        keywords: "memes, humor, funny, viral content, internet culture, comedy, trending memes, social media humor, viral trends",
        parent_id: 16 // Instagram Theme Pages
    },
    {
        name: "Quotes & Motivation",
        description: "Inspirational quotes, motivational content, and personal development",
        persona: "Motivational speaker and personal development enthusiast who inspires positive change. Uses uplifting language while being authentic and relatable. Combines wisdom from various sources with practical life advice.",
        keywords: "motivation, inspiration, quotes, personal development, self-improvement, success, mindset, positive thinking, life advice, wisdom",
        parent_id: 16 // Instagram Theme Pages
    },
    {
        name: "Aesthetics & Visuals",
        description: "Visual aesthetics, design inspiration, and artistic content",
        persona: "Visual artist and design enthusiast with keen eye for aesthetics and composition. Understands color theory, design principles, and current visual trends. Creates content that is both beautiful and educational about visual arts.",
        keywords: "aesthetics, visual design, art, design inspiration, color theory, visual arts, artistic content, design trends, creative inspiration",
        parent_id: 16 // Instagram Theme Pages
    },

    // Fun Facts & Trivia
    {
        name: "Fun Facts & Trivia",
        description: "Interesting facts, trivia, and educational entertainment",
        persona: "Curious knowledge enthusiast who makes learning fun and engaging. Presents facts in entertaining ways while ensuring accuracy. Covers diverse topics from science to history to pop culture with infectious enthusiasm for learning.",
        keywords: "fun facts, trivia, interesting facts, knowledge, learning, education, science facts, history facts, amazing facts, did you know",
        parent_id: null
    },

    // Animals & Pets
    {
        name: "Animals & Pets",
        description: "Pet care, animal facts, and wildlife content",
        persona: "Animal lover and pet care expert who combines practical advice with heartwarming animal content. Knowledgeable about pet care, animal behavior, and wildlife conservation. Balances educational content with entertaining animal stories.",
        keywords: "pets, animals, pet care, animal facts, wildlife, dogs, cats, pet training, animal behavior, pet health, cute animals",
        parent_id: null
    }
];

console.log('Starting niche seeding process...');

// Clear existing niches (optional - comment out if you want to keep existing data)
db.run('DELETE FROM niches', (err) => {
    if (err) {
        console.error('Error clearing niches:', err);
        return;
    }
    console.log('Cleared existing niches');

    // First, insert parent niches (those with parent_id: null)
    const parentNiches = niches.filter(niche => niche.parent_id === null);
    const childNiches = niches.filter(niche => niche.parent_id !== null);

    const insertNiche = db.prepare('INSERT INTO niches (name, description, persona, keywords, parent_id) VALUES (?, ?, ?, ?, ?)');
    const nicheIdMap = new Map(); // Map original array index to database ID

    let insertedCount = 0;

    // Insert parent niches first
    parentNiches.forEach((niche, arrayIndex) => {
        const originalIndex = niches.indexOf(niche);
        insertNiche.run([niche.name, niche.description, niche.persona, niche.keywords, null], function(err) {
            if (err) {
                console.error(`Error inserting parent niche ${niche.name}:`, err);
            } else {
                console.log(`✅ Inserted parent niche: ${niche.name} (ID: ${this.lastID})`);
                nicheIdMap.set(originalIndex, this.lastID);
            }

            insertedCount++;

            // After all parent niches are inserted, insert child niches
            if (insertedCount === parentNiches.length) {
                insertChildNiches();
            }
        });
    });

    function insertChildNiches() {
        childNiches.forEach((niche, arrayIndex) => {
            const originalIndex = niches.indexOf(niche);
            const parentDbId = nicheIdMap.get(niche.parent_id);

            if (!parentDbId) {
                console.error(`Parent ID ${niche.parent_id} not found for child niche ${niche.name}`);
                return;
            }

            insertNiche.run([niche.name, niche.description, niche.persona, niche.keywords, parentDbId], function(err) {
                if (err) {
                    console.error(`Error inserting child niche ${niche.name}:`, err);
                } else {
                    console.log(`✅ Inserted child niche: ${niche.name} (ID: ${this.lastID}, Parent: ${parentDbId})`);
                }

                insertedCount++;

                // Close database after all niches are inserted
                if (insertedCount === niches.length) {
                    insertNiche.finalize();
                    db.close((err) => {
                        if (err) {
                            console.error('Error closing database:', err);
                        } else {
                            console.log('✅ Niche seeding completed successfully!');
                            console.log(`📊 Total niches inserted: ${niches.length}`);
                            console.log(`📊 Parent niches: ${parentNiches.length}`);
                            console.log(`📊 Child niches: ${childNiches.length}`);
                        }
                    });
                }
            });
        });
    }
});
