import * as XLSX from "xlsx";

export type ExportPayload = {
  kpiDaily: Record<string, unknown>[];
  bookingsSummary: Record<string, unknown>[];
  campaignsSummary: Record<string, unknown>[];
  reviewsSnapshot: Record<string, unknown>[];
};

export function exportWiseryWorkbook(params: {
  orgName: string;
  branchName: string;
  periodLabel: "month" | "quarter" | "halfyear";
  payload: ExportPayload;
}) {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(params.payload.kpiDaily), "KPI Daily");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(params.payload.bookingsSummary), "Bookings");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(params.payload.campaignsSummary), "Campaigns");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(params.payload.reviewsSnapshot), "Reviews");

  const date = new Date().toISOString().slice(0, 10);
  const org = slugify(params.orgName);
  const branch = slugify(params.branchName);
  const fileName = `wisery_export_${org}_${branch}_${params.periodLabel}_${date}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}
