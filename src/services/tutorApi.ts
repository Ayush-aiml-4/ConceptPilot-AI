import {
  ConfidenceLevel,
  DifficultyLevel,
  Evaluation,
  Question,
} from "../types";
import { CONCEPT_ORDER } from "../data/syllabus";
import { evaluateLocally } from "../engine/localEvaluator";

const VALID_CONCEPTS = new Set(CONCEPT_ORDER);

function validateGeneratedQuestion(raw: unknown): Question | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, unknown>;

  if (typeof q.conceptId !== "string" || !VALID_CONCEPTS.has(q.conceptId)) {
    return null;
  }
  if (typeof q.prompt !== "string" || q.prompt.trim().length < 15) {
    return null;
  }
  if (typeof q.expectedAnswer !== "string" || !q.expectedAnswer.trim()) {
    return null;
  }
  if (typeof q.explanation !== "string" || q.explanation.trim().length < 10) {
    return null;
  }

  const diff = Number(q.difficulty);
  const difficulty: DifficultyLevel =
    diff === 1 || diff === 2 || diff === 3 ? diff : 2;

  if (q.type === "multiple_choice") {
    if (!Array.isArray(q.options) || q.options.length < 4) return null;
    const options = q.options
      .map((o) => (typeof o === "string" ? o.trim() : ""))
      .filter(Boolean)
      .slice(0, 4);
    if (options.length < 4 || !options.includes(q.expectedAnswer.trim())) {
      return null;
    }

    return {
      id: typeof q.id === "string" ? q.id : `ai-${q.conceptId}-${Date.now()}`,
      conceptId: q.conceptId,
      difficulty,
      type: "multiple_choice",
      prompt: q.prompt.trim(),
      options,
      expectedAnswer: q.expectedAnswer.trim(),
      acceptableKeywords: Array.isArray(q.acceptableKeywords)
        ? q.acceptableKeywords.filter((k): k is string => typeof k === "string")
        : [],
      explanation: q.explanation.trim(),
      misconceptionTags: Array.isArray(q.misconceptionTags)
        ? q.misconceptionTags.filter((t): t is string => typeof t === "string")
        : [],
      isAiGenerated: true,
    };
  }

  if (q.type === "short_answer") {
    return {
      id: typeof q.id === "string" ? q.id : `ai-${q.conceptId}-${Date.now()}`,
      conceptId: q.conceptId,
      difficulty,
      type: "short_answer",
      prompt: q.prompt.trim(),
      expectedAnswer: q.expectedAnswer.trim(),
      acceptableKeywords: Array.isArray(q.acceptableKeywords)
        ? q.acceptableKeywords.filter((k): k is string => typeof k === "string")
        : [],
      explanation: q.explanation.trim(),
      misconceptionTags: Array.isArray(q.misconceptionTags)
        ? q.misconceptionTags.filter((t): t is string => typeof t === "string")
        : [],
      isAiGenerated: true,
    };
  }

  return null;
}

export async function evaluateAttemptWithTutor(params: {
  question: Question;
  conceptName: string;
  studentAnswer: string;
  studentReasoning: string;
  confidence: ConfidenceLevel;
  priorMastery: number;
  knownMisconceptions: string[];
}): Promise<{
  evalResult: Omit<
    Evaluation,
    "appliedMasteryDelta" | "priorMastery" | "updatedMastery"
  >;
  usedFallback: boolean;
  fallbackReason?: string;
}> {
  const {
    question,
    conceptName,
    studentAnswer,
    studentReasoning,
    confidence,
    priorMastery,
    knownMisconceptions,
  } = params;

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 18000);

    const response = await fetch("/api/tutor/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        conceptId: question.conceptId,
        conceptName,
        questionPrompt: question.prompt,
        questionType: question.type,
        options: question.options ?? [],
        expectedAnswer: question.expectedAnswer,
        referenceExplanation: question.explanation,
        studentAnswer,
        studentReasoning,
        confidence,
        difficulty: question.difficulty,
        priorMastery,
        knownMisconceptions,
      }),
    });

    window.clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const reason =
        typeof errBody?.error === "string"
          ? errBody.error
          : `AI evaluation unavailable (HTTP ${response.status}).`;

      return {
        evalResult: evaluateLocally({
          question,
          studentAnswer,
          studentReasoning,
          confidence,
          priorMastery,
          conceptName,
        }),
        usedFallback: true,
        fallbackReason: reason,
      };
    }

    const data = await response.json();
    return {
      evalResult: {
        source: "gemini",
        isAnswerCorrect: Boolean(data.isAnswerCorrect),
        reasoningCategory: data.reasoningCategory,
        reasoningScore: Number(data.reasoningScore) || 50,
        cleanedReasoningSummary: String(data.cleanedReasoningSummary || ""),
        detectedMisconception: String(data.detectedMisconception || ""),
        misconceptionTag: String(data.misconceptionTag || ""),
        diagnosisEvidence: String(data.diagnosisEvidence || ""),
        clarifyingQuestion: String(data.clarifyingQuestion || ""),
        explanation: String(data.explanation || question.explanation),
        followUpQuestion: {
          prompt: String(
            data.followUpQuestion?.prompt ||
              `Summarize the key rule of ${conceptName}.`
          ),
          expectedAnswer: String(
            data.followUpQuestion?.expectedAnswer || question.expectedAnswer
          ),
          hint: String(
            data.followUpQuestion?.hint || question.explanation.split(".")[0]
          ),
        },
        suggestedMasteryDelta: Number(data.suggestedMasteryDelta) || 0,
      },
      usedFallback: false,
    };
  } catch (err) {
    const reason =
      err instanceof Error ? err.message : "Network error contacting Gemini server.";
    return {
      evalResult: evaluateLocally({
        question,
        studentAnswer,
        studentReasoning,
        confidence,
        priorMastery,
        conceptName,
      }),
      usedFallback: true,
      fallbackReason: reason,
    };
  }
}

export async function generateAdaptiveQuestionFromAi(params: {
  conceptId: string;
  conceptName: string;
  targetDifficulty: DifficultyLevel;
  recentMisconceptions: string[];
  avoidPrompts: string[];
  preferredType?: "multiple_choice" | "short_answer";
}): Promise<{ question: Question | null; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 16000);

    const response = await fetch("/api/tutor/generate-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(params),
    });

    window.clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return {
        question: null,
        error:
          typeof errBody?.error === "string"
            ? errBody.error
            : "Gemini question generator unavailable; loaded calibrated bank question.",
      };
    }

    const data = await response.json();
    const validated = validateGeneratedQuestion(data);
    if (!validated) {
      return {
        question: null,
        error:
          "Generated question did not pass schema validation; loaded calibrated bank question.",
      };
    }

    return { question: validated };
  } catch (err) {
    return {
      question: null,
      error:
        err instanceof Error
          ? err.message
          : "Network error generating AI question.",
    };
  }
}
