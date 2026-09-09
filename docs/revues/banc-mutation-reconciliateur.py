#!/usr/bin/env python3
"""Rejoue les seize mutations de l'audit du réconciliateur.

Pour chaque mutation : applique un remplacement littéral dans le source,
lance `pnpm exec vitest run`, note les tests rouges, restaure.
"""
import json
import os
import re
import subprocess
import time
import sys

WT = "/private/tmp/claude-501/-Users-palomasanchezc-Documents-rojer-outils/7de3a2b3-8830-44bd-a0a3-d4e257d60ccd/scratchpad/wt-main"
A = os.path.join(WT, "src/lib/calendrier/actions.ts")
G = os.path.join(WT, "src/lib/calendrier/generateur.ts")
Q = os.path.join(WT, "src/lib/calendrier/queries.ts")

MUTATIONS = [
    # ---- actions.ts (11) ----
    ("M01", "actions: filtre `actif:true` sur les équipements", A,
     "equipements: { where: { actif: true } },",
     "equipements: true,"),
    ("M02", "actions: `assertEtablissementOwnership` retiré", A,
     "  await assertEtablissementOwnership(etablissementId);\n",
     "  void assertEtablissementOwnership;\n"),
    ("M03", "actions: `actif:true` sur les titres", A,
     "where: { salarie: { etablissementId, actif: true } },",
     "where: { salarie: { etablissementId } },"),
    ("M04", "actions: filtre `estPorteeParSalarie` du garde-fou", A,
     "    if (o !== undefined && estPorteeParSalarie(o)) {",
     "    if (o !== undefined) {"),
    ("M05", "actions: `etablissementId` du `deleteMany`", A,
     "        where: { id: { in: plan.aSupprimer }, etablissementId },",
     "        where: { id: { in: plan.aSupprimer } },"),
    ("M06", "actions: `skipDuplicates`", A,
     "        skipDuplicates: true,",
     "        skipDuplicates: false,"),
    ("M07", "actions: `$transaction` → `await` séquentiels", A,
     "  await prisma.$transaction(operations);",
     "  for (const op of operations) await op;"),
    ("M08", "actions: `obligationsEncoreApplicables` vidé", A,
     "  const obligationsEncoreApplicables = new Set(\n    obligations.map((oa) => oa.obligation.id),\n  );",
     "  const obligationsEncoreApplicables = new Set<string>();"),
    ("M09", "actions: mises en service ignorées", A,
     "  for (const eq of etab.equipements) {\n    if (eq.dateMiseEnService) misesEnService.set(eq.id, eq.dateMiseEnService);\n  }",
     "  // mutation : mises en service ignorées"),
    ("M10", "actions: `salarieId` forcé à `null`", A,
     "          salarieId: v.salarieId,",
     "          salarieId: null,"),
    ("M11", "actions: titres non générés", A,
     "    ...genererVerificationsDepuisTitres(titresSalaries, obligationParId, {\n      now,\n    }),",
     "    ...(false\n      ? genererVerificationsDepuisTitres(titresSalaries, obligationParId, {\n          now,\n        })\n      : []),"),
    # ---- generateur.ts (1) ----
    ("M12", "generateur: `statutCycleOuvert` rend toujours `a_planifier`", G,
     '  if (estEnRetard(datePrevue, now)) return "depassee";\n  return statutExistant === "planifiee" ? "planifiee" : "a_planifier";',
     '  void datePrevue;\n  void statutExistant;\n  void now;\n  return "a_planifier";'),
    # ---- queries.ts (4) ----
    ("M13", "queries: scoping userId de `compterEtatCalendrier`", Q,
     "  const verifs = await prisma.verification.findMany({\n    where: toutesLesConditions(\n      {\n        etablissementId,\n        etablissement: { entreprise: { userId: user.id } },\n      },\n      porteeBatiment(filtres.batimentId),\n    ),",
     "  const verifs = await prisma.verification.findMany({\n    where: toutesLesConditions(\n      {\n        etablissementId,\n      },\n      porteeBatiment(filtres.batimentId),\n    ),"),
    ("M14", "queries: scoping userId de `getVerification`", Q,
     "    where: { id, etablissement: { entreprise: { userId: user.id } } },",
     "    where: { id },"),
    ("M15", "queries: scoping userId de `calendrierDesynchronise`", Q,
     "    where: { id: etablissementId, entreprise: { userId: user.id } },",
     "    where: { id: etablissementId },"),
    ("M16", "queries: comparaison de version", Q,
     "  return etab.referentielVersionCalendrier !== REFERENTIEL_VERSION;",
     "  return false;"),
]


# Délai de garde par mutation. La suite entière prend 7 s ; au-delà de
# `DELAI_DE_GARDE`, on tue et on note « EXPIRÉ » plutôt que d'attendre.
#
# DEUX RAISONS, ET LA PREMIÈRE EST UN RÉSULTAT, PAS UNE PANNE : une mutation
# qui fait DIVERGER la suite au lieu de la faire rougir dit quelque chose sur
# la garantie retirée, et ça se consigne. La seconde est opératoire : sans
# garde, une seule mutation pathologique bloque les quinze suivantes.
DELAI_DE_GARDE = 90


def lancer():
    debut = time.monotonic()
    try:
        p = subprocess.run(
            ["pnpm", "exec", "vitest", "run", "--reporter=dot"],
            cwd=WT, capture_output=True, text=True, timeout=DELAI_DE_GARDE,
        )
    except subprocess.TimeoutExpired:
        subprocess.run(["pkill", "-9", "-f", "vitest.mjs run"])
        return 99, [], "EXPIRÉ", "", time.monotonic() - debut
    out = p.stdout + p.stderr
    echecs = sorted(set(re.findall(r"(?:FAIL|×)\s+(src/\S+\.test\.tsx?)\s*>\s*(.+)", out)))
    resume = re.search(r"Tests\s+(.*)", out)
    return (p.returncode, echecs,
            (resume.group(1).strip() if resume else "???"), out,
            time.monotonic() - debut)


def main():
    seulement = sys.argv[1:] or None
    resultats = []
    for code, libelle, chemin, avant, apres in MUTATIONS:
        if seulement and code not in seulement:
            continue
        src = open(chemin).read()
        if src.count(avant) != 1:
            print(f"{code}: ANCRE ABSENTE OU AMBIGUË ({src.count(avant)})", flush=True)
            resultats.append({"code": code, "libelle": libelle, "etat": "ANCRE KO"})
            continue
        open(chemin, "w").write(src.replace(avant, apres))
        try:
            rc, echecs, resume, out, duree = lancer()
        finally:
            open(chemin, "w").write(src)
        etat = "EXPIRÉ" if resume == "EXPIRÉ" else ("ROUGE" if rc != 0 else "VERT")
        # Une durée franchement au-dessus de la normale est une information sur
        # le harnais, au même titre que rouge ou vert.
        lent = " ⚠ LENT" if duree > 30 else ""
        print(f"\n=== {code} {libelle} → {etat} ({resume}) [{duree:.0f}s{lent}]",
              flush=True)
        for f in echecs[:25]:
            print(f"    ✗ {f[0]} > {f[1]}", flush=True)
        resultats.append({"code": code, "libelle": libelle, "etat": etat,
                          "resume": resume, "duree_s": round(duree, 1),
                          "echecs": [f"{a} > {b}" for a, b in echecs]})
        with open(os.path.join(os.path.dirname(__file__), "mutants-resultats.json"), "w") as fh:
            json.dump(resultats, fh, ensure_ascii=False, indent=1)
    return resultats


if __name__ == "__main__":
    main()
