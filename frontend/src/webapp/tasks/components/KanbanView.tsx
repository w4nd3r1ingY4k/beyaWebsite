import React from 'react';
import styles from '@/styles/KanbanView.module.css';
import { Board, Task } from '@/types/taskManagement';
import TaskCard from './TaskCard';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

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

  // Handle drag end
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    // Find the task and update its status
    const task = tasks.find(t => t.id === draggableId);
    if (task && destination.droppableId !== source.droppableId) {
      onUpdateTask(task.id, { status: destination.droppableId });
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={styles.container}>
        <div className={styles.columns}>
          {board.columns.map((column) => {
            const columnTasks = getTasksForColumn(column.status);
            return (
              <Droppable droppableId={column.status} key={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={styles.column}
                    style={{
                      background: snapshot.isDraggingOver ? '#FDF2F8' : '#fff',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div className={styles.columnHeader}>
                      <h3 className={styles.columnTitle}>{column.name}</h3>
                      <span className={styles.taskCount}>{columnTasks.length}</span>
                    </div>
                    <div className={styles.columnContent}>
                      {columnTasks.map((task, idx) => (
                        <Draggable draggableId={task.id} index={idx} key={task.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                boxShadow: snapshot.isDragging ? '0 4px 16px 0 rgba(236,72,153,0.15)' : 'none',
                                border: snapshot.isDragging ? '2px solid #EC4899' : 'none',
                                borderRadius: 8,
                                marginBottom: 8,
                                background: '#fff',
                              }}
                            >
                              <TaskCard
                                task={task}
                                onClick={() => onSelectTask(task)}
                                onDelete={() => onDeleteTask(task.id)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
};

export default KanbanView; 