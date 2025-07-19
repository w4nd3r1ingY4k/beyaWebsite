import React, { useState, useEffect } from 'react';
import { useAuth } from '@/webapp/AuthContext';
import tasksService, { Task } from '@/services/tasksService';
import styles from './TasksHome.module.css';

const TasksHome: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateTask, setShowCreateTask] = useState(false);

  // Form states
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    priority: 'medium' as const,
    type: 'bug' as const,
    status: 'open' as const
  });

  useEffect(() => {
    if (user?.userId) {
      loadInitialData();
    }
  }, [user?.userId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Create demo tasks for the Kanban board
      const demoTasks: Task[] = [
        {
          taskId: 'task-1',
          title: 'Website login issue',
          description: 'Customer cannot log into their account',
          status: 'open',
          priority: 'high',
          type: 'bug',
          reporterId: user?.userId || '',
          assigneeId: null,
          spaceId: 'demo-space',
          boardId: 'demo-board',
          tags: ['website', 'login'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dueDate: null,
          estimatedHours: null,
          actualHours: null,
          parentTaskId: null,
          subtasks: [],
          followers: [],
          attachments: [],
          comments: []
        },
        {
          taskId: 'task-2',
          title: 'Feature request: Dark mode',
          description: 'Add dark mode option to the mobile app',
          status: 'in-progress',
          priority: 'medium',
          type: 'feature',
          reporterId: user?.userId || '',
          assigneeId: 'akbar.shamjijr@gmail.com',
          spaceId: 'demo-space',
          boardId: 'demo-board',
          tags: ['mobile', 'ui'],
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          dueDate: null,
          estimatedHours: null,
          actualHours: null,
          parentTaskId: null,
          subtasks: [],
          followers: [],
          attachments: [],
          comments: []
        }
      ];

      setTasks(demoTasks);
    } catch (error) {
      console.error('Error loading tasks data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    try {
      const task: Task = {
        taskId: `task-${Date.now()}`,
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        type: newTask.type,
        reporterId: user?.userId || '',
        assigneeId: null,
        spaceId: 'demo-space',
        boardId: 'demo-board',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dueDate: null,
        estimatedHours: null,
        actualHours: null,
        parentTaskId: null,
        subtasks: [],
        followers: [],
        attachments: [],
        comments: []
      };

      setTasks([...tasks, task]);
      setNewTask({ title: '', description: '', priority: 'medium', type: 'bug', status: 'open' });
      setShowCreateTask(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'urgent': return styles.priorityUrgent;
      case 'high': return styles.priorityHigh;
      case 'medium': return styles.priorityMedium;
      case 'low': return styles.priorityLow;
      default: return styles.priorityMedium;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return '🐛';
      case 'feature': return '✨';
      case 'task': return '📋';
      default: return '📋';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bug': return 'Bug';
      case 'feature': return 'Feature';
      case 'task': return 'Task';
      default: return 'Task';
    }
  };

  const getDaysAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? '0 days ago' : `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status);
  };

  if (loading) {
    return (
      <div className={styles.tasksContainer}>
        <div className={styles.content}>
          <div>Loading tasks...</div>
        </div>
      </div>
    );
  }

  const columns = [
    { id: 'open', title: 'Open', tasks: getTasksByStatus('open') },
    { id: 'in-progress', title: 'In Progress', tasks: getTasksByStatus('in-progress') },
    { id: 'waiting', title: 'Waiting', tasks: getTasksByStatus('waiting') },
    { id: 'resolved', title: 'Resolved', tasks: getTasksByStatus('resolved') }
  ];

  return (
    <div className={styles.tasksContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Support Queue</h1>
        <p className={styles.subtitle}>Main support ticket queue</p>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Search and Actions Bar */}
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <button className={styles.filtersButton}>
            <span>Filters</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
            </svg>
          </button>
          <button 
            className={styles.newTaskButton}
            onClick={() => setShowCreateTask(true)}
          >
            + New Task
          </button>
        </div>

        {/* Kanban Board */}
        <div className={styles.kanbanBoard}>
          {columns.map(column => (
            <div key={column.id} className={styles.column}>
              <div className={styles.columnHeader}>
                <h3 className={styles.columnTitle}>{column.title}</h3>
                <span className={styles.columnCount}>{column.tasks.length}</span>
              </div>
              
              {column.tasks.map(task => (
                <div key={task.taskId} className={styles.taskCard}>
                  <div className={styles.taskHeader}>
                    <h4 className={styles.taskTitle}>{task.title}</h4>
                    <span className={`${styles.taskPriority} ${getPriorityClass(task.priority)}`}>
                      {task.priority.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className={styles.taskType}>
                    <span className={styles.taskTypeIcon}>{getTypeIcon(task.type)}</span>
                    <span className={styles.taskTypeLabel}>{getTypeLabel(task.type)}</span>
                  </div>
                  
                  <p className={styles.taskDescription}>{task.description}</p>
                  
                  <div className={styles.taskTags}>
                    {task.tags.map(tag => (
                      <span key={tag} className={styles.taskTag}>{tag}</span>
                    ))}
                  </div>
                  
                  <div className={styles.taskMeta}>
                    <div className={styles.taskAssignee}>
                      {task.assigneeId ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                          <span>{task.assigneeId}</span>
                        </>
                      ) : (
                        <span>Unassigned</span>
                      )}
                    </div>
                    <span className={styles.taskTime}>{getDaysAgo(task.createdAt)}</span>
                  </div>
                </div>
              ))}
              
              {column.tasks.length === 0 && (
                <div className={styles.emptyColumn}>
                  No tasks in this column
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Create New Task</h3>
            <input
              type="text"
              placeholder="Task title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E0E0E0',
                borderRadius: '6px',
                marginBottom: '12px'
              }}
            />
            <textarea
              placeholder="Description"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E0E0E0',
                borderRadius: '6px',
                marginBottom: '12px',
                minHeight: '80px',
                resize: 'vertical'
              }}
            />
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E0E0E0',
                borderRadius: '6px',
                marginBottom: '12px'
              }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select
              value={newTask.type}
              onChange={(e) => setNewTask({ ...newTask, type: e.target.value as any })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E0E0E0',
                borderRadius: '6px',
                marginBottom: '16px'
              }}
            >
              <option value="bug">Bug</option>
              <option value="feature">Feature</option>
              <option value="task">Task</option>
            </select>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateTask(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTask.title}
                style={{
                  padding: '8px 16px',
                  backgroundColor: newTask.title ? '#3b82f6' : '#E0E0E0',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: newTask.title ? 'pointer' : 'not-allowed'
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksHome; 