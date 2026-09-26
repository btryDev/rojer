# Décisions en attente — dossier pour une séance courte

Préparé le 2026-09-20 au soir. Chaque ligne : l'enjeu, les options, une
recommandation, et ce que la réponse déclenche. **Rien ici n'est décidé.** Les
faits cités viennent du dépôt (`docs/chantiers-ouverts.md`, le corpus, les ADR) ;
là où je n'ai pas relu le point ce soir, c'est écrit.

Répondre « ok comme recommandé » à une ligne suffit.

## A. Ce qui change ce que le dirigeant voit

| # | Décision | Options | Recommandation | Ce que ça déclenche |
|---|---|---|---|---|
| **A1** | **Qu'est-ce que « la cible » ?** `CATEGORIES_COUVERTES = ["N5"]` dit 5ᵉ catégorie ; l'ADR-031 dit qu'un restaurant de 3ᵉ catégorie « reste dans la cible ». Les deux cohabitent. | (a) La cible COUVERTE est la 5ᵉ ; les catégories 1 à 4 sont servies et annoncées comme partielles. (b) Couvrir aussi la 4ᵉ (restaurant de 200 à 300 personnes). | **(a)**, et amender la phrase de l'ADR-031 : « servi » n'est pas « couvert ». (b) suppose de dépouiller le Livre II en entier. | Rien à coder. Quatre lignes du registre (`GZ 13`, `GZ 14`, `AS 10`, `MS 71`) restent « hors cible ». |
| **A2** | **ADR-037 — la page « Quand ça arrive »** (`lot/surface-evenementiel`). Quatre questions y sont posées. | Voir son § 7. | **Les quatre telles que recommandées** : sous « À faire » ; sans les ponctuelles ; sans journal de faits ; la page d'abord, les neuf obligations ensuite. | Je code la page, puis un lot de lecture pour les neuf articles. |
| ~~**A3**~~ **FAIT le 2026-09-21** | ~~**`PE 27 § 5`**~~ — encodé, avec le § 4 (consignes affichées) trouvé en ouvrant l'article ; rien ne le bloquait, ce n'était pas une décision | — instruire le personnel d'un ERP de 5ᵉ catégorie aux conduites à tenir en cas d'incendie. Seule obligation manquante que RIEN ne bloque. | Encoder / attendre. | **Encoder**, après relecture de l'article sur sa page propre. État permanent, sans rythme (le texte n'en écrit pas). | Une ligne de plus dans « Ce qui doit être en place » pour tout ERP de 5ᵉ catégorie ; nouvelle version du référentiel. |
| **A4** | **Matières inflammables.** L'attribut `manipuleMatieresR422722` sert `R. 4227-34` (« manipulées ET mises en œuvre »). `R. 4227-22` vise plus large (« entreposées OU manipulées ») et fonde quatre états permanents non portés, dont `R. 4227-26` (chiffons gras) qui touche toute cuisine. | (a) Élargir la question existante. (b) Une seconde question, distincte. (c) Ne rien poser, annoncer le manque. | **(b), plus tard** — élargir (a) ferait entrer dans `R. 4227-34` des établissements qu'il ne vise pas. En attendant **(c)**. Ne pas poser la question à l'accueil : le silence n'y retire rien à personne aujourd'hui. | (b) = une migration additive et cinq obligations à lire. |
| **A5** | **Les hôtels** (`PO 1 § 3`, `PO 7`, `PO 12`) : trois obligations encodables, hors cible. `PO 7` est chiffrée (deux séances d'instruction par an). | Encoder / laisser. | **Laisser, après la cible.** Le produit sert les hôtels (ADR-031) mais ne les vise pas ; les encoder est honnête et non prioritaire. | — |

| **A6** *(ajoutée le 2026-09-21)* | **`GN 10` : le règlement ERP « ne s'applique pas aux établissements existants »**, sauf administratif, contrôles, vérifications et entretien. Jamais ouvert avant ce jour. Presque toutes les obligations ERP de Rojer sont des vérifications ou de l'entretien : elles valent pour tous. **Cinq n'en sont pas** : consignes affichées et personnel instruit (`PE 27` § 4 et § 5, encodées le 21, non déployées), consigne dans les chambres (`PE 33`) et plans affichés (`PE 35`) des établissements à sommeil — en production —, présence d'une personne qualifiée (`EL 18`, 1ʳᵉ et 2ᵉ catégories). ~~Un restaurant ouvert avant l'entrée en vigueur de la disposition n'y est pas tenu de plein droit.~~ *(2026-09-26 : c'est une lecture de `GN 10`, qui ne date pas l'« existant ».)* | (a) Les servir à tous, en le disant dans leur description — l'état actuel. (b) Demander la date d'ouverture (le champ `dateAutorisationOuverture` existe, le moteur ne le lit pas) et relever la date d'entrée en vigueur de chaque paragraphe. (c) Retirer ces lignes. | **(a) maintenant, (b) ensuite.** Sur-appliquer se VOIT — le dirigeant lit la ligne et peut dire « je n'y suis pas tenu » ; retirer se tairait. Mais (b) est la vraie réponse, et elle conditionne le § 6 de `PE 27` (plan d'intervention à l'entrée), que je n'encode pas d'ici là. | ~~(b) = cinq dates à relever~~ — **relevées le 2026-09-21** : les quatre dispositions de 5ᵉ catégorie datent du **27 août 1990**, `EL 18` d'avril 2002 au plus tard. La sur-application ne concerne donc que les établissements ouverts avant 1990 et jamais modifiés : **l'enjeu est faible, (a) suffit probablement.** Le § 6 de `PE 27`, lui, ne vaut pour tous les établissements que depuis le **1er janvier 2026** : ne pas l'encoder. **[2026-09-26 — une nuance à peser avant de trancher : `GN 10`, relu en entier, ne DATE pas l'« établissement existant ». Le rattacher à l'entrée en vigueur de chaque disposition (27 août 1990, arrêté du 22 juin 1990 qui approuve le type PE) est une lecture raisonnable, pas une phrase du texte. Les descriptions de `PE 27` § 4 et § 5 ne l'affirment plus : elles citent `GN 10` et la date du type PE, sans conclure.]** |

## B. Le module de vigilance des prestataires

| # | Décision | Options | Recommandation | Ce que ça déclenche |
|---|---|---|---|---|
| **B1** | **Dans le périmètre, ou non ?** Le chapitre est en huitième partie du code (travail illégal), et `CLAUDE.md` écarte le « RH non-SST ». Le produit a pourtant un module entier et une vingtaine de citations. | (a) L'assumer. (b) Déclarer le module « hors référentiel », comme le plan de prévention. | **(a).** Le module existe, il sert, et le retirer du discours ne retire pas les citations. | `CLAUDE.md` le dit ; les trois manquantes `relation_tiers` deviennent une question de modèle (un porteur « contrat »), à instruire. |
| **B2** | **La date qui pilote les six mois** (`D. 8222-5`). Aujourd'hui `prestataire.updatedAt` : remis à zéro à chaque retouche de la fiche, donc l'alerte n'arrive jamais. L'écran le dit depuis le 2026-09-02 — c'est un palliatif. | (a) Un champ « attestation remise le ». (b) Deux champs : remise ET émission (le texte exige aussi une attestation de moins de six mois). | **(b)**, deux `DateTime?` nullables, la borne actuelle servant de repli tant qu'ils sont vides. | Une migration additive. **C'est la seule ligne de ce dossier qui écrit en base.** |
| **B3** | **Un assureur peut-il resserrer un rythme du référentiel** (`renforce_periodicite`), ou seulement ajouter une échéance (`obligation_sur_mesure`) ? Relevé par toi le 2026-09-17. | Les deux / l'ajout seul. | **L'ajout seul.** Un assureur ajoute une exigence ; laisser sa demande modifier le rythme d'une obligation légale brouille ce que l'ADR-032 tient à séparer. | Une restriction de formulaire et un test. |

## C. Ce qui demande un geste de ta part, pas une décision de fond

| # | Sujet | Ce qu'il faut | Recommandation |
|---|---|---|---|
| **C1** | **`GHW`** (classe d'IGH qui n'existe pas au CCH). Le retrait de la valeur attend de savoir si des dossiers la portent. | Une lecture en production : `SELECT count(*) FROM "Etablissement" WHERE "classeIgh" = 'GHW';` | **L'exécuter toi-même**, ou me l'autoriser nommément. Zéro ligne ⇒ je prépare la migration de retrait. |
| **C2** | **M2 de l'audit** — compter les lignes touchées par le déploiement du 11 au 14 septembre. | Une lecture en production. | **Abandonner**, et l'écrire : l'intérêt a baissé chaque jour depuis, et M1 (la cause) est déjà déclarée invérifiable. |
| **C3** | **Les cinq décisions de l'audit du 2026-09-19** (ce que voit un signataire ; permis « en cours » signable ; débits 10/h et 20/h ; un jeton émis bloque la suppression dure ; la règle du statut réalisé non étendue aux lignes archivées). Déjà en production, jugées justes par la relecture neutre. | Un mot. | **Les confirmer en bloc.** La cinquième est la moins solide ; son raisonnement est écrit dans `reouvrirSansRapportRealise`. |
| **C4** | **Vercel.** `MCP_ETABLISSEMENT_ID` pointe un établissement supprimé ; le stockage des fonctions est à 24,7 Go pour 10. | Deux réglages au tableau de bord. | Corriger la variable ; purger les anciens déploiements. |

## D. Non relu ce soir — à instruire avant de te le soumettre

**[2026-09-26 — instruits tous les quatre** par une autre session
(`revue/sujets-d`, `6ce3a0a`, rapport `docs/revues/instruction-sujets-D-2026-09-26.md`).
**Aucun n'est une décision de la propriétaire** : trois se tranchent sur le
texte, le quatrième sur la charte. Ce qui reste, et qui le porte :]

- **La portée de `CH 57` / `CH 58` en 5ᵉ catégorie** — EXAMINÉE le 2026-09-26,
  bornage tenté puis ANNULÉ après contre-lecture (journal C25) : la ligne reste
  servie à tous les ERP, en sur-application assumée comme ses dix sœurs du
  Livre II. **Question de lecture, à trancher sur pièces** : `PE 20` § 2 et
  `PE 15` § 1 renvoient au chapitre V (chauffage) et X (cuisines) du livre II
  pour la « mise en œuvre » des installations — ce renvoi emporte-t-il leurs
  vérifications ? La réponse décide ensemble de `CH 58` et des `GC` en N5.
  La scission ramonage / vérification vient après.
- ~~Motif faux de `PE 31` au corpus~~ — rayé le 2026-09-26.
- ~~**La divergence sur `R. 146-35` CCH** entre les deux PDF~~ — FAIT le
  2026-09-26 par la session `rojer-outils-62`, branche
  `lot/sorties-sans-equipement-et-igh` (`572675c`), NON FUSIONNÉE, contre-lecture
  en cours : `R. 143-44` cité aux seuls ERP, `R. 146-35` aux seuls IGH avec son
  débiteur (le propriétaire).
- ~~**La règle de fusion « la plus ancienne »** de deux lignes de
  calendrier.~~ — CLOS le 2026-09-26 : conforme à `R. 4222-20` (« l'ensemble »)
  et à `PE 4` § 2 (« tous les trois ans au plus »), l'erreur va vers « à
  refaire ». Gardée telle quelle.
- ~~**§ 15** — un dossier qui n'a rien déclaré rend des listes vides sans le dire~~ —
  FAIT le 2026-09-26, même branche, même état : « Aucun équipement en service
  n'est déclaré pour cet établissement. » dans le ZIP, les deux PDF et
  « Préparer un contrôle ».
- **Ce que ce lot a vu et laissé, à reprendre** : un dossier vide sort encore
  « 100/100 » ; le PDF du dossier cite l'arrêté du 25 juin 1980 à un non-ERP ;
  le registre PDF parle de « la commission de sécurité » à un non-ERP et garde
  l'injonction « Déclarez vos équipements… » ; la phrase de `.claude/CLAUDE.md`
  sur l'onboarding (l. 597) est périmée — trois étapes, aucune ne déclare
  d'équipement. La prémisse était
  fausse (un dossier vierge rend 4 à 6 lignes) ; la charte tranche
  (interdit 15) : dire « aucun équipement déclaré » comme un fait, jusque dans
  le ZIP et les PDF.
- **À reverser au corpus** : ~~le verbatim de `PE 20` § 2~~ (consigné le
  2026-09-26), la liste complète de `PE 4` § 2 (reste à relever).

Je ne formule pas de recommandation sur ces quatre-là sans avoir rouvert le code
et les textes : ce serait deviner.
