import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Info,
  Search,
  Users,
} from "lucide-react";
import { Student, TeacherClass, TeacherStudentRecord } from "../types";
import { CONCEPT_ORDER, getMasteryStatus, SYLLABUS_CONCEPTS } from "../data/syllabus";
import { computeStudentMetrics, toDateOnlyISO } from "../engine/adaptiveEngine";
import { ConceptStatusLabel, MasteryProgressBar } from "./StatusIndicator";

interface TeacherDashboardProps {
  teacherClass: TeacherClass;
  activeLocalStudent: Student;
}

export function TeacherDashboard({
  teacherClass,
  activeLocalStudent,
}: TeacherDashboardProps) {
  const [includeLocalLearner, setIncludeLocalLearner] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    teacherClass.students[1]?.id ?? teacherClass.students[0].id
  );

  // Convert active local learner into a live TeacherStudentRecord so teachers/evaluators
  // can inspect both the seeded cohort AND real-time local learner activity transparently!
  const localLearnerRecord: TeacherStudentRecord = useMemo(() => {
    const metrics = computeStudentMetrics(activeLocalStudent);
    const masteryMap: Record<string, number> = {};
    const activeMisc: TeacherStudentRecord["activeMisconceptions"] = [];

    for (const id of CONCEPT_ORDER) {
      const c = activeLocalStudent.concepts[id];
      masteryMap[id] = c?.masteryScore ?? 0;
      for (const m of c?.knownMisconceptions ?? []) {
        if (!m.resolved) {
          activeMisc.push({
            conceptId: id,
            tag: m.tag,
            description: m.description,
            occurrences: m.occurrences,
          });
        }
      }
    }

    const diagPct = activeLocalStudent.lastDiagnosticSummary
      ? Math.round(
          (activeLocalStudent.lastDiagnosticSummary.correctCount /
            activeLocalStudent.lastDiagnosticSummary.totalQuestions) *
            100
        )
      : 0;

    return {
      id: "live-local-learner",
      name: `${activeLocalStudent.name} (Active Session)`,
      email: "local.session@conceptpilot.app",
      diagnosticScore: diagPct,
      questionsAttempted: metrics.questionsAttempted,
      accuracy: metrics.accuracyPercent,
      lastActiveDate:
        activeLocalStudent.activeDays[
          activeLocalStudent.activeDays.length - 1
        ] ?? toDateOnlyISO(new Date()),
      conceptMastery: masteryMap,
      activeMisconceptions: activeMisc,
      recentMistakeSummary:
        activeLocalStudent.attempts[0] &&
        !activeLocalStudent.attempts[0].evaluation.isAnswerCorrect
          ? activeLocalStudent.attempts[0].evaluation.detectedMisconception ||
            activeLocalStudent.attempts[0].evaluation.explanation
          : "Live browser session synced directly from Student & Learn tabs.",
    };
  }, [activeLocalStudent]);

  const cohortStudents = useMemo(() => {
    return includeLocalLearner
      ? [localLearnerRecord, ...teacherClass.students]
      : teacherClass.students;
  }, [includeLocalLearner, localLearnerRecord, teacherClass.students]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cohortStudents;
    return cohortStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [cohortStudents, searchQuery]);

  // Real cohort calculations across cohortStudents
  const conceptAnalytics = useMemo(() => {
    return SYLLABUS_CONCEPTS.map((bp) => {
      const scores = cohortStudents.map(
        (s) => s.conceptMastery[bp.id] ?? 0
      );
      const avgMastery =
        scores.length > 0
          ? Math.round(scores.reduce((acc, v) => acc + v, 0) / scores.length)
          : 0;
      const strugglingCount = scores.filter((sc) => sc < 55).length;
      return {
        conceptId: bp.id,
        name: bp.name,
        shortName: bp.shortName,
        avgMastery,
        status: getMasteryStatus(avgMastery),
        strugglingCount,
      };
    }).sort((a, b) => a.avgMastery - b.avgMastery);
  }, [cohortStudents]);

  const commonMisconceptions = useMemo(() => {
    const map = new Map<
      string,
      {
        tag: string;
        conceptId: string;
        description: string;
        studentCount: number;
        totalOccurrences: number;
      }
    >();

    for (const s of cohortStudents) {
      for (const m of s.activeMisconceptions) {
        const prev = map.get(m.tag);
        if (prev) {
          prev.studentCount += 1;
          prev.totalOccurrences += m.occurrences;
        } else {
          map.set(m.tag, {
            tag: m.tag,
            conceptId: m.conceptId,
            description: m.description,
            studentCount: 1,
            totalOccurrences: m.occurrences,
          });
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        b.studentCount - a.studentCount ||
        b.totalOccurrences - a.totalOccurrences
    );
  }, [cohortStudents]);

  const classAverageMastery = useMemo(() => {
    if (conceptAnalytics.length === 0) return 0;
    const sum = conceptAnalytics.reduce((acc, c) => acc + c.avgMastery, 0);
    return Math.round(sum / conceptAnalytics.length);
  }, [conceptAnalytics]);

  const topicsNeedingRevision = conceptAnalytics.filter(
    (c) => c.avgMastery < 60
  );

  const selectedStudent =
    cohortStudents.find((s) => s.id === selectedStudentId) ?? cohortStudents[0];

  const selectedStudentAvg = useMemo(() => {
    const vals = CONCEPT_ORDER.map(
      (id) => selectedStudent.conceptMastery[id] ?? 0
    );
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [selectedStudent]);

  return (
    <div className="space-y-8">
      {/* Visible Distinction Banner: Seeded Demo Cohort vs Live Learner */}
      <section className="bg-indigo-950/25 border border-indigo-500/35 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <p className="font-semibold text-slate-100">
              Demonstration Cohort Data Notice · {teacherClass.className} (
              {teacherClass.term})
            </p>
            <p className="text-slate-300 leading-relaxed">
              Includes 6 seeded demonstration student records for{" "}
              {teacherClass.instructor} so class-wide analytics can be
              inspected. Toggle live learner sync to compare or isolate your
              active browser session.
            </p>
          </div>
        </div>

        <label className="inline-flex items-center gap-2.5 text-xs font-medium text-slate-200 cursor-pointer shrink-0 select-none">
          <input
            type="checkbox"
            checked={includeLocalLearner}
            onChange={(e) => setIncludeLocalLearner(e.target.checked)}
            className="accent-indigo-500 w-4 h-4 rounded"
          />
          <span className="whitespace-nowrap">
            Include Active Local Learner in Rollup
          </span>
        </label>
      </section>

      {/* Cohort KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Enrolled Students Analyzed</span>
            <Users className="w-4 h-4 text-indigo-400 shrink-0" />
          </div>
          <p className="mt-3 text-3xl font-bold font-mono tabular-nums text-slate-50">
            {cohortStudents.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {includeLocalLearner
              ? "6 seeded demo + 1 live session"
              : "6 seeded demo students only"}
          </p>
        </div>

        <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Class-Wide Mean Mastery</span>
            <BarChart3 className="w-4 h-4 text-violet-400 shrink-0" />
          </div>
          <p className="mt-3 text-3xl font-bold font-mono tabular-nums text-slate-50">
            {classAverageMastery}%
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Computed across all 10 DBMS concepts
          </p>
        </div>

        <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Topics Needing Whole-Class Review</span>
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          </div>
          <p className="mt-3 text-3xl font-bold font-mono tabular-nums text-slate-50">
            {topicsNeedingRevision.length}
          </p>
          <p className="mt-1 text-xs text-slate-400 truncate">
            {topicsNeedingRevision.map((t) => t.shortName).join(", ") ||
              "None below 60%"}
          </p>
        </div>

        <div className="bg-[#0F1626] border border-slate-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Distinct Misconception Clusters</span>
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <p className="mt-3 text-3xl font-bold font-mono tabular-nums text-slate-50">
            {commonMisconceptions.length}
          </p>
          <p className="mt-1 text-xs text-slate-400 truncate">
            Top:{" "}
            {commonMisconceptions[0]?.tag.replace(/-/g, " ") ?? "None"}
          </p>
        </div>
      </section>

      {/* Class-Wide Mastery by Concept + Common Misconceptions */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <section className="xl:col-span-7 bg-[#0F1626] border border-slate-800/80 rounded-xl flex flex-col">
          <div className="px-6 py-4 border-b border-slate-800/80">
            <h2 className="text-base font-semibold text-slate-100">
              Class-Wide Mastery by Concept (Lowest First)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Topics under 60% are flagged for instructor-led lecture review
            </p>
          </div>

          <div className="divide-y divide-slate-800/70 flex-1">
            {conceptAnalytics.map((item) => (
              <div
                key={item.conceptId}
                className="px-6 py-3.5 grid grid-cols-12 items-center gap-4"
              >
                <div className="col-span-5 sm:col-span-4 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-100 truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    {item.strugglingCount}/{cohortStudents.length} students
                    &lt;55%
                  </p>
                </div>

                <div className="col-span-4 sm:col-span-5">
                  <MasteryProgressBar
                    score={item.avgMastery}
                    status={item.status}
                  />
                </div>

                <div className="col-span-3 flex items-center justify-end gap-2">
                  <span className="text-sm font-mono font-semibold tabular-nums text-slate-100">
                    {item.avgMastery}%
                  </span>
                  <span className="hidden sm:inline-flex">
                    <ConceptStatusLabel status={item.status} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="xl:col-span-5 bg-[#0F1626] border border-slate-800/80 rounded-xl flex flex-col">
          <div className="px-6 py-4 border-b border-slate-800/80">
            <h2 className="text-base font-semibold text-slate-100">
              Most Common Class Misconceptions
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked by number of affected students and repeat occurrences
            </p>
          </div>

          <div className="divide-y divide-slate-800/80 flex-1">
            {commonMisconceptions.slice(0, 6).map((misc) => {
              const bp = SYLLABUS_CONCEPTS.find(
                (c) => c.id === misc.conceptId
              );
              return (
                <div key={misc.tag} className="p-5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-indigo-300">
                      {bp?.shortName ?? misc.conceptId}
                    </span>
                    <span className="font-mono tabular-nums text-rose-300">
                      {misc.studentCount}{" "}
                      {misc.studentCount === 1 ? "student" : "students"} ·{" "}
                      {misc.totalOccurrences}× total
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {misc.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Student Roster & Individual Student Drill-Down */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <section className="xl:col-span-6 bg-[#0F1626] border border-slate-800/80 rounded-xl">
          <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Student Roster
              </h2>
              <p className="text-xs text-slate-400">
                Select any student for per-concept mastery & misconception
                drill-down
              </p>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter student..."
                aria-label="Filter students by name"
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-xs text-slate-400">
                  <th className="py-3 px-5 font-medium">Student</th>
                  <th className="py-3 px-3 font-medium text-right">
                    Mean Mastery
                  </th>
                  <th className="py-3 px-3 font-medium text-right">
                    Accuracy
                  </th>
                  <th className="py-3 px-5 font-medium text-right">
                    Attempts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredStudents.map((stu) => {
                  const vals = CONCEPT_ORDER.map(
                    (id) => stu.conceptMastery[id] ?? 0
                  );
                  const mean = Math.round(
                    vals.reduce((a, b) => a + b, 0) / vals.length
                  );
                  const isSelected = stu.id === selectedStudent.id;
                  const isLive = stu.id === "live-local-learner";

                  return (
                    <tr
                      key={stu.id}
                      onClick={() => setSelectedStudentId(stu.id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedStudentId(stu.id);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-indigo-950/40"
                          : "hover:bg-slate-900/50"
                      }`}
                    >
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-100">
                          {stu.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {isLive ? "Live Browser Learner" : "Seeded Demo Cohort"} ·
                          Active {stu.lastActiveDate}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold tabular-nums text-slate-100">
                        {mean}%
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-300">
                        {stu.accuracy}%
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono tabular-nums text-slate-300">
                        {stu.questionsAttempted}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Student-Level Drill-Down */}
        <section className="xl:col-span-6 bg-[#0F1626] border border-slate-800/80 rounded-xl divide-y divide-slate-800/80">
          <div className="p-6 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-indigo-400">
                Individual Student Drill-Down
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                Diagnostic: {selectedStudent.diagnosticScore}% · Overall Mean:{" "}
                {selectedStudentAvg}%
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-50">
              {selectedStudent.name}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedStudent.recentMistakeSummary}
            </p>
          </div>

          <div className="p-6 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300">
              Per-Concept Mastery Profile
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SYLLABUS_CONCEPTS.map((bp) => {
                const score = selectedStudent.conceptMastery[bp.id] ?? 0;
                const st = getMasteryStatus(score);
                return (
                  <div
                    key={bp.id}
                    className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-200 font-medium truncate">
                        {bp.shortName}
                      </span>
                      <span className="font-mono tabular-nums text-slate-100">
                        {score}%
                      </span>
                    </div>
                    <MasteryProgressBar score={score} status={st} size="sm" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6 space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-300">
              Active Misconceptions ({selectedStudent.activeMisconceptions.length})
            </h4>
            {selectedStudent.activeMisconceptions.length === 0 ? (
              <p className="text-xs text-slate-400">
                No active unresolved misconceptions flagged for this student.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedStudent.activeMisconceptions.map((m) => {
                  const bp = SYLLABUS_CONCEPTS.find(
                    (c) => c.id === m.conceptId
                  );
                  return (
                    <div
                      key={`${selectedStudent.id}-${m.tag}`}
                      className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-rose-300 font-medium">
                        <span>{bp?.name ?? m.conceptId}</span>
                        <span className="font-mono tabular-nums">
                          {m.occurrences}× detected
                        </span>
                      </div>
                      <p className="text-slate-300">{m.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
