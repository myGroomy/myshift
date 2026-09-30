import test from "node:test";
import assert from "node:assert/strict";
import {
  migrateLegacyChecklistLogs,
  migrateLegacyChecklistRows,
  nextSopCategoryId,
} from "@/lib/domain/checklist-migration";

test("legacy checklist items map to new types and matching shifts", () => {
  const rows = migrateLegacyChecklistRows({
    categoryId: "SOP-001",
    shifts: [
      { shiftId: "SFT-001", name: "Opening" },
      { shiftId: "SFT-003", name: "Closing" },
    ],
    items: [
      { itemId: "CHK-001", type: "opening", description: "Buka outlet", requiresPhoto: false, order: 1, active: true },
      { itemId: "CHK-002", type: "closing", description: "Kunci pintu", requiresPhoto: true, order: 2, active: false },
      { itemId: "CHK-003", type: "custom", description: "Periksa", requiresPhoto: false, order: 3, active: true },
    ],
  });
  assert.deepEqual(rows[0], ["CHK-001", "SOP-001", "Buka outlet", "centang", "", "", "", "", "FALSE", "SFT-001", "1", "TRUE"]);
  assert.deepEqual(rows[1], ["CHK-002", "SOP-001", "Kunci pintu", "centang_foto", "", "", "", "", "FALSE", "SFT-003", "2", "FALSE"]);
  assert.equal(rows[2][8], "TRUE");
});

test("legacy logs are converted and deduplicated to their latest record", () => {
  const rows = migrateLegacyChecklistLogs({
    logs: [
      { logId: "CLG-001", scheduleId: "SCH-1", itemId: "CHK-1", checkedBy: "EMP-1", checkedAt: "old", photoUrl: "" },
      { logId: "CLG-002", scheduleId: "SCH-1", itemId: "CHK-1", checkedBy: "EMP-2", checkedAt: "new", photoUrl: "https://example.com/photo" },
    ],
  });
  assert.deepEqual(rows, [["CLG-002", "SCH-1", "CHK-1", "TRUE", "https://example.com/photo", "EMP-2", "new"]]);
});

test("next SOP category ID preserves sequential format", () => {
  assert.equal(nextSopCategoryId(["SOP-001", "SOP-009"]), "SOP-010");
});
