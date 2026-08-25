import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  FileText,
  FolderKanban,
  GitFork,
  Loader2,
  Printer,
  TrendingUp,
} from "lucide-react";
import { getMyProjectsSummary } from "../../services/projectService";
import type { MyProjectSummary } from "../../types/project";
import type { ProjectStatus } from "../../types/project";

const statusStyles: Record<ProjectStatus, string> = {
  active: "bg-emerald-50 text-emerald-600",
  on_hold: "bg-amber-50 text-amber-600",
  completed: "bg-slate-100 text-slate-500",
  archived: "bg-slate-100 text-slate-400",
};

const statusLabels: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

// Print-specific styles
const printStyles = `
  @media print {
    body {
      background: white !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }
    
    /* Print header with logo and border */
    .print-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 20px 0 16px 0 !important;
      border-bottom: 3px solid #4f46e5 !important;
      margin-bottom: 24px !important;
    }
    
    .print-header-left {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
    }
    
    .print-logo {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 44px !important;
      height: 44px !important;
      background: #4f46e5 !important;
      border-radius: 12px !important;
      color: white !important;
      font-weight: 700 !important;
      font-size: 20px !important;
    }
    
    .print-title {
      font-size: 24px !important;
      font-weight: 700 !important;
      color: #0f172a !important;
      margin: 0 !important;
    }
    
    .print-subtitle {
      font-size: 13px !important;
      color: #64748b !important;
      margin: 2px 0 0 0 !important;
    }
    
    .print-meta {
      text-align: right !important;
      font-size: 13px !important;
      color: #475569 !important;
    }
    
    .print-meta span {
      display: block !important;
      line-height: 1.6 !important;
    }
    
    .print-meta .label {
      color: #94a3b8 !important;
      font-size: 11px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    
    /* Summary stats for print */
    .print-stats {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 12px !important;
      margin-bottom: 28px !important;
    }
    
    .print-stat {
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      padding: 16px 20px !important;
      text-align: center !important;
    }
    
    .print-stat-value {
      font-size: 28px !important;
      font-weight: 700 !important;
      color: #0f172a !important;
      line-height: 1.2 !important;
    }
    
    .print-stat-label {
      font-size: 12px !important;
      color: #64748b !important;
      margin-top: 4px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.3px !important;
    }
    
    .print-stat-value.emerald {
      color: #059669 !important;
    }
    
    .print-stat-value.amber {
      color: #d97706 !important;
    }
    
    .print-stat-value.blue {
      color: #2563eb !important;
    }

    /* Table styles */
    .print-table-container {
      margin-top: 8px !important;
    }
    
    .print-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 13px !important;
    }
    
    .print-table thead th {
      background: #f1f5f9 !important;
      color: #0f172a !important;
      font-weight: 600 !important;
      text-align: left !important;
      padding: 12px 14px !important;
      border-bottom: 2px solid #e2e8f0 !important;
      font-size: 12px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.3px !important;
    }
    
    .print-table tbody td {
      padding: 10px 14px !important;
      border-bottom: 1px solid #f1f5f9 !important;
      color: #1e293b !important;
    }
    
    .print-table tbody tr:hover {
      background: #f8fafc !important;
    }
    
    .print-table tbody tr:last-child td {
      border-bottom: none !important;
    }
    
    /* Status badge in print */
    .print-status-badge {
      display: inline-block !important;
      padding: 3px 12px !important;
      border-radius: 20px !important;
      font-size: 11px !important;
      font-weight: 500 !important;
    }
    
    .print-status-badge.active {
      background: #d1fae5 !important;
      color: #065f46 !important;
    }
    
    .print-status-badge.on_hold {
      background: #fef3c7 !important;
      color: #92400e !important;
    }
    
    .print-status-badge.completed {
      background: #f1f5f9 !important;
      color: #475569 !important;
    }
    
    .print-status-badge.archived {
      background: #f1f5f9 !important;
      color: #94a3b8 !important;
    }
    
    /* Progress bar in print */
    .print-progress-bar {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
    }
    
    .print-progress-track {
      flex: 1 !important;
      height: 6px !important;
      background: #e2e8f0 !important;
      border-radius: 4px !important;
      overflow: hidden !important;
    }
    
    .print-progress-fill {
      height: 100% !important;
      border-radius: 4px !important;
      background: #4f46e5 !important;
    }
    
    .print-progress-fill.slate {
      background: #94a3b8 !important;
    }
    
    .print-progress-text {
      font-size: 12px !important;
      font-weight: 500 !important;
      color: #0f172a !important;
      min-width: 38px !important;
      text-align: right !important;
    }
    
    /* Footer */
    .print-footer {
      margin-top: 30px !important;
      padding-top: 16px !important;
      border-top: 2px solid #e2e8f0 !important;
      display: flex !important;
      justify-content: space-between !important;
      font-size: 12px !important;
      color: #94a3b8 !important;
    }
    
    /* Page break control */
    .print-table-container {
      page-break-inside: avoid !important;
    }
    
    /* Ensure proper margins */
    @page {
      margin: 20mm 18mm !important;
    }
  }
`;

const EmployeeProjects = () => {
  const [summaries, setSummaries] = useState<MyProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const data = await getMyProjectsSummary();
      if (cancelled) return;
      setSummaries(data);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const totalProjects = summaries.length;
    const completedTasks = summaries.reduce((sum, s) => sum + s.myTasks.completed, 0);
    const inProgressTasks = summaries.reduce((sum, s) => sum + s.myTasks.inProgress, 0);
    const avgContribution =
      totalProjects > 0
        ? Math.round(
            (summaries.reduce((sum, s) => sum + s.contributionPercent, 0) / totalProjects) * 10,
          ) / 10
        : 0;

    return { totalProjects, completedTasks, inProgressTasks, avgContribution };
  }, [summaries]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  return (
    <>
      {/* Print Styles */}
      <style>{printStyles}</style>

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              My Projects
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Projects you're working on, your progress and contribution on each
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Printer size={16} />
            Print
          </button>
        </div>

        {/* Print-only header */}
        <div className="hidden print:block print-header">
          <div className="print-header-left">
            <div className="print-logo">P</div>
            <div>
              <h1 className="print-title">My Projects Report</h1>
              <p className="print-subtitle">Project summary and performance overview</p>
            </div>
          </div>
          <div className="print-meta">
            <span className="label">Generated</span>
            <span>{new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
            <span>{new Date().toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
          </div>
        </div>

        {/* Print Stats */}
        <div className="hidden print:block print-stats">
          <div className="print-stat">
            <div className="print-stat-value">{totals.totalProjects}</div>
            <div className="print-stat-label">Total Projects</div>
          </div>
          <div className="print-stat">
            <div className="print-stat-value blue">{totals.avgContribution}%</div>
            <div className="print-stat-label">Avg Contribution</div>
          </div>
          <div className="print-stat">
            <div className="print-stat-value amber">{totals.inProgressTasks}</div>
            <div className="print-stat-label">In Progress</div>
          </div>
          <div className="print-stat">
            <div className="print-stat-value emerald">{totals.completedTasks}</div>
            <div className="print-stat-label">Tasks Approved</div>
          </div>
        </div>

        {/* Screen Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 print:hidden">
          <StatCard label="Projects" value={totals.totalProjects} color="text-slate-900" />
          <StatCard label="Avg. Contribution" value={`${totals.avgContribution}%`} color="text-blue-600" />
          <StatCard label="Tasks In Progress" value={totals.inProgressTasks} color="text-amber-600" />
          <StatCard label="Tasks Approved" value={totals.completedTasks} color="text-emerald-600" />
        </div>

        {summaries.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center print:hidden">
            <FolderKanban size={26} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              You're not assigned to any project yet
            </p>
          </div>
        )}

        {/* Interactive cards (screen only) */}
        {summaries.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:hidden">
            {summaries.map((summary) => (
              <ProjectSummaryCard key={summary.project.id} summary={summary} />
            ))}
          </div>
        )}

        {/* Printable table (print only) */}
        {summaries.length > 0 && (
          <div className="hidden print:block print-table-container">
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>Project</th>
                  <th style={{ width: '12%' }}>Client</th>
                  <th style={{ width: '10%' }}>Status</th>
                  <th style={{ width: '13%' }}>Project Progress</th>
                  <th style={{ width: '13%' }}>My Progress</th>
                  <th style={{ width: '13%' }}>Contribution</th>
                  <th style={{ width: '12%' }}>Tasks</th>
                  <th style={{ width: '9%' }}>Done/Total</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map(({ project, myTasks, myProgress, contributionPercent }) => (
                  <tr key={project.id}>
                    <td>
                      <strong>{project.name}</strong>
                    </td>
                    <td>{project.client || "—"}</td>
                    <td>
                      <span className={`print-status-badge ${project.status}`}>
                        {statusLabels[project.status]}
                      </span>
                    </td>
                    <td>
                      <div className="print-progress-bar">
                        <div className="print-progress-track">
                          <div 
                            className="print-progress-fill slate" 
                            style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
                          />
                        </div>
                        <span className="print-progress-text">{project.progress}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="print-progress-bar">
                        <div className="print-progress-track">
                          <div 
                            className="print-progress-fill" 
                            style={{ width: `${Math.min(100, Math.max(0, myProgress))}%` }}
                          />
                        </div>
                        <span className="print-progress-text">{myProgress}%</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>
                      {contributionPercent}%
                    </td>
                    <td>
                      <span style={{ 
                        display: 'inline-flex', 
                        gap: '4px',
                        flexWrap: 'wrap'
                      }}>
                        {myTasks.notStarted > 0 && (
                          <span style={{ 
                            background: '#f1f5f9', 
                            padding: '1px 8px', 
                            borderRadius: '12px',
                            fontSize: '11px',
                            color: '#64748b'
                          }}>
                            {myTasks.notStarted} pending
                          </span>
                        )}
                        {myTasks.inProgress > 0 && (
                          <span style={{ 
                            background: '#fef3c7', 
                            padding: '1px 8px', 
                            borderRadius: '12px',
                            fontSize: '11px',
                            color: '#92400e'
                          }}>
                            {myTasks.inProgress} in progress
                          </span>
                        )}
                        {myTasks.submitted > 0 && (
                          <span style={{ 
                            background: '#dbeafe', 
                            padding: '1px 8px', 
                            borderRadius: '12px',
                            fontSize: '11px',
                            color: '#1e40af'
                          }}>
                            {myTasks.submitted} review
                          </span>
                        )}
                        {myTasks.completed > 0 && (
                          <span style={{ 
                            background: '#d1fae5', 
                            padding: '1px 8px', 
                            borderRadius: '12px',
                            fontSize: '11px',
                            color: '#065f46'
                          }}>
                            {myTasks.completed} done
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>
                      {myTasks.completed}/{myTasks.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Print Footer */}
            <div className="print-footer">
              <span>© {new Date().getFullYear()} — Project Management System</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

interface ProjectSummaryCardProps {
  summary: MyProjectSummary;
}

const ProjectSummaryCard = ({ summary }: ProjectSummaryCardProps) => {
  const { project, myTasks, myProgress, contributionPercent, lastActivityAt } = summary;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
            <FolderKanban size={18} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                to={`/app/projects/${project.id}`}
                className="text-sm font-semibold text-slate-900 hover:text-blue-600 hover:underline"
              >
                {project.name}
              </Link>
              {project.githubLink && (
                <a
                  href={project.githubLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 transition-colors hover:text-slate-700"
                  title="GitHub repository"
                  aria-label={`${project.name} GitHub repository`}
                >
                  <GitFork size={13} />
                </a>
              )}
              {project.pdf && (
                <a
                  href={project.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 transition-colors hover:text-red-600"
                  title="Project PDF"
                  aria-label={`${project.name} PDF`}
                >
                  <FileText size={13} />
                </a>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {project.client || "No client"}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[project.status]}`}
        >
          {statusLabels[project.status]}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Project Progress</span>
          <span className="font-medium text-slate-700">{project.progress}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-400"
            style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
          />
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>My Progress</span>
          <span className="font-medium text-slate-700">{myProgress}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{ width: `${Math.min(100, Math.max(0, myProgress))}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          <TrendingUp size={13} />
          {contributionPercent}% contribution
        </div>

        <span className="text-xs text-slate-500">
          {myTasks.completed}/{myTasks.total} tasks approved
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        {myTasks.notStarted > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
            {myTasks.notStarted} not started
          </span>
        )}
        {myTasks.inProgress > 0 && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600">
            {myTasks.inProgress} in progress
          </span>
        )}
        {myTasks.submitted > 0 && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
            {myTasks.submitted} waiting review
          </span>
        )}
        {myTasks.completed > 0 && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600">
            {myTasks.completed} approved
          </span>
        )}
      </div>

      {lastActivityAt && (
        <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
          <Calendar size={12} />
          Last activity {new Date(lastActivityAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number | string;
  color: string;
}

const StatCard = ({ label, value, color }: StatCardProps) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-xs text-slate-500">{label}</p>
    <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
  </div>
);

export default EmployeeProjects;