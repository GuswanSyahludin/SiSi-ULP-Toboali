/* Web BA: create once, then upload AND bind each photo to the returned row.
 * No manual/client-generated idBA. Existing upload/edit guards remain unchanged.
 * Durable receipts live in notes on the new idBA cell. Script Properties hold
 * only an in-flight create marker: an ambiguous partial write is NOT replayed.
 * Requires existing, unambiguous ULP headers; does not migrate historical rows.
 */
function _baWebNorm_(value) {
  return String(value == null ? "" : value).trim().toLowerCase().replace(/\s+/g, " ");
}
function _baWebUlp_(value) {
  // Do not normalize usernames, request IDs or payload digests as ULP names.
  return _baWebNorm_(value).replace(/^toboali$/, "ulp toboali");
}
function _baWebHash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value)
    .map(function (b) { return ("0" + (b & 255).toString(16)).slice(-2); }).join("");
}
function _baWebSession_(args) {
  var g = guard_(args, { ulp: true, aksi: "BA_WEB_CREATE_FLOW" });
  if (_baWebUlp_(g.ulp) !== "ulp toboali" || !String(g.username || "").trim()) {
    throw new Error("Akses BA hanya untuk akun ULP Toboali yang teridentifikasi.");
  }
  return g;
}
function _baWebKey_(request) {
  if (!/^[a-f0-9-]{32,36}$/i.test(String(request.requestId || ""))) {
    throw new Error("Identitas permintaan BA tidak valid.");
  }
  return _baWebHash_(String(request.requestId));
}
function _baWebSafe_(value) {
  if (Array.isArray(value)) return value.map(_baWebSafe_);
  if (value && typeof value === "object") {
    var out = {};
    Object.keys(value).sort().forEach(function (key) {
      if (/^(token|deviceToken|__proto__|constructor|prototype)$/.test(key)) return;
      out[key] = _baWebSafe_(value[key]);
    });
    return out;
  }
  if (typeof value === "string") {
    var offset = 0;
    while (offset < value.length && (value.charCodeAt(offset) < 33 || /\s/.test(value.charAt(offset)))) offset++;
    if (offset < value.length && "=+-@".indexOf(value.charAt(offset)) >= 0) return "'" + value;
  }
  return value;
}
function _baWebColumn_(headers, aliases) {
  var matches = [];
  headers.forEach(function (v, i) {
    if (aliases.indexOf(_baWebNorm_(v).replace(/[^a-z0-9]/g, "")) >= 0) matches.push(i);
  });
  if (matches.length !== 1) throw new Error("Header BA tidak tersedia atau ambigu: " + aliases[0]);
  return matches[0];
}
function _baWebSheet_(kind) {
  var source = kind === "switching" ? SW_SOURCE : BA_SOURCE;
  var sheet = SpreadsheetApp.openById(source.spreadsheetId).getSheetByName(source.sheetName);
  if (!sheet) throw new Error("Sheet BA belum tersedia: " + source.sheetName);
  var values = sheet.getDataRange().getValues();
  var found = kind === "switching" ? { row: _swFindHeaderRow_(values) } : _baFindHeader_(values);
  if (!found || !values[found.row]) throw new Error("Header BA belum dikenali.");
  var headers = values[found.row];
  var idCol = _baWebColumn_(headers, ["idba"]);
  var ulpCol = _baWebColumn_(headers, ["ulp", "namaulp", "unitlayananpelanggan", "kodeulp"]);
  var nameCol = kind === "switching" ? _swColToIndex_(SW_COL.namaSwitching) :
    _baPickIndex_(found.map, BA_SAVE_ALIASES.nomorTrafo);
  if (nameCol < 0) throw new Error("Header nama peralatan BA tidak tersedia.");
  if (kind === "switching" && idCol !== _swColToIndex_(SW_COL.idBA)) {
    throw new Error("Posisi idBA Switching tidak sesuai kontrak.");
  }
  return { sheet: sheet, values: values, found: found, idCol: idCol, ulpCol: ulpCol, nameCol: nameCol };
}
function _baWebNote_(cell) {
  var text = String(cell.getNote() || ""), prefix = "SISI_BA_CREATE_V1\n";
  if (text.indexOf(prefix) !== 0) return null;
  return JSON.parse(text.substring(prefix.length));
}
function _baWebWriteNote_(cell, record) {
  cell.setNote("SISI_BA_CREATE_V1\n" + JSON.stringify(record));
  SpreadsheetApp.flush();
}
function _baWebRow_(request, record) {
  var checked = _stage3RequireBaRow_([request], record.result.idBA, "BA_WEB_ROW_BINDING");
  var row = checked.row, expected = record.kind === "switching" ? SW_SOURCE : BA_SOURCE;
  if (row.source.sheetName !== expected.sheetName || row.source.spreadsheetId !== expected.spreadsheetId) {
    throw new Error("Sumber baris BA tidak cocok.");
  }
  var idCol = _baWebColumn_(row.headers, ["idba"]);
  // The legacy resolver picks the first ULP alias. Every replay/recheck must
  // also reject a second ownership header, even when both values agree.
  var ulpCol = _baWebColumn_(row.headers, ["ulp", "namaulp", "unitlayananpelanggan", "kodeulp"]);
  if (_baWebUlp_(row.values[ulpCol]) !== "ulp toboali") throw new Error("Kepemilikan ULP BA tidak valid.");
  return { row: row, cell: row.sheet.getRange(row.sheetRow, idCol + 1) };
}
function _baWebOwned_(g, record, key) {
  if (!record || record.key !== key || record.owner !== _baWebHash_(_baWebNorm_(g.username))) {
    throw new Error("Permintaan BA bukan milik akun ini.");
  }
}
function _baWebReplay_(request, g, key, digest, data) {
  var notes = data.sheet.getRange(1, data.idCol + 1, data.values.length, 1).getNotes();
  var hit = null;
  for (var i = data.found.row + 1; i < notes.length; i++) {
    var text = String(notes[i][0] || "");
    if (text.indexOf("SISI_BA_CREATE_V1\n") !== 0) continue;
    var record = JSON.parse(text.substring("SISI_BA_CREATE_V1\n".length));
    if (record.key !== key) continue;
    if (hit) throw new Error("Receipt BA tidak unik.");
    hit = record;
  }
  if (!hit) return null;
  _baWebOwned_(g, hit, key);
  if (hit.digest !== digest) throw new Error("Data retry berubah. Gunakan draft BA yang sudah tersimpan.");
  _baWebRow_(request, hit);
  return hit.result;
}
function _baWebCreate_(request) {
  var g = _baWebSession_([request]), key = _baWebKey_(request), kind = String(request.kind || "");
  var writers = { gardu: "simpanBeritaAcaraGardu", pemeriksaan: "simpanBaPemeriksaanTrafo", switching: "simpanBeritaAcaraSwitching" };
  if (!Object.prototype.hasOwnProperty.call(writers, kind)) throw new Error("Jenis formulir BA tidak valid.");
  var payload = _baWebSafe_(request.payload || {});
  delete payload.idBA;
  payload.foto = {};
  var identitas = payload.identitas || {}, date = String(identitas.tanggalBA || "");
  var name = kind === "switching" ? String((payload.awal || {}).namaSwitching || "").trim() :
    String(identitas.nomorTrafo || "").trim();
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !String(payload.jenisPekerjaan || "").trim()) {
    throw new Error("Nama peralatan, tanggal BA, dan jenis pekerjaan wajib diisi.");
  }
  if ((kind === "pemeriksaan") !== (payload.jenisPekerjaan === "Pemeriksaan Trafo")) {
    throw new Error("Jenis pemeriksaan BA tidak cocok.");
  }
  var digest = _baWebHash_(kind + ":" + JSON.stringify(payload));
  var data = _baWebSheet_(kind), replay = _baWebReplay_(request, g, key, digest, data);
  if (replay) return replay;
  // The same operation key cannot be reused to create a second equipment type.
  var peerSource = kind === "switching" ? BA_SOURCE : SW_SOURCE;
  var peer = SpreadsheetApp.openById(peerSource.spreadsheetId).getSheetByName(peerSource.sheetName);
  if (peer) {
    var peerValues = peer.getDataRange().getValues();
    var peerFound = kind === "switching" ? _baFindHeader_(peerValues) : { row: _swFindHeaderRow_(peerValues) };
    if (peerFound && peerValues[peerFound.row]) {
      var peerHeaders = peerValues[peerFound.row];
      if (peerHeaders.some(function (v) { return _baWebNorm_(v).replace(/[^a-z0-9]/g, "") === "idba"; })) {
        _baWebReplay_(request, g, key, digest, {
          sheet: peer, values: peerValues, found: peerFound, idCol: _baWebColumn_(peerHeaders, ["idba"])
        });
      }
    }
  }
  var props = PropertiesService.getScriptProperties(), marker = "BA_CREATE_PENDING_" + key;
  if (props.getProperty(marker)) {
    throw new Error("Penyimpanan BA sebelumnya belum terverifikasi. Periksa Rekap BA sebelum membuat permintaan baru.");
  }
  var last = data.found.row;
  data.values.forEach(function (row, index) {
    if (index > data.found.row && (String(row[data.idCol] || "").trim() || String(row[data.nameCol] || "").trim())) last = index;
  });
  var sheetRow = last + 2;
  var gen = kind === "switching" ? _swGenIdBA_(data.values, data.found.row, data.idCol, date) :
    _baGenerateIdBA_(data.values, data.found.row, data.idCol, date);
  if (/-000$/.test(gen.idBA) || data.values.some(function (r) { return _baWebNorm_(r[data.idCol]) === _baWebNorm_(gen.idBA); })) {
    throw new Error("Nomor BA mencapai batas atau tidak unik. Tidak ada baris yang ditulis.");
  }
  // Conservatively require an empty destination. Never overwrite a prepared
  // row, formula, ownership value, or existing note during legacy field writes.
  var destination = data.sheet.getRange(sheetRow, 1, 1, data.values[0].length);
  if (destination.getValues()[0].some(function (v) { return v !== "" && v != null; }) ||
      destination.getFormulas()[0].some(Boolean) || destination.getNotes()[0].some(Boolean)) {
    throw new Error("Baris tujuan BA berisi nilai/formula/catatan. Siapkan baris kosong sebelum menyimpan.");
  }
  var root = typeof globalThis !== "undefined" ? globalThis : this;
  // The P0 installer captured the legacy field writers. Call ONLY after our
  // own session, same-ULP, payload, row and lock checks. Calling the later
  // token-stripping save wrapper would run P0 a second time without its token.
  var writer = root["original" + writers[kind]];
  if (typeof writer !== "function") throw new Error("Penulis BA terjaga belum tersedia.");
  props.setProperty(marker, JSON.stringify({ kind: kind, idBA: gen.idBA, row: sheetRow }));
  var result = writer.call(root, payload);
  if (!result || !result.ok || result.idBA !== gen.idBA || result.baris !== sheetRow) {
    throw new Error("BA " + gen.idBA + " belum tersimpan lengkap. Periksa Rekap BA; pembuatan ulang otomatis diblokir.");
  }
  var fresh = _baWebSheet_(kind);
  if (String(fresh.sheet.getRange(sheetRow, fresh.idCol + 1).getValue()) !== result.idBA ||
      String(fresh.sheet.getRange(sheetRow, fresh.ulpCol + 1).getValue() || "").trim()) {
    throw new Error("Identitas/kepemilikan baris BA berubah. Perlu pemeriksaan Rekap BA.");
  }
  fresh.sheet.getRange(sheetRow, fresh.ulpCol + 1).setValue("ULP Toboali");
  SpreadsheetApp.flush();
  var record = { key: key, owner: _baWebHash_(_baWebNorm_(g.username)), digest: digest, kind: kind,
    result: result, date: date, name: name, jenis: payload.jenisPekerjaan, photos: {} };
  var bound = _baWebRow_(request, record);
  _baWebWriteNote_(bound.cell, record);
  props.deleteProperty(marker);
  return result;
}
function simpanDraftBaWeb(request) {
  _baWebSession_(arguments);
  return withLock_(function () { return _baWebCreate_(request || {}); }, 30000);
}
function _baWebPhoto_(request) {
  var g = _baWebSession_([request]), key = _baWebKey_(request);
  var checked = _stage3RequireBaRow_([request], String(request.idBA || ""), "BA_WEB_PHOTO");
  var idCol = _baWebColumn_(checked.row.headers, ["idba"]);
  var record = _baWebNote_(checked.row.sheet.getRange(checked.row.sheetRow, idCol + 1));
  _baWebOwned_(g, record, key);
  if (record.result.idBA !== request.idBA) throw new Error("idBA foto tidak cocok.");
  var bound = _baWebRow_(request, record);
  var map = {};
  var baseMap = record.kind === "switching" ? SW_PHOTO_COLUMN : BA_PHOTO_COLUMN;
  Object.keys(baseMap).forEach(function (s) { map[s] = baseMap[s]; });
  // Pemeriksaan also shows the common Trafo Awal photo card, not only megger.
  if (record.kind === "pemeriksaan") {
    Object.keys(BA_PRK_FOTO_COLUMN).forEach(function (s) { map[s] = BA_PRK_FOTO_COLUMN[s]; });
  }
  var slot = String(request.slot || "");
  if (!Object.prototype.hasOwnProperty.call(map, slot)) throw new Error("Slot foto BA tidak dikenal.");
  var receipt = record.photos[slot], column = _baColLetterToIndex_(map[slot]) + 1;
  var cell = bound.row.sheet.getRange(bound.row.sheetRow, column), previous = String(cell.getValue() || "");
  if (cell.getFormula() || (previous && (!receipt || previous !== receipt.url))) {
    throw new Error("Kolom foto BA sudah berubah atau berisi formula.");
  }
  function invalidPhoto_(message) {
    // Only a verified rejection BEFORE Drive/Sheet writes may unlock a picker.
    // Never authorize replacing an existing receipt or a conflicting row cell.
    return { ok: false, idBA: request.idBA, slot: slot,
      code: receipt ? "PHOTO_RETRY_SAME_FILE" : "PHOTO_REPLACE_ALLOWED", message: message };
  }
  var match = String(request.dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length > 7000000) return invalidPhoto_("Foto harus JPEG, PNG, atau WebP maksimal 5 MB.");
  var bytes, mime = match[1];
  try { bytes = Utilities.base64Decode(match[2]); }
  catch (decodeError) { return invalidPhoto_("Data foto tidak dapat dibaca."); }
  var byte = function (i) { return bytes[i] & 255; };
  var signature = mime === "image/jpeg" ? byte(0) === 255 && byte(1) === 216 && byte(2) === 255 :
    mime === "image/png" ? [137,80,78,71,13,10,26,10].every(function (v, i) { return byte(i) === v; }) :
    byte(0) === 82 && byte(1) === 73 && byte(2) === 70 && byte(3) === 70 &&
      byte(8) === 87 && byte(9) === 69 && byte(10) === 66 && byte(11) === 80;
  if (!signature || bytes.length > 5 * 1024 * 1024) return invalidPhoto_("Isi atau ukuran foto tidak valid.");
  var checksum = _baWebHash_(bytes);
  if (receipt && receipt.checksum !== checksum) throw new Error("Foto retry berbeda dari foto draft.");
  var folder = record.kind === "switching" ? _swPhotoFolder_(record.date, record.jenis, record.name) :
    _baPhotoFolder_(record.date, record.jenis, record.name);
  if (folder.getSharingAccess() !== DriveApp.Access.PRIVATE) throw new Error("Folder foto BA harus privat.");
  var fileName = "BA_v1_" + _baWebHash_(key + ":" + slot + ":" + checksum) + "." +
    (mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp");
  var files = folder.getFilesByName(fileName), file = files.hasNext() ? files.next() : null;
  if (files.hasNext()) throw new Error("Berkas foto retry tidak unik.");
  _baWebRow_(request, record);
  if (receipt && (!file || file.getId() !== receipt.fileId)) throw new Error("Berkas receipt BA berubah.");
  if (!file) file = folder.createFile(Utilities.newBlob(bytes, mime, fileName));
  if (file.getSize() !== bytes.length || file.getSize() > 5 * 1024 * 1024) throw new Error("Ukuran berkas receipt berubah.");
  file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
  if (file.getSharingAccess() !== DriveApp.Access.PRIVATE || file.isTrashed() ||
      _baWebHash_(file.getBlob().getBytes()) !== checksum) throw new Error("Integritas/privasi foto BA gagal.");
  bound = _baWebRow_(request, record);
  cell = bound.row.sheet.getRange(bound.row.sheetRow, column);
  if (cell.getFormula() || String(cell.getValue() || "") !== previous) throw new Error("Baris foto berubah saat upload.");
  record.photos[slot] = { checksum: checksum, fileId: file.getId(), url: file.getUrl() };
  // Receipt BEFORE URL write makes both lost responses and partial link writes
  // retryable with the same file. Never accept a client-supplied file URL.
  _baWebWriteNote_(bound.cell, record);
  cell.setValue(file.getUrl());
  SpreadsheetApp.flush();
  _baWebRow_(request, record);
  if (String(cell.getValue()) !== file.getUrl()) throw new Error("Tautan foto belum tersimpan.");
  return { ok: true, idBA: request.idBA, slot: slot, fileId: file.getId(), url: file.getUrl() };
}
function uploadFotoDraftBaWeb(request) {
  _baWebSession_(arguments);
  return withLock_(function () { return _baWebPhoto_(request || {}); }, 30000);
}
function _baWebClient_() {
  var list = window.SISI_BUTUH_TOKEN;
  if (!Array.isArray(list)) list = window.SISI_BUTUH_TOKEN = [];
  ["simpanDraftBaWeb", "uploadFotoDraftBaWeb", "generatePdfBaPengoperasian", "generatePdfBaSwitching"].forEach(function (name) {
    if (list.indexOf(name) < 0) list.push(name);
  });
  function toast_(message, type) { if (typeof showToast === "function") showToast(message, type || "error"); }
  function uuid_() {
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
  }
  function validFile_(file) {
    return !!file && /^image\/(jpeg|png|webp)$/.test(file.type) && file.size > 0 && file.size <= 5 * 1024 * 1024;
  }
  // Preserve the original staging/UI handler, but replace only a slot the
  // server (or a never-sent FileReader failure) explicitly marked recoverable.
  [["bagUploadFoto", "_BAG"], ["swUploadFoto", "_SW"]].forEach(function (pair) {
    var original = window[pair[0]];
    window[pair[0]] = function (slot, input) {
      var state = window[pair[1]], flow = state && state.baWebFlow;
      var file = input && input.files && input.files[0];
      if (!file) return;
      if (flow && (flow.busy || flow.complete || flow.replaceableSlot !== slot || flow.receipts[slot])) {
        toast_("Foto ini belum boleh diganti. Ulangi dengan BA dan foto yang sama."); return;
      }
      if (!validFile_(file)) { toast_("Pilih foto JPEG, PNG, atau WebP maksimal 5 MB."); input.value = ""; return; }
      original.apply(this, arguments);
      var item = state.foto[slot];
      if (!item || item.file !== file) return;
      item.inputId = input.id;
      if (flow) {
        flow.photos[slot] = item;
        flow.attempted[slot] = false;
        toast_("Foto pengganti siap. Klik Coba lagi untuk BA yang sama.", "info");
      }
    };
  });
  window._baWebStart_ = function (payload, state, kind, prefix) {
    var button = document.getElementById(prefix + "BtnSimpan"), flow = state.baWebFlow;
    if (flow && (flow.busy || flow.complete)) return;
    if (!flow) {
      var photos = {};
      var invalid = false;
      Object.keys(state.foto || {}).forEach(function (slot) {
        var item = state.foto[slot], file = item && item.file;
        if (!validFile_(file)) invalid = true;
        photos[slot] = item;
      });
      if (invalid) { toast_("Pilih foto JPEG, PNG, atau WebP maksimal 5 MB sebelum menyimpan BA."); return; }
      payload.foto = {};
      flow = state.baWebFlow = { requestId: uuid_(), payload: JSON.parse(JSON.stringify(payload)),
        photos: photos, receipts: {}, attempted: {}, kind: kind, button: button, inputs: [] };
      var wrap = document.getElementById(prefix === "bag" ? "bagFormWrap" : "baTab-switching");
      if (wrap) Array.prototype.forEach.call(wrap.querySelectorAll("input,select,textarea"), function (el) {
        flow.inputs.push({ el: el, disabled: el.disabled }); el.disabled = true;
      });
    }
    function current_() {
      return state.baWebFlow === flow && document.getElementById(prefix + "BtnSimpan") === flow.button;
    }
    function failed_(err) {
      if (!current_()) return;
      flow.busy = false; button.disabled = false; button.textContent = "Coba lagi (BA yang sama)";
      toast_((flow.saved ? "BA " + flow.saved.idBA + " sudah tersimpan, foto belum lengkap. " : "Status simpan belum selesai. ") +
        String((err && err.message) || err) + " Jangan membuat BA baru untuk mengulang.");
    }
    function replaceable_(slot, message) {
      failed_(message);
      if (!current_() || flow.receipts[slot]) return;
      flow.replaceableSlot = slot;
      var input = document.getElementById(flow.photos[slot].inputId);
      if (input) input.disabled = false;
      toast_("Pilih ulang foto yang gagal, lalu klik Coba lagi. ID BA dan foto yang sukses tetap dipertahankan.", "warning");
    }
    function finished_() {
      if (!current_()) return;
      flow.busy = false; flow.complete = true; button.disabled = true; button.textContent = "BA tersimpan";
      var pdf = document.getElementById(prefix + "BtnPdf");
      if (pdf) { pdf.setAttribute("data-idba", flow.saved.idBA); pdf.disabled = false; }
      toast_("BA dan seluruh foto tersimpan. Reset formulir untuk BA baru.", "success");
      if (prefix === "bag" && flow.payload.jenisPekerjaan === "Pengoperasian Trafo" &&
          (!(flow.payload.phbTr || {}).ownerId || !(flow.payload.phbTr || {}).externalRef)) {
        toast_(state.ownerWarn || "OwnerId / External Reference belum terisi.", "warning");
      }
    }
    var slots = Object.keys(flow.photos), index = 0;
    function next_() {
      if (!current_()) return;
      if (index >= slots.length) { finished_(); return; }
      var slot = slots[index++], item = flow.photos[slot];
      if (flow.receipts[slot]) { next_(); return; }
      var reader = new FileReader();
      reader.onerror = reader.onabort = function () {
        if (!flow.attempted[slot]) replaceable_(slot, "Foto gagal dibaca.");
        else failed_("Foto gagal dibaca setelah pengiriman. Pilih kembali berkas yang sama setelah statusnya diperiksa.");
      };
      reader.onload = function (event) {
        if (!current_()) return;
        flow.attempted[slot] = true;
        SisiRun.withSuccessHandler(function (res) {
          if (!current_()) return;
          if (res && res.ok === false && res.code === "PHOTO_REPLACE_ALLOWED" &&
              res.idBA === flow.saved.idBA && res.slot === slot && !flow.receipts[slot]) {
            flow.attempted[slot] = false;
            replaceable_(slot, res.message || "Foto ditolak sebelum disimpan."); return;
          }
          if (!res || !res.ok || res.idBA !== flow.saved.idBA || res.slot !== slot) {
            failed_((res && res.message) || "Respons foto tidak valid."); return;
          }
          flow.receipts[slot] = res; next_();
        }).withFailureHandler(failed_).uploadFotoDraftBaWeb({
          requestId: flow.requestId, idBA: flow.saved.idBA, slot: slot, dataUrl: event.target.result
        });
      };
      try { reader.readAsDataURL(item.file); } catch (error) {
        if (!flow.attempted[slot]) replaceable_(slot, "Foto gagal dibaca.");
        else failed_(error);
      }
    }
    flow.replaceableSlot = null;
    flow.inputs.forEach(function (item) { item.el.disabled = true; });
    flow.busy = true; button.disabled = true; button.textContent = "Menyimpan BA...";
    var pdf = document.getElementById(prefix + "BtnPdf");
    if (pdf) pdf.disabled = true;
    // Replay create even on retry: revalidates session, account, unchanged
    // payload and row ownership before skipping completed photo receipts.
    SisiRun.withSuccessHandler(function (res) {
      if (!current_()) return;
      if (!res || !res.ok || !res.idBA) { failed_((res && res.message) || "idBA belum diterbitkan server."); return; }
      if (flow.saved && flow.saved.idBA !== res.idBA) { failed_("idBA retry berubah."); return; }
      flow.saved = res;
      var number = document.getElementById(prefix + "NomorBA");
      if (number) number.value = res.nomorBAFull || res.idBA;
      next_();
    }).withFailureHandler(failed_).simpanDraftBaWeb({ requestId: flow.requestId, kind: flow.kind, payload: flow.payload });
  };
  [["bagResetForm", "_BAG"], ["swResetForm", "_SW"]].forEach(function (pair) {
    var original = window[pair[0]];
    window[pair[0]] = function () {
      var state = window[pair[1]], flow = state && state.baWebFlow;
      if (flow && !flow.complete) {
        toast_("Draft BA belum selesai. Gunakan Coba lagi; reset diblokir agar BA tidak ganda."); return;
      }
      if (flow) {
        flow.inputs.forEach(function (item) { item.el.disabled = item.disabled; });
        flow.button.disabled = false; flow.button.textContent = "Simpan BA";
        state.baWebFlow = null;
      }
      return original.apply(this, arguments);
    };
  });
  // Outer actions used to keep mutating/hiding the form even when reset was
  // refused. Keep the failed slot reachable until the same BA is completed.
  ["bagResetSemua", "bagSetMode", "bagPakaiMaster"].forEach(function (name) {
    var original = window[name];
    if (typeof original !== "function") return;
    window[name] = function () {
      if (window._BAG && _BAG.baWebFlow && !_BAG.baWebFlow.complete) {
        toast_("Selesaikan draft BA yang sama sebelum mengganti atau mereset formulir."); return;
      }
      return original.apply(this, arguments);
    };
  });
}
function _baWebPatchPage_(html) {
  function replaceSave_(name, nextName, prefix, state, kind) {
    var start = html.indexOf("function " + name + "(){"), end = html.indexOf("function " + nextName + "(){", start);
    var marker = "  var btn=" + prefix + "El('" + prefix + "BtnSimpan');";
    var tail = html.indexOf(marker, start);
    if (start < 0 || end < 0 || tail < start || tail >= end ||
        html.indexOf("function " + name + "(){", start + 1) >= 0) {
      throw new Error("Kontrak halaman BA berubah; alur simpan lama tidak dijalankan.");
    }
    html = html.substring(0, tail) + "  _baWebStart_(payload," + state + "," + kind + ",'" + prefix + "');\n}\n\n" + html.substring(end);
  }
  replaceSave_("bagSimpan", "bagGeneratePdf", "bag", "_BAG", "(jenis==='Pemeriksaan Trafo'?'pemeriksaan':'gardu')");
  replaceSave_("swSimpan", "swGeneratePdf", "sw", "_SW", "'switching'");
  // Remove the shadowed immediate-upload declaration, keeping the active
  // local-file staging declaration. No upload is allowed before save.
  var first = html.indexOf("function bagUploadFoto(slot,input){");
  var second = html.indexOf("function bagUploadFoto(slot,input){", first + 1);
  if (first < 0 || second < 0) throw new Error("Kontrak pemilih foto BA berubah.");
  html = html.substring(0, first) + html.substring(second);
  return html + "<script>(" + _baWebClient_.toString() + ")();<\/script>";
}
(function installBaWebCreateFlow_(root) {
  var previous = root.getPageContent;
  root.getPageContent = function (token, pageName) {
    var result = previous.apply(this, arguments);
    if (result && result.success && pageName === "SIE-BeritaAcara") {
      result.html = _baWebPatchPage_(String(result.html || ""));
    }
    return result;
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
