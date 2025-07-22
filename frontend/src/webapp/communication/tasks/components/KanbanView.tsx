import React from 'react';
import styles from '@/styles/KanbanView.module.css';
import { Board, Task } from '@/types/taskManagement';
import TaskCard from './TaskCard';

interface KanbanViewProps {
  board: Board;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

const KanbanView: React.FC<KanbanViewProps> = ({
  board,
  tasks,
  onSelectTask,
  onUpdateTask,
  onDeleteTask,
}) => {
  const getTasksForColumn = (columnStatus: string) => {
    return tasks.filter(task => task.status === columnStatus);
  };

  return (
    <div className={styles.container}>
      <div className={styles.columns}>
        {board.columns.map((column) => {
          const columnTasks = getTasksForColumn(column.status);
          return (
            <div key={column.id} className={styles.column}>
              <div className={styles.columnHeader}>
                <h3 className={styles.columnTitle}>{column.name}</h3>
                <span className={styles.taskCount}>{columnTasks.length}</span>
              </div>
              <div className={styles.columnContent}>
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onSelectTask(task)}
                    onDelete={() => onDeleteTask(task.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanView; 