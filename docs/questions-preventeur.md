# Questions pour le préventeur

Une seule liste de ce que Rojer attend du préventeur (Julien Chantoin). Une
question réglée se raye et se date, avec sa réponse (règle 11 du
`.claude/CLAUDE.md`). Le détail de chaque question vit à l'endroit cité ; ce
document n'est que le sommaire à lui envoyer.

## Ouvertes

### 1. Matières inflammables : qui doit l'alarme, la consigne et les exercices sous 50 personnes ? (2026-10-13)

**La situation.** `R. 4227-34` impose une alarme sonore aux établissements de
plus de cinquante personnes « ainsi que [à] ceux, quelle que soit leur
importance, où sont manipulées et mises en œuvre des matières inflammables
mentionnées à l'article R. 4227-22 ». La consigne affichée (`R. 4227-37`) et
les exercices au moins semestriels (`R. 4227-39`) suivent le même champ. Sous
cinquante personnes, Rojer ne les sert que si le dirigeant répond « oui » à
la question des matières (`manipuleMatieresR422722`) ; le silence les retient
« à confirmer ».

`R. 4227-22` vise les « substances ou préparations classées explosives,
comburantes ou extrêmement inflammables » — l'ancienne classification. La
correspondance avec l'étiquetage actuel (CLP) est publiée : « extrêmement
inflammable » (R12) ↔ H220 (gaz inflammable cat. 1) et H222 (aérosol
inflammable cat. 1) — tableau de Bruxelles-Environnement ; H224 (liquide
inflammable cat. 1) par la même logique, non trouvé noir sur blanc.
Comburant ↔ pictogramme flamme sur un cercle (H270-H272) ; explosif ↔ bombe
qui explose (H200 à H204 ; H205 n'a pas de pictogramme). À la lettre, un aérosol étiqueté H222 — laques,
déodorants, dégrippants, bombes de peinture — entre dans `R. 4227-22`.

Aucune source de prévention trouvée (INRS « Coiffure — risques », guides de
salons, fiches INRS et Cramif sur les aérosols) n'en tire l'alarme, la
consigne et les exercices pour un petit commerce qui pulvérise des aérosols.

**Notre décision (propriétaire, 2026-10-13).** La question est légitime et
reste posée à tout employeur : la cacher par secteur ferait perdre ces
obligations, sans que personne le voie, à l'atelier ou au garage mal classé.
Elle n'est pas passée au niveau audit : les trois obligations restent dues
au-delà de cinquante personnes, et le niveau audit ne sait viser qu'une
obligation entière. Elle est **reformulée pour se répondre étiquette en
main** : pictogrammes et mentions (H220, H222, H224, flamme sur un cercle,
bombe qui explose), exemples (bouteilles de gaz, oxygène, acétylène,
aérosols, certains solvants), lien vers un tableau CLP officiel.

**La question.** « Manipulées **et mises en œuvre** » : pulvériser quelques
aérosols H222 dans la journée (salon, commerce) suffit-il à faire entrer
l'établissement dans `R. 4227-34`, ou le texte vise-t-il un usage de type
procédé (soudure, peinture au pistolet, atelier) ? Selon la réponse, les
aérosols restent ou sortent des exemples de la question.

**Complément du 2026-10-13 — comburants et explosifs.** `R. 4227-34` vise les
« matières **inflammables** mentionnées à l'article R. 4227-22 ». Parmi les
trois classes de `R. 4227-22` (explosives, comburantes, extrêmement
inflammables), seules les extrêmement inflammables — plus les matières
susceptibles d'« inflammation instantanée » — sont des matières inflammables.
**Décision de la propriétaire : on suit la lettre** ; les comburants
(oxygène) et les explosifs sortent de la question. **Question** : partagez-vous
cette lecture, ou l'administration rattache-t-elle aussi les comburants et
les explosifs à `R. 4227-34` ?

Sources : `src/lib/referentiels/corpus/code-travail-matieres-inflammables.ts`,
`code-travail-incendie.ts` ; Bruxelles-Environnement, correspondance R12 ↔
H220/H222 (https://environnement.brussels/media/20620/download) ; INERIS,
tableau CLP 2025.

## Réglées

- ~~Installation frigorifique — « voir les limites » (grille du 30/09, p. 24,
  29, 30) : sortir la catégorie du périmètre ou revoir son bornage ?~~ —
  2026-10-13 : tranché par la propriétaire, « on respecte le périmètre » : le
  froid y reste (contrôle d'étanchéité des fluides frigorigènes, sécurité des
  équipements, `.claude/CLAUDE.md` § Périmètre). Rien ne change.
- ~~Levage « manuel / automatique / semi-automatique » : que change la
  distinction ?~~ — 2026-10-13 : tranché par la propriétaire, son commentaire
  est appliqué depuis le 2026-10-08 (commit 7f8a6433) : l'utilisateur dit si
  l'appareil est manuel (mû par la seule force humaine employée directement)
  ou motorisé — l'automatique et le semi-automatique sont motorisés —, et les
  rythmes de l'arrêté du 1er mars 2004 (art. 20-III et 23) en découlent.
- ~~`PO 1 § 3` applique-t-il AS 9 aux hôtels de 5ᵉ catégorie ?~~ —
  2026-10-08 : sa note « AS9 applicable qu'au ERP N1 à N4 » est suivie
  (décision de la propriétaire : « on respecte les décisions de Julien »).
- ~~Les chiffons imprégnés, p. 35, « à supprimer »~~ — 2026-10-08 : niveau
  audit (ADR-042).
- ~~La formation au risque chimique fondée sur `L. 4141-2`~~ — 2026-10-12 :
  réglé par la propriétaire (rythme vague → au moins annuel, ADR-039).
- ~~L'édition de la NF S 61-919~~ et ~~le texte de la NF C 18-510~~ —
  2026-10-12 : on retient ce qu'il a fourni (août 2001 ; recyclage de trois
  ans).
