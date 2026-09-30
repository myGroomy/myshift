export type Branch = {
  branchId: string;
  nama: string;
  aktif: boolean;
  spreadsheetId: string;
  folderId?: string;
  // GET /api/branches also reports provisioning state, derived from `Provision_Status`
  // (API-CONTRACT §3). Optional so callers that only need the ID/name keep compiling.
  spreadsheetConfigured?: boolean;
  folderConfigured?: boolean;
  provisionStatus?: "pending" | "ready" | "failed";
};

export type Employee = { employeeId: string; username: string; nama: string; role: string; cabangAktif: string; aktif: boolean };
export type Shift = { shiftId: string; branchId: string; name: string; startTime: string; endTime: string };
export type Schedule = { scheduleId: string; employeeId: string; shiftId: string; date: string; status: string; conflictWarning?: boolean; startedAt?: string; shiftName?: string; startTime?: string; endTime?: string };
export type Swap = { swapId: string; scheduleId: string; requestedBy: string; requestedWith: string; reason: string; status: string; approvedBy: string; rejectReason: string };
export type Izin = { izinId: string; employeeId: string; scheduleId: string; categoryId: string; note: string; status: string; approvedBy: string; rejectReason: string };
export type Category = { id: string; label: string; aktif: boolean };
export type IncidentCategory = { id: string; label: string; aktif: boolean };
export type Incident = {
  incidentId: string;
  categoryId: string;
  deskripsi: string;
  severity: "low" | "medium" | "high";
  fotoUrl: string;
  status: "open" | "resolved";
  resolvedBy: string;
  resolvedAt: string;
  createdBy: string;
  createdAt: string;
};
