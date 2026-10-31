import {
  Attempt,
  Concept,
  ConfidenceLevel,
  DiagnosticAnswerRecord,
  DiagnosticSummary,
  DifficultyLevel,
  Evaluation,
  Misconception,
  Question,
  RevisionTask,
  Student,
} from "../types";
import { QUESTION_BANK } from "../data/questionBank";
import {
  CONCEPT_ORDER,
  getMasteryStatus,
  SYLLABUS_CONCEPTS,
} from "../data/syllabus";
import { checkAnswerEquivalence } from "./localEvaluator";

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function toDateOnlyISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(baseIso: string, days: number): string {
  const d = new Date(baseIso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function daysBetweenFromNow(targetIso: string | null, now = new Date()): number {
  if (!targetIso) return 0;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(targetIso);
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();
  return Math.round((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24));
}

/**
 * DETERMINISTIC MASTERY SCORING ALGORITHM
 * ---------------------------------------
 * Uses AI evaluation strictly as bounded evidence rather than sole authority:
 * 1. Base delta determined by (isAnswerCorrect × reasoningCategory × difficultyMultiplier).
 * 2. Damping near boundaries [0, 100] prevents single-question jumps to 100 or drops to 0.
 * 3. Correct answers with faulty reasoning receive near-zero gain (+1 max) so lucky guesses
 *    or misconceptions never inflate mastery.
 * 4. High-confidence wrong answers apply a mild overconfidence correction (-2).
 * 5. Validated AI suggestedMasteryDelta (clamped [-15, 15]) blends at 25% weight.
 * 6. Final single-attempt delta is strictly bounded in [-16, +16] and mastery in [0, 100].
 */
export function computeDeterministicMasteryUpdate(params: {
  priorMastery: number;
  difficulty: DifficultyLevel;
  confidence: ConfidenceLevel;
  rawEval: Omit<
    Evaluation,
    "appliedMasteryDelta" | "priorMastery" | "updatedMastery"
  >;
}): { updatedMastery: number; appliedDelta: number; updatedConfidence: number } {
  const { priorMastery, difficulty, confidence, rawEval } = params;
  const diffScale = difficulty === 3 ? 1.25 : difficulty === 2 ? 1.1 : 0.95;

  let algorithmicDelta = 0;

  switch (rawEval.reasoningCategory) {
    case "sound":
      algorithmicDelta = rawEval.isAnswerCorrect
        ? Math.round((10 + (rawEval.reasoningScore - 70) * 0.12) * diffScale)
        : -3;
      break;
    case "correct_answer_faulty_reasoning":
      // Do NOT reward lucky guesses or flawed reasoning even when final choice matched!
      algorithmicDelta = 1;
      break;
    case "incorrect_answer_sound_reasoning":
      algorithmicDelta = -4;
      break;
    case "careless_error":
      algorithmicDelta = -4;
      break;
    case "incomplete_explanation":
      algorithmicDelta = rawEval.isAnswerCorrect ? Math.round(5 * diffScale) : -7;
      break;
    case "ambiguous":
      algorithmicDelta = rawEval.isAnswerCorrect ? 3 : -6;
      break;
    case "conceptual_misunderstanding":
    default:
      algorithmicDelta = -Math.round(10 * diffScale);
      break;
  }

  // Overconfidence calibration
  if (!rawEval.isAnswerCorrect && confidence === "high") {
    algorithmicDelta -= 2;
  } else if (
    rawEval.isAnswerCorrect &&
    rawEval.reasoningCategory === "sound" &&
    confidence === "high"
  ) {
    algorithmicDelta += 1;
  }

  // Boundary damping: harder to gain the final points above 85
  if (algorithmicDelta > 0 && priorMastery >= 82) {
    algorithmicDelta = Math.max(2, Math.round(algorithmicDelta * 0.65));
  }

  const boundedAiSuggestion = clamp(rawEval.suggestedMasteryDelta, -15, 15);
  const blendedDelta = clamp(
    Math.round(algorithmicDelta * 0.75 + boundedAiSuggestion * 0.25),
    -16,
    16
  );

  // Enforce guard: correct_answer_faulty_reasoning never gains > +2
  const guardedDelta =
    rawEval.reasoningCategory === "correct_answer_faulty_reasoning"
      ? Math.min(2, blendedDelta)
      : blendedDelta;

  const updatedMastery = clamp(priorMastery + guardedDelta, 0, 100);
  const appliedDelta = updatedMastery - priorMastery;

  const confTarget =
    confidence === "high" ? 85 : confidence === "medium" ? 60 : 35;
  const accuracyPull = rawEval.isAnswerCorrect ? 10 : -15;
  const updatedConfidence = clamp(
    Math.round(priorMastery * 0.4 + confTarget * 0.4 + accuracyPull + 15),
    15,
    98
  );

  return { updatedMastery, appliedDelta, updatedConfidence };
}

/**
 * SPACED REPETITION SCHEDULER
 * ---------------------------
 * Calculates next review interval based on updated mastery, reasoning quality,
 * consecutive sound answers, and repeated mistakes.
 */
export function computeRevisionTask(params: {
  concept: Concept;
  existingTask?: RevisionTask;
  nowIso: string;
  wasSoundAndCorrect: boolean;
}): RevisionTask {
  const { concept, existingTask, nowIso, wasSoundAndCorrect } = params;
  const prevCount = existingTask?.reviewCount ?? 0;

  let intervalDays = 1;
  let priority: RevisionTask["priority"] = "normal";
  let reason = "";

  if (concept.recentMistakeCount >= 2) {
    // Repeated mistakes shorten interval immediately to 0-1 day high priority
    intervalDays = 0; // Due immediately / today
    priority = "high";
    reason = `${concept.recentMistakeCount} recent mistakes recorded—immediate reinforcement scheduled.`;
  } else if (concept.status === "Weak") {
    intervalDays = 1;
    priority = "high";
    reason = `Weak mastery (${concept.masteryScore}%)—early 24h spaced review.`;
  } else if (concept.status === "Developing") {
    intervalDays = wasSoundAndCorrect
      ? Math.min(5, 3 + concept.consecutiveSoundCount)
      : 2;
    priority = "normal";
    reason = `Developing mastery (${concept.masteryScore}%)—scheduled ${intervalDays}-day consolidation review.`;
  } else {
    // Mastered (>= 80)
    const streakBonus = Math.min(14, concept.consecutiveSoundCount * 4);
    intervalDays = wasSoundAndCorrect ? 7 + streakBonus : 5;
    priority = "normal";
    reason = `Mastered (${concept.masteryScore}%)—long-interval retention check in ${intervalDays} days.`;
  }

  const scheduledDate = addDaysISO(nowIso, intervalDays);

  return {
    id: `rev-${concept.id}`,
    conceptId: concept.id,
    scheduledDate,
    intervalDays,
    priority,
    reason,
    lastCompletedDate: nowIso,
    reviewCount: prevCount + 1,
  };
}

/**
 * Applies a completed adaptive or revision attempt to the Student state,
 * updating concept mastery, misconception history, streak days, and revision tasks.
 */
export function applyAttemptToStudent(params: {
  student: Student;
  question: Question;
  studentAnswer: string;
  studentReasoning: string;
  confidence: ConfidenceLevel;
  mode: "adaptive" | "revision";
  rawEval: Omit<
    Evaluation,
    "appliedMasteryDelta" | "priorMastery" | "updatedMastery"
  >;
  now?: Date;
}): { updatedStudent: Student; completedAttempt: Attempt } {
  const {
    student,
    question,
    studentAnswer,
    studentReasoning,
    confidence,
    mode,
    rawEval,
    now = new Date(),
  } = params;

  const nowIso = now.toISOString();
  const todayStr = toDateOnlyISO(now);

  const prevConcept = student.concepts[question.conceptId];
  const priorMastery = prevConcept?.masteryScore ?? 40;

  const { updatedMastery, appliedDelta, updatedConfidence } =
    computeDeterministicMasteryUpdate({
      priorMastery,
      difficulty: question.difficulty,
      confidence,
      rawEval,
    });

  const evaluation: Evaluation = {
    ...rawEval,
    priorMastery,
    updatedMastery,
    appliedMasteryDelta: appliedDelta,
  };

  const wasSoundAndCorrect =
    evaluation.isAnswerCorrect && evaluation.reasoningCategory === "sound";

  // Update persistent misconception history on this concept
  const updatedMisconceptions: Misconception[] = (
    prevConcept.knownMisconceptions ?? []
  ).map((m) => ({ ...m }));

  if (evaluation.detectedMisconception && evaluation.misconceptionTag) {
    const existingIdx = updatedMisconceptions.findIndex(
      (m) => m.tag === evaluation.misconceptionTag
    );
    if (existingIdx >= 0) {
      const existing = updatedMisconceptions[existingIdx];
      updatedMisconceptions[existingIdx] = {
        ...existing,
        description: evaluation.detectedMisconception,
        evidence: evaluation.diagnosisEvidence,
        occurrences: existing.occurrences + 1,
        lastDetectedAt: nowIso,
        resolved: false,
      };
    } else {
      updatedMisconceptions.unshift({
        id: `misc-${question.conceptId}-${Date.now()}`,
        tag: evaluation.misconceptionTag,
        conceptId: question.conceptId,
        description: evaluation.detectedMisconception,
        evidence: evaluation.diagnosisEvidence,
        occurrences: 1,
        firstDetectedAt: nowIso,
        lastDetectedAt: nowIso,
        resolved: false,
      });
    }
  } else if (wasSoundAndCorrect && updatedMisconceptions.length > 0) {
    // If student answered a question covering a known misconception tag soundly, mark resolved!
    for (let i = 0; i < updatedMisconceptions.length; i++) {
      if (
        question.misconceptionTags.includes(updatedMisconceptions[i].tag) ||
        updatedMastery >= 80
      ) {
        updatedMisconceptions[i] = {
          ...updatedMisconceptions[i],
          resolved: true,
        };
      }
    }
  }

  const nextConcept: Concept = {
    ...prevConcept,
    masteryScore: updatedMastery,
    status: getMasteryStatus(updatedMastery),
    confidenceEstimate: updatedConfidence,
    questionsAttempted: prevConcept.questionsAttempted + 1,
    correctAnswers:
      prevConcept.correctAnswers + (evaluation.isAnswerCorrect ? 1 : 0),
    consecutiveSoundCount: wasSoundAndCorrect
      ? prevConcept.consecutiveSoundCount + 1
      : 0,
    recentMistakeCount: evaluation.isAnswerCorrect
      ? Math.max(0, prevConcept.recentMistakeCount - 1)
      : prevConcept.recentMistakeCount + 1,
    lastReviewedDate: nowIso,
    nextReviewDate: null, // populated below from revisionTask
    knownMisconceptions: updatedMisconceptions,
  };

  const nextRevisionTask = computeRevisionTask({
    concept: nextConcept,
    existingTask: student.revisionTasks[nextConcept.id],
    nowIso,
    wasSoundAndCorrect,
  });

  nextConcept.nextReviewDate = nextRevisionTask.scheduledDate;

  const completedAttempt: Attempt = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    questionId: question.id,
    questionPrompt: question.prompt,
    conceptId: question.conceptId,
    difficulty: question.difficulty,
    studentAnswer,
    studentReasoning,
    confidence,
    timestamp: nowIso,
    mode,
    evaluation,
  };

  const activeDaysSet = new Set(student.activeDays);
  activeDaysSet.add(todayStr);

  const updatedStudent: Student = {
    ...student,
    activeDays: Array.from(activeDaysSet).sort(),
    concepts: {
      ...student.concepts,
      [nextConcept.id]: nextConcept,
    },
    attempts: [completedAttempt, ...student.attempts],
    revisionTasks: {
      ...student.revisionTasks,
      [nextConcept.id]: nextRevisionTask,
    },
  };

  return { updatedStudent, completedAttempt };
}

/**
 * Evaluates a completed 10-question Diagnostic Test, computing independent initial
 * mastery for each concept and generating a dependency-aware personalized study plan.
 */
export function evaluateDiagnosticSubmission(params: {
  student: Student;
  questions: Question[];
  responses: Record<string, string>;
  now?: Date;
}): { updatedStudent: Student; summary: DiagnosticSummary } {
  const { student, questions, responses, now = new Date() } = params;
  const nowIso = now.toISOString();
  const todayStr = toDateOnlyISO(now);

  const answerRecords: DiagnosticAnswerRecord[] = [];
  let correctCount = 0;

  const nextConcepts: Record<string, Concept> = { ...student.concepts };
  const nextRevisionTasks: Record<string, RevisionTask> = {
    ...student.revisionTasks,
  };

  for (const q of questions) {
    const rawAns = (responses[q.id] ?? "").trim();
    // Unanswered questions are strictly marked incorrect!
    const isCorrect = rawAns.length > 0 && checkAnswerEquivalence(q, rawAns);
    if (isCorrect) correctCount += 1;

    answerRecords.push({
      questionId: q.id,
      conceptId: q.conceptId,
      difficulty: q.difficulty,
      studentAnswer: rawAns,
      isCorrect,
      expectedAnswer: q.expectedAnswer,
      explanation: q.explanation,
    });

    const prev = nextConcepts[q.conceptId];
    if (!prev) continue;

    // Independent per-concept initial mastery calculation based on question difficulty & prior attempts
    const diagScore = isCorrect
      ? q.difficulty === 3
        ? 84
        : q.difficulty === 2
          ? 78
          : 74
      : rawAns.length === 0
        ? 22
        : 32;

    const blendedMastery =
      prev.questionsAttempted > 0
        ? clamp(Math.round(prev.masteryScore * 0.45 + diagScore * 0.55), 0, 100)
        : diagScore;

    const updatedMisconceptions = [...prev.knownMisconceptions];
    if (!isCorrect && q.misconceptionTags[0]) {
      const tag = q.misconceptionTags[0];
      if (!updatedMisconceptions.some((m) => m.tag === tag)) {
        updatedMisconceptions.unshift({
          id: `diag-misc-${q.conceptId}-${Date.now()}`,
          tag,
          conceptId: q.conceptId,
          description:
            rawAns.length === 0
              ? `Skipped diagnostic check on ${prev.name}.`
              : `Diagnostic gap on ${prev.name} (${tag.replace(/-/g, " ")}).`,
          evidence:
            rawAns.length === 0
              ? "Question left unanswered during diagnostic."
              : `Diagnostic response "${rawAns}" did not match "${q.expectedAnswer}".`,
          occurrences: 1,
          firstDetectedAt: nowIso,
          lastDetectedAt: nowIso,
          resolved: false,
        });
      }
    }

    const updatedConcept: Concept = {
      ...prev,
      masteryScore: blendedMastery,
      status: getMasteryStatus(blendedMastery),
      confidenceEstimate: isCorrect ? 74 : 36,
      questionsAttempted: prev.questionsAttempted + 1,
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      consecutiveSoundCount: isCorrect ? 1 : 0,
      recentMistakeCount: isCorrect ? 0 : prev.recentMistakeCount + 1,
      lastReviewedDate: nowIso,
      nextReviewDate: null,
      knownMisconceptions: updatedMisconceptions,
    };

    const revTask = computeRevisionTask({
      concept: updatedConcept,
      existingTask: nextRevisionTasks[q.conceptId],
      nowIso,
      wasSoundAndCorrect: isCorrect,
    });
    updatedConcept.nextReviewDate = revTask.scheduledDate;

    nextConcepts[q.conceptId] = updatedConcept;
    nextRevisionTasks[q.conceptId] = revTask;
  }

  // Topological weak concepts & personalized study plan
  const weakConceptIds = CONCEPT_ORDER.filter(
    (id) => nextConcepts[id].masteryScore < 65
  );

  const recommendedPlan = CONCEPT_ORDER.filter(
    (id) => nextConcepts[id].masteryScore < 80
  )
    .sort((a, b) => {
      const ca = nextConcepts[a];
      const cb = nextConcepts[b];
      // Prioritize foundational tiers first when weak so prerequisites come before dependents!
      if (ca.status !== cb.status) {
        if (ca.status === "Weak") return -1;
        if (cb.status === "Weak") return 1;
      }
      return ca.tier - cb.tier || ca.masteryScore - cb.masteryScore;
    })
    .slice(0, 5)
    .map((id) => {
      const c = nextConcepts[id];
      const unmasteredPrereqs = c.prerequisiteIds
        .filter((pid) => nextConcepts[pid]?.masteryScore < 65)
        .map((pid) => nextConcepts[pid].shortName);

      return {
        conceptId: id,
        reason:
          unmasteredPrereqs.length > 0
            ? `Mastery at ${c.masteryScore}% (depends on strengthening ${unmasteredPrereqs.join(", ")}).`
            : `Diagnostic mastery at ${c.masteryScore}%—${
                c.status === "Weak"
                  ? "core conceptual gap detected"
                  : "ready to push to full mastery"
              }.`,
        targetAction:
          c.status === "Weak"
            ? "Start guided foundation + misconception check"
            : "Complete exam-standard reasoning drill",
      };
    });

  const summary: DiagnosticSummary = {
    completedAt: nowIso,
    totalQuestions: questions.length,
    correctCount,
    weakConceptIds,
    recommendedPlan,
    answers: answerRecords,
  };

  const activeDaysSet = new Set(student.activeDays);
  activeDaysSet.add(todayStr);

  const updatedStudent: Student = {
    ...student,
    diagnosticCompleted: true,
    lastDiagnosticSummary: summary,
    activeDays: Array.from(activeDaysSet).sort(),
    concepts: nextConcepts,
    revisionTasks: nextRevisionTasks,
  };

  return { updatedStudent, summary };
}

export interface AdaptiveSelectionResult {
  concept: Concept;
  targetDifficulty: DifficultyLevel;
  selectionReason: string;
  fallbackQuestion: Question;
  activeMisconceptions: string[];
}

/**
 * ADAPTIVE NEXT-CONCEPT & DIFFICULTY CALIBRATION ENGINE
 * -----------------------------------------------------
 * Prioritizes:
 * 1. Unmastered prerequisite concepts blocking a struggling concept.
 * 2. Concepts with unresolved / repeated misconceptions.
 * 3. Overdue or due-today revision tasks.
 * 4. Lowest mastery score & calibrated difficulty from recent streak.
 */
export function selectNextAdaptiveTarget(
  student: Student,
  options?: {
    forcedConceptId?: string | null;
    excludeQuestionIds?: string[];
    now?: Date;
  }
): AdaptiveSelectionResult {
  const now = options?.now ?? new Date();
  const excludeIds = new Set(options?.excludeQuestionIds ?? []);
  const concepts = student.concepts;

  let chosenConceptId = options?.forcedConceptId ?? null;
  let selectionReason = "";

  // If forced concept has a Weak prerequisite (< 50%) and user didn't already master it, note or honor explicit request
  if (chosenConceptId && concepts[chosenConceptId]) {
    const c = concepts[chosenConceptId];
    selectionReason = `Focused practice on ${c.name} (Mastery ${c.masteryScore}%).`;
  } else {
    // Score every concept
    let bestScore = -Infinity;
    for (const id of CONCEPT_ORDER) {
      const c = concepts[id];
      if (!c) continue;

      let priorityScore = 100 - c.masteryScore; // Base need

      // Check if this concept is an unmastered prerequisite of another weak/developing concept!
      const dependentsBlocked = SYLLABUS_CONCEPTS.filter(
        (dep) =>
          dep.prerequisiteIds.includes(id) &&
          concepts[dep.id] &&
          concepts[dep.id].masteryScore < 70
      );
      if (c.masteryScore < 70 && dependentsBlocked.length > 0) {
        priorityScore += 42;
      }

      // Unresolved misconceptions & repeated mistakes
      const unresolvedCount = c.knownMisconceptions.filter(
        (m) => !m.resolved
      ).length;
      if (unresolvedCount > 0) {
        priorityScore += 28 + Math.min(20, unresolvedCount * 8);
      }
      if (c.recentMistakeCount > 0) {
        priorityScore += c.recentMistakeCount * 16;
      }

      // Revision urgency
      const daysUntilDue = daysBetweenFromNow(c.nextReviewDate, now);
      if (c.nextReviewDate !== null && daysUntilDue < 0) {
        priorityScore += 34 + Math.min(15, Math.abs(daysUntilDue) * 3);
      } else if (c.nextReviewDate !== null && daysUntilDue === 0) {
        priorityScore += 22;
      }

      // Slight penalty if ALL its prerequisites are currently Weak (< 45%)—prefer fixing the prerequisite first!
      const weakPrereqs = c.prerequisiteIds.filter(
        (pid) => (concepts[pid]?.masteryScore ?? 0) < 48
      );
      if (weakPrereqs.length > 0) {
        priorityScore -= 38;
      }

      // Avoid picking the exact same concept 3 times in a row if other weak concepts exist
      const lastTwo = student.attempts.slice(0, 2);
      if (
        lastTwo.length === 2 &&
        lastTwo.every((a) => a.conceptId === id) &&
        c.masteryScore >= 45
      ) {
        priorityScore -= 25;
      }

      if (priorityScore > bestScore) {
        bestScore = priorityScore;
        chosenConceptId = id;
      }
    }

    const picked = concepts[chosenConceptId ?? "db-fundamentals"];
    const unresolved = picked.knownMisconceptions.filter((m) => !m.resolved);
    const daysDue = daysBetweenFromNow(picked.nextReviewDate, now);
    const dependents = SYLLABUS_CONCEPTS.filter(
      (d) =>
        d.prerequisiteIds.includes(picked.id) &&
        (concepts[d.id]?.masteryScore ?? 0) < 70
    );

    if (picked.masteryScore < 68 && dependents.length > 0) {
      selectionReason = `Prerequisite priority: strengthening ${picked.shortName} (${picked.masteryScore}%) unlocks ${dependents.map((d) => d.shortName).join(", ")}.`;
    } else if (unresolved.length > 0) {
      selectionReason = `Targeting active misconception on ${picked.shortName}: "${unresolved[0].tag.replace(/-/g, " ")}".`;
    } else if (picked.nextReviewDate && daysDue <= 0) {
      selectionReason =
        daysDue < 0
          ? `Overdue spaced-repetition review (${Math.abs(daysDue)}d overdue) for ${picked.shortName}.`
          : `Scheduled spaced-repetition review due today for ${picked.shortName}.`;
    } else {
      selectionReason = `Calibrated next weakness: ${picked.shortName} is currently ${picked.status} (${picked.masteryScore}%).`;
    }
  }

  const targetConcept =
    concepts[chosenConceptId ?? "db-fundamentals"] ??
    Object.values(concepts)[0];

  // Calibrate Difficulty (1, 2, or 3) using concept mastery + recent performance streak
  let targetDifficulty: DifficultyLevel = 2;
  if (
    targetConcept.masteryScore < 48 ||
    targetConcept.recentMistakeCount >= 2
  ) {
    targetDifficulty = 1;
  } else if (
    targetConcept.masteryScore >= 72 ||
    targetConcept.consecutiveSoundCount >= 2
  ) {
    targetDifficulty = 3;
  } else {
    targetDifficulty = 2;
  }

  // Select best local fallback question matching concept + closest difficulty
  const conceptPool = QUESTION_BANK.filter(
    (q) => q.conceptId === targetConcept.id
  );
  const recentAttemptedIds = new Set(
    student.attempts.slice(0, 12).map((a) => a.questionId)
  );

  const candidates = conceptPool.filter(
    (q) => !excludeIds.has(q.id) && !recentAttemptedIds.has(q.id)
  );
  const poolToRank =
    candidates.length > 0
      ? candidates
      : conceptPool.filter((q) => !excludeIds.has(q.id));
  const finalPool = poolToRank.length > 0 ? poolToRank : conceptPool;

  const sortedByDifficultyMatch = [...finalPool].sort((a, b) => {
    // Prefer non-diagnostic practice items first during Learn sessions
    const aDiag = a.isDiagnostic ? 1 : 0;
    const bDiag = b.isDiagnostic ? 1 : 0;
    const diffDistA = Math.abs(a.difficulty - targetDifficulty);
    const diffDistB = Math.abs(b.difficulty - targetDifficulty);
    return diffDistA - diffDistB || aDiag - bDiag;
  });

  const fallbackQuestion = sortedByDifficultyMatch[0] ?? QUESTION_BANK[0];
  const activeMisconceptions = targetConcept.knownMisconceptions
    .filter((m) => !m.resolved)
    .map((m) => m.description);

  return {
    concept: targetConcept,
    targetDifficulty,
    selectionReason,
    fallbackQuestion,
    activeMisconceptions,
  };
}

export interface StudentDashboardMetrics {
  weightedMastery: number;
  questionsAttempted: number;
  correctAnswers: number;
  accuracyPercent: number;
  streakDays: number;
  masteredCount: number;
  developingCount: number;
  weakCount: number;
  overdueReviews: { concept: Concept; task: RevisionTask; daysOverdue: number }[];
  upcomingReviews: { concept: Concept; task: RevisionTask; daysUntil: number }[];
}

export function computeStudentMetrics(
  student: Student,
  now = new Date()
): StudentDashboardMetrics {
  const conceptList = CONCEPT_ORDER.map((id) => student.concepts[id]).filter(
    Boolean
  );

  // Weighted mastery: foundational concepts supplying prerequisites carry slightly higher weight (1 + 0.12 * dependents)
  let weightedSum = 0;
  let totalWeight = 0;
  let questionsAttempted = 0;
  let correctAnswers = 0;
  let masteredCount = 0;
  let developingCount = 0;
  let weakCount = 0;

  for (const c of conceptList) {
    const depCount = SYLLABUS_CONCEPTS.filter((s) =>
      s.prerequisiteIds.includes(c.id)
    ).length;
    const weight = 1 + depCount * 0.12;
    weightedSum += c.masteryScore * weight;
    totalWeight += weight;

    questionsAttempted += c.questionsAttempted;
    correctAnswers += c.correctAnswers;

    if (c.status === "Mastered") masteredCount += 1;
    else if (c.status === "Developing") developingCount += 1;
    else weakCount += 1;
  }

  const weightedMastery =
    totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  const accuracyPercent =
    questionsAttempted > 0
      ? Math.round((correctAnswers / questionsAttempted) * 100)
      : 0;

  // Compute learning streak from student.activeDays (ending today or yesterday)
  const daySet = new Set(student.activeDays);
  let streakDays = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!daySet.has(toDateOnlyISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (daySet.has(toDateOnlyISO(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Overdue vs Upcoming revision tasks
  const overdueReviews: StudentDashboardMetrics["overdueReviews"] = [];
  const upcomingReviews: StudentDashboardMetrics["upcomingReviews"] = [];

  for (const id of CONCEPT_ORDER) {
    const task = student.revisionTasks[id];
    const concept = student.concepts[id];
    if (!task || !concept) continue;

    const deltaDays = daysBetweenFromNow(task.scheduledDate, now);
    if (deltaDays < 0 || (deltaDays === 0 && task.priority === "high")) {
      overdueReviews.push({
        concept,
        task,
        daysOverdue: Math.abs(deltaDays),
      });
    } else {
      upcomingReviews.push({
        concept,
        task,
        daysUntil: deltaDays,
      });
    }
  }

  overdueReviews.sort(
    (a, b) =>
      b.daysOverdue - a.daysOverdue ||
      a.concept.masteryScore - b.concept.masteryScore
  );
  upcomingReviews.sort(
    (a, b) =>
      a.daysUntil - b.daysUntil ||
      a.concept.masteryScore - b.concept.masteryScore
  );

  return {
    weightedMastery,
    questionsAttempted,
    correctAnswers,
    accuracyPercent,
    streakDays,
    masteredCount,
    developingCount,
    weakCount,
    overdueReviews,
    upcomingReviews,
  };
}
