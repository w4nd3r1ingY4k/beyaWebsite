import React, { useState, useEffect } from 'react';
import { useAuth } from '@/webapp/AuthContext';
import tasksService, { Task } from '@/services/tasksService';
import { Search, Plus, Filter, CheckSquare, Bug, Sparkles, FileText, User, Clock } from 'lucide-react';

const TasksHome: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      case 'low': return '#10B981';
      default: return '#3B82F6';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return <Bug size={14} />;
      case 'feature': return <Sparkles size={14} />;
      case 'task': return <FileText size={14} />;
      default: return <FileText size={14} />;
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
    return diffDays === 0 ? 'today' : `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status);
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over state if we're leaving the column entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedTask || draggedTask.status === columnId) {
      setDraggedTask(null);
      return;
    }

    // Update the task status
    const updatedTasks = tasks.map(task => 
      task.taskId === draggedTask.taskId 
        ? { ...task, status: columnId as any, updatedAt: new Date().toISOString() }
        : task
    );
    
    setTasks(updatedTasks);
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        width: '100%',
        backgroundColor: '#FFFBFA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: '120px',
        paddingTop: '60px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #D9D9D9',
          borderTop: '3px solid #DE1785',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#FFFBFA',
      paddingLeft: '120px',
      paddingRight: '40px',
      paddingTop: '100px',
      paddingBottom: '40px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          marginBottom: '24px'
        }}>
          {/* Search */}
          <div style={{
            position: 'relative',
            maxWidth: '400px',
            flex: '1'
          }}>
            <Search 
              size={20} 
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#D9D9D9'
              }}
            />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 16px 16px 48px',
                border: '1px solid #D9D9D9',
                borderRadius: '12px',
                fontSize: '16px',
                backgroundColor: '#FFFBFA',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              style={{
                background: 'transparent',
                color: '#D9D9D9',
                border: '1px solid #D9D9D9',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#DE1785';
                e.currentTarget.style.color = '#DE1785';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#D9D9D9';
                e.currentTarget.style.color = '#D9D9D9';
              }}
            >
              <Filter size={16} />
              Filters
            </button>

            <button
              onClick={() => setShowCreateTask(true)}
              style={{
                background: '#DE1785',
                color: '#FFFBFA',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(222, 23, 133, 0.2)',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#c21668';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#DE1785';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Plus size={16} />
              New Task
            </button>
          </div>
        </div>

        
      </div>

      {/* Kanban Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        flex: 1
      }}>
                 {columns.map(column => (
           <div 
             key={column.id} 
             style={{
               backgroundColor: dragOverColumn === column.id ? '#F0F9FF' : '#FBF7F7',
               border: dragOverColumn === column.id ? '2px solid #DE1785' : '1px solid #D9D9D9',
               borderRadius: '16px',
               padding: '24px',
               display: 'flex',
               flexDirection: 'column',
               minHeight: '500px',
               transition: 'all 0.2s ease'
             }}
             onDragOver={(e) => handleDragOver(e, column.id)}
             onDragLeave={handleDragLeave}
             onDrop={(e) => handleDrop(e, column.id)}
           >
                         <div style={{
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               margin: '-24px -24px 24px -24px',
               padding: '24px 24px 16px 24px',
               backgroundColor: '#FFFBFA',
               borderBottom: '1px solid #D9D9D9',
               borderRadius: '16px 16px 0 0'
             }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '500',
                color: '#000505',
                margin: 0
              }}>
                {column.title}
              </h3>
              <span style={{
                backgroundColor: '#FFB8DF',
                color: '#DE1785',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {column.tasks.length}
              </span>
            </div>
            
            <div style={{ flex: 1 }}>
                             {column.tasks.map(task => (
                 <div 
                   key={task.taskId} 
                   draggable
                   onDragStart={(e) => handleDragStart(e, task)}
                   onDragEnd={handleDragEnd}
                   style={{
                     backgroundColor: '#FFFBFA',
                     border: '1px solid #D9D9D9',
                     borderRadius: '12px',
                     padding: '20px',
                     marginBottom: '16px',
                     cursor: draggedTask?.taskId === task.taskId ? 'grabbing' : 'grab',
                     transition: 'all 0.2s ease',
                     boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                     opacity: draggedTask?.taskId === task.taskId ? 0.5 : 1,
                     transform: draggedTask?.taskId === task.taskId ? 'rotate(5deg)' : 'none'
                   }}
                   onMouseEnter={(e) => {
                     if (draggedTask?.taskId !== task.taskId) {
                       e.currentTarget.style.transform = 'translateY(-2px)';
                       e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                       e.currentTarget.style.borderColor = '#DE1785';
                     }
                   }}
                   onMouseLeave={(e) => {
                     if (draggedTask?.taskId !== task.taskId) {
                       e.currentTarget.style.transform = 'translateY(0)';
                       e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                       e.currentTarget.style.borderColor = '#D9D9D9';
                     }
                   }}
                 >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#000505',
                      margin: 0,
                      flex: 1,
                      lineHeight: '1.4'
                    }}>
                      {task.title}
                    </h4>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      backgroundColor: `${getPriorityColor(task.priority)}20`,
                      color: getPriorityColor(task.priority),
                      marginLeft: '12px',
                      whiteSpace: 'nowrap'
                    }}>
                      {task.priority}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ color: '#DE1785' }}>
                      {getTypeIcon(task.type)}
                    </div>
                    <span style={{
                      fontSize: '12px',
                      color: '#D9D9D9',
                      fontWeight: '500'
                    }}>
                      {getTypeLabel(task.type)}
                    </span>
                  </div>
                  
                  <p style={{
                    fontSize: '14px',
                    color: '#D9D9D9',
                    margin: '0 0 16px 0',
                    lineHeight: '1.5'
                  }}>
                    {task.description}
                  </p>
                  
                  {task.tags.length > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      marginBottom: '16px'
                    }}>
                      {task.tags.map(tag => (
                        <span 
                          key={tag} 
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#FFB8DF',
                            color: '#DE1785',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#D9D9D9'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <User size={12} />
                      <span>
                        {task.assigneeId ? task.assigneeId.split('@')[0] : 'Unassigned'}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Clock size={12} />
                      <span>{getDaysAgo(task.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {column.tasks.length === 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px',
                  color: '#D9D9D9',
                  fontSize: '14px',
                  border: '2px dashed #D9D9D9',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  No tasks in this column
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 5, 5, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }} onClick={() => setShowCreateTask(false)}>
          <div style={{
            background: '#FFFBFA',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '500px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 5, 5, 0.15)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '32px 32px 24px 32px',
              borderBottom: '1px solid #D9D9D9'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '400',
                color: '#000505',
                margin: 0
              }}>
                Create New Task
              </h2>
            </div>
            
            <div style={{ padding: '24px 32px 32px 32px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000505',
                  marginBottom: '8px'
                }}>
                  Title *
                </label>
                <input
                  type="text"
                  placeholder="Enter task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px solid #D9D9D9',
                    borderRadius: '12px',
                    fontSize: '16px',
                    backgroundColor: '#FFFBFA',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000505',
                  marginBottom: '8px'
                }}>
                  Description
                </label>
                <textarea
                  placeholder="Enter task description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px solid #D9D9D9',
                    borderRadius: '12px',
                    fontSize: '16px',
                    backgroundColor: '#FFFBFA',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box',
                    minHeight: '100px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
                />
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '32px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#000505',
                    marginBottom: '8px'
                  }}>
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '16px',
                      border: '1px solid #D9D9D9',
                      borderRadius: '12px',
                      fontSize: '16px',
                      backgroundColor: '#FFFBFA',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#000505',
                    marginBottom: '8px'
                  }}>
                    Type
                  </label>
                  <select
                    value={newTask.type}
                    onChange={(e) => setNewTask({ ...newTask, type: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '16px',
                      border: '1px solid #D9D9D9',
                      borderRadius: '12px',
                      fontSize: '16px',
                      backgroundColor: '#FFFBFA',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
                  >
                    <option value="bug">Bug</option>
                    <option value="feature">Feature</option>
                    <option value="task">Task</option>
                  </select>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowCreateTask(false)}
                  style={{
                    background: 'transparent',
                    color: '#D9D9D9',
                    border: '1px solid #D9D9D9',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#DE1785';
                    e.currentTarget.style.color = '#DE1785';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#D9D9D9';
                    e.currentTarget.style.color = '#D9D9D9';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={!newTask.title.trim()}
                  style={{
                    background: newTask.title.trim() ? '#DE1785' : '#D9D9D9',
                    color: '#FFFBFA',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: newTask.title.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (newTask.title.trim()) {
                      e.currentTarget.style.background = '#c21668';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (newTask.title.trim()) {
                      e.currentTarget.style.background = '#DE1785';
                    }
                  }}
                >
                  <CheckSquare size={16} />
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksHome; 