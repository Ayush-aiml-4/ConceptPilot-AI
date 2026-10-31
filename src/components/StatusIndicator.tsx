import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import { ConceptStatus, DifficultyLevel, ReasoningCategory } from "../types";

export function ConceptStatusLabel({ status }: { status: ConceptStatus }) {
  if (status === "Mastered") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Mastered</span>
      </span>
    );
  }
  if (status === "Developing") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 whitespace-nowrap shrink-0">
        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Developing</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 whitespace-nowrap shrink-0">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Weak</span>
    </span>
  );
}

export function DifficultyText({ level }: { level: DifficultyLevel }) {
  const label =
    level === 1
      ? "Level 1 · Foundation"
      : level === 2
        ? "Level 2 · Exam Standard"
        : "Level 3 · Advanced Edge-Case";
  return (
    <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap shrink-0">
      {label}
    </span>
  );
}

export function MasteryProgressBar({
  score,
  status,
  size = "md",
}: {
  score: number;
  status: ConceptStatus;
  size?: "sm" | "md";
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const fillClass =
    status === "Mastered"
      ? "bg-emerald-500"
      : status === "Developing"
        ? "bg-indigo-400"
        : "bg-rose-500";
  const heightClass = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div
      className={`w-full bg-slate-800/90 rounded-full overflow-hidden ${heightClass}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Mastery ${clamped}%`}
    >
      <div
        className={`h-full rounded-full transition-transform duration-200 origin-left ${fillClass}`}
        style={{ transform: `scaleX(${clamped / 100})` }}
      />
    </div>
  );
}

export function ReasoningCategoryHeading({
  category,
}: {
  category: ReasoningCategory;
}) {
  switch (category) {
    case "sound":
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Sound Conceptual Reasoning</span>
        </span>
      );
    case "correct_answer_faulty_reasoning":
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Correct Answer · Faulty Reasoning Detected</span>
        </span>
      );
    case "incorrect_answer_sound_reasoning":
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-300">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>Sound Core Logic · Final Answer Slip</span>
        </span>
      );
    case "careless_error":
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Careless Error</span>
        </span>
      );
    case "incomplete_explanation":
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300">
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Incomplete Explanation</span>
        </span>
      );
    case "ambiguous":
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-300">
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Ambiguous Reasoning · Clarification Needed</span>
        </span>
      );
    case "conceptual_misunderstanding":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-400">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>Conceptual Misunderstanding</span>
        </span>
      );
  }
}

export function formatRelativeDate(iso: string | null, now = new Date()): string {
  if (!iso) return "Not yet reviewed";
  const target = new Date(iso);
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();
  const diffDays = Math.round((startTarget - startToday) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays < -1) return `${Math.abs(diffDays)}d ago`;
  return `In ${diffDays}d`;
}
