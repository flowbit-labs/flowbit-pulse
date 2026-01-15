"use client";
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/lib/types";
import { TaskCard } from "./TaskCard";

export function DraggableTaskCard({
  task, blockId, onDone, onBlocked, onStart,
}: {
  task: Task;
  blockId: string;
  onDone: () => void;
  onBlocked: () => void;
  onStart: () => void;
}) {
  const id = `task:${task.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, data: { taskId: task.id, blockId } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onDone={onDone} onBlocked={onBlocked} onStart={onStart} />
    </div>
  );
}
