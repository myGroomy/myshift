import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, toCsv } from "@/lib/domain/csv";

test("csvCell quotes separators, quotes and newlines", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(undefined), "");
  assert.equal(csvCell(12), "12");
});

test("csvCell neutralizes spreadsheet formulas", () => {
  assert.equal(csvCell("=SUM(A1:A9)"), "'=SUM(A1:A9)");
  assert.equal(csvCell("-5"), "'-5");
  assert.equal(csvCell("+1"), "'+1");
  assert.equal(csvCell("@cmd"), "'@cmd");
  // Quoting still applies after neutralization.
  assert.equal(csvCell("=1,2"), '"\'=1,2"');
});

test("toCsv writes a header row and CRLF separated lines", () => {
  const csv = toCsv(["Tipe", "Detail"], [["Swap", "a,b"]]);
  assert.equal(csv, 'Tipe,Detail\r\nSwap,"a,b"');
});
