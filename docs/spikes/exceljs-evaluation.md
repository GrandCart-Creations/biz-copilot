# ExcelJS Evaluation Spike

Date: 2025-11-09  
Owner: GrandCart / Biz-CoPilot Team

## Goal
Assess whether [`exceljs`](https://www.npmjs.com/package/exceljs) can replace the existing `xlsx` (SheetJS) importer in the Expense Tracker so we can retire the library affected by open security advisories.

## Work Completed

- Installed `exceljs` and created `src/utils/importers/exceljsExpenseParser.js`.
- Implemented a proof-of-concept parser that mirrors the current `handleExcelImport` mapping.
- Added heuristics for:
  - Header detection (via keyword search).
  - Vendor address parsing.
  - Document type inference (invoice / receipt / statement).
- Output matches existing importer structure so the UI can drop-in swap once validated.

## Early Findings

- Bundle impact: base install adds ~300 KB (uncompressed). Tree-shaking in Vite reduces size, but we should measure accurately before switching.
- Browser support: ExcelJS relies on Buffer polyfills. Vite injects them automatically, but we need to confirm across browsers.
- Parsing speed: For medium files (~5k rows) runtime is acceptable (<250 ms locally). Need additional profiling on lower-end devices.

## Next Steps

1. Integrate the new parser behind a feature flag in `ExpenseTracker.jsx` and log comparison results during QA.
2. Build automated tests comparing output of SheetJS vs ExcelJS for sample fixtures.
3. Measure bundle size / load time impact in production build.
4. Once parity is confirmed, remove `xlsx` dependency and update documentation.

## Risks / Considerations

- Some advanced XLSX features (macros, custom number formats) behave differently; may require follow-up adjustments.
- ExcelJS is maintained but receives slower updates than SheetJS; keep an eye on issue tracker.

## References

- [ExcelJS](https://github.com/exceljs/exceljs)
- [SheetJS security advisories](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) / (https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)

