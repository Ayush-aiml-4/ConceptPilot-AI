import { Concept, ConceptStatus } from "../types";

export interface ConceptBlueprint {
  id: string;
  name: string;
  shortName: string;
  summary: string;
  tier: number;
  prerequisiteIds: string[];
  graphPosition: { x: number; y: number };
}

export const SYLLABUS_CONCEPTS: ConceptBlueprint[] = [
  {
    id: "db-fundamentals",
    name: "Database Fundamentals",
    shortName: "DB Fundamentals",
    summary:
      "Three-schema architecture, physical vs logical data independence, schemas vs instances, and DBMS guarantees over flat file systems.",
    tier: 0,
    prerequisiteIds: [],
    graphPosition: { x: 110, y: 210 },
  },
  {
    id: "tables-rows-columns",
    name: "Tables, Rows, and Columns",
    shortName: "Relations & Tuples",
    summary:
      "Relational model terminology (relation, tuple, attribute, domain), degree vs cardinality, unordered set semantics, and three-valued NULL logic.",
    tier: 1,
    prerequisiteIds: ["db-fundamentals"],
    graphPosition: { x: 310, y: 135 },
  },
  {
    id: "primary-keys",
    name: "Primary Keys",
    shortName: "Primary Keys",
    summary:
      "Entity integrity constraint, uniqueness + NOT NULL enforcement, composite primary keys, and choosing stable natural vs surrogate identifiers.",
    tier: 2,
    prerequisiteIds: ["tables-rows-columns"],
    graphPosition: { x: 520, y: 135 },
  },
  {
    id: "candidate-superkeys",
    name: "Candidate Keys and Superkeys",
    shortName: "Candidate & Superkeys",
    summary:
      "Uniqueness vs irreducibility (minimality): why every candidate key is a minimal superkey, prime vs non-prime attributes, and multiple candidate keys.",
    tier: 3,
    prerequisiteIds: ["primary-keys"],
    graphPosition: { x: 735, y: 80 },
  },
  {
    id: "functional-dependencies",
    name: "Functional Dependencies",
    shortName: "Functional Deps",
    summary:
      "Deterministic mapping X → Y across all legal instances, Armstrong's axioms, computing attribute closure X⁺, and verifying keys from FDs.",
    tier: 4,
    prerequisiteIds: ["candidate-superkeys"],
    graphPosition: { x: 955, y: 80 },
  },
  {
    id: "normal-forms-1-2-3",
    name: "First, Second, and Third Normal Forms",
    shortName: "1NF, 2NF & 3NF",
    summary:
      "Atomic attribute domains (1NF), eliminating partial dependencies on composite candidate keys (2NF), and removing transitive dependencies with the prime-attribute rule (3NF).",
    tier: 5,
    prerequisiteIds: ["functional-dependencies"],
    graphPosition: { x: 955, y: 215 },
  },
  {
    id: "bcnf",
    name: "BCNF",
    shortName: "Boyce-Codd NF",
    summary:
      "Strict determinant rule (every non-trivial X → Y requires X to be a superkey), edge cases where 3NF fails BCNF, and lossless-join vs dependency-preserving trade-offs.",
    tier: 6,
    prerequisiteIds: ["normal-forms-1-2-3"],
    graphPosition: { x: 955, y: 350 },
  },
  {
    id: "sql-queries",
    name: "SQL Queries",
    shortName: "SQL Queries",
    summary:
      "Logical evaluation order (FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY), aggregate semantics with NULLs, and row filtering vs group filtering.",
    tier: 3,
    prerequisiteIds: ["tables-rows-columns", "primary-keys"],
    graphPosition: { x: 520, y: 290 },
  },
  {
    id: "joins",
    name: "Joins",
    shortName: "Relational Joins",
    summary:
      "INNER, LEFT/RIGHT/FULL OUTER, CROSS, and self-joins, plus how predicates in ON vs WHERE change outer-join NULL-extended rows.",
    tier: 4,
    prerequisiteIds: ["sql-queries", "primary-keys"],
    graphPosition: { x: 735, y: 290 },
  },
  {
    id: "transactions-acid",
    name: "Transactions and ACID Properties",
    shortName: "Transactions & ACID",
    summary:
      "Atomicity, Consistency, Isolation, Durability, write-ahead logging (UNDO/REDO), concurrency anomalies (dirty, non-repeatable, phantom reads), and isolation levels.",
    tier: 4,
    prerequisiteIds: ["db-fundamentals", "sql-queries"],
    graphPosition: { x: 520, y: 410 },
  },
];

export const CONCEPT_ORDER: string[] = SYLLABUS_CONCEPTS.map((c) => c.id);

export function getMasteryStatus(score: number): ConceptStatus {
  if (score >= 80) return "Mastered";
  if (score >= 50) return "Developing";
  return "Weak";
}

export function createInitialConceptsMap(defaultMastery = 0): Record<string, Concept> {
  const map: Record<string, Concept> = {};
  for (const bp of SYLLABUS_CONCEPTS) {
    map[bp.id] = {
      id: bp.id,
      name: bp.name,
      shortName: bp.shortName,
      summary: bp.summary,
      tier: bp.tier,
      prerequisiteIds: [...bp.prerequisiteIds],
      masteryScore: defaultMastery,
      status: getMasteryStatus(defaultMastery),
      confidenceEstimate: defaultMastery > 0 ? 55 : 0,
      questionsAttempted: 0,
      correctAnswers: 0,
      consecutiveSoundCount: 0,
      recentMistakeCount: 0,
      lastReviewedDate: null,
      nextReviewDate: null,
      knownMisconceptions: [],
    };
  }
  return map;
}

export function getDependentConcepts(conceptId: string): ConceptBlueprint[] {
  return SYLLABUS_CONCEPTS.filter((c) => c.prerequisiteIds.includes(conceptId));
}
