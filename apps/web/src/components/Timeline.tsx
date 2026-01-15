"use client";
import React from "react";
import { DndContext, closestCenter, DragEndEvent, useSensor, useSensors, PointerSensor, KeyboardSensor } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { TodayPlan, Task } from "@/lib/types";
import { TimeBlock } from "./TimeBlock";

export function Timeline({
  plan, lockedBlockIds, onToggleLock, onTaskDone, onTaskBlocked, onTaskStart, onMoveTask,
}: {
  plan: TodayPlan;
  lockedBlockIds: string[];
  onToggleLock: (blockId: string, nextLocked: boolean) => void;
  onTaskDone: (t: Task) => void;
  onTaskBlocked: (t: Task) => void;
  onTaskStart: (t: Task) => void;
  onMoveTask: (args: { taskId: number; fromBlockId: string; toBlockId: string; toIndex: number }) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeData = active.data.current as any;
        const overData = over.data.current as any;

        const taskId = activeData?.taskId as number | undefined;
        const fromBlockId = activeData?.blockId as string | undefined;
        if (!taskId || !fromBlockId) return;

        let toBlockId: string | undefined;
        let toIndex = 0;

        const overId = String(over.id);

        if (overId.startsWith("block:")) {
          toBlockId = overData?.blockId ?? overId.split(":")[1];
          toIndex = 0;
        }

        if (overId.startsWith("task:")) {
          toBlockId = overData?.blockId;
          const overTaskId = overData?.taskId as number | undefined;
          if (toBlockId && overTaskId) {
            const destBlock = plan.blocks.find((b) => b.id === toBlockId);
            if (destBlock) {
              const idx = destBlock.tasks.findIndex((t) => t.id === overTaskId);
              toIndex = idx < 0 ? 0 : idx;
            }
          }
        }

        if (!toBlockId) return;
        if (lockedBlockIds.includes(fromBlockId) || lockedBlockIds.includes(toBlockId)) return;

        onMoveTask({ taskId, fromBlockId, toBlockId, toIndex });
      }}
    >
      <div className="space-y-4">
        {plan.blocks.map((b) => (
          <TimeBlock
            key={b.id}
            block={b}
            locked={lockedBlockIds.includes(b.id)}
            onToggleLock={onToggleLock}
            onTaskDone={onTaskDone}
            onTaskBlocked={onTaskBlocked}
            onTaskStart={onTaskStart}
          />
        ))}
      </div>
    </DndContext>
  );
}
