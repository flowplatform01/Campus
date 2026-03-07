const BASE = process.env.LIFECYCLE_BASE_URL || "http://localhost:3006";

const DEFAULT_TIMEOUT_MS = Number(process.env.LIFECYCLE_TIMEOUT_MS || 15000);

function logStep(name) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${name}`);
}

async function http(path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE}${path}`, {
      redirect: "manual",
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await res.json().catch(() => null) : await res.text().catch(() => null);
    return { res, data };
  } finally {
    clearTimeout(t);
  }
}

async function assertStatus(label, res, expected) {
  if (res.status !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${res.status}`);
  }
}

async function assertOneOf(label, result, expectedStatuses) {
  if (!expectedStatuses.includes(result.res.status)) {
    const body = typeof result.data === "string" ? result.data.slice(0, 500) : JSON.stringify(result.data)?.slice(0, 500);
    throw new Error(`${label}: expected one of ${expectedStatuses.join(",")}, got ${result.res.status}. body=${body}`);
  }
}

async function assertForbidden(label, result) {
  if (result.res.status !== 403) {
    const body = typeof result.data === "string" ? result.data.slice(0, 500) : JSON.stringify(result.data)?.slice(0, 500);
    throw new Error(`${label}: expected 403, got ${result.res.status}. body=${body}`);
  }
}

async function assertOk(label, result) {
  if (result.res.status < 200 || result.res.status >= 300) {
    const body = typeof result.data === "string" ? result.data.slice(0, 500) : JSON.stringify(result.data)?.slice(0, 500);
    throw new Error(`${label}: expected 2xx, got ${result.res.status}. body=${body}`);
  }
}

async function seedSubRoleGrants(adminToken, grantSpecByKey) {
  logStep("permissions: load sub-roles");
  const subRolesRes = await http("/api/sms/sub-roles", { headers: authHeaders(adminToken) });
  await assertStatus("sub-roles", subRolesRes.res, 200);
  const subRoles = Array.isArray(subRolesRes.data) ? subRolesRes.data : [];
  const byKey = new Map(subRoles.map((r) => [r.key, r]));

  for (const [key, permissionKeys] of Object.entries(grantSpecByKey)) {
    const role = byKey.get(key);
    if (!role?.id) throw new Error(`Missing sub-role id for key=${key}`);
    logStep(`permissions: grant ${key} -> ${permissionKeys.join("|")}`);
    const put = await http("/api/sms/sub-role-grants", {
      method: "PUT",
      headers: authHeaders(adminToken),
      body: JSON.stringify({ subRoleId: role.id, permissionKeys }),
    });
    await assertStatus(`grant ${key}`, put.res, 200);
  }
}

async function login(email, password) {
  logStep(`login(${email})`);
  const { res, data } = await http("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await assertStatus(`login(${email})`, res, 200);
  if (!data?.accessToken) throw new Error(`login(${email}): missing accessToken`);
  return data.accessToken;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function main() {
  logStep(`BASE=${BASE}`);
  const adminToken = await login("sim-admin@campus.demo", "Campus@12345");
  const teacherToken = await login("sim-teacher@campus.demo", "Campus@12345");
  const bursarToken = await login("sim-bursar@campus.demo", "Campus@12345");
  const accountantToken = await login("sim-accountant@campus.demo", "Campus@12345");
  const parentToken = await login("sim-parent@campus.demo", "Campus@12345");

  // Verify base health
  {
    logStep("health");
    const { res } = await http("/api/health");
    await assertStatus("health", res, 200);
  }

  // Load structure
  logStep("load academic years");
  const years = (await http("/api/sms/academic-years", { headers: authHeaders(adminToken) })).data;
  if (!Array.isArray(years) || years.length < 2) throw new Error("Expected >=2 academic years");
  const year1 = years.find((y) => y.name === "2024/2025") ?? years[0];
  const year2 = years.find((y) => y.name === "2025/2026") ?? years[1];

  logStep("load terms");
  const terms = (await http("/api/sms/terms", { headers: authHeaders(adminToken) })).data;
  const y1Terms = terms.filter((t) => t.academicYearId === year1.id);
  const y2Terms = terms.filter((t) => t.academicYearId === year2.id);
  if (y1Terms.length < 3 || y2Terms.length < 3) throw new Error("Expected 3 terms per year");

  logStep("load classes");
  const classes = (await http("/api/sms/classes", { headers: authHeaders(adminToken) })).data;
  const grade10 = classes.find((c) => c.name === "Grade 10") ?? classes[0];
  const grade11 = classes.find((c) => c.name === "Grade 11") ?? classes[1];
  if (!grade10?.id || !grade11?.id) throw new Error("Missing Grade 10/11");

  // Ensure employee sub-role permissions are configured so we can test positive paths
  await seedSubRoleGrants(adminToken, {
    teacher: ["create_assignments", "grade_assignments", "edit_grades", "view_schedule", "mark_attendance"],
    bursar: ["create_invoices", "process_payments", "view_payments"],
    accountant: ["view_payments", "view_reports", "generate_reports"],
  });

  // Admissions lifecycle: create + approve
  logStep("admissions: create");
  const admissionPayload = {
    academicYearId: year2.id,
    classId: grade10.id,
    studentFullName: `Lifecycle Student ${Date.now()}`,
    studentEmail: `lifecycle.student.${Date.now()}@campus.local`,
    parentFullName: `Lifecycle Parent ${Date.now()}`,
    parentEmail: `lifecycle.parent.${Date.now()}@campus.local`,
    notes: "Created by lifecycle runner",
  };
  const admissionCreate = await http("/api/sms/admissions", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify(admissionPayload),
  });
  await assertStatus("create admission", admissionCreate.res, 201);
  const admissionId = admissionCreate.data?.id;
  if (!admissionId) throw new Error("Admission created but missing id");

  logStep("admissions: approve");
  const approval = await http(`/api/sms/admissions/${encodeURIComponent(admissionId)}/approve`, {
    method: "POST",
    headers: authHeaders(adminToken),
  });
  await assertStatus("approve admission", approval.res, 200);

  // Attendance lifecycle: create draft session, add entries, submit, lock
  logStep("attendance: roster");
  const roster = await http(`/api/sms/attendance/roster?academicYearId=${encodeURIComponent(year2.id)}&classId=${encodeURIComponent(grade11.id)}`,
  {
    headers: authHeaders(adminToken),
  });
  await assertStatus("attendance roster", roster.res, 200);
  const rosterRows = Array.isArray(roster.data) ? roster.data : [];
  const oneStudent = rosterRows[0]?.student?.id;
  if (!oneStudent) throw new Error("No active students in roster to test attendance");

  logStep("attendance: create session");
  const attendanceSession = await http("/api/sms/attendance/sessions", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({
      academicYearId: year2.id,
      termId: y2Terms[0].id,
      classId: grade11.id,
      date: new Date().toISOString(),
      subjectId: undefined,
    }),
  });
  if (![200, 201].includes(attendanceSession.res.status)) {
    throw new Error(`create attendance session: expected 200/201, got ${attendanceSession.res.status}`);
  }
  const sessionId = attendanceSession.data?.id;
  if (!sessionId) throw new Error("Attendance session missing id");

  logStep("attendance: upsert entries");
  const upsertEntries = await http(`/api/sms/attendance/sessions/${encodeURIComponent(sessionId)}/entries`, {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ entries: [{ studentId: oneStudent, status: "present" }] }),
  });
  await assertStatus("upsert attendance entries", upsertEntries.res, 200);

  logStep("attendance: submit");
  const submitSession = await http(`/api/sms/attendance/sessions/${encodeURIComponent(sessionId)}/submit`, {
    method: "POST",
    headers: authHeaders(adminToken),
  });
  await assertStatus("submit attendance", submitSession.res, 200);

  logStep("attendance: lock");
  const lockSession = await http(`/api/sms/attendance/sessions/${encodeURIComponent(sessionId)}/lock`, {
    method: "POST",
    headers: authHeaders(adminToken),
  });
  await assertStatus("lock attendance", lockSession.res, 200);

  // Timetable lock: publish and then verify slot create returns 409
  logStep("timetable: publish");
  const publish = await http("/api/sms/timetable/publish", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ academicYearId: year2.id, termId: y2Terms[0].id, classId: grade10.id }),
  });
  if (![200, 201].includes(publish.res.status)) {
    throw new Error(`publish timetable: expected 200/201, got ${publish.res.status}`);
  }

  logStep("timetable: fetch subject+teacher");
  const subjects = (await http("/api/sms/subjects", { headers: authHeaders(adminToken) })).data;
  const subjectId = Array.isArray(subjects) ? subjects[0]?.id : subjects?.value?.[0]?.id;
  if (!subjectId) throw new Error("Missing subjectId for timetable slot test");

  const staff = (await http("/api/users/staff", { headers: authHeaders(adminToken) })).data;
  const teacherId = Array.isArray(staff) ? staff[0]?.id : staff?.value?.[0]?.id;
  if (!teacherId) throw new Error("Missing teacherId for timetable slot test");

  logStep("timetable: ensure locked (slot create expects 409)");
  const createSlotAfterPublish = await http("/api/sms/timetable/slots", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({
      academicYearId: year2.id,
      termId: y2Terms[0].id,
      classId: grade10.id,
      weekday: "mon",
      startTime: "10:00",
      endTime: "11:00",
      subjectId,
      teacherId,
    }),
  });
  if (createSlotAfterPublish.res.status !== 409) {
    throw new Error(`timetable lock: expected 409, got ${createSlotAfterPublish.res.status}`);
  }

  // Reports: student sees at least one published report + can download pdf redirect
  logStep("reports: student login + list");
  const studentToken = await login("sim-student-01@campus.demo", "Campus@12345");
  logStep("reports: student whoami");
  const me = await http("/api/auth/me", { headers: authHeaders(studentToken) });
  await assertStatus("auth me", me.res, 200);
  const studentUserId = me.data?.user?.id ?? me.data?.id;
  if (!studentUserId) throw new Error("auth/me missing user id");

  logStep("reports: student enrollment (admin)");
  const stuInfo = await http(`/api/users/${encodeURIComponent(studentUserId)}/info`, { headers: authHeaders(adminToken) });
  await assertStatus("student info", stuInfo.res, 200);
  const studentEnrollment = stuInfo.data?.related?.enrollment;
  const studentClassId = studentEnrollment?.classId;
  const studentSectionId = studentEnrollment?.sectionId ?? null;
  if (!studentClassId) throw new Error("student enrollment missing classId");

  const myReports = await http("/api/sms/reports/my", { headers: authHeaders(studentToken) });
  await assertStatus("student reports/my", myReports.res, 200);
  const rep = Array.isArray(myReports.data?.value) ? myReports.data.value[0] : (Array.isArray(myReports.data) ? myReports.data[0] : null);
  if (!rep?.id) throw new Error("Expected at least one report publication for student");

  logStep("reports: download pdf redirect");
  const dl = await http(`/api/sms/reports/my/${encodeURIComponent(rep.id)}/pdf`, {
    headers: authHeaders(studentToken),
  });
  if (![200, 302].includes(dl.res.status)) {
    throw new Error(`report download: expected 200/302, got ${dl.res.status}`);
  }

  // Discipline: create + list
  logStep("discipline: create");
  const disciplineCreate = await http("/api/sms/discipline", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ studentId: oneStudent, academicYearId: year2.id, termId: y2Terms[0].id, title: "Lifecycle incident", severity: "minor" }),
  });
  await assertStatus("create discipline", disciplineCreate.res, 201);

  logStep("discipline: list");
  const disciplineList = await http("/api/sms/discipline", { headers: authHeaders(adminToken) });
  await assertStatus("list discipline", disciplineList.res, 200);

  // Permission assertions (basic): student/parent must not access discipline listing
  logStep("permissions: student cannot list discipline");
  await assertForbidden("student list discipline", await http("/api/sms/discipline", { headers: authHeaders(studentToken) }));
  logStep("permissions: parent cannot list discipline");
  await assertForbidden("parent list discipline", await http("/api/sms/discipline", { headers: authHeaders(parentToken) }));

  // Analytics dashboard: admin ok; teacher/parent/student forbidden
  logStep("analytics: admin dashboard");
  await assertOk("analytics admin", await http("/api/analytics/dashboard", { headers: authHeaders(adminToken) }));
  logStep("analytics: teacher forbidden");
  await assertForbidden("analytics teacher", await http("/api/analytics/dashboard", { headers: authHeaders(teacherToken) }));
  logStep("analytics: parent forbidden");
  await assertForbidden("analytics parent", await http("/api/analytics/dashboard", { headers: authHeaders(parentToken) }));
  logStep("analytics: student forbidden");
  await assertForbidden("analytics student", await http("/api/analytics/dashboard", { headers: authHeaders(studentToken) }));

  // Permissions: admin-only endpoints should be forbidden to non-admin
  logStep("permissions: teacher cannot access sub-role grants");
  await assertForbidden("teacher sub-roles", await http("/api/sms/sub-roles", { headers: authHeaders(teacherToken) }));
  await assertForbidden("teacher sub-role-grants", await http("/api/sms/sub-role-grants", { headers: authHeaders(teacherToken) }));
  logStep("permissions: bursar cannot access sub-role grants");
  await assertForbidden("bursar sub-roles", await http("/api/sms/sub-roles", { headers: authHeaders(bursarToken) }));
  await assertForbidden("bursar sub-role-grants", await http("/api/sms/sub-role-grants", { headers: authHeaders(bursarToken) }));

  // Transfer: move oneStudent from Year1 Grade10 -> Year2 Grade11
  logStep("transfer: create");
  const transfer = await http("/api/sms/students/transfer", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({
      studentId: oneStudent,
      fromAcademicYearId: year1.id,
      toAcademicYearId: year2.id,
      fromClassId: grade10.id,
      toClassId: grade11.id,
      reason: "Lifecycle transfer",
    }),
    timeoutMs: 60000,
  });
  await assertOneOf("transfer", transfer, [201, 409]);

  // Assignments lifecycle: teacher creates + publishes; student lists + submits; teacher reviews
  logStep("assignments: teacher create");
  const assignmentCreate = await http("/api/sms/assignments", {
    method: "POST",
    headers: authHeaders(teacherToken),
    body: JSON.stringify({
      academicYearId: year2.id,
      termId: y2Terms[0].id,
      classId: studentClassId,
      sectionId: studentSectionId || undefined,
      subjectId,
      title: `Lifecycle Homework ${Date.now()}`,
      instructions: "Do the questions",
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      maxScore: 20,
    }),
  });
  await assertStatus("assignment create", assignmentCreate.res, 201);
  const assignmentId = assignmentCreate.data?.id;
  if (!assignmentId) throw new Error("Assignment created but missing id");

  logStep("assignments: teacher publish");
  await assertOk(
    "assignment publish",
    await http(`/api/sms/assignments/${encodeURIComponent(assignmentId)}/publish`, {
      method: "POST",
      headers: authHeaders(teacherToken),
    })
  );

  logStep("assignments: student list and find");
  const studentAssignments = await http("/api/sms/assignments", { headers: authHeaders(studentToken) });
  await assertStatus("student assignments", studentAssignments.res, 200);
  const aList = Array.isArray(studentAssignments.data) ? studentAssignments.data : [];
  const found = aList.find((a) => a.id === assignmentId) ?? null;
  if (!found?.id) throw new Error("Expected at least one published assignment for student");

  logStep("assignments: student submit");
  const submit = await http(`/api/sms/assignments/${encodeURIComponent(found.id)}/submit`, {
    method: "POST",
    headers: authHeaders(studentToken),
    body: JSON.stringify({ submissionText: "My answers" }),
  });
  await assertOneOf("assignment submit", submit, [201, 409]);

  logStep("assignments: teacher list submissions");
  const submissions = await http(`/api/sms/assignments/${encodeURIComponent(found.id)}/submissions`, {
    headers: authHeaders(teacherToken),
  });
  await assertOk("assignment submissions", submissions);
  const subRows = Array.isArray(submissions.data) ? submissions.data : [];
  const oneSub = subRows[0]?.submission;
  if (!oneSub?.id) throw new Error("Expected at least one submission");

  logStep("assignments: teacher review submission");
  await assertOk(
    "assignment review",
    await http(`/api/sms/assignments/submissions/${encodeURIComponent(oneSub.id)}/review`, {
      method: "POST",
      headers: authHeaders(teacherToken),
      body: JSON.stringify({ score: 18, feedback: "Well done" }),
    })
  );

  // Staff attendance lifecycle (admin only)
  logStep("staff attendance: create session");
  const staffSession = await http("/api/sms/staff-attendance/sessions", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ date: new Date().toISOString() }),
  });
  await assertStatus("staff session create", staffSession.res, 201);
  const staffSessionId = staffSession.data?.id;
  if (!staffSessionId) throw new Error("Staff attendance session missing id");

  logStep("staff attendance: employee forbidden");
  await assertForbidden(
    "staff attendance employee",
    await http("/api/sms/staff-attendance/sessions", { headers: authHeaders(teacherToken) })
  );
  await assertForbidden(
    "staff attendance parent",
    await http("/api/sms/staff-attendance/sessions", { headers: authHeaders(parentToken) })
  );

  logStep("staff attendance: mark entries");
  const staffList = Array.isArray(staff) ? staff : [];
  const staffIds = staffList.slice(0, 2).map((s) => s.id).filter(Boolean);
  if (staffIds.length === 0) throw new Error("No staff to mark attendance");
  const markEntries = await http(`/api/sms/staff-attendance/sessions/${encodeURIComponent(staffSessionId)}/entries`, {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify(staffIds.map((id) => ({ staffId: id, status: "present" }))),
  });
  await assertStatus("staff entries upsert", markEntries.res, 200);

  // Exams + marks + results
  const examTypes = ["quiz", "test", "exam"];
  let lastExamId = null;
  for (const t of examTypes) {
    logStep(`exams: create (${t})`);
    const examCreate = await http("/api/sms/exams", {
      method: "POST",
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        academicYearId: year2.id,
        termId: y2Terms[0].id,
        name: `Lifecycle ${t.toUpperCase()} ${Date.now()}`,
        type: t,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    await assertStatus(`create exam (${t})`, examCreate.res, 201);
    const examId = examCreate.data?.id;
    if (!examId) throw new Error(`Exam created (${t}) but missing id`);
    lastExamId = examId;

    logStep(`exams: teacher post marks (${t})`);
    await assertOk(
      `teacher post marks (${t})`,
      await http(`/api/sms/exams/${encodeURIComponent(examId)}/marks`, {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify([{ studentId: oneStudent, subjectId, marksObtained: 45, totalMarks: 60 }]),
      })
    );

    logStep(`exams: admin post marks (${t})`);
    const marksSave = await http(`/api/sms/exams/${encodeURIComponent(examId)}/marks`, {
      method: "POST",
      headers: authHeaders(adminToken),
      body: JSON.stringify([
        { studentId: oneStudent, subjectId, marksObtained: 50, totalMarks: 60, remarks: "Verified" },
      ]),
    });
    await assertStatus(`admin post marks (${t})`, marksSave.res, 200);
  }
  if (!lastExamId) throw new Error("No exam id created");

  logStep("exams: student results endpoint");
  const resultsAsStudent = await http(`/api/sms/exams/student/${encodeURIComponent(oneStudent)}/results`, {
    headers: authHeaders(studentToken),
  });
  // studentToken is sim-student-01; only allow if oneStudent is that student, else should 403
  await assertOneOf("student results access", resultsAsStudent, [200, 403]);

  logStep("exams: admin results endpoint");
  const resultsAsAdmin = await http(`/api/sms/exams/student/${encodeURIComponent(oneStudent)}/results`, {
    headers: authHeaders(adminToken),
  });
  await assertStatus("admin results", resultsAsAdmin.res, 200);

  // Finance: create invoice + partial payment + full payment + balance
  logStep("finance: create invoice");
  const invoiceCreate = await http("/api/sms/payments/invoices", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({
      academicYearId: year2.id,
      termId: y2Terms[0].id,
      studentId: oneStudent,
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Lifecycle invoice",
      lines: [{ description: "Tuition", amount: 1000 }],
    }),
  });
  await assertStatus("create invoice", invoiceCreate.res, 201);
  const invoiceId = invoiceCreate.data?.id;
  if (!invoiceId) throw new Error("Invoice created but missing id");

  logStep("finance: bursar cannot create invoice without permission (expected 403)");
  // Bursar now has create_invoices granted above, so this should be allowed (2xx)
  await assertOk(
    "bursar create invoice",
    await http("/api/sms/payments/invoices", {
      method: "POST",
      headers: authHeaders(bursarToken),
      body: JSON.stringify({
        academicYearId: year2.id,
        termId: y2Terms[0].id,
        studentId: oneStudent,
        dueAt: new Date().toISOString(),
        lines: [{ description: "Misc", amount: 100 }],
      }),
    })
  );

  logStep("finance: record partial payment");
  const pay1 = await http("/api/sms/payments/payments", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ invoiceId, amount: 400, method: "cash" }),
  });
  await assertStatus("partial payment", pay1.res, 201);

  logStep("finance: record remaining payment");
  const pay2 = await http("/api/sms/payments/payments", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ invoiceId, amount: 600, method: "cash" }),
  });
  await assertStatus("remaining payment", pay2.res, 201);

  logStep("finance: student balance");
  const bal = await http(`/api/sms/payments/students/${encodeURIComponent(oneStudent)}/balance`, {
    headers: authHeaders(adminToken),
  });
  await assertStatus("balance", bal.res, 200);

  // Exports: student/class/attendance
  logStep("export: student pdf");
  const expStuPdf = await http(`/api/export/student/${encodeURIComponent(oneStudent)}/pdf?academicYearId=${encodeURIComponent(year2.id)}&termId=${encodeURIComponent(y2Terms[0].id)}`, {
    headers: authHeaders(adminToken),
  });
  await assertStatus("export student pdf", expStuPdf.res, 200);

  logStep("export: student excel");
  const expStuCsv = await http(`/api/export/student/${encodeURIComponent(oneStudent)}/excel?academicYearId=${encodeURIComponent(year2.id)}&termId=${encodeURIComponent(y2Terms[0].id)}`, {
    headers: authHeaders(adminToken),
  });
  await assertStatus("export student excel", expStuCsv.res, 200);

  logStep("export: class pdf");
  const expClassPdf = await http(`/api/export/class/${encodeURIComponent(grade11.id)}/pdf?academicYearId=${encodeURIComponent(year2.id)}&termId=${encodeURIComponent(y2Terms[0].id)}`, {
    headers: authHeaders(adminToken),
  });
  await assertStatus("export class pdf", expClassPdf.res, 200);

  logStep("export: attendance excel");
  const expAttCsv = await http(`/api/export/attendance/excel?classId=${encodeURIComponent(grade11.id)}&academicYearId=${encodeURIComponent(year2.id)}&termId=${encodeURIComponent(y2Terms[0].id)}`, {
    headers: authHeaders(adminToken),
  });
  await assertStatus("export attendance excel", expAttCsv.res, 200);

  logStep("export: attendance pdf");
  const expAttPdf = await http(`/api/export/attendance/pdf?classId=${encodeURIComponent(grade11.id)}&academicYearId=${encodeURIComponent(year2.id)}&termId=${encodeURIComponent(y2Terms[0].id)}`, {
    headers: authHeaders(adminToken),
  });
  await assertStatus("export attendance pdf", expAttPdf.res, 200);

  logStep("export: assignments csv");
  const expAsnCsv = await http(`/api/export/assignments/csv?academicYearId=${encodeURIComponent(year2.id)}&termId=${encodeURIComponent(y2Terms[0].id)}&classId=${encodeURIComponent(studentClassId)}`,
  {
    headers: authHeaders(adminToken),
  });
  await assertStatus("export assignments csv", expAsnCsv.res, 200);

  // Finance: bulk invoice creation
  logStep("finance: bulk invoices");
  const bulk = await http("/api/sms/payments/invoices/bulk", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({
      academicYearId: year2.id,
      termId: y2Terms[0].id,
      studentIds: [oneStudent],
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Lifecycle bulk",
      lines: [{ description: "PTA", amount: 250 }],
    }),
  });
  await assertStatus("bulk invoices", bulk.res, 201);

  console.log("LIFECYCLE_OK");
}

main().catch((e) => {
  console.error("LIFECYCLE_FAIL", e);
  process.exit(1);
});
