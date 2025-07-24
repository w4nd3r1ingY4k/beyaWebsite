import React, { useState } from 'react';
import { Plus, Filter, Search } from 'lucide-react';
import styles from '@/styles/BoardView.module.css';
import { Board, Task, TaskStatus, TaskPriority } from '@/types/taskManagement';
import KanbanView from './KanbanView';
import ListView from './ListView';
import CalendarView from './CalendarView';
import TicketForm from './TicketForm';

interface BoardViewProps {
  board: Board;
  tasks: any[];
  viewMode: 'kanban' | 'list' | 'calendar';
  onSelectTask: (task: any) => void;
  onUpdateTask: (taskId: string, updates: Partial<any>) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTask: (taskData: Partial<any>) => void;
}

const STATUS_OPTIONS: TaskStatus[] = [
  'open',
  'in_progress',
  'under_review',
  'waiting_for_customer',
  'waiting_for_third_party',
  'resolved',
  'closed',
  'cancelled',
];
const PRIORITY_OPTIONS: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];

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
    priority?: TaskPriority[];
    assignee?: string;
  }>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState<{ status?: TaskStatus[]; priority?: TaskPriority[] }>({});

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

  // Filter modal handlers
  const openFilterModal = () => {
    setTempFilters(filters);
    setShowFilterModal(true);
  };
  const closeFilterModal = () => setShowFilterModal(false);
  const handleFilterChange = (type: 'status' | 'priority', value: TaskStatus | TaskPriority) => {
    setTempFilters((prev) => {
      const arr = prev[type] ? [...prev[type]!] : [];
      if (arr.includes(value)) {
        return { ...prev, [type]: arr.filter((v) => v !== value) };
      } else {
        return { ...prev, [type]: [...arr, value] };
      }
    });
  };
  const applyFilters = () => {
    setFilters(tempFilters);
    setShowFilterModal(false);
  };

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
          <button className={styles.filterButton} onClick={openFilterModal}>
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
      <div className={styles.boardContent}>{renderView()}</div>
      {/* Filter Modal */}
      {showFilterModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 32,
            minWidth: 320,
            boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ marginTop: 0 }}>Filter Tasks</h3>
            <div style={{ marginBottom: 16 }}>
              <strong>Status</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {STATUS_OPTIONS.map((status) => (
                  <label key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={tempFilters.status?.includes(status) || false}
                      onChange={() => handleFilterChange('status', status)}
                    />
                    {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Priority</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {PRIORITY_OPTIONS.map((priority) => (
                  <label key={priority} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={tempFilters.priority?.includes(priority) || false}
                      onChange={() => handleFilterChange('priority', priority)}
                    />
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={closeFilterModal} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f3f4f6', cursor: 'pointer' }}>Cancel</button>
              <button onClick={applyFilters} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}>Apply</button>
            </div>
          </div>
        </div>
      )}
      {/* Task Form Modal */}
      {showTaskForm && (
        <TicketForm
          onSave={handleCreateTask}
          onClose={() => setShowTaskForm(false)}
        />
      )}
    </div>
  );
};

export default BoardView; 