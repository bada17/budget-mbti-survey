// 앱스 스크립트의 시트를 흉내 낸 가짜 — 범위에 쓴 칸만 바뀐다(진짜 시트처럼, 옆 칸은 그대로).
export function fakeBook() {
  const sheets = new Map();
  const sheetOf = () => {
    const rows = [];
    return {
      rows,
      getLastRow: () => rows.length,
      appendRow: row => rows.push([...row]),
      getRange: (row, column, numRows = 1, numColumns = 1) => ({
        getValues: () => rows.slice(row - 1, row - 1 + numRows).map(r => Array.from({ length: numColumns }, (_, j) => r[column - 1 + j] ?? '')),
        setValues: values => values.forEach((v, i) => {
          const r = rows[row - 1 + i] ?? (rows[row - 1 + i] = []);
          v.forEach((cell, j) => { r[column - 1 + j] = cell; });
        }),
      }),
    };
  };
  return {
    sheets,
    getSheetByName: name => sheets.get(name) ?? null,
    insertSheet: name => { const s = sheetOf(); sheets.set(name, s); return s; },
  };
}
