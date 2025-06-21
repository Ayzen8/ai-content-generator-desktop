import React, { useState } from 'react';
import ApiService from '../services/api';
import { AnimatedCard, AnimatedButton } from './AnimationProvider';
import LoadingSpinner from './LoadingSpinner';

interface CustomNicheData {
    name: string;
    description: string;
    target_audience: string;
}

interface CustomNicheCreatorProps {
    onNicheCreated?: (niche: any) => void;
    onClose?: () => void;
}

const CustomNicheCreator: React.FC<CustomNicheCreatorProps> = ({ onNicheCreated, onClose }) => {
    const [formData, setFormData] = useState<CustomNicheData>({
        name: '',
        description: '',
        target_audience: ''
    });
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [aiEnhancing, setAiEnhancing] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);

    const handleInputChange = (field: keyof CustomNicheData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateStep1 = () => {
        return formData.name.trim() && formData.description.trim() && formData.target_audience.trim();
    };

    const handleNext = () => {
        if (validateStep1()) {
            setStep(2);
            generatePreview();
        }
    };

    const generatePreview = async () => {
        try {
            setAiEnhancing(true);
            // This would call the AI enhancement service
            // For now, we'll simulate the preview
            setTimeout(() => {
                setPreviewData({
                    content_pillars: [
                        'Educational Content',
                        'Industry Insights',
                        'Behind-the-scenes',
                        'Community Building',
                        'Success Stories'
                    ],
                    tone_of_voice: 'Professional yet approachable',
                    key_topics: [
                        'Industry trends',
                        'Best practices',
                        'Tips and tricks',
                        'Case studies',
                        'Expert interviews'
                    ],
                    hashtag_strategy: {
                        broad: ['#business', '#entrepreneur', '#success'],
                        niche: [`#${formData.name.toLowerCase().replace(/\s+/g, '')}`, '#industry'],
                        micro: ['#specific', '#targeted'],
                        trending: ['#trending', '#viral']
                    },
                    posting_frequency: 'Daily',
                    optimal_times: ['09:00', '12:00', '17:00'],
                    engagement_strategies: [
                        'Ask engaging questions',
                        'Share valuable insights',
                        'Tell compelling stories',
                        'Provide actionable tips'
                    ]
                });
                setAiEnhancing(false);
            }, 2000);
        } catch (error) {
            console.error('Error generating preview:', error);
            setAiEnhancing(false);
        }
    };

    const handleCreate = async () => {
        try {
            setLoading(true);
            const result = await ApiService.post('/api/niches/custom', formData);
            
            if (result.success) {
                if (onNicheCreated) {
                    onNicheCreated(result);
                }
                alert('✅ Custom niche created successfully!');
                if (onClose) {
                    onClose();
                }
            } else {
                alert('❌ Failed to create custom niche');
            }
        } catch (error) {
            console.error('Error creating custom niche:', error);
            alert('❌ Failed to create custom niche');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setStep(1);
        setPreviewData(null);
    };

    return (
        <div className="custom-niche-creator">
            <div className="creator-header">
                <h2>🎯 Create Custom Niche</h2>
                <p>Design a personalized niche with AI-powered insights</p>
                {onClose && (
                    <button className="close-btn" onClick={onClose}>×</button>
                )}
            </div>

            <div className="creator-progress">
                <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
                    <span className="step-number">1</span>
                    <span className="step-label">Basic Info</span>
                </div>
                <div className="progress-line"></div>
                <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
                    <span className="step-number">2</span>
                    <span className="step-label">AI Enhancement</span>
                </div>
            </div>

            {step === 1 && (
                <div className="step-content">
                    <AnimatedCard className="form-card">
                        <h3>📝 Basic Information</h3>
                        
                        <div className="form-group">
                            <label htmlFor="niche-name">Niche Name *</label>
                            <input
                                id="niche-name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="e.g., Sustainable Fashion, Tech Startups, Fitness Coaching"
                                maxLength={50}
                            />
                            <small>{formData.name.length}/50 characters</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="niche-description">Description *</label>
                            <textarea
                                id="niche-description"
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Describe what this niche is about, its main themes, and what makes it unique..."
                                rows={4}
                                maxLength={500}
                            />
                            <small>{formData.description.length}/500 characters</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="target-audience">Target Audience *</label>
                            <textarea
                                id="target-audience"
                                value={formData.target_audience}
                                onChange={(e) => handleInputChange('target_audience', e.target.value)}
                                placeholder="Who is your target audience? Include demographics, interests, pain points, and goals..."
                                rows={3}
                                maxLength={300}
                            />
                            <small>{formData.target_audience.length}/300 characters</small>
                        </div>

                        <div className="form-actions">
                            <AnimatedButton
                                variant="primary"
                                onClick={handleNext}
                                disabled={!validateStep1()}
                            >
                                Next: AI Enhancement →
                            </AnimatedButton>
                        </div>
                    </AnimatedCard>
                </div>
            )}

            {step === 2 && (
                <div className="step-content">
                    {aiEnhancing ? (
                        <div className="ai-enhancing">
                            <LoadingSpinner text="AI is analyzing your niche and generating insights..." />
                            <div className="enhancing-steps">
                                <div className="enhancing-step">🧠 Analyzing niche characteristics</div>
                                <div className="enhancing-step">📊 Generating content strategy</div>
                                <div className="enhancing-step">🎯 Creating audience personas</div>
                                <div className="enhancing-step">📝 Building content templates</div>
                            </div>
                        </div>
                    ) : previewData ? (
                        <div className="preview-content">
                            <AnimatedCard className="preview-card">
                                <h3>🤖 AI-Enhanced Niche Strategy</h3>
                                
                                <div className="preview-section">
                                    <h4>📋 Content Pillars</h4>
                                    <div className="pillars-list">
                                        {previewData.content_pillars.map((pillar: string, index: number) => (
                                            <span key={index} className="pillar-tag">{pillar}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="preview-section">
                                    <h4>🎭 Tone of Voice</h4>
                                    <p className="tone-description">{previewData.tone_of_voice}</p>
                                </div>

                                <div className="preview-section">
                                    <h4>🏷️ Hashtag Strategy</h4>
                                    <div className="hashtag-categories">
                                        <div className="hashtag-category">
                                            <span className="category-label">Broad:</span>
                                            <div className="hashtag-list">
                                                {previewData.hashtag_strategy.broad.map((tag: string, index: number) => (
                                                    <span key={index} className="hashtag-tag broad">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="hashtag-category">
                                            <span className="category-label">Niche:</span>
                                            <div className="hashtag-list">
                                                {previewData.hashtag_strategy.niche.map((tag: string, index: number) => (
                                                    <span key={index} className="hashtag-tag niche">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="preview-section">
                                    <h4>⏰ Optimal Posting</h4>
                                    <div className="posting-info">
                                        <div className="posting-frequency">
                                            <span className="label">Frequency:</span>
                                            <span className="value">{previewData.posting_frequency}</span>
                                        </div>
                                        <div className="posting-times">
                                            <span className="label">Best Times:</span>
                                            <div className="time-slots">
                                                {previewData.optimal_times.map((time: string, index: number) => (
                                                    <span key={index} className="time-slot">{time}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="preview-section">
                                    <h4>🚀 Engagement Strategies</h4>
                                    <ul className="strategies-list">
                                        {previewData.engagement_strategies.map((strategy: string, index: number) => (
                                            <li key={index}>{strategy}</li>
                                        ))}
                                    </ul>
                                </div>
                            </AnimatedCard>

                            <div className="preview-actions">
                                <AnimatedButton
                                    variant="secondary"
                                    onClick={handleBack}
                                >
                                    ← Back to Edit
                                </AnimatedButton>
                                <AnimatedButton
                                    variant="primary"
                                    onClick={handleCreate}
                                    loading={loading}
                                >
                                    🎯 Create Custom Niche
                                </AnimatedButton>
                            </div>
                        </div>
                    ) : (
                        <div className="error-message">
                            <p>❌ Failed to generate AI insights</p>
                            <AnimatedButton variant="secondary" onClick={handleBack}>
                                ← Go Back
                            </AnimatedButton>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomNicheCreator;
