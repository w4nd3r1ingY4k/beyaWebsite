import React, { useState } from 'react';
import { X, Calendar, User, Tag } from 'lucide-react';
import { Ticket } from '../TicketsHome';

interface TicketFormProps {
  ticket?: Ticket;
  onSave: (ticketData: Omit<Ticket, 'id' | 'created_at' | 'updated_at' | 'reporter'>) => void;
  onClose: () => void;
}

const styles = {
  modal: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '16px',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
  },
  modalHeader: {
    padding: '24px',
    borderBottom: '1px solid #F3F4F6',
  },
  modalHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  closeButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  modalBody: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  required: {
    color: '#EF4444',
    marginLeft: '2px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    resize: 'vertical' as const,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box' as const,
    minHeight: '100px',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  modalFooter: {
    padding: '24px',
    borderTop: '1px solid #F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelButton: {
    padding: '10px 20px',
    color: '#4B5563',
    backgroundColor: 'white',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#EC4899',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  tagInput: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  tagButton: {
    padding: '4px 8px',
    backgroundColor: '#FDF2F8',
    color: '#EC4899',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    backgroundColor: '#F3F4F6',
    borderRadius: '12px',
    fontSize: '13px',
    color: '#374151',
  },
  tagRemove: {
    cursor: 'pointer',
    color: '#9CA3AF',
    marginLeft: '4px',
    fontSize: '16px',
    lineHeight: '1',
  },
};

const TicketForm: React.FC<TicketFormProps> = ({ ticket, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: ticket?.title || '',
    description: ticket?.description || '',
    status: ticket?.status || 'open' as Ticket['status'],
    priority: ticket?.priority || 'medium' as Ticket['priority'],
    assignee: ticket?.assignee || '',
    due_date: ticket?.due_date || '',
    tags: ticket?.tags || [] as string[],
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div style={styles.modalHeader}>
            <div style={styles.modalHeaderRow}>
              <h2 style={styles.modalTitle}>
                {ticket ? 'Edit Ticket' : 'Create New Ticket'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                style={styles.closeButton}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={20} color="#6B7280" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={styles.modalBody}>
            {/* Title */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Title<span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{
                  ...styles.input,
                  borderColor: errors.title ? '#EF4444' : '#D1D5DB',
                }}
                placeholder="Enter ticket title"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#EC4899';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(236, 72, 153, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.title ? '#EF4444' : '#D1D5DB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {errors.title && (
                <span style={{ fontSize: '12px', color: '#EF4444' }}>{errors.title}</span>
              )}
            </div>

            {/* Description */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Description<span style={styles.required}>*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{
                  ...styles.textarea,
                  borderColor: errors.description ? '#EF4444' : '#D1D5DB',
                }}
                placeholder="Describe the issue or request"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#EC4899';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(236, 72, 153, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.description ? '#EF4444' : '#D1D5DB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {errors.description && (
                <span style={{ fontSize: '12px', color: '#EF4444' }}>{errors.description}</span>
              )}
            </div>

            {/* Status & Priority */}
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Ticket['status'] })}
                  style={styles.select}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#EC4899';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(236, 72, 153, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#D1D5DB';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Ticket['priority'] })}
                  style={styles.select}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#EC4899';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(236, 72, 153, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#D1D5DB';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Assignee & Due Date */}
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Assignee
                </label>
                <input
                  type="text"
                  value={formData.assignee}
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  style={styles.input}
                  placeholder="Enter assignee name"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#EC4899';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(236, 72, 153, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#D1D5DB';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  style={styles.input}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#EC4899';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(236, 72, 153, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#D1D5DB';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Tags */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Tag size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Tags
              </label>
              <div style={styles.tagInput}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  style={{ ...styles.input, flex: 1 }}
                  placeholder="Add tags"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#EC4899';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(236, 72, 153, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#D1D5DB';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  style={styles.tagButton}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FCE7F3'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FDF2F8'}
                >
                  Add
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div style={styles.tagList}>
                  {formData.tags.map((tag, index) => (
                    <span key={index} style={styles.tag}>
                      {tag}
                      <span
                        style={styles.tagRemove}
                        onClick={() => handleRemoveTag(tag)}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.borderColor = '#9CA3AF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#D1D5DB';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.saveButton}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DB2777'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EC4899'}
            >
              {ticket ? 'Update Ticket' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketForm; 