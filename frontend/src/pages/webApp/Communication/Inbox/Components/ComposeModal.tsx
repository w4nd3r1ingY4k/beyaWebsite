import React, { useState, useRef, useEffect } from 'react';
import { Mail, MessageCircle, Users, Send, X } from 'lucide-react';
import WhatsAppTemplateSelector from './WhatsAppTemplateSelector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSend: (messageData: any) => void;
  mode: 'new' | 'reply';
  replyToId?: string;
  initialChannel?: 'email' | 'whatsapp' | 'whatsapp-personal' | 'discussion';
  onCreateDiscussion?: (discussionData: any) => void;
  replyContext?: {
    subject?: string;
    to?: string[];
    cc?: string[];
    from?: string;
  };
}

const ComposeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSend,
  mode,
  replyToId,
  initialChannel = 'email',
  onCreateDiscussion,
  replyContext
}) => {
  // State
  const [channel, setChannel] = useState(initialChannel);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
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

  // Reset form when modal opens/closes and handle reply context
  useEffect(() => {
    if (!isOpen) {
      setTo('');
      setCc('');
      setBcc('');
      setShowCcBcc(false);
      setSubject('');
      setContent('');
      setShowTemplateSelector(false);
      setDiscussionTitle('');
      setDiscussionParticipants('');
    } else if (isOpen && mode === 'reply' && replyContext) {
      // Auto-fill reply fields
      if (replyContext.subject) {
        const replySubject = replyContext.subject.startsWith('Re:') 
          ? replyContext.subject 
          : `Re: ${replyContext.subject}`;
        setSubject(replySubject);
      }
      
      if (replyContext.from) {
        setTo(replyContext.from);
      }
      
      if (replyContext.cc && replyContext.cc.length > 0) {
        setCc(replyContext.cc.join(', '));
        setShowCcBcc(true); // Show CC/BCC fields when there are CC recipients
      }
    }
  }, [isOpen, mode, replyContext]);

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
        text: content.trim(),
        html: content.trim(),
        replyToId: mode === 'reply' ? replyToId : undefined,
        ...(channel === 'email' && { 
          ...(cc.trim() && { cc: cc.split(',').map(email => email.trim()).filter(Boolean) }),
          ...(bcc.trim() && { bcc: bcc.split(',').map(email => email.trim()).filter(Boolean) })
        })
      };

      await onSend(messageData);
      
      // Reset form
      setTo('');
      setCc('');
      setBcc('');
      setShowCcBcc(false);
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
          height: '750px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          pointerEvents: 'auto'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 24px 20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFBFA'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#1e293b',
            letterSpacing: '-0.025em'
          }}>
            {mode === 'new' ? 'Compose Message' : 'Reply'}
          </h2>
          
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#334155';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            padding: '24px 24px 20px 24px', 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px'
          }}>
            
            {/* Channel Selection */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px',
                letterSpacing: '-0.025em'
              }}>
                Channel
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: channel === 'email' ? '#fce7f3' : '#ffffff',
                    color: channel === 'email' ? '#de1785' : '#475569',
                    border: channel === 'email' ? '1px solid #de1785' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    boxShadow: channel === 'email' ? '0 1px 2px rgba(222, 23, 133, 0.1)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                    minWidth: 0
                  }}
                >
                  <img 
                    src="/assets/icons/gmail-logo.png" 
                    alt="Gmail" 
                    style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                  />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('whatsapp')}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: channel === 'whatsapp' ? '#fce7f3' : '#ffffff',
                    color: channel === 'whatsapp' ? '#de1785' : '#475569',
                    border: channel === 'whatsapp' ? '1px solid #de1785' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    boxShadow: channel === 'whatsapp' ? '0 1px 2px rgba(222, 23, 133, 0.1)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                    minWidth: 0
                  }}
                >
                  <img 
                    src="/assets/icons/whatsapp-logo.png" 
                    alt="WhatsApp" 
                    style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                  />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('whatsapp-personal')}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    background: channel === 'whatsapp-personal' ? '#fce7f3' : '#ffffff',
                    color: channel === 'whatsapp-personal' ? '#de1785' : '#475569',
                    border: channel === 'whatsapp-personal' ? '1px solid #de1785' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease',
                    boxShadow: channel === 'whatsapp-personal' ? '0 1px 2px rgba(222, 23, 133, 0.1)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                    minWidth: 0
                  }}
                >
                  <img 
                    src="/assets/icons/whatsapp-logo.png" 
                    alt="Personal WhatsApp" 
                    style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                  />
                  Personal WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('discussion')}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: channel === 'discussion' ? '#fce7f3' : '#ffffff',
                    color: channel === 'discussion' ? '#de1785' : '#475569',
                    border: channel === 'discussion' ? '1px solid #de1785' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    boxShadow: channel === 'discussion' ? '0 1px 2px rgba(222, 23, 133, 0.1)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                    minWidth: 0
                  }}
                >
                  <Users size={16} />
                  Discussion
                </button>
              </div>
            </div>

            {/* Discussion Title (only for discussion) */}
            {channel === 'discussion' && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                  letterSpacing: '-0.025em'
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
                    padding: '12px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    transition: 'border-color 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#de1785';
                    e.target.style.boxShadow = '0 0 0 3px rgba(222, 23, 133, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
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
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                  letterSpacing: '-0.025em'
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
                    padding: '12px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    transition: 'border-color 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#de1785';
                    e.target.style.boxShadow = '0 0 0 3px rgba(222, 23, 133, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                  }}
                />
                <div style={{
                  marginTop: '6px',
                  fontSize: '12px',
                  color: '#64748b'
                }}>
                  Example: user1@example.com, user2@example.com
                </div>
              </div>
            )}

            {/* To Field (only for new messages and not discussions) */}
            {mode === 'new' && channel !== 'discussion' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    letterSpacing: '-0.025em'
                  }}>
                    To {channel === 'email' ? '(Email)' : '(Phone Number)'}
                  </label>
                  {channel === 'email' && (
                    <button
                      type="button"
                      onClick={() => setShowCcBcc(!showCcBcc)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#de1785',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      {showCcBcc ? 'Hide CC/BCC' : 'Add CC/BCC'}
                    </button>
                  )}
                </div>
                <input
                  type={channel === 'email' ? 'email' : 'tel'}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder={channel === 'email' ? 'Enter email address' : 'Enter phone number'}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    transition: 'border-color 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#de1785';
                    e.target.style.boxShadow = '0 0 0 3px rgba(222, 23, 133, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                  }}
                />
              </div>
            )}

            {/* CC/BCC Fields (only for email when shown) */}
            {channel === 'email' && showCcBcc && (
              <>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    letterSpacing: '-0.025em'
                  }}>
                    CC (Carbon Copy)
                  </label>
                  <input
                    type="email"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="Enter CC email addresses (comma-separated)"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      transition: 'border-color 0.2s ease',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#de1785';
                      e.target.style.boxShadow = '0 0 0 3px rgba(222, 23, 133, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    }}
                  />
                  <div style={{
                    marginTop: '4px',
                    fontSize: '12px',
                    color: '#64748b'
                  }}>
                    CC recipients will see each other's email addresses
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    letterSpacing: '-0.025em'
                  }}>
                    BCC (Blind Carbon Copy)
                  </label>
                  <input
                    type="email"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="Enter BCC email addresses (comma-separated)"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      transition: 'border-color 0.2s ease',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#de1785';
                      e.target.style.boxShadow = '0 0 0 3px rgba(222, 23, 133, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    }}
                  />
                  <div style={{
                    marginTop: '4px',
                    fontSize: '12px',
                    color: '#64748b'
                  }}>
                    BCC recipients won't see each other's email addresses
                  </div>
                </div>
              </>
            )}

            {/* Subject Field (only for email) */}
            {channel === 'email' && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                  letterSpacing: '-0.025em'
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
                    padding: '12px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    transition: 'border-color 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#de1785';
                    e.target.style.boxShadow = '0 0 0 3px rgba(222, 23, 133, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
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
                
                <div style={{ marginBottom: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                    style={{
                      background: showTemplateSelector ? '#f8fafc' : '#ffffff',
                      color: showTemplateSelector ? '#de1785' : '#475569',
                      border: '1px solid #e2e8f0',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <MessageCircle size={16} />
                    {showTemplateSelector ? 'Hide Templates' : 'Use Template'}
                  </button>
                  
                  {showTemplateSelector && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px 16px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#64748b',
                      lineHeight: '1.5'
                    }}>
                      Select a template below to send a formatted WhatsApp message, or close templates to type a custom message.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Personal WhatsApp Note */}
            {channel === 'whatsapp-personal' && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: '#f0f9ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#1e40af',
                lineHeight: '1.5'
              }}>
                <strong>Personal WhatsApp:</strong> This will send via your connected WhatsApp Web session. Templates are not available for personal accounts.
              </div>
            )}

            {/* Message Content */}
            {(!showTemplateSelector || (channel !== 'whatsapp' && channel !== 'whatsapp-personal')) && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '120px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                  letterSpacing: '-0.025em'
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
                    maxHeight: '200px',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    backgroundColor: '#ffffff',
                    transition: 'border-color 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    lineHeight: '1.5'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#de1785';
                    e.target.style.boxShadow = '0 0 0 3px rgba(222, 23, 133, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '20px 24px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            backgroundColor: '#FFFBFA',
            flexShrink: 0
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }
              }}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={
                isLoading || 
                (channel === 'discussion' && (!discussionTitle.trim() || !content.trim())) ||
                (channel !== 'discussion' && !content.trim() && !(channel === 'whatsapp' && showTemplateSelector)) || 
                (mode === 'new' && channel !== 'discussion' && !to.trim())
              }
              style={{
                padding: '10px 20px',
                background: isLoading ? '#9ca3af' : '#de1785',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: isLoading ? 'none' : '0 1px 2px rgba(222, 23, 133, 0.1)'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#c1166a';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#de1785';
                }
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
                  {channel === 'discussion' ? (
                    <>
                      <Users size={16} />
                      Create Discussion
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send
                    </>
                  )}
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