from pathlib import Path

path = Path("SiSi_BackEnd/Core/Main.html")
text = path.read_text(encoding="utf-8")
start_marker = "      var SisiRun = (function () {"
end_marker = "\n\n\n      /* ════════════════════\n      AKSES MENU (filter)"
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit("SisiRun block markers not found")

replacement = '''      var SisiRun = (function () {
        var GSR = google.script.run;
        var successHandler = null;
        var failureHandler = null;
        var userObject;
        var hasUserObject = false;

        function perluToken(nama) {
          if (SISI_TANPA_TOKEN.indexOf(nama) >= 0) return false;
          return SISI_BUTUH_TOKEN.indexOf(nama) >= 0;
        }

        function sisipkan(nama, args) {
          var a = Array.prototype.slice.call(args);
          if (!perluToken(nama)) return a;
          var t = _getToken();
          if (!t) return a;
          if (a.length && a[0] && typeof a[0] === "object" && !Array.isArray(a[0])) {
            var salin = {};
            for (var k in a[0]) salin[k] = a[0][k];
            if (!salin.token) salin.token = t;
            a[0] = salin;
          } else if (!a.length || String(a[0]) !== String(t)) {
            a.unshift(t);
          }
          return a;
        }

        function resetHandlers() {
          successHandler = null;
          failureHandler = null;
          userObject = undefined;
          hasUserObject = false;
        }

        function jalankan(nama, args) {
          var runner = GSR;
          if (successHandler) runner = runner.withSuccessHandler(successHandler);
          if (failureHandler) runner = runner.withFailureHandler(failureHandler);
          if (hasUserObject) runner = runner.withUserObject(userObject);
          var finalArgs = sisipkan(nama, args);
          resetHandlers();
          return runner[nama].apply(runner, finalArgs);
        }

        var api = {
          withSuccessHandler: function (fn) {
            successHandler = fn;
            return api;
          },
          withFailureHandler: function (fn) {
            failureHandler = fn;
            return api;
          },
          withUserObject: function (o) {
            userObject = o;
            hasUserObject = true;
            return api;
          },
        };

        var cache = {};
        return new Proxy(api, {
          get: function (target, nama) {
            if (typeof nama !== "string") return target[nama];
            if (nama in target) return target[nama];
            if (!cache[nama]) {
              cache[nama] = function () {
                return jalankan(nama, arguments);
              };
            }
            return cache[nama];
          },
        });
      })();'''

path.write_text(text[:start] + replacement + text[end:], encoding="utf-8")
