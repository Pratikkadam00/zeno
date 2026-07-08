// Subscription names can originate from bank-statement CSVs or billing-email
// text a user never typed themselves. A merchant string like
// `=HYPERLINK("http://evil","x")` survives discovery parsing verbatim and,
// without this guard, would be evaluated as a live formula the moment a CSV
// export is opened in Excel/Sheets — classic CSV/formula injection. Prefixing
// with an apostrophe forces spreadsheet apps to render it as literal text.
export function csvSafeCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}
