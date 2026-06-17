import { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, BookOpen, Calculator, BarChart3, Brain, Settings,
  Bell, Sun, Moon, Menu, X, TrendingUp, Award, Target, Plus,
  Trash2, GraduationCap, Zap, ChevronRight, ChevronDown, Star,
} from "lucide-react";
import {
  ComposedChart, AreaChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
type SemStatus = "completed" | "current" | "upcoming";
interface Semester { id: number; label: string; gpa: number | null; credits: number; status: SemStatus; }
interface Course { id: number; name: string; credits: number; grade: string; }

// ─── Static Data ──────────────────────────────────────────────────────────────
const GRADE_MAP: Record<string, number> = {
  "A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0.0,
};
const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"];

const SEMESTERS: Semester[] = [
  { id: 1, label: "S1", gpa: 3.40, credits: 18, status: "completed" },
  { id: 2, label: "S2", gpa: 3.55, credits: 19, status: "completed" },
  { id: 3, label: "S3", gpa: 3.62, credits: 20, status: "completed" },
  { id: 4, label: "S4", gpa: 3.80, credits: 18, status: "completed" },
  { id: 5, label: "S5", gpa: 3.90, credits: 21, status: "completed" },
  { id: 6, label: "S6", gpa: 3.74, credits: 20, status: "current" },
  { id: 7, label: "S7", gpa: null, credits: 18, status: "upcoming" },
  { id: 8, label: "S8", gpa: null, credits: 18, status: "upcoming" },
];

const INIT_COURSES: Course[] = [
  { id: 1, name: "Machine Learning", credits: 3, grade: "A" },
  { id: 2, name: "Database Systems", credits: 4, grade: "A-" },
  { id: 3, name: "Computer Networks", credits: 3, grade: "B+" },
  { id: 4, name: "Software Engineering", credits: 3, grade: "A" },
  { id: 5, name: "Technical Elective", credits: 2, grade: "B+" },
];

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: BookOpen, label: "Semester Management", id: "semesters" },
  { icon: Calculator, label: "GPA Calculator", id: "calculator" },
  { icon: BarChart3, label: "CGPA Analytics", id: "analytics" },
  { icon: Brain, label: "Prediction Engine", id: "prediction" },
  { icon: Settings, label: "Settings", id: "settings" },
];

const TARGET_OPTIONS = [3.3, 3.4, 3.5, 3.6, 3.65, 3.7, 3.75, 3.8, 3.85, 3.9, 3.95, 4.0];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function cgpaOf(sems: Semester[]) {
  const done = sems.filter(s => s.gpa !== null);
  if (!done.length) return 0;
  return done.reduce((a, s) => a + s.gpa! * s.credits, 0) /
    done.reduce((a, s) => a + s.credits, 0);
}

function gpaOf(courses: Course[]) {
  const valid = courses.filter(c => GRADE_MAP[c.grade] !== undefined && c.credits > 0);
  if (!valid.length) return 0;
  return valid.reduce((a, c) => a + GRADE_MAP[c.grade] * c.credits, 0) /
    valid.reduce((a, c) => a + c.credits, 0);
}

function gpaColor(g: number) {
  if (g >= 3.7) return "#22C55E";
  if (g >= 3.0) return "#818CF8";
  if (g >= 2.0) return "#F59E0B";
  return "#EF4444";
}

function gpaLabel(g: number) {
  if (g >= 3.7) return "Distinction";
  if (g >= 3.3) return "High Merit";
  if (g >= 3.0) return "Merit";
  if (g >= 2.0) return "Pass";
  return "At Risk";
}

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ value, size = 144, sw = 10 }: { value: number; size?: number; sw?: number }) {
  const [anim, setAnim] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnim(value), 120); return () => clearTimeout(t); }, [value]);
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (anim / 4.0) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={gpaColor(value)} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease" }}
      />
    </svg>
  );
}

// ─── Chart Tooltips ───────────────────────────────────────────────────────────
function GPATooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl px-3 py-2 shadow-2xl">
      <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {Number(payload[0]?.value).toFixed(2)} GPA
      </p>
    </div>
  );
}

function ProjTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number | null; stroke: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const vals = payload.filter(p => p.value !== null);
  if (!vals.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl px-3 py-2 shadow-2xl">
      <p className="text-[10px] text-slate-400 mb-1">{label}</p>
      {vals.map(p => (
        <p key={p.dataKey} className="text-sm font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: p.stroke }}>
          {Number(p.value).toFixed(3)} {p.dataKey === "cgpa" ? "CGPA" : "Projected"}
        </p>
      ))}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(true);
  const [nav, setNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>(INIT_COURSES);
  const [target, setTarget] = useState(3.8);
  const [nextId, setNextId] = useState(INIT_COURSES.length + 1);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const cgpa = useMemo(() => cgpaOf(SEMESTERS), []);
  const semGPA = useMemo(() => gpaOf(courses), [courses]);

  const doneSems = SEMESTERS.filter(s => s.gpa !== null);
  const curPts = doneSems.reduce((a, s) => a + s.gpa! * s.credits, 0);
  const curCr = doneSems.reduce((a, s) => a + s.credits, 0);
  const upcomingSems = SEMESTERS.filter(s => s.status === "upcoming");
  const remCr = upcomingSems.reduce((a, s) => a + s.credits, 0);
  const reqGPA = remCr > 0 ? (target * (curCr + remCr) - curPts) / remCr : 0;
  const achievable = reqGPA <= 4.0 && reqGPA >= 0;

  const trendData = SEMESTERS
    .filter(s => s.gpa !== null)
    .map(s => ({ name: s.label, gpa: s.gpa as number }));

  const predData = (() => {
    let pts = 0, cr = 0;
    const hist = doneSems.map(s => {
      pts += s.gpa! * s.credits;
      cr += s.credits;
      return { name: s.label, cgpa: parseFloat((pts / cr).toFixed(4)), projected: null as number | null };
    });
    const projG = Math.min(4.0, Math.max(0, reqGPA));
    const proj = upcomingSems.map(s => {
      pts += projG * s.credits;
      cr += s.credits;
      return { name: s.label, cgpa: null as number | null, projected: parseFloat((pts / cr).toFixed(4)) };
    });
    if (hist.length && proj.length) {
      hist[hist.length - 1] = { ...hist[hist.length - 1], projected: hist[hist.length - 1].cgpa };
    }
    return [...hist, ...proj];
  })();

  const addCourse = () => {
    setCourses(p => [...p, { id: nextId, name: "New Course", credits: 3, grade: "B" }]);
    setNextId(u => u + 1);
  };
  const delCourse = (id: number) => setCourses(p => p.filter(c => c.id !== id));
  const editCourse = (id: number, field: keyof Course, val: string | number) =>
    setCourses(p => p.map(c => c.id === id ? { ...c, [field]: val } : c));

  const card = "rounded-2xl backdrop-blur-xl shadow-xl bg-white dark:bg-slate-800/50 border border-slate-200/70 dark:border-white/10";
  const mono = { fontFamily: "'JetBrains Mono', monospace" };
  const display = { fontFamily: "'Outfit', sans-serif" };

  const statsRow = [
    { label: "Highest GPA", value: "3.90", sub: "Semester 5", color: "#22C55E", Icon: Star },
    { label: "Current Sem GPA", value: semGPA.toFixed(2), sub: "Semester 6", color: "#818CF8", Icon: Target },
    { label: "Total Credits", value: `${curCr + remCr}`, sub: `${curCr} earned · ${remCr} pending`, color: "#F59E0B", Icon: BookOpen },
    { label: "Degree Progress", value: `${Math.round((doneSems.length / SEMESTERS.length) * 100)}%`, sub: `${doneSems.length} of ${SEMESTERS.length} semesters`, color: "#6366F1", Icon: TrendingUp },
  ];

  return (
    <div
      className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#0F172A] transition-colors duration-500"
      style={dark ? {
        background: "radial-gradient(ellipse at 15% 25%, rgba(99,102,241,.13) 0%, transparent 50%), radial-gradient(ellipse at 82% 78%, rgba(34,197,94,.07) 0%, transparent 45%), #0F172A"
      } : {}}
    >
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className={[
        "fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col flex-shrink-0",
        "bg-white/95 dark:bg-slate-900/80 border-r border-slate-200/70 dark:border-white/10",
        "backdrop-blur-xl transition-transform duration-300 ease-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200/70 dark:border-white/10">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white" style={display}>
            Smart<span className="text-indigo-500">GPA</span>
          </span>
          <button className="ml-auto lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-3">Navigation</p>
          {NAV.map(item => {
            const Icon = item.icon;
            const active = nav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setNav(item.id); setSidebarOpen(false); }}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left",
                  "transition-all duration-200",
                  active
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10",
                ].join(" ")}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="px-4 py-4 border-t border-slate-200/70 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              AC
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">Alexandra Chen</p>
              <p className="text-xs text-slate-500 truncate">Computer Science · Year 3</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <header className="flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl flex-shrink-0">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 dark:text-white truncate" style={display}>
              {NAV.find(n => n.id === nav)?.label ?? "Dashboard"}
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">Spring 2026 · Semester 6 of 8</p>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <span className="text-xs font-bold text-green-400" style={mono}>{cgpa.toFixed(2)}</span>
            <span className="text-xs text-green-600 dark:text-green-500 font-medium">CGPA</span>
          </div>

          <button className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
          </button>

          <button
            onClick={() => setDark(d => !d)}
            className="p-2 rounded-xl transition-all duration-300 bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-yellow-400 hover:scale-105 active:scale-95"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-500/50 transition-all">
            AC
          </div>
        </header>

        {/* ── Content ───────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-5">

            {/* Row 1: CGPA Hero + GPA Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* CGPA Hero */}
              <div className={`${card} lg:col-span-4 p-6 relative overflow-hidden`}>
                <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
                <div className="absolute -left-6 -bottom-6 w-28 h-28 rounded-full bg-green-500/10 blur-2xl pointer-events-none" />

                <div className="flex items-start justify-between mb-5 relative">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cumulative GPA</p>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5" style={display}>Academic Standing</h2>
                  </div>
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/15 border border-indigo-100 dark:border-indigo-500/20 flex-shrink-0">
                    <Award className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  </div>
                </div>

                <div className="flex items-center gap-5 relative mb-5">
                  <div className="relative flex-shrink-0">
                    <ProgressRing value={cgpa} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold" style={{ ...mono, color: gpaColor(cgpa) }}>
                        {cgpa.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">/ 4.00</span>
                    </div>
                  </div>
                  <div className="space-y-3 min-w-0">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Standing</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: gpaColor(cgpa) }}>{gpaLabel(cgpa)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Credits Earned</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5" style={mono}>{curCr} cr</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Progress</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5" style={mono}>{doneSems.length} / {SEMESTERS.length}</p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
                    <span>0.0</span><span>2.0</span><span>3.0</span><span>4.0</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(cgpa / 4) * 100}%`,
                        background: `linear-gradient(90deg, #4F46E5, ${gpaColor(cgpa)})`,
                        transition: "width 1.4s cubic-bezier(0.4,0,0.2,1)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* GPA Trend Chart */}
              <div className={`${card} lg:col-span-8 p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Performance History</p>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5" style={display}>GPA Trend</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span className="text-xs text-slate-400">Per Semester</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs font-semibold text-green-500">+8.5% growth</span>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={215}>
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={dark ? 0.28 : 0.14} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: dark ? "#64748B" : "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[3.0, 4.05]} tick={{ fontSize: 11, fill: dark ? "#64748B" : "#94A3B8" }} axisLine={false} tickLine={false} tickCount={5} />
                    <Tooltip content={<GPATooltip />} />
                    <Area
                      type="monotone" dataKey="gpa"
                      stroke="#6366F1" strokeWidth={2.5} fill="url(#gGrad)"
                      dot={{ fill: "#6366F1", strokeWidth: 2, r: 5, stroke: dark ? "#0F172A" : "#fff" }}
                      activeDot={{ r: 7, fill: "#818CF8", stroke: dark ? "#1E293B" : "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 2: Semester Roadmap */}
            <div className={`${card} p-6`}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Academic Journey</p>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5" style={display}>Semester Roadmap</h2>
                </div>
                <span className="text-xs text-slate-400 hidden sm:block" style={mono}>
                  {curCr + remCr} total credits · 8 semesters
                </span>
              </div>

              <div className="overflow-x-auto pb-1">
                <div className="relative min-w-[540px]">
                  <div className="absolute top-8 left-8 right-8 h-px bg-slate-200 dark:bg-white/10 pointer-events-none" />
                  <div className="grid grid-cols-8 gap-3 relative">
                    {SEMESTERS.map(sem => (
                      <div key={sem.id} className="flex flex-col items-center gap-2">
                        <div className={[
                          "w-16 h-16 rounded-2xl flex flex-col items-center justify-center relative z-10",
                          "transition-all duration-200 cursor-default hover:-translate-y-1.5",
                          sem.status === "completed"
                            ? "bg-indigo-50 dark:bg-indigo-600/15 border border-indigo-200 dark:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/15"
                            : sem.status === "current"
                              ? "bg-green-50 dark:bg-green-500/15 border-2 border-green-400 dark:border-green-500/50 shadow-lg shadow-green-500/15"
                              : "bg-slate-100 dark:bg-slate-700/40 border border-slate-200 dark:border-white/10",
                        ].join(" ")}>
                          {sem.status === "current" && (
                            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white dark:border-slate-800">
                              <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-semibold">{sem.label}</span>
                          <span
                            className="text-sm font-bold mt-0.5"
                            style={{ ...mono, color: sem.gpa ? gpaColor(sem.gpa) : "#94A3B8" }}
                          >
                            {sem.gpa ? sem.gpa.toFixed(2) : "—"}
                          </span>
                        </div>
                        <span className={[
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          sem.status === "completed" ? "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400"
                            : sem.status === "current" ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-slate-100 dark:bg-slate-700/60 text-slate-400",
                        ].join(" ")}>
                          {sem.status === "completed" ? "Done" : sem.status === "current" ? "Active" : "Soon"}
                        </span>
                        <span className="text-[10px] text-slate-400" style={mono}>{sem.credits} cr</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Prediction + Course Calc */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* Prediction Panel */}
              <div className={`${card} lg:col-span-7 p-6 relative overflow-hidden`}>
                <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-indigo-600/6 blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-5 relative">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Projection</p>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5" style={display}>Prediction Engine</h2>
                  </div>
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/15 border border-indigo-100 dark:border-indigo-500/20">
                    <Zap className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5 relative">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Target CGPA</p>
                    <div className="relative">
                      <select
                        value={target}
                        onChange={e => setTarget(Number(e.target.value))}
                        className="w-full appearance-none text-2xl font-bold bg-transparent outline-none pr-7 cursor-pointer text-slate-900 dark:text-white"
                        style={mono}
                      >
                        {TARGET_OPTIONS.map(v => (
                          <option key={v} value={v} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                            {v.toFixed(2)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">{remCr} credits remaining</p>
                  </div>

                  <div className={[
                    "p-4 rounded-xl border transition-all duration-300",
                    achievable
                      ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/25"
                      : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25",
                  ].join(" ")}>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Required GPA / Sem</p>
                    <p className="text-2xl font-bold" style={{ ...mono, color: achievable ? "#22C55E" : "#EF4444" }}>
                      {reqGPA > 4.0 ? ">4.00" : reqGPA < 0 ? "✓ Met" : reqGPA.toFixed(2)}
                    </p>
                    <p className="text-[10px] font-bold mt-1.5" style={{ color: achievable ? "#22C55E" : "#EF4444" }}>
                      {achievable ? "Achievable" : "Not Achievable"}
                    </p>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={160}>
                  <ComposedChart data={predData} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={dark ? 0.2 : 0.1} />
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: dark ? "#64748B" : "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[3.5, 4.05]} tick={{ fontSize: 10, fill: dark ? "#64748B" : "#94A3B8" }} axisLine={false} tickLine={false} tickCount={4} />
                    <Tooltip content={<ProjTooltip />} />
                    <Line
                      type="monotone" dataKey="cgpa"
                      stroke="#818CF8" strokeWidth={2.5}
                      dot={{ fill: "#818CF8", r: 3.5, stroke: dark ? "#1E293B" : "#fff", strokeWidth: 1.5 }}
                      connectNulls={false}
                    />
                    <Area
                      type="monotone" dataKey="projected"
                      stroke="#22C55E" strokeWidth={2.5} strokeDasharray="6 3"
                      fill="url(#projGrad)"
                      dot={{ fill: "#22C55E", r: 3.5, stroke: dark ? "#1E293B" : "#fff", strokeWidth: 1.5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Course GPA Calculator */}
              <div className={`${card} lg:col-span-5 p-6 flex flex-col`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Semester 6</p>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5" style={display}>GPA Calculator</h2>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                    dark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                  }`}>
                    <span className="text-xs text-slate-400">GPA</span>
                    <span className="text-lg font-bold" style={{ ...mono, color: gpaColor(semGPA) }}>
                      {semGPA.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-12 text-[10px] uppercase tracking-wide font-bold text-slate-400 px-2 mb-2 gap-2">
                  <span className="col-span-5">Course</span>
                  <span className="col-span-2 text-center">Cr</span>
                  <span className="col-span-3 text-center">Grade</span>
                  <span className="col-span-2" />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 mb-4 pr-0.5">
                  {courses.map(c => (
                    <div
                      key={c.id}
                      className={[
                        "grid grid-cols-12 items-center gap-2 px-2.5 py-2 rounded-xl transition-colors",
                        dark ? "bg-white/5 hover:bg-white/10" : "bg-slate-50 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      <input
                        value={c.name}
                        onChange={e => editCourse(c.id, "name", e.target.value)}
                        className="col-span-5 bg-transparent outline-none text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 truncate min-w-0"
                        placeholder="Course name"
                      />
                      <select
                        value={c.credits}
                        onChange={e => editCourse(c.id, "credits", Number(e.target.value))}
                        className="col-span-2 bg-transparent outline-none text-center text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n} className="bg-white dark:bg-slate-800">{n}</option>
                        ))}
                      </select>
                      <select
                        value={c.grade}
                        onChange={e => editCourse(c.id, "grade", e.target.value)}
                        className="col-span-3 bg-transparent outline-none text-center text-xs font-bold cursor-pointer appearance-none"
                        style={{ ...mono, color: gpaColor(GRADE_MAP[c.grade] ?? 0) }}
                      >
                        {GRADES.map(g => (
                          <option key={g} value={g} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{g}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => delCourse(c.id)}
                        className="col-span-2 flex justify-end text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addCourse}
                  className={[
                    "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold",
                    "border border-dashed transition-all duration-200",
                    dark
                      ? "border-white/15 text-slate-400 hover:border-indigo-500/60 hover:text-indigo-400 hover:bg-indigo-500/5"
                      : "border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/60",
                  ].join(" ")}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Course
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statsRow.map(({ label, value, sub, color, Icon }) => (
                <div
                  key={label}
                  className={`${card} p-4 flex items-center gap-3 hover:-translate-y-1 transition-transform duration-200 cursor-default`}
                >
                  <div className="p-2.5 rounded-xl flex-shrink-0" style={{ backgroundColor: `${color}1A` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-medium truncate">{label}</p>
                    <p className="text-xl font-bold leading-tight" style={{ ...mono, color }}>{value}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
