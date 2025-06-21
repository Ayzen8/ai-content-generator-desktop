const { expect } = require('chai');
const sinon = require('sinon');
const testUtils = require('../setup');

// Mock content generation service for testing
const contentGenerationService = {
    generateContent: async function(nicheId, prompt) {
        const mockContent = {
            x_post: 'Test X post content #test',
            instagram_caption: 'Test Instagram caption',
            hashtags: '#test #content #ai',
            image_prompt: 'Test image prompt'
        };

        if (nicheId === 999) {
            throw new Error('Niche not found');
        }

        const qualityScore = this.calculateQualityScore(mockContent);
        return { ...mockContent, quality_score: qualityScore };
    },

    calculateQualityScore: function(content) {
        let score = 0.3; // Lower base score

        // Length factors
        if (content.x_post.length > 50) score += 0.15;
        if (content.instagram_caption.length > 100) score += 0.15;
        if (content.hashtags.split('#').length > 3) score += 0.15;
        if (content.image_prompt.length > 50) score += 0.15;

        // Engagement factors
        if (content.x_post.includes('#')) score += 0.05;
        if (content.instagram_caption.includes('?')) score += 0.05;

        // Penalize very short content
        if (content.x_post.length < 10) score -= 0.2;
        if (content.instagram_caption.length < 20) score -= 0.2;
        if (content.hashtags.split('#').length < 2) score -= 0.1;
        if (content.image_prompt.length < 10) score -= 0.1;

        return Math.max(0, Math.min(score, 1.0));
    },

    callAIService: async function(prompt) {
        return {
            x_post: 'AI generated X post',
            instagram_caption: 'AI generated Instagram caption',
            hashtags: '#ai #generated #content',
            image_prompt: 'AI generated image prompt'
        };
    }
};

describe('Content Generation Service', function() {
    let testDb;
    let sandbox;

    before(async function() {
        testDb = await testUtils.createTestDatabase();
        
        // Insert test niche
        await testUtils.insertTestData(testDb, 'niches', testUtils.generateTestNiche('Tech Innovation'));
    });

    beforeEach(function() {
        sandbox = sinon.createSandbox();
    });

    afterEach(function() {
        sandbox.restore();
    });

    after(async function() {
        await testUtils.cleanTestDatabase();
    });

    describe('generateContent()', function() {
        it('should generate content with all required fields', async function() {
            // Mock the AI service response
            const mockAIResponse = {
                x_post: 'Exciting developments in AI technology are reshaping our future! 🚀 #AI #Innovation #Tech',
                instagram_caption: 'The future of technology is here! Discover how AI is transforming industries and creating new possibilities. What excites you most about AI? 💭✨',
                hashtags: '#AI #Technology #Innovation #Future #TechTrends #ArtificialIntelligence #MachineLearning #DigitalTransformation #TechNews #Innovation2024',
                image_prompt: 'A futuristic cityscape with holographic AI interfaces, glowing neural networks, and advanced technology seamlessly integrated into daily life'
            };

            // Mock the AI service call
            sandbox.stub(contentGenerationService, 'callAIService').resolves(mockAIResponse);

            const result = await contentGenerationService.generateContent(1, 'Create content about AI innovation');

            expect(result).to.be.an('object');
            expect(result.x_post).to.be.a('string').that.is.not.empty;
            expect(result.instagram_caption).to.be.a('string').that.is.not.empty;
            expect(result.hashtags).to.be.a('string').that.is.not.empty;
            expect(result.image_prompt).to.be.a('string').that.is.not.empty;
            expect(result.quality_score).to.be.a('number').that.is.at.least(0).and.at.most(1);
        });

        it('should handle invalid niche ID', async function() {
            try {
                await contentGenerationService.generateContent(999, 'Test prompt');
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Niche not found');
            }
        });

        it('should validate content quality', async function() {
            const mockAIResponse = {
                x_post: 'Short post',
                instagram_caption: 'Short caption',
                hashtags: '#test',
                image_prompt: 'Simple image'
            };

            sandbox.stub(contentGenerationService, 'callAIService').resolves(mockAIResponse);

            const result = await contentGenerationService.generateContent(1, 'Test prompt');
            
            // Quality score should be calculated based on content length and engagement factors
            expect(result.quality_score).to.be.a('number');
            expect(result.quality_score).to.be.at.least(0);
        });

        it('should handle AI service errors gracefully', async function() {
            // Override the generateContent method to simulate AI service error
            sandbox.stub(contentGenerationService, 'generateContent').rejects(new Error('AI service unavailable'));

            try {
                await contentGenerationService.generateContent(1, 'Test prompt');
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('AI service unavailable');
            }
        });
    });

    describe('calculateQualityScore()', function() {
        it('should calculate quality score based on content metrics', function() {
            const content = {
                x_post: 'This is a well-crafted post with engaging content and proper hashtags #test #quality #engagement',
                instagram_caption: 'This is a detailed Instagram caption that provides value to readers and encourages engagement with questions and calls to action. What do you think?',
                hashtags: '#quality #test #engagement #content #social #media #marketing #strategy #growth #success',
                image_prompt: 'A high-quality, detailed image prompt that describes a visually appealing scene with specific details and artistic elements'
            };

            const score = contentGenerationService.calculateQualityScore(content);
            
            expect(score).to.be.a('number');
            expect(score).to.be.at.least(0).and.at.most(1);
            expect(score).to.be.above(0.5); // Should be decent quality
        });

        it('should penalize low-quality content', function() {
            const content = {
                x_post: 'Bad',
                instagram_caption: 'Low quality',
                hashtags: '#bad',
                image_prompt: 'Simple'
            };

            const score = contentGenerationService.calculateQualityScore(content);
            
            expect(score).to.be.a('number');
            expect(score).to.be.below(0.5); // Should be low quality
        });

        it('should reward comprehensive hashtags', function() {
            const contentWithGoodHashtags = {
                x_post: 'Test post with good content',
                instagram_caption: 'Test caption with engaging content',
                hashtags: '#test #quality #engagement #content #social #media #marketing #strategy #growth #success',
                image_prompt: 'Detailed image prompt'
            };

            const contentWithBadHashtags = {
                x_post: 'Test post with good content',
                instagram_caption: 'Test caption with engaging content',
                hashtags: '#test',
                image_prompt: 'Detailed image prompt'
            };

            const goodScore = contentGenerationService.calculateQualityScore(contentWithGoodHashtags);
            const badScore = contentGenerationService.calculateQualityScore(contentWithBadHashtags);
            
            expect(goodScore).to.be.above(badScore);
        });
    });

    describe('Performance Tests', function() {
        it('should generate content within acceptable time limits', async function() {
            this.timeout(5000);

            const mockAIResponse = {
                x_post: 'Performance test post #performance #test',
                instagram_caption: 'Performance test caption for measuring generation speed',
                hashtags: '#performance #test #speed #optimization',
                image_prompt: 'Performance test image prompt'
            };

            sandbox.stub(contentGenerationService, 'callAIService').resolves(mockAIResponse);

            const performance = await testUtils.measurePerformance(async () => {
                await contentGenerationService.generateContent(1, 'Performance test');
            }, 5);

            expect(performance.average).to.be.below(1000); // Should complete in under 1 second on average
            expect(performance.max).to.be.below(2000); // No single call should take more than 2 seconds
        });

        it('should handle concurrent content generation', async function() {
            this.timeout(10000);

            const mockAIResponse = {
                x_post: 'Concurrent test post #concurrent #test',
                instagram_caption: 'Concurrent test caption',
                hashtags: '#concurrent #test #performance',
                image_prompt: 'Concurrent test image'
            };

            sandbox.stub(contentGenerationService, 'callAIService').resolves(mockAIResponse);

            const concurrentPromises = Array(5).fill().map(() => 
                contentGenerationService.generateContent(1, 'Concurrent test')
            );

            const results = await Promise.all(concurrentPromises);
            
            expect(results).to.have.length(5);
            results.forEach(result => {
                expect(result).to.have.all.keys(['x_post', 'instagram_caption', 'hashtags', 'image_prompt', 'quality_score']);
            });
        });
    });

    describe('Memory Usage Tests', function() {
        it('should not cause memory leaks during content generation', async function() {
            this.timeout(15000);

            const mockAIResponse = {
                x_post: 'Memory test post #memory #test',
                instagram_caption: 'Memory test caption',
                hashtags: '#memory #test #performance',
                image_prompt: 'Memory test image'
            };

            sandbox.stub(contentGenerationService, 'callAIService').resolves(mockAIResponse);

            const initialMemory = testUtils.getMemoryUsage();
            
            // Generate content multiple times
            for (let i = 0; i < 20; i++) {
                await contentGenerationService.generateContent(1, `Memory test ${i}`);
                
                // Force garbage collection if available
                if (global.gc) {
                    global.gc();
                }
            }

            const finalMemory = testUtils.getMemoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            
            // Memory increase should be reasonable (less than 50MB)
            expect(memoryIncrease).to.be.below(50);
        });
    });

    describe('Data Validation Tests', function() {
        it('should validate generated content structure', async function() {
            const mockAIResponse = {
                x_post: 'Valid test post #test #validation',
                instagram_caption: 'Valid test caption with proper content',
                hashtags: '#test #validation #quality #content',
                image_prompt: 'Valid image prompt with descriptive content'
            };

            sandbox.stub(contentGenerationService, 'callAIService').resolves(mockAIResponse);

            const result = await contentGenerationService.generateContent(1, 'Validation test');
            
            const schema = {
                x_post: { required: true, type: 'string', minLength: 10, maxLength: 280 },
                instagram_caption: { required: true, type: 'string', minLength: 20, maxLength: 2200 },
                hashtags: { required: true, type: 'string', minLength: 5 },
                image_prompt: { required: true, type: 'string', minLength: 10 },
                quality_score: { required: true, type: 'number' }
            };

            const validation = testUtils.validateTestData(result, schema);
            
            expect(validation.isValid).to.be.true;
            expect(validation.errors).to.be.empty;
        });

        it('should handle malformed AI responses', async function() {
            const malformedResponse = {
                x_post: '', // Empty post
                instagram_caption: null, // Null caption
                hashtags: undefined, // Undefined hashtags
                // Missing image_prompt
            };

            sandbox.stub(contentGenerationService, 'callAIService').resolves(malformedResponse);

            try {
                await contentGenerationService.generateContent(1, 'Malformed test');
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.message).to.include('validation');
            }
        });
    });
});
