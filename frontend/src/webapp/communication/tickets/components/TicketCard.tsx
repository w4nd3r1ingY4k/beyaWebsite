import React from 'react';
import { User, Tag, Clock, Trash2 } from 'lucide-react';
import styles from '@/styles/TaskCard.module.css';
import { Task, TaskPriority, TaskType } from '@/types/taskManagement';

interface TicketCardProps {
  task: Task;
  onClick: () => void;
  onDelete?: () => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ task, onClick, onDelete }) => {
  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div className={styles.card} onClick={onClick}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.taskId}>{task.id}</div>
        <div className={styles.headerActions}>
          <div className={styles.priorityBadge} style={{ backgroundColor: getPriorityColor(task.priority) }}>
            {task.priority}
          </div>
          {onDelete && (
            <button
              className={styles.deleteButton}
              onClick={handleDelete}
              title="Delete task"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className={styles.title}>{task.title}</h4>

      {/* Type */}
      <div className={styles.type}>
        <span className={styles.typeIcon}>{getTypeIcon(task.type)}</span>
        <span className={styles.typeText}>{task.type}</span>
      </div>

      {/* Description Preview */}
      {task.description && (
        <p className={styles.description}>
          {task.description.length > 100
            ? `${task.description.substring(0, 100)}...`
            : task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className={styles.tags}>
          {task.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className={styles.tag}>
              <Tag size={10} />
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className={styles.moreTags}>+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.assignee}>
          {task.assignee ? (
            <>
              <User size={12} />
              <span>{task.assignee}</span>
            </>
          ) : (
            <span className={styles.unassigned}>Unassigned</span>
          )}
        </div>
        <div className={styles.date}>
          <Clock size={12} />
          <span>{formatDate(task.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default TicketCard; 