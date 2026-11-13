import ExcelJS from "exceljs";

const MAX_PREVIEW_ROWS = 25;
const MAX_COLUMNS = 40;

export type SpreadsheetSummary = {
  fileName: string;
  sheetName: string;
  rowCount: number;
  columns: string[];
  preview: Record<string, string | number | boolean | null>[];
  numericAggregates: Record<
    string,
    { count: number; min: number; max: number; average: number }
  >;
};

function cellToPrimitive(value: unknown): string | number | boolean | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const rich = value as { text?: string; result?: unknown; formula?: string };
    if (typeof rich.text === "string") return rich.text;
    if (rich.result != null) return cellToPrimitive(rich.result);
  }
  return String(value);
}

function summarizeRows(
  fileName: string,
  sheetName: string,
  rows: Record<string, string | number | boolean | null>[],
): SpreadsheetSummary {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, MAX_COLUMNS);
  const numericAggregates: SpreadsheetSummary["numericAggregates"] = {};

  for (const column of columns) {
    const values = rows
      .map((row) => row[column])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (!values.length) continue;
    numericAggregates[column] = {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
    };
  }

  return {
    fileName,
    sheetName,
    rowCount: rows.length,
    columns,
    preview: rows.slice(0, MAX_PREVIEW_ROWS).map((row) =>
      Object.fromEntries(columns.map((column) => [column, row[column] ?? null])),
    ),
    numericAggregates,
  };
}

function parseCsv(buffer: Buffer): Record<string, string | number | boolean | null>[] {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [];

  const headers = splitCsvLine(lines[0]).map((header, index) => header || `column_${index + 1}`);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => {
        const raw = cells[index] ?? "";
        const asNumber = Number(raw);
        const value =
          raw !== "" && Number.isFinite(asNumber) && /^-?\d+(\.\d+)?$/.test(raw.trim())
            ? asNumber
            : raw;
        return [header, value];
      }),
    );
  });
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

async function parseWorkbook(buffer: Buffer): Promise<{
  sheetName: string;
  rows: Record<string, string | number | boolean | null>[];
}> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS supports Buffer in Node; cast keeps typings happy across versions.
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("The spreadsheet has no worksheets.");

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = String(cellToPrimitive(cell.value) ?? "").trim() || `column_${colNumber}`;
    headers[colNumber - 1] = header;
  });
  if (!headers.length) throw new Error("The spreadsheet has no header row.");

  const rows: Record<string, string | number | boolean | null>[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, string | number | boolean | null> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = cellToPrimitive(row.getCell(index + 1).value);
    });
    if (Object.values(record).some((value) => value !== null && value !== "")) {
      rows.push(record);
    }
  });

  return { sheetName: worksheet.name || "Sheet1", rows };
}

export async function parseSpreadsheet(
  buffer: Buffer,
  fileName: string,
): Promise<SpreadsheetSummary> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) {
    return summarizeRows(fileName, "csv", parseCsv(buffer));
  }
  if (lower.endsWith(".xlsx")) {
    const { sheetName, rows } = await parseWorkbook(buffer);
    return summarizeRows(fileName, sheetName, rows);
  }
  throw new Error("Unsupported file type. Upload a CSV or Excel file (.csv, .xlsx).");
}
