// Download tables as a real .xlsx file (SheetJS, loaded on demand).
type Cell = string | number | null | undefined;
export interface Sheet { name: string; rows: Cell[][]; widths?: number[] }

let lib: Promise<any> | null = null;
// bundled with the site (loaded only when someone clicks the Excel button)
const load = () => (lib ??= import('xlsx').then((m: any) => m.default ?? m));

export async function downloadXlsx(filename: string, sheets: Sheet[]) {
  const XLSX = await load();
  const wb = XLSX.utils.book_new();
  for (const sh of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sh.rows.map((r) => r.map((c) => (c == null ? '' : c))));
    const cols = sh.rows.reduce((n, r) => Math.max(n, r.length), 0);
    ws['!cols'] = Array.from({ length: cols }, (_, i) => ({ wch: sh.widths?.[i] ?? Math.min(60, Math.max(10, ...sh.rows.map((r) => String(r[i] ?? '').length + 2))) }));
    XLSX.utils.book_append_sheet(wb, ws, sh.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename.replace(/[\\/:*?"<>|]+/g, '-'));
}
