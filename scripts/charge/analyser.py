#!/usr/bin/env python3
"""Résultats d'un scénario par palier (`docs/plan-test-de-charge.md` § 6).

    python3 -I scripts/charge/analyser.py <prefixe> [--palier 210] [--chauffe 30]

Lit `<prefixe>-k6.csv.gz` (sortie `--out csv` de k6) et `<prefixe>.csv`
(`surveiller.sh`). Découpe le temps en paliers de `--palier` secondes (montée
de 30 s + 3 min de tenue pour `paliers`) et ne garde de chacun que la tenue
(après `--chauffe` secondes). Écrit un tableau Markdown sur la sortie.
"""
import csv
import gzip
import sys
from collections import defaultdict
from datetime import datetime


def arg(nom, defaut):
    if f"--{nom}" in sys.argv:
        return sys.argv[sys.argv.index(f"--{nom}") + 1]
    return defaut


def centile(valeurs, p):
    if not valeurs:
        return None
    v = sorted(valeurs)
    return v[min(len(v) - 1, int(round(p / 100 * (len(v) - 1))))]


def lire_k6(chemin):
    lignes = []
    with gzip.open(chemin, "rt", newline="") as f:
        for r in csv.DictReader(f):
            lignes.append(r)
    return lignes


def tag_page(r):
    for morceau in (r.get("extra_tags") or "").split("&"):
        if morceau.startswith("page="):
            return morceau[5:]
    return None


def main():
    prefixe = sys.argv[1]
    palier = int(arg("palier", "210"))
    chauffe = int(arg("chauffe", "30"))
    lignes = lire_k6(f"{prefixe}-k6.csv.gz")
    debut = min(int(float(r["timestamp"])) for r in lignes)

    durees = defaultdict(lambda: defaultdict(list))  # palier -> page -> ms
    requetes = defaultdict(int)
    echecs = defaultdict(int)
    vus = defaultdict(int)
    for r in lignes:
        t = int(float(r["timestamp"])) - debut
        k, dans = divmod(t, palier)
        if dans < chauffe:
            continue
        nom = r["metric_name"]
        if nom == "vus":
            vus[k] = max(vus[k], int(float(r["metric_value"])))
        page = tag_page(r)
        if page in (None, "statique"):
            continue
        if nom == "http_req_duration":
            durees[k][page].append(float(r["metric_value"]))
            durees[k]["(toutes)"].append(float(r["metric_value"]))
        elif nom == "http_req_failed":
            requetes[k] += 1
            echecs[k] += float(r["metric_value"]) > 0

    serveur = defaultdict(lambda: defaultdict(list))
    try:
        with open(f"{prefixe}.csv", newline="") as f:
            for r in csv.DictReader(f):
                h = datetime.strptime(r["heure"], "%H:%M:%S")
                d0 = datetime.fromtimestamp(debut)
                t = (h.hour * 3600 + h.minute * 60 + h.second) - (d0.hour * 3600 + d0.minute * 60 + d0.second)
                k, dans = divmod(t, palier)
                if t < 0 or dans < chauffe:
                    continue
                serveur[k]["cpu"].append(float(r["app_cpu"].rstrip("%")))
                serveur[k]["mem"].append(r["app_mem"])
                serveur[k]["actives"].append(int(r["connexions_actives"]))
                serveur[k]["sonde"].append(int(r["sonde_ms"]))
    except FileNotFoundError:
        pass

    pages = ["Tableau de bord", "Calendrier", "Équipements", "Fiche équipement", "Registre",
             "DUERP (unités)", "DUERP (synthèse)", "(toutes)"]
    print("| Palier (VU) | Pages/s | Erreurs | " + " | ".join(f"{p} p95" for p in pages)
          + " | CPU app max | Mémoire app (fin) | Connexions actives max | Sonde p95 |")
    print("|" + "---|" * (len(pages) + 7))
    for k in sorted(durees):
        def ms(p):
            v = centile(durees[k].get(p, []), 95)
            return "—" if v is None else f"{v:.0f}"
        s = serveur.get(k, {})
        debit = requetes[k] / max(1, palier - chauffe)
        taux = 100 * echecs[k] / requetes[k] if requetes[k] else 0
        print(
            f"| {vus.get(k, '?')} | {debit:.1f} | {taux:.2f} % | "
            + " | ".join(ms(p) for p in pages)
            + f" | {max(s['cpu']) if s.get('cpu') else '—'} %"
            + f" | {s['mem'][-1] if s.get('mem') else '—'}"
            + f" | {max(s['actives']) if s.get('actives') else '—'}"
            + f" | {centile(s.get('sonde', []), 95) or '—'} ms |"
        )


if __name__ == "__main__":
    main()
