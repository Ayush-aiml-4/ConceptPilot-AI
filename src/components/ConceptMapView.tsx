import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Layers,
} from "lucide-react";
import { Student } from "../types";
import {
  getDependentConcepts,
  SYLLABUS_CONCEPTS,
} from "../data/syllabus";
import {
  ConceptStatusLabel,
  formatRelativeDate,
  MasteryProgressBar,
} from "./StatusIndicator";

interface ConceptMapViewProps {
  student: Student;
  initialSelectedConceptId: string | null;
  onStartConceptPractice: (conceptId: string, mode?: "adaptive" | "revision") => void;
}

export function ConceptMapView({
  student,
  initialSelectedConceptId,
  onStartConceptPractice,
}: ConceptMapViewProps) {
  const [selectedId, setSelectedId] = useState<string>(
    initialSelectedConceptId && student.concepts[initialSelectedConceptId]
      ? initialSelectedConceptId
      : "candidate-superkeys"
  );

  useEffect(() => {
    if (initialSelectedConceptId && student.concepts[initialSelectedConceptId]) {
      setSelectedId(initialSelectedConceptId);
    }
  }, [initialSelectedConceptId, student.concepts]);

  const selectedConcept =
    student.concepts[selectedId] ?? student.concepts["db-fundamentals"];
  const selectedBlueprint =
    SYLLABUS_CONCEPTS.find((c) => c.id === selectedConcept.id) ??
    SYLLABUS_CONCEPTS[0];

  const prerequisiteConcepts = selectedConcept.prerequisiteIds
    .map((pid) => student.concepts[pid])
    .filter(Boolean);
  const weakPrerequisites = prerequisiteConcepts.filter(
    (p) => p.masteryScore < 65
  );
  const dependentBlueprints = getDependentConcepts(selectedConcept.id);

  const conceptAttempts = student.attempts.filter(
    (a) => a.conceptId === selectedConcept.id
  );
  const recentMistakes = conceptAttempts
    .filter((a) => !a.evaluation.isAnswerCorrect)
    .slice(0, 3);
  const activeMisconceptions = selectedConcept.knownMisconceptions.filter(
    (m) => !m.resolved
  );

  const accuracyPct =
    selectedConcept.questionsAttempted > 0
      ? Math.round(
          (selectedConcept.correctAnswers /
            selectedConcept.questionsAttempted) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
            DBMS Prerequisite Concept Graph
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Select any node to inspect prerequisite readiness, recorded
            misconceptions, and recommended action.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" />
            <span>Mastered (≥80%)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400/80" />
            <span>Developing (50–79%)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/80" />
            <span>Weak (&lt;50%)</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Interactive SVG Dependency Canvas */}
        <section
          aria-label="Interactive DBMS Prerequisite Graph"
          className="xl:col-span-8 bg-[#0F1626] border border-slate-800/90 rounded-xl p-4 sm:p-5 overflow-x-auto"
        >
          <div className="min-w-[820px]">
            <svg
              viewBox="0 0 1120 480"
              className="w-full h-auto select-none"
              role="img"
              aria-label="Directed acyclic graph of 10 DBMS Fundamentals concepts"
            >
              <defs>
                <marker
                  id="arrow-muted"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#818CF8" />
                </marker>
              </defs>

              {/* Edges */}
              {SYLLABUS_CONCEPTS.map((targetBp) =>
                targetBp.prerequisiteIds.map((sourceId) => {
                  const sourceBp = SYLLABUS_CONCEPTS.find(
                    (c) => c.id === sourceId
                  );
                  if (!sourceBp) return null;

                  const x1 = sourceBp.graphPosition.x + 80;
                  const y1 = sourceBp.graphPosition.y;
                  const x2 = targetBp.graphPosition.x - 84;
                  const y2 = targetBp.graphPosition.y;

                  // Vertical stack on right-hand normal forms column
                  const sameCol =
                    Math.abs(
                      sourceBp.graphPosition.x - targetBp.graphPosition.x
                    ) < 20;

                  const pathD = sameCol
                    ? `M ${sourceBp.graphPosition.x} ${
                        sourceBp.graphPosition.y + 34
                      } L ${targetBp.graphPosition.x} ${
                        targetBp.graphPosition.y - 38
                      }`
                    : `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${
                        (x1 + x2) / 2
                      } ${y2}, ${x2} ${y2}`;

                  const isHighlighted =
                    targetBp.id === selectedConcept.id ||
                    sourceBp.id === selectedConcept.id;

                  return (
                    <path
                      key={`${sourceId}->${targetBp.id}`}
                      d={pathD}
                      fill="none"
                      stroke={isHighlighted ? "#818CF8" : "#334155"}
                      strokeWidth={isHighlighted ? 2.2 : 1.4}
                      strokeDasharray={isHighlighted ? undefined : "4 3"}
                      markerEnd={
                        isHighlighted
                          ? "url(#arrow-active)"
                          : "url(#arrow-muted)"
                      }
                    />
                  );
                })
              )}

              {/* Nodes */}
              {SYLLABUS_CONCEPTS.map((bp) => {
                const concept = student.concepts[bp.id];
                if (!concept) return null;
                const isSelected = bp.id === selectedConcept.id;
                const isPrereqOfSelected =
                  selectedConcept.prerequisiteIds.includes(bp.id);
                const isDependentOfSelected = bp.prerequisiteIds.includes(
                  selectedConcept.id
                );

                const strokeColor = isSelected
                  ? "#818CF8"
                  : isPrereqOfSelected || isDependentOfSelected
                    ? "#6366F1"
                    : concept.status === "Mastered"
                      ? "#10B981"
                      : concept.status === "Developing"
                        ? "#475569"
                        : "#F43F5E";

                const barColor =
                  concept.status === "Mastered"
                    ? "#10B981"
                    : concept.status === "Developing"
                      ? "#818CF8"
                      : "#F43F5E";

                const nx = bp.graphPosition.x - 80;
                const ny = bp.graphPosition.y - 32;

                return (
                  <g
                    key={bp.id}
                    transform={`translate(${nx}, ${ny})`}
                    onClick={() => setSelectedId(bp.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(bp.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    aria-label={`${concept.name}, Mastery ${concept.masteryScore}%, Status ${concept.status}`}
                    className="cursor-pointer focus:outline-none"
                  >
                    <rect
                      width="160"
                      height="64"
                      rx="10"
                      fill={isSelected ? "#17213A" : "#0B111E"}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 2.4 : 1.3}
                    />
                    <text
                      x="12"
                      y="23"
                      fill="#F8FAFC"
                      fontSize="11.5"
                      fontWeight="600"
                      fontFamily="Plus Jakarta Sans, sans-serif"
                    >
                      {bp.shortName}
                    </text>
                    <text
                      x="12"
                      y="41"
                      fill="#94A3B8"
                      fontSize="10.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {concept.masteryScore}% · {concept.status}
                    </text>
                    {/* Progress Bar inside SVG Node */}
                    <rect
                      x="12"
                      y="50"
                      width="136"
                      height="4"
                      rx="2"
                      fill="#1E293B"
                    />
                    <rect
                      x="12"
                      y="50"
                      width={Math.max(
                        4,
                        Math.round((136 * concept.masteryScore) / 100)
                      )}
                      height="4"
                      rx="2"
                      fill={barColor}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Accessible Quick-Select Grid below SVG for mobile/keyboard speed */}
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SYLLABUS_CONCEPTS.map((bp) => {
              const c = student.concepts[bp.id];
              const active = bp.id === selectedConcept.id;
              return (
                <button
                  key={bp.id}
                  type="button"
                  onClick={() => setSelectedId(bp.id)}
                  className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                    active
                      ? "bg-indigo-950/50 border-indigo-500 text-slate-50"
                      : "bg-slate-950/50 border-slate-800/90 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <p className="text-xs font-medium truncate">{bp.shortName}</p>
                  <p className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                    {c.masteryScore}% · {c.status}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Concept Detail Inspector Panel */}
        <aside className="xl:col-span-4 bg-[#0F1626] border border-slate-800/90 rounded-xl divide-y divide-slate-800/80">
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-indigo-400 font-medium">
                Tier {selectedBlueprint.tier + 1} Concept
              </span>
              <ConceptStatusLabel status={selectedConcept.status} />
            </div>

            <h2 className="text-xl font-bold text-slate-50">
              {selectedConcept.name}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedConcept.summary}
            </p>

            <div className="pt-2 space-y-1.5">
              <div className="flex items-baseline justify-between text-xs tabular-nums">
                <span className="text-slate-400">Mastery Score</span>
                <span className="text-base font-bold font-mono text-slate-100">
                  {selectedConcept.masteryScore}%
                </span>
              </div>
              <MasteryProgressBar
                score={selectedConcept.masteryScore}
                status={selectedConcept.status}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs tabular-nums">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                <p className="text-slate-400">Attempts & Accuracy</p>
                <p className="font-mono font-semibold text-slate-100 mt-1">
                  {selectedConcept.correctAnswers}/
                  {selectedConcept.questionsAttempted} ({accuracyPct}%)
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                <p className="text-slate-400">Confidence</p>
                <p className="font-mono font-semibold text-slate-100 mt-1">
                  {selectedConcept.confidenceEstimate}%
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                <p className="text-slate-400">Last Reviewed</p>
                <p className="font-mono font-semibold text-slate-100 mt-1">
                  {formatRelativeDate(selectedConcept.lastReviewedDate)}
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                <p className="text-slate-400">Next Review</p>
                <p className="font-mono font-semibold text-slate-100 mt-1">
                  {formatRelativeDate(selectedConcept.nextReviewDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Prerequisites & Unlocks */}
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Prerequisites</span>
              </h3>
              {prerequisiteConcepts.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Root syllabus concept — no prior prerequisites required.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {prerequisiteConcepts.map((prereq) => (
                    <button
                      key={prereq.id}
                      type="button"
                      onClick={() => setSelectedId(prereq.id)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs transition-colors"
                    >
                      <span className="text-slate-200 font-medium">
                        {prereq.name}
                      </span>
                      <span className="font-mono tabular-nums text-slate-300">
                        {prereq.masteryScore}%
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {dependentBlueprints.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span>Unlocks Downstream Concepts</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {dependentBlueprints.map((d) => d.name).join(" · ")}
                </p>
              </div>
            )}
          </div>

          {/* Known Misconceptions & Recent Mistakes */}
          <div className="p-6 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300">
              Recorded Misconceptions ({activeMisconceptions.length} active)
            </h3>
            {selectedConcept.knownMisconceptions.length === 0 ? (
              <p className="text-xs text-slate-400">
                No misconceptions recorded on this concept yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {selectedConcept.knownMisconceptions.map((m) => (
                  <div
                    key={m.id}
                    className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-300">
                        {m.tag}
                      </span>
                      {m.resolved ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Resolved</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 tabular-nums">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{m.occurrences}× active</span>
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {m.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {recentMistakes.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <p className="text-xs font-semibold text-slate-300">
                  Recent Mistake
                </p>
                <p className="text-xs text-slate-400 line-clamp-2">
                  "{recentMistakes[0].studentAnswer}" on:{" "}
                  {recentMistakes[0].questionPrompt}
                </p>
              </div>
            )}
          </div>

          {/* Recommended Next Action CTA */}
          <div className="p-6 space-y-2.5">
            {weakPrerequisites.length > 0 ? (
              <>
                <p className="text-xs text-amber-300">
                  Prerequisite recommendation:{" "}
                  <strong>{weakPrerequisites[0].name}</strong> is at{" "}
                  {weakPrerequisites[0].masteryScore}%. Strengthening it first
                  accelerates {selectedConcept.shortName}.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onStartConceptPractice(weakPrerequisites[0].id, "adaptive")
                    }
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <span>
                      Review Prerequisite: {weakPrerequisites[0].shortName}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onStartConceptPractice(selectedConcept.id, "adaptive")
                    }
                    className="w-full px-4 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Practice {selectedConcept.shortName} Directly
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onStartConceptPractice(selectedConcept.id, "adaptive")
                }
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap"
              >
                <span>Practice {selectedConcept.shortName}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
