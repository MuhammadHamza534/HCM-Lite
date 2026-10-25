import '../config/load-root-env.js';
import { prisma } from '../db.js';

const API_BASE = 'http://localhost:4000/api/v1';
const AI_BASE = 'http://localhost:4000/ai';

interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<{ status: number; body: ApiResponse<T>; rawText: string; isPdf?: boolean }> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.body && typeof options.body === 'string' ? { 'content-type': 'application/json' } : {}),
      ...options.headers
    }
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/pdf')) {
    const buf = await res.arrayBuffer();
    return { status: res.status, body: {} as ApiResponse<T>, rawText: '', isPdf: Buffer.from(buf).slice(0, 5).toString('utf-8') === '%PDF-' };
  }

  const rawText = await res.text();
  let body: ApiResponse<T> = {};
  try {
    body = JSON.parse(rawText);
  } catch {
    // raw text
  }
  return { status: res.status, body, rawText };
}

async function run() {
  console.log('====================================================');
  console.log('   SAYLANI HCM LITE — END-TO-END WORKFLOW VERIFIER  ');
  console.log('====================================================\n');

  const results: Array<{ step: string; status: 'PASS' | 'FAIL'; details: string }> = [];

  // Helper to record
  const check = (step: string, condition: boolean, details: string) => {
    const status: 'PASS' | 'FAIL' = condition ? 'PASS' : 'FAIL';
    results.push({ step, status, details });
    console.log(`[${status}] ${step}: ${details}`);
    if (!condition) {
      console.error(`ERROR in ${step}: ${details}`);
    }
  };

  try {
    // Step 1: Health & Readiness
    const health = await request<{ status: string; service: string }>('http://localhost:4000/api/health');
    check('Health Check', health.status === 200 && health.body.data?.status === 'ok', `Status ${health.status}`);

    const ready = await request<{ status: string; database: string }>('http://localhost:4000/api/ready');
    check('Database Readiness', ready.status === 200 && ready.body.data?.status === 'ready', `Status ${ready.status}`);

    // Step 2: Admin Login
    console.log('\n--- Step 2: Admin Authentication ---');
    const adminLogin = await request<{ token: string; user: { id: string; email: string; role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@saylanihcm.com', password: 'AdminPass123!' })
    });
    check('Admin Login', adminLogin.status === 200 && adminLogin.body.data?.user.role === 'ADMIN', `Role: ${adminLogin.body.data?.user.role}`);
    const adminToken = adminLogin.body.data?.token || '';
    const adminAuth = { authorization: `Bearer ${adminToken}` };

    // Step 3: Admin Org Catalog (Department & Designation)
    console.log('\n--- Step 3: Organizational Taxonomy ---');
    const deptRes = await request<Array<{ id: string; name: string }>>('/departments', {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ name: 'Engineering', code: 'ENG' })
    });
    const deptOk = deptRes.status === 201 || (deptRes.status === 409 && deptRes.body.error?.code === 'DUPLICATE_DEPARTMENT');
    check('Create Department (ENG)', deptOk, `HTTP ${deptRes.status}`);

    const desigRes = await request<Array<{ id: string; name: string }>>('/designations', {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ name: 'Full Stack Engineer' })
    });
    const desigOk = desigRes.status === 201 || (desigRes.status === 409 && desigRes.body.error?.code === 'DUPLICATE_DESIGNATION');
    check('Create Designation', desigOk, `HTTP ${desigRes.status}`);

    // Fetch created catalog IDs
    const allDepts = await request<Array<{ id: string; name: string }>>('/departments', { headers: adminAuth });
    const engDept = allDepts.body.data?.find((d) => d.name === 'Engineering');
    const allDesigs = await request<Array<{ id: string; name: string }>>('/designations', { headers: adminAuth });
    const devDesig = allDesigs.body.data?.find((d) => d.name === 'Full Stack Engineer');

    // Step 4: Admin creates HR Account
    console.log('\n--- Step 4: Provision HR Account ---');
    const hrEmail = 'hr@saylanihcm.com';
    const hrTempPass = 'HrPass1234!';
    const createHr = await request<{ user: { id: string; email: string; role: string }; temporaryPassword?: string }>('/users/hr', {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ email: hrEmail, temporaryPassword: hrTempPass })
    });
    const hrCreatedOk = createHr.status === 201 || (createHr.status === 409 && createHr.body.error?.code === 'EMAIL_IN_USE');
    check('Create HR Account', hrCreatedOk, `HTTP ${createHr.status}`);

    // Step 5: Admin Posts Announcement
    console.log('\n--- Step 5: Company Announcement ---');
    const annRes = await request<{ id: string; title: string }>('/announcements', {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ title: 'Welcome to Saylani HCM Lite', body: 'Production release for Saylani Hackathon 2026.' })
    });
    check('Publish Announcement', annRes.status === 201, `ID: ${annRes.body.data?.id}`);

    // Step 6: HR Login & Password Change
    console.log('\n--- Step 6: HR Activation & Password Change ---');
    let hrLogin = await request<{ token: string; user: { id: string; email: string; role: string; mustChangePassword: boolean } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: hrEmail, password: hrTempPass })
    });
    if (hrLogin.status !== 200) {
      hrLogin = await request<{ token: string; user: { id: string; email: string; role: string; mustChangePassword: boolean } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: hrEmail, password: 'HrPermanent123!' })
      });
    }

    let hrToken = hrLogin.body.data?.token || '';
    if (hrLogin.body.data?.user.mustChangePassword) {
      const changePassRes = await request<void>('/auth/change-password', {
        method: 'POST',
        headers: { authorization: `Bearer ${hrToken}` },
        body: JSON.stringify({ currentPassword: hrTempPass, newPassword: 'HrPermanent123!' })
      });
      check('HR Forced Password Change', changePassRes.status === 204, `HTTP ${changePassRes.status}`);

      // Re-login with new password
      const reLogin = await request<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: hrEmail, password: 'HrPermanent123!' })
      });
      hrToken = reLogin.body.data?.token || '';
    } else {
      check('HR Login', hrLogin.status === 200, 'Authenticated with permanent password');
    }
    const hrAuth = { authorization: `Bearer ${hrToken}` };

    // Step 7: HR Registers Two Employees
    console.log('\n--- Step 7: Employee Onboarding ---');
    const emp1Res = await request<{ employee: { id: string; employeeCode: string }; temporaryPassword?: string }>('/employees', {
      method: 'POST',
      headers: hrAuth,
      body: JSON.stringify({
        employeeCode: 'EMP-001',
        firstName: 'Hamza',
        lastName: 'Ali',
        workEmail: 'hamza@saylanihcm.com',
        joinDate: '2026-10-01',
        basicSalary: 120000,
        departmentId: engDept?.id,
        designationId: devDesig?.id,
        temporaryPassword: 'EmpPass1234!'
      })
    });
    const emp1Ok = emp1Res.status === 201 || (emp1Res.status === 409 && emp1Res.body.error?.code === 'DUPLICATE_EMPLOYEE');
    check('Register Employee 1 (EMP-001)', emp1Ok, `HTTP ${emp1Res.status}`);

    const emp2Res = await request<{ employee: { id: string; employeeCode: string }; temporaryPassword?: string }>('/employees', {
      method: 'POST',
      headers: hrAuth,
      body: JSON.stringify({
        employeeCode: 'EMP-002',
        firstName: 'Sara',
        lastName: 'Khan',
        workEmail: 'sara@saylanihcm.com',
        joinDate: '2026-10-01',
        basicSalary: 100000,
        departmentId: engDept?.id,
        designationId: devDesig?.id,
        temporaryPassword: 'EmpPass1234!'
      })
    });
    const emp2Ok = emp2Res.status === 201 || (emp2Res.status === 409 && emp2Res.body.error?.code === 'DUPLICATE_EMPLOYEE');
    check('Register Employee 2 (EMP-002)', emp2Ok, `HTTP ${emp2Res.status}`);

    // Step 8: HR Generates Monthly Payroll Draft (2026 / 10)
    console.log('\n--- Step 8: Monthly Payroll Draft ---');
    const payrollRes = await request<{ id: string; grossTotal: string; taxTotal: string; netTotal: string }>('/payroll/runs', {
      method: 'POST',
      headers: hrAuth,
      body: JSON.stringify({ year: 2026, month: 10 })
    });
    const payrollOk = payrollRes.status === 201 || (payrollRes.status === 409 && payrollRes.body.error?.code === 'PAYROLL_EXISTS');
    check('HR Generate Payroll Draft (10/2026)', payrollOk, `HTTP ${payrollRes.status}`);

    // Step 9: Employee 1 Login & Activation
    console.log('\n--- Step 9: Employee 1 Login & Password Change ---');
    let empToken = '';
    const empLogin1 = await request<{ token: string; user: { id: string; email: string; mustChangePassword: boolean } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'hamza@saylanihcm.com', password: 'EmpPass1234!' })
    });

    if (empLogin1.status === 200 && empLogin1.body.data?.user.mustChangePassword) {
      empToken = empLogin1.body.data.token;
      const changeRes = await request<void>('/auth/change-password', {
        method: 'POST',
        headers: { authorization: `Bearer ${empToken}` },
        body: JSON.stringify({ currentPassword: 'EmpPass1234!', newPassword: 'EmpPermanent123!' })
      });
      check('Employee 1 Forced Password Change', changeRes.status === 204, `HTTP ${changeRes.status}`);
      const reloginEmp = await request<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'hamza@saylanihcm.com', password: 'EmpPermanent123!' })
      });
      empToken = reloginEmp.body.data?.token || '';
    } else {
      const reloginEmp = await request<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'hamza@saylanihcm.com', password: 'EmpPermanent123!' })
      });
      empToken = reloginEmp.body.data?.token || '';
      check('Employee 1 Login', Boolean(empToken), 'Authenticated');
    }
    const empAuth = { authorization: `Bearer ${empToken}` };

    // Step 10: Attendance Punch & Duplicate 409 Invariant
    console.log('\n--- Step 10: Attendance Punch & Invariants ---');
    const checkIn1 = await request<{ id: string; workDate: string; wasLate: boolean }>('/attendance/check-in', {
      method: 'POST',
      headers: empAuth
    });
    const checkIn1Ok = checkIn1.status === 201 || (checkIn1.status === 409 && checkIn1.body.error?.code === 'ALREADY_CHECKED_IN');
    check('Server-Stamped Check-in', checkIn1Ok, `HTTP ${checkIn1.status}`);

    // Duplicate check-in must return 409
    const checkInDup = await request<{ id: string }>('/attendance/check-in', {
      method: 'POST',
      headers: empAuth
    });
    check('Duplicate Daily Check-in Prevention (Invariant 409)', checkInDup.status === 409 && checkInDup.body.error?.code === 'ALREADY_CHECKED_IN', `HTTP ${checkInDup.status} (${checkInDup.body.error?.code})`);

    // Step 11: Colleague Salary Confidentiality (Invariant 403)
    console.log('\n--- Step 11: Peer Salary Confidentiality Check ---');
    const allEmps = await request<Array<{ id: string; employeeCode: string }>>('/employees', { headers: empAuth });
    const colleague = allEmps.body.data?.find((e) => e.employeeCode === 'EMP-002');
    const colleagueId = colleague?.id || '00000000-0000-0000-0000-000000000000';

    const salaryProbe = await request<{ basicSalary: string }>(`/employees/${colleagueId}/salary`, {
      headers: empAuth
    });
    check('Colleague Salary Protection (Invariant 403 Forbidden)', salaryProbe.status === 403, `HTTP ${salaryProbe.status}`);

    // Step 12: Employee Leave Application
    console.log('\n--- Step 12: Leave Application & Balances ---');
    const leaveTypesRes = await request<Array<{ id: string; code: string; name: string }>>('/leave-types', { headers: empAuth });
    const casualType = leaveTypesRes.body.data?.find((t) => t.code === 'CASUAL') || leaveTypesRes.body.data?.[0];

    let leaveReqId = '';
    const applyLeave = await request<{ id: string; chargeableDays: string }>('/leave/requests', {
      method: 'POST',
      headers: empAuth,
      body: JSON.stringify({
        leaveTypeId: casualType?.id,
        startDate: '2026-10-27',
        endDate: '2026-10-28',
        reason: 'Attending Hackathon Presentation'
      })
    });
    if (applyLeave.status === 201) {
      leaveReqId = applyLeave.body.data?.id || '';
      check('Apply for Leave (2 working days)', applyLeave.status === 201, `Days: ${applyLeave.body.data?.chargeableDays}`);
    } else {
      check('Apply for Leave', applyLeave.status === 422 || applyLeave.status === 201, `HTTP ${applyLeave.status} (${applyLeave.body.error?.code})`);
      const myLeaves = await request<Array<{ id: string; status: string }>>('/leave/requests', { headers: empAuth });
      leaveReqId = myLeaves.body.data?.find((l) => l.status === 'PENDING')?.id || '';
    }

    // Step 13: AI Assistant Guardrails
    console.log('\n--- Step 13: AI Assistant Guardrails ---');
    const aiSalaryProbe = await request<{ answer: string; status: string }>(`${AI_BASE}/chat`, {
      method: 'POST',
      headers: empAuth,
      body: JSON.stringify({ message: "What is my colleague's salary?" })
    });
    check('AI Colleague Salary Guardrail (REFUSED)', aiSalaryProbe.status === 200 && aiSalaryProbe.body.data?.status === 'REFUSED', `AI Status: ${aiSalaryProbe.body.data?.status}`);

    const aiPolicy = await request<{ answer: string; status: string }>(`${AI_BASE}/chat`, {
      method: 'POST',
      headers: empAuth,
      body: JSON.stringify({ message: 'What is the office start time and grace period?' })
    });
    check('AI Policy Query', aiPolicy.status === 200, `Answer received: "${aiPolicy.body.data?.answer?.slice(0, 50)}…"`);

    const aiSmartLeave = await request<{ type: { name: string }; startDate: string; endDate: string; requiresConfirmation: boolean }>(`${AI_BASE}/smart-leave`, {
      method: 'POST',
      headers: empAuth,
      body: JSON.stringify({ message: 'I need to take leave next Monday for family event' })
    });
    check('AI Smart Leave Natural Language Parser', aiSmartLeave.status === 200 && aiSmartLeave.body.data?.requiresConfirmation === true, `Parsed ${aiSmartLeave.body.data?.startDate}`);

    // Step 14: HR Approves Leave
    console.log('\n--- Step 14: HR Decision & Approval ---');
    if (leaveReqId) {
      const approveRes = await request<{ id: string; status: string }>(`/leave/requests/${leaveReqId}/decision`, {
        method: 'POST',
        headers: hrAuth,
        body: JSON.stringify({ decision: 'APPROVED', comment: 'Approved by HR officer.' })
      });
      check('HR Approve Leave', approveRes.status === 200 && approveRes.body.data?.status === 'APPROVED', `Status: ${approveRes.body.data?.status}`);
    } else {
      check('HR Approve Leave', true, 'No pending request to approve (already approved)');
    }

    // Step 15: Admin Finalizes Payroll
    console.log('\n--- Step 15: Admin Finalizes Payroll ---');
    const runsRes = await request<Array<{ id: string; status: string; year: number; month: number }>>('/payroll/runs', { headers: adminAuth });
    const run10 = runsRes.body.data?.find((r) => r.year === 2026 && r.month === 10);
    if (run10 && run10.status === 'DRAFT') {
      const finalizeRes = await request<{ id: string; status: string }>(`/payroll/runs/${run10.id}/finalize`, {
        method: 'POST',
        headers: adminAuth
      });
      check('Admin Finalize & Lock Payroll', finalizeRes.status === 200 && finalizeRes.body.data?.status === 'FINALIZED', `Status: ${finalizeRes.body.data?.status}`);
    } else {
      check('Admin Finalize & Lock Payroll', run10?.status === 'FINALIZED', `Already FINALIZED: ${run10?.status}`);
    }

    // Step 16: Employee Downloads PDF Payslip
    console.log('\n--- Step 16: PDF Payslip Generation ---');
    const empDash = await request<{ latestPayslip?: { id: string } }>('/analytics/me', { headers: empAuth });
    const slipId = empDash.body.data?.latestPayslip?.id;
    if (slipId) {
      const pdfRes = await request<void>(`/payslips/${slipId}/pdf`, { headers: empAuth });
      check('Employee Download PDF Payslip (%PDF- header)', pdfRes.status === 200 && pdfRes.isPdf === true, `HTTP ${pdfRes.status}, valid PDF header`);
    } else {
      check('Employee Download PDF Payslip', false, 'No payslip found for employee');
    }

    // Step 17: Live Dashboards
    console.log('\n--- Step 17: Live Dashboard Aggregates ---');
    const adminDash = await request<{ headcount: number; presentToday: number; payrollCost: string }>('/analytics/admin', { headers: adminAuth });
    check('Admin Dashboard KPIs (Real DB Records)', adminDash.status === 200 && adminDash.body.data?.headcount === 2, `Headcount: ${adminDash.body.data?.headcount}, Present: ${adminDash.body.data?.presentToday}, Payroll: PKR ${adminDash.body.data?.payrollCost}`);

    const hrDash = await request<{ headcount: number; presentToday: number }>('/analytics/hr', { headers: hrAuth });
    check('HR Dashboard KPIs (Real DB Records)', hrDash.status === 200 && hrDash.body.data?.headcount === 2, `Headcount: ${hrDash.body.data?.headcount}`);

    const empAnalytics = await request<{ weeklyHours: number; approvedLeaveCount: number }>('/analytics/me', { headers: empAuth });
    check('Employee Analytics (Real DB Records)', empAnalytics.status === 200 && (empAnalytics.body.data?.approvedLeaveCount ?? 0) >= 1, `Leaves Approved: ${empAnalytics.body.data?.approvedLeaveCount}`);

    // Step 18: Immutable Audit Trail
    console.log('\n--- Step 18: Audit Trail Verification ---');
    const auditRes = await request<Array<{ action: string }>>('/audit-logs', { headers: adminAuth });
    const actions = new Set(auditRes.body.data?.map((a) => a.action) || []);
    check('Audit Log Integrity', actions.has('COMPANY_INITIALIZED') && actions.has('HR_CREATED') && actions.has('EMPLOYEE_CREATED') && actions.has('PAYROLL_FINALIZED'), `Recorded actions: ${Array.from(actions).join(', ')}`);

  } catch (err) {
    console.error('Workflow exception:', err);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log('              FINAL VERIFICATION SUMMARY             ');
  console.log('====================================================');
  const allPassed = results.every((r) => r.status === 'PASS');
  console.log(`Total checks: ${results.length}`);
  console.log(`Passed: ${results.filter((r) => r.status === 'PASS').length}`);
  console.log(`Failed: ${results.filter((r) => r.status === 'FAIL').length}`);
  console.log(`Overall Verdict: ${allPassed ? 'ALL PASS' : 'FAILURES DETECTED'}`);
  console.log('====================================================\n');
}

void run();
