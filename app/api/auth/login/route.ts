import { ok, fail } from "@/lib/api-response";
import { getEmployees, getBranches } from "@/lib/google/registry";
import { verifyPin } from "@/lib/auth";
import { createSessionToken, sessionCookieHeader } from "@/lib/session";

export async function POST(request: Request) {
  const { username, pin } = (await request.json()) as { username: string; pin: string };

  const employees = await getEmployees();
  const employee = employees.find(
    (e) => e.username === username.toLowerCase().trim() && e.aktif
  );

  if (!employee) {
    return fail("INVALID_CREDENTIALS", "Username atau PIN salah", 401);
  }

  const pinValid = verifyPin(pin, employee.pinHash);
  if (!pinValid) {
    return fail("INVALID_CREDENTIALS", "Username atau PIN salah", 401);
  }

  const branchesDb = await getBranches();
  const activeBranches = branchesDb.filter((b) => b.aktif).map((b) => ({
    branchId: b.branchId,
    nama: b.nama,
  }));

  const empBranches: { branchId: string; nama: string }[] = [];

  if (employee.cabangAktif) {
    const match = activeBranches.find((b) => b.branchId === employee.cabangAktif);
    if (match) empBranches.push(match);
  }
  if (employee.cabangTerafiliasi) {
    employee.cabangTerafiliasi.forEach((t) => {
      const match = activeBranches.find((b) => b.branchId === t);
      if (match && !empBranches.some((e) => e.branchId === match.branchId)) {
        empBranches.push(match);
      }
    });
  }

  const activeBranchId = empBranches[0]?.branchId ?? "";
  const token = await createSessionToken({
    employeeId: employee.employeeId,
    nama: employee.nama,
    role: employee.role,
    branches: empBranches,
    activeBranchId,
  });

  return ok({
    employeeId: employee.employeeId,
    nama: employee.nama,
    role: employee.role,
    branches: empBranches,
  }, { headers: sessionCookieHeader(token) });
}
