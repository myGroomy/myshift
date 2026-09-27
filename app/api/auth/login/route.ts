import { fail, handleRouteError, ok } from "@/lib/api-response";
import { verifyPin } from "@/lib/domain/pin";
import { requiredText, validPin } from "@/lib/domain/master-validation";
import {
  isLockActive,
  lockMessage,
  loginFailureDelay,
  registerLoginFailure,
  resetLoginFailure,
  type LockState,
} from "@/lib/domain/login-lockout";
import { getBranches, getEmployeeRows } from "@/lib/google/registry";
import { replaceRow } from "@/lib/google/sheets-data";
import { EMPLOYEE_ROW_WIDTH, REGISTRY_SHEETS, padRow } from "@/lib/google/sheet-schema";
import { createSessionToken, sessionCookieHeader } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = requiredText(body.username, "username").toLowerCase();
    const pin = validPin(body.pin);

    const rows = await getEmployeeRows();
    const row = rows.find((entry) => entry.employee.username === username);

    // Unknown username: same message plus the same delay, so accounts cannot be enumerated.
    if (!row) {
      await loginFailureDelay();
      return fail("INVALID_CREDENTIALS", "Username atau PIN salah");
    }

    const lock: LockState = { attempts: row.attempts, lockedUntil: row.lockedUntil };
    if (isLockActive(lock.lockedUntil)) {
      return fail("ACCOUNT_LOCKED", lockMessage(lock.lockedUntil), { data: { lockedUntil: lock.lockedUntil } });
    }

    const employee = row.employee;
    const credentialsValid = employee.aktif && verifyPin(pin, employee.pinHash);

    if (!credentialsValid) {
      const next = registerLoginFailure(lock);
      await writeLockState(row.rowNumber, row.values, next);
      await loginFailureDelay();
      if (isLockActive(next.lockedUntil)) {
        return fail("ACCOUNT_LOCKED", lockMessage(next.lockedUntil), { data: { lockedUntil: next.lockedUntil } });
      }
      return fail("INVALID_CREDENTIALS", "Username atau PIN salah");
    }

    if (lock.attempts > 0 || lock.lockedUntil) {
      await writeLockState(row.rowNumber, row.values, resetLoginFailure());
    }

    const activeBranches = (await getBranches()).filter((branch) => branch.aktif);
    const empBranches: { branchId: string; nama: string }[] = [];
    const pushBranch = (branchId: string) => {
      const match = activeBranches.find((branch) => branch.branchId === branchId);
      if (match && !empBranches.some((entry) => entry.branchId === match.branchId)) {
        empBranches.push({ branchId: match.branchId, nama: match.nama });
      }
    };

    if (employee.cabangAktif) pushBranch(employee.cabangAktif);
    employee.cabangTerafiliasi.forEach(pushBranch);

    const token = await createSessionToken({
      employeeId: employee.employeeId,
      nama: employee.nama,
      role: employee.role,
      branches: empBranches,
      activeBranchId: empBranches[0]?.branchId ?? "",
    });

    return ok(
      {
        employeeId: employee.employeeId,
        nama: employee.nama,
        role: employee.role,
        branches: empBranches,
      },
      { headers: sessionCookieHeader(token) }
    );
  } catch (error) {
    return handleRouteError(error, "Login gagal");
  }
}

async function writeLockState(rowNumber: number, values: string[], state: LockState) {
  const next = padRow(values, EMPLOYEE_ROW_WIDTH);
  next[8] = String(state.attempts);
  next[9] = state.lockedUntil;
  await replaceRow(process.env.REGISTRY_SPREADSHEET_ID!, REGISTRY_SHEETS.employees, rowNumber, next);
}
