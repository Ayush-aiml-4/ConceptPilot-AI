import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Edit3,
  Eye,
  HelpCircle,
  Loader2,
  MessageSquareQuote,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  Attempt,
  ConfidenceLevel,
  Question,
  Student,
} from "../types";
import {
  applyAttemptToStudent,
  selectNextAdaptiveTarget,
} from "../engine/adaptiveEngine";
import { summarizeConversationalReasoning } from "../engine/localEvaluator";
import {
  evaluateAttemptWithTutor,
  generateAdaptiveQuestionFromAi,
} from "../services/tutorApi";
import {
  ConceptStatusLabel,
  DifficultyText,
  formatRelativeDate,
  MasteryProgressBar,
  ReasoningCategoryHeading,
} from "./StatusIndicator";

interface LearnViewProps {
  student: Student;
  focusedConceptId: string | null;
  sessionMode: "adaptive" | "revision";
  onClearFocusedConcept: () => void;
  onRecordAttempt: (updatedStudent: Student, attempt: Attempt) => void;
  onInspectConcept: (conceptId: string) => void;
}

export function LearnView({
  student,
  focusedConceptId,
  sessionMode,
  onClearFocusedConcept,
  onRecordAttempt,
  onInspectConcept,
}: LearnViewProps) {
  const [seenQuestionIds, setSeenQuestionIds] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>(() => {
    const sel = selectNextAdaptiveTarget(student, {
      forcedConceptId: focusedConceptId,
    });
    return sel.fallbackQuestion;
  });
  const [selectionReason, setSelectionReason] = useState<string>(() => {
    const sel = selectNextAdaptiveTarget(student, {
      forcedConceptId: focusedConceptId,
    });
    return sel.selectionReason;
  });

  // Form state
  const [studentAnswer, setStudentAnswer] = useState("");
  const [studentReasoning, setStudentReasoning] = useState("");
  const [confidence, setConfidence] = useState<ConfidenceLevel>("medium");
  const [isReviewingTranscript, setIsReviewingTranscript] = useState(false);

  // Loading & feedback states
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingAiQuestion, setIsGeneratingAiQuestion] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Post-submission result state
  const [completedAttempt, setCompletedAttempt] = useState<Attempt | null>(
    null
  );
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpRevealed, setFollowUpRevealed] = useState(false);
  const [clarificationDraft, setClarificationDraft] = useState("");

  // Re-sync when external navigation focuses a specific concept (e.g., "Review now" or Concept Map click)
  useEffect(() => {
    if (focusedConceptId) {
      const sel = selectNextAdaptiveTarget(student, {
        forcedConceptId: focusedConceptId,
        excludeQuestionIds: seenQuestionIds,
      });
      setCurrentQuestion(sel.fallbackQuestion);
      setSelectionReason(
        sessionMode === "revision"
          ? `Spaced-repetition review session for ${sel.concept.name} (Mastery ${sel.concept.masteryScore}%).`
          : sel.selectionReason
      );
      resetAttemptInputs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedConceptId, sessionMode]);

  function resetAttemptInputs() {
    setStudentAnswer("");
    setStudentReasoning("");
    setConfidence("medium");
    setIsReviewingTranscript(false);
    setValidationError(null);
    setAiNotice(null);
    setCompletedAttempt(null);
    setFollowUpInput("");
    setFollowUpRevealed(false);
    setClarificationDraft("");
  }

  const activeConcept =
    student.concepts[currentQuestion.conceptId] ??
    Object.values(student.concepts)[0];

  function handleLoadSampleDictation() {
    if (currentQuestion.sampleDictatedMisconception) {
      setStudentAnswer(currentQuestion.sampleDictatedMisconception.answer);
      setStudentReasoning(
        currentQuestion.sampleDictatedMisconception.reasoning
      );
    } else {
      // Fallback realistic Wispr Flow conversational sample for any DBMS question
      const distractor =
        currentQuestion.type === "multiple_choice" &&
        currentQuestion.options &&
        currentQuestion.options.length > 1
          ? currentQuestion.options.find(
              (o) => o !== currentQuestion.expectedAnswer
            ) ?? currentQuestion.options[0]
          : "superkey";
      setStudentAnswer(distractor);
      setStudentReasoning(
        `Um, let me think through ${activeConcept.shortName} out loud—at first glance I think a superkey and a candidate key are the same because both uniquely identify a row, wait, or looking at this specific case I'm leaning toward "${distractor}" because the primary condition seems satisfied without checking extra edge cases.`
      );
    }
    setValidationError(null);
    setIsReviewingTranscript(true);
  }

  async function handleRequestAiQuestion() {
    setIsGeneratingAiQuestion(true);
    setAiNotice(null);

    const sel = selectNextAdaptiveTarget(student, {
      forcedConceptId: focusedConceptId ?? activeConcept.id,
      excludeQuestionIds: [...seenQuestionIds, currentQuestion.id],
    });

    const recentPrompts = [
      currentQuestion.prompt,
      ...student.attempts.slice(0, 5).map((a) => a.questionPrompt),
    ];

    const { question, error } = await generateAdaptiveQuestionFromAi({
      conceptId: sel.concept.id,
      conceptName: sel.concept.name,
      targetDifficulty: sel.targetDifficulty,
      recentMisconceptions: sel.activeMisconceptions,
      avoidPrompts: recentPrompts,
      preferredType:
        Math.random() > 0.35 ? "multiple_choice" : "short_answer",
    });

    setIsGeneratingAiQuestion(false);

    if (question) {
      setSeenQuestionIds((prev) => [...prev, currentQuestion.id]);
      setCurrentQuestion(question);
      setSelectionReason(
        `Gemini-generated Level ${question.difficulty} question calibrated for ${sel.concept.name}.`
      );
      resetAttemptInputs();
    } else {
      setSeenQuestionIds((prev) => [...prev, currentQuestion.id]);
      setCurrentQuestion(sel.fallbackQuestion);
      setSelectionReason(sel.selectionReason);
      resetAttemptInputs();
      setAiNotice(
        error ||
          "AI question service unavailable—loaded calibrated question from local DBMS bank."
      );
    }
  }

  async function handleSubmitEvaluation(overrideReasoning?: string) {
    const trimmedAnswer = studentAnswer.trim();
    const effectiveReasoning = (overrideReasoning ?? studentReasoning).trim();

    if (!trimmedAnswer) {
      setValidationError(
        "Please select or enter your final answer before submitting."
      );
      return;
    }

    setValidationError(null);
    setIsEvaluating(true);
    setAiNotice(null);

    const priorMisconceptions = activeConcept.knownMisconceptions
      .filter((m) => !m.resolved)
      .map((m) => m.description);

    const { evalResult, usedFallback, fallbackReason } =
      await evaluateAttemptWithTutor({
        question: currentQuestion,
        conceptName: activeConcept.name,
        studentAnswer: trimmedAnswer,
        studentReasoning: effectiveReasoning,
        confidence,
        priorMastery: activeConcept.masteryScore,
        knownMisconceptions: priorMisconceptions,
      });

    if (usedFallback && fallbackReason) {
      setAiNotice(
        `Evaluated with deterministic local misconception engine (${fallbackReason})`
      );
    }

    const { updatedStudent, completedAttempt: recorded } =
      applyAttemptToStudent({
        student,
        question: currentQuestion,
        studentAnswer: trimmedAnswer,
        studentReasoning: effectiveReasoning,
        confidence,
        mode: sessionMode,
        rawEval: evalResult,
      });

    onRecordAttempt(updatedStudent, recorded);
    setCompletedAttempt(recorded);
    setIsEvaluating(false);
    setIsReviewingTranscript(false);
  }

  function handleNextAdaptiveQuestion() {
    const nextExclude = [...seenQuestionIds, currentQuestion.id];
    setSeenQuestionIds(nextExclude);

    // Clear forced concept after completing a targeted question so true adaptive routing takes over
    if (focusedConceptId) {
      onClearFocusedConcept();
    }

    const nextTarget = selectNextAdaptiveTarget(student, {
      forcedConceptId: null,
      excludeQuestionIds: nextExclude,
    });

    setCurrentQuestion(nextTarget.fallbackQuestion);
    setSelectionReason(nextTarget.selectionReason);
    resetAttemptInputs();
  }

  const distilledPreview = summarizeConversationalReasoning(studentReasoning);
  const wordCount = studentReasoning.trim()
    ? studentReasoning.trim().split(/\s+/).length
    : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Adaptive Context Strip */}
      <section className="bg-[#0F1626] border border-slate-800/90 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => onInspectConcept(activeConcept.id)}
              className="font-semibold text-indigo-300 hover:text-indigo-200 transition-colors"
            >
              {activeConcept.name}
            </button>
            <span aria-hidden="true">·</span>
            <ConceptStatusLabel status={activeConcept.status} />
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-300">
              Mastery {activeConcept.masteryScore}%
            </span>
            <span aria-hidden="true">·</span>
            <DifficultyText level={currentQuestion.difficulty} />
            {currentQuestion.isAiGenerated && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-violet-300">AI Calibrated Item</span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-400">{selectionReason}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {focusedConceptId && (
            <button
              type="button"
              onClick={() => {
                onClearFocusedConcept();
                const sel = selectNextAdaptiveTarget(student, {
                  forcedConceptId: null,
                  excludeQuestionIds: [...seenQuestionIds, currentQuestion.id],
                });
                setCurrentQuestion(sel.fallbackQuestion);
                setSelectionReason(sel.selectionReason);
                resetAttemptInputs();
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              Switch to Auto-Adaptive
            </button>
          )}

          <button
            type="button"
            disabled={isGeneratingAiQuestion || isEvaluating}
            onClick={handleRequestAiQuestion}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-100 bg-slate-800/90 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {isGeneratingAiQuestion ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            )}
            <span>
              {isGeneratingAiQuestion
                ? "Generating Question..."
                : "Generate Fresh AI Question"}
            </span>
          </button>
        </div>
      </section>

      {aiNotice && (
        <div
          role="status"
          className="bg-slate-900/90 border border-slate-700/80 rounded-lg px-4 py-3 flex items-start gap-2.5 text-xs text-slate-300"
        >
          <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>{aiNotice}</span>
        </div>
      )}

      {/* Main Question & Dictation-Compatible Submission Card */}
      <section className="bg-[#0F1626] border border-slate-800/90 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-slate-400">
              {currentQuestion.type === "multiple_choice"
                ? "Multiple-Choice + Reasoning Check"
                : "Short-Answer + Reasoning Check"}
            </span>
            {!completedAttempt && (
              <button
                type="button"
                onClick={handleLoadSampleDictation}
                className="text-xs font-medium text-violet-300 hover:text-violet-200 underline underline-offset-4 transition-colors whitespace-nowrap"
              >
                {currentQuestion.sampleDictatedMisconception?.label ??
                  "Load sample dictated misconception"}
              </button>
            )}
          </div>

          <h1 className="text-lg sm:text-xl font-semibold text-slate-50 leading-snug">
            {currentQuestion.prompt}
          </h1>
        </div>

        {/* Step 1: Prominent Final Answer Input */}
        <div className="space-y-2.5">
          <label
            htmlFor="learn-final-answer"
            className="block text-sm font-semibold text-slate-100"
          >
            1. Your Final Answer
          </label>

          {currentQuestion.type === "multiple_choice" &&
          currentQuestion.options ? (
            <fieldset disabled={Boolean(completedAttempt)} className="space-y-2">
              <legend className="sr-only">Choose one final answer</legend>
              {currentQuestion.options.map((option, idx) => {
                const isSelected = studentAnswer === option;
                const isExpected =
                  completedAttempt && option === currentQuestion.expectedAnswer;
                const isWrongSelected =
                  completedAttempt &&
                  isSelected &&
                  !completedAttempt.evaluation.isAnswerCorrect;

                return (
                  <label
                    key={option}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border transition-colors ${
                      completedAttempt
                        ? isExpected
                          ? "bg-emerald-950/30 border-emerald-500/70 text-emerald-100"
                          : isWrongSelected
                            ? "bg-rose-950/30 border-rose-500/70 text-rose-100"
                            : "bg-slate-950/40 border-slate-800/80 text-slate-400"
                        : isSelected
                          ? "bg-indigo-950/50 border-indigo-500 text-slate-50 cursor-pointer"
                          : "bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-200 cursor-pointer"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`learn-q-${currentQuestion.id}`}
                      value={option}
                      checked={isSelected}
                      onChange={() => {
                        setStudentAnswer(option);
                        setValidationError(null);
                      }}
                      className="mt-1 accent-indigo-500 shrink-0"
                    />
                    <span className="text-sm leading-relaxed">
                      <span className="font-mono text-xs text-slate-400 mr-2">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {option}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ) : (
            <input
              id="learn-final-answer"
              type="text"
              disabled={Boolean(completedAttempt)}
              value={studentAnswer}
              onChange={(e) => {
                setStudentAnswer(e.target.value);
                setValidationError(null);
              }}
              placeholder="Type or dictate your concise final answer..."
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
            />
          )}
        </div>

        {/* Step 2: Wispr Flow Dictation-First Reasoning Textarea */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label
              htmlFor="learn-reasoning-textarea"
              className="text-sm font-semibold text-slate-100"
            >
              2. Explain Your Reasoning (Wispr Flow Compatible)
            </label>
            <span className="text-xs text-slate-400 tabular-nums">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
          </div>

          {/* Explicit Wispr Flow system-dictation instruction */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex items-start gap-3 text-xs text-slate-300">
            <MessageSquareQuote className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-100 font-medium">
                Voice-first workflow:
              </strong>{" "}
              Speak naturally using{" "}
              <span className="text-indigo-300 font-medium">Wispr Flow</span>{" "}
              system dictation with your cursor in the box below. Explain how
              you reached your answer—even if you pause, think aloud, or
              self-correct. Review your transcription, then submit.
            </p>
          </div>

          <textarea
            id="learn-reasoning-textarea"
            rows={4}
            disabled={Boolean(completedAttempt)}
            value={studentReasoning}
            onChange={(e) => setStudentReasoning(e.target.value)}
            placeholder="Click here and dictate via Wispr Flow (or type) why your answer holds and why other choices fail..."
            className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700 rounded-lg text-sm text-slate-100 leading-relaxed placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60 resize-y"
          />

          {/* Review & Edit Dictated Transcription Stage */}
          {!completedAttempt && studentReasoning.trim().length > 0 && (
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-lg p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Transcription Review Preview (Conversational Filler
                    Distilled)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReviewingTranscript((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                >
                  <Edit3 className="w-3 h-3 shrink-0" />
                  <span>
                    {isReviewingTranscript ? "Hide Review Note" : "Verify & Edit"}
                  </span>
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {distilledPreview}
              </p>
              {isReviewingTranscript && (
                <p className="text-xs text-slate-400">
                  Edit any misheard DBMS terms (such as{" "}
                  <span className="font-mono text-slate-300">BCNF</span>,{" "}
                  <span className="font-mono text-slate-300">superkey</span>, or{" "}
                  <span className="font-mono text-slate-300">HAVING</span>) in
                  the textarea above before submitting.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Optional Confidence Rating + Submit */}
        {!completedAttempt && (
          <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-400">
                3. Confidence Estimate (Optional — calibrates difficulty)
              </span>
              <div
                role="group"
                aria-label="Confidence level"
                className="inline-flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg"
              >
                {(
                  [
                    { id: "low", label: "Low · Unsure" },
                    { id: "medium", label: "Medium · Fairly Sure" },
                    { id: "high", label: "High · Certain" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setConfidence(item.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      confidence === item.id
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              {!isReviewingTranscript && studentReasoning.trim().length > 20 && (
                <button
                  type="button"
                  onClick={() => setIsReviewingTranscript(true)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  Review Transcription
                </button>
              )}

              <button
                type="button"
                disabled={isEvaluating}
                onClick={() => handleSubmitEvaluation()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Evaluating Answer & Reasoning...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Answer & Reasoning</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {validationError && (
          <p role="alert" className="text-xs font-medium text-rose-400">
            {validationError}
          </p>
        )}
      </section>

      {/* Structured Assessment & Mastery Update Panel */}
      {completedAttempt && (
        <section
          aria-live="polite"
          className="bg-[#0F1626] border border-slate-800/90 rounded-xl divide-y divide-slate-800/80"
        >
          {/* Verdict Header */}
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                {completedAttempt.evaluation.isAnswerCorrect ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Final Answer Correct</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-400">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Final Answer Incorrect</span>
                  </span>
                )}
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <ReasoningCategoryHeading
                  category={completedAttempt.evaluation.reasoningCategory}
                />
              </div>

              <p className="text-xs text-slate-400 tabular-nums">
                Reasoning Quality Score:{" "}
                <span className="text-slate-200 font-mono">
                  {completedAttempt.evaluation.reasoningScore}/100
                </span>{" "}
                · Evaluated via{" "}
                {completedAttempt.evaluation.source === "gemini"
                  ? "Gemini 3.8 Flash + Deterministic Mastery Guard"
                  : "Deterministic Local DBMS Evaluator"}
              </p>
            </div>

            {/* Deterministic Mastery Change Box */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg px-4 py-3 flex items-center gap-4 shrink-0">
              <div>
                <p className="text-xs text-slate-400">Concept Mastery</p>
                <div className="flex items-baseline gap-2 font-mono tabular-nums mt-0.5">
                  <span className="text-sm text-slate-400">
                    {completedAttempt.evaluation.priorMastery}%
                  </span>
                  <span className="text-slate-600">→</span>
                  <span className="text-lg font-bold text-slate-50">
                    {completedAttempt.evaluation.updatedMastery}%
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      completedAttempt.evaluation.appliedMasteryDelta > 0
                        ? "text-emerald-400"
                        : completedAttempt.evaluation.appliedMasteryDelta < 0
                          ? "text-rose-400"
                          : "text-slate-400"
                    }`}
                  >
                    (
                    {completedAttempt.evaluation.appliedMasteryDelta >= 0
                      ? `+${completedAttempt.evaluation.appliedMasteryDelta}`
                      : completedAttempt.evaluation.appliedMasteryDelta}
                    %)
                  </span>
                </div>
              </div>
              <div className="w-24 hidden sm:block">
                <MasteryProgressBar
                  score={completedAttempt.evaluation.updatedMastery}
                  status={activeConcept.status}
                  size="sm"
                />
                <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                  Next review: {formatRelativeDate(activeConcept.nextReviewDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Reasoning Distillation & Misconception Diagnosis */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-300">
                What We Extracted From Your Reasoning
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/50 border border-slate-800/80 rounded-lg p-3.5">
                {completedAttempt.evaluation.cleanedReasoningSummary}
              </p>

              <div className="text-xs text-slate-400 space-y-1">
                <p>
                  <span className="text-slate-300 font-medium">
                    Expected Answer:
                  </span>{" "}
                  <span className="font-mono text-emerald-300">
                    {currentQuestion.expectedAnswer}
                  </span>
                </p>
                <p>
                  <span className="text-slate-300 font-medium">
                    Diagnostic Evidence:
                  </span>{" "}
                  {completedAttempt.evaluation.diagnosisEvidence}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-300">
                Tutor Explanation & Concept Remediation
              </h3>
              {completedAttempt.evaluation.detectedMisconception && (
                <div className="bg-rose-950/25 border border-rose-800/60 rounded-lg p-3.5 space-y-1">
                  <p className="text-xs font-semibold text-rose-300">
                    Detected Misconception Logged to Concept Profile
                  </p>
                  <p className="text-xs text-rose-100/90 leading-relaxed">
                    {completedAttempt.evaluation.detectedMisconception}
                  </p>
                </div>
              )}
              <p className="text-sm text-slate-200 leading-relaxed">
                {completedAttempt.evaluation.explanation}
              </p>
            </div>
          </div>

          {/* Clarifying Question Flow when reasoning was ambiguous/incomplete */}
          {completedAttempt.evaluation.clarifyingQuestion && (
            <div className="p-6 bg-indigo-950/15 space-y-3">
              <div className="flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-violet-300">
                    Clarifying Question (Ambiguous or Brief Reasoning)
                  </h3>
                  <p className="text-sm text-slate-200">
                    {completedAttempt.evaluation.clarifyingQuestion}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <input
                  type="text"
                  value={clarificationDraft}
                  onChange={(e) => setClarificationDraft(e.target.value)}
                  placeholder="Dictate or type a quick clarification to refine your reasoning evaluation..."
                  className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  disabled={!clarificationDraft.trim() || isEvaluating}
                  onClick={() => {
                    const combined = `${studentReasoning.trim()} Clarification: ${clarificationDraft.trim()}`.trim();
                    setStudentReasoning(combined);
                    setClarificationDraft("");
                    handleSubmitEvaluation(combined);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span>Re-evaluate With Clarification</span>
                </button>
              </div>
            </div>
          )}

          {/* Targeted Micro Follow-Up Check & Next Adaptive Step */}
          <div className="p-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2.5 flex-1">
              <p className="text-xs font-semibold text-indigo-300">
                Recommended Follow-Up Verification Check
              </p>
              <p className="text-sm text-slate-200">
                {completedAttempt.evaluation.followUpQuestion.prompt}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-1 max-w-xl">
                <input
                  type="text"
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  placeholder="Try answering the follow-up check (optional)..."
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setFollowUpRevealed((v) => !v)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {followUpRevealed ? "Hide Check Key" : "Check Answer / Hint"}
                </button>
              </div>
              {followUpRevealed && (
                <div className="text-xs text-slate-300 bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1 max-w-xl">
                  <p>
                    <span className="text-slate-400">Hint: </span>
                    {completedAttempt.evaluation.followUpQuestion.hint}
                  </p>
                  <p>
                    <span className="text-slate-400">Reference Check: </span>
                    <span className="text-emerald-300 font-mono">
                      {
                        completedAttempt.evaluation.followUpQuestion
                          .expectedAnswer
                      }
                    </span>
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextAdaptiveQuestion}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start lg:self-end"
            >
              <span>Next Adaptive Question</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
