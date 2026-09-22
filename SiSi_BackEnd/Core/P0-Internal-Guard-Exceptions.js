/*
 * These functions are not UI/API entry points. They are called only by an
 * already-authenticated boundary or by a trusted scheduled worker. Keep this
 * list short and review every addition. Public routes must never be added here.
 */
var AUDIT_INTERNAL_EXCEPTIONS = [
  "migrasiPasswordHash_",
  "recalcWaHartek_",
  "recalcWaRow_",
  "enqueueFotoRow_",
  "enqueueP0Yandal_",
  "enqueueApprovalP0_",
  "petaUlpHeader_",
  "ulpDariKodeHeader_",
  "getListTemuanMobile_",
  "auditPasswordSiSi_",
  "auditPredeployMobile_",
  "recalcWaInsJar_"
];
