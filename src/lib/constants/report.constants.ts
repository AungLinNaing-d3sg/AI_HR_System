/**
 * Report-domain constants shared between Route Handlers, the client API
 * module, and the filter/export UI. Mirrors the `format` query parameter
 * documented on every `/Report/Export*` endpoint in
 * docs/HR_System_BE.postman_collection.json - only `xlsx`/`csv` are
 * supported server-side (there is no `pdf` option, unlike the wireframe's
 * hardcoded-JSON prototype - see `docs/HR_System_FE_wireframe.pdf`'s own
 * "Data is hardcoded JSON file" caveat).
 */
export const REPORT_EXPORT_FORMATS = ['xlsx', 'csv'] as const;
export type ReportExportFormat = (typeof REPORT_EXPORT_FORMATS)[number];

export const REPORT_EXPORT_FORMAT_LABELS: Record<ReportExportFormat, string> = {
  xlsx: 'Export Excel',
  csv: 'Export CSV',
};

/**
 * `GenerateTimesheetReport` is paginated (`Page`/`PageSize`). The
 * `/reports/timesheet` table now drives real server-side pagination
 * (`pageNo`/`pageSize` - see `TimesheetReportTable`/`usePagination`); this
 * large default is only used as the fallback when a caller omits
 * `pageNo`/`pageSize` entirely (see `resolvePagination`).
 */
export const REPORT_PAGE_SIZE = 500;
