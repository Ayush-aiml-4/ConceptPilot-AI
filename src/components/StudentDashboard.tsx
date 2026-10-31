import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Flame,
  GitBranch,
  Target,
  XCircle,
} from "lucide-react";
import { AppView, Student } from "../types";
import { CONCEPT_ORDER } from "../data/syllabus";
import {
  computeStudentMetrics,
  selectNextAdaptiveTarget,
} from "../engine/adaptiveEngine";
import {
  ConceptStatusLabel,
  DifficultyText,
  formatRelativeDate,
  MasteryProgressBar,
  ReasoningCategoryHeading,
} from "./StatusIndicator";

interface StudentDashboardProps {
  student: Student;
  onNavigate: (view: AppView) => void;
  onStartConceptPractice: (conceptId: string, mode?: "adaptive" | "revision") => void;
  onInspectConcept: (conceptId: string) => void;
}

export function StudentDashboard({
  student,
  onNavigate,
  onStartConceptPractice,
  onInspectConcept,
}: StudentDashboardProps) {
  const metrics = computeStudentMetrics(student);
  const nextRecommendation = selectNextAdaptiveTarget(student);

  const isBrandNewLearner =
    !student.diagnosticCompleted && metrics.questionsAttempted === 0;

  const weakestConcepts = CONCEPT_ORDER.map((id) => student.concepts[id])
    .filter(Boolean)
    .sort((a, b) => a.masteryScore - b.masteryScore || a.tier - b.tier)
    .slice(0, 5);

  const recentMistakes = student.attempts
    .filter(
      (a) =>
        !a.evaluation.isAnswerCorrect ||
        a.evaluation.reasoningCategory === "correct_answer_faulty_reasoning"
    )
    .slice(0, 4);

  const priorityRevisions = [
    ...metrics.overdueReviews.map((r) => ({
      ...r,
      isOverdue: true,
      dayLabel:
        r.daysOverdue === 0 ? "Due today" : `${r.daysOverdue}d overdue`,
    })),
    ...metrics.upcomingReviews.slice(0, 4).map((r) => ({
      ...r,
      isOverdue: false,
      dayLabel: r.daysUntil === 0 ? "Due today" : `In ${r.daysUntil}d`,
    })),
  ].slice(0, 5);

  if (isBrandNewLearner) {
    return (
      <div className="space-y-8">
        <section className="bg-[#0F1626] border border-slate-800/90 rounded-xl p-6 sm:p-8">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-medium text-indigo-400">
              First-Time Learner Onboarding · DBMS Fundamentals
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight">
              Benchmark your DBMS understanding before practicing.
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Complete the 10-question diagnostic across keys, functional
              dependencies, normal forms, SQL queries, joins, and ACID
              transactions. ConceptPilot AI calculates independent starting
              mastery for every concept, detects prerequisite bottlenecks, and
              builds your spaced-repetition schedule.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate("diagnostic")}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                <ClipboardCheck className="w-4 h-4 shrink-0" />
                <span>Start 10-Question Diagnostic</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate("concept-map")}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <GitBranch className="w-4 h-4 shrink-0" />
                <span>Explore DBMS Concept Graph</span>
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5">
            <p className="text-xs text-slate-400">Weighted Mastery</p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-200">
              0%
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Awaiting diagnostic evidence
            </p>
          </div>
          <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5">
            <p className="text-xs text-slate-400">Questions Attempted</p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-200">
              0
            </p>
            <p className="mt-1 text-xs text-slate-500">
              10 concepts in syllabus
            </p>
          </div>
          <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5">
            <p className="text-xs text-slate-400">Overall Accuracy</p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-200">
              —
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Recorded after first attempt
            </p>
          </div>
          <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5">
            <p className="text-xs text-slate-400">Active Study Streak</p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-200">
              0 days
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Complete 1 question today to start
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dominant Focal Anchor: Recommended Next Adaptive Action */}
      <section className="bg-[#0F1626] border border-slate-800/90 rounded-xl p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-300">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Recommended Next Action</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <DifficultyText level={nextRecommendation.targetDifficulty} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-50 tracking-tight">
              Practice {nextRecommendation.concept.name}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {nextRecommendation.selectionReason}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400 tabular-nums">
              <span>
                Current Mastery: {nextRecommendation.concept.masteryScore}%
              </span>
              <span aria-hidden="true">·</span>
              <ConceptStatusLabel status={nextRecommendation.concept.status} />
              <span aria-hidden="true">·</span>
              <span>
                Wispr Flow voice-reasoning evaluation ready
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() =>
                onStartConceptPractice(
                  nextRecommendation.concept.id,
                  "adaptive"
                )
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              <span>Start Adaptive Session</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate("diagnostic")}
              className="px-4 py-2.5 text-sm font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/90 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {student.diagnosticCompleted
                ? "Retake Diagnostic"
                : "Take Diagnostic"}
            </button>
          </div>
        </div>
      </section>

      {/* Live Derived KPI Row */}
      <section
        aria-label="Learner Progress Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Overall Weighted Mastery</span>
            <Target className="w-4 h-4 text-indigo-400 shrink-0" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-50">
              {metrics.weightedMastery}%
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              {metrics.masteredCount}/10 mastered
            </span>
          </div>
          <div className="mt-3">
            <MasteryProgressBar
              score={metrics.weightedMastery}
              status={
                metrics.weightedMastery >= 80
                  ? "Mastered"
                  : metrics.weightedMastery >= 50
                    ? "Developing"
                    : "Weak"
              }
              size="sm"
            />
          </div>
        </div>

        <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Questions Attempted</span>
            <ClipboardCheck className="w-4 h-4 text-violet-400 shrink-0" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-50">
              {metrics.questionsAttempted}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              {metrics.correctAnswers} correct
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-400 tabular-nums">
            {metrics.weakCount} Weak · {metrics.developingCount} Developing ·{" "}
            {metrics.masteredCount} Mastered
          </p>
        </div>

        <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Answer Accuracy</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-50">
              {metrics.accuracyPercent}%
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              across {metrics.questionsAttempted} attempts
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Evaluated with reasoning verification
          </p>
        </div>

        <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Learning Streak</span>
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-50">
              {metrics.streakDays} {metrics.streakDays === 1 ? "day" : "days"}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-400 tabular-nums">
            {metrics.overdueReviews.length > 0
              ? `${metrics.overdueReviews.length} review${metrics.overdueReviews.length === 1 ? "" : "s"} due now`
              : "All scheduled reviews on track"}
          </p>
        </div>
      </section>

      {/* Two-Column Split: Weakest Concepts & Upcoming Revision Sessions */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <section className="xl:col-span-7 bg-[#0F1626] border border-slate-800/80 rounded-xl flex flex-col">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Weakest Concepts & Prerequisite Priorities
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ordered by lowest mastery and foundational dependency tier
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("concept-map")}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap shrink-0"
            >
              Open Concept Map
            </button>
          </div>

          <div className="divide-y divide-slate-800/80 flex-1">
            {weakestConcepts.map((concept) => {
              const activeMisc = concept.knownMisconceptions.filter(
                (m) => !m.resolved
              );
              return (
                <div
                  key={concept.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onInspectConcept(concept.id)}
                        className="text-sm font-semibold text-slate-100 hover:text-indigo-300 text-left transition-colors"
                      >
                        {concept.name}
                      </button>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <ConceptStatusLabel status={concept.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 tabular-nums">
                      <span>
                        {concept.correctAnswers}/{concept.questionsAttempted}{" "}
                        correct
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Confidence {concept.confidenceEstimate}%
                      </span>
                      {activeMisc.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-rose-300">
                            {activeMisc.length} active misconception
                            {activeMisc.length === 1 ? "" : "s"}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="max-w-xs pt-0.5">
                      <MasteryProgressBar
                        score={concept.masteryScore}
                        status={concept.status}
                        size="sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-lg font-bold font-mono tabular-nums text-slate-100 w-12 text-right">
                      {concept.masteryScore}%
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onStartConceptPractice(concept.id, "adaptive")
                      }
                      className="px-3.5 py-2 text-xs font-medium text-slate-100 bg-slate-800/90 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Practice
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Revision Queue Panel */}
        <section className="xl:col-span-5 bg-[#0F1626] border border-slate-800/80 rounded-xl flex flex-col">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Spaced Revision Queue
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Intervals adapt automatically to accuracy and misconceptions
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("revision")}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap shrink-0"
            >
              Full Schedule
            </button>
          </div>

          {priorityRevisions.length === 0 ? (
            <div className="p-6 text-sm text-slate-400 flex-1 flex flex-col justify-center items-start gap-3">
              <p>
                No spaced-repetition reviews scheduled yet. Complete a practice
                question or diagnostic to populate your retention timeline.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("learn")}
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap"
              >
                Start First Practice Question
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 flex-1">
              {priorityRevisions.map(({ concept, task, isOverdue, dayLabel }) => (
                <div
                  key={task.id}
                  className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-100 truncate">
                        {concept.shortName}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums whitespace-nowrap ${
                          isOverdue ? "text-rose-400" : "text-slate-400"
                        }`}
                      >
                        <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                        <span>{dayLabel}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {task.reason}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onStartConceptPractice(concept.id, "revision")
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      isOverdue
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                        : "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    }`}
                  >
                    Review now
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Mistakes & Misconception Evidence */}
      <section className="bg-[#0F1626] border border-slate-800/80 rounded-xl">
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Recent Mistakes & Reasoning Diagnoses
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Captured from your answers and dictated reasoning explanations
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("learn")}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap shrink-0"
          >
            Remediate in Learn
          </button>
        </div>

        {recentMistakes.length === 0 ? (
          <div className="p-6 text-sm text-slate-400">
            No recent mistakes or faulty-reasoning flags recorded yet. Keep
            explaining your reasoning in Learn sessions to surface subtle edge
            cases.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {recentMistakes.map((attempt) => {
              const concept = student.concepts[attempt.conceptId];
              return (
                <div key={attempt.id} className="p-6 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-medium text-slate-200">
                        {concept?.name ?? attempt.conceptId}
                      </span>
                      <span aria-hidden="true">·</span>
                      <DifficultyText level={attempt.difficulty} />
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {formatRelativeDate(attempt.timestamp)}
                      </span>
                    </div>
                    <ReasoningCategoryHeading
                      category={attempt.evaluation.reasoningCategory}
                    />
                  </div>

                  <p className="text-sm text-slate-200 font-medium">
                    {attempt.questionPrompt}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Your Submitted Answer & Reasoning</span>
                      </div>
                      <p className="text-slate-200 font-mono">
                        {attempt.studentAnswer}
                      </p>
                      {attempt.studentReasoning && (
                        <p className="text-slate-400 italic">
                          "{attempt.studentReasoning}"
                        </p>
                      )}
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5 space-y-1">
                      <p className="text-indigo-300 font-medium">
                        {attempt.evaluation.detectedMisconception ||
                          "Tutor Diagnosis"}
                      </p>
                      <p className="text-slate-300 leading-relaxed">
                        {attempt.evaluation.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
