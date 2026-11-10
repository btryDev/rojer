# Plan du test de charge — 2026-11-10

Détaille le lot 8 de `docs/plan-performance.md`. Écrit contre la branche `cc`
(e9f34137) : la bascule remplace Supabase Auth par Better Auth, un scénario
écrit pour `main` serait à refaire.

**Principe : un seul jeu de scripts, deux campagnes.** Une partie se joue en
local maintenant ; tout se rejoue sur Clever Cloud après la bascule. Statut :
plan proposé, rien n'est codé, en attente du feu vert et de quatre décisions
(§ 9).

## 1. Les questions auxquelles le test répond

1. Combien d'utilisateurs actifs en même temps une instance sert-elle sans
   dépasser les seuils du § 6 ?
2. Qu'est-ce qui cède en premier : le pool de connexions (`BASE_POOL`, 5 par
   défaut dans `scripts/demarrer-cc.sh`), le fil unique de Node (rendu des
   pages, mise en page des PDF), la base, la mémoire ?
3. Quelle valeur donner à `BASE_POOL` ?
4. Les protections tiennent-elles sous charge : file des exports (1 de front,
   8 en attente, 503 au-delà — `src/lib/exports/limite.ts`), limite de débit,
   aucun P2024 / P2028, aucune erreur 5xx inattendue ?
5. Le serveur tient-il dans la durée (mémoire stable sur 2 h) et se
   remet-il d'une pointe ?
6. Sous charge, chaque utilisateur ne voit-il que son dossier ? (Contrôle à
   coût nul : chaque parcours vérifie le nom de son établissement dans la
   page.)

## 2. Ce que chaque campagne peut dire

| | Local (maintenant) | Clever Cloud (après bascule) |
|---|---|---|
| Comparaison avant/après un changement, régression | oui | oui |
| Ordre dans lequel les écrans cèdent | oui | oui |
| Saturation du pool, réglage de `BASE_POOL` | oui, en tendance | oui, valeur finale |
| Protections (exports, files, erreurs) | oui | oui |
| Nombre d'utilisateurs tenus en production | **non** | oui |
| Latence réelle vers la base, TLS, répartiteur | non (simulée) | oui |
| Cellar réel, dépôts de 15 Mo | non (MinIO) | oui |
| Fichiers statiques servis par Node (plus de CDN Vercel) | partiel | oui |
| Endurance 2 h | réduite (30 min) | oui |
| IP lue derrière le répartiteur (limite de débit) | non | oui |

Trois limites du local, nommées dans chaque rapport :

- k6, l'application et PostgreSQL se partagent le Mac (10 cœurs, 24 Go) ;
- Docker sur Mac passe par une machine virtuelle : disque et réseau plus lents
  qu'un Linux natif ;
- la latence vers la base est nulle en local. Elle est simulée (§ 3), à trois
  valeurs, pour lire une sensibilité et non un chiffre.

## 3. Le banc local

Base : `docker-compose.cc.yml` — même image (`docker/Dockerfile.cc`), même
script de démarrage, même pool que sur Clever Cloud. Un fichier de surcharge
`docker-compose.charge.yml` y ajoute, sans toucher à la pile existante :

- **des limites de ressources sur l'application** (`cpus`, `mem_limit`) calées
  sur la taille d'instance Clever Cloud visée (décision 2). C'est ce qui évite
  de mesurer la puissance du Mac ;
- **Toxiproxy** entre l'application et la base : 0, 2 et 10 ms par
  aller-retour. Le board fait ≈ 105 requêtes : c'est le facteur que le local
  efface. (Le banc est celui que cite déjà le lot 7, audit § 5.1.)
- **MinIO** à la place de Cellar, pour que les dépôts fonctionnent avec
  `STORAGE_DRIVER=s3` — le refus du disque en production n'est pas affaibli.
  À vérifier en C0 : que le contrôle du point d'accès (`CELLAR_ADDON_HOST`)
  accepte un hôte du réseau Docker ; sinon les dépôts sortent de la campagne
  locale et restent pour Clever Cloud.

Base à part (port 5435, `rojer-cc-db`) : ni `duerp-db`, ni GestBAT.
k6 tourne hors Docker (`brew install k6`). Tout le banc tourne **seul** sur le
Mac : aucun build, aucune suite de tests, aucun sous-agent en parallèle.

## 4. Les données et les sessions

Tous les utilisateurs virtuels sur le même dossier donneraient un test faux :
cache de PostgreSQL toujours chaud, verrous sur les mêmes lignes à l'écriture.

- **N comptes, un dossier chacun** (N = 50 par défaut) :
  `scripts/charge/semer-comptes.ts`, bâti sur `scripts/perf/session-mesure.ts`
  et `seed:complet --user`.
- **Tailles mêlées** : 5 gros dossiers (100 équipements, 50 salariés, dix ans
  d'historique), 45 dossiers de démo. `scripts/perf/grossir-dossier.ts` refuse
  aujourd'hui une base à plus d'un établissement : lui ajouter un paramètre
  `--etablissement`, sans dupliquer le script.
- **Sessions créées hors parcours** : le semis écrit un fichier de cookies que
  k6 lit. La connexion est limitée à 30 tentatives par IP et par quart d'heure
  (`LIMITES.connexionIp`) ; 50 connexions depuis une seule machine la
  toucheraient. La limite n'est pas desserrée : la connexion se mesure à part,
  à petit volume (§ 5, H1).
- Aucun e-mail ne part (ni invitation ni réinitialisation dans les parcours),
  Stripe n'est pas appelé.

## 5. Les parcours et les scénarios

### Parcours (mêlés selon ces parts, temps de réflexion de 3 à 10 s)

| Parcours | Part | Étapes |
|---|---|---|
| Consultation | 70 % | board → calendrier → board → équipements → fiche d'un équipement → registre |
| Saisie | 20 % | board → une échéance → dépôt d'un rapport (PDF de 1 Mo) → board ; relevé de température ; clôture d'une action |
| Export | 5 % | registre en PDF, dossier de conformité, ZIP de contrôle |
| DUERP | 5 % | unités → un risque → synthèse |

Fidélité au navigateur : première page en HTML avec ses fichiers statiques,
navigations suivantes en RSC (`_rsc`), comme le fait `mesurer.mjs`.

Les écritures passent par des actions serveur, dont l'identifiant change à
chaque build : le script le relève dans la page au démarrage. Si ce relevé se
révèle fragile (à constater en C3), les écritures passent par le module
navigateur de k6, à peu d'utilisateurs.

### Scénarios

| | Scénario | Forme | Local | Clever Cloud |
|---|---|---|---|---|
| A | Fumée | 1 utilisateur, 1 min | oui | oui |
| B | Référence par page | 1 utilisateur, les 13 pages de `mesurer.mjs`, sans pause | oui | oui |
| C | Montée par paliers | 1 → 5 → 10 → 25 → 50 → 100, 3 min par palier | oui | oui |
| D | Charge nominale | l'objectif (décision 1) tenu 15 min | oui | oui |
| E | Pointe | 0 → 3 × l'objectif en 10 s, puis retour | oui | oui |
| F | Endurance | l'objectif tenu 2 h | 30 min | oui |
| G | Rupture et reprise | montée jusqu'à l'échec, arrêt, mesure du retour à la normale | oui | oui |
| H1 | Connexion | 20 connexions espacées : coût du hachage du mot de passe | oui | oui |
| H2 | Exports de front | 12 exports lancés ensemble : 1 + 8 servis, 503 pour le reste, les autres pages restent servies | oui | oui |
| H3 | Gros dépôts | 5 dépôts de 15 Mo ensemble : mémoire, fichier arrivé entier | si MinIO | oui |
| H4 | Tâches quotidiennes sous charge | `/api/taches/quotidiennes` pendant D | oui | oui |
| H5 | Régénération sous charge | modifier un équipement d'un gros dossier pendant D | oui | oui |
| H6 | Pages publiques | landing, vérification publique jusqu'à sa limite (30 par 10 min) | oui | oui |

Campagne de sensibilité, locale seulement, sur le scénario C : `BASE_POOL`
5 / 10 / 15 × latence 0 / 2 / 10 ms. Neuf passages de 18 min.

## 6. Ce qui est mesuré, et les seuils

Côté k6, par page : débit, temps au 50ᵉ, 95ᵉ et 99ᵉ centile, taux d'erreur.

Côté serveur, sans rien ajouter à l'application :

- connexions occupées et en attente (`pg_stat_activity`), requêtes les plus
  coûteuses (`pg_stat_statements`) ;
- processeur et mémoire du conteneur (`docker stats` en local, métriques
  Clever Cloud ensuite) ;
- blocage du fil de Node : une sonde à 1 requête par seconde sur une page
  légère ; son temps de réponse dit combien la boucle fait attendre ;
- journal de l'application : P2024, P2028, lignes d'`onRequestError`.

Seuils proposés (à recaler après le scénario B, puis figés dans le script) :

| Mesure | Seuil |
|---|---|
| Pages, 95ᵉ centile | < 1 s |
| Board et calendrier, 95ᵉ centile | < 1,5 s |
| Dépôt d'un rapport de 1 Mo, 95ᵉ centile | < 3 s |
| Erreurs (hors 503 d'export et refus de débit attendus) | < 0,1 % |
| P2024 / P2028 | 0 |
| Mémoire en fin d'endurance | stable (pas de pente) |
| Page d'un autre compte servie | 0 |

Le seuil lui-même est éprouvé en le cassant : un passage avec `BASE_POOL=1`
doit sortir rouge.

## 7. Les étapes

| | Étape | Contenu | Où |
|---|---|---|---|
| C0 | Banc | surcharge compose (limites, Toxiproxy, MinIO), semis des 50 comptes, fichier de sessions | local |
| C1 | Fumée et référence | scénarios A et B ; tableau « référence » | local |
| C2 | Lecture | parcours Consultation et DUERP ; scénarios C, D, E | local |
| C3 | Écriture | parcours Saisie et Export ; scénarios H1 à H6 | local |
| C4 | Sensibilité | les neuf passages pool × latence ; scénarios F (30 min) et G | local |
| C5 | Rapport local | `docs/revues/test-de-charge-local-<date>.md`, sorties collées ; chaque défaut trouvé devient un lot à part, hors de celui-ci | local |
| C6 | Campagne Clever Cloud | tous les scénarios, A à H6, endurance de 2 h comprise ; rapport ; `BASE_POOL` arrêté | après bascule |

Une revue indépendante des scripts avant C4 : un test de charge faux rassure à
tort.

## 8. La campagne Clever Cloud

- **Jamais contre une base qui porte des clients.** Cible : une application et
  un add-on PostgreSQL dédiés, de la taille de la production, détruits après
  (décision 3).
- Le semis refuse aujourd'hui toute base non locale. Pour la campagne, il
  admet une base désignée explicitement par une variable, et refuse toujours
  la production.
- k6 part du Mac : la bande passante de la connexion borne les gros dépôts. Si
  elle fausse H3, k6 tourne depuis une petite machine Clever Cloud.
- À demander au support avant : faut-il prévenir d'un test de charge ?
  `max_connections` du plan choisi.
- Vérifications de premier déploiement déjà listées dans
  `docs/etat-bascule-clever-cloud.md` et couvertes ici : rapport de 15 Mo
  entier (H3), IP lue derrière le répartiteur (H6).
- Si plusieurs instances sont prévues : rejouer D et H2 à deux instances (la
  file des exports est par processus).

## 9. Décisions attendues de la propriétaire

1. **L'objectif chiffré.** Proposition : 50 utilisateurs actifs en même temps
   (de l'ordre de 500 à 1 000 comptes clients), aux seuils du § 6.
2. **La taille d'instance Clever Cloud visée**, pour caler les limites du banc
   local. Sans elle : 1 cœur et 1 Go par défaut, à redire dans le rapport.
3. **Application et add-on dédiés au test sur Clever Cloud** (quelques euros,
   détruits après), ou test sur la future production avant son ouverture,
   base vidée ensuite.
4. **Où vit le code** : branche `lot/charge-k6` tirée de `cc`, scripts dans
   `scripts/charge/`.

## 10. Ce que le lot ne fait pas

- Il ne corrige rien : un défaut trouvé devient un lot.
- Il ne mesure pas le navigateur (Web Vitals : lot 7).
- Il ne teste ni le MCP, ni Stripe, ni l'envoi d'e-mails.
- Il n'entre pas dans la CI : trop lourd, et le budget de requêtes
  (`budget-requetes.yml`) y garde déjà la régression.

## 11. Notés en cours de campagne, à traiter plus tard

- [2026-11-10, la propriétaire] Les volumes annoncés par les formules
  (`src/lib/abonnements/formules.ts` : établissements, membres, équipements,
  stockage…) sont-ils tous contrôlés par le code ? À vérifier quota par
  quota, contre `refusQuota` / `refusStockage` et les portes qui créent.
- [2026-11-10] Le ZIP de contrôle embarque tous les fichiers déposés : le
  plafond de stockage (2 Go Essentiel, 6 Go Pro) en fait le pire cas. Non
  mesuré (les rapports semés n'ont pas de fichier réel).
- [2026-11-10, la propriétaire] Le carnet sanitaire ne s'exporte pas seul :
  aucune route d'export ; il n'existe que dans le ZIP de contrôle, en texte
  (`08_Carnet_sanitaire.txt`, `lib/carnet-sanitaire/export.ts`).

## 12. Volumes à conserver et à exporter — questions pour l'équipe (2026-11-10)

[2026-11-10, décision de la propriétaire : **on garde tout, on exporte tout.**
Aucune borne à 5 ans, aucune suppression. Motif : le client type (10
équipements, ≈ 86 rapports par an) n'atteint le seuil du garde-fou qu'après une
vingtaine d'années ; les gros dossiers sont couverts par le garde-fou, le
sous-processus, puis l'archive hybride (point 6). D. 4711-3 est satisfait par
construction. Les points 1 à 5 et 7 sont rayés en conséquence.]

Cadre (API Légifrance en sandbox, recoupé sur code.travail.gouv.fr ; à
confirmer sur Légifrance avant d'écrire une mention) : D. 4711-3 CT — les
cinq dernières années « et, en tout état de cause, ceux des deux derniers
contrôles ou vérifications ». Registre ERP (R. 143-44 CCH) : aucune durée
écrite, pièces permanentes (travaux, consignes, service de sécurité).

1. ~~Export par défaut : 5 dernières années + les 2 derniers rapports de chaque
   contrôle + pièces permanentes.~~ [rayé le 2026-11-10 : on garde tout]
2. ~~Exports de 1 à 4 ans : proposés comme « extrait » marqué, ou retirés ?~~ [rayé le 2026-11-10 : on garde tout]
3. ~~Export de tout l'historique : confort, en tâche de fond ; pas une obligation
   (ERP compris, sous réserve de relire GE 4).~~ [rayé le 2026-11-10 : on garde tout]
4. ~~ZIP de contrôle : même période pour le registre et les fichiers joints.~~ [rayé le 2026-11-10 : on garde tout]
5. ~~Rapport plus ancien que la période dont un point est encore ouvert : il
   reste (justification des travaux, R. 4226-19).~~ [rayé le 2026-11-10 : on garde tout]
6. ~~Archives annuelles (proposition de la propriétaire) : chaque année est
   archivée (ZIP : registre PDF + rapports de l'année) ; l'export ne génère que
   l'année en cours et sert les archives.~~ [2026-11-10, principe posé par la
   propriétaire : UN SEUL registre. L'archive devient hybride : chaque année
   close est figée une fois (volume PDF) ; l'export produit UN document — page
   de garde et sommaire uniques, volumes archivés recollés tels quels, année
   en cours générée, puis ajouts tardifs. Recoller ne refait aucune mise en
   page.] Un rapport déposé après l'archivage de son année apparaît dans la
   partie « ajouts aux années archivées » : aucune archive n'est régénérée.
   À vérifier : R. 143-44 CCH sur le site Légifrance (« un registre »), et
   l'avis du préventeur sur un registre ERP assemblé de volumes annuels.
7. ~~Suppression tous les 5 ans (proposition de la propriétaire), SAUF les 2
   derniers rapports de chaque contrôle et les pièces permanentes (D. 4711-3).
   À dire dans les conditions générales et sur la page du registre. À
   trancher : supprimer les archives seulement, ou aussi les rapports et leurs
   fichiers ? Les archives comptent-elles dans le quota de stockage ?~~ [rayé le 2026-11-10 : on garde tout]
8. Volumes annoncés par les formules : tous contrôlés par le code ? (§ 11)
9. R. 4323-26 CT : pour que le PDF suffise sans le ZIP, imprimer par rapport
   la date de remise et le lieu d'archivage (aujourd'hui : « pièce jointe »
   ou « Sans pièce jointe » seulement). Petit ajout, sans effet sur le volume.
10. Passage à @react-pdf 4.9 (moteur `experimentalPagination`, piste A2) : EN
    RÉSERVE (2026-11-10). À ressortir si (a) le banc avec le sous-processus
    montre des exports de gros dossiers au-delà de ~20 s ou des refus du
    garde-fou trop fréquents ; (b) le journal de production montre des gros
    dossiers fréquents avant l'archive hybride ; (c) une correction de sécurité
    ou de bogue de la bibliothèque impose une mise à jour d'entretien.

Ordre convenu (2026-11-10) : sous-processus (lot/pdf-b1) → vérifications de
build et de banc, nouvelles mesures → fusion dans cc → préproduction Clever
Cloud → suite de la campagne (§ 5) et décisions ci-dessus.

## 13. Préproduction Clever Cloud — à surveiller au premier déploiement (2026-11-10)

Application « Rojer » (app_9bbac77c-af66-4562-81a7-0257a21401ad, zone par),
XS, build dédié M, PostgreSQL 18 XXS Tiny Space, Cellar `rojer-preprod-fichiers`.

1. Build sur M : durée, aucun manque de mémoire (RiskBoard en a eu un en S).
2. Démarrage sur XS : migrations (CC_PRE_RUN_HOOK) puis serveur, sans manque
   de mémoire ; contrôle de santé `/robots.txt` vert. Si XS ne tient pas au
   démarrage : passer l'instance en S (réglage de console, pas de code).
   [La propriétaire, 2026-11-10 : RiskBoard construit plus haut puis tourne en
   XS.]
3. Mémoire au repos sur XS et limite de Node injectée par Clever Cloud :
   `echo $NODE_OPTIONS`, `/proc/<pid>/cmdline`, `process.execArgv`,
   `v8.getHeapStatistics().heap_size_limit`, mémoire du cgroup. Elles calent
   le tas du processus enfant des PDF (lot/pdf-b1).
4. Déploiement volontairement cassé (variable requise retirée) : Clever Cloud
   garde-t-il l'ancienne instance ? Tranche le `process.exit(1)` au démarrage.
5. Tâche planifiée de chaque minute : aucun signalement dans la console
   (RiskBoard dit en avoir eu pour des crons trop fréquents ; la doc CC n'en
   fixe aucune limite).
6. Vérifications déjà listées dans docs/etat-bascule-clever-cloud.md
   (dépôt de 15 Mo, IP derrière le répartiteur, rôle de la base, migrations,
   crontab).
7. PostgreSQL 18 en préproduction, 17 en CI : aligner pour la production.

### Relevés du 2026-11-10 (commit 6cd09e91)

1. Build sur M : 1 min 43, aucun manque de mémoire.
2. Démarrage sur XS : 127 migrations à jour, serveur prêt, `/robots.txt` 200.
3. Mémoire sur XS : 1 076 Mo de RAM, pas de swap, 1 vCPU. Clever Cloud
   injecte `NODE_OPTIONS=--max-old-space-size=644` au serveur (lu dans
   `/proc/<pid>/environ`) : tas limité à 692 Mo. Serveur Next au repos :
   308 Mo résidents (pic 394 Mo) ; 510-530 Mo disponibles. La limite du tas
   du serveur dépasse donc ce qui reste libre : sous forte charge, c'est le
   noyau qui tuerait le processus, pas V8. Pour le processus enfant des PDF
   (lot/pdf-b1) : 256 Mo de tas (environ 340 Mo résidents) tient sur XS,
   320 Mo ne laisse presque rien.
4. Déploiement cassé (`BETTER_AUTH_SECRET` retirée) : le serveur refuse de
   démarrer et nomme la variable ; `/robots.txt` répond 500, Clever Cloud ne
   bascule pas et garde l'ancienne instance (aucune coupure sur 7 min de
   sonde). Mais il relance sans fin : le déploiement est resté « en cours »
   jusqu'à `clever cancel-deploy`. Consigne : un déploiement en cours depuis
   plus de 5 min s'annule et on lit les journaux. Le `process.exit(1)` n'est
   pas nécessaire.
5. Tâche de chaque minute : CMD/CMDEND chaque minute dans les journaux, aucune
   erreur ; un « setuid failed » de cron, sans effet.
6. Fait : 15 Mo déposés intacts, en-tête X-Forwarded-For forgé ignoré, rôle de
   base sans privilège élevé, TLS 1.3, crontab active.
7. Reste une décision : PostgreSQL 18 ou 17 pour la production.
