import { Student, TeacherClass } from "../types";
import {
  createInitialConceptsMap,
  getMasteryStatus,
} from "./syllabus";
import { toDateOnlyISO } from "../engine/adaptiveEngine";

function shiftDays(base: Date, offsetDays: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

/**
 * Creates a clean onboarding student with zero attempts so evaluators can also
 * experience the first-time onboarding + diagnostic journey from scratch.
 */
export function createFreshStudent(): Student {
  return {
    id: "student-fresh",
    name: "New Learner",
    courseCode: "CS301 — DBMS Fundamentals",
    profileMode: "fresh_student",
    diagnosticCompleted: false,
    lastDiagnosticSummary: null,
    activeDays: [],
    concepts: createInitialConceptsMap(0),
    attempts: [],
    revisionTasks: {},
  };
}

/**
 * Creates a realistic seeded student ("Aarav Mehta") with completed diagnostic,
 * authentic DBMS misconceptions, recorded attempts, a 4-day study streak, and
 * both overdue and upcoming spaced-repetition tasks.
 */
export function createSeededDemoStudent(now = new Date()): Student {
  const concepts = createInitialConceptsMap(0);

  const dMinus5 = shiftDays(now, -5).toISOString();
  const dMinus3 = shiftDays(now, -3).toISOString();
  const dMinus2 = shiftDays(now, -2).toISOString();
  const dMinus1 = shiftDays(now, -1).toISOString();
  const dToday = now.toISOString();
  const dPlus2 = shiftDays(now, 2).toISOString();
  const dPlus4 = shiftDays(now, 4).toISOString();
  const dPlus9 = shiftDays(now, 9).toISOString();
  const dPlus12 = shiftDays(now, 12).toISOString();

  const seedSpecs: Record<
    string,
    {
      mastery: number;
      conf: number;
      attempted: number;
      correct: number;
      soundStreak: number;
      recentMistakes: number;
      lastRev: string;
      nextRev: string;
      interval: number;
      priority: "overdue" | "high" | "normal";
      reason: string;
    }
  > = {
    "db-fundamentals": {
      mastery: 88,
      conf: 86,
      attempted: 4,
      correct: 4,
      soundStreak: 3,
      recentMistakes: 0,
      lastRev: dMinus3,
      nextRev: dPlus9,
      interval: 12,
      priority: "normal",
      reason: "Mastered (88%)—long-interval retention check.",
    },
    "tables-rows-columns": {
      mastery: 82,
      conf: 80,
      attempted: 4,
      correct: 3,
      soundStreak: 2,
      recentMistakes: 0,
      lastRev: dMinus2,
      nextRev: dPlus12,
      interval: 14,
      priority: "normal",
      reason: "Mastered (82%)—three-valued NULL logic verified.",
    },
    "primary-keys": {
      mastery: 84,
      conf: 82,
      attempted: 3,
      correct: 3,
      soundStreak: 2,
      recentMistakes: 0,
      lastRev: dMinus3,
      nextRev: dPlus9,
      interval: 12,
      priority: "normal",
      reason: "Mastered (84%)—composite entity integrity solid.",
    },
    "candidate-superkeys": {
      mastery: 38,
      conf: 44,
      attempted: 3,
      correct: 1,
      soundStreak: 0,
      recentMistakes: 2,
      lastRev: dMinus2,
      nextRev: dMinus1, // Overdue by 1 day!
      interval: 1,
      priority: "overdue",
      reason: "Overdue review: repeated minimality misconception between superkeys and candidate keys.",
    },
    "functional-dependencies": {
      mastery: 58,
      conf: 56,
      attempted: 3,
      correct: 2,
      soundStreak: 1,
      recentMistakes: 1,
      lastRev: dMinus1,
      nextRev: dPlus2,
      interval: 3,
      priority: "normal",
      reason: "Developing (58%)—practice attribute closure X+ with composite determinants.",
    },
    "normal-forms-1-2-3": {
      mastery: 44,
      conf: 42,
      attempted: 3,
      correct: 1,
      soundStreak: 0,
      recentMistakes: 1,
      lastRev: dMinus3,
      nextRev: dMinus1, // Overdue!
      interval: 2,
      priority: "overdue",
      reason: "Weak mastery (44%)—overdue check on partial vs transitive dependencies.",
    },
    bcnf: {
      mastery: 34,
      conf: 32,
      attempted: 2,
      correct: 0,
      soundStreak: 0,
      recentMistakes: 2,
      lastRev: dMinus2,
      nextRev: dToday,
      interval: 1,
      priority: "high",
      reason: "High priority: prime-attribute exception between 3NF and BCNF needs remediation.",
    },
    "sql-queries": {
      mastery: 74,
      conf: 76,
      attempted: 4,
      correct: 3,
      soundStreak: 1,
      recentMistakes: 0,
      lastRev: dMinus1,
      nextRev: dPlus4,
      interval: 5,
      priority: "normal",
      reason: "Developing (74%)—close to Mastered threshold; review NOT IN with NULLs.",
    },
    joins: {
      mastery: 46,
      conf: 48,
      attempted: 3,
      correct: 1,
      soundStreak: 0,
      recentMistakes: 2,
      lastRev: dMinus2,
      nextRev: dMinus1, // Overdue!
      interval: 1,
      priority: "overdue",
      reason: "Overdue review: outer join WHERE filter null-rejection trap.",
    },
    "transactions-acid": {
      mastery: 66,
      conf: 64,
      attempted: 3,
      correct: 2,
      soundStreak: 1,
      recentMistakes: 0,
      lastRev: dToday,
      nextRev: dPlus4,
      interval: 4,
      priority: "normal",
      reason: "Developing (66%)—consolidate phantom reads vs non-repeatable reads.",
    },
  };

  const revisionTasks: Student["revisionTasks"] = {};

  for (const [id, spec] of Object.entries(seedSpecs)) {
    concepts[id] = {
      ...concepts[id],
      masteryScore: spec.mastery,
      status: getMasteryStatus(spec.mastery),
      confidenceEstimate: spec.conf,
      questionsAttempted: spec.attempted,
      correctAnswers: spec.correct,
      consecutiveSoundCount: spec.soundStreak,
      recentMistakeCount: spec.recentMistakes,
      lastReviewedDate: spec.lastRev,
      nextReviewDate: spec.nextRev,
      knownMisconceptions: [],
    };

    revisionTasks[id] = {
      id: `rev-${id}`,
      conceptId: id,
      scheduledDate: spec.nextRev,
      intervalDays: spec.interval,
      priority: spec.priority,
      reason: spec.reason,
      lastCompletedDate: spec.lastRev,
      reviewCount: spec.attempted,
    };
  }

  // Populate persistent misconceptions matching recorded attempts
  concepts["candidate-superkeys"].knownMisconceptions = [
    {
      id: "seed-misc-ck-1",
      tag: "superkey-minimality-confusion",
      conceptId: "candidate-superkeys",
      description:
        "Equated superkeys and candidate keys based on row uniqueness alone without checking minimality (no proper subset is unique).",
      evidence:
        'Dictated: "Both emp_id and {emp_id, full_name} uniquely identify every employee row so both are candidate keys."',
      occurrences: 2,
      firstDetectedAt: dMinus5,
      lastDetectedAt: dMinus2,
      resolved: false,
    },
  ];

  concepts["joins"].knownMisconceptions = [
    {
      id: "seed-misc-joins-1",
      tag: "outer-join-where-null-rejection",
      conceptId: "joins",
      description:
        "Placed right-table filter inside WHERE instead of ON after a LEFT JOIN, silently discarding NULL-extended unmatched rows.",
      evidence:
        'Dictated: "LEFT JOIN already keeps all departments, and WHERE e.bonus_year = 2026 just filters which bonuses get counted."',
      occurrences: 2,
      firstDetectedAt: dMinus3,
      lastDetectedAt: dMinus2,
      resolved: false,
    },
  ];

  concepts["normal-forms-1-2-3"].knownMisconceptions = [
    {
      id: "seed-misc-nf-1",
      tag: "2nf-single-attribute-key-myth",
      conceptId: "normal-forms-1-2-3",
      description:
        "Classified a non-key → non-key dependency on a single-column primary key table as a 2NF partial dependency instead of a 3NF transitive dependency.",
      evidence:
        'Dictated: "Since dept_location depends on dept_id instead of emp_id, that looks like a partial dependency violating 2NF."',
      occurrences: 1,
      firstDetectedAt: dMinus3,
      lastDetectedAt: dMinus3,
      resolved: false,
    },
  ];

  concepts["bcnf"].knownMisconceptions = [
    {
      id: "seed-misc-bcnf-1",
      tag: "3nf-vs-bcnf-prime-exception",
      conceptId: "bcnf",
      description:
        "Overlooked 3NF's prime-attribute exemption (`X → A` where `A` belongs to a candidate key passes 3NF yet fails BCNF when `X` is not a superkey).",
      evidence:
        'Dictated: "advisor_id is not a key so advisor_id -> major must violate 3NF as well as BCNF."',
      occurrences: 2,
      firstDetectedAt: dMinus5,
      lastDetectedAt: dMinus2,
      resolved: false,
    },
  ];

  const attempts: Student["attempts"] = [
    {
      id: "seed-att-1",
      questionId: "prac-acid-2",
      questionPrompt:
        "Transaction T1 updates a product's price from $100 to $10, Transaction T2 reads $10, and then T1 rolls back (aborts). What concurrency anomaly did T2 suffer?",
      conceptId: "transactions-acid",
      difficulty: 1,
      studentAnswer:
        "Dirty read (reading uncommitted data written by an eventually aborted transaction)",
      studentReasoning:
        "T1 never committed the $10 price before T2 read it, and then T1 aborted, so T2 read dirty uncommitted state.",
      confidence: "high",
      timestamp: dToday,
      mode: "adaptive",
      evaluation: {
        source: "gemini",
        isAnswerCorrect: true,
        reasoningCategory: "sound",
        reasoningScore: 92,
        cleanedReasoningSummary:
          "Identified that reading uncommitted modifications from an aborted transaction is a dirty read.",
        detectedMisconception: "",
        misconceptionTag: "",
        diagnosisEvidence:
          "Explicitly traced uncommitted write by T1 followed by rollback.",
        clarifyingQuestion: "",
        explanation:
          "Spot on. Upgrading isolation to at least READ COMMITTED prevents dirty reads.",
        followUpQuestion: {
          prompt:
            "Which isolation anomaly occurs if T1 commits an update between two reads inside T2?",
          expectedAnswer: "Non-repeatable read",
          hint: "The second read sees a different committed value for the same row.",
        },
        suggestedMasteryDelta: 10,
        appliedMasteryDelta: 10,
        priorMastery: 56,
        updatedMastery: 66,
      },
    },
    {
      id: "seed-att-2",
      questionId: "diag-joins-1",
      questionPrompt:
        "What happens if you write `FROM Departments d LEFT JOIN Employees e ON d.id = e.dept_id WHERE e.bonus_year = 2026` when a department has zero employees?",
      conceptId: "joins",
      difficulty: 2,
      studentAnswer:
        "Every department still appears with a count of 0 when it has no matching 2026 employees",
      studentReasoning:
        "LEFT JOIN already keeps all departments from the left side, and WHERE e.bonus_year = 2026 just filters which bonuses get counted.",
      confidence: "high",
      timestamp: dMinus2,
      mode: "adaptive",
      evaluation: {
        source: "gemini",
        isAnswerCorrect: false,
        reasoningCategory: "conceptual_misunderstanding",
        reasoningScore: 24,
        cleanedReasoningSummary:
          "Believed LEFT JOIN preserves unmatched rows even when a subsequent WHERE clause tests a right-table column for equality.",
        detectedMisconception:
          "Placed right-table filter inside WHERE instead of ON after a LEFT JOIN, silently discarding NULL-extended unmatched rows.",
        misconceptionTag: "outer-join-where-null-rejection",
        diagnosisEvidence:
          'High-confidence claim that "LEFT JOIN already keeps all departments" despite `WHERE e.bonus_year = 2026` evaluating `NULL = 2026` → UNKNOWN.',
        clarifyingQuestion: "",
        explanation:
          "Because `WHERE` runs AFTER the `LEFT JOIN` produces `(dept, NULL)`, testing `NULL = 2026` yields UNKNOWN and eliminates those zero-employee departments. Put `AND e.bonus_year = 2026` inside the `ON` clause to preserve every department.",
        followUpQuestion: {
          prompt:
            "Where should `e.bonus_year = 2026` be placed so unmatched departments still appear with NULL-padded `e` columns?",
          expectedAnswer: "Inside the ON clause (`ON d.id = e.dept_id AND e.bonus_year = 2026`)",
          hint: "Predicates in `ON` govern matching before NULL padding occurs.",
        },
        suggestedMasteryDelta: -11,
        appliedMasteryDelta: -12,
        priorMastery: 58,
        updatedMastery: 46,
      },
    },
    {
      id: "seed-att-3",
      questionId: "diag-ck-1",
      questionPrompt:
        "In `Employee(emp_id, ssn, dept_id, full_name)` where `emp_id` and `ssn` are unique, how is `{emp_id, full_name}` classified?",
      conceptId: "candidate-superkeys",
      difficulty: 2,
      studentAnswer: "It is both a superkey and a composite candidate key",
      studentReasoning:
        "Both emp_id and {emp_id, full_name} uniquely identify every employee row so both are candidate keys.",
      confidence: "medium",
      timestamp: dMinus2,
      mode: "adaptive",
      evaluation: {
        source: "gemini",
        isAnswerCorrect: false,
        reasoningCategory: "conceptual_misunderstanding",
        reasoningScore: 26,
        cleanedReasoningSummary:
          "Assumed any attribute set that uniquely identifies rows is automatically a candidate key.",
        detectedMisconception:
          "Equated superkeys and candidate keys based on row uniqueness alone without checking minimality.",
        misconceptionTag: "superkey-minimality-confusion",
        diagnosisEvidence:
          'Stated "{emp_id, full_name} uniquely identifies every employee row so both are candidate keys", ignoring that proper subset `{emp_id}` is already unique.',
        clarifyingQuestion: "",
        explanation:
          "Every candidate key is a minimal superkey. Since removing `full_name` leaves `{emp_id}`—which still uniquely identifies every employee—`{emp_id, full_name}` contains a redundant attribute and is strictly a superkey, not a candidate key.",
        followUpQuestion: {
          prompt: "What are the actual candidate keys of `Employee(emp_id, ssn, dept_id, full_name)`?",
          expectedAnswer: "{emp_id} and {ssn}",
          hint: "Each single-attribute unique identifier has no non-empty proper subset.",
        },
        suggestedMasteryDelta: -10,
        appliedMasteryDelta: -10,
        priorMastery: 48,
        updatedMastery: 38,
      },
    },
    {
      id: "seed-att-4",
      questionId: "prac-nf-2",
      questionPrompt:
        "Relation `EmployeeDept(emp_id, emp_name, dept_id, dept_location)` has sole key `emp_id` and `dept_id → dept_location`. What is the highest normal form satisfied?",
      conceptId: "normal-forms-1-2-3",
      difficulty: 1,
      studentAnswer:
        "1NF (violates 2NF because `dept_location` depends on `dept_id`)",
      studentReasoning:
        "Since dept_location depends on dept_id instead of emp_id, that looks like a partial dependency violating 2NF.",
      confidence: "medium",
      timestamp: dMinus3,
      mode: "adaptive",
      evaluation: {
        source: "gemini",
        isAnswerCorrect: false,
        reasoningCategory: "conceptual_misunderstanding",
        reasoningScore: 30,
        cleanedReasoningSummary:
          "Labeled a transitive dependency on a single-attribute key relation as a 2NF partial dependency.",
        detectedMisconception:
          "Classified a non-key → non-key dependency on a single-column primary key table as a 2NF partial dependency instead of a 3NF transitive dependency.",
        misconceptionTag: "2nf-single-attribute-key-myth",
        diagnosisEvidence:
          'Called `dept_id → dept_location` a "partial dependency" even though key `{emp_id}` has only one attribute.',
        clarifyingQuestion: "",
        explanation:
          "Partial dependencies only exist when a non-prime attribute depends on a PROPER subset of a COMPOSITE candidate key. With single-attribute key `emp_id`, 2NF holds automatically; `emp_id → dept_id → dept_location` violates 3NF.",
        followUpQuestion: {
          prompt: "Can a 1NF table whose only candidate key is a single column EVER violate 2NF?",
          expectedAnswer: "No—a 1-column key has no proper non-empty subset.",
          hint: "Think about what a proper subset of `{emp_id}` would be.",
        },
        suggestedMasteryDelta: -8,
        appliedMasteryDelta: -8,
        priorMastery: 52,
        updatedMastery: 44,
      },
    },
  ];

  // 4-day consecutive streak ending today
  const activeDays = [
    toDateOnlyISO(shiftDays(now, -5)),
    toDateOnlyISO(shiftDays(now, -3)),
    toDateOnlyISO(shiftDays(now, -2)),
    toDateOnlyISO(shiftDays(now, -1)),
    toDateOnlyISO(now),
  ];

  return {
    id: "student-aarav-demo",
    name: "Aarav Mehta",
    courseCode: "CS301 — DBMS Fundamentals",
    profileMode: "seeded_demo",
    diagnosticCompleted: true,
    lastDiagnosticSummary: {
      completedAt: dMinus5,
      totalQuestions: 10,
      correctCount: 6,
      weakConceptIds: [
        "candidate-superkeys",
        "normal-forms-1-2-3",
        "bcnf",
        "joins",
      ],
      recommendedPlan: [
        {
          conceptId: "candidate-superkeys",
          reason:
            "Mastery at 38%—prerequisite foundation for Functional Dependencies & Normalization.",
          targetAction: "Resolve superkey vs candidate key minimality check",
        },
        {
          conceptId: "normal-forms-1-2-3",
          reason: "Mastery at 44%—distinguish 2NF partial vs 3NF transitive dependencies.",
          targetAction: "Complete guided normalization drill",
        },
        {
          conceptId: "joins",
          reason: "Mastery at 46%—outer join ON vs WHERE predicate placement.",
          targetAction: "Review overdue outer-join session",
        },
        {
          conceptId: "bcnf",
          reason: "Mastery at 34%—depends on strengthening 1NF–3NF and Candidate Keys.",
          targetAction: "Practice 3NF prime-attribute edge cases",
        },
      ],
      answers: [],
    },
    activeDays,
    concepts,
    attempts,
    revisionTasks,
  };
}

/**
 * Seeded Demonstration Cohort for Teacher Dashboard (clearly marked `isDemoDataset: true`).
 * All cohort charts, averages, topic alerts, and misconception rankings are calculated
 * dynamically from these records!
 */
export function createSeededTeacherClass(now = new Date()): TeacherClass {
  const today = toDateOnlyISO(now);
  const yesterday = toDateOnlyISO(shiftDays(now, -1));
  const twoDaysAgo = toDateOnlyISO(shiftDays(now, -2));
  const threeDaysAgo = toDateOnlyISO(shiftDays(now, -3));

  return {
    id: "class-cs301-fall26",
    className: "CS301: Relational Database Systems",
    term: "Fall 2026 · Section A",
    instructor: "Prof. Kavita Nair",
    isDemoDataset: true,
    students: [
      {
        id: "stu-1",
        name: "Maya Krishnan",
        email: "m.krishnan@university.edu",
        diagnosticScore: 80,
        questionsAttempted: 38,
        accuracy: 84,
        lastActiveDate: today,
        conceptMastery: {
          "db-fundamentals": 94,
          "tables-rows-columns": 91,
          "primary-keys": 90,
          "candidate-superkeys": 85,
          "functional-dependencies": 82,
          "normal-forms-1-2-3": 78,
          bcnf: 64,
          "sql-queries": 88,
          joins: 81,
          "transactions-acid": 76,
        },
        activeMisconceptions: [
          {
            conceptId: "bcnf",
            tag: "bcnf-lossless-vs-dep-preservation",
            description:
              "Assumed every BCNF decomposition preserves all functional dependencies without cross-table joins.",
            occurrences: 1,
          },
        ],
        recentMistakeSummary:
          "Strong across core syllabus; missed dependency-preservation trade-off in BCNF Tier-3 drill.",
      },
      {
        id: "stu-2",
        name: "Rohan Deshmukh",
        email: "r.deshmukh@university.edu",
        diagnosticScore: 50,
        questionsAttempted: 29,
        accuracy: 59,
        lastActiveDate: yesterday,
        conceptMastery: {
          "db-fundamentals": 82,
          "tables-rows-columns": 74,
          "primary-keys": 78,
          "candidate-superkeys": 41,
          "functional-dependencies": 46,
          "normal-forms-1-2-3": 39,
          bcnf: 28,
          "sql-queries": 68,
          joins: 44,
          "transactions-acid": 55,
        },
        activeMisconceptions: [
          {
            conceptId: "candidate-superkeys",
            tag: "superkey-minimality-confusion",
            description:
              "Equated superkeys and candidate keys based on uniqueness without testing minimality.",
            occurrences: 3,
          },
          {
            conceptId: "joins",
            tag: "outer-join-where-null-rejection",
            description:
              "Filtered right-table columns in WHERE after LEFT JOIN, dropping unmatched left rows.",
            occurrences: 2,
          },
        ],
        recentMistakeSummary:
          "Candidate key minimality gap is cascading into Functional Dependencies and 2NF/BCNF.",
      },
      {
        id: "stu-3",
        name: "Elena Rostova",
        email: "e.rostova@university.edu",
        diagnosticScore: 70,
        questionsAttempted: 34,
        accuracy: 74,
        lastActiveDate: today,
        conceptMastery: {
          "db-fundamentals": 88,
          "tables-rows-columns": 86,
          "primary-keys": 84,
          "candidate-superkeys": 79,
          "functional-dependencies": 73,
          "normal-forms-1-2-3": 68,
          bcnf: 51,
          "sql-queries": 77,
          joins: 54,
          "transactions-acid": 72,
        },
        activeMisconceptions: [
          {
            conceptId: "bcnf",
            tag: "3nf-vs-bcnf-prime-exception",
            description:
              "Missed that prime dependent attributes satisfy 3NF even when the determinant is not a superkey.",
            occurrences: 2,
          },
          {
            conceptId: "joins",
            tag: "outer-join-where-null-rejection",
            description:
              "Placed outer-join filter in WHERE instead of ON clause.",
            occurrences: 1,
          },
        ],
        recentMistakeSummary:
          "Needs targeted contrast drill on 3NF prime-attribute exception vs BCNF determinant rule.",
      },
      {
        id: "stu-4",
        name: "Devon Brooks",
        email: "d.brooks@university.edu",
        diagnosticScore: 40,
        questionsAttempted: 21,
        accuracy: 48,
        lastActiveDate: threeDaysAgo,
        conceptMastery: {
          "db-fundamentals": 71,
          "tables-rows-columns": 52,
          "primary-keys": 61,
          "candidate-superkeys": 36,
          "functional-dependencies": 34,
          "normal-forms-1-2-3": 31,
          bcnf: 24,
          "sql-queries": 49,
          joins: 38,
          "transactions-acid": 44,
        },
        activeMisconceptions: [
          {
            conceptId: "tables-rows-columns",
            tag: "null-equality-trap",
            description:
              "Used `= NULL` instead of `IS NULL`, expecting `NULL = NULL` to evaluate to TRUE.",
            occurrences: 2,
          },
          {
            conceptId: "candidate-superkeys",
            tag: "superkey-minimality-confusion",
            description:
              "Classified non-minimal composite supersets of a primary key as candidate keys.",
            occurrences: 2,
          },
          {
            conceptId: "sql-queries",
            tag: "where-vs-having-execution-order",
            description:
              "Placed `AVG()` and `COUNT()` conditions inside `WHERE` prior to `GROUP BY`.",
            occurrences: 3,
          },
        ],
        recentMistakeSummary:
          "3 days inactive; requires prerequisite remediation on NULL three-valued logic and SQL clause order.",
      },
      {
        id: "stu-5",
        name: "Priya Sundaram",
        email: "p.sundaram@university.edu",
        diagnosticScore: 60,
        questionsAttempted: 31,
        accuracy: 68,
        lastActiveDate: yesterday,
        conceptMastery: {
          "db-fundamentals": 85,
          "tables-rows-columns": 80,
          "primary-keys": 83,
          "candidate-superkeys": 72,
          "functional-dependencies": 66,
          "normal-forms-1-2-3": 54,
          bcnf: 45,
          "sql-queries": 81,
          joins: 76,
          "transactions-acid": 49,
        },
        activeMisconceptions: [
          {
            conceptId: "normal-forms-1-2-3",
            tag: "2nf-single-attribute-key-myth",
            description:
              "Misidentified transitive dependencies on single-column keys as 2NF violations.",
            occurrences: 2,
          },
          {
            conceptId: "transactions-acid",
            tag: "dirty-vs-nonrepeatable-vs-phantom",
            description:
              "Confused phantom reads (new rows matching range) with non-repeatable reads (updated existing row).",
            occurrences: 2,
          },
        ],
        recentMistakeSummary:
          "Strong SQL & Joins performance; needs focused review on ACID concurrency anomalies and 2NF vs 3NF.",
      },
      {
        id: "stu-6",
        name: "Lucas Chen",
        email: "l.chen@university.edu",
        diagnosticScore: 70,
        questionsAttempted: 27,
        accuracy: 70,
        lastActiveDate: twoDaysAgo,
        conceptMastery: {
          "db-fundamentals": 86,
          "tables-rows-columns": 79,
          "primary-keys": 76,
          "candidate-superkeys": 61,
          "functional-dependencies": 58,
          "normal-forms-1-2-3": 62,
          bcnf: 42,
          "sql-queries": 64,
          joins: 52,
          "transactions-acid": 78,
        },
        activeMisconceptions: [
          {
            conceptId: "sql-queries",
            tag: "not-in-with-null-trap",
            description:
              "Expected `NOT IN (subquery)` to ignore NULL rows rather than returning 0 rows.",
            occurrences: 2,
          },
          {
            conceptId: "bcnf",
            tag: "3nf-vs-bcnf-prime-exception",
            description:
              "Did not check candidate key membership of RHS attribute when distinguishing 3NF from BCNF.",
            occurrences: 2,
          },
        ],
        recentMistakeSummary:
          "Solid transaction recovery knowledge; tripped by NULL propagation in subqueries and BCNF.",
      },
    ],
  };
}
