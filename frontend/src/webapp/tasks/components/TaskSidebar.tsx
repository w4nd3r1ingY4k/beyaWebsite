import React, { useState } from 'react';
import { X, Edit, Save, Clock, User, Tag, MessageSquare, Paperclip } from 'lucide-react';
import styles from '@/styles/TaskSidebar.module.css';
import { Task, TaskStatus, TaskPriority, TaskType } from '@/types/taskManagement';

interface TaskSidebarProps {
  task: Task;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onClose: () => void;
}

const TaskSidebar: React.FC<TaskSidebarProps> = ({
  task,
  onUpdateTask,
  onClose,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task>(task);

  const handleSave = () => {
    onUpdateTask(task.id, editedTask);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTask(task);
    setIsEditing(false);
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'open': return '#ef4444';
      case 'in_progress': return '#f97316';
      case 'under_review': return '#3b82f6';
      case 'waiting_for_customer': return '#8b5cf6';
      case 'waiting_for_third_party': return '#06b6d4';
      case 'resolved': return '#22c55e';
      case 'closed': return '#6b7280';
      case 'cancelled': return '#9ca3af';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'bug': return '🐛';
      case 'feature': return '✨';
      case 'task': return '📋';
      case 'incident': return '🚨';
      case 'request': return '📝';
      case 'question': return '❓';
      case 'improvement': return '🚀';
      default: return '📋';
    }
  };

  return (
    <div className={styles.sidebar}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.taskId}>{task.id}</div>
          <div className={styles.headerActions}>
            {isEditing ? (
              <>
                <button
                  className={styles.actionButton}
                  onClick={handleSave}
                  title="Save"
                >
                  <Save size={16} />
                </button>
                <button
                  className={styles.actionButton}
                  onClick={handleCancel}
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <button
                className={styles.actionButton}
                onClick={() => setIsEditing(true)}
                title="Edit"
              >
                <Edit size={16} />
              </button>
            )}
            <button
              className={styles.actionButton}
              onClick={onClose}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Title */}
        <div className={styles.section}>
          <label className={styles.label}>Title</label>
          {isEditing ? (
            <input
              type="text"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              className={styles.input}
            />
          ) : (
            <h3 className={styles.title}>{task.title}</h3>
          )}
        </div>

        {/* Description */}
        <div className={styles.section}>
          <label className={styles.label}>Description</label>
          {isEditing ? (
            <textarea
              value={editedTask.description}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              className={styles.textarea}
              rows={4}
            />
          ) : (
            <p className={styles.description}>{task.description}</p>
          )}
        </div>

        {/* Status and Priority */}
        <div className={styles.row}>
          <div className={styles.section}>
            <label className={styles.label}>Status</label>
            {isEditing ? (
              <select
                value={editedTask.status}
                onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value as TaskStatus })}
                className={styles.select}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="under_review">Under Review</option>
                <option value="waiting_for_customer">Waiting for Customer</option>
                <option value="waiting_for_third_party">Waiting for Third Party</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            ) : (
              <div className={styles.badge} style={{ backgroundColor: getStatusColor(task.status) }}>
                {task.status.replace('_', ' ')}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Priority</label>
            {isEditing ? (
              <select
                value={editedTask.priority}
                onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as TaskPriority })}
                className={styles.select}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            ) : (
              <div className={styles.badge} style={{ backgroundColor: getPriorityColor(task.priority) }}>
                {task.priority}
              </div>
            )}
          </div>
        </div>

        {/* Type and Assignee */}
        <div className={styles.row}>
          <div className={styles.section}>
            <label className={styles.label}>Type</label>
            {isEditing ? (
              <select
                value={editedTask.type}
                onChange={(e) => setEditedTask({ ...editedTask, type: e.target.value as TaskType })}
                className={styles.select}
              >
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="task">Task</option>
                <option value="incident">Incident</option>
                <option value="request">Request</option>
                <option value="question">Question</option>
                <option value="improvement">Improvement</option>
              </select>
            ) : (
              <div className={styles.typeBadge}>
                <span className={styles.typeIcon}>{getTypeIcon(task.type)}</span>
                {task.type}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Assignee</label>
            {isEditing ? (
              <input
                type="text"
                value={editedTask.assignee || ''}
                onChange={(e) => setEditedTask({ ...editedTask, assignee: e.target.value })}
                className={styles.input}
                placeholder="Unassigned"
              />
            ) : (
              <div className={styles.assignee}>
                <User size={16} />
                <span>{task.assignee || 'Unassigned'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tags and Labels */}
        <div className={styles.section}>
          <label className={styles.label}>Tags</label>
          <div className={styles.tags}>
            {task.tags.map((tag, index) => (
              <span key={index} className={styles.tag}>
                <Tag size={12} />
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Labels</label>
          <div className={styles.labels}>
            {task.labels.map((label, index) => (
              <span key={index} className={styles.label}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className={styles.section}>
          <label className={styles.label}>Created</label>
          <div className={styles.date}>
            <Clock size={16} />
            {new Date(task.createdAt).toLocaleDateString()}
          </div>
        </div>

        {task.dueDate && (
          <div className={styles.section}>
            <label className={styles.label}>Due Date</label>
            <div className={styles.date}>
              <Clock size={16} />
              {new Date(task.dueDate).toLocaleDateString()}
            </div>
          </div>
        )}

        {/* Attachments */}
        {task.attachments.length > 0 && (
          <div className={styles.section}>
            <label className={styles.label}>Attachments</label>
            <div className={styles.attachments}>
              {task.attachments.map((attachment) => (
                <div key={attachment.id} className={styles.attachment}>
                  <Paperclip size={16} />
                  <span>{attachment.originalName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className={styles.section}>
          <label className={styles.label}>Comments</label>
          <button className={styles.commentButton}>
            <MessageSquare size={16} />
            Add Comment
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskSidebar; 