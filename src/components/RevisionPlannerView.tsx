import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  History,
} from "lucide-react";
import { Student } from "../types";
import { computeStudentMetrics } from "../engine/adaptiveEngine";
import {
  ConceptStatusLabel,
  formatRelativeDate,
  MasteryProgressBar,
} from "./StatusIndicator";

interface RevisionPlannerViewProps {
  student: Student;
  onStartRevision: (conceptId: string) => void;
  onNavigateDiagnostic: () => void;
}

type RevisionFilter = "all" | "overdue" | "upcoming" | "history";

export function RevisionPlannerView({
  student,
  onStartRevision,
  onNavigateDiagnostic,
}: RevisionPlannerViewProps) {
  const [filter, setFilter] = useState<RevisionFilter>("all");
  const metrics = computeStudentMetrics(student);

  const overdueList = metrics.overdueReviews;
  const upcomingList = metrics.upcomingReviews;
  const totalScheduled = overdueList.length + upcomingList.length;

  const revisionAttempts = student.attempts
    .filter((a) => a.mode === "revision" || a.mode === "adaptive")
    .slice(0, 12);

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
            Personalized Spaced-Repetition Planner
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Intervals shorten automatically after repeated mistakes or weak
            reasoning, and expand as consecutive sound answers confirm durable
            mastery.
          </p>
        </div>

        {/* Interactive Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter revision tasks"
          className="inline-flex items-center gap-1 p-1 bg-[#0F1626] border border-slate-800 rounded-lg self-start"
        >
          {(
            [
              { id: "all", label: `All Scheduled (${totalScheduled})` },
              { id: "overdue", label: `Overdue & Due Now (${overdueList.length})` },
              { id: "upcoming", label: `Upcoming (${upcomingList.length})` },
              { id: "history", label: `Review History (${revisionAttempts.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={filter === tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                filter === tab.id
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interval Calibration Summary Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-rose-400 font-medium">
            <span>Overdue & High-Urgency</span>
            <AlertTriangle className="w-4 h-4 shrink-0" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-50">
            {overdueList.length}
          </p>
          <p className="text-xs text-slate-400">
            Weak concepts (&lt;50%) & repeated mistakes schedule within 0–24h
          </p>
        </div>

        <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-indigo-300 font-medium">
            <span>Near-Term Consolidation</span>
            <Clock className="w-4 h-4 shrink-0" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-50">
            {
              upcomingList.filter((u) => u.concept.status === "Developing")
                .length
            }
          </p>
          <p className="text-xs text-slate-400">
            Developing concepts (50–79%) schedule 2–5 day intervals
          </p>
        </div>

        <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>Long-Term Retention</span>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-50">
            {
              upcomingList.filter((u) => u.concept.status === "Mastered").length
            }
          </p>
          <p className="text-xs text-slate-400">
            Mastered concepts (≥80%) expand to 7–21 day intervals
          </p>
        </div>
      </section>

      {totalScheduled === 0 && filter !== "history" && (
        <section className="bg-[#0F1626] border border-slate-800/90 rounded-xl p-8 text-center space-y-4">
          <p className="text-base font-semibold text-slate-100">
            No revision tasks scheduled yet
          </p>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Complete the 10-question diagnostic or submit an adaptive practice
            attempt to generate your personalized spaced-repetition calendar.
          </p>
          <button
            type="button"
            onClick={onNavigateDiagnostic}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap"
          >
            <span>Take Diagnostic Assessment</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </section>
      )}

      {/* Overdue & Due Today Section */}
      {(filter === "all" || filter === "overdue") && overdueList.length > 0 && (
        <section className="bg-[#0F1626] border border-slate-800/90 rounded-xl">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Overdue & Due Today ({overdueList.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Missed intervals and repeated-mistake triggers surfaced for
                immediate review
              </p>
            </div>
            {overdueList[0] && (
              <button
                type="button"
                onClick={() => onStartRevision(overdueList[0].concept.id)}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Start Top Overdue Review
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-800/80">
            {overdueList.map(({ concept, task, daysOverdue }) => (
              <div
                key={task.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100">
                      {concept.name}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <ConceptStatusLabel status={concept.status} />
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400 tabular-nums">
                      <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {daysOverdue === 0
                          ? "Due today (High Priority)"
                          : `${daysOverdue}d overdue`}
                      </span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{task.reason}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 tabular-nums">
                    <span>Mastery {concept.masteryScore}%</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Last reviewed:{" "}
                      {formatRelativeDate(concept.lastReviewedDate)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Reviews completed: {task.reviewCount}</span>
                  </div>

                  <div className="max-w-xs pt-0.5">
                    <MasteryProgressBar
                      score={concept.masteryScore}
                      status={concept.status}
                      size="sm"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onStartRevision(concept.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
                >
                  <span>Review now</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {filter === "overdue" && overdueList.length === 0 && totalScheduled > 0 && (
        <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-6 text-sm text-slate-300">
          Zero overdue concepts right now — your spaced-repetition queue is
          completely caught up!
        </div>
      )}

      {/* Upcoming Scheduled Reviews */}
      {(filter === "all" || filter === "upcoming") &&
        upcomingList.length > 0 && (
          <section className="bg-[#0F1626] border border-slate-800/90 rounded-xl">
            <div className="px-6 py-4 border-b border-slate-800/80">
              <h2 className="text-base font-semibold text-slate-100">
                Upcoming Scheduled Reviews ({upcomingList.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sorted chronologically by next spaced-repetition checkpoint
              </p>
            </div>

            <div className="divide-y divide-slate-800/80">
              {upcomingList.map(({ concept, task, daysUntil }) => (
                <div
                  key={task.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">
                        {concept.name}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <ConceptStatusLabel status={concept.status} />
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="text-xs font-mono tabular-nums text-indigo-300">
                        {daysUntil === 0
                          ? "Scheduled today"
                          : `Scheduled in ${daysUntil}d (${task.intervalDays}d interval)`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">{task.reason}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-mono font-semibold tabular-nums text-slate-200">
                      {concept.masteryScore}%
                    </span>
                    <button
                      type="button"
                      onClick={() => onStartRevision(concept.id)}
                      className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Review now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      {/* Review & Practice Log */}
      {(filter === "all" || filter === "history") && (
        <section className="bg-[#0F1626] border border-slate-800/90 rounded-xl">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400 shrink-0" />
            <h2 className="text-base font-semibold text-slate-100">
              Persisted Review & Practice History
            </h2>
          </div>

          {revisionAttempts.length === 0 ? (
            <div className="p-6 text-xs text-slate-400">
              Completed review sessions will appear here with mastery deltas and
              updated intervals.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs text-slate-400">
                    <th className="py-3 px-6 font-medium">Concept</th>
                    <th className="py-3 px-4 font-medium">Mode</th>
                    <th className="py-3 px-4 font-medium">Outcome</th>
                    <th className="py-3 px-4 font-medium text-right">
                      Mastery Shift
                    </th>
                    <th className="py-3 px-6 font-medium text-right">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {revisionAttempts.map((att) => {
                    const concept = student.concepts[att.conceptId];
                    const delta = att.evaluation.appliedMasteryDelta;
                    return (
                      <tr
                        key={att.id}
                        className="hover:bg-slate-900/40 transition-colors"
                      >
                        <td className="py-3 px-6 font-medium text-slate-200">
                          {concept?.shortName ?? att.conceptId}
                        </td>
                        <td className="py-3 px-4 text-slate-400 capitalize">
                          {att.mode}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={
                              att.evaluation.isAnswerCorrect
                                ? "text-emerald-400 font-medium"
                                : "text-rose-400 font-medium"
                            }
                          >
                            {att.evaluation.isAnswerCorrect
                              ? "Correct"
                              : "Incorrect"}{" "}
                            ·{" "}
                            {att.evaluation.reasoningCategory.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                          {att.evaluation.priorMastery}% →{" "}
                          {att.evaluation.updatedMastery}% (
                          <span
                            className={
                              delta > 0
                                ? "text-emerald-400"
                                : delta < 0
                                  ? "text-rose-400"
                                  : "text-slate-400"
                            }
                          >
                            {delta >= 0 ? `+${delta}` : delta}%
                          </span>
                          )
                        </td>
                        <td className="py-3 px-6 text-right text-slate-400 tabular-nums">
                          {formatRelativeDate(att.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
