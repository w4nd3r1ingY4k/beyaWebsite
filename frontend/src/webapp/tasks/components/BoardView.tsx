import React, { useState } from 'react';
import { Plus, Filter, Search } from 'lucide-react';
import styles from '../../../styles/BoardView.module.css';
import { Board, Task, TaskStatus } from '@/types/taskManagement';
import KanbanView from './KanbanView';
import ListView from './ListView';
import CalendarView from './CalendarView';
import TaskForm from './TaskForm';

interface BoardViewProps {
  board: Board;
  tasks: any[];
  viewMode: 'kanban' | 'list' | 'calendar';
  onSelectTask: (task: any) => void;
  onUpdateTask: (taskId: string, updates: Partial<any>) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTask: (taskData: Partial<any>) => void;
}

const BoardView: React.FC<BoardViewProps> = ({
  board,
  tasks,
  viewMode,
  onSelectTask,
  onUpdateTask,
  onDeleteTask,
  onCreateTask,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [filters, setFilters] = useState<{
    status?: TaskStatus[];
    priority?: string[];
    assignee?: string;
  }>({});

  const filteredTasks = tasks.filter(task => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(query) &&
          !task.description.toLowerCase().includes(query) &&
          !task.id.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(task.status)) {
        return false;
      }
    }

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      if (!filters.priority.includes(task.priority)) {
        return false;
      }
    }

    // Assignee filter
    if (filters.assignee) {
      if (task.assignee !== filters.assignee) {
        return false;
      }
    }

    return true;
  });

  const handleCreateTask = (taskData: Partial<Task>) => {
    onCreateTask(taskData);
    setShowTaskForm(false);
  };

  const renderView = () => {
    switch (viewMode) {
      case 'kanban':
        return (
          <KanbanView
            board={board}
            tasks={filteredTasks}
            onSelectTask={onSelectTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
          />
        );
      case 'list':
        return (
          <ListView
            tasks={filteredTasks}
            onSelectTask={onSelectTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            tasks={filteredTasks}
            onSelectTask={onSelectTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Board Header */}
      <div className={styles.boardHeader}>
        <div className={styles.boardInfo}>
          <h2 className={styles.boardName}>{board.name}</h2>
          {board.description && (
            <p className={styles.boardDescription}>{board.description}</p>
          )}
        </div>

        <div className={styles.boardActions}>
          {/* Search */}
          <div className={styles.searchContainer}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {/* Filters */}
          <button className={styles.filterButton}>
            <Filter size={16} />
            Filters
          </button>

          {/* Create Task */}
          <button
            className={styles.createButton}
            onClick={() => setShowTaskForm(true)}
          >
            <Plus size={16} />
            New Task
          </button>
        </div>
      </div>

      {/* Board Content */}
      <div className={styles.boardContent}>
        {renderView()}
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          board={board}
          onSave={handleCreateTask}
          onClose={() => setShowTaskForm(false)}
        />
      )}
    </div>
  );
};

export default BoardView; 