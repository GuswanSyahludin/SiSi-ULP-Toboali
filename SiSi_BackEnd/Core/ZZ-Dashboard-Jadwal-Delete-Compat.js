/* Dashboard Teknik compatibility wiring: add delete action to calendar detail cards. */
function _dashboardJadwalDeleteClientScript_() {
  return `
<script>
(function () {
  if (window.__SISI_DASHBOARD_JADWAL_DELETE__) return;
  window.__SISI_DASHBOARD_JADWAL_DELETE__ = true;

  function toast(message, type) {
    if (typeof window.tdToast === "function") {
      window.tdToast(message, type || "warning");
    } else {
      window.alert(message);
    }
  }

  function token() {
    return (typeof window._state !== "undefined" && window._state.token) ||
      (window.__SISI_SESI__ && window.__SISI_SESI__.token) || "";
  }

  function statusOf(card) {
    var fields = card.querySelectorAll(".cal-item-field");
    for (var i = 0; i < fields.length; i++) {
      var label = fields[i].querySelector("span:first-child");
      if (label && String(label.textContent || "").trim().toLowerCase() === "status jadwal") {
        var value = fields[i].querySelector("span:last-child");
        return String(value ? value.textContent : "").trim();
      }
    }
    return "Terjadwal";
  }

  function wire() {
    var cards = document.querySelectorAll("#calModalBody .cal-item-card");
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (card.getAttribute("data-dashboard-delete-wired") === "1") continue;
      if (statusOf(card).toLowerCase() !== "terjadwal") continue;
      var actions = card.querySelector(".cal-item-actions");
      var kodeEl = card.querySelector(".cal-item-kode");
      if (!actions || !kodeEl) continue;
      var kode = String(kodeEl.textContent || "").trim();
      if (!kode) continue;

      var button = document.createElement("button");
      button.type = "button";
      button.className = "cal-item-delete dashboard-cal-delete";
      button.title = "Hapus jadwal";
      button.setAttribute("aria-label", "Hapus jadwal " + kode);
      button.innerHTML = '<i class="fa-solid fa-trash"></i>';
      button.addEventListener("click", function () {
        var current = this;
        if (!window.confirm("Hapus jadwal " + kode + "?\\n\\nData ini akan dihapus permanen.")) return;
        current.disabled = true;
        current.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        window.SisiRun
          .withSuccessHandler(function (res) {
            if (!res || res.ok !== true) {
              current.disabled = false;
              current.innerHTML = '<i class="fa-solid fa-trash"></i>';
              toast((res && res.message) || "Gagal menghapus jadwal.", "error");
              return;
            }
            var date = window._calSelectedDate || "";
            if (window._calEventsMap && date && window._calEventsMap[date]) {
              window._calEventsMap[date] = window._calEventsMap[date].filter(function (row) {
                return String(row.kode || "") !== kode;
              });
              if (typeof window.calRenderGrid === "function") window.calRenderGrid(window._calEventsMap);
              if (typeof window.calOpenDetail === "function") window.calOpenDetail(date);
            }
            window._calMonthCache = {};
            if (typeof window.calFetchMonthData === "function") window.calFetchMonthData();
            toast(res.message || "Jadwal berhasil dihapus.", "success");
          })
          .withFailureHandler(function (err) {
            current.disabled = false;
            current.innerHTML = '<i class="fa-solid fa-trash"></i>';
            toast("Gagal menghapus jadwal: " + ((err && err.message) || err), "error");
          })
          .hapusJadwalPadam({ token: token(), kode: kode });
      });
      actions.appendChild(button);
      card.setAttribute("data-dashboard-delete-wired", "1");
    }
  }

  var style = document.createElement("style");
  style.textContent = ".dashboard-cal-delete{display:grid;place-items:center;width:32px;height:32px;border:1px solid oklch(84% .08 25);border-radius:8px;background:oklch(96% .035 25);color:oklch(48% .17 25);cursor:pointer}.dashboard-cal-delete:hover{background:oklch(91% .07 25)}.dashboard-cal-delete:disabled{opacity:.55;cursor:not-allowed}.dashboard-cal-delete:focus-visible{outline:3px solid oklch(68% .15 25/.3);outline-offset:1px}";
  document.head.appendChild(style);
  wire();
  var target = document.getElementById("calModalBody");
  if (target) new MutationObserver(wire).observe(target, { childList: true, subtree: true });
  window.setTimeout(wire, 250);
})();
</script>`;
}

/*
 * This project loads page HTML through getPageContent(). Keep the existing
 * contract intact, adding only the dashboard client wiring for Tek-Dashboard.
 * The ZZ filename ensures this compatibility override is evaluated after the
 * core implementation in the Apps Script project.
 */
function getPageContent(token, pageName) {
  try {
    if (!token)
      return { success: false, message: "Token tidak ditemukan", redirect: "login" };
    var sesi = getSesiByToken(token);
    if (!sesi)
      return { success: false, message: "Sesi habis, silakan login ulang", redirect: "login" };
    if (!_bolehAksesMenu(sesi, pageName))
      return { success: false, message: "Akses ditolak", redirect: "forbidden" };

    var fileName = PAGE_FILE_ALIASES[pageName] || pageName;
    var html = HtmlService.createHtmlOutputFromFile(fileName).getContent();
    if (pageName === "Tek-Dashboard") html += _dashboardJadwalDeleteClientScript_();
    return {
      success: true,
      html: html,
      sesi: {
        token: token,
        username: sesi.username,
        email: sesi.email,
        role: sesi.role,
        ulp: sesi.ulp,
        kodeUlp: sesi.kodeUlp,
        bidang: sesi.bidang,
        tim: sesi.tim,
        subTim: sesi.subTim || "",
        aksesMenu: sesi.aksesMenu || "",
      },
    };
  } catch (e) {
    return { success: false, message: "Halaman tidak ditemukan: " + e.message };
  }
}
