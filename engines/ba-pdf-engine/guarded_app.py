"""Conservative per-instance guard for ba-pdf-engine.

This is a traffic safety layer, not a billing hard cap. Cloud Run billing also
uses CPU, memory and egress, and instance-local counters reset on replacement.
The deliberately low daily allowance limits blast radius without adding a paid
shared counter service.
"""
import json
import logging
import os
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from werkzeug.wrappers import Response
from main import app as flask_app


class CostGuardMiddleware:
    def __init__(self, wrapped, service_name):
        self.wrapped = wrapped
        self.service_name = service_name
        self.daily_budget = max(100, int(os.getenv("ENGINE_DAILY_REQUEST_BUDGET", "2000")))
        self.cooldown = max(1, int(os.getenv("ENGINE_GUARD_COOLDOWN_SECONDS", "10")))
        self.max_body = max(1_000_000, int(os.getenv("ENGINE_MAX_BODY_BYTES", "15000000")))
        self.state_path = Path(f"/tmp/sisi-guard-{service_name}.json")
        self.lock = threading.Lock()
        self.last_request_at = 0.0
        self.warned = set()

    @staticmethod
    def _day():
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def _increment(self):
        with self.lock:
            try:
                state = json.loads(self.state_path.read_text())
            except Exception:
                state = {}
            if state.get("day") != self._day():
                state = {"day": self._day(), "count": 0}
                self.warned.clear()
            state["count"] = int(state.get("count", 0)) + 1
            tmp = self.state_path.with_suffix(".tmp")
            tmp.write_text(json.dumps(state, separators=(",", ":")))
            tmp.replace(self.state_path)
            return state["count"]

    def _reply(self, environ, start_response, status, code, message, headers):
        return Response(json.dumps({"ok": False, "code": code, "message": message}),
                        status=status, content_type="application/json",
                        headers=headers)(environ, start_response)

    def __call__(self, environ, start_response):
        if environ.get("PATH_INFO", "/") == "/":
            return self.wrapped(environ, start_response)
        try:
            content_length = int(environ.get("CONTENT_LENGTH") or 0)
        except ValueError:
            content_length = 0
        if content_length > self.max_body:
            return self._reply(environ, start_response, 413, "PAYLOAD_TOO_LARGE",
                               "Payload melewati batas aman engine.",
                               {"X-SiSi-Cost-Guard": "PAYLOAD"})

        count = self._increment()
        ratio = count / self.daily_budget
        level = 95 if ratio >= .95 else 85 if ratio >= .85 else 70 if ratio >= .70 else 0
        if level and level not in self.warned:
            logging.warning("COST_GUARD service=%s level=%s daily_count=%s budget=%s local_counter=true",
                            self.service_name, level, count, self.daily_budget)
            self.warned.add(level)
        headers = {"X-SiSi-Cost-Guard": str(level or "OK"),
                   "X-SiSi-Daily-Usage": f"{min(ratio, 9.99):.4f}",
                   "X-SiSi-Counter-Scope": "instance"}
        if ratio >= .95:
            return self._reply(environ, start_response, 503, "DAILY_GUARD_95",
                               "Batas harian lokal tercapai. Coba kembali besok.",
                               {**headers, "Retry-After": "3600"})
        if ratio >= .85:
            now = time.monotonic()
            with self.lock:
                wait = self.cooldown - (now - self.last_request_at)
                if wait <= 0:
                    self.last_request_at = now
            if wait > 0:
                return self._reply(environ, start_response, 429, "DAILY_GUARD_85",
                                   "Permintaan dibatasi sementara.",
                                   {**headers, "Retry-After": str(max(1, int(wait) + 1))})

        def guarded_start(status, response_headers, exc_info=None):
            response_headers.extend(headers.items())
            return start_response(status, response_headers, exc_info)
        return self.wrapped(environ, guarded_start)


app = CostGuardMiddleware(flask_app, "ba-pdf-engine")
