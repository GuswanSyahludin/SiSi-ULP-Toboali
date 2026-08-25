"""Conservative per-instance traffic guard for wm-engine."""
import json,logging,os,threading,time
from datetime import datetime,timezone
from pathlib import Path
from werkzeug.wrappers import Response
from hybrid_v1 import app as flask_app
class CostGuardMiddleware:
    def __init__(self,wrapped,service_name):
        self.wrapped=wrapped;self.service_name=service_name;self.daily_budget=max(100,int(os.getenv("ENGINE_DAILY_REQUEST_BUDGET","2000")));self.cooldown=max(1,int(os.getenv("ENGINE_GUARD_COOLDOWN_SECONDS","10")));self.max_body=max(1_000_000,int(os.getenv("ENGINE_MAX_BODY_BYTES","15000000")));self.path=Path(f"/tmp/sisi-guard-{service_name}.json");self.lock=threading.Lock();self.last_request_at=0.0;self.warned=set()
    @staticmethod
    def _day():return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    def _read(self):
        try:s=json.loads(self.path.read_text())
        except Exception:s={}
        return s if s.get("day")==self._day() else {"day":self._day(),"count":0}
    def _increment(self):
        with self.lock:
            s=self._read();s["count"]=int(s.get("count",0))+1;t=self.path.with_suffix(".tmp");t.write_text(json.dumps(s,separators=(",",":")));t.replace(self.path);return s["count"]
    def _status(self):
        s=self._read();c=int(s.get("count",0));r=c/self.daily_budget;l=95 if r>=.95 else 85 if r>=.85 else 70 if r>=.70 else 0
        return {"ok":True,"service":self.service_name,"day":s.get("day",self._day()),"count":c,"budget":self.daily_budget,"ratio":round(r,4),"level":l,"scope":"instance","maxBodyBytes":self.max_body,"note":"Counter lokal instance, dapat reset saat cold start atau redeploy."}
    @staticmethod
    def _reply(e,s,status,code,msg,h):return Response(json.dumps({"ok":False,"code":code,"message":msg}),status=status,content_type="application/json",headers=h)(e,s)
    def __call__(self,e,s):
        p=e.get("PATH_INFO","/")
        if p=="/guard/status":return Response(json.dumps(self._status()),status=200,content_type="application/json",headers={"Cache-Control":"no-store"})(e,s)
        if p in ("/","/watermark/v1"):return self.wrapped(e,s)
        try:n=int(e.get("CONTENT_LENGTH") or 0)
        except ValueError:n=0
        if n>self.max_body:return self._reply(e,s,413,"PAYLOAD_TOO_LARGE","Payload melewati batas aman engine.",{"X-SiSi-Cost-Guard":"PAYLOAD"})
        c=self._increment();r=c/self.daily_budget;l=95 if r>=.95 else 85 if r>=.85 else 70 if r>=.70 else 0
        if l and l not in self.warned:logging.warning("COST_GUARD service=%s level=%s daily_count=%s budget=%s local_counter=true",self.service_name,l,c,self.daily_budget);self.warned.add(l)
        h={"X-SiSi-Cost-Guard":str(l or "OK"),"X-SiSi-Daily-Usage":f"{min(r,9.99):.4f}","X-SiSi-Counter-Scope":"instance"}
        if r>=.95:return self._reply(e,s,503,"DAILY_GUARD_95","Batas harian lokal tercapai. Coba kembali besok.",{**h,"Retry-After":"3600"})
        if r>=.85:
            now=time.monotonic()
            with self.lock:w=self.cooldown-(now-self.last_request_at);self.last_request_at=now if w<=0 else self.last_request_at
            if w>0:return self._reply(e,s,429,"DAILY_GUARD_85","Permintaan dibatasi sementara.",{**h,"Retry-After":str(max(1,int(w)+1))})
        def start(status,hs,exc=None):hs.extend(h.items());return s(status,hs,exc)
        return self.wrapped(e,start)
app=CostGuardMiddleware(flask_app,"wm-engine")
