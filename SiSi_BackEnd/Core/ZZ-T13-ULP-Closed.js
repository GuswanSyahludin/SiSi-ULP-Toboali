/* T-13 / M-01: fail closed for legacy rows without ULP ownership.
 *
 * This is deliberately a final-load overlay. Existing legacy rows with an
 * empty ULP must not be visible to ordinary ULP-scoped users until operations
 * assigns and verifies their source ULP. Super Users remain able to audit the
 * data through their existing cross-ULP paths.
 */
TAMPILKAN_BARIS_TANPA_ULP = false;
