class ContentQualityService {
    constructor() {
        this.qualityMetrics = {
            engagement: {
                weight: 0.3,
                factors: ['hooks', 'callToAction', 'questions', 'emojis', 'hashtags']
            },
            readability: {
                weight: 0.25,
                factors: ['length', 'complexity', 'structure', 'clarity']
            },
            relevance: {
                weight: 0.2,
                factors: ['keywords', 'trending', 'niche_alignment', 'audience_match']
            },
            creativity: {
                weight: 0.15,
                factors: ['originality', 'storytelling', 'visual_appeal', 'uniqueness']
            },
            technical: {
                weight: 0.1,
                factors: ['grammar', 'spelling', 'formatting', 'character_limits']
            }
        };
    }

    // Main quality scoring function
    analyzeContent(content, niche = null) {
        const scores = {
            engagement: this.analyzeEngagement(content),
            readability: this.analyzeReadability(content),
            relevance: this.analyzeRelevance(content, niche),
            creativity: this.analyzeCreativity(content),
            technical: this.analyzeTechnical(content)
        };

        const overallScore = this.calculateOverallScore(scores);
        const suggestions = this.generateSuggestions(scores, content);
        const strengths = this.identifyStrengths(scores);
        const improvements = this.identifyImprovements(scores);

        return {
            overallScore,
            scores,
            suggestions,
            strengths,
            improvements,
            grade: this.getGrade(overallScore),
            viralPotential: this.assessViralPotential(scores, content)
        };
    }

    // Analyze engagement potential
    analyzeEngagement(content) {
        let score = 0;
        const factors = {};

        // Hook analysis (first 10 words)
        const firstWords = content.tweet.split(' ').slice(0, 10).join(' ');
        const hookPatterns = [
            /^(did you know|imagine|what if|here's why|the secret|stop)/i,
            /^(breaking|urgent|alert|new|just)/i,
            /^(\d+\s+(ways|tips|secrets|mistakes|reasons))/i,
            /[?!]/
        ];
        
        factors.hooks = hookPatterns.some(pattern => pattern.test(firstWords)) ? 85 : 45;

        // Call-to-action analysis
        const ctaPatterns = [
            /\b(comment|share|like|follow|subscribe|click|visit|check out|dm|tag)\b/i,
            /\b(what do you think|thoughts|agree|disagree)\b/i,
            /[?]$/
        ];
        factors.callToAction = ctaPatterns.some(pattern => pattern.test(content.tweet)) ? 80 : 30;

        // Question analysis
        const questionCount = (content.tweet.match(/\?/g) || []).length;
        factors.questions = Math.min(questionCount * 25, 90);

        // Emoji analysis
        const emojiCount = (content.instagram.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
        factors.emojis = Math.min(emojiCount * 15, 85);

        // Hashtag analysis
        const hashtagCount = (content.hashtags.match(/#\w+/g) || []).length;
        factors.hashtags = hashtagCount >= 8 && hashtagCount <= 15 ? 90 : 
                          hashtagCount >= 5 ? 70 : 40;

        score = Object.values(factors).reduce((sum, val) => sum + val, 0) / Object.keys(factors).length;
        return { score: Math.round(score), factors };
    }

    // Analyze readability
    analyzeReadability(content) {
        let score = 0;
        const factors = {};

        // Length analysis
        const tweetLength = content.tweet.length;
        const instagramLength = content.instagram.length;
        
        factors.length = tweetLength >= 100 && tweetLength <= 250 ? 90 :
                        tweetLength >= 50 ? 70 : 40;

        // Complexity analysis (sentence length, word complexity)
        const avgWordsPerSentence = this.getAverageWordsPerSentence(content.instagram);
        factors.complexity = avgWordsPerSentence <= 15 ? 90 :
                           avgWordsPerSentence <= 20 ? 70 : 50;

        // Structure analysis (line breaks, paragraphs)
        const lineBreaks = (content.instagram.match(/\n/g) || []).length;
        factors.structure = lineBreaks >= 2 && lineBreaks <= 6 ? 85 : 60;

        // Clarity analysis (simple words vs complex)
        const complexWords = content.instagram.split(' ').filter(word => word.length > 8).length;
        const totalWords = content.instagram.split(' ').length;
        const complexityRatio = complexWords / totalWords;
        factors.clarity = complexityRatio < 0.1 ? 90 :
                         complexityRatio < 0.2 ? 70 : 50;

        score = Object.values(factors).reduce((sum, val) => sum + val, 0) / Object.keys(factors).length;
        return { score: Math.round(score), factors };
    }

    // Analyze relevance to niche and trends
    analyzeRelevance(content, niche) {
        let score = 0;
        const factors = {};

        // Keyword relevance
        if (niche && niche.keywords) {
            const keywords = niche.keywords.toLowerCase().split(',').map(k => k.trim());
            const contentText = (content.tweet + ' ' + content.instagram).toLowerCase();
            const keywordMatches = keywords.filter(keyword => contentText.includes(keyword)).length;
            factors.keywords = (keywordMatches / keywords.length) * 100;
        } else {
            factors.keywords = 50; // Neutral if no niche data
        }

        // Trending topics (simplified analysis)
        const trendingPatterns = [
            /\b(ai|artificial intelligence|chatgpt|automation)\b/i,
            /\b(sustainability|climate|eco|green)\b/i,
            /\b(remote work|wfh|digital nomad)\b/i,
            /\b(mental health|wellness|mindfulness)\b/i,
            /\b(crypto|blockchain|nft|web3)\b/i
        ];
        const trendMatches = trendingPatterns.filter(pattern => 
            pattern.test(content.tweet + ' ' + content.instagram)
        ).length;
        factors.trending = Math.min(trendMatches * 30, 85);

        // Niche alignment
        if (niche) {
            const nicheWords = niche.name.toLowerCase().split(' ');
            const contentText = (content.tweet + ' ' + content.instagram).toLowerCase();
            const nicheMatches = nicheWords.filter(word => contentText.includes(word)).length;
            factors.niche_alignment = (nicheMatches / nicheWords.length) * 100;
        } else {
            factors.niche_alignment = 50;
        }

        // Audience match (based on tone and content type)
        const professionalTone = /\b(strategy|business|professional|industry|market)\b/i.test(content.instagram);
        const casualTone = /\b(guys|hey|awesome|amazing|love)\b/i.test(content.instagram);
        factors.audience_match = professionalTone || casualTone ? 80 : 60;

        score = Object.values(factors).reduce((sum, val) => sum + val, 0) / Object.keys(factors).length;
        return { score: Math.round(score), factors };
    }

    // Analyze creativity and originality
    analyzeCreativity(content) {
        let score = 0;
        const factors = {};

        // Originality (avoid clichés)
        const cliches = [
            /\b(game changer|think outside the box|at the end of the day|it is what it is)\b/i,
            /\b(crushing it|killing it|beast mode|grind|hustle)\b/i
        ];
        const clicheCount = cliches.filter(cliche => cliche.test(content.instagram)).length;
        factors.originality = Math.max(90 - (clicheCount * 20), 30);

        // Storytelling elements
        const storyElements = [
            /\b(once|story|journey|experience|learned|discovered)\b/i,
            /\b(before|after|then|suddenly|finally|realized)\b/i
        ];
        const storyMatches = storyElements.filter(element => element.test(content.instagram)).length;
        factors.storytelling = Math.min(storyMatches * 25, 90);

        // Visual appeal (image prompt quality)
        const visualKeywords = ['vibrant', 'stunning', 'beautiful', 'eye-catching', 'professional', 'modern'];
        const visualMatches = visualKeywords.filter(keyword => 
            content.imagePrompt.toLowerCase().includes(keyword)
        ).length;
        factors.visual_appeal = Math.min(visualMatches * 15, 85);

        // Uniqueness (varied sentence structure)
        const sentences = content.instagram.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
        const lengthVariation = this.calculateVariation(sentences.map(s => s.length));
        factors.uniqueness = lengthVariation > 10 ? 85 : 60;

        score = Object.values(factors).reduce((sum, val) => sum + val, 0) / Object.keys(factors).length;
        return { score: Math.round(score), factors };
    }

    // Analyze technical quality
    analyzeTechnical(content) {
        let score = 0;
        const factors = {};

        // Grammar check (simplified)
        const grammarIssues = this.detectGrammarIssues(content.tweet + ' ' + content.instagram);
        factors.grammar = Math.max(100 - (grammarIssues * 10), 50);

        // Spelling check (simplified)
        const spellingIssues = this.detectSpellingIssues(content.tweet + ' ' + content.instagram);
        factors.spelling = Math.max(100 - (spellingIssues * 15), 60);

        // Formatting
        const hasProperCapitalization = /^[A-Z]/.test(content.tweet) && /^[A-Z]/.test(content.instagram);
        const hasProperPunctuation = /[.!?]$/.test(content.tweet.trim());
        factors.formatting = (hasProperCapitalization ? 50 : 0) + (hasProperPunctuation ? 50 : 0);

        // Character limits
        const tweetWithinLimit = content.tweet.length <= 280;
        const instagramWithinLimit = content.instagram.length <= 2200;
        factors.character_limits = (tweetWithinLimit ? 50 : 0) + (instagramWithinLimit ? 50 : 0);

        score = Object.values(factors).reduce((sum, val) => sum + val, 0) / Object.keys(factors).length;
        return { score: Math.round(score), factors };
    }

    // Calculate overall weighted score
    calculateOverallScore(scores) {
        let weightedSum = 0;
        let totalWeight = 0;

        for (const [category, data] of Object.entries(this.qualityMetrics)) {
            if (scores[category]) {
                weightedSum += scores[category].score * data.weight;
                totalWeight += data.weight;
            }
        }

        return Math.round(weightedSum / totalWeight);
    }

    // Generate improvement suggestions
    generateSuggestions(scores, content) {
        const suggestions = [];

        // Engagement suggestions
        if (scores.engagement.score < 70) {
            if (scores.engagement.factors.hooks < 60) {
                suggestions.push({
                    category: 'Engagement',
                    type: 'hook',
                    message: 'Start with a stronger hook. Try "Did you know...", "Here\'s why...", or ask a question.',
                    priority: 'high'
                });
            }
            if (scores.engagement.factors.callToAction < 50) {
                suggestions.push({
                    category: 'Engagement',
                    type: 'cta',
                    message: 'Add a clear call-to-action. Ask for comments, shares, or opinions.',
                    priority: 'medium'
                });
            }
        }

        // Readability suggestions
        if (scores.readability.score < 70) {
            if (scores.readability.factors.structure < 70) {
                suggestions.push({
                    category: 'Readability',
                    type: 'structure',
                    message: 'Break up your text with line breaks for better readability.',
                    priority: 'medium'
                });
            }
        }

        // Technical suggestions
        if (scores.technical.score < 80) {
            suggestions.push({
                category: 'Technical',
                type: 'quality',
                message: 'Review for grammar, spelling, and formatting improvements.',
                priority: 'high'
            });
        }

        return suggestions;
    }

    // Identify content strengths
    identifyStrengths(scores) {
        const strengths = [];

        Object.entries(scores).forEach(([category, data]) => {
            if (data.score >= 80) {
                strengths.push({
                    category: category.charAt(0).toUpperCase() + category.slice(1),
                    score: data.score,
                    message: this.getStrengthMessage(category, data.score)
                });
            }
        });

        return strengths;
    }

    // Identify areas for improvement
    identifyImprovements(scores) {
        const improvements = [];

        Object.entries(scores).forEach(([category, data]) => {
            if (data.score < 70) {
                improvements.push({
                    category: category.charAt(0).toUpperCase() + category.slice(1),
                    score: data.score,
                    message: this.getImprovementMessage(category, data.score),
                    priority: data.score < 50 ? 'high' : 'medium'
                });
            }
        });

        return improvements.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    // Get letter grade
    getGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 85) return 'A';
        if (score >= 80) return 'A-';
        if (score >= 75) return 'B+';
        if (score >= 70) return 'B';
        if (score >= 65) return 'B-';
        if (score >= 60) return 'C+';
        if (score >= 55) return 'C';
        if (score >= 50) return 'C-';
        return 'D';
    }

    // Assess viral potential
    assessViralPotential(scores, content) {
        const engagementWeight = 0.4;
        const creativityWeight = 0.3;
        const relevanceWeight = 0.3;

        const viralScore = (
            scores.engagement.score * engagementWeight +
            scores.creativity.score * creativityWeight +
            scores.relevance.score * relevanceWeight
        );

        let potential = 'Low';
        if (viralScore >= 85) potential = 'Very High';
        else if (viralScore >= 75) potential = 'High';
        else if (viralScore >= 65) potential = 'Medium';

        return {
            score: Math.round(viralScore),
            potential,
            factors: this.getViralFactors(scores, content)
        };
    }

    // Helper methods
    getAverageWordsPerSentence(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const totalWords = text.split(' ').length;
        return sentences.length > 0 ? totalWords / sentences.length : 0;
    }

    calculateVariation(numbers) {
        const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
        const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
        return Math.sqrt(variance);
    }

    detectGrammarIssues(text) {
        // Simplified grammar detection
        const issues = [
            /\b(your|you're)\s+(going|gonna)\b/gi,
            /\b(there|their|they're)\s+(is|are)\b/gi,
            /\b(its|it's)\s+(a|an|the)\b/gi
        ];
        return issues.filter(pattern => pattern.test(text)).length;
    }

    detectSpellingIssues(text) {
        // Simplified spelling detection
        const commonMisspellings = [
            /\b(recieve|seperate|definately|occured|neccessary)\b/gi
        ];
        return commonMisspellings.filter(pattern => pattern.test(text)).length;
    }

    getStrengthMessage(category, score) {
        const messages = {
            engagement: 'Excellent engagement potential with strong hooks and calls-to-action!',
            readability: 'Very readable and well-structured content!',
            relevance: 'Highly relevant and on-trend content!',
            creativity: 'Creative and original approach!',
            technical: 'Technically sound with proper formatting!'
        };
        return messages[category] || 'Great work in this area!';
    }

    getImprovementMessage(category, score) {
        const messages = {
            engagement: 'Focus on stronger hooks and clear calls-to-action to boost engagement.',
            readability: 'Improve structure and clarity for better readability.',
            relevance: 'Align better with niche keywords and current trends.',
            creativity: 'Add more storytelling elements and unique perspectives.',
            technical: 'Review grammar, spelling, and formatting.'
        };
        return messages[category] || 'Consider improvements in this area.';
    }

    getViralFactors(scores, content) {
        const factors = [];
        
        if (scores.engagement.factors.hooks > 80) {
            factors.push('Strong opening hook');
        }
        if (scores.engagement.factors.questions > 60) {
            factors.push('Engaging questions');
        }
        if (scores.creativity.factors.storytelling > 70) {
            factors.push('Good storytelling');
        }
        if (scores.relevance.factors.trending > 60) {
            factors.push('Trending topics');
        }

        return factors;
    }
}

module.exports = ContentQualityService;
