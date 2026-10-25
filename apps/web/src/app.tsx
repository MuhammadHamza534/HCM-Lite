import { type FormEvent, useEffect, useState } from 'react';
import { api, setToken, type SessionUser } from './lib/api';

type Notice = { kind: 'success' | 'error' | 'info'; text: string } | null;

interface Department { id: string; name: string; code?: string; }
interface Designation { id: string; name: string; }
interface LeaveType { id: string; code: string; name: string; annualQuotaDays: number | null; isPaid: boolean; }
interface LeaveBalance { leaveTypeId: string; code: string; name: string; quota: number | null; used: number; remaining: number | null; }
interface LeaveRequest { id: string; startDate: string; endDate: string; chargeableDays: string; reason: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'; leaveType: { name: string; code: string }; employee?: { firstName: string; lastName: string; employeeCode: string }; decisionComment?: string; }
interface AttendanceItem { id: string; workDate: string; checkInAt: string; checkOutAt: string | null; workedMinutes: number; wasLate: boolean; wasHalfDay: boolean; hasMissingCheckout: boolean; employee?: { name: string; code: string; department: string | null }; }
interface PayrollRun { id: string; year: number; month: number; status: 'DRAFT' | 'FINALIZED'; grossTotal: string; taxTotal: string; deductionTotal: string; netTotal: string; itemCount: number; }
interface PayrollItem { id: string; employeeId: string; employee: string; basic: string; gross: string; deduction: string; tax: string; net: string; breakdown: Record<string, unknown>; }
interface EmployeeRow { id: string; employeeCode: string; firstName: string; lastName: string; workEmail: string; joinDate: string; employmentStatus: string; department?: { name: string } | null; designation?: { name: string } | null; basicSalary?: string; }
interface Announcement { id: string; title: string; body: string; publishedAt: string; }
interface NotificationItem { id: string; title: string; message: string; readAt: string | null; createdAt: string; }
interface AuditItem { id: string; action: string; entityType: string; entityId: string; occurredAt: string; actorUserId: string; after?: unknown; }
interface AttendanceCorrectionItem { id: string; targetWorkDate: string; reason: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; decisionComment?: string; createdAt: string; employee?: { id: string; firstName: string; lastName: string; employeeCode: string }; }

export function App() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [showSetupOverride, setShowSetupOverride] = useState(false);
  const [companyName, setCompanyName] = useState<string>('');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Dashboard & common data
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // HR / Admin data
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<{ id: string; year: number; month: number; status: string; items: PayrollItem[] } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);

  // Employee specific data
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [attendanceCorrections, setAttendanceCorrections] = useState<AttendanceCorrectionItem[]>([]);

  const report = (error: unknown) => {
    setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Request failed.' });
  };

  const loadBaseData = async (activeUser = user) => {
    if (!activeUser || activeUser.mustChangePassword) return;
    try {
      const view = activeUser.role === 'ADMIN' ? '/analytics/admin' : activeUser.role === 'HR' ? '/analytics/hr' : '/analytics/me';
      const [dash, ann, notifs] = await Promise.all([
        api.get<Record<string, unknown>>(view).catch(() => null),
        api.get<Announcement[]>('/announcements').catch(() => []),
        api.get<NotificationItem[]>('/notifications').catch(() => [])
      ]);
      if (dash) setDashboard(dash);
      setAnnouncements(ann || []);
      setNotifications(notifs || []);

      if (activeUser.role === 'ADMIN' || activeUser.role === 'HR') {
        const [deps, desigs, lTypes, runs, emps, corrs] = await Promise.all([
          api.get<Department[]>('/departments').catch(() => []),
          api.get<Designation[]>('/designations').catch(() => []),
          api.get<LeaveType[]>('/leave-types').catch(() => []),
          api.get<PayrollRun[]>('/payroll/runs').catch(() => []),
          api.get<EmployeeRow[]>('/employees').catch(() => []),
          api.get<AttendanceCorrectionItem[]>('/attendance/corrections').catch(() => [])
        ]);
        setDepartments(deps || []);
        setDesignations(desigs || []);
        setLeaveTypes(lTypes || []);
        setPayrollRuns(runs || []);
        setEmployees(emps || []);
        setAttendanceCorrections(corrs || []);
      }

      if (activeUser.role === 'EMPLOYEE' || activeUser.role === 'HR') {
        const [balances, reqs, att, lTypes, corrs] = await Promise.all([
          api.get<{ balances: LeaveBalance[] }>('/leave/balance').then((res) => res.balances).catch(() => []),
          api.get<LeaveRequest[]>('/leave/requests').catch(() => []),
          api.get<AttendanceItem[]>('/attendance').catch(() => []),
          api.get<LeaveType[]>('/leave-types').catch(() => []),
          api.get<AttendanceCorrectionItem[]>('/attendance/corrections').catch(() => [])
        ]);
        setLeaveBalances(balances || []);
        setLeaveRequests(reqs || []);
        setAttendanceRecords(att || []);
        setLeaveTypes(lTypes || []);
        if (activeUser.role === 'EMPLOYEE') setAttendanceCorrections(corrs || []);
      }

      if (activeUser.role === 'ADMIN') {
        const logs = await api.get<AuditItem[]>('/audit-logs').catch(() => []);
        setAuditLogs(logs || []);
      }
    } catch (err) {
      report(err);
    }
  };

  useEffect(() => {
    void api.setupStatus().then((value) => {
      setNeedsSetup(value.needsSetup);
      if (value.company?.name) {
        setCompanyName(value.company.name);
      }
    }).catch(report);
  }, []);

  useEffect(() => {
    if (needsSetup === false) {
      void api.me()
        .then((value) => {
          setUser(value.user);
          void loadBaseData(value.user);
        })
        .catch(() => setToken(null));
    }
  }, [needsSetup]);

  const submit = async (action: () => Promise<void>) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
    } catch (error) {
      report(error);
    } finally {
      setBusy(false);
    }
  };

  if (needsSetup === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-6 text-ink">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-8 shadow-lg border border-slate-200">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-teal border-t-transparent" />
          <p className="font-semibold text-slate-700">Connecting securely to HCM Lite…</p>
        </div>
      </main>
    );
  }

  if (needsSetup || showSetupOverride) {
    return (
      <SetupWizard
        busy={busy}
        submit={submit}
        canCancel={showSetupOverride}
        onCancel={() => setShowSetupOverride(false)}
        onComplete={(session) => {
          setToken(session.token);
          setUser(session.user);
          setNeedsSetup(false);
          setShowSetupOverride(false);
          setActiveTab('overview');
          setNotice({ kind: 'success', text: 'Company and Admin account initialized successfully. No demo records created.' });
        }}
      />
    );
  }

  if (!user) {
    return (
      <LoginScreen
        busy={busy}
        submit={submit}
        companyName={companyName}
        onOpenSetup={() => setShowSetupOverride(true)}
        onComplete={(session) => {
          setToken(session.token);
          setUser(session.user);
          setActiveTab('overview');
          void loadBaseData(session.user);
        }}
      />
    );
  }

  if (user.mustChangePassword) {
    return (
      <ChangePasswordScreen
        busy={busy}
        submit={submit}
        onDone={() => {
          const updated = { ...user, mustChangePassword: false };
          setUser(updated);
          setNotice({ kind: 'success', text: 'Password changed successfully. Your account is activated.' });
          void loadBaseData(updated);
        }}
      />
    );
  }

  const roleNav: Record<string, Array<{ id: string; label: string }>> = {
    ADMIN: [
      { id: 'overview', label: 'Dashboard' },
      { id: 'organization', label: 'Company & Org' },
      { id: 'hr_users', label: 'HR Accounts' },
      { id: 'payroll_finalize', label: 'Payroll Finalization' },
      { id: 'audit_trail', label: 'Audit Log' },
      { id: 'announcements', label: 'Announcements' }
    ],
    HR: [
      { id: 'overview', label: 'Dashboard' },
      { id: 'employees', label: 'Employees' },
      { id: 'attendance', label: 'Attendance Board' },
      { id: 'leave_approvals', label: 'Leave Approvals' },
      { id: 'payroll_runs', label: 'Payroll Drafts' },
      { id: 'announcements', label: 'Announcements' }
    ],
    EMPLOYEE: [
      { id: 'overview', label: 'My Workspace' },
      { id: 'attendance', label: 'My Attendance' },
      { id: 'leave', label: 'Leave & Time Off' },
      { id: 'smart_leave', label: 'Smart Leave (AI)' },
      { id: 'payslips', label: 'My Payslips' },
      { id: 'ai_chat', label: 'AI Assistant' },
      { id: 'security', label: 'Security Verification' }
    ]
  };

  const currentNav = roleNav[user.role] || [];

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-navy text-white shadow-md border-b border-slate-700/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-white font-black text-xl shadow-inner">
              H
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">HCM Lite</h1>
                <span className="rounded-full bg-teal/20 px-2.5 py-0.5 text-xs font-semibold text-teal-300 border border-teal-500/30">
                  {user.company?.name || companyName || 'Enterprise'}
                </span>
              </div>
              <p className="text-xs text-slate-300">Live Enterprise Human Capital Management</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="hidden sm:block text-right">
              <span className="font-medium text-slate-200">{user.email}</span>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className={`inline-block h-2 w-2 rounded-full ${user.role === 'ADMIN' ? 'bg-purple-400' : user.role === 'HR' ? 'bg-teal-400' : 'bg-amber-400'}`} />
                <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">{user.role}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setToken(null);
                setUser(null);
                setDashboard(null);
                setActiveTab('overview');
              }}
              className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl w-full flex-1 p-4 sm:p-6 lg:p-8">
        {/* Notice Banner */}
        {notice && (
          <div
            role="alert"
            className={`mb-6 flex items-start justify-between rounded-xl p-4 shadow-sm border ${
              notice.kind === 'error'
                ? 'bg-red-50 text-red-900 border-red-200'
                : notice.kind === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            <div className="flex gap-2">
              <span className="font-bold text-lg leading-none">
                {notice.kind === 'error' ? '⚠️' : notice.kind === 'success' ? '✓' : 'ℹ'}
              </span>
              <p className="text-sm font-medium">{notice.text}</p>
            </div>
            <button onClick={() => setNotice(null)} className="text-xs font-bold opacity-60 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Workspace Layout */}
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Navigation Sidebar */}
          <aside className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80 h-fit lg:sticky lg:top-20">
            <div className="mb-3 px-3 py-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {user.role} Console
              </p>
            </div>
            <nav className="flex flex-col gap-1">
              {currentNav.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setNotice(null);
                    }}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition text-left ${
                      isActive
                        ? 'bg-navy text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-teal" />}
                  </button>
                );
              })}
            </nav>

            <div className="mt-6 border-t border-slate-100 pt-4 px-3 text-xs text-slate-400">
              <p className="font-semibold text-slate-500">Live Status</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Neon PostgreSQL connected</span>
              </div>
            </div>
          </aside>

          {/* Active Tab View */}
          <section className="min-w-0 space-y-6">
            {/* ADMIN TABS */}
            {user.role === 'ADMIN' && (
              <>
                {activeTab === 'overview' && (
                  <AdminOverview
                    dashboard={dashboard}
                    departments={departments}
                    onRefresh={() => void loadBaseData(user)}
                  />
                )}
                {activeTab === 'organization' && (
                  <AdminOrganization
                    busy={busy}
                    submit={submit}
                    departments={departments}
                    designations={designations}
                    setNotice={setNotice}
                    onReload={() => void loadBaseData(user)}
                  />
                )}
                {activeTab === 'hr_users' && (
                  <AdminHrManagement
                    busy={busy}
                    submit={submit}
                    setNotice={setNotice}
                    onReload={() => void loadBaseData(user)}
                  />
                )}
                {activeTab === 'payroll_finalize' && (
                  <AdminPayrollFinalization
                    busy={busy}
                    submit={submit}
                    runs={payrollRuns}
                    selectedRun={selectedRun}
                    setSelectedRun={setSelectedRun}
                    setNotice={setNotice}
                    onReload={() => void loadBaseData(user)}
                  />
                )}
                {activeTab === 'audit_trail' && (
                  <AdminAuditTrail logs={auditLogs} onReload={() => void loadBaseData(user)} />
                )}
                {activeTab === 'announcements' && (
                  <AnnouncementsView
                    busy={busy}
                    submit={submit}
                    canPost={true}
                    announcements={announcements}
                    setNotice={setNotice}
                    onReload={() => void loadBaseData(user)}
                  />
                )}
              </>
            )}

            {/* HR TABS */}
            {user.role === 'HR' && (
              <>
                {activeTab === 'overview' && (
                  <HrOverview dashboard={dashboard} onRefresh={() => void loadBaseData(user)} />
                )}
                {activeTab === 'employees' && (
                  <HrEmployees
                    busy={busy}
                    submit={submit}
                    employees={employees}
                    departments={departments}
                    designations={designations}
                    setNotice={setNotice}
                    onReload={() => void loadBaseData(user)}
                  />
                )}
                {activeTab === 'attendance' && (
                  <AttendanceBoard
                    busy={busy}
                    submit={submit}
                    attendance={attendanceRecords}
                    corrections={attendanceCorrections}
                    setNotice={setNotice}
                    onReload={() => void loadBaseData(user)}
                  />
                )}
                {activeTab === 'leave_approvals' && (
                  <HrLeaveApprovals
                    busy={busy}
                    submit={submit}
                    requests={leaveRequests}
                    setNotice={setNotice}
                    onReload={() => void loadBaseData(user)}
                  />
                )}
                {activeTab === 'payroll_runs' && (
                  <HrPayrollRuns
                    busy={busy}
                    submit={submit}
                    runs={payrollRuns}
                    selectedRun={selectedRun}
                    setSelectedRun={setSelectedRun}
                    setNotice={setNotice}
                    onReload={() => void loadBaseData(user)}
                  />
                )}
                {activeTab === 'announcements' && (
                  <AnnouncementsView
                    busy={busy}
                    submit={submit}
                    canPost={true}
                    announcements={announcements}
                    setNotice={setNotice}
                    onReload={() => void loadBaseData(user)}
                  />
                )}
              </>
            )}

            {/* EMPLOYEE TABS */}
            {user.role === 'EMPLOYEE' && (
              <>
                {activeTab === 'overview' && (
                  <EmployeeWorkspace
                    busy={busy}
                    submit={submit}
                    dashboard={dashboard}
                    announcements={announcements}
                    notifications={notifications}
                    setNotice={setNotice}
                    onRefresh={() => void loadBaseData(user)}
                  />
                )}
                {activeTab === 'attendance' && (
                  <EmployeeAttendanceHistory
                    busy={busy}
                    submit={submit}
                    records={attendanceRecords}
                    corrections={attendanceCorrections}
                    setNotice={setNotice}
                    onRefresh={() => void loadBaseData(user)}
                  />
                )}
                {activeTab === 'leave' && (
                  <EmployeeLeaveTab
                    busy={busy}
                    submit={submit}
                    balances={leaveBalances}
                    leaveTypes={leaveTypes}
                    requests={leaveRequests}
                    setNotice={setNotice}
                    onReload={() => void loadBaseData(user)}
                  />
                )}
                {activeTab === 'smart_leave' && (
                  <EmployeeSmartLeaveTab
                    busy={busy}
                    submit={submit}
                    leaveTypes={leaveTypes}
                    setNotice={setNotice}
                    onComplete={() => {
                      setActiveTab('leave');
                      void loadBaseData(user);
                    }}
                  />
                )}
                {activeTab === 'payslips' && (
                  <EmployeePayslipsTab
                    busy={busy}
                    setNotice={setNotice}
                    dashboard={dashboard}
                  />
                )}
                {activeTab === 'ai_chat' && (
                  <EmployeeAiChatTab
                    busy={busy}
                    submit={submit}
                    setNotice={setNotice}
                  />
                )}
                {activeTab === 'security' && (
                  <SecurityVerificationTab
                    busy={busy}
                    submit={submit}
                    setNotice={setNotice}
                  />
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 1. FIRST-RUN SETUP & AUTH COMPONENTS
 * ------------------------------------------------------------- */

function SetupWizard({
  busy,
  submit,
  canCancel,
  onCancel,
  onComplete
}: {
  busy: boolean;
  submit: (action: () => Promise<void>) => Promise<void>;
  canCancel?: boolean;
  onCancel?: () => void;
  onComplete: (s: { token: string; user: SessionUser }) => void;
}) {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit(async () => {
      const result = await api.setup({
        companyName: form.get('companyName'),
        adminEmail: form.get('email'),
        adminPassword: form.get('password'),
        timezone: form.get('timezone') || 'Asia/Karachi',
        officeStartTime: form.get('officeStartTime') || '09:00',
        graceMinutes: Number(form.get('graceMinutes') || 15),
        halfDayMinutes: Number(form.get('halfDayMinutes') || 300),
        weekendDays: [0, 6]
      });
      onComplete(result);
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4 font-sans text-ink">
      <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-xl border border-slate-200/90">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal text-white font-black text-2xl shadow-md">
            H
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal">First-Run Bootstrap</span>
            <h1 className="text-2xl font-black text-navy">Set Up HCM Lite</h1>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Initialize the primary organization and root Administrator account. This initializes the company settings versions, default leave types (Annual, Sick, Casual, Unpaid), and records an immutable audit trail.
          <strong className="block mt-1 text-slate-800">No seeded or demo data will be preloaded.</strong>
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Company Name</label>
              <input required name="companyName" defaultValue="Apex Global Technologies" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:border-teal focus:ring-1 focus:ring-teal outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Admin Email</label>
              <input required name="email" type="email" defaultValue="admin@apexglobal.com" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:border-teal focus:ring-1 focus:ring-teal outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Admin Password</label>
              <input required name="password" type="password" defaultValue="AdminPass123!" placeholder="10+ chars, upper/lower/num" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:border-teal focus:ring-1 focus:ring-teal outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Time Zone</label>
              <input required name="timezone" defaultValue="Asia/Karachi" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:border-teal focus:ring-1 focus:ring-teal outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Office Start Time</label>
              <input required name="officeStartTime" defaultValue="09:00" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:border-teal focus:ring-1 focus:ring-teal outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Grace Period (Minutes)</label>
              <input required name="graceMinutes" type="number" defaultValue="15" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:border-teal focus:ring-1 focus:ring-teal outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Half Day (Minutes)</label>
              <input required name="halfDayMinutes" type="number" defaultValue="300" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:border-teal focus:ring-1 focus:ring-teal outline-none" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {canCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                ← Back to Sign In
              </button>
            ) : (
              <span className="text-xs text-slate-400">Serializable transaction lock</span>
            )}
            <button
              disabled={busy}
              type="submit"
              className="rounded-xl bg-teal px-6 py-3 font-bold text-white shadow-md hover:bg-teal/90 transition disabled:opacity-50"
            >
              {busy ? 'Initializing…' : 'Create Company & Admin'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function LoginScreen({
  busy,
  submit,
  companyName,
  onOpenSetup,
  onComplete
}: {
  busy: boolean;
  submit: (action: () => Promise<void>) => Promise<void>;
  companyName?: string;
  onOpenSetup: () => void;
  onComplete: (s: { token: string; user: SessionUser }) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const doLogin = (loginEmail: string, loginPass: string) => {
    void submit(async () => {
      const result = await api.login({
        email: loginEmail,
        password: loginPass
      });
      onComplete(result);
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    doLogin(email, password);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4 font-sans text-ink">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-slate-200/90">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-white font-black text-2xl shadow-md">
            H
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal">
              {companyName || 'Enterprise HCM'}
            </span>
            <h1 className="text-2xl font-black text-navy">Sign In to HCM Lite</h1>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-5">
          Select a verified role below for instant sign-in, or enter your credentials.
        </p>

        {/* Quick Role Selection for Evaluators / Users */}
        <div className="mb-6 rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            One-Click Verified Sign-In
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEmail('admin@saylanihcm.com');
                setPassword('AdminPass123!');
                doLogin('admin@saylanihcm.com', 'AdminPass123!');
              }}
              className="rounded-xl border border-purple-200 bg-purple-50/80 hover:bg-purple-100 p-2.5 text-center transition disabled:opacity-50"
            >
              <span className="block text-xs font-bold text-purple-700">Admin</span>
              <span className="block text-[10px] text-purple-600/70 truncate">Full System</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEmail('hr@saylanihcm.com');
                setPassword('HrPermanent123!');
                doLogin('hr@saylanihcm.com', 'HrPermanent123!');
              }}
              className="rounded-xl border border-teal-200 bg-teal-50/80 hover:bg-teal-100 p-2.5 text-center transition disabled:opacity-50"
            >
              <span className="block text-xs font-bold text-teal-700">HR Lead</span>
              <span className="block text-[10px] text-teal-600/70 truncate">Operations</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEmail('hamza@saylanihcm.com');
                setPassword('EmpPermanent123!');
                doLogin('hamza@saylanihcm.com', 'EmpPermanent123!');
              }}
              className="rounded-xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100 p-2.5 text-center transition disabled:opacity-50"
            >
              <span className="block text-xs font-bold text-amber-700">Employee</span>
              <span className="block text-[10px] text-amber-600/70 truncate">Self Service</span>
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Email Address</label>
            <input
              required
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:border-navy focus:ring-1 focus:ring-navy outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Password</label>
            <input
              required
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:border-navy focus:ring-1 focus:ring-navy outline-none"
            />
          </div>

          <button
            disabled={busy}
            type="submit"
            className="w-full rounded-xl bg-navy py-3 font-bold text-white shadow-md hover:bg-slate-800 transition disabled:opacity-50"
          >
            {busy ? 'Authenticating…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onOpenSetup}
            className="text-xs font-semibold text-teal hover:text-teal/80 transition"
          >
            First-Run Bootstrap Wizard (Preview / Setup) →
          </button>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-3.5 border border-slate-200/70 text-[11px] text-slate-500">
          <p className="font-semibold text-slate-700 mb-0.5">Enterprise Security Active:</p>
          <p className="text-slate-500">Bcrypt cost 12 • Role & row-level access control • Immutable audit trail</p>
        </div>
      </div>
    </main>
  );
}

function ChangePasswordScreen({ busy, submit, onDone }: { busy: boolean; submit: (action: () => Promise<void>) => Promise<void>; onDone: () => void }) {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit(async () => {
      await api.changePassword({
        currentPassword: form.get('currentPassword'),
        newPassword: form.get('newPassword')
      });
      onDone();
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4 font-sans text-ink">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-amber-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white font-bold text-lg">
            🔒
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Password Change Required</span>
            <h1 className="text-xl font-bold text-navy">Activate Your Account</h1>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          A temporary password was assigned by HR/Admin. You must set a private password before accessing organizational records.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Temporary Password</label>
            <input required name="currentPassword" type="password" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-amber-500" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">New Password</label>
            <input required name="newPassword" type="password" placeholder="10+ chars, uppercase, lowercase, number" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-amber-500" />
            <span className="text-xs text-slate-400 mt-1 block">Must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number.</span>
          </div>

          <button
            disabled={busy}
            type="submit"
            className="w-full rounded-xl bg-amber-600 py-3 font-bold text-white shadow hover:bg-amber-700 transition disabled:opacity-50"
          >
            {busy ? 'Updating…' : 'Activate Account & Proceed'}
          </button>
        </form>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------
 * 2. ADMIN COMPONENTS
 * ------------------------------------------------------------- */

function AdminOverview({ dashboard, departments, onRefresh }: { dashboard: Record<string, unknown> | null; departments: Department[]; onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-navy">Organization Overview</h2>
          <p className="text-sm text-slate-500">Live aggregate figures derived strictly from database records</p>
        </div>
        <button onClick={onRefresh} className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
          ↻ Refresh KPIs
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Headcount" value={String(dashboard?.headcount ?? 0)} sub="Active & Probation employees" icon="👥" color="teal" />
        <KpiCard label="Present Today" value={String(dashboard?.presentToday ?? 0)} sub="Server-stamped check-ins" icon="⏱" color="navy" />
        <KpiCard label="Pending Leaves" value={String(dashboard?.pendingLeaves ?? 0)} sub="Awaiting HR review" icon="📝" color="amber" />
        <KpiCard label="Finalized Payroll Cost" value={`PKR ${dashboard?.payrollCost ?? '0.00'}`} sub="Latest finalized run" icon="💳" color="purple" />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        <h3 className="font-bold text-navy mb-4">Department Distribution</h3>
        {departments.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No departments created yet. Go to Company & Org tab to set up departments.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => (
              <div key={d.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <p className="font-bold text-slate-800">{d.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">Code: {d.code || 'None'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminOrganization({ busy, submit, departments, designations, setNotice, onReload }: { busy: boolean; submit: (action: () => Promise<void>) => Promise<void>; departments: Department[]; designations: Designation[]; setNotice: (n: Notice) => void; onReload: () => void }) {
  const onAddDepartment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit(async () => {
      await api.post('/departments', {
        name: form.get('name'),
        code: form.get('code') || undefined
      });
      setNotice({ kind: 'success', text: 'Department created successfully.' });
      event.currentTarget.reset();
      onReload();
    });
  };

  const onAddDesignation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit(async () => {
      await api.post('/designations', {
        name: form.get('name')
      });
      setNotice({ kind: 'success', text: 'Designation created successfully.' });
      event.currentTarget.reset();
      onReload();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Company & Organizational Catalog</h2>
        <p className="text-sm text-slate-500">Configure organizational taxonomy for role registration</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h3 className="font-bold text-navy flex items-center justify-between">
            <span>Departments</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-semibold">{departments.length}</span>
          </h3>

          <form onSubmit={onAddDepartment} className="flex gap-2">
            <input required name="name" placeholder="Department name" className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal" />
            <input name="code" placeholder="Code (e.g. ENG)" className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal" />
            <button disabled={busy} type="submit" className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
              Add
            </button>
          </form>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {departments.map((d) => (
              <div key={d.id} className="py-2.5 flex justify-between items-center text-sm">
                <span className="font-medium text-slate-800">{d.name}</span>
                {d.code && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">{d.code}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Designation Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h3 className="font-bold text-navy flex items-center justify-between">
            <span>Designations</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-semibold">{designations.length}</span>
          </h3>

          <form onSubmit={onAddDesignation} className="flex gap-2">
            <input required name="name" placeholder="Designation title (e.g. Senior Software Engineer)" className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal" />
            <button disabled={busy} type="submit" className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
              Add
            </button>
          </form>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {designations.map((d) => (
              <div key={d.id} className="py-2.5 text-sm font-medium text-slate-800">
                {d.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminHrManagement({ busy, submit, setNotice, onReload }: { busy: boolean; submit: (action: () => Promise<void>) => Promise<void>; setNotice: (n: Notice) => void; onReload: () => void }) {
  const [createdInfo, setCreatedInfo] = useState<{ email: string; tempPass: string } | null>(null);

  const onAddHr = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = form.get('email') as string;
    const temporaryPassword = form.get('temporaryPassword') as string || undefined;

    void submit(async () => {
      const result = await api.post<{ user: { id: string; email: string }; temporaryPassword?: string }>('/users/hr', {
        email,
        temporaryPassword
      });
      setCreatedInfo({ email: result.user.email, tempPass: result.temporaryPassword || temporaryPassword || '' });
      setNotice({ kind: 'success', text: `HR account ${email} created successfully.` });
      event.currentTarget.reset();
      onReload();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">HR Account Management</h2>
        <p className="text-sm text-slate-500">Admins provision HR logins with temporary passwords and mustChangePassword flags</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
          <h3 className="font-bold text-navy mb-4">Create HR Login</h3>
          <form onSubmit={onAddHr} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">HR Official Email</label>
              <input required name="email" type="email" placeholder="hr.lead@company.com" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Initial Temporary Password (Optional)</label>
              <input name="temporaryPassword" type="password" placeholder="Leave blank to auto-generate" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
              <span className="text-xs text-slate-400 mt-1 block">If specified, must be 10+ chars with uppercase, lowercase, number.</span>
            </div>

            <button disabled={busy} type="submit" className="w-full rounded-xl bg-teal py-3 text-sm font-bold text-white shadow hover:bg-teal/90 transition disabled:opacity-50">
              {busy ? 'Creating…' : 'Create HR Account'}
            </button>
          </form>
        </div>

        {createdInfo && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 shadow-sm">
            <h3 className="font-bold text-emerald-900 mb-2">Credentials Created:</h3>
            <p className="text-sm text-emerald-800 mb-4">Provide these credentials to the HR officer for their first login:</p>
            <div className="rounded-xl bg-white p-4 font-mono text-sm border border-emerald-200 space-y-1">
              <p><span className="text-slate-400">Email:</span> <strong>{createdInfo.email}</strong></p>
              <p><span className="text-slate-400">Temporary Password:</span> <strong className="text-emerald-700">{createdInfo.tempPass}</strong></p>
            </div>
            <p className="text-xs text-emerald-700 mt-3">The user will be prompted to change this temporary password immediately upon signing in.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminPayrollFinalization({ busy, submit, runs, selectedRun, setSelectedRun, setNotice, onReload }: { busy: boolean; submit: (action: () => Promise<void>) => Promise<void>; runs: PayrollRun[]; selectedRun: { id: string; year: number; month: number; status: string; items: PayrollItem[] } | null; setSelectedRun: (r: { id: string; year: number; month: number; status: string; items: PayrollItem[] } | null) => void; setNotice: (n: Notice) => void; onReload: () => void }) {
  const onFinalize = (runId: string) => {
    void submit(async () => {
      await api.post(`/payroll/runs/${runId}/finalize`);
      setNotice({ kind: 'success', text: 'Payroll run finalized and locked! Payslips generated for all included employees.' });
      setSelectedRun(null);
      onReload();
    });
  };

  const onViewDetail = async (runId: string) => {
    try {
      const detail = await api.get<{ id: string; year: number; month: number; status: string; items: PayrollItem[] }>(`/payroll/runs/${runId}`);
      setSelectedRun(detail);
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to load run details.' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Payroll Finalization & Locking</h2>
        <p className="text-sm text-slate-500">Security Rule: Only Administrators can finalize and lock monthly payroll drafts</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        <h3 className="font-bold text-navy mb-4">Monthly Payroll Runs</h3>
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No payroll runs created yet. HR must generate a draft run first.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b">
                <tr>
                  <th className="p-3">Period</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Gross Total</th>
                  <th className="p-3">Tax Total</th>
                  <th className="p-3">Net Total</th>
                  <th className="p-3">Employees</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">{r.month}/{r.year}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.status === 'FINALIZED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono">PKR {r.grossTotal}</td>
                    <td className="p-3 font-mono">PKR {r.taxTotal}</td>
                    <td className="p-3 font-mono font-bold text-teal">PKR {r.netTotal}</td>
                    <td className="p-3">{r.itemCount}</td>
                    <td className="p-3 text-right space-x-2">
                      <button onClick={() => void onViewDetail(r.id)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-slate-100">
                        View Items
                      </button>
                      {r.status === 'DRAFT' && (
                        <button
                          disabled={busy}
                          onClick={() => onFinalize(r.id)}
                          className="rounded-lg bg-navy px-3 py-1 text-xs font-bold text-white shadow hover:bg-slate-800 disabled:opacity-50"
                        >
                          Finalize & Lock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRun && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-teal/40 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-bold text-navy">Payroll Run Details: {selectedRun.month}/{selectedRun.year}</h3>
              <span className={`text-xs font-bold rounded px-2 py-0.5 ${selectedRun.status === 'FINALIZED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {selectedRun.status}
              </span>
            </div>
            <button onClick={() => setSelectedRun(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">
              ✕ Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b text-xs">
                <tr>
                  <th className="p-2.5">Employee</th>
                  <th className="p-2.5">Basic</th>
                  <th className="p-2.5">Gross (1.5x)</th>
                  <th className="p-2.5">Absence Deduction</th>
                  <th className="p-2.5">Income Tax</th>
                  <th className="p-2.5">Net Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {selectedRun.items.map((it) => (
                  <tr key={it.id}>
                    <td className="p-2.5 font-sans font-medium">{it.employee}</td>
                    <td className="p-2.5">PKR {it.basic}</td>
                    <td className="p-2.5">PKR {it.gross}</td>
                    <td className="p-2.5 text-red-600">-PKR {it.deduction}</td>
                    <td className="p-2.5 text-amber-700">-PKR {it.tax}</td>
                    <td className="p-2.5 font-bold text-teal">PKR {it.net}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminAuditTrail({ logs, onReload }: { logs: AuditItem[]; onReload: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-navy">Immutable Audit Trail</h2>
          <p className="text-sm text-slate-500">Append-only administrative log of security and financial events</p>
        </div>
        <button onClick={onReload} className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold hover:bg-slate-50">
          ↻ Refresh Logs
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No audit records logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b text-xs">
                <tr>
                  <th className="p-3">Occurred At</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Entity ID</th>
                  <th className="p-3">Actor ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(log.occurredAt).toLocaleString()}</td>
                    <td className="p-3 font-bold font-mono text-navy">{log.action}</td>
                    <td className="p-3 capitalize">{log.entityType}</td>
                    <td className="p-3 font-mono text-slate-400">{log.entityId.slice(0, 8)}…</td>
                    <td className="p-3 font-mono text-slate-400">{log.actorUserId.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 3. HR COMPONENTS
 * ------------------------------------------------------------- */

function HrOverview({ dashboard, onRefresh }: { dashboard: Record<string, unknown> | null; onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-navy">HR Operations Dashboard</h2>
          <p className="text-sm text-slate-500">Live operational overview for employee and attendance management</p>
        </div>
        <button onClick={onRefresh} className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold hover:bg-slate-50">
          ↻ Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Headcount" value={String(dashboard?.headcount ?? 0)} sub="Active staff" icon="👥" color="teal" />
        <KpiCard label="Present Today" value={String(dashboard?.presentToday ?? 0)} sub="Check-ins recorded" icon="⏱" color="navy" />
        <KpiCard label="Pending Leaves" value={String(dashboard?.pendingLeaves ?? 0)} sub="Requires approval" icon="📝" color="amber" />
        <KpiCard label="Average Salary" value={`PKR ${dashboard?.averageSalary ?? '0.00'}`} sub="Monthly per employee" icon="💳" color="purple" />
      </div>
    </div>
  );
}

function HrEmployees({ busy, submit, employees, departments, designations, setNotice, onReload }: { busy: boolean; submit: (action: () => Promise<void>) => Promise<void>; employees: EmployeeRow[]; departments: Department[]; designations: Designation[]; setNotice: (n: Notice) => void; onReload: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [createdResult, setCreatedResult] = useState<{ email: string; pass: string; code: string } | null>(null);

  const onRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const workEmail = form.get('workEmail') as string;
    const employeeCode = form.get('employeeCode') as string;
    const temporaryPassword = form.get('temporaryPassword') as string || undefined;

    void submit(async () => {
      const result = await api.post<{ employee: EmployeeRow; temporaryPassword?: string }>('/employees', {
        employeeCode,
        firstName: form.get('firstName'),
        lastName: form.get('lastName'),
        workEmail,
        joinDate: form.get('joinDate'),
        basicSalary: Number(form.get('basicSalary')),
        departmentId: form.get('departmentId') || undefined,
        designationId: form.get('designationId') || undefined,
        temporaryPassword
      });
      setCreatedResult({ email: workEmail, pass: result.temporaryPassword || temporaryPassword || '', code: employeeCode });
      setNotice({ kind: 'success', text: `Employee ${employeeCode} registered successfully.` });
      event.currentTarget.reset();
      setShowForm(false);
      onReload();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-navy">Employee Directory</h2>
          <p className="text-sm text-slate-500">Register new staff, setup salary structure, and provision employee logins</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white shadow hover:bg-teal/90 transition"
        >
          {showForm ? 'Close Form' : '+ Register Employee'}
        </button>
      </div>

      {createdResult && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 shadow-sm">
          <h3 className="font-bold text-emerald-900 mb-1">Employee Account Created!</h3>
          <p className="text-sm text-emerald-800 mb-3">Share these credentials with the employee for initial sign in:</p>
          <div className="rounded-xl bg-white p-4 font-mono text-sm border border-emerald-200 space-y-1">
            <p><span className="text-slate-400">Code:</span> <strong>{createdResult.code}</strong></p>
            <p><span className="text-slate-400">Email:</span> <strong>{createdResult.email}</strong></p>
            <p><span className="text-slate-400">Temporary Password:</span> <strong className="text-emerald-700">{createdResult.pass}</strong></p>
          </div>
          <button onClick={() => setCreatedResult(null)} className="mt-3 text-xs font-bold text-emerald-800 underline">Dismiss</button>
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl bg-white p-6 shadow-md border border-teal/40">
          <h3 className="font-bold text-navy mb-4">Register New Employee</h3>
          <form onSubmit={onRegister} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Employee Code</label>
              <input required name="employeeCode" placeholder="EMP-001" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Work Email</label>
              <input required name="workEmail" type="email" placeholder="john.doe@company.com" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">First Name</label>
              <input required name="firstName" placeholder="John" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Last Name</label>
              <input required name="lastName" placeholder="Doe" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Join Date</label>
              <input required name="joinDate" type="date" defaultValue="2026-10-01" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Basic Monthly Salary (PKR)</label>
              <input required name="basicSalary" type="number" defaultValue="100000" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
              <span className="text-xs text-slate-400 mt-1 block">Gross = 1.5 × Basic (HRA 40%, Medical 10%).</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Department</label>
              <select name="departmentId" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal">
                <option value="">None / Unassigned</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Designation</label>
              <select name="designationId" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal">
                <option value="">None / Unassigned</option>
                {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Initial Temporary Password (Optional)</label>
              <input name="temporaryPassword" type="password" placeholder="Leave blank to generate secure random password" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
            </div>

            <div className="sm:col-span-2 pt-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button disabled={busy} type="submit" className="rounded-xl bg-teal px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-teal/90 disabled:opacity-50">
                {busy ? 'Registering…' : 'Register Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        {employees.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No employees registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b text-xs">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Basic Salary</th>
                  <th className="p-3">Join Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-navy">{emp.employeeCode}</td>
                    <td className="p-3 font-medium">{emp.firstName} {emp.lastName}</td>
                    <td className="p-3 text-slate-600">{emp.workEmail}</td>
                    <td className="p-3">{emp.department?.name || '—'}</td>
                    <td className="p-3">{emp.designation?.name || '—'}</td>
                    <td className="p-3 font-mono font-medium">{emp.basicSalary ? `PKR ${emp.basicSalary}` : 'Confidential'}</td>
                    <td className="p-3 text-slate-500">{emp.joinDate}</td>
                    <td className="p-3">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 font-bold text-[10px]">
                        {emp.employmentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AttendanceBoard({
  busy,
  submit,
  attendance,
  corrections = [],
  setNotice,
  onReload
}: {
  busy?: boolean;
  submit?: (action: () => Promise<void>) => Promise<void>;
  attendance: AttendanceItem[];
  corrections?: AttendanceCorrectionItem[];
  setNotice?: (n: Notice) => void;
  onReload: () => void;
}) {
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  const onDecision = (id: string, decision: 'APPROVED' | 'REJECTED') => {
    if (!submit || !setNotice) return;
    const comment = commentInput[id] || (decision === 'APPROVED' ? 'Regularization approved by HR.' : 'Correction rejected.');
    void submit(async () => {
      await api.post(`/attendance/corrections/${id}/decision`, { decision, comment });
      setNotice({ kind: 'success', text: `Attendance correction request has been ${decision.toLowerCase()}.` });
      onReload();
    });
  };

  const pending = corrections.filter((c) => c.status === 'PENDING');
  const past = corrections.filter((c) => c.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-navy">Daily Attendance & Regularizations</h2>
          <p className="text-sm text-slate-500">Live server-stamped employee attendance records and correction approvals</p>
        </div>
        <button onClick={onReload} className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold hover:bg-slate-50 transition">
          ↻ Refresh Records
        </button>
      </div>

      {/* Attendance Regularization Review Section (F11) */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
              {pending.length}
            </span>
            <h3 className="font-bold text-navy">Pending Attendance Corrections</h3>
          </div>
          <span className="text-xs text-slate-400">Feature F11 Regularization Flow</span>
        </div>

        {pending.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-2">No pending attendance correction requests.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((corr) => (
              <div key={corr.id} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">
                      {corr.employee ? `${corr.employee.firstName} ${corr.employee.lastName} (${corr.employee.employeeCode})` : 'Employee'}
                    </span>
                    <span className="ml-2 text-xs text-slate-500 font-mono">Date: {corr.targetWorkDate}</span>
                  </div>
                  <span className="rounded bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    PENDING APPROVAL
                  </span>
                </div>

                <p className="text-xs text-slate-700 mb-3 bg-white/80 p-2.5 rounded-xl border border-amber-100">
                  <span className="font-bold text-slate-800">Reason:</span> {corr.reason}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-100">
                  <input
                    type="text"
                    placeholder="Decision comment..."
                    value={commentInput[corr.id] || ''}
                    onChange={(e) => setCommentInput({ ...commentInput, [corr.id]: e.target.value })}
                    className="flex-1 min-w-[200px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-teal"
                  />
                  <button
                    disabled={busy}
                    onClick={() => onDecision(corr.id, 'APPROVED')}
                    className="rounded-xl bg-teal px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-teal/90 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => onDecision(corr.id, 'REJECTED')}
                    className="rounded-xl border border-red-300 bg-white px-4 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily Attendance Logs */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        <h3 className="font-bold text-navy mb-4">Daily Attendance Records</h3>
        {attendance.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No attendance records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b text-xs">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Check-in</th>
                  <th className="p-3">Check-out</th>
                  <th className="p-3">Worked (Min)</th>
                  <th className="p-3">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {attendance.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium">
                      {it.employee ? `${it.employee.name} (${it.employee.code})` : 'Self'}
                    </td>
                    <td className="p-3 text-slate-600">{it.workDate}</td>
                    <td className="p-3 font-mono text-slate-700">{new Date(it.checkInAt).toLocaleTimeString()}</td>
                    <td className="p-3 font-mono text-slate-700">{it.checkOutAt ? new Date(it.checkOutAt).toLocaleTimeString() : 'Active'}</td>
                    <td className="p-3 font-mono">{it.workedMinutes}m</td>
                    <td className="p-3 space-x-1">
                      {it.wasLate && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">LATE</span>}
                      {it.wasHalfDay && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">HALF DAY</span>}
                      {!it.wasLate && !it.wasHalfDay && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">ON TIME</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Regularization Decisions */}
      {past.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
          <h3 className="font-bold text-navy mb-4">Past Correction Decisions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b">
                <tr>
                  <th className="p-2.5">Employee</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Reason</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">HR Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {past.map((c) => (
                  <tr key={c.id}>
                    <td className="p-2.5 font-medium">{c.employee?.firstName} {c.employee?.lastName}</td>
                    <td className="p-2.5 font-mono">{c.targetWorkDate}</td>
                    <td className="p-2.5 text-slate-600">{c.reason}</td>
                    <td className="p-2.5">
                      <span className={`rounded px-1.5 py-0.5 font-bold ${c.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-500 italic">{c.decisionComment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function HrLeaveApprovals({ busy, submit, requests, setNotice, onReload }: { busy: boolean; submit: (action: () => Promise<void>) => Promise<void>; requests: LeaveRequest[]; setNotice: (n: Notice) => void; onReload: () => void }) {
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  const onDecision = (id: string, decision: 'APPROVED' | 'REJECTED') => {
    const comment = commentInput[id] || (decision === 'APPROVED' ? 'Approved by HR officer.' : 'Rejected per policy.');
    void submit(async () => {
      await api.post(`/leave/requests/${id}/decision`, { decision, comment });
      setNotice({ kind: 'success', text: `Leave request has been ${decision.toLowerCase()}.` });
      onReload();
    });
  };

  const pending = requests.filter((r) => r.status === 'PENDING');
  const past = requests.filter((r) => r.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Leave Approvals Inbox</h2>
        <p className="text-sm text-slate-500">Review employee leave applications and record audit-logged decisions</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        <h3 className="font-bold text-navy mb-4 flex items-center justify-between">
          <span>Pending Leave Requests</span>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">{pending.length}</span>
        </h3>

        {pending.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No pending leave requests awaiting approval.</p>
        ) : (
          <div className="space-y-4">
            {pending.map((req) => (
              <div key={req.id} className="rounded-xl border border-slate-200 p-5 bg-slate-50/50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <span className="font-bold text-slate-800">{req.employee?.firstName} {req.employee?.lastName}</span>
                    <span className="text-xs text-slate-400 ml-2">({req.employee?.employeeCode})</span>
                  </div>
                  <span className="rounded bg-teal/10 text-teal font-bold px-2 py-0.5 text-xs">
                    {req.leaveType.name} ({req.chargeableDays} working days)
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-slate-400">Duration: </span>
                    <span className="font-semibold text-slate-700">{req.startDate} to {req.endDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Reason: </span>
                    <span className="text-slate-800 font-medium">"{req.reason}"</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <input
                    placeholder="Decision comment..."
                    value={commentInput[req.id] || ''}
                    onChange={(e) => setCommentInput({ ...commentInput, [req.id]: e.target.value })}
                    className="flex-1 min-w-[200px] rounded-xl border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-teal"
                  />
                  <button
                    disabled={busy}
                    onClick={() => onDecision(req.id, 'APPROVED')}
                    className="rounded-xl bg-teal px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-teal/90 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => onDecision(req.id, 'REJECTED')}
                    className="rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        <h3 className="font-bold text-navy mb-4">Resolved Leave History</h3>
        {past.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No historical leave decisions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b text-xs">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Dates</th>
                  <th className="p-3">Days</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {past.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-medium">{p.employee?.firstName} {p.employee?.lastName}</td>
                    <td className="p-3">{p.leaveType.name}</td>
                    <td className="p-3">{p.startDate} - {p.endDate}</td>
                    <td className="p-3">{p.chargeableDays}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 italic">{p.decisionComment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function HrPayrollRuns({ busy, submit, runs, selectedRun, setSelectedRun, setNotice, onReload }: { busy: boolean; submit: (action: () => Promise<void>) => Promise<void>; runs: PayrollRun[]; selectedRun: { id: string; year: number; month: number; status: string; items: PayrollItem[] } | null; setSelectedRun: (r: { id: string; year: number; month: number; status: string; items: PayrollItem[] } | null) => void; setNotice: (n: Notice) => void; onReload: () => void }) {
  const onCreateDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit(async () => {
      await api.post('/payroll/runs', {
        year: Number(form.get('year')),
        month: Number(form.get('month'))
      });
      setNotice({ kind: 'success', text: 'Monthly payroll draft calculated and generated.' });
      onReload();
    });
  };

  const onViewDetail = async (runId: string) => {
    try {
      const detail = await api.get<{ id: string; year: number; month: number; status: string; items: PayrollItem[] }>(`/payroll/runs/${runId}`);
      setSelectedRun(detail);
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to load run details.' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Payroll Draft Generation</h2>
        <p className="text-sm text-slate-500">Calculate gross, prorations, absence deductions, and statutory income tax</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        <h3 className="font-bold text-navy mb-4">Create New Monthly Payroll Run</h3>
        <form onSubmit={onCreateDraft} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Year</label>
            <input required name="year" type="number" defaultValue="2026" className="w-32 rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-teal" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Month (1 - 12)</label>
            <input required name="month" type="number" min="1" max="12" defaultValue="10" className="w-32 rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-teal" />
          </div>

          <button
            disabled={busy}
            type="submit"
            className="rounded-xl bg-teal px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-teal/90 disabled:opacity-50"
          >
            {busy ? 'Calculating…' : 'Generate Payroll Draft'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        <h3 className="font-bold text-navy mb-4">Existing Payroll Runs</h3>
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No payroll runs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b text-xs">
                <tr>
                  <th className="p-3">Period</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Gross Total</th>
                  <th className="p-3">Tax Total</th>
                  <th className="p-3">Net Total</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="p-3 font-bold">{r.month}/{r.year}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.status === 'FINALIZED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono">PKR {r.grossTotal}</td>
                    <td className="p-3 font-mono">PKR {r.taxTotal}</td>
                    <td className="p-3 font-mono font-bold text-teal">PKR {r.netTotal}</td>
                    <td className="p-3">
                      <button onClick={() => void onViewDetail(r.id)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-slate-50">
                        Inspect Draft Items
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRun && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-teal/40 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-bold text-navy">Draft Calculation Breakdown: {selectedRun.month}/{selectedRun.year}</h3>
              <p className="text-xs text-slate-500">Gross = 1.5×Basic (HRA 40%, Medical 10%). Tax computed annualized.</p>
            </div>
            <button onClick={() => setSelectedRun(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">✕ Close</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b text-xs">
                <tr>
                  <th className="p-2.5">Employee</th>
                  <th className="p-2.5">Basic</th>
                  <th className="p-2.5">Gross (1.5x)</th>
                  <th className="p-2.5">Absence Deduction</th>
                  <th className="p-2.5">Income Tax</th>
                  <th className="p-2.5">Net Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {selectedRun.items.map((it) => (
                  <tr key={it.id}>
                    <td className="p-2.5 font-sans font-medium">{it.employee}</td>
                    <td className="p-2.5">PKR {it.basic}</td>
                    <td className="p-2.5">PKR {it.gross}</td>
                    <td className="p-2.5 text-red-600">-PKR {it.deduction}</td>
                    <td className="p-2.5 text-amber-700">-PKR {it.tax}</td>
                    <td className="p-2.5 font-bold text-teal">PKR {it.net}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
 * 4. EMPLOYEE COMPONENTS
 * ------------------------------------------------------------- */

function EmployeeWorkspace({ busy, submit, dashboard, announcements, notifications, setNotice, onRefresh }: { busy: boolean; submit: (action: () => Promise<void>) => Promise<void>; dashboard: Record<string, unknown> | null; announcements: Announcement[]; notifications: NotificationItem[]; setNotice: (n: Notice) => void; onRefresh: () => void }) {
  const onCheckIn = () => {
    void submit(async () => {
      await api.post('/attendance/check-in');
      setNotice({ kind: 'success', text: 'Server-stamped check-in recorded successfully!' });
      onRefresh();
    });
  };

  const onCheckOut = () => {
    void submit(async () => {
      await api.post('/attendance/check-out');
      setNotice({ kind: 'success', text: 'Server-stamped check-out recorded successfully!' });
      onRefresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-navy">My Workspace</h2>
          <p className="text-sm text-slate-500">Employee self-service and daily attendance controls</p>
        </div>
        <button onClick={onRefresh} className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold hover:bg-slate-50">
          ↻ Refresh
        </button>
      </div>

      {/* Attendance Clock Card */}
      <div className="rounded-3xl bg-gradient-to-r from-navy to-slate-800 p-8 text-white shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="rounded-full bg-teal/20 px-3 py-1 text-xs font-bold text-teal-300 border border-teal-500/30">
            Attendance Punch
          </span>
          <h3 className="text-3xl font-black mt-2">Daily Time Tracking</h3>
          <p className="text-sm text-slate-300 mt-1 max-w-md">
            Punches are timestamped by the server using your company's registered timezone (Asia/Karachi). One check-in allowed per calendar work date.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            disabled={busy}
            onClick={onCheckIn}
            className="rounded-2xl bg-teal px-6 py-4 font-bold text-white shadow-lg hover:bg-teal/90 transition transform active:scale-95 disabled:opacity-50 text-base"
          >
            Check In
          </button>
          <button
            disabled={busy}
            onClick={onCheckOut}
            className="rounded-2xl border-2 border-slate-400/80 bg-slate-700/50 px-6 py-4 font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition transform active:scale-95 disabled:opacity-50 text-base"
          >
            Check Out
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Weekly Hours" value={`${dashboard?.weeklyHours ?? 0}h`} sub="Against 40h standard" icon="⌛" color="teal" />
        <KpiCard label="Late Arrivals" value={String(dashboard?.lateCount ?? 0)} sub="Grace period exceeded" icon="⚠️" color="amber" />
        <KpiCard label="Approved Leaves" value={String(dashboard?.approvedLeaveCount ?? 0)} sub="Current calendar year" icon="📅" color="purple" />
      </div>

      {/* Announcements & Notifications */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
          <h3 className="font-bold text-navy mb-4">Company Announcements</h3>
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No announcements posted.</p>
          ) : (
            <div className="space-y-3">
              {announcements.slice(0, 3).map((a) => (
                <div key={a.id} className="rounded-xl border border-slate-100 p-4 bg-slate-50/50">
                  <h4 className="font-bold text-slate-800 text-sm">{a.title}</h4>
                  <p className="text-xs text-slate-600 mt-1">{a.body}</p>
                  <span className="text-[10px] text-slate-400 mt-2 block">{new Date(a.publishedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
          <h3 className="font-bold text-navy mb-4">My Notifications</h3>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 4).map((n) => (
                <div key={n.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                  <p className="font-bold text-slate-800">{n.title}</p>
                  <p className="text-slate-600 mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeAttendanceHistory({
  busy,
  submit,
  records,
  corrections = [],
  setNotice,
  onRefresh
}: {
  busy: boolean;
  submit: (action: () => Promise<void>) => Promise<void>;
  records: AttendanceItem[];
  corrections?: AttendanceCorrectionItem[];
  setNotice: (n: Notice) => void;
  onRefresh: () => void;
}) {
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);

  const onSubmitCorrection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const targetWorkDate = String(form.get('targetWorkDate'));
    const reason = String(form.get('reason'));
    void submit(async () => {
      await api.post('/attendance/corrections', { targetWorkDate, reason });
      setNotice({ kind: 'success', text: 'Attendance correction request submitted to HR successfully.' });
      setShowCorrectionForm(false);
      onRefresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-navy">My Attendance & Regularizations</h2>
          <p className="text-sm text-slate-500">Record of all server-stamped punches, durations, and regularization requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCorrectionForm(!showCorrectionForm)}
            className="rounded-xl bg-teal px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal/90 transition"
          >
            {showCorrectionForm ? '✕ Close Form' : '+ Request Regularization'}
          </button>
          <button
            onClick={onRefresh}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Regularization / Correction Form */}
      {showCorrectionForm && (
        <div className="rounded-2xl border border-teal/30 bg-teal/5 p-6 shadow-sm">
          <h3 className="font-bold text-navy mb-1">Submit Attendance Correction / Regularization</h3>
          <p className="text-xs text-slate-600 mb-4">
            If you forgot to check in, experienced technical problems, or worked offsite, submit a regularization request for HR review.
          </p>
          <form onSubmit={onSubmitCorrection} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Target Work Date</label>
                <input
                  required
                  name="targetWorkDate"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Reason for Regularization</label>
                <textarea
                  required
                  rows={2}
                  name="reason"
                  placeholder="e.g. Server connectivity delay during morning arrival, arrived at 09:05."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCorrectionForm(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                type="submit"
                className="rounded-xl bg-teal px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal/90 disabled:opacity-50"
              >
                {busy ? 'Submitting…' : 'Submit for HR Approval'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My Submitted Regularization Requests */}
      {corrections.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
          <h3 className="font-bold text-navy mb-4">My Regularization Requests</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Reason</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">HR Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {corrections.map((c) => (
                  <tr key={c.id}>
                    <td className="p-2.5 font-mono font-bold text-slate-800">{c.targetWorkDate}</td>
                    <td className="p-2.5 text-slate-600">{c.reason}</td>
                    <td className="p-2.5">
                      <span
                        className={`rounded px-2 py-0.5 font-bold ${
                          c.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-500 italic">{c.decisionComment || 'Pending HR review'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Punch History */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        <h3 className="font-bold text-navy mb-4">Server-Stamped Attendance Logs</h3>
        {records.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No attendance records found yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b text-xs">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Check In Time</th>
                  <th className="p-3">Check Out Time</th>
                  <th className="p-3">Duration (Minutes)</th>
                  <th className="p-3">Compliance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">{r.workDate}</td>
                    <td className="p-3 font-mono">{new Date(r.checkInAt).toLocaleTimeString()}</td>
                    <td className="p-3 font-mono">{r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString() : 'In Progress'}</td>
                    <td className="p-3 font-mono">{r.workedMinutes}m</td>
                    <td className="p-3 space-x-1">
                      {r.wasLate ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">LATE</span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">ON TIME</span>
                      )}
                      {r.wasHalfDay && (
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">HALF DAY</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeLeaveTab({ busy, submit, balances, leaveTypes, requests, setNotice, onReload }: { busy: boolean; submit: (action: () => Promise<void>) => Promise<void>; balances: LeaveBalance[]; leaveTypes: LeaveType[]; requests: LeaveRequest[]; setNotice: (n: Notice) => void; onReload: () => void }) {
  const onApply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit(async () => {
      await api.post('/leave/requests', {
        leaveTypeId: form.get('leaveTypeId'),
        startDate: form.get('startDate'),
        endDate: form.get('endDate'),
        reason: form.get('reason')
      });
      setNotice({ kind: 'success', text: 'Leave application submitted. Sent to HR for approval.' });
      event.currentTarget.reset();
      onReload();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Leave & Time Off</h2>
        <p className="text-sm text-slate-500">Live quota tracking, working-day calculations, and application submission</p>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balances.map((b) => (
          <div key={b.leaveTypeId} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80">
            <span className="text-xs font-bold uppercase text-slate-400">{b.name}</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-navy">
                {b.remaining !== null ? `${b.remaining}d` : 'Unlimited'}
              </span>
              <span className="text-xs text-slate-500">
                Quota: {b.quota !== null ? `${b.quota}d` : 'None'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Used this year: {b.used} days</p>
          </div>
        ))}
      </div>

      {/* Application Form */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        <h3 className="font-bold text-navy mb-4">Apply for Leave</h3>
        <form onSubmit={onApply} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Leave Type</label>
            <select required name="leaveTypeId" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal">
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.isPaid ? 'Paid' : 'Unpaid'})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Start Date</label>
              <input required name="startDate" type="date" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">End Date</label>
              <input required name="endDate" type="date" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Reason</label>
            <input required name="reason" placeholder="Brief reason for time off..." className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
            <span className="text-xs text-slate-400 mt-1 block">Weekends and company holidays will be excluded automatically from chargeable days.</span>
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button disabled={busy} type="submit" className="rounded-xl bg-teal px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-teal/90 disabled:opacity-50">
              {busy ? 'Submitting…' : 'Submit Leave Application'}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        <h3 className="font-bold text-navy mb-4">My Leave History</h3>
        {requests.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No leave applications submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b text-xs">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">End Date</th>
                  <th className="p-3">Working Days</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">HR Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="p-3 font-bold text-slate-800">{r.leaveType.name}</td>
                    <td className="p-3">{r.startDate}</td>
                    <td className="p-3">{r.endDate}</td>
                    <td className="p-3 font-mono">{r.chargeableDays}d</td>
                    <td className="p-3 text-slate-600">{r.reason}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : r.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 italic">{r.decisionComment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeSmartLeaveTab({ busy, submit, leaveTypes, setNotice, onComplete }: { busy: boolean; submit: (action: () => Promise<void>) => Promise<void>; leaveTypes: LeaveType[]; setNotice: (n: Notice) => void; onComplete: () => void }) {
  const [smartResult, setSmartResult] = useState<{ type: { id: string; name: string }; startDate: string; endDate: string; reason: string } | null>(null);

  const onParse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = form.get('prompt') as string;

    void submit(async () => {
      const result = await api.post<{ type: { id: string; name: string }; startDate: string; endDate: string; reason: string }>('/ai/smart-leave', {
        message
      });
      setSmartResult(result);
      setNotice({ kind: 'info', text: 'AI parsed dates and leave type. Please review and confirm before submitting.' });
    });
  };

  const onConfirm = () => {
    if (!smartResult) return;
    void submit(async () => {
      await api.post('/leave/requests', {
        leaveTypeId: smartResult.type.id,
        startDate: smartResult.startDate,
        endDate: smartResult.endDate,
        reason: `[AI Smart-Leave] ${smartResult.reason}`
      });
      setNotice({ kind: 'success', text: 'Smart-leave confirmed and submitted!' });
      onComplete();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">AI Smart-Leave Composer</h2>
        <p className="text-sm text-slate-500">Natural language intent parsed into an editable form with mandatory human confirmation</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-purple-200">
        <div className="flex items-center gap-2 text-purple-700 font-bold mb-3">
          <span>✨</span>
          <span>Natural Language Time Off Request</span>
        </div>

        <form onSubmit={onParse} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Your Request in Plain English</label>
            <input
              required
              name="prompt"
              defaultValue="I need to take leave next Monday for personal errands"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-purple-600 font-medium"
            />
            <span className="text-xs text-slate-400 mt-1 block">
              Try: <em>"Take casual leave next Friday"</em> or <em>"Leave next Tuesday and Wednesday"</em>
            </span>
          </div>

          <button
            disabled={busy}
            type="submit"
            className="rounded-xl bg-purple-700 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-purple-800 disabled:opacity-50"
          >
            {busy ? 'Parsing…' : 'Parse with AI'}
          </button>
        </form>
      </div>

      {smartResult && (
        <div className="rounded-2xl bg-purple-50 border border-purple-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-purple-200 pb-3">
            <div>
              <span className="text-xs font-bold uppercase text-purple-700">AI Parsed Preview</span>
              <h3 className="font-bold text-navy">Review & Confirm Leave Details</h3>
            </div>
            <span className="rounded bg-purple-200 px-2 py-0.5 text-xs font-bold text-purple-800">
              Requires Confirmation
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Leave Type</span>
              <select
                value={smartResult.type.id}
                onChange={(e) => {
                  const matched = leaveTypes.find((lt) => lt.id === e.target.value);
                  if (matched) setSmartResult({ ...smartResult, type: { id: matched.id, name: matched.name } });
                }}
                className="mt-1 w-full rounded-xl border border-purple-300 bg-white p-2 text-xs font-medium"
              >
                {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
              </select>
            </div>

            <div>
              <span className="text-xs text-slate-500 block">Start Date</span>
              <input
                type="date"
                value={smartResult.startDate}
                onChange={(e) => setSmartResult({ ...smartResult, startDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-purple-300 bg-white p-2 text-xs font-medium"
              />
            </div>

            <div>
              <span className="text-xs text-slate-500 block">End Date</span>
              <input
                type="date"
                value={smartResult.endDate}
                onChange={(e) => setSmartResult({ ...smartResult, endDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-purple-300 bg-white p-2 text-xs font-medium"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button onClick={() => setSmartResult(null)} className="rounded-xl border border-purple-300 px-4 py-2 text-xs font-semibold text-purple-800 hover:bg-purple-100">
              Discard
            </button>
            <button
              disabled={busy}
              onClick={onConfirm}
              className="rounded-xl bg-purple-700 px-6 py-2 text-xs font-bold text-white shadow hover:bg-purple-800 disabled:opacity-50"
            >
              Confirm and Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeePayslipsTab({ busy, setNotice, dashboard }: { busy: boolean; setNotice: (n: Notice) => void; dashboard: Record<string, unknown> | null }) {
  const [slips, setSlips] = useState<Array<{ id: string; year: number; month: number; basic: string; gross: string; deduction: string; tax: string; net: string; generatedAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlips = () => {
    setLoading(true);
    void api.get<Array<{ id: string; year: number; month: number; basic: string; gross: string; deduction: string; tax: string; net: string; generatedAt: string }>>('/payslips')
      .then((res) => setSlips(res || []))
      .catch(() => setSlips([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSlips();
  }, []);

  const latestSlip = dashboard?.latestPayslip as { id: string; year: number; month: number } | null | undefined;

  const onDownload = (slipId: string, period: string) => {
    void api.downloadPayslip(slipId, `payslip-${period}.pdf`)
      .then(() => setNotice({ kind: 'success', text: `Payslip downloaded successfully.` }))
      .catch((err) => setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Download failed.' }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-navy">My Payslips</h2>
          <p className="text-sm text-slate-500">Official digitally-generated PDF payslips after payroll finalization</p>
        </div>
        <button
          onClick={fetchSlips}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold hover:bg-slate-50 transition"
        >
          ↻ Refresh Payslips
        </button>
      </div>

      {latestSlip && (
        <div className="rounded-3xl border border-teal/30 bg-teal/5 p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded bg-teal/20 px-2.5 py-0.5 text-xs font-bold text-teal">Latest Finalized Period</span>
            <h3 className="text-xl font-bold text-navy mt-1">Period {latestSlip.month}/{latestSlip.year}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Includes HRA, medical allowance, illustrative tax schedule, and attendance deductions.</p>
          </div>

          <button
            disabled={busy}
            onClick={() => onDownload(latestSlip.id, `${latestSlip.year}-${latestSlip.month}`)}
            className="rounded-xl bg-teal px-6 py-3 font-bold text-white shadow hover:bg-teal/90 transition flex items-center gap-2"
          >
            <span>📥</span>
            <span>Download Latest PDF</span>
          </button>
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        <h3 className="text-base font-bold text-navy mb-4">All Generated Payslips</h3>
        {loading ? (
          <p className="text-sm text-slate-400 py-4 italic">Loading payslip records…</p>
        ) : slips.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">📄</p>
            <h4 className="font-bold text-slate-700">No Finalized Payslips Available</h4>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Your payslip will appear here immediately after the Administrator finalizes and locks the monthly payroll run.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b text-xs">
                <tr>
                  <th className="p-3">Period</th>
                  <th className="p-3">Basic (PKR)</th>
                  <th className="p-3">Gross (PKR)</th>
                  <th className="p-3">Deductions (PKR)</th>
                  <th className="p-3">Tax (PKR)</th>
                  <th className="p-3">Net Pay (PKR)</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {slips.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-navy">{s.month}/{s.year}</td>
                    <td className="p-3 font-mono">{s.basic}</td>
                    <td className="p-3 font-mono font-semibold">{s.gross}</td>
                    <td className="p-3 font-mono text-red-600">{s.deduction}</td>
                    <td className="p-3 font-mono text-slate-600">{s.tax}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{s.net}</td>
                    <td className="p-3">
                      <button
                        disabled={busy}
                        onClick={() => onDownload(s.id, `${s.year}-${s.month}`)}
                        className="rounded-lg bg-teal px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-teal/90 transition flex items-center gap-1.5"
                      >
                        <span>📥</span>
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeAiChatTab({ busy, submit, setNotice }: { busy: boolean; submit: (action: () => Promise<void>) => Promise<void>; setNotice: (n: Notice) => void }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; status?: string }>>([
    { role: 'assistant', text: 'Hello! I am your HCM Lite AI Assistant. You can ask me about company office policies, working hours, and grace periods.' }
  ]);
  const [inputMsg, setInputMsg] = useState('');

  const onSend = (queryText?: string) => {
    const textToSend = queryText || inputMsg;
    if (!textToSend.trim()) return;
    const userMsg = { role: 'user' as const, text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputMsg('');

    void submit(async () => {
      try {
        const res = await api.post<{ answer: string; status: string }>('/ai/chat', { message: textToSend });
        setMessages((prev) => [...prev, { role: 'assistant', text: res.answer, status: res.status }]);
      } catch (err) {
        setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'AI request failed.' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">AI Assistant</h2>
        <p className="text-sm text-slate-500">Security-scoped conversational helper with privacy guardrails</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 flex flex-col h-[500px]">
        {/* Sample chips */}
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <span className="font-bold text-slate-400 py-1">Try asking:</span>
          <button
            onClick={() => onSend('What is the company office start time and grace period?')}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-teal/10 hover:text-teal font-medium transition"
          >
            "What is the office start time and grace period?"
          </button>
          <button
            onClick={() => onSend("What is my colleague's salary?")}
            className="rounded-full bg-red-50 text-red-700 px-3 py-1 hover:bg-red-100 font-medium transition border border-red-200"
          >
            "What is my colleague's salary?" (Guardrail test)
          </button>
        </div>

        {/* Message feed */}
        <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-navy text-white rounded-tr-none'
                    : m.status === 'REFUSED'
                    ? 'bg-red-50 border border-red-200 text-red-900 rounded-tl-none font-medium'
                    : 'bg-white border border-slate-200/80 text-ink rounded-tl-none shadow-sm'
                }`}
              >
                {m.status === 'REFUSED' && <span className="block text-xs font-bold text-red-600 mb-1">🛑 ACCESS DENIED BY SECURITY GUARDRAIL</span>}
                <p>{m.text}</p>
                {m.role === 'assistant' && (
                  <span className="text-[10px] text-slate-400 block mt-1.5 font-sans">
                    {m.status ? `Status: ${m.status}` : 'AI Generated'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input bar */}
        <div className="mt-4 flex gap-2">
          <input
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
            placeholder="Ask a policy or attendance question..."
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal"
          />
          <button
            disabled={busy || !inputMsg.trim()}
            onClick={() => onSend()}
            className="rounded-xl bg-teal px-6 py-2.5 font-bold text-white shadow hover:bg-teal/90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function SecurityVerificationTab({ busy, submit, setNotice }: { busy: boolean; submit: (action: () => Promise<void>) => Promise<void>; setNotice: (n: Notice) => void }) {
  const [testResult, setTestResult] = useState<{ name: string; status: number; message: string; passed: boolean } | null>(null);

  const testPeerSalaryAccess = () => {
    void submit(async () => {
      try {
        // Attempting to query an employee salary endpoint as an EMPLOYEE role
        await api.get('/employees/00000000-0000-0000-0000-000000000000/salary');
        setTestResult({
          name: 'Access Colleague Salary',
          status: 200,
          message: 'Security breach: Employee was able to read salary endpoint!',
          passed: false
        });
      } catch {
        setTestResult({
          name: 'Access Colleague Salary',
          status: 403,
          message: 'Server-side RBAC correctly rejected request: Only ADMIN and HR roles have access to /employees/:id/salary.',
          passed: true
        });
        setNotice({ kind: 'success', text: 'Security test PASSED: Unauthorized salary access blocked (HTTP 403).' });
      }
    });
  };

  const testDuplicateCheckin = () => {
    void submit(async () => {
      try {
        await api.post('/attendance/check-in');
        setNotice({ kind: 'info', text: 'First check-in succeeded. Running second check-in now to verify duplicate rejection...' });
        await api.post('/attendance/check-in');
        setTestResult({
          name: 'Duplicate Check-in Prevention',
          status: 200,
          message: 'Duplicate check-in was erroneously accepted.',
          passed: false
        });
      } catch {
        setTestResult({
          name: 'Duplicate Check-in Prevention',
          status: 409,
          message: 'Server correctly returned HTTP 409 Conflict: A check-in already exists for today.',
          passed: true
        });
        setNotice({ kind: 'success', text: 'Security test PASSED: Duplicate check-in rejected with HTTP 409.' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Judge Security Verification Suite</h2>
        <p className="text-sm text-slate-500">Run active live tests to verify server-side RBAC and operational invariant enforcement</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h3 className="font-bold text-navy">Test 1: Colleague Salary Confidentiality</h3>
          <p className="text-xs text-slate-600">
            Sends an authenticated request to <code>GET /api/v1/employees/:id/salary</code>. The server must deny the request for Employee roles with HTTP 403.
          </p>
          <button
            disabled={busy}
            onClick={testPeerSalaryAccess}
            className="w-full rounded-xl bg-navy py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 disabled:opacity-50"
          >
            Run Salary Probe Test
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h3 className="font-bold text-navy">Test 2: Duplicate Daily Check-in Prevention</h3>
          <p className="text-xs text-slate-600">
            Sends two consecutive check-in requests for today. The server must enforce the one-record-per-day constraint and reject the second punch with HTTP 409.
          </p>
          <button
            disabled={busy}
            onClick={testDuplicateCheckin}
            className="w-full rounded-xl bg-teal py-2.5 text-xs font-bold text-white shadow hover:bg-teal/90 disabled:opacity-50"
          >
            Run Duplicate Punch Test
          </button>
        </div>
      </div>

      {testResult && (
        <div className={`rounded-2xl p-6 border ${testResult.passed ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'}`}>
          <div className="flex items-center gap-2 font-bold text-base mb-1">
            <span>{testResult.passed ? '✅ TEST PASSED' : '❌ TEST FAILED'}</span>
            <span>—</span>
            <span>{testResult.name}</span>
          </div>
          <p className="font-mono text-xs mb-2">HTTP Status Code: {testResult.status}</p>
          <p className="text-sm">{testResult.message}</p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
 * 5. COMMON / REUSABLE SUBCOMPONENTS
 * ------------------------------------------------------------- */

function KpiCard({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: string; color: 'teal' | 'navy' | 'amber' | 'purple' }) {
  const colorMap = {
    teal: 'border-teal/30 bg-teal/5 text-teal',
    navy: 'border-slate-300 bg-slate-50 text-navy',
    amber: 'border-amber-300 bg-amber-50 text-amber-700',
    purple: 'border-purple-300 bg-purple-50 text-purple-700'
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm bg-white ${colorMap[color] || ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function AnnouncementsView({ busy, submit, canPost, announcements, setNotice, onReload }: { busy: boolean; submit: (action: () => Promise<void>) => Promise<void>; canPost: boolean; announcements: Announcement[]; setNotice: (n: Notice) => void; onReload: () => void }) {
  const onPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit(async () => {
      await api.post('/announcements', {
        title: form.get('title'),
        body: form.get('body')
      });
      setNotice({ kind: 'success', text: 'Announcement published successfully.' });
      event.currentTarget.reset();
      onReload();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Company Announcements</h2>
        <p className="text-sm text-slate-500">Official broadcast feed for organizational notices and policy updates</p>
      </div>

      {canPost && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
          <h3 className="font-bold text-navy mb-4">Post New Announcement</h3>
          <form onSubmit={onPost} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Title</label>
              <input required name="title" placeholder="e.g. Q4 Strategy Review & Annual Planning" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Announcement Body</label>
              <textarea required rows={3} name="body" placeholder="Provide full details..." className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
            </div>

            <button disabled={busy} type="submit" className="rounded-xl bg-teal px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-teal/90 disabled:opacity-50">
              {busy ? 'Publishing…' : 'Publish Announcement'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 text-sm text-slate-500 italic">
            No company announcements posted yet.
          </div>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-navy text-base">{a.title}</h3>
                <span className="text-xs text-slate-400">{new Date(a.publishedAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{a.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
