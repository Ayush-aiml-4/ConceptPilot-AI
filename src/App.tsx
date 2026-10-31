import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  Compass,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Users,
  X,
} from "lucide-react";
import { AppView, Attempt, Student } from "./types";
import { createSeededTeacherClass } from "./data/seedData";
import { computeStudentMetrics } from "./engine/adaptiveEngine";
import {
  loadPersistedStudent,
  resetToFreshOnboarding,
  resetToSeededDemo,
  savePersistedStudent,
} from "./engine/storage";
import { StudentDashboard } from "./components/StudentDashboard";
import { LearnView } from "./components/LearnView";
import { DiagnosticView } from "./components/DiagnosticView";
import { ConceptMapView } from "./components/ConceptMapView";
import { RevisionPlannerView } from "./components/RevisionPlannerView";
import { TeacherDashboard } from "./components/TeacherDashboard";

interface NavItem {
  id: AppView;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Student Dashboard",
    shortLabel: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "learn",
    label: "Learn",
    shortLabel: "Learn",
    icon: BookOpen,
  },
  {
    id: "diagnostic",
    label: "Diagnostic Test",
    shortLabel: "Diagnostic",
    icon: ClipboardCheck,
  },
  {
    id: "concept-map",
    label: "Concept Map",
    shortLabel: "Concept Map",
    icon: GitBranch,
  },
  {
    id: "revision",
    label: "Revision Planner",
    shortLabel: "Revision",
    icon: CalendarClock,
  },
  {
    id: "teacher",
    label: "Teacher Dashboard",
    shortLabel: "Teacher",
    icon: Users,
  },
];

export default function App() {
  const initialLoad = useMemo(() => loadPersistedStudent(), []);
  const [student, setStudent] = useState<Student>(initialLoad.student);
  const [storageNotice, setStorageNotice] = useState<string | null>(
    initialLoad.recoveredFromCorruption
      ? "Recovered malformed browser storage by restoring default seeded demo records."
      : null
  );

  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Contextual routing targets between views
  const [focusedConceptId, setFocusedConceptId] = useState<string | null>(null);
  const [learnMode, setLearnMode] = useState<"adaptive" | "revision">(
    "adaptive"
  );
  const [inspectedConceptId, setInspectedConceptId] = useState<string | null>(
    null
  );

  // Explicit confirmation modal for resetting demo data or starting fresh onboarding
  const [resetModalMode, setResetModalMode] = useState<
    null | "seeded_demo" | "fresh_student"
  >(null);

  const teacherClass = useMemo(() => createSeededTeacherClass(), []);
  const metrics = useMemo(() => computeStudentMetrics(student), [student]);

  useEffect(() => {
    savePersistedStudent(student);
  }, [student]);

  function handleNavigate(view: AppView) {
    setActiveView(view);
    setMobileMenuOpen(false);
  }

  function handleStartConceptPractice(
    conceptId: string,
    mode: "adaptive" | "revision" = "adaptive"
  ) {
    setFocusedConceptId(conceptId);
    setLearnMode(mode);
    setActiveView("learn");
    setMobileMenuOpen(false);
  }

  function handleInspectConcept(conceptId: string) {
    setInspectedConceptId(conceptId);
    setActiveView("concept-map");
    setMobileMenuOpen(false);
  }

  function handleRecordAttempt(updatedStudent: Student, _attempt: Attempt) {
    setStudent(updatedStudent);
  }

  function handleConfirmReset() {
    if (resetModalMode === "seeded_demo") {
      const next = resetToSeededDemo();
      setStudent(next);
      setFocusedConceptId(null);
      setActiveView("dashboard");
    } else if (resetModalMode === "fresh_student") {
      const next = resetToFreshOnboarding();
      setStudent(next);
      setFocusedConceptId(null);
      setActiveView("dashboard");
    }
    setResetModalMode(null);
  }

  const currentNavMeta =
    NAV_ITEMS.find((n) => n.id === activeView) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex">
      {/* Desktop Collapsible Sidebar */}
      <aside
        aria-label="Primary Workspace Navigation"
        className={`hidden lg:flex flex-col justify-between bg-[#0B101C] border-r border-slate-800/90 shrink-0 transition-[width] duration-200 ${
          sidebarCollapsed ? "w-[74px]" : "w-[264px]"
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => handleNavigate("dashboard")}
              className="flex items-center gap-2.5 text-left min-w-0 focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              {!sidebarCollapsed && (
                <span className="font-display font-bold text-base tracking-tight text-slate-50 truncate">
                  ConceptPilot AI
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-md hover:bg-slate-800/70 transition-colors shrink-0"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="px-4 py-3 border-b border-slate-800/60">
              <p className="text-[11px] text-slate-400 leading-snug">
                Understand your mistakes. Master every concept.
              </p>
            </div>
          )}

          {/* Primary Navigation Links */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              const showOverdueIndicator =
                item.id === "revision" && metrics.overdueReviews.length > 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-200 border border-indigo-500/40"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/70 border border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-indigo-400" : "text-slate-400"
                      }`}
                    />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </span>

                  {!sidebarCollapsed && showOverdueIndicator && (
                    <span className="text-xs font-mono tabular-nums text-rose-400">
                      {metrics.overdueReviews.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Learner Profile & Safe Data Reset Controls */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          {!sidebarCollapsed ? (
            <div className="bg-[#0F1626] border border-slate-800/90 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-md bg-violet-600/25 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-100 truncate">
                    {student.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate tabular-nums">
                    Mastery {metrics.weightedMastery}% · {metrics.streakDays}d
                    streak
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setResetModalMode("seeded_demo")}
                  className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="w-3 h-3 shrink-0" />
                  <span>Reset Demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResetModalMode("fresh_student")}
                  className="px-2 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors whitespace-nowrap"
                >
                  New Student
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setResetModalMode("seeded_demo")}
              title="Reset Demo Data"
              aria-label="Reset Demo Data"
              className="w-full flex items-center justify-center p-2.5 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-[#0B101C] border-r border-slate-800 flex flex-col justify-between z-10">
            <div>
              <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between">
                <span className="font-display font-bold text-base text-slate-50">
                  ConceptPilot AI
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="p-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium ${
                        isActive
                          ? "bg-indigo-600/20 text-indigo-200 border border-indigo-500/40"
                          : "text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-800 space-y-2">
              <p className="text-xs text-slate-400">
                Active Learner: <strong className="text-slate-200">{student.name}</strong>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setResetModalMode("seeded_demo");
                  }}
                  className="px-3 py-2 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg"
                >
                  Reset Demo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setResetModalMode("fresh_student");
                  }}
                  className="px-3 py-2 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg"
                >
                  New Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Clean Contextual Top Bar (Strict 3-Zone SaaS Contract) */}
        <header className="h-14 sm:h-16 px-4 sm:px-8 border-b border-slate-800/80 bg-[#090D16]/95 sticky top-0 z-30 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-300 hover:text-white rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
                DBMS Fundamentals
              </span>
              <span
                aria-hidden="true"
                className="text-slate-600 hidden sm:inline"
              >
                /
              </span>
              <span className="font-semibold text-slate-100 truncate">
                {currentNavMeta.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeView !== "learn" && (
              <button
                type="button"
                onClick={() => {
                  setFocusedConceptId(null);
                  setLearnMode("adaptive");
                  setActiveView("learn");
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Resume Adaptive Practice
              </button>
            )}
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1360px] w-full mx-auto">
          {storageNotice && (
            <div className="mb-6 bg-amber-950/30 border border-amber-700/60 rounded-lg px-4 py-3 flex items-center justify-between gap-4 text-xs text-amber-200">
              <span>{storageNotice}</span>
              <button
                type="button"
                onClick={() => setStorageNotice(null)}
                className="text-amber-300 hover:text-white font-medium whitespace-nowrap"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeView === "dashboard" && (
            <StudentDashboard
              student={student}
              onNavigate={handleNavigate}
              onStartConceptPractice={handleStartConceptPractice}
              onInspectConcept={handleInspectConcept}
            />
          )}

          {activeView === "learn" && (
            <LearnView
              student={student}
              focusedConceptId={focusedConceptId}
              sessionMode={learnMode}
              onClearFocusedConcept={() => {
                setFocusedConceptId(null);
                setLearnMode("adaptive");
              }}
              onRecordAttempt={handleRecordAttempt}
              onInspectConcept={handleInspectConcept}
            />
          )}

          {activeView === "diagnostic" && (
            <DiagnosticView
              student={student}
              onCompleteDiagnostic={(updated) => setStudent(updated)}
              onStartConceptPractice={(conceptId) =>
                handleStartConceptPractice(conceptId, "adaptive")
              }
            />
          )}

          {activeView === "concept-map" && (
            <ConceptMapView
              student={student}
              initialSelectedConceptId={inspectedConceptId}
              onStartConceptPractice={handleStartConceptPractice}
            />
          )}

          {activeView === "revision" && (
            <RevisionPlannerView
              student={student}
              onStartRevision={(conceptId) =>
                handleStartConceptPractice(conceptId, "revision")
              }
              onNavigateDiagnostic={() => handleNavigate("diagnostic")}
            />
          )}

          {activeView === "teacher" && (
            <TeacherDashboard
              teacherClass={teacherClass}
              activeLocalStudent={student}
            />
          )}
        </main>
      </div>

      {/* Explicit Confirmation Modal for Resetting Demo Data / Switching Learner */}
      {resetModalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
        >
          <div className="bg-[#0F1626] border border-slate-700 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h2
                  id="reset-dialog-title"
                  className="text-base font-bold text-slate-50"
                >
                  {resetModalMode === "seeded_demo"
                    ? "Restore Seeded Demo Learner?"
                    : "Start Fresh New Student Profile?"}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {resetModalMode === "seeded_demo"
                    ? "This replaces current local mastery scores, recorded misconceptions, and revision tasks with Aarav Mehta's initial seeded DBMS demo dataset."
                    : "This clears current local attempts and resets all 10 DBMS concepts to 0% so you can test first-time student onboarding and the diagnostic test from scratch."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setResetModalMode(null)}
                className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors whitespace-nowrap"
              >
                {resetModalMode === "seeded_demo"
                  ? "Confirm Reset Demo Data"
                  : "Confirm New Student Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
