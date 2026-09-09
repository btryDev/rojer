# Constats sur le calendrier — 2026-09-09

Base : `main` = 4f9c717. Rien n'est corrigé. Rien n'est en production (prod fictive).
À consolider avec l'audit neutre de `rojer-outils-ee`, en cours.

## Les trois acquis (revue + contre-expertise `rojer-outils-30`)

**A — Le garde-fou d'applicabilité est au mauvais grain.** `generateur.ts:877-881`
teste `obligationId` alors qu'une ligne est identifiée par obligation ET porteur.
Une ligne dont le porteur a disparu est GELÉE si l'obligation vit encore ailleurs :
ni archivée, ni supprimée, ni relancée, et comptée en retard indéfiniment.
Cas : deux extincteurs dont un retiré ; équipement supprimé puis recréé ; salarié
désactivé. Le bouton de suppression promet pourtant « ne génère plus d'échéance ».

**B — `datePrevue` est stockée sans son origine.** `generateur.ts:821-829`. Sur un
cycle ouvert, corriger une périodicité au référentiel ne recalcule pas la date :
« en retard » pour un contrôle non dû, ou annoncé trop tard dans l'autre sens.
23 périodicités modifiées depuis le 2026-08-15. ADR-012 l.129 et l.132 se
contredisent sur ce cas.

**C — Un identifiant qui change casse la continuité.** Archivage + création d'une
ligne neuve urgente ; l'état acquis n'est pas reporté. Déjà documenté comme
« un manque, pas une décision » (ADR-022 l.304-318). `absorbePar` n'a aucun lecteur.

**Verdict de la contre-expertise : DEUX causes (A+C = le grain ; B = la date sans
origine), aucune migration nécessaire, pas de refonte.** Une décision revient à la
propriétaire : quand N lignes d'équipement sont absorbées par une ligne
d'établissement, laquelle garde l'état ?

## Les six de l'audit `rojer-outils-31`

1. **Régime établi : jamais relancé.** La page ne régénère que si le calendrier est
   vide ou désynchronisé. Un dossier immobile garde « conforme » indéfiniment. Et
   deux surfaces divergent : en-tête et score = 0 en retard ; grille et pastilles =
   un rendez-vous rouge.
2. **Ligne « mise en service » : retard inventé dès la création.** Créée
   `a_planifier` non urgente, la réconciliation suivante — le jour même — la passe
   `depassee`. Les lecteurs la comptent en retard dès le passage 1 (4170 j pour une
   MES de 2015). `estUrgent` n'est pas persisté : le correctif change un champ que
   personne ne lit. Idempotence rompue entre passage 1 et 2.
3. **Dérive d'un jour** sur les périodicités longues (bissextiles) : annuelle
   2023-03-01 → 2024-02-29 ; quadriennale toujours un jour trop tôt. ADR-011 promet
   l'inverse. Sens conservateur. `ajouterJours` local viole la règle 1 d'ADR-011.
4. **Deux règles de retard selon le porteur.** Le jour de l'échéance : ligne de
   titre = `depassee`, ligne d'équipement = non. Contre la règle fondatrice de
   `retard.ts` (« une échéance datée d'aujourd'hui n'est jamais en retard »).
5. **16 garde-fous sur 32 restent verts quand on les retire**, dont
   `assertEtablissementOwnership` et le scoping `entreprise.userId` de trois
   lectures. Le CODE est juste ; c'est le faux Prisma des tests qui ignore les
   `where`. Le calendrier n'a aucune suite qui tente la traversée entre clients.
6. **Fenêtre de concurrence** (raisonné, non exécuté) : le plan est calculé hors
   transaction. Un rapport déposé pendant une régénération peut être écrasé ; une
   action corrective créée sur une ligne à supprimer est emportée par la cascade.

**Verdict : pas de refonte.** Trois causes locales (déclencheur absent en régime
établi ; périodicité MES non distinguée ; arithmétique en jours + comparaisons
d'instant brut), plus un montage de test et une fenêtre lecture-écriture.

## Ce qui est sain, nommément

Idempotence à partir du 3e passage ; archivage cohérent à l'écran ; cloisonnement
correct dans le code ; `cleDeLigne` unique des deux côtés ; salarié inactif traité
conformément au RGPD ; les 10 autres garde-fous purs de `generateur.ts` rougissent.

## Les sept de l'audit `rojer-outils-ee` (axes non couverts, sur BASE RÉELLE)

**1. GRAVE, EXÉCUTÉ — un rapport déposé pendant une régénération perd sa
réalisation.** L'`update` (`actions.ts:337-349`) réécrit `dateRealisee: null,
statut: depassee` par-dessus le dépôt. Le rapport survit, la réalisation non, et
aucun code ne la redérive depuis `rapports`. Résultat : « dépassée » avec un
rapport conforme attaché, à perpétuité.

**2. GRAVE, EXÉCUTÉ — une action corrective créée pendant une régénération qui
supprime la ligne disparaît par cascade.** `deleteMany` (`actions.ts:305-307`) ne
revérifie pas l'absence de preuve. C'est mot pour mot ce que l'ADR-012 déclare
impossible : « Aucune action corrective, aucun rapport ne peut plus disparaître
par effet de bord d'une régénération ».

**CAUSE COMMUNE, UNE SEULE** : le plan est calculé sur une lecture puis écrit en
aveugle (`update` par id, `deleteMany` par id), sans que l'écriture reteste ce qui
a été lu. Aucun verrou nulle part.
**Correctif chiffré** : écritures conditionnées sur ce que le plan a lu
(`updateMany` avec les valeurs lues en `where`, `deleteMany` avec
`rapports: none, actions: none`), comparer les `count` au plan, relancer si écart
— la régénération est idempotente, relancer est gratuit. **Périmètre :
`actions.ts` seul + un test de 20 lignes.**

**3. MOYEN — une ligne saine est « dans les 30 jours » sur trois surfaces et
absente sur deux.** Deux classifieurs sur la même ligne (`repartirVerifications`
vs `lecturesCalendrier`). ADR-011 promet que toutes les surfaces affichent le même
compte.

**4. MOYEN — une ligne archivée est muette partout sauf sur sa fiche et dans le
MCP**, qui répondent « en retard » sur une obligation qui ne s'applique plus. Le
marqueur d'archivage est lu par deux lecteurs sur cinq.

**5. MOYEN, LU — un échec de régénération fait échouer le dépôt d'un rapport déjà
commité.** Pas de try/catch dans `rapports/actions.ts:192,253` ni
`prescriptions/actions.ts`. L'utilisateur redépose et obtient deux rapports.

**6. FAIBLE — une action ouverte compte comme « preuve »** (`actions.ts:228`) alors
qu'elle n'atteste d'aucun contrôle : ligne gelée « dépassée » comptée en retard.

**7. FAIBLE — « régime établi = zéro écriture » est faux** : le repère de version
est toujours poussé, `Etablissement.updatedAt` bouge à chaque régénération.

**Sain, en plus** : deux régénérations simultanées sur base vide (0 doublon) ;
`cleDeLigne` unique ; `porteeBatiment` à quatre sites exactement ; les contraintes
SQL ; `empreinteReferentiel` couvre `premierDelai` ; cloisonnement de la
régénération correct.
