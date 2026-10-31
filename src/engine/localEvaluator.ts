import {
  ConfidenceLevel,
  Evaluation,
  Question,
  ReasoningCategory,
} from "../types";

const FILLER_REGEX =
  /\b(um+|uh+|er+|ah+|like,?|you know,?|i mean,?|basically,?|literally,?|let me think( out loud)?,?|okay so,?|so yeah,?)\b/gi;

/**
 * Cleans conversational dictation (such as Wispr Flow voice transcripts) into a crisp
 * representation while preserving self-corrections and core logic.
 */
export function summarizeConversationalReasoning(rawReasoning: string): string {
  const trimmed = rawReasoning.trim();
  if (!trimmed) {
    return "No explicit reasoning steps were provided with the final answer.";
  }

  // Respect explicit self-corrections common in natural dictation ("wait no, actually X")
  let cleaned = trimmed.replace(FILLER_REGEX, " ").replace(/\s{2,}/g, " ").trim();
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (cleaned.length > 260) {
    return `${cleaned.slice(0, 257).trim()}...`;
  }
  return cleaned;
}

function normalizeAnswer(str: string): string {
  return str
    .toLowerCase()
    .replace(/[`"'{}\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkAnswerEquivalence(
  question: Question,
  studentAnswer: string
): boolean {
  const normStudent = normalizeAnswer(studentAnswer);
  if (!normStudent) return false;

  const normExpected = normalizeAnswer(question.expectedAnswer);
  if (normStudent === normExpected) return true;

  if (question.type === "multiple_choice") {
    return normStudent === normExpected;
  }

  if (question.acceptableAnswers?.length) {
    for (const alt of question.acceptableAnswers) {
      if (normStudent === normalizeAnswer(alt)) return true;
    }
  }

  // Check if short answer contains all required acceptable keywords when concise
  if (question.acceptableKeywords.length >= 2 && normStudent.length <= 120) {
    const matched = question.acceptableKeywords.filter((kw) =>
      normStudent.includes(kw.toLowerCase())
    );
    if (matched.length >= Math.min(3, question.acceptableKeywords.length)) {
      return true;
    }
  }

  return false;
}

/**
 * Deterministic local misconception & reasoning evaluator used when Gemini API is
 * unavailable or during offline operation.
 */
export function evaluateLocally(params: {
  question: Question;
  studentAnswer: string;
  studentReasoning: string;
  confidence: ConfidenceLevel;
  priorMastery: number;
  conceptName: string;
}): Omit<
  Evaluation,
  "appliedMasteryDelta" | "priorMastery" | "updatedMastery"
> {
  const {
    question,
    studentAnswer,
    studentReasoning,
    priorMastery,
    conceptName,
  } = params;

  const isAnswerCorrect = checkAnswerEquivalence(question, studentAnswer);
  const cleanedSummary = summarizeConversationalReasoning(studentReasoning);
  const combinedLower = `${studentAnswer} ${studentReasoning}`.toLowerCase();
  const reasoningLower = studentReasoning.trim().toLowerCase();
  const wordCount = studentReasoning.trim()
    ? studentReasoning.trim().split(/\s+/).length
    : 0;

  // 1. Check question-specific & classic DBMS misconception rules
  if (question.misconceptionRules?.length) {
    for (const rule of question.misconceptionRules) {
      const patternHit = rule.triggerPatterns.find((pat) =>
        combinedLower.includes(pat.toLowerCase())
      );
      const optionHit =
        rule.wrongOptionMatch &&
        normalizeAnswer(studentAnswer) === normalizeAnswer(rule.wrongOptionMatch);

      if (patternHit || (!isAnswerCorrect && optionHit)) {
        const category: ReasoningCategory = isAnswerCorrect
          ? "correct_answer_faulty_reasoning"
          : "conceptual_misunderstanding";

        return {
          source: "local_fallback",
          isAnswerCorrect,
          reasoningCategory: category,
          reasoningScore: isAnswerCorrect ? 38 : 22,
          cleanedReasoningSummary: cleanedSummary,
          detectedMisconception: rule.diagnosis,
          misconceptionTag: rule.tag,
          diagnosisEvidence: patternHit
            ? `Detected reasoning phrase "${patternHit}" indicating this mental model gap.`
            : `Selected distractor tied to ${rule.tag} without counter-evidence in reasoning.`,
          clarifyingQuestion: "",
          explanation: `${rule.remediation} ${question.explanation}`,
          followUpQuestion: {
            prompt: `Quick check on ${conceptName}: In your own words, what key condition distinguishes the correct rule here from the trap above?`,
            expectedAnswer: question.expectedAnswer,
            hint: rule.remediation,
          },
          suggestedMasteryDelta: isAnswerCorrect ? 1 : -10,
        };
      }
    }
  }

  // 2. Global DBMS misconception detector (works even across questions!)
  if (
    combinedLower.includes("superkey") &&
    combinedLower.includes("candidate key") &&
    (combinedLower.includes("are the same") ||
      combinedLower.includes("both uniquely identify")) &&
    !combinedLower.includes("minimal") &&
    !combinedLower.includes("subset")
  ) {
    return {
      source: "local_fallback",
      isAnswerCorrect,
      reasoningCategory: isAnswerCorrect
        ? "correct_answer_faulty_reasoning"
        : "conceptual_misunderstanding",
      reasoningScore: 25,
      cleanedReasoningSummary: cleanedSummary,
      detectedMisconception:
        "Treated superkeys and candidate keys as identical because both uniquely identify rows, omitting the minimality requirement.",
      misconceptionTag: "superkey-minimality-confusion",
      diagnosisEvidence:
        "Student stated that superkeys and candidate keys are the same because both uniquely identify a row, without checking whether proper subsets remain unique.",
      clarifyingQuestion: "",
      explanation:
        "Every candidate key is a minimal superkey, whereas a superkey may contain unnecessary extra attributes. If `{emp_id}` uniquely identifies a row, `{emp_id, name}` is still a superkey, but NOT a candidate key because `name` can be removed without losing uniqueness.",
      followUpQuestion: {
        prompt:
          "If `{student_id}` uniquely identifies every row in `Students(student_id, email, major)`, is `{student_id, major}` a superkey, a candidate key, or both?",
        expectedAnswer: "A superkey only (not a candidate key)",
        hint: "Test whether dropping `major` still leaves a unique identifier.",
      },
      suggestedMasteryDelta: isAnswerCorrect ? 0 : -11,
    };
  }

  // 3. Evaluate keyword alignment in student's reasoning
  const matchedKeywords = question.acceptableKeywords.filter((kw) =>
    reasoningLower.includes(kw.toLowerCase())
  );
  const keywordRatio =
    question.acceptableKeywords.length > 0
      ? matchedKeywords.length / question.acceptableKeywords.length
      : 0.5;

  // Case A: Ambiguous or near-empty reasoning
  if (wordCount < 5) {
    return {
      source: "local_fallback",
      isAnswerCorrect,
      reasoningCategory: "incomplete_explanation",
      reasoningScore: isAnswerCorrect ? 45 : 20,
      cleanedReasoningSummary: cleanedSummary,
      detectedMisconception: isAnswerCorrect
        ? ""
        : `Insufficient justification provided on ${conceptName} to pinpoint the exact conceptual step that failed.`,
      misconceptionTag: isAnswerCorrect ? "" : (question.misconceptionTags[0] ?? ""),
      diagnosisEvidence:
        wordCount === 0
          ? "Final answer was submitted without a reasoning explanation."
          : `Explanation contained only ${wordCount} words—too brief to verify conceptual reasoning.`,
      clarifyingQuestion: `Could you explain in 1–2 sentences WHY you chose "${studentAnswer}" for ${conceptName}?`,
      explanation: question.explanation,
      followUpQuestion: {
        prompt: `To lock in ${conceptName}: state the main rule that makes "${question.expectedAnswer}" correct.`,
        expectedAnswer: question.expectedAnswer,
        hint: `Include concepts like: ${question.acceptableKeywords.slice(0, 3).join(", ")}.`,
      },
      suggestedMasteryDelta: isAnswerCorrect ? 4 : -7,
    };
  }

  // Contradictory / uncertain phrasing -> ambiguous
  const hasStrongHedging =
    (reasoningLower.includes("not sure if") ||
      reasoningLower.includes("guessing between") ||
      reasoningLower.includes("either way")) &&
    keywordRatio < 0.35;

  if (hasStrongHedging) {
    return {
      source: "local_fallback",
      isAnswerCorrect,
      reasoningCategory: "ambiguous",
      reasoningScore: 40,
      cleanedReasoningSummary: cleanedSummary,
      detectedMisconception: "",
      misconceptionTag: "",
      diagnosisEvidence:
        "Reasoning expressed competing hypotheses without committing to the governing DBMS constraint.",
      clarifyingQuestion: `Your reasoning weighs two possibilities—which specific DBMS rule (${question.acceptableKeywords.slice(0, 2).join(" vs ")}) do you think takes precedence here?`,
      explanation: question.explanation,
      followUpQuestion: {
        prompt: `Apply the rule directly: why does "${question.expectedAnswer}" hold in all valid database instances?`,
        expectedAnswer: question.expectedAnswer,
        hint: question.explanation.split(".")[0] + ".",
      },
      suggestedMasteryDelta: isAnswerCorrect ? 3 : -5,
    };
  }

  // Case B: Answer is CORRECT
  if (isAnswerCorrect) {
    if (keywordRatio >= 0.34 || wordCount >= 12) {
      return {
        source: "local_fallback",
        isAnswerCorrect: true,
        reasoningCategory: "sound",
        reasoningScore: Math.min(96, Math.round(72 + keywordRatio * 25)),
        cleanedReasoningSummary: cleanedSummary,
        detectedMisconception: "",
        misconceptionTag: "",
        diagnosisEvidence:
          matchedKeywords.length > 0
            ? `Correct answer backed by domain concepts (${matchedKeywords.join(", ")}).`
            : "Correct answer supported by coherent multi-step justification.",
        clarifyingQuestion: "",
        explanation: `Well reasoned. ${question.explanation}`,
        followUpQuestion: {
          prompt:
            priorMastery >= 75
              ? `Edge-case stretch: what subtle schema change would invalidate "${question.expectedAnswer}"?`
              : `Can you construct a 2-row counterexample that shows why the other options fail?`,
          expectedAnswer: question.expectedAnswer,
          hint: question.explanation.split(".")[0] + ".",
        },
        suggestedMasteryDelta: 11,
      };
    }

    return {
      source: "local_fallback",
      isAnswerCorrect: true,
      reasoningCategory: "incomplete_explanation",
      reasoningScore: 58,
      cleanedReasoningSummary: cleanedSummary,
      detectedMisconception: "",
      misconceptionTag: "",
      diagnosisEvidence:
        "Final answer is right, though the explanation did not explicitly cite the underlying formal rule.",
      clarifyingQuestion: `Your final answer is right! To confirm it wasn't elimination alone, how does "${question.acceptableKeywords[0] ?? conceptName}" guarantee this?`,
      explanation: question.explanation,
      followUpQuestion: {
        prompt: `State the formal condition behind ${conceptName} in one sentence.`,
        expectedAnswer: question.expectedAnswer,
        hint: question.explanation.split(".")[0] + ".",
      },
      suggestedMasteryDelta: 6,
    };
  }

  // Case C: Answer is INCORRECT, but reasoning shows strong grasp of the rule!
  if (keywordRatio >= 0.6) {
    return {
      source: "local_fallback",
      isAnswerCorrect: false,
      reasoningCategory: "incorrect_answer_sound_reasoning",
      reasoningScore: 68,
      cleanedReasoningSummary: cleanedSummary,
      detectedMisconception: "",
      misconceptionTag: "",
      diagnosisEvidence: `Your explanation accurately cited ${matchedKeywords.join(", ")}, suggesting a selection/transcription slip on the final answer rather than a deep misconception.`,
      clarifyingQuestion: "",
      explanation: `Your underlying reasoning is on the right track, but double-check the final answer mapping: expected "${question.expectedAnswer}". ${question.explanation}`,
      followUpQuestion: {
        prompt: `Re-verify the final step: why does your own rule point to "${question.expectedAnswer}"?`,
        expectedAnswer: question.expectedAnswer,
        hint: "Trace the last step of your reasoning against the exact question prompt.",
      },
      suggestedMasteryDelta: -4,
    };
  }

  // Case D: Standard conceptual misunderstanding
  const fallbackTag = question.misconceptionTags[0] ?? `${question.conceptId}-gap`;
  return {
    source: "local_fallback",
    isAnswerCorrect: false,
    reasoningCategory: "conceptual_misunderstanding",
    reasoningScore: 28,
    cleanedReasoningSummary: cleanedSummary,
    detectedMisconception: `Misapplied ${conceptName} rule (${fallbackTag.replace(/-/g, " ")}).`,
    misconceptionTag: fallbackTag,
    diagnosisEvidence: `Submitted "${studentAnswer}" instead of "${question.expectedAnswer}", missing key mechanism (${question.acceptableKeywords.slice(0, 2).join(", ")}).`,
    clarifyingQuestion: "",
    explanation: question.explanation,
    followUpQuestion: {
      prompt: `After reviewing the explanation above, why is "${question.expectedAnswer}" required for ${conceptName}?`,
      expectedAnswer: question.expectedAnswer,
      hint: question.explanation.split(".")[0] + ".",
    },
    suggestedMasteryDelta: -9,
  };
}
