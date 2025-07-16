import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../AuthContext';
import { API_ENDPOINTS } from '../../../../../config/api';

interface WhatsAppTemplate {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  category: string;
  language: string;
  components: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: string;
    example?: {
      body_text?: string[][];
    };
    buttons?: Array<{
      type: string;
      text: string;
      url?: string;
      phone_number?: string;
    }>;
  }>;
}

interface WhatsAppTemplateSelectorProps {
  onTemplateSelect: (template: WhatsAppTemplate | null, parameters?: any) => void;
  isVisible: boolean;
}

const WhatsAppTemplateSelector: React.FC<WhatsAppTemplateSelectorProps> = ({ 
  onTemplateSelect, 
  isVisible 
}) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Load templates when component becomes visible
  useEffect(() => {
    if (isVisible && user) {
      loadTemplates();
    }
  }, [isVisible, user]);

  const loadTemplates = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `${API_ENDPOINTS.TEMPLATES}?userId=${encodeURIComponent(user.userId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load templates');
      }

      const data = await response.json();
      console.log('📋 Templates loaded:', data);
      
      // Filter to only show approved templates
      const approvedTemplates = data.templates.filter((t: WhatsAppTemplate) => t.status === 'APPROVED');
      setTemplates(approvedTemplates);
      
    } catch (err: any) {
      console.error('❌ Error loading templates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Extract parameters needed for a template
  const getTemplateParameters = (template: WhatsAppTemplate): string[] => {
    const parameters: string[] = [];
    
    template.components.forEach(component => {
      if (component.type === 'BODY' && component.text) {
        // Find all {{1}}, {{2}}, etc. parameters
        const matches = component.text.match(/\{\{(\d+)\}\}/g);
        if (matches) {
          matches.forEach(match => {
            const paramNum = match.replace(/[{}]/g, '');
            if (!parameters.includes(paramNum)) {
              parameters.push(paramNum);
            }
          });
        }
      }
    });
    
    return parameters.sort();
  };

  // Handle template selection
  const handleTemplateSelect = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    const templateParams = getTemplateParameters(template);
    
    // Initialize parameters object
    const initParams: Record<string, string> = {};
    templateParams.forEach(param => {
      initParams[param] = '';
    });
    setParameters(initParams);
  };

  // Handle parameter input change
  const handleParameterChange = (paramKey: string, value: string) => {
    setParameters(prev => ({
      ...prev,
      [paramKey]: value
    }));
  };

  // Send template with parameters
  const handleSendTemplate = () => {
    if (!selectedTemplate) return;
    
    const templateParams = getTemplateParameters(selectedTemplate);
    const hasAllParams = templateParams.every(param => parameters[param]?.trim());
    
    if (templateParams.length > 0 && !hasAllParams) {
      alert('Please fill in all required parameters');
      return;
    }

    // Build template components with parameters
    const templateComponents = templateParams.length > 0 ? [{
      type: "body",
      parameters: templateParams.map(param => ({
        type: "text",
        text: parameters[param]
      }))
    }] : undefined;

    onTemplateSelect(selectedTemplate, {
      templateName: selectedTemplate.name,
      templateLanguage: selectedTemplate.language,
      templateComponents
    });
    
    // Reset selection
    setSelectedTemplate(null);
    setParameters({});
  };

  // Render template preview
  const renderTemplatePreview = (template: WhatsAppTemplate) => {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    if (!bodyComponent?.text) return null;
    
    let previewText = bodyComponent.text;
    const templateParams = getTemplateParameters(template);
    
    // Replace parameters with values or placeholders
    templateParams.forEach(param => {
      const value = parameters[param] || `[Parameter ${param}]`;
      previewText = previewText.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), value);
    });
    
    return (
      <div style={{ 
        background: '#f0f0f0', 
        padding: '12px', 
        borderRadius: '8px', 
        marginTop: '8px',
        fontStyle: 'italic',
        fontSize: '14px'
      }}>
        Preview: {previewText}
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '16px',
      backgroundColor: '#fff',
      marginBottom: '16px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h4 style={{ margin: 0, color: '#333' }}>📱 WhatsApp Templates</h4>
        <button
          onClick={() => onTemplateSelect(null)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ✕
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading templates...
        </div>
      )}

      {error && (
        <div style={{ 
          color: '#d32f2f', 
          background: '#ffebee', 
          padding: '12px', 
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && templates.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#666' 
        }}>
          No approved WhatsApp templates found. Create templates in Meta Business Manager first.
        </div>
      )}

      {!loading && !error && templates.length > 0 && !selectedTemplate && (
        <div>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            Select a template to send:
          </p>
          {templates.map(template => (
            <div
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: '#fafafa'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.borderColor = '#DE1785';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fafafa';
                e.currentTarget.style.borderColor = '#e0e0e0';
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <strong style={{ color: '#333' }}>{template.name}</strong>
                <span style={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {template.status}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                {template.category} • {template.language}
              </div>
              <div style={{ fontSize: '14px', color: '#555' }}>
                {template.components.find(c => c.type === 'BODY')?.text || 'No body text'}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTemplate && (
        <div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid #e0e0e0'
          }}>
            <button
              onClick={() => setSelectedTemplate(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                marginRight: '8px',
                color: '#666'
              }}
            >
              ← Back
            </button>
            <strong style={{ color: '#333' }}>{selectedTemplate.name}</strong>
          </div>

          {getTemplateParameters(selectedTemplate).length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ marginBottom: '12px', color: '#555', fontWeight: 'bold' }}>
                Fill in template parameters:
              </p>
              {getTemplateParameters(selectedTemplate).map(param => (
                <div key={param} style={{ marginBottom: '12px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '14px',
                    color: '#555'
                  }}>
                    Parameter {param}:
                  </label>
                  <input
                    type="text"
                    value={parameters[param] || ''}
                    onChange={(e) => handleParameterChange(param, e.target.value)}
                    placeholder={`Enter value for {{${param}}}`}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {renderTemplatePreview(selectedTemplate)}

          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginTop: '16px' 
          }}>
            <button
              onClick={handleSendTemplate}
              style={{
                backgroundColor: '#DE1785',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Send Template
            </button>
            <button
              onClick={() => setSelectedTemplate(null)}
              style={{
                backgroundColor: '#f5f5f5',
                color: '#666',
                border: '1px solid #e0e0e0',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppTemplateSelector; 