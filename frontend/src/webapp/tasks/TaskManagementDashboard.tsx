import React, { useState, useEffect } from 'react';
import { useAuth } from '@/webapp/AuthContext';
import styles from '@/styles/TaskManagementDashboard.module.css';
import SpaceSelector from './components/SpaceSelector';
import BoardView from './components/BoardView';
import TaskSidebar from './components/TaskSidebar';
import { Space, Board, Task } from '@/types/taskManagement';

const TaskManagementDashboard: React.FC = () => {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar'>('kanban');

  // Load initial data
  useEffect(() => {
    loadSpaces();
  }, []);

  // Load boards when space changes
  useEffect(() => {
    if (selectedSpace) {
      loadBoards(selectedSpace.id);
    }
  }, [selectedSpace]);

  // Load tasks when board changes
  useEffect(() => {
    if (selectedBoard) {
      loadTasks(selectedBoard.id);
    }
  }, [selectedBoard]);

  const loadSpaces = async () => {
    // TODO: Replace with actual API call
    const mockSpaces: Space[] = [
      {
        id: 'support',
        name: 'Support',
        description: 'Customer support and help desk',
        color: '#3B82F6',
        icon: 'headphones',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.email || '',
        isActive: true,
        settings: {
          defaultSLA: 'support-sla',
          autoAssignment: true,
          requireApproval: false,
        },
      },
      {
        id: 'it',
        name: 'IT',
        description: 'IT infrastructure and technical issues',
        color: '#10B981',
        icon: 'server',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.email || '',
        isActive: true,
        settings: {
          defaultSLA: 'it-sla',
          autoAssignment: false,
          requireApproval: true,
        },
      },
      {
        id: 'ops',
        name: 'Operations',
        description: 'Business operations and processes',
        color: '#F59E0B',
        icon: 'settings',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.email || '',
        isActive: true,
        settings: {
          defaultSLA: 'ops-sla',
          autoAssignment: true,
          requireApproval: false,
        },
      },
    ];
    setSpaces(mockSpaces);
    if (mockSpaces.length > 0) {
      setSelectedSpace(mockSpaces[0]);
    }
  };

  const loadBoards = async (spaceId: string) => {
    // TODO: Replace with actual API call
    const mockBoards: Board[] = [
      {
        id: 'support-queue',
        spaceId,
        name: 'Support Queue',
        description: 'Main support ticket queue',
        type: 'kanban',
        columns: [
          { id: 'open', name: 'Open', color: '#EF4444', status: 'open', order: 1 },
          { id: 'in-progress', name: 'In Progress', color: '#F59E0B', status: 'in_progress', order: 2 },
          { id: 'waiting', name: 'Waiting', color: '#3B82F6', status: 'waiting_for_customer', order: 3 },
          { id: 'resolved', name: 'Resolved', color: '#10B981', status: 'resolved', order: 4 },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.email || '',
        isActive: true,
        settings: {
          allowSubTasks: true,
          allowLinking: true,
          requireDueDate: false,
          defaultPriority: 'medium',
        },
      },
    ];
    setBoards(mockBoards);
    if (mockBoards.length > 0) {
      setSelectedBoard(mockBoards[0]);
    }
  };

  const loadTasks = async (boardId: string) => {
    // TODO: Replace with actual API call
    const mockTasks: Task[] = [
      {
        id: 'task-1',
        boardId,
        spaceId: selectedSpace?.id || '',
        title: 'Website login issue',
        description: 'Customer cannot log into their account',
        status: 'open',
        priority: 'high',
        type: 'bug',
        reporter: user?.email || '',
        watchers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        slaStatus: {
          slaId: 'support-sla',
          responseBreached: false,
          resolutionBreached: false,
          escalationLevel: 0,
        },
        escalationLevel: 0,
        tags: ['website', 'login'],
        labels: ['urgent'],
        subTasks: [],
        linkedTasks: [],
        customFields: {},
        attachments: [],
        version: 1,
        lastModifiedBy: user?.email || '',
      },
      {
        id: 'task-2',
        boardId,
        spaceId: selectedSpace?.id || '',
        title: 'Feature request: Dark mode',
        description: 'Add dark mode option to the mobile app',
        status: 'in_progress',
        priority: 'medium',
        type: 'feature',
        assignee: user?.email,
        reporter: user?.email || '',
        watchers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        slaStatus: {
          slaId: 'support-sla',
          responseBreached: false,
          resolutionBreached: false,
          escalationLevel: 0,
        },
        escalationLevel: 0,
        tags: ['mobile', 'ui'],
        labels: ['enhancement'],
        subTasks: [],
        linkedTasks: [],
        customFields: {},
        attachments: [],
        version: 1,
        lastModifiedBy: user?.email || '',
      },
    ];
    setTasks(mockTasks);
  };

  const handleCreateTask = (taskData: Partial<Task>) => {
    if (!selectedBoard) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      boardId: selectedBoard.id,
      spaceId: selectedSpace?.id || '',
      title: taskData.title || '',
      description: taskData.description || '',
      status: 'open',
      priority: taskData.priority || 'medium',
      type: taskData.type || 'task',
      reporter: user?.email || '',
      watchers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slaStatus: {
        slaId: selectedSpace?.settings.defaultSLA || '',
        responseBreached: false,
        resolutionBreached: false,
        escalationLevel: 0,
      },
      escalationLevel: 0,
      tags: taskData.tags || [],
      labels: taskData.labels || [],
      subTasks: [],
      linkedTasks: [],
      customFields: taskData.customFields || {},
      attachments: [],
      version: 1,
      lastModifiedBy: user?.email || '',
    };

    setTasks(prev => [newTask, ...prev]);
    setSelectedTask(newTask);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, ...updates, updatedAt: new Date().toISOString(), version: task.version + 1 }
        : task
    ));

    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, ...updates, updatedAt: new Date().toISOString(), version: prev.version + 1 } : null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Task Management</h1>
            <SpaceSelector
              spaces={spaces}
              selectedSpace={selectedSpace}
              onSelectSpace={setSelectedSpace}
            />
          </div>
          <div className={styles.headerRight}>
            <div className={styles.viewModeSelector}>
              <button
                className={`${styles.viewModeButton} ${viewMode === 'kanban' ? styles.active : ''}`}
                onClick={() => setViewMode('kanban')}
              >
                Kanban
              </button>
              <button
                className={`${styles.viewModeButton} ${viewMode === 'list' ? styles.active : ''}`}
                onClick={() => setViewMode('list')}
              >
                List
              </button>
              <button
                className={`${styles.viewModeButton} ${viewMode === 'calendar' ? styles.active : ''}`}
                onClick={() => setViewMode('calendar')}
              >
                Calendar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Board View */}
        <div className={styles.boardContainer}>
          {selectedBoard && (
            <BoardView
              board={selectedBoard}
              tasks={tasks}
              viewMode={viewMode}
              onSelectTask={setSelectedTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onCreateTask={handleCreateTask}
            />
          )}
        </div>

        {/* Task Sidebar */}
        {selectedTask && (
          <TaskSidebar
            task={selectedTask}
            onUpdateTask={handleUpdateTask}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </div>
    </div>
  );
};

export default TaskManagementDashboard; 