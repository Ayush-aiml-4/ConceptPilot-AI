export type ConceptStatus = "Weak" | "Developing" | "Mastered";

export type DifficultyLevel = 1 | 2 | 3;

export type ConfidenceLevel = "low" | "medium" | "high";

export type QuestionType = "multiple_choice" | "short_answer";

export type ReasoningCategory =
  | "sound"
  | "correct_answer_faulty_reasoning"
  | "incorrect_answer_sound_reasoning"
  | "conceptual_misunderstanding"
  | "careless_error"
  | "incomplete_explanation"
  | "ambiguous";

export type AppView =
  | "dashboard"
  | "learn"
  | "diagnostic"
  | "concept-map"
  | "revision"
  | "teacher";

export interface Misconception {
  id: string;
  tag: string;
  conceptId: string;
  description: string;
  evidence: string;
  occurrences: number;
  firstDetectedAt: string;
  lastDetectedAt: string;
  resolved: boolean;
}

export interface Concept {
  id: string;
  name: string;
  shortName: string;
  summary: string;
  tier: number; // Topological tier 0..4 for graph layout
  prerequisiteIds: string[];
  masteryScore: number; // 0..100
  status: ConceptStatus;
  confidenceEstimate: number; // 0..100
  questionsAttempted: number;
  correctAnswers: number;
  consecutiveSoundCount: number;
  recentMistakeCount: number;
  lastReviewedDate: string | null; // ISO string
  nextReviewDate: string | null; // ISO string
  knownMisconceptions: Misconception[];
}

export interface MisconceptionRule {
  tag: string;
  triggerPatterns: string[];
  wrongOptionMatch?: string;
  diagnosis: string;
  remediation: string;
}

export interface Question {
  id: string;
  conceptId: string;
  difficulty: DifficultyLevel;
  type: QuestionType;
  prompt: string;
  codeSnippet?: string;
  options?: string[];
  expectedAnswer: string;
  acceptableAnswers?: string[];
  acceptableKeywords: string[];
  explanation: string;
  misconceptionTags: string[];
  misconceptionRules?: MisconceptionRule[];
  isDiagnostic?: boolean;
  isAiGenerated?: boolean;
  sampleDictatedMisconception?: {
    label: string;
    answer: string;
    reasoning: string;
  };
}

export interface FollowUpCheck {
  prompt: string;
  expectedAnswer: string;
  hint: string;
}

export interface Evaluation {
  source: "gemini" | "local_fallback";
  isAnswerCorrect: boolean;
  reasoningCategory: ReasoningCategory;
  reasoningScore: number; // 0..100
  cleanedReasoningSummary: string;
  detectedMisconception: string;
  misconceptionTag: string;
  diagnosisEvidence: string;
  clarifyingQuestion: string;
  explanation: string;
  followUpQuestion: FollowUpCheck;
  suggestedMasteryDelta: number;
  appliedMasteryDelta: number;
  priorMastery: number;
  updatedMastery: number;
}

export interface Attempt {
  id: string;
  questionId: string;
  questionPrompt: string;
  conceptId: string;
  difficulty: DifficultyLevel;
  studentAnswer: string;
  studentReasoning: string;
  confidence: ConfidenceLevel;
  timestamp: string;
  mode: "adaptive" | "diagnostic" | "revision";
  evaluation: Evaluation;
}

export interface RevisionTask {
  id: string;
  conceptId: string;
  scheduledDate: string; // ISO date string
  intervalDays: number;
  priority: "overdue" | "high" | "normal";
  reason: string;
  lastCompletedDate: string | null;
  reviewCount: number;
}

export interface DiagnosticAnswerRecord {
  questionId: string;
  conceptId: string;
  difficulty: DifficultyLevel;
  studentAnswer: string;
  isCorrect: boolean;
  expectedAnswer: string;
  explanation: string;
}

export interface DiagnosticSummary {
  completedAt: string;
  totalQuestions: number;
  correctCount: number;
  weakConceptIds: string[];
  recommendedPlan: {
    conceptId: string;
    reason: string;
    targetAction: string;
  }[];
  answers: DiagnosticAnswerRecord[];
}

export interface Student {
  id: string;
  name: string;
  courseCode: string;
  profileMode: "seeded_demo" | "fresh_student";
  diagnosticCompleted: boolean;
  lastDiagnosticSummary: DiagnosticSummary | null;
  activeDays: string[]; // YYYY-MM-DD strings for streak calculation
  concepts: Record<string, Concept>;
  attempts: Attempt[];
  revisionTasks: Record<string, RevisionTask>;
}

export interface TeacherStudentRecord {
  id: string;
  name: string;
  email: string;
  diagnosticScore: number;
  questionsAttempted: number;
  accuracy: number;
  lastActiveDate: string;
  conceptMastery: Record<string, number>;
  activeMisconceptions: {
    conceptId: string;
    tag: string;
    description: string;
    occurrences: number;
  }[];
  recentMistakeSummary: string;
}

export interface TeacherClass {
  id: string;
  className: string;
  term: string;
  instructor: string;
  isDemoDataset: true;
  students: TeacherStudentRecord[];
}
