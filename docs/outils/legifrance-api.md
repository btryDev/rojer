# Relire le corpus avec l'API Légifrance

`pnpm legifrance:verifier` relit chaque article du corpus
(`src/lib/referentiels/corpus/*.ts`) par l'API officielle Légifrance (DILA,
servie par PISTE) et le compare à ce que le corpus a relevé. Il remplace la
relecture à la main par un outil web qui résume parfois : l'API rend le texte
officiel, pas un résumé.

Il **constate**, il ne corrige rien. Un écart se contre-vérifie sur Légifrance
avant de toucher au corpus, et la correction se trace dans `notesInternes` ou
l'`historique` de l'article, comme toute relecture.

## 1. Inscription PISTE (une fois)

1. Créer un compte sur <https://piste.gouv.fr>.
2. **Accepter les CGU de l'API Légifrance** (menu API → « Consentement CGU
   API »), en bac à sable ET en production. Sans cela : HTTP 403 (FAQ DILA).
3. Créer une application (bac à sable, puis production), et y cocher
   « Légifrance » dans « Sélectionner les API ».
4. Relever, dans l'application → « API souscrites » → « Identifiants OAuth »,
   le `client_id` et le `client_secret`. Ce sont eux, et non la « clé d'API »,
   que le flux `client_credentials` attend.

Les quotas se lisent sur PISTE (onglet Applications) ; ils ne sont publiés en
chiffres nulle part ailleurs. La production a des quotas plus élevés que le bac
à sable, et le bac à sable n'a aucun engagement de service (FAQ DILA).

## 2. Variables

Dans `.env.local` à la racine du dépôt (jamais commité, jamais affiché) :

| Variable | Valeur |
|---|---|
| `LEGIFRANCE_CLIENT_ID` | l'identifiant OAuth de l'application PISTE |
| `LEGIFRANCE_CLIENT_SECRET` | son secret |
| `LEGIFRANCE_ENV` | `sandbox` (défaut) ou `production` |

Le script charge le fichier lui-même (`process.loadEnvFile`) ; `--env-file
<chemin>` en désigne un autre. Aucun message, aucun rapport, aucun test ne
contient une valeur : les erreurs nomment la variable, et tout corps de
réponse repris dans une erreur passe par un masque qui retire l'identifiant,
le secret et le jeton.

Vérifier la présence sans afficher la valeur :

```sh
node -e 'process.loadEnvFile(".env.local"); for (const k of ["LEGIFRANCE_CLIENT_ID","LEGIFRANCE_CLIENT_SECRET","LEGIFRANCE_ENV"]) console.log(k, !!process.env[k])'
```

## 3. Bac à sable ou production

| | Jeton OAuth | API |
|---|---|---|
| `sandbox` | `https://sandbox-oauth.piste.gouv.fr/api/oauth/token` | `https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app` |
| `production` | `https://oauth.piste.gouv.fr/api/oauth/token` | `https://api.piste.gouv.fr/dila/legifrance/lf-engine-app` |

Les identifiants sont propres à chaque environnement : une application de bac à
sable ne s'authentifie pas en production, et inversement (`invalid_client`).

## 4. Commande

```sh
pnpm legifrance:verifier                                 # tout le corpus
pnpm legifrance:verifier -- --ref "R. 4227-26"           # un article (répétable)
pnpm legifrance:verifier -- --corpus code-travail-incendie   # un corpus (répétable)
# options : --env-file <chemin>, --rapport <chemin>, --delai <ms>, --sans-rapport
```

Code de sortie : `0` aucun écart ; `1` au moins un écart, ou une erreur d'API
sur un article ; `2` configuration ou authentification — rien n'a été vérifié.

Rapport : `docs/revues/verification-legifrance-AAAA-MM-JJ.md` pour tout le
corpus, `…-selection.md` pour une sélection (un passage partiel n'écrase pas
le rapport complet du jour).

## 5. Ce que le script fait, article par article

**Trouver l'article.**

- L'`url` porte un `LEGIARTI…` ou un `JORFARTI…` → `POST /consult/getArticle {id}`.
- Sinon, un article de code (« R. 4227-26 », « CCH R. 143-41 »,
  « C. env. L. 512-1 ») → `POST /consult/getArticleWithIdAndNum {id: LEGITEXT
  du code, num: "R4227-26"}`. Le code se lit au préfixe, puis à l'URL, puis à
  l'identifiant du corpus (`code-travail-*`).
- Un article du règlement de sécurité ERP (« PE 4 », « GH U 16 ») ou d'arrêté
  (« Arrêté 2004-03-01 art. 19 ») avec un `LEGITEXT`/`JORFTEXT` dans l'URL
  de l'article ou du corpus → même méthode, avec les graphies possibles du
  numéro (« PE 4 » puis « PE4 », « 1er » puis « 1 »).
- Brochure INRS, règlement européen, annexe, arrêté sans identifiant de texte
  → **non vérifiable**, raison donnée.

Si l'article lu n'est pas la version en vigueur (le corpus pointe une version
ancienne), la version `VIGUEUR` de `articleVersions` est lue à son tour, et
c'est elle qu'on compare.

**Comparer.**

1. *Citation* — la `citationCle` est-elle un extrait exact du texte en vigueur
   (`texteHtml`, sinon `texte`) ? Normalisation, appliquée des deux côtés :
   espaces Unicode (insécables, fines) ; apostrophes et guillemets
   typographiques ; tirets ; espace avant `: ; ! ? )` ; « 1 ° » = « 1° »,
   « 1ᵉʳ » = « 1er », « §3 » = « § 3 ». Les élisions (`[…]`, `(…)`, `…`)
   coupent la citation en fragments qui doivent se suivre dans l'ordre.
   **Ni la casse, ni les accents, ni un mot, ni un chiffre** ne sont
   normalisés — `normalisation.test.ts` l'éprouve en changeant un mot.
2. *Version* — `versionEnVigueur` du corpus = `dateDebut` de la version en
   vigueur ? Si le corpus date une version différée (`VIGUEUR_DIFF`), c'est dit.
3. *Modificateur* — le texte qui a produit la version en vigueur (les
   `lienModifications` dont `dateDebutCible` = `dateDebut`, sens « cible »
   préféré ; à défaut, pour une version unique, le texte porteur) désigne-t-il
   le même texte que `modifiePar` ? Même texte = même `JORFTEXT`, sinon même
   numéro (« 2025-482 »), sinon même nature et même date de signature.
   `modifiePar: null` (« rien à signaler ») n'est contredit que par un lien de
   MODIFICATION, pas par une création. `modifiePar` absent : pas comparé.
4. *Abrogation* — état `ABROGE`, `ABROGE_DIFF`, `TRANSFERE`, `PERIME`,
   `ANNULE`, `DISJOINT`, ou aucune version en vigueur.

**Rythme.** Un appel au plus toutes les 300 ms (`--delai`), en série ; jeton
mis en cache et renouvelé 60 s avant son expiration ; un 401 renouvelle le
jeton une fois ; 429 et 5xx repris trois fois au plus (`Retry-After` respecté,
sinon 1 s, 2 s, 4 s). Un même article présent dans deux corpus n'est lu
qu'une fois.

## 6. Lire le rapport

| Catégorie | Ce qu'elle dit | Écart ? |
|---|---|---|
| abrogé / transféré | l'article n'a plus de version en vigueur | oui |
| introuvable | l'identifiant du corpus ne rend rien, ou l'article de code n'existe pas en vigueur | oui |
| écart de citation | au moins un fragment n'est pas dans le texte ; le diff le montre | oui |
| version différente | la date de la version en vigueur n'est pas celle du corpus | oui |
| modificateur différent | le texte modificateur n'est pas celui du corpus | oui |
| non vérifiable | pas de chemin vers l'article dans l'API, ou erreur d'API | non |
| OK | tout ce qui a pu être comparé concorde | non |

Un article prend la catégorie la plus grave de ses constats ; le tableau des
compteurs donne aussi le cumul. Les écarts sont classés : gravité, puis
articles `retenu` (qui fondent une obligation) d'abord, puis nombre de
constats, puis distance de la citation.

Le diff : `[-mot-]` est dans le corpus seulement, `{+mot+}` dans le texte
officiel seulement. « aucun passage proche » : plus de la moitié des mots du
fragment diffèrent — la citation vient d'ailleurs (autre article, autre
version, paraphrase).

« OK » ne vaut que pour ce qui a été comparé : la ligne du tableau marque
d'un « — » la comparaison qui n'a pas pu se faire (pas de `citationCle`, de
`versionEnVigueur`, de `modifiePar`).

## 7. Points ouverts

- **Sens des liens de modification.** Le Swagger ne documente pas les valeurs
  de `linkOrientation` ni de `linkType`. Le filtre retient les liens datés de
  la version en vigueur, « cible » de préférence ; à confirmer sur les
  premières réponses réelles, et à corriger dans `modificateursCourants` si
  les « modificateur différent » du premier passage le démentent.
- **Articles d'arrêtés par numéro.** `getArticleWithIdAndNum` est documentée
  pour un `LEGITEXT` ; son comportement avec un `JORFTEXT` ou sur le
  règlement ERP n'est pas documenté. Sans résultat, l'article est « non
  vérifiable », jamais « introuvable ».
- **Version différée.** La même méthode ne trouve pas un article qui a une
  version en vigueur différée (limite écrite au Swagger) : un article de code
  « introuvable » peut en relever — le constat le rappelle.

## Sources lues (2026-09-27)

- FAQ API Légifrance : <https://www.legifrance.gouv.fr/contenu/pied-de-page/foire-aux-questions-api>
- Exemples d'utilisation de l'API (DILA, 17/09/2025) : <https://www.legifrance.gouv.fr/contenu/Media/Files/pied-de-page/exemples-d-utilisation-de-l-api.docx>
- Open data et API : <https://www.legifrance.gouv.fr/contenu/pied-de-page/open-data-et-api>
- Contrat Swagger Légifrance 2.4.2 (tel que publié sur PISTE, recopié par pylegifrance) : <https://raw.githubusercontent.com/pylegifrance/pylegifrance/main/pylegifrance/models/generated/legifrance.json>
