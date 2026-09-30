import { config } from "dotenv";
import { hashPin } from "../lib/domain/pin";
import { isValidPin } from "../lib/domain/pin";
import { sheets } from "../lib/google/client";
import { ensureChecklistPhotoFolder, uploadChecklistPhoto } from "../lib/google/photo-upload";
import {
  BRANCH_HEADERS,
  BRANCH_SHEET_NAMES,
  REGISTRY_HEADERS,
  branchSheetRange,
  registrySheetRange,
} from "../lib/google/sheet-schema";
import { nextSequentialId } from "../lib/ids";
import { buildDummySeedPlan, defaultSeedRange, type DummySeedInput } from "./dummy-seed-data";

config({ path: ".env.local" });

const REGISTRY_ID = process.env.REGISTRY_SPREADSHEET_ID;
const PIN = process.env.MYSHIFT_SEED_PIN;
const PHOTO_NAME = "MYSHIFT-DUMMY-SEED.png";
const PHOTO_MIME = "image/png";
const PHOTO_PLACEHOLDER = "dry-run-photo-placeholder";
const PLACEHOLDER_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/ZykAAAAASUVORK5CYII=";

type RegistryBranch = {
  branchId: string;
  name: string;
  spreadsheetId: string;
  folderId: string;
  status: string;
  active: boolean;
};
type RegistryEmployee = {
  id: string;
  username: string;
  name: string;
  role: string;
  branchId: string;
  branches: string[];
  active: boolean;
};
type BranchSnapshot = {
  branch: RegistryBranch;
  employees: RegistryEmployee[];
  newEmployeeRows: string[][];
  input: DummySeedInput;
};

function localDateNow(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function localTimeNow(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

function parseArgs(args: string[]) {
  let apply = false;
  let asOf = localDateNow();
  for (const arg of args) {
    if (arg === "--") {
      continue;
    } else if (arg === "--apply") {
      apply = true;
    } else if (arg.startsWith("--as-of=")) {
      asOf = arg.slice("--as-of=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.log("Usage: pnpm seed:dummy [--as-of=YYYY-MM-DD] [--apply]");
      console.log("Default is preview-only; --apply appends data to active, ready branches.");
      process.exit(0);
    } else {
      throw new Error(`Argumen tidak dikenal: ${arg}`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || new Date(`${asOf}T00:00:00.000Z`).toISOString().slice(0, 10) !== asOf) {
    throw new Error("--as-of harus berupa tanggal valid YYYY-MM-DD");
  }
  return { apply, asOf };
}

async function readValues(spreadsheetId: string, range: string): Promise<string[][]> {
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return (response.data.values ?? []).map((row) => row.map(String));
}

async function readMultiple(spreadsheetId: string, ranges: string[]): Promise<Map<string, string[][]>> {
  const response = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges });
  return new Map(
    (response.data.valueRanges ?? []).map((valueRange, index) => {
      const range = valueRange.range?.split("!")[0]?.replace(/^'|'$/g, "") ?? ranges[index].split("!")[0];
      return [range, (valueRange.values ?? []).map((row) => row.map(String))];
    }),
  );
}

async function branchSchemaIssues(branch: RegistryBranch): Promise<string[]> {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: branch.spreadsheetId,
    fields: "sheets.properties.title",
  });
  const names = new Set((metadata.data.sheets ?? []).map((sheet) => sheet.properties?.title).filter(Boolean));
  const issues: string[] = [];
  const readable = BRANCH_SHEET_NAMES.filter((sheetName) => names.has(sheetName));
  const headers = await readMultiple(
    branch.spreadsheetId,
    readable.map((sheetName) => `${sheetName}!A1:${String.fromCharCode(64 + BRANCH_HEADERS[sheetName].length)}1`),
  );
  for (const sheetName of BRANCH_SHEET_NAMES) {
    const expected = [...BRANCH_HEADERS[sheetName]];
    if (!names.has(sheetName)) {
      issues.push(`${sheetName}: sheet belum ada`);
      continue;
    }
    const actual = headers.get(sheetName)?.[0] ?? [];
    if (expected.length !== actual.length || expected.some((header, index) => actual[index] !== header)) {
      issues.push(`${sheetName}: header aktual [${actual.join(", ")}], seharusnya [${expected.join(", ")}]`);
    }
  }
  return issues;
}

async function readCheckedRegistrySheet(
  sheetName: keyof typeof REGISTRY_HEADERS,
): Promise<string[][]> {
  if (!REGISTRY_ID) throw new Error("REGISTRY_SPREADSHEET_ID belum dikonfigurasi");
  const values = await readValues(REGISTRY_ID, registrySheetRange(sheetName));
  const expected = [...REGISTRY_HEADERS[sheetName]];
  if (!values[0] || expected.some((header, index) => values[0][index] !== header) || values[0].length !== expected.length) {
    throw new Error(`Header Registry ${sheetName} tidak sesuai skema`);
  }
  return values.slice(1);
}

function truthy(value: string | undefined): boolean {
  return value?.trim().toUpperCase() === "TRUE";
}

function categoryRows(rows: string[][]) {
  return rows.map((row) => ({ id: row[0] ?? "", label: row[1] ?? "", active: truthy(row[2]) }));
}

async function appendRows(spreadsheetId: string, range: string, rows: string[][]): Promise<void> {
  if (rows.length === 0) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

function employeeForBranch(employee: RegistryEmployee, branchId: string): boolean {
  return employee.active && employee.role === "karyawan" &&
    (employee.branchId === branchId || employee.branches.includes(branchId));
}

function dummyEmployees(
  branch: RegistryBranch,
  employees: RegistryEmployee[],
  allEmployeeIds: string[],
  allUsernames: Set<string>,
): { employees: RegistryEmployee[]; rows: string[][] } {
  const assigned = employees.filter((employee) => employeeForBranch(employee, branch.branchId));
  const rows: string[][] = [];
  let serial = 1;
  while (assigned.length < 3) {
    const username = `demo_${branch.branchId.toLowerCase()}_${String(serial).padStart(2, "0")}`;
    serial += 1;
    if (allUsernames.has(username)) continue;
    if (!isValidPin(PIN)) {
      throw new Error("MYSHIFT_SEED_PIN (4-8 digit) wajib diisi untuk membuat akun demo");
    }
    const id = nextSequentialId(allEmployeeIds, "EMP-");
    allEmployeeIds.push(id);
    const name = `Karyawan Demo ${String(assigned.length + 1).padStart(2, "0")} - ${branch.name}`;
    const employee: RegistryEmployee = {
      id,
      username,
      name,
      role: "karyawan",
      branchId: branch.branchId,
      branches: [branch.branchId],
      active: true,
    };
    rows.push([id, username, hashPin(PIN), name, "karyawan", branch.branchId, branch.branchId, "TRUE", "0", ""]);
    assigned.push(employee);
    allUsernames.add(username);
  }
  return { employees: assigned, rows };
}

async function loadBranchSnapshot(
  branch: RegistryBranch,
  employees: RegistryEmployee[],
  allEmployeeIds: string[],
  allUsernames: Set<string>,
  dates: { startDate: string; endDate: string },
  currentDate: string,
  currentTime: string,
  adminEmployeeId: string,
): Promise<BranchSnapshot> {
  const assigned = dummyEmployees(branch, employees, allEmployeeIds, allUsernames);
  const rawSheetData = await readMultiple(
    branch.spreadsheetId,
    BRANCH_SHEET_NAMES.map((sheetName) => branchSheetRange(sheetName)),
  );
  const sheetData = new Map<keyof typeof BRANCH_HEADERS, string[][]>();
  for (const sheetName of BRANCH_SHEET_NAMES) {
    const values = rawSheetData.get(sheetName) ?? [];
    const expected = [...BRANCH_HEADERS[sheetName]];
    if (!values[0] || expected.some((header, index) => values[0][index] !== header) || values[0].length !== expected.length) {
      throw new Error(`Header ${sheetName} pada ${branch.branchId} berubah setelah preflight; tidak ada data yang ditulis`);
    }
    sheetData.set(sheetName, values.slice(1));
  }

  const shifts = (sheetData.get("Shifts") ?? []).map((row) => ({
    shiftId: row[0] ?? "",
    name: row[1] ?? "",
    startTime: row[2] ?? "",
    endTime: row[3] ?? "",
  })).filter((shift) => shift.shiftId && /^\d{2}:\d{2}$/.test(shift.startTime));
  const checklistPoints = (sheetData.get("Checklist_Point") ?? []).map((row) => ({
    pointId: row[0] ?? "",
    description: row[2] ?? "",
    completionType: (row[3] ?? "centang") as DummySeedInput["checklistPoints"][number]["completionType"],
    unit: row[4] ?? "",
    min: row[5] ?? "",
    max: row[6] ?? "",
    options: (row[7] ?? "").split(",").map((value) => value.trim()).filter(Boolean),
    appliesAllShifts: truthy(row[8]),
    shiftIds: (row[9] ?? "").split(",").map((value) => value.trim()).filter(Boolean),
    active: truthy(row[11]),
  })).filter((point) => point.pointId && point.description);
  const handoverFields = (sheetData.get("Handover_Template") ?? []).map((row) => ({
    fieldId: row[0] ?? "",
    label: row[1] ?? "",
  })).filter((field) => field.fieldId && field.label);
  const existingSchedules = sheetData.get("Schedules") ?? [];
  const existingSwaps = sheetData.get("Shift_Swaps") ?? [];
  const existingIzin = sheetData.get("Izin") ?? [];
  const existingIncidents = sheetData.get("Incidents") ?? [];
  const input: DummySeedInput = {
    branchId: branch.branchId,
    ...dates,
    currentDate,
    currentTime,
    employees: assigned.employees.map((employee) => ({ employeeId: employee.id, name: employee.name })),
    shifts,
    checklistPoints,
    handoverFields,
    izinCategories: categoryRows(sheetData.get("Kategori_Izin") ?? []),
    incidentCategories: categoryRows(sheetData.get("Kategori_Incident") ?? []),
    adminEmployeeId,
    photoUrl: PHOTO_PLACEHOLDER,
    existingSchedules,
    existingChecklistLogs: sheetData.get("Checklist_Log") ?? [],
    existingHandoverLogs: sheetData.get("Handover_Log") ?? [],
    existingSwaps,
    existingIzin,
    existingIncidents,
  };
  return { branch, employees: assigned.employees, newEmployeeRows: assigned.rows, input };
}

async function getPhotoUrl(branch: RegistryBranch): Promise<string> {
  if (!branch.folderId) throw new Error(`Folder Drive cabang ${branch.branchId} belum tersedia`);
  const folderId = await ensureChecklistPhotoFolder(branch.folderId);
  const { photoUrl } = await uploadChecklistPhoto({
    folderId,
    name: PHOTO_NAME,
    mimeType: PHOTO_MIME,
    buffer: Buffer.from(PLACEHOLDER_PNG, "base64"),
  });
  return photoUrl;
}

async function main() {
  const { apply, asOf } = parseArgs(process.argv.slice(2));
  const range = defaultSeedRange(asOf);
  const [branchRows, employeeRows] = await Promise.all([
    readCheckedRegistrySheet("Daftar_Cabang"),
    readCheckedRegistrySheet("Employees"),
  ]);
  const branches: RegistryBranch[] = branchRows.map((row) => ({
    branchId: row[0] ?? "",
    name: row[1] ?? "",
    spreadsheetId: row[2] ?? "",
    folderId: row[3] ?? "",
    status: row[4] ?? "pending",
    active: truthy(row[5]),
  }));
  const readyBranches = branches.filter((branch) => branch.active && branch.status === "ready" && branch.spreadsheetId);
  if (readyBranches.length === 0) throw new Error("Tidak ada cabang aktif berstatus ready; seed tidak menulis data");
  const schemaProblems: string[] = [];
  for (const branch of readyBranches) {
    const issues = await branchSchemaIssues(branch);
    if (issues.length > 0) {
      schemaProblems.push(`${branch.branchId} (${branch.name}):\n  - ${issues.join("\n  - ")}`);
    }
  }
  if (schemaProblems.length > 0) {
    throw new Error(
      `Skema spreadsheet cabang belum sesuai; seed dihentikan tanpa menulis data.\n${schemaProblems.join("\n")}`,
    );
  }

  const employees: RegistryEmployee[] = employeeRows.map((row) => ({
    id: row[0] ?? "",
    username: (row[1] ?? "").toLowerCase(),
    name: row[3] ?? "",
    role: row[4] ?? "",
    branchId: row[5] ?? "",
    branches: (row[6] ?? "").split(",").map((value) => value.trim()).filter(Boolean),
    active: truthy(row[7]),
  }));
  const allEmployeeIds = employees.map((employee) => employee.id);
  const allUsernames = new Set(employees.map((employee) => employee.username));
  const adminEmployeeId = employees.find((employee) => employee.role === "admin" && employee.active)?.id ?? "";
  const today = localDateNow();
  const nowTime = asOf === today ? localTimeNow() : "23:59";
  const snapshots: BranchSnapshot[] = [];

  for (const branch of readyBranches) {
    snapshots.push(
      await loadBranchSnapshot(
        branch,
        employees,
        allEmployeeIds,
        allUsernames,
        range,
        asOf,
        nowTime,
        adminEmployeeId,
      ),
    );
  }

  const plans = snapshots.map((snapshot) => ({
    snapshot,
    plan: buildDummySeedPlan(snapshot.input),
  }));
  const counts = plans.reduce(
    (total, { snapshot, plan }) => ({
      employees: total.employees + snapshot.newEmployeeRows.length,
      schedules: total.schedules + plan.schedules.length,
      checklistLogs: total.checklistLogs + plan.checklistLogs.length,
      handoverLogs: total.handoverLogs + plan.handoverLogs.length,
      swaps: total.swaps + plan.swaps.length,
      izin: total.izin + plan.izin.length,
      incidents: total.incidents + plan.incidents.length,
    }),
    { employees: 0, schedules: 0, checklistLogs: 0, handoverLogs: 0, swaps: 0, izin: 0, incidents: 0 },
  );

  console.log(`${apply ? "APPLY" : "PREVIEW"} dummy data MYSHIFT`);
  console.log(`Periode: ${range.startDate} s.d. ${range.endDate} (${90} hari)`);
  console.log(`Cabang aktif & ready: ${snapshots.length}`);
  for (const { snapshot, plan } of plans) {
    console.log(
      `  ${snapshot.branch.branchId}: ${snapshot.branch.name} — ` +
      `akun baru ${snapshot.newEmployeeRows.length}, jadwal ${plan.schedules.length}, ` +
      `checklist ${plan.checklistLogs.length}, handover ${plan.handoverLogs.length}, ` +
      `swap ${plan.swaps.length}, izin ${plan.izin.length}, incident ${plan.incidents.length}`,
    );
  }
  console.log("Total:", JSON.stringify(counts));
  if (!apply) {
    console.log("Preview only; tidak ada data yang ditulis. Jalankan dengan --apply untuk menyimpan.");
    return;
  }

  const newEmployeeRows = snapshots.flatMap((snapshot) => snapshot.newEmployeeRows);
  if (newEmployeeRows.length > 0) {
    if (!REGISTRY_ID) throw new Error("REGISTRY_SPREADSHEET_ID belum dikonfigurasi");
    await appendRows(REGISTRY_ID, registrySheetRange("Employees"), newEmployeeRows);
  }

  for (const { snapshot } of plans) {
    const seedPlan = buildDummySeedPlan(snapshot.input);
    const needsPhoto = seedPlan.checklistLogs.some((row) => row[4] === PHOTO_PLACEHOLDER);
    const photoUrl = needsPhoto ? await getPhotoUrl(snapshot.branch) : "";
    const plan = buildDummySeedPlan({ ...snapshot.input, photoUrl });
    await appendRows(snapshot.branch.spreadsheetId, branchSheetRange("Schedules"), plan.schedules);
    await appendRows(snapshot.branch.spreadsheetId, branchSheetRange("Checklist_Log"), plan.checklistLogs);
    await appendRows(snapshot.branch.spreadsheetId, branchSheetRange("Handover_Log"), plan.handoverLogs);
    await appendRows(snapshot.branch.spreadsheetId, branchSheetRange("Shift_Swaps"), plan.swaps);
    await appendRows(snapshot.branch.spreadsheetId, branchSheetRange("Izin"), plan.izin);
    await appendRows(snapshot.branch.spreadsheetId, branchSheetRange("Incidents"), plan.incidents);
  }
  console.log("Seed tersimpan. Baris yang sudah ada tidak diubah atau dihapus.");
  console.log(`PIN akun demo baru sama dengan MYSHIFT_SEED_PIN; PIN tidak ditampilkan.`);
}

main().catch((error) => {
  console.error("Seed dummy gagal:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
