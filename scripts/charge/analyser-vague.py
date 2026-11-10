#!/usr/bin/env python3
"""Une vague d'exports simultanés (`k6/exports-simultanes.js`), en une ligne.

    python3 -I scripts/charge/analyser-vague.py <prefixe> [<prefixe>…]

Pour chaque vague : exports servis (200), refusés par la file (503), autres
statuts, durée des exports servis ; temps des pages des utilisateurs de fond
AVANT la vague et PENDANT (de son départ à la dernière réponse d'export) ;
pire temps de la sonde et survie de l'application.
"""
import csv
import gzip
import sys


def centile(v, p):
    if not v:
        return None
    v = sorted(v)
    return v[min(len(v) - 1, int(round(p / 100 * (len(v) - 1))))]


def page(r):
    for m in (r.get("extra_tags") or "").split("&"):
        if m.startswith("page="):
            return m[5:]
    return None


def ligne(prefixe):
    rows = list(csv.DictReader(gzip.open(f"{prefixe}-k6.csv.gz", "rt", newline="")))
    t0 = min(float(r["timestamp"]) for r in rows)
    depart = t0 + 30
    exports = [r for r in rows if r["metric_name"] == "http_req_duration" and page(r) == "Export (vague)"]
    fin = max((float(r["timestamp"]) for r in exports), default=depart)
    statuts = [r["status"] for r in exports]
    durees = [float(r["metric_value"]) / 1000 for r in exports if r["status"] == "200"]
    fond = [r for r in rows if r["metric_name"] == "http_req_duration" and r["scenario"] == "fond"
            and page(r) not in (None, "statique")]
    avant = [float(r["metric_value"]) for r in fond if float(r["timestamp"]) < depart]
    pendant = [float(r["metric_value"]) for r in fond if depart <= float(r["timestamp"]) <= fin]
    echecs_fond = sum(1 for r in rows if r["metric_name"] == "http_req_failed" and r["scenario"] == "fond"
                      and float(r["metric_value"]) > 0)
    sonde = []
    try:
        for r in csv.DictReader(open(f"{prefixe}.csv", newline="")):
            sonde.append(int(r["sonde_ms"]))
    except (FileNotFoundError, ValueError):
        pass
    app = open(f"{prefixe}.txt").read().strip().splitlines()[-1].split("app=")[-1]
    f = lambda v: "—" if v is None else f"{v:.0f}"
    return (f"| {'un an' if 'un-an' in prefixe else 'démo'} | {prefixe.rsplit('-n', 1)[-1]} | {statuts.count('200')} | {statuts.count('503')} "
            f"| {len(statuts) - statuts.count('200') - statuts.count('503')} "
            f"| {f(min(durees) if durees else None)}–{f(max(durees) if durees else None)} s "
            f"| {f(centile(avant, 95))} ms | {f(centile(pendant, 95))} ms | {f(max(pendant) if pendant else None)} ms "
            f"| {echecs_fond} | {max(sonde) if sonde else '—'} ms | {app} |")


print("| Historique | Exports lancés | Servis | Refusés (503) | Autres | Durée des servis "
      "| Fond p95 avant | Fond p95 pendant | Fond pire pendant | Échecs fond | Sonde pire | Application |")
print("|---|---|---|---|---|---|---|---|---|---|---|---|")
for p in sys.argv[1:]:
    print(ligne(p))
