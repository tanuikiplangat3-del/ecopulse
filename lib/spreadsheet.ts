// Reading publisher bulk-upload spreadsheets.
//
// Replaces the `xlsx` (SheetJS) package, whose npm release is unmaintained and
// carries two known vulnerabilities when reading untrusted files
// (CVE-2023-30533 prototype pollution, and a ReDoS). Every row becomes a plain
// object keyed by the header row, exactly as before, so the upload logic in
// app/actions/listings.ts did not have to change.
//
//   .xlsx  -> read-excel-file
//   .csv   -> papaparse
//   .xls   -> refused: the old binary Excel format. Save as .xlsx or .csv.

import { readSheet } from "read-excel-file/node";
import Papa from "papaparse";

export const MAX_SPREADSHEET_BYTES = 5 * 1024 * 1024;

export class SpreadsheetError extends Error {}

/** Header names that could reach Object.prototype are dropped, never used as keys. */
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function toRows(header: unknown[], body: unknown[][]): Record<string, any>[] {
  const keys = header.map((h) => String(h ?? "").trim());
  return body
    .filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
    .map((r) => {
      const o: Record<string, any> = Object.create(null);
      keys.forEach((k, i) => {
        if (!k || UNSAFE_KEYS.has(k.toLowerCase())) return;
        const v = r[i];
        o[k] = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : v;
      });
      return o;
    });
}

export async function readSpreadsheet(file: File): Promise<Record<string, any>[]> {
  if (file.size > MAX_SPREADSHEET_BYTES) throw new SpreadsheetError("That file is larger than 5MB.");
  const name = (file.name || "").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  const isZip = buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b; // "PK": .xlsx is a zip

  if (name.endsWith(".xls") && !isZip) {
    throw new SpreadsheetError("Old .xls files are not supported. Save the sheet as .xlsx or .csv and upload that.");
  }

  if (isZip) {
    const data = (await readSheet(buf)) as unknown[][];
    if (!data.length) return [];
    return toRows(data[0], data.slice(1));
  }

  const text = buf.toString("utf8").replace(/^﻿/, "");
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const data = parsed.data as unknown[][];
  if (!data.length) return [];
  return toRows(data[0], data.slice(1));
}
