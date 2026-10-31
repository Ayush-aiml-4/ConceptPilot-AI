import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { DiagnosticSummary, Student } from "../types";
import { DIAGNOSTIC_QUESTIONS } from "../data/questionBank";
import { evaluateDiagnosticSubmission } from "../engine/adaptiveEngine";
import {
  ConceptStatusLabel,
  DifficultyText,
  MasteryProgressBar,
} from "./StatusIndicator";

interface DiagnosticViewProps {
  student: Student;
  onCompleteDiagnostic: (updatedStudent: Student) => void;
  onStartConceptPractice: (conceptId: string) => void;
}

type DiagnosticStage = "intro" | "active" | "confirm_submit" | "results";

export function DiagnosticView({
  student,
  onCompleteDiagnostic,
  onStartConceptPractice,
}: DiagnosticViewProps) {
  const [stage, setStage] = useState<DiagnosticStage>("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [latestSummary, setLatestSummary] = useState<DiagnosticSummary | null>(
    student.lastDiagnosticSummary
  );

  const questions = DIAGNOSTIC_QUESTIONS;
  const currentQ = questions[currentIdx];

  const answeredCount = questions.filter(
    (q) => (responses[q.id] ?? "").trim().length > 0
  ).length;
  const unansweredCount = questions.length - answeredCount;

  function handleBegin() {
    setResponses({});
    setCurrentIdx(0);
    setStage("active");
  }

  function handleAnswerChange(val: string) {
    setResponses((prev) => ({
      ...prev,
      [currentQ.id]: val,
    }));
  }

  function handleFinalizeSubmission() {
    const { updatedStudent, summary } = evaluateDiagnosticSubmission({
      student,
      questions,
      responses,
    });
    setLatestSummary(summary);
    onCompleteDiagnostic(updatedStudent);
    setStage("results");
  }

  if (stage === "intro") {
    return (
      <div className="space-y-6 max-w-4xl">
        <section className="bg-[#0F1626] border border-slate-800/90 rounded-xl p-6 sm:p-8 space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-indigo-400">
              DBMS Syllabus Baseline Assessment · 10 Questions
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight">
              Diagnostic Mastery Assessment
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Evaluates all 10 DBMS Fundamentals concepts using a calibrated mix
              of multiple-choice and short-answer questions. Your answers set or
              recalibrate independent concept mastery scores, uncover
              prerequisite gaps, and generate a personalized study plan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
            <div>
              <p className="font-semibold text-slate-100">Coverage</p>
              <p className="text-slate-400 mt-1">
                10 concepts from Relations & Keys to BCNF, Joins & ACID
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-100">Question Formats</p>
              <p className="text-slate-400 mt-1">
                7 Multiple-Choice · 3 Short-Answer checks
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-100">Scoring Rule</p>
              <p className="text-slate-400 mt-1">
                Unanswered items count as incorrect—never inflated
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleBegin}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <ClipboardCheck className="w-4 h-4 shrink-0" />
              <span>
                {student.diagnosticCompleted
                  ? "Start New Diagnostic Run"
                  : "Begin Diagnostic Assessment"}
              </span>
            </button>

            {latestSummary && (
              <button
                type="button"
                onClick={() => setStage("results")}
                className="px-4 py-2.5 text-sm font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                View Latest Diagnostic Summary (
                {latestSummary.correctCount}/{latestSummary.totalQuestions})
              </button>
            )}
          </div>
        </section>
      </div>
    );
  }

  if (stage === "confirm_submit") {
    return (
      <div className="max-w-2xl">
        <section className="bg-[#0F1626] border border-slate-800/90 rounded-xl p-6 sm:p-8 space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-50">
              Confirm Diagnostic Submission
            </h2>
            <p className="text-sm text-slate-300">
              You have answered{" "}
              <span className="font-mono font-semibold tabular-nums text-slate-100">
                {answeredCount} of {questions.length}
              </span>{" "}
              questions.
            </p>
          </div>

          {unansweredCount > 0 && (
            <div className="bg-amber-950/30 border border-amber-800/60 rounded-lg p-4 flex items-start gap-3 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">
                  {unansweredCount} question
                  {unansweredCount === 1 ? " is" : "s are"} still unanswered.
                </p>
                <p className="text-amber-200/80">
                  Unanswered diagnostic questions are strictly evaluated as
                  incorrect and will mark those concepts for foundational
                  review.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-1">
            {questions.map((q, idx) => {
              const filled = (responses[q.id] ?? "").trim().length > 0;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setCurrentIdx(idx);
                    setStage("active");
                  }}
                  className={`py-2 rounded-lg text-xs font-mono tabular-nums border transition-colors ${
                    filled
                      ? "bg-indigo-950/60 border-indigo-500/60 text-indigo-200"
                      : "bg-slate-900 border-slate-700 text-amber-300"
                  }`}
                >
                  Q{idx + 1}
                </button>
              );
            })}
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setStage("active")}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Return to Questions</span>
            </button>
            <button
              type="button"
              onClick={handleFinalizeSubmission}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Submit & Calculate Mastery</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (stage === "results" && latestSummary) {
    const scorePct = Math.round(
      (latestSummary.correctCount / latestSummary.totalQuestions) * 100
    );

    return (
      <div className="space-y-8 max-w-5xl">
        <section className="bg-[#0F1626] border border-slate-800/90 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-indigo-400">
              Diagnostic Complete · Per-Concept Mastery Updated
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">
              Scored {latestSummary.correctCount} /{" "}
              {latestSummary.totalQuestions} ({scorePct}%)
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              {latestSummary.weakConceptIds.length > 0
                ? `Identified ${latestSummary.weakConceptIds.length} priority concept${latestSummary.weakConceptIds.length === 1 ? "" : "s"} needing reinforcement. Start your dependency-ordered study plan below.`
                : "Strong foundational mastery across the syllabus! Continue with advanced edge-case practice."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {latestSummary.recommendedPlan[0] && (
              <button
                type="button"
                onClick={() =>
                  onStartConceptPractice(
                    latestSummary.recommendedPlan[0].conceptId
                  )
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap"
              >
                <span>Start Personalized Plan</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            )}
            <button
              type="button"
              onClick={handleBegin}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Retake Diagnostic</span>
            </button>
          </div>
        </section>

        {/* Personalized Learning Plan */}
        {latestSummary.recommendedPlan.length > 0 && (
          <section className="bg-[#0F1626] border border-slate-800/80 rounded-xl">
            <div className="px-6 py-4 border-b border-slate-800/80">
              <h2 className="text-base font-semibold text-slate-100">
                Personalized Learning Plan (Prerequisite-Ordered)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Foundational concepts appear before downstream normalization and
                join topics
              </p>
            </div>
            <div className="divide-y divide-slate-800/80">
              {latestSummary.recommendedPlan.map((step, i) => {
                const concept = student.concepts[step.conceptId];
                if (!concept) return null;
                return (
                  <div
                    key={step.conceptId}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono tabular-nums text-indigo-400">
                          0{i + 1}.
                        </span>
                        <span className="text-sm font-semibold text-slate-100">
                          {concept.name}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <ConceptStatusLabel status={concept.status} />
                      </div>
                      <p className="text-xs text-slate-400">{step.reason}</p>
                      <div className="max-w-xs pt-1">
                        <MasteryProgressBar
                          score={concept.masteryScore}
                          status={concept.status}
                          size="sm"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onStartConceptPractice(concept.id)}
                      className="px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
                    >
                      {step.targetAction}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Per-Question Explanations (when taken in current session) */}
        {latestSummary.answers.length > 0 && (
          <section className="bg-[#0F1626] border border-slate-800/80 rounded-xl">
            <div className="px-6 py-4 border-b border-slate-800/80">
              <h2 className="text-base font-semibold text-slate-100">
                Question-by-Question Review & Explanations
              </h2>
            </div>
            <div className="divide-y divide-slate-800/80">
              {latestSummary.answers.map((ans, idx) => {
                const q = questions.find((item) => item.id === ans.questionId);
                const concept = student.concepts[ans.conceptId];
                return (
                  <div key={ans.questionId} className="p-6 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-slate-400">
                        <span className="font-mono text-slate-200">
                          Q{idx + 1}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-slate-200">
                          {concept?.name ?? ans.conceptId}
                        </span>
                        <span aria-hidden="true">·</span>
                        <DifficultyText level={ans.difficulty} />
                      </div>
                      {ans.isCorrect ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Correct</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-rose-400">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>
                            {ans.studentAnswer ? "Incorrect" : "Unanswered"}
                          </span>
                        </span>
                      )}
                    </div>

                    {q && (
                      <p className="text-sm font-medium text-slate-100">
                        {q.prompt}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                        <span className="text-slate-400">Your Answer: </span>
                        <span className="text-slate-200 font-mono">
                          {ans.studentAnswer || "(Left blank)"}
                        </span>
                      </div>
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                        <span className="text-slate-400">
                          Expected Answer:{" "}
                        </span>
                        <span className="text-emerald-300 font-mono">
                          {ans.expectedAnswer}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {ans.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  // Active Question Screen
  const concept = student.concepts[currentQ.conceptId];
  const currentResponse = responses[currentQ.id] ?? "";
  const progressPct = Math.round(((currentIdx + 1) / questions.length) * 100);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Progress & Question Navigator */}
      <section className="bg-[#0F1626] border border-slate-800/90 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300 tabular-nums">
            <span className="font-semibold text-slate-100">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>{answeredCount} answered</span>
          </div>
          <button
            type="button"
            onClick={() => setStage("confirm_submit")}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap"
          >
            Review & Submit All
          </button>
        </div>

        <div
          className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-indigo-500 rounded-full transition-transform duration-200 origin-left"
            style={{ transform: `scaleX(${progressPct / 100})` }}
          />
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentIdx;
            const isAnswered = (responses[q.id] ?? "").trim().length > 0;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                aria-label={`Jump to question ${idx + 1}`}
                aria-current={isCurrent ? "step" : undefined}
                className={`w-8 h-8 rounded-md text-xs font-mono tabular-nums border transition-colors ${
                  isCurrent
                    ? "bg-indigo-600 border-indigo-400 text-white font-semibold"
                    : isAnswered
                      ? "bg-slate-800/90 border-indigo-500/40 text-indigo-200"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </section>

      {/* Question Card */}
      <section className="bg-[#0F1626] border border-slate-800/90 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="font-medium text-indigo-300">
            {concept?.name ?? currentQ.conceptId}
          </span>
          <span aria-hidden="true">·</span>
          <DifficultyText level={currentQ.difficulty} />
          <span aria-hidden="true">·</span>
          <span>
            {currentQ.type === "multiple_choice"
              ? "Multiple Choice"
              : "Short Answer"}
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-semibold text-slate-50 leading-snug">
          {currentQ.prompt}
        </h2>

        {currentQ.type === "multiple_choice" && currentQ.options ? (
          <fieldset className="space-y-2.5">
            <legend className="sr-only">Select one answer option</legend>
            {currentQ.options.map((opt, idx) => {
              const selected = currentResponse === opt;
              return (
                <label
                  key={opt}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    selected
                      ? "bg-indigo-950/40 border-indigo-500 text-slate-50"
                      : "bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name={`diag-${currentQ.id}`}
                    value={opt}
                    checked={selected}
                    onChange={() => handleAnswerChange(opt)}
                    className="mt-1 accent-indigo-500 shrink-0"
                  />
                  <span className="text-sm leading-relaxed">
                    <span className="font-mono text-xs text-slate-400 mr-2">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {opt}
                  </span>
                </label>
              );
            })}
          </fieldset>
        ) : (
          <div className="space-y-2">
            <label
              htmlFor={`diag-short-${currentQ.id}`}
              className="block text-xs font-medium text-slate-300"
            >
              Type or dictate your concise answer
            </label>
            <input
              id={`diag-short-${currentQ.id}`}
              type="text"
              value={currentResponse}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Enter your short answer (e.g., HAVING, Atomicity, ABCD)..."
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Previous</span>
          </button>

          {currentIdx < questions.length - 1 ? (
            <button
              type="button"
              onClick={() =>
                setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))
              }
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Next Question</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStage("confirm_submit")}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Review & Submit</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
