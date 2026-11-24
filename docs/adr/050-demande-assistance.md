# ADR-050 — Une demande d'assistance s'enregistre là où le doute naît, ~~et ne part pas encore~~ [2026-11-24 : et part par e-mail]

- **Statut** : acceptée, 2026-10-24 — décisions de la propriétaire du même
  jour (« Besoin d'aide ? » : texte adapté à l'endroit, formulaire dans Rojer
  plutôt qu'un renvoi vers btry.fr, « on raccordera les mails plus tard »).
  **Amendée le 2026-11-24** (ci-dessous).
- **Écrite après coup** : la revue high du lot a relevé que la table était
  entrée sans ADR ni ligne de rétention (CLAUDE.md, règles 3 et 9).

## Amendement du 2026-11-24 — une entrée pour tous, la réponse par e-mail

Décisions de la propriétaire du 2026-11-24, prises sur les maquettes de
l'Assistance. **La prémisse tombée** est celle du § 3 : l'envoi d'e-mails est
en service (Mailpace, `lib/email`), le formulaire de contact du site l'emploie
déjà. Repartir de zéro (CLAUDE.md, règle 13) a été comparé : un fil de
conversation dans Rojer (questions et réponses lues dans l'application) a été
maquetté puis écarté — sans écran pour l'équipe, il faudrait un outil de plus
rien que pour répondre, et un fil incite à discuter quand une question suffit.

1. **Une seule entrée « Assistance »**, pour toutes les formules : la tuile du
   pied de rail (et la feuille du téléphone) mène à la page
   `/etablissements/[id]/assistance`, au lieu d'ouvrir le panneau « Aide ».
   Elle emporte la page d'où l'on vient (`?depuis=`), envoyée avec un problème
   technique. Le tableau de bord y mène aussi (« Poser une question »).
2. **Les sujets suivent la formule** (`assistance/libelles.ts`) :
   - les questions de **prévention** (rapport de contrôle, commission de
     sécurité, DUERP, prestataire, sujet que Rojer ne suit pas) sont réservées
     à la **formule Pro** — un abonnement ouvert dont la formule compte des
     heures avec l'expert (`assistanceProOuverte`, même règle que le
     connecteur de l'ADR-062) ;
   - les sujets de **l'application** (un écran, la connexion, l'abonnement,
     autre chose) sont ouverts à toutes les formules et à l'essai ;
   - la **visite sur place, sur devis** (`diagnostic`) reste ouverte à tous
     là où un encart la propose (légionelles, accessibilité, doute sur place,
     refus à l'entrée) ; en Pro, la page la propose aussi.
   L'action refuse une question de prévention sans la formule Pro ; un encart
   de prévention présente la formule au lieu du formulaire.
3. **La demande part par e-mail** vers la boîte de Rojer (`CONTACT`), l'adresse
   de la personne en `Reply-To` ; **la réponse se fait par e-mail**, mise en
   page comme les e-mails du compte (`htmlMailAssistance`). Pas de fil dans
   Rojer. La ligne `DemandeAssistance` est écrite avant l'envoi, pour compter
   au plafond du jour dès l'envoi ; un envoi impossible la retire et le dit.
   Pour un problème technique seulement, le navigateur (`User-Agent`) part
   dans l'e-mail, jamais en base.
4. **Le téléphone n'est plus demandé** ; la colonne garde les demandes
   passées. Le formulaire et les encarts ne nomment ni BTRY ni « l'expert » :
   la réponse vient de Rojer.
5. Le rendez-vous annuel de la formule Pro viendra avec sa propre décision
   (tables et règle « un par an et par compte »).

## Décision

1. **Un composant, trois formes** (`DemandeAide`) : ~~la tuile « Aide » du rail,
   en permanence ;~~ [2026-11-24 : l'entrée permanente est la page
   « Assistance », `LienAssistance` — amendement, § 1] un encart ou un lien d'une ligne, au texte adapté, aux
   seuls endroits où l'outil s'arrête (refus à l'entrée, écart majeur,
   commission de sécurité, légionelles, accessibilité sans Ad'AP, « Ce que
   Rojer ne couvre pas », cotation qui s'écarte du repère, « Je ne sais
   pas », point en retard, catégorie du SSI). Le bouton ne nomme personne ;
   ~~le formulaire dit que les experts de BTRY Solution répondent~~ [2026-11-24 :
   le formulaire ne nomme personne non plus — amendement, § 4].
2. **La demande est en base** (`DemandeAssistance`) : l'utilisateur
   (`userId`), l'établissement s'il est du compte (donné, ou lu dans la page),
   la catégorie, la question, ~~un téléphone facultatif~~ [2026-11-24 : plus
   demandé], la page et ce qu'elle
   regardait. RLS activée, bornes en CHECK, dix demandes au plus par jour et
   ~~par utilisateur~~ [2026-11-03, ADR-054 : par compte — relevé à la revue
   du 2026-11-24]. Les champs cachés se tronquent au lieu de refuser.
3. ~~**Rien ne part.** L'envoi par e-mail est gelé (`lot/email-smtp`) ; d'ici
   là, les demandes se relèvent en base. Aucun écran de lecture : il
   supposerait un rôle d'administrateur, qui n'existe pas.~~ [2026-11-24 : la
   demande part par e-mail, la réponse aussi — amendement, § 3. Toujours aucun
   écran de lecture.]
4. **Données personnelles** : le message ~~et le téléphone~~, saisis par
   l'utilisateur pour être recontacté (base légale : sa demande, mesures
   précontractuelles — 6.1.b). Conservation : **trois ans à compter de la
   demande**, durée **proposée, à valider par la propriétaire** ; aucune purge
   automatique n'existe encore (dette). Suppression en cascade avec
   l'établissement ; une demande sans établissement (née d'un refus à
   l'accueil) reste rattachée au seul `userId`.

## Conséquences

- Migration additive `20261024191932_demande_assistance`.
- [2026-11-24] Migration additive `20261124150000_assistance_sujets_application` :
  trois valeurs d'enum (`ecran`, `connexion`, `abonnement`).
- Le « Prendre rendez-vous » du registre (lien sortant vers btry.fr) passe
  par ce composant.
- À faire : ~~brancher l'envoi quand le driver e-mail existera~~ [2026-11-24 :
  fait, amendement § 3] ; une purge à trois ans ; ~~la création d'établissement
  refusée DANS l'app n'a pas encore son encart~~ [2026-11-24 : l'encart du refus
  à l'entrée existe (`WizardShell`), sujet « visite sur place, sur devis »].
