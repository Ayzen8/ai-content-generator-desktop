import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import LoadingSpinner from './LoadingSpinner';

interface Template {
    id: number;
    name: string;
    description: string;
    category: string;
    template_type: string;
    content_structure: any;
    variables: string[];
    usage_count: number;
    niche_name?: string;
}

interface TemplateCategory {
    id: number;
    name: string;
    description: string;
    icon: string;
    sort_order: number;
}

interface SavedPrompt {
    id: number;
    name: string;
    description: string;
    prompt_text: string;
    niche_name?: string;
    style?: string;
    emotion?: string;
    variables: string[];
    usage_count: number;
    is_favorite: boolean;
}

const ContentTemplates: React.FC = () => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [categories, setCategories] = useState<TemplateCategory[]>([]);
    const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'templates' | 'prompts'>('templates');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [appliedContent, setAppliedContent] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [templatesData, categoriesData, promptsData] = await Promise.all([
                ApiService.get('/api/content-templates'),
                ApiService.get('/api/content-templates/categories'),
                ApiService.get('/api/content-templates/prompts')
            ]);
            
            setTemplates(templatesData);
            setCategories(categoriesData);
            setSavedPrompts(promptsData);
        } catch (error) {
            console.error('Error loading templates data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTemplates = selectedCategory 
        ? templates.filter(t => t.category === selectedCategory)
        : templates;

    const handleTemplateSelect = (template: Template) => {
        setSelectedTemplate(template);
        setTemplateVariables({});
        setAppliedContent(null);
        setShowTemplateModal(true);
    };

    const handleVariableChange = (variable: string, value: string) => {
        setTemplateVariables(prev => ({
            ...prev,
            [variable]: value
        }));
    };

    const applyTemplate = async () => {
        if (!selectedTemplate) return;

        try {
            const response = await ApiService.post('/api/content-templates/apply', {
                templateId: selectedTemplate.id,
                variables: templateVariables
            });
            
            setAppliedContent(response.applied_content);
        } catch (error) {
            console.error('Error applying template:', error);
        }
    };

    const useTemplate = async () => {
        if (!appliedContent) return;

        try {
            // Generate content using the applied template
            const response = await ApiService.post('/api/content/generate-from-template', {
                templateContent: appliedContent,
                templateId: selectedTemplate?.id
            });
            
            // Close modal and show success
            setShowTemplateModal(false);
            alert('✅ Content generated from template! Check the Content Generator tab.');
        } catch (error) {
            console.error('Error generating content from template:', error);
            alert('❌ Failed to generate content from template');
        }
    };

    if (loading) {
        return (
            <div className="content-templates">
                <div className="templates-header">
                    <h2>📝 Content Templates</h2>
                </div>
                <LoadingSpinner text="Loading templates..." />
            </div>
        );
    }

    return (
        <div className="content-templates">
            <div className="templates-header">
                <h2>📝 Content Templates</h2>
                <p>Use pre-built templates to speed up your content creation</p>
            </div>

            {/* Tab Navigation */}
            <div className="templates-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
                    onClick={() => setActiveTab('templates')}
                >
                    📋 Templates
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'prompts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('prompts')}
                >
                    💾 Saved Prompts
                </button>
            </div>

            {activeTab === 'templates' && (
                <div className="templates-content">
                    {/* Category Filter */}
                    <div className="category-filter">
                        <button 
                            className={`category-btn ${selectedCategory === '' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('')}
                        >
                            All Categories
                        </button>
                        {categories.map(category => (
                            <button 
                                key={category.id}
                                className={`category-btn ${selectedCategory === category.name ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(category.name)}
                            >
                                {category.icon} {category.name}
                            </button>
                        ))}
                    </div>

                    {/* Templates Grid */}
                    <div className="templates-grid">
                        {filteredTemplates.map(template => (
                            <div key={template.id} className="template-card">
                                <div className="template-header">
                                    <h3>{template.name}</h3>
                                    <span className="template-category">{template.category}</span>
                                </div>
                                <p className="template-description">{template.description}</p>
                                <div className="template-meta">
                                    <span className="template-type">{template.template_type}</span>
                                    <span className="template-usage">Used {template.usage_count} times</span>
                                    {template.niche_name && (
                                        <span className="template-niche">{template.niche_name}</span>
                                    )}
                                </div>
                                <div className="template-variables">
                                    <strong>Variables:</strong> {template.variables.join(', ')}
                                </div>
                                <button 
                                    className="use-template-btn"
                                    onClick={() => handleTemplateSelect(template)}
                                >
                                    Use Template
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'prompts' && (
                <div className="prompts-content">
                    <div className="prompts-header">
                        <h3>💾 Saved Prompts</h3>
                        <button className="create-prompt-btn">
                            ➕ Create New Prompt
                        </button>
                    </div>

                    <div className="prompts-grid">
                        {savedPrompts.map(prompt => (
                            <div key={prompt.id} className="prompt-card">
                                <div className="prompt-header">
                                    <h4>{prompt.name}</h4>
                                    {prompt.is_favorite && <span className="favorite-star">⭐</span>}
                                </div>
                                <p className="prompt-description">{prompt.description}</p>
                                <div className="prompt-preview">
                                    {prompt.prompt_text.substring(0, 100)}...
                                </div>
                                <div className="prompt-meta">
                                    {prompt.niche_name && (
                                        <span className="prompt-niche">{prompt.niche_name}</span>
                                    )}
                                    {prompt.style && (
                                        <span className="prompt-style">{prompt.style}</span>
                                    )}
                                    <span className="prompt-usage">Used {prompt.usage_count} times</span>
                                </div>
                                <div className="prompt-actions">
                                    <button className="use-prompt-btn">Use Prompt</button>
                                    <button className="edit-prompt-btn">Edit</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Template Application Modal */}
            {showTemplateModal && selectedTemplate && (
                <div className="template-modal-overlay">
                    <div className="template-modal">
                        <div className="modal-header">
                            <h3>Apply Template: {selectedTemplate.name}</h3>
                            <button 
                                className="close-modal-btn"
                                onClick={() => setShowTemplateModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-content">
                            <div className="template-variables-form">
                                <h4>Fill in the variables:</h4>
                                {selectedTemplate.variables.map(variable => (
                                    <div key={variable} className="variable-input">
                                        <label>{variable.replace(/_/g, ' ').toUpperCase()}:</label>
                                        <input
                                            type="text"
                                            value={templateVariables[variable] || ''}
                                            onChange={(e) => handleVariableChange(variable, e.target.value)}
                                            placeholder={`Enter ${variable.replace(/_/g, ' ')}`}
                                        />
                                    </div>
                                ))}
                                
                                <button 
                                    className="apply-template-btn"
                                    onClick={applyTemplate}
                                    disabled={selectedTemplate.variables.some(v => !templateVariables[v])}
                                >
                                    Apply Template
                                </button>
                            </div>

                            {appliedContent && (
                                <div className="applied-content-preview">
                                    <h4>Preview:</h4>
                                    <div className="content-preview">
                                        {Object.entries(appliedContent).map(([key, value]) => (
                                            <div key={key} className="content-section">
                                                <strong>{key.replace(/_/g, ' ').toUpperCase()}:</strong>
                                                <div className="content-text">
                                                    {Array.isArray(value) ? value.join('\n') : String(value)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <button 
                                        className="use-content-btn"
                                        onClick={useTemplate}
                                    >
                                        Generate Content from Template
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentTemplates;
