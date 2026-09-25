/* Dashboard Teknik compatibility wiring: add delete action to calendar detail cards. */
function _dashboardJadwalDeleteClientScript_() {
  return `
<script>
(function () {
  var ns = window.__SISI_DASHBOARD_JADWAL_DELETE__ ||
    (window.__SISI_DASHBOARD_JADWAL_DELETE__ = {});

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
        return String(value ? value.textContent : "").trim().toLowerCase();
      }
    }
    return "";
  }

  function wire() {
    var cards = document.querySelectorAll("#calModalBody .cal-item-card");
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (card.getAttribute("data-dashboard-delete-wired") === "1") continue;
      if (statusOf(card) !== "terjadwal") continue;
      var actions = card.querySelector(".cal-item-actions");
      var kodeEl = card.querySelector(".cal-item-kode");
      if (!actions || !kodeEl) continue;
      let kode = String(kodeEl.textContent || "").trim();
      if (!kode) continue;

      var button = document.createElement("button");
      button.type = "button";
      button.className = "cal-item-delete dashboard-cal-delete";
      button.title = "Hapus jadwal";
      button.setAttribute("aria-label", "Hapus jadwal " + kode);
      button.innerHTML = '<i class="fa-solid fa-trash"></i>';
      button.addEventListener("click", function () {
        var current = this;
        if (!window.SisiRun || typeof window.SisiRun.withSuccessHandler !== "function") {
          toast("Layanan hapus jadwal belum siap.", "error");
          return;
        }
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

  ns.install = function () {
    var styleId = "sisi-dashboard-jadwal-delete-style";
    if (!document.getElementById(styleId)) {
      var style = document.createElement("style");
      style.id = styleId;
      style.textContent = ".dashboard-cal-delete{display:grid;place-items:center;width:32px;height:32px;border:1px solid oklch(84% .08 25);border-radius:8px;background:oklch(96% .035 25);color:oklch(48% .17 25);cursor:pointer}.dashboard-cal-delete:hover{background:oklch(91% .07 25)}.dashboard-cal-delete:disabled{opacity:.55;cursor:not-allowed}.dashboard-cal-delete:focus-visible{outline:3px solid oklch(68% .15 25/.3);outline-offset:1px}";
      document.head.appendChild(style);
    }

    wire();
    var target = document.getElementById("calModalBody");
    if (target && target.getAttribute("data-dashboard-delete-observed") !== "1") {
      target.setAttribute("data-dashboard-delete-observed", "1");
      new MutationObserver(wire).observe(target, { childList: true, subtree: true });
    }
    window.setTimeout(wire, 250);
  };

  ns.install();
})();
</script>`;
}
