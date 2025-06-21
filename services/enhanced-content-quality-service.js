class EnhancedContentQualityService {
    constructor() {
        this.qualityMetrics = {
            engagement: 0.3,      // 30% weight
            readability: 0.25,    // 25% weight
            value: 0.25,          // 25% weight
            optimization: 0.2     // 20% weight
        };

        this.platformOptimizations = {
            x: {
                maxLength: 280,
                idealLength: [100, 200],
                hashtagLimit: 3,
                mentionLimit: 2
            },
            instagram: {
                maxLength: 2200,
                idealLength: [150, 300],
                hashtagLimit: 30,
                idealHashtags: [12, 15]
            }
        };
    }

    // Comprehensive content analysis
    async analyzeContent(content, niche, platform = 'x') {
        try {
            const analysis = {
                overall_score: 0,
                detailed_scores: {},
                recommendations: [],
                optimization_suggestions: [],
                viral_potential: 0,
                engagement_prediction: 0
            };

            // Analyze different aspects
            analysis.detailed_scores.engagement = this.analyzeEngagement(content, platform);
            analysis.detailed_scores.readability = this.analyzeReadability(content);
            analysis.detailed_scores.value = this.analyzeValue(content, niche);
            analysis.detailed_scores.optimization = this.analyzeOptimization(content, platform);
            analysis.detailed_scores.hook_strength = this.analyzeHookStrength(content);
            analysis.detailed_scores.call_to_action = this.analyzeCallToAction(content);
            analysis.detailed_scores.emotional_impact = this.analyzeEmotionalImpact(content);

            // Calculate overall score
            analysis.overall_score = this.calculateOverallScore(analysis.detailed_scores);

            // Generate recommendations
            analysis.recommendations = this.generateRecommendations(analysis.detailed_scores, content, platform);

            // Predict viral potential
            analysis.viral_potential = this.predictViralPotential(analysis.detailed_scores, content);

            // Predict engagement
            analysis.engagement_prediction = this.predictEngagement(analysis.detailed_scores, platform);

            // Generate optimization suggestions
            analysis.optimization_suggestions = this.generateOptimizationSuggestions(content, platform, analysis.detailed_scores);

            return analysis;
        } catch (error) {
            console.error('Error analyzing content:', error);
            throw error;
        }
    }

    // Analyze engagement potential
    analyzeEngagement(content, platform) {
        let score = 0;
        const factors = [];

        // Question presence (encourages responses)
        if (content.includes('?')) {
            score += 15;
            factors.push('Contains question (+15)');
        }

        // Call-to-action words
        const ctaWords = ['comment', 'share', 'like', 'follow', 'reply', 'thoughts', 'agree', 'disagree', 'experience'];
        const ctaCount = ctaWords.filter(word => content.toLowerCase().includes(word)).length;
        score += Math.min(ctaCount * 5, 20);
        if (ctaCount > 0) factors.push(`CTA words: ${ctaCount} (+${Math.min(ctaCount * 5, 20)})`);

        // Emotional words
        const emotionalWords = ['amazing', 'incredible', 'shocking', 'unbelievable', 'love', 'hate', 'excited', 'frustrated', 'surprised'];
        const emotionCount = emotionalWords.filter(word => content.toLowerCase().includes(word)).length;
        score += Math.min(emotionCount * 3, 15);
        if (emotionCount > 0) factors.push(`Emotional words: ${emotionCount} (+${Math.min(emotionCount * 3, 15)})`);

        // Platform-specific engagement factors
        if (platform === 'x') {
            // X-specific factors
            if (content.includes('@')) {
                score += 10;
                factors.push('Mentions (+10)');
            }
            if (content.includes('#')) {
                score += 5;
                factors.push('Hashtags (+5)');
            }
        } else if (platform === 'instagram') {
            // Instagram-specific factors
            const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
            score += Math.min(emojiCount * 2, 10);
            if (emojiCount > 0) factors.push(`Emojis: ${emojiCount} (+${Math.min(emojiCount * 2, 10)})`);
        }

        // Controversy/debate potential
        const controversialWords = ['unpopular opinion', 'controversial', 'debate', 'argue', 'wrong', 'right'];
        if (controversialWords.some(word => content.toLowerCase().includes(word))) {
            score += 10;
            factors.push('Debate potential (+10)');
        }

        return {
            score: Math.min(score, 100),
            factors,
            category: this.getScoreCategory(Math.min(score, 100))
        };
    }

    // Analyze readability
    analyzeReadability(content) {
        let score = 100;
        const factors = [];

        // Sentence length analysis
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;

        if (avgSentenceLength > 20) {
            score -= 20;
            factors.push('Long sentences (-20)');
        } else if (avgSentenceLength < 8) {
            score -= 10;
            factors.push('Very short sentences (-10)');
        } else {
            factors.push('Good sentence length (+0)');
        }

        // Word complexity
        const complexWords = content.split(' ').filter(word => word.length > 12).length;
        const wordCount = content.split(' ').length;
        const complexityRatio = complexWords / wordCount;

        if (complexityRatio > 0.1) {
            score -= 15;
            factors.push('Complex words (-15)');
        }

        // Paragraph structure (for Instagram)
        const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
        if (paragraphs.length > 1) {
            score += 10;
            factors.push('Good paragraph breaks (+10)');
        }

        // Jargon detection
        const jargonWords = ['synergy', 'leverage', 'paradigm', 'disruptive', 'scalable'];
        const jargonCount = jargonWords.filter(word => content.toLowerCase().includes(word)).length;
        if (jargonCount > 0) {
            score -= jargonCount * 5;
            factors.push(`Business jargon (-${jargonCount * 5})`);
        }

        return {
            score: Math.max(score, 0),
            factors,
            avg_sentence_length: avgSentenceLength,
            complexity_ratio: complexityRatio,
            category: this.getScoreCategory(Math.max(score, 0))
        };
    }

    // Analyze value proposition
    analyzeValue(content, niche) {
        let score = 0;
        const factors = [];

        // Educational value
        const educationalWords = ['learn', 'tip', 'how to', 'guide', 'tutorial', 'lesson', 'teach', 'explain'];
        const educationalCount = educationalWords.filter(word => content.toLowerCase().includes(word)).length;
        score += Math.min(educationalCount * 8, 25);
        if (educationalCount > 0) factors.push(`Educational content (+${Math.min(educationalCount * 8, 25)})`);

        // Actionable advice
        const actionWords = ['try', 'start', 'stop', 'avoid', 'use', 'implement', 'apply', 'practice'];
        const actionCount = actionWords.filter(word => content.toLowerCase().includes(word)).length;
        score += Math.min(actionCount * 5, 20);
        if (actionCount > 0) factors.push(`Actionable advice (+${Math.min(actionCount * 5, 20)})`);

        // Personal experience/story
        const personalWords = ['i', 'my', 'me', 'personal', 'experience', 'story', 'journey'];
        const personalCount = personalWords.filter(word => content.toLowerCase().includes(word)).length;
        score += Math.min(personalCount * 3, 15);
        if (personalCount > 0) factors.push(`Personal touch (+${Math.min(personalCount * 3, 15)})`);

        // Niche-specific value
        if (niche && niche.keywords) {
            const nicheKeywords = niche.keywords.split(',').map(k => k.trim().toLowerCase());
            const nicheRelevance = nicheKeywords.filter(keyword => 
                content.toLowerCase().includes(keyword)
            ).length;
            score += Math.min(nicheRelevance * 10, 30);
            if (nicheRelevance > 0) factors.push(`Niche relevance (+${Math.min(nicheRelevance * 10, 30)})`);
        }

        // Unique insights
        const insightWords = ['insight', 'realize', 'discover', 'secret', 'truth', 'fact', 'research'];
        const insightCount = insightWords.filter(word => content.toLowerCase().includes(word)).length;
        score += Math.min(insightCount * 7, 20);
        if (insightCount > 0) factors.push(`Insights provided (+${Math.min(insightCount * 7, 20)})`);

        return {
            score: Math.min(score, 100),
            factors,
            category: this.getScoreCategory(Math.min(score, 100))
        };
    }

    // Analyze platform optimization
    analyzeOptimization(content, platform) {
        let score = 0;
        const factors = [];
        const platformRules = this.platformOptimizations[platform];

        if (!platformRules) return { score: 50, factors: ['Unknown platform'], category: 'Average' };

        // Length optimization
        const contentLength = content.length;
        if (contentLength <= platformRules.maxLength) {
            if (contentLength >= platformRules.idealLength[0] && contentLength <= platformRules.idealLength[1]) {
                score += 30;
                factors.push('Ideal length (+30)');
            } else if (contentLength < platformRules.idealLength[0]) {
                score += 15;
                factors.push('Short but acceptable (+15)');
            } else {
                score += 20;
                factors.push('Good length (+20)');
            }
        } else {
            score -= 20;
            factors.push('Too long (-20)');
        }

        // Hashtag optimization
        const hashtagCount = (content.match(/#\w+/g) || []).length;
        if (platform === 'instagram') {
            if (hashtagCount >= platformRules.idealHashtags[0] && hashtagCount <= platformRules.idealHashtags[1]) {
                score += 25;
                factors.push('Optimal hashtag count (+25)');
            } else if (hashtagCount > 0) {
                score += 10;
                factors.push('Has hashtags (+10)');
            }
        } else if (platform === 'x') {
            if (hashtagCount <= platformRules.hashtagLimit && hashtagCount > 0) {
                score += 20;
                factors.push('Good hashtag usage (+20)');
            } else if (hashtagCount > platformRules.hashtagLimit) {
                score -= 10;
                factors.push('Too many hashtags (-10)');
            }
        }

        // Platform-specific features
        if (platform === 'x') {
            // Thread potential
            if (content.includes('🧵') || content.includes('thread')) {
                score += 15;
                factors.push('Thread format (+15)');
            }
        } else if (platform === 'instagram') {
            // Story elements
            if (content.includes('\n') && content.split('\n').length > 2) {
                score += 10;
                factors.push('Good story structure (+10)');
            }
        }

        return {
            score: Math.min(score, 100),
            factors,
            length: contentLength,
            hashtag_count: hashtagCount,
            category: this.getScoreCategory(Math.min(score, 100))
        };
    }

    // Analyze hook strength (first line/sentence)
    analyzeHookStrength(content) {
        const firstLine = content.split('\n')[0] || content.split('.')[0];
        let score = 0;
        const factors = [];

        // Hook words
        const hookWords = ['secret', 'shocking', 'surprising', 'unbelievable', 'amazing', 'incredible', 'mistake', 'truth'];
        const hookCount = hookWords.filter(word => firstLine.toLowerCase().includes(word)).length;
        score += hookCount * 10;
        if (hookCount > 0) factors.push(`Hook words: ${hookCount} (+${hookCount * 10})`);

        // Numbers in hook
        if (/\d+/.test(firstLine)) {
            score += 15;
            factors.push('Contains numbers (+15)');
        }

        // Question hook
        if (firstLine.includes('?')) {
            score += 20;
            factors.push('Question hook (+20)');
        }

        // Length check
        if (firstLine.length > 10 && firstLine.length < 100) {
            score += 10;
            factors.push('Good hook length (+10)');
        }

        // Urgency words
        const urgencyWords = ['now', 'today', 'immediately', 'urgent', 'quickly'];
        if (urgencyWords.some(word => firstLine.toLowerCase().includes(word))) {
            score += 15;
            factors.push('Creates urgency (+15)');
        }

        return {
            score: Math.min(score, 100),
            factors,
            hook_text: firstLine,
            category: this.getScoreCategory(Math.min(score, 100))
        };
    }

    // Analyze call-to-action effectiveness
    analyzeCallToAction(content) {
        let score = 0;
        const factors = [];

        // CTA presence
        const ctaPatterns = [
            /what do you think/i,
            /let me know/i,
            /comment below/i,
            /share your/i,
            /follow for/i,
            /like if/i,
            /agree\?/i,
            /thoughts\?/i
        ];

        const ctaMatches = ctaPatterns.filter(pattern => pattern.test(content)).length;
        score += Math.min(ctaMatches * 20, 60);
        if (ctaMatches > 0) factors.push(`CTA patterns: ${ctaMatches} (+${Math.min(ctaMatches * 20, 60)})`);

        // Question at end
        const lastSentence = content.split(/[.!]/).pop() || '';
        if (lastSentence.includes('?')) {
            score += 20;
            factors.push('Ends with question (+20)');
        }

        // Engagement words
        const engagementWords = ['engage', 'interact', 'participate', 'join', 'connect'];
        const engagementCount = engagementWords.filter(word => content.toLowerCase().includes(word)).length;
        score += engagementCount * 10;
        if (engagementCount > 0) factors.push(`Engagement words: ${engagementCount} (+${engagementCount * 10})`);

        return {
            score: Math.min(score, 100),
            factors,
            category: this.getScoreCategory(Math.min(score, 100))
        };
    }

    // Analyze emotional impact
    analyzeEmotionalImpact(content) {
        let score = 0;
        const factors = [];

        // Positive emotions
        const positiveWords = ['love', 'amazing', 'incredible', 'excited', 'happy', 'joy', 'wonderful', 'fantastic'];
        const positiveCount = positiveWords.filter(word => content.toLowerCase().includes(word)).length;
        score += positiveCount * 8;
        if (positiveCount > 0) factors.push(`Positive emotions: ${positiveCount} (+${positiveCount * 8})`);

        // Strong emotions
        const strongWords = ['hate', 'angry', 'frustrated', 'shocked', 'devastated', 'thrilled', 'ecstatic'];
        const strongCount = strongWords.filter(word => content.toLowerCase().includes(word)).length;
        score += strongCount * 12;
        if (strongCount > 0) factors.push(`Strong emotions: ${strongCount} (+${strongCount * 12})`);

        // Empathy words
        const empathyWords = ['understand', 'feel', 'relate', 'experience', 'struggle', 'challenge'];
        const empathyCount = empathyWords.filter(word => content.toLowerCase().includes(word)).length;
        score += empathyCount * 6;
        if (empathyCount > 0) factors.push(`Empathy words: ${empathyCount} (+${empathyCount * 6})`);

        // Exclamation marks (but not too many)
        const exclamationCount = (content.match(/!/g) || []).length;
        if (exclamationCount === 1 || exclamationCount === 2) {
            score += 10;
            factors.push('Good excitement level (+10)');
        } else if (exclamationCount > 3) {
            score -= 5;
            factors.push('Too many exclamations (-5)');
        }

        return {
            score: Math.min(score, 100),
            factors,
            category: this.getScoreCategory(Math.min(score, 100))
        };
    }

    // Calculate overall score
    calculateOverallScore(scores) {
        const weightedScore = 
            (scores.engagement.score * this.qualityMetrics.engagement) +
            (scores.readability.score * this.qualityMetrics.readability) +
            (scores.value.score * this.qualityMetrics.value) +
            (scores.optimization.score * this.qualityMetrics.optimization);

        return Math.round(weightedScore);
    }

    // Predict viral potential
    predictViralPotential(scores, content) {
        let viralScore = 0;

        // High engagement potential
        if (scores.engagement.score > 80) viralScore += 30;
        else if (scores.engagement.score > 60) viralScore += 20;

        // Strong hook
        if (scores.hook_strength.score > 70) viralScore += 25;

        // Emotional impact
        if (scores.emotional_impact.score > 75) viralScore += 25;

        // Controversy/debate potential
        if (content.toLowerCase().includes('unpopular') || content.toLowerCase().includes('controversial')) {
            viralScore += 20;
        }

        return Math.min(viralScore, 100);
    }

    // Predict engagement rate
    predictEngagement(scores, platform) {
        const baseRate = platform === 'instagram' ? 3.5 : 2.1; // Industry averages
        let multiplier = 1;

        if (scores.engagement.score > 80) multiplier += 0.5;
        if (scores.call_to_action.score > 70) multiplier += 0.3;
        if (scores.emotional_impact.score > 75) multiplier += 0.4;

        return Math.round((baseRate * multiplier) * 100) / 100;
    }

    // Generate optimization suggestions
    generateOptimizationSuggestions(content, platform, scores) {
        const suggestions = [];

        if (scores.engagement.score < 60) {
            suggestions.push({
                type: 'engagement',
                priority: 'high',
                suggestion: 'Add a question or call-to-action to encourage responses',
                impact: 'Could increase engagement by 25-40%'
            });
        }

        if (scores.hook_strength.score < 50) {
            suggestions.push({
                type: 'hook',
                priority: 'high',
                suggestion: 'Strengthen your opening line with numbers, questions, or compelling statements',
                impact: 'Could improve click-through rate by 30%'
            });
        }

        if (scores.readability.score < 70) {
            suggestions.push({
                type: 'readability',
                priority: 'medium',
                suggestion: 'Break up long sentences and use simpler language',
                impact: 'Could improve completion rate by 20%'
            });
        }

        if (platform === 'instagram' && scores.optimization.hashtag_count < 10) {
            suggestions.push({
                type: 'hashtags',
                priority: 'medium',
                suggestion: 'Add more relevant hashtags (aim for 12-15 for Instagram)',
                impact: 'Could increase discoverability by 35%'
            });
        }

        return suggestions;
    }

    // Generate recommendations
    generateRecommendations(scores, content, platform) {
        const recommendations = [];

        // Overall performance
        const overallScore = this.calculateOverallScore(scores);
        if (overallScore >= 80) {
            recommendations.push('🎉 Excellent content! This has strong viral potential.');
        } else if (overallScore >= 60) {
            recommendations.push('👍 Good content with room for improvement.');
        } else {
            recommendations.push('⚠️ Content needs significant improvements before posting.');
        }

        // Specific recommendations based on scores
        if (scores.engagement.score < 50) {
            recommendations.push('💬 Add more engaging elements like questions or controversial statements.');
        }

        if (scores.value.score < 50) {
            recommendations.push('💡 Provide more actionable value or insights to your audience.');
        }

        if (scores.emotional_impact.score < 40) {
            recommendations.push('❤️ Increase emotional connection with personal stories or stronger language.');
        }

        return recommendations;
    }

    // Get score category
    getScoreCategory(score) {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Average';
        return 'Needs Improvement';
    }
}

module.exports = new EnhancedContentQualityService();
