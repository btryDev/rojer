# ADR-032 — Une demande d'assureur entre, et elle ne devient jamais du droit

- **Statut** : acceptée, 2026-09-01 (réunion d'équipe)
- **Portée** : `prisma/schema.prisma` (`SourcePrescription`),
  `src/lib/prescriptions/sources.ts` (l'enum, le prédicat et les trois
  formulations du marquage, en module feuille), `src/lib/matching/prescriptions.ts`,
  et **toutes** les surfaces qui affichent une échéance : calendrier, fiche de
  vérification, registre et dossier de conformité (PDF), ZIP de contrôle, écran
  et formulaire des prescriptions, **widget d'échéances du tableau de bord** et
  **serveur MCP** (`src/lib/mcp/queries.ts`). Ces deux dernières ont été ajoutées
  après coup, le 2026-09-01 : « le marquage n'est pas optionnel » ne souffre pas
  d'exception, et une requête distincte de celle du calendrier est exactement
  l'endroit où l'exception s'installe sans bruit
- **Amende** l'ADR-035 (prescriptions particulières) · **Découle de** l'ADR-025

## Le problème

Un assureur impose des vérifications que le droit n'impose pas — extincteurs
plus fréquents, thermographie annuelle, contrôle de hotte au-delà du rythme
réglementaire. C'est fréquent en restauration et en commerce, et le dirigeant qui
les oublie perd sa garantie, ce qui lui coûte plus cher qu'un rappel de
l'inspection.

Le produit n'avait aucun endroit pour les recevoir. Pire : il **s'interdit par
construction** de traiter les référentiels privés comme des sources opposables —
CACES, recommandations CNAM, APSAD, NF, INRS — et il a raison de le faire. Un
guide commercial soumis cette semaine présentait des recyclages CACES
quinquennaux comme des obligations : c'est faux, et c'est précisément le genre
d'affirmation que le dépôt refuse de porter.

L'ADR-035 fonde les prescriptions particulières sur des **actes d'autorité
opposables** : arrêté préfectoral, arrêté municipal, PV de commission de
sécurité, arrêté ICPE, inspection du travail. Une demande d'assureur n'en est
pas un. Elle est contractuelle.

## La décision

**Une sixième source existe, `demande_assureur`, et elle est marquée
contractuelle partout où elle se montre.**

Ce qui la rend acceptable, c'est que la distinction est déjà pratiquée ailleurs
dans le produit : la page des permis de feu et l'export du dossier de contrôle
distinguent explicitement la règle APSAD du droit. On étend une pratique
éprouvée, on n'en invente pas une.

- **Le mécanisme ne change pas.** La demande entre comme une
  `PrescriptionParticuliere` — même XOR, même génération d'échéances par le
  générateur, même idempotence (ADR-012). Le produit sait déjà faire naître une
  ligne de calendrier d'une prescription ; il n'y a rien à ajouter.
- **Le marquage n'est pas optionnel.** Partout où la ligne s'affiche —
  calendrier, registre, PDF, ZIP de contrôle — elle porte « engagement
  d'assurance, pas une obligation légale ». Une échéance contractuelle qui se
  présente comme réglementaire est exactement l'erreur que l'ADR-035 voulait
  empêcher ; c'est le marquage, et lui seul, qui la retient.
- **Aucune référence légale.** Une prescription d'assureur ne cite pas d'article,
  et le produit ne doit pas lui en chercher un pour faire bonne figure.

**L'amendement à l'ADR-035 tient en une phrase** : les sources d'une prescription
ne sont plus exclusivement des actes d'autorité ; une source contractuelle
existe, et le produit la sépare visuellement du droit au lieu de la refuser.

## La ligne qu'on ne franchit pas

Une source contractuelle **par acte reçu**, jamais un référentiel privé encodé.
La différence est nette : l'assureur d'un dirigeant lui a écrit quelque chose, et
le dirigeant le saisit. Le jour où quelqu'un proposera d'encoder « le référentiel
APSAD R4 » comme un domaine d'obligations, la réponse est non — et cette ADR est
la raison.
