import React from 'react';
import { Trash2 } from 'lucide-react';
import { Task } from '@/types/taskManagement';

interface ListViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

const ListView: React.FC<ListViewProps> = ({ tasks, onSelectTask, onDeleteTask }) => {
  return (
    <div style={{ padding: '20px' }}>
      <h3>List View</h3>
      <p>List view implementation coming soon...</p>
      <div>
        {tasks.map((task) => (
          <div
            key={task.id}
            style={{
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              marginBottom: '8px',
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              onClick={() => onSelectTask(task)}
              style={{
                flex: 1,
                cursor: 'pointer',
              }}
            >
              <strong>{task.title}</strong>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {task.id} • {task.status} • {task.priority}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTask(task.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                borderRadius: '3px',
                color: '#9ca3af',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Delete task"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListView; 