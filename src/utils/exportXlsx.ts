import * as XLSX from 'xlsx';

export interface SheetDef {
  name: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

/** Exporta um ou mais sheets para um arquivo .xlsx */
export function exportXlsx(filename: string, sheets: SheetDef[]) {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const data = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-largura das colunas
    const colWidths = sheet.headers.map((h, ci) => {
      const maxLen = Math.max(h.length, ...sheet.rows.map((r) => String(r[ci] ?? '').length));
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/** Formata número BR para a célula (sem símbolo para manter como número no Excel) */
export function xlsxNum(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Formata data ISO para DD/MM/AAAA */
export function xlsxData(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
