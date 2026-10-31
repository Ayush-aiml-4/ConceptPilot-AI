import { Student } from "../types";
import { CONCEPT_ORDER, createInitialConceptsMap, getMasteryStatus } from "../data/syllabus";
import { createFreshStudent, createSeededDemoStudent } from "../data/seedData";

const STORAGE_KEY = "conceptpilot_ai_state_v1";
const SCHEMA_VERSION = 1;

interface PersistedEnvelope {
  version: number;
  savedAt: string;
  student: Student;
}

function isValidStudentShape(raw: unknown): raw is Student {
  if (!raw || typeof raw !== "object") return false;
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") {
    return false;
  }
  if (!candidate.concepts || typeof candidate.concepts !== "object") {
    return false;
  }
  if (!Array.isArray(candidate.attempts) || !Array.isArray(candidate.activeDays)) {
    return false;
  }
  return true;
}

/**
 * Reconciles persisted student concepts with SYLLABUS_CONCEPTS so missing fields
 * or corrupted numbers are repaired safely without losing student progress.
 */
function repairStudentRecord(student: Student): Student {
  const defaults = createInitialConceptsMap(0);
  const repairedConcepts: Student["concepts"] = {};

  for (const id of CONCEPT_ORDER) {
    const base = defaults[id];
    const incoming = student.concepts?.[id];
    if (!incoming || typeof incoming !== "object") {
      repairedConcepts[id] = base;
      continue;
    }

    const clampedScore = Number.isFinite(incoming.masteryScore)
      ? Math.max(0, Math.min(100, Math.round(incoming.masteryScore)))
      : 0;

    repairedConcepts[id] = {
      ...base,
      ...incoming,
      id: base.id,
      name: base.name,
      shortName: base.shortName,
      summary: base.summary,
      tier: base.tier,
      prerequisiteIds: [...base.prerequisiteIds],
      masteryScore: clampedScore,
      status: getMasteryStatus(clampedScore),
      confidenceEstimate: Number.isFinite(incoming.confidenceEstimate)
        ? Math.max(0, Math.min(100, Math.round(incoming.confidenceEstimate)))
        : 50,
      questionsAttempted: Math.max(0, Number(incoming.questionsAttempted) || 0),
      correctAnswers: Math.max(0, Number(incoming.correctAnswers) || 0),
      consecutiveSoundCount: Math.max(
        0,
        Number(incoming.consecutiveSoundCount) || 0
      ),
      recentMistakeCount: Math.max(0, Number(incoming.recentMistakeCount) || 0),
      knownMisconceptions: Array.isArray(incoming.knownMisconceptions)
        ? incoming.knownMisconceptions
        : [],
    };
  }

  return {
    ...student,
    concepts: repairedConcepts,
    attempts: Array.isArray(student.attempts) ? student.attempts : [],
    activeDays: Array.isArray(student.activeDays) ? student.activeDays : [],
    revisionTasks:
      student.revisionTasks && typeof student.revisionTasks === "object"
        ? student.revisionTasks
        : {},
  };
}

export function loadPersistedStudent(): {
  student: Student;
  recoveredFromCorruption: boolean;
} {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = createSeededDemoStudent();
      savePersistedStudent(seeded);
      return { student: seeded, recoveredFromCorruption: false };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedEnvelope>;
    if (
      parsed.version !== SCHEMA_VERSION ||
      !isValidStudentShape(parsed.student)
    ) {
      const seeded = createSeededDemoStudent();
      savePersistedStudent(seeded);
      return { student: seeded, recoveredFromCorruption: true };
    }

    return {
      student: repairStudentRecord(parsed.student),
      recoveredFromCorruption: false,
    };
  } catch (err) {
    console.warn("[ConceptPilot Storage] Recovered from malformed localStorage:", err);
    const seeded = createSeededDemoStudent();
    savePersistedStudent(seeded);
    return { student: seeded, recoveredFromCorruption: true };
  }
}

export function savePersistedStudent(student: Student): void {
  try {
    const envelope: PersistedEnvelope = {
      version: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      student,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch (err) {
    console.error("[ConceptPilot Storage] Failed to persist state:", err);
  }
}

export function resetToSeededDemo(): Student {
  const seeded = createSeededDemoStudent();
  savePersistedStudent(seeded);
  return seeded;
}

export function resetToFreshOnboarding(): Student {
  const fresh = createFreshStudent();
  savePersistedStudent(fresh);
  return fresh;
}
