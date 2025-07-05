import React, { useState, useRef, useEffect } from 'react';
import WhatsAppTemplateSelector from './WhatsAppTemplateSelector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSend: (messageData: any) => void;
  mode: 'new' | 'reply';
  replyToId?: string;
  initialChannel?: 'email' | 'whatsapp' | 'discussion';
  onCreateDiscussion?: (discussionData: any) => void;
}

const ComposeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSend,
  mode,
  replyToId,
  initialChannel = 'email',
  onCreateDiscussion
}) => {
  // State
  const [channel, setChannel] = useState(initialChannel);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  // Discussion-specific state
  const [discussionTitle, setDiscussionTitle] = useState('');
  const [discussionParticipants, setDiscussionParticipants] = useState('');

  // Refs
  const modalRef = useRef<HTMLDivElement>(null);

  // Close template selector when switching away from WhatsApp
  useEffect(() => {
    if (channel !== 'whatsapp') {
      setShowTemplateSelector(false);
    }
  }, [channel]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTo('');
      setSubject('');
      setContent('');
      setShowTemplateSelector(false);
      setDiscussionTitle('');
      setDiscussionParticipants('');
    }
  }, [isOpen]);

  // Handle WhatsApp template selection
  const handleTemplateSelect = async (template: any, templateParams?: any) => {
    if (!template) {
      // User closed template selector
      setShowTemplateSelector(false);
      return;
    }
    
    try {
      // Send template message
      const messageData = {
        channel: 'whatsapp',
        to: to.trim(),
        templateName: templateParams.templateName,
        templateLanguage: templateParams.templateLanguage,
        templateComponents: templateParams.templateComponents
      };

      await onSend(messageData);
      
      // Reset form and close modal
      setTo('');
      setSubject('');
      setContent('');
      setShowTemplateSelector(false);
      onClose();
    } catch (error) {
      console.error('Failed to send template:', error);
      alert('Failed to send template message');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (channel === 'discussion') {
      // Handle discussion creation
      if (!discussionTitle.trim() || !content.trim()) {
        return;
      }

      setIsLoading(true);
      
      try {
        const discussionData = {
          title: discussionTitle.trim(),
          content: content.trim(),
          participants: discussionParticipants.trim() ? discussionParticipants.split(',').map(p => p.trim()) : []
        };

        if (onCreateDiscussion) {
          await onCreateDiscussion(discussionData);
        }
        
        // Reset form
        setDiscussionTitle('');
        setDiscussionParticipants('');
        setContent('');
        onClose();
      } catch (error) {
        console.error('Failed to create discussion:', error);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // For WhatsApp templates, we don't need content
    const isUsingTemplate = channel === 'whatsapp' && showTemplateSelector;
    const hasContent = content.trim() || isUsingTemplate;
    
    if (!hasContent || (mode === 'new' && !to.trim())) {
      return;
    }

    setIsLoading(true);
    
    try {
      const messageData = {
        channel,
        to: to.trim(),
        subject: subject.trim(),
        content: content.trim(),
        replyToId: mode === 'reply' ? replyToId : undefined
      };

      await onSend(messageData);
      
      // Reset form
      setTo('');
      setSubject('');
      setContent('');
      setShowTemplateSelector(false);
      onClose();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        pointerEvents: 'none'
      }}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          pointerEvents: 'auto'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827'
          }}>
            {mode === 'new' ? 'Compose Message' : 'Reply'}
          </h2>
          
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Channel Selection */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                Channel
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  style={{
                    padding: '8px 16px',
                    background: channel === 'email' ? '#de1785' : '#f3f4f6',
                    color: channel === 'email' ? '#fff' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  ✉️ Email
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('whatsapp')}
                  style={{
                    padding: '8px 16px',
                    background: channel === 'whatsapp' ? '#de1785' : '#f3f4f6',
                    color: channel === 'whatsapp' ? '#fff' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  💬 WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('discussion')}
                  style={{
                    padding: '8px 16px',
                    background: channel === 'discussion' ? '#de1785' : '#f3f4f6',
                    color: channel === 'discussion' ? '#fff' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  🗣️ Discussion
                </button>
              </div>
            </div>

            {/* Discussion Title (only for discussion) */}
            {channel === 'discussion' && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Discussion Title
                </label>
                <input
                  type="text"
                  value={discussionTitle}
                  onChange={(e) => setDiscussionTitle(e.target.value)}
                  placeholder="Enter discussion title"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* Discussion Participants (only for discussion) */}
            {channel === 'discussion' && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Participants (optional)
                </label>
                <input
                  type="text"
                  value={discussionParticipants}
                  onChange={(e) => setDiscussionParticipants(e.target.value)}
                  placeholder="Enter participant emails, separated by commas"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <div style={{
                  marginTop: '4px',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  Example: user1@example.com, user2@example.com
                </div>
              </div>
            )}

            {/* To Field (only for new messages and not discussions) */}
            {mode === 'new' && channel !== 'discussion' && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  To {channel === 'email' ? '(Email)' : '(Phone Number)'}
                </label>
                <input
                  type={channel === 'email' ? 'email' : 'tel'}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder={channel === 'email' ? 'Enter email address' : 'Enter phone number'}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* Subject Field (only for email) */}
            {channel === 'email' && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* WhatsApp Template Selector */}
            {channel === 'whatsapp' && (
              <>
                <WhatsAppTemplateSelector
                  onTemplateSelect={handleTemplateSelect}
                  isVisible={showTemplateSelector}
                />
                
                <div style={{ marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                    style={{
                      background: showTemplateSelector ? '#f0f0f0' : '#fff',
                      color: showTemplateSelector ? '#DE1785' : '#666',
                      border: '1px solid #e0e0e0',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    📱 {showTemplateSelector ? 'Hide Templates' : 'Use Template'}
                  </button>
                  
                  {showTemplateSelector && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#6c757d'
                    }}>
                      💡 Select a template below to send a formatted WhatsApp message, or close templates to type a custom message.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Message Content */}
            {(!showTemplateSelector || channel !== 'whatsapp') && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  {channel === 'discussion' ? 'Initial Message' : 'Message'}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={channel === 'discussion' ? 'Start the discussion with an initial message...' : 'Type your message here...'}
                  required
                  style={{
                    flex: 1,
                    minHeight: '120px',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '20px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={
                isLoading || 
                (channel === 'discussion' && (!discussionTitle.trim() || !content.trim())) ||
                (channel !== 'discussion' && (!(content.trim() || (channel === 'whatsapp' && showTemplateSelector)))) || 
                (mode === 'new' && channel !== 'discussion' && !to.trim())
              }
              style={{
                padding: '8px 16px',
                background: isLoading ? '#9ca3af' : '#de1785',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #fff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  {channel === 'discussion' ? 'Creating...' : 'Sending...'}
                </>
              ) : (
                <>
                  {channel === 'discussion' ? '🗣️ Create Discussion' : '📤 Send'}
                </>
              )}
            </button>
          </div>
        </form>

        {/* CSS for loading spinner */}
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default ComposeModal; 