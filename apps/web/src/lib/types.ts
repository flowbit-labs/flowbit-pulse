export type TaskStatus = "todo" | "doing" | "done" | "blocked";

export type Task = {
  id: number;
  title: string;
  notes?: string;
  priority: number;
  estimate_min: number;
  status: TaskStatus;
  due_at?: string | null;
};

export type TimeBlock = {
  id: string;
  label: string;
  start: string;
  end: string;
  tasks: Task[];
};

export type NowRecommendation = {
  task: Task | null;
  reason?: string | null;
};

export type TodayPlan = {
  date: string;
  blocks: TimeBlock[];
  now: NowRecommendation;
  buffer_min?: number;
  changes?: string[];
  locked_block_ids?: string[];
  explanation?: string | null;
};
