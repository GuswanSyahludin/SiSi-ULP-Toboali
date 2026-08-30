/* Synthetic fixtures. No production data is ever copied into the test database.
   Column order follows COL_USERS in Core/Code.js:
   A=No B=Email C=Username D=Password E=Role F=ULP G=Kode ULP H=Bidang I=Tim J=Sub-Tim K=Akses Menu */

export const USERS_HEADER = [
  "No", "Email", "Username", "Password", "Role", "ULP",
  "Kode ULP", "Bidang", "Tim", "Sub-Tim", "Akses Menu",
];

/* Plaintext on purpose: these rows are the "before" state used to prove that
   migrasiPasswordHash_() upgrades them and that login still works afterwards. */
export const USERS_ROWS = [
  [1, "super.toboali@test.invalid", "superuser", "RahasiaSuper123", "Super User", "ULP Toboali", "ULP-TBL", "Teknik", "Manajemen", "Manajemen", "ALL"],
  [2, "admin.toboali@test.invalid", "adminulp", "RahasiaAdmin123", "Admin", "ULP Toboali", "ULP-TBL", "Teknik", "Manajemen", "Manajemen", "ALL"],
  [3, "row.toboali@test.invalid", "petugasrow", "RahasiaRow123", "Operator", "ULP Toboali", "ULP-TBL", "Teknik", "ROW", "ROW", "Tek-ROW"],
  [4, "insdu.toboali@test.invalid", "petugasinsdu", "RahasiaInsdu123", "Operator", "ULP Toboali", "ULP-TBL", "Teknik", "Inspeksi", "inspeksi gardu", "Tek-InsDu"],
  [5, "insjar.toboali@test.invalid", "petugasinsjar", "RahasiaInsjar123", "Operator", "ULP Toboali", "ULP-TBL", "Teknik", "Inspeksi", "inspeksi jaringan", "Tek-InsJar"],
  [6, "yandal.toboali@test.invalid", "petugasyandal", "RahasiaYandal123", "Operator", "ULP Toboali", "ULP-TBL", "Teknik", "Yandal", "Yandal", "Tek-Yandal"],
  [7, "other.ulp@test.invalid", "petugasulp lain", "RahasiaLain123", "Operator", "ULP Lain", "ULP-LAIN", "Teknik", "ROW", "ROW", "Tek-ROW"],
  [8, "nokodeulp@test.invalid", "tanpakodeulp", "RahasiaKosong123", "Operator", "ULP Toboali", "", "Teknik", "ROW", "ROW", "Tek-ROW"],
];

/* Minimal stand-ins for sheets the guarded code paths touch, so a guard test can
   prove ULP scoping actually filters instead of silently returning everything. */
export const SHEETS = [
  {
    name: "db_Global_Header",
    header: ["Kode Header", "Tanggal", "Tim", "Sub-Tim", "ULP", "Penyulang"],
    rows: [
      ["HDR-001", "2026-08-01", "ROW", "ROW", "ULP Toboali", "PYL-01"],
      ["HDR-002", "2026-08-02", "Inspeksi", "inspeksi gardu", "ULP Toboali", "PYL-02"],
      ["HDR-003", "2026-08-03", "ROW", "ROW", "ULP Lain", "PYL-09"],
    ],
  },
  {
    name: "db_INS_Temuan",
    header: ["Kode Temuan", "Kode Header", "Penyulang", "Deskripsi", "ULP"],
    rows: [
      ["TMN-001", "HDR-001", "PYL-01", "pohon dekat jaringan", "ULP Toboali"],
      ["TMN-002", "HDR-003", "PYL-09", "temuan milik ULP lain", "ULP Lain"],
    ],
  },
  {
    name: "db_Yandal_P0",
    header: ["Kode P0", "Tanggal", "Status Approval", "Approved By", "ULP"],
    rows: [
      ["P0-001", "2026-08-01", "Menunggu", "", "ULP Toboali"],
      ["P0-002", "2026-08-02", "Menunggu", "", "ULP Toboali"],
    ],
  },
];

export function seedAll(ctx, { spreadsheetId }) {
  const { harness } = ctx;
  harness.seedSheet(spreadsheetId, "db_Users", USERS_HEADER, USERS_ROWS);
  for (const s of SHEETS) harness.seedSheet(spreadsheetId, s.name, s.header, s.rows);
  return {
    spreadsheetId,
    sheets: ["db_Users", ...SHEETS.map((s) => s.name)],
    users: USERS_ROWS.length,
  };
}
