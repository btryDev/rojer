# ADR-050 — Une demande d'assistance s'enregistre là où le doute naît, et ne part pas encore

- **Statut** : acceptée, 2026-10-24 — décisions de la propriétaire du même
  jour (« Besoin d'aide ? » : texte adapté à l'endroit, formulaire dans Rojer
  plutôt qu'un renvoi vers btry.fr, « on raccordera les mails plus tard »).
- **Écrite après coup** : la revue high du lot a relevé que la table était
  entrée sans ADR ni ligne de rétention (CLAUDE.md, règles 3 et 9).

## Décision

1. **Un composant, trois formes** (`DemandeAide`) : la tuile « Aide » du rail,
   en permanence ; un encart ou un lien d'une ligne, au texte adapté, aux
   seuls endroits où l'outil s'arrête (refus à l'entrée, écart majeur,
   commission de sécurité, légionelles, accessibilité sans Ad'AP, « Ce que
   Rojer ne couvre pas », cotation qui s'écarte du repère, « Je ne sais
   pas », point en retard, catégorie du SSI). Le bouton ne nomme personne ;
   le formulaire dit que les experts de BTRY Solution répondent.
2. **La demande est en base** (`DemandeAssistance`) : l'utilisateur
   (`userId`), l'établissement s'il est du compte (donné, ou lu dans la page),
   la catégorie, la question, un téléphone facultatif, la page et ce qu'elle
   regardait. RLS activée, bornes en CHECK, dix demandes au plus par jour et
   par utilisateur. Les champs cachés se tronquent au lieu de refuser.
3. **Rien ne part.** L'envoi par e-mail est gelé (`lot/email-smtp`) ; d'ici
   là, les demandes se relèvent en base. Aucun écran de lecture : il
   supposerait un rôle d'administrateur, qui n'existe pas.
4. **Données personnelles** : le message et le téléphone, saisis par
   l'utilisateur pour être recontacté (base légale : sa demande, mesures
   précontractuelles — 6.1.b). Conservation : **trois ans à compter de la
   demande**, durée **proposée, à valider par la propriétaire** ; aucune purge
   automatique n'existe encore (dette). Suppression en cascade avec
   l'établissement ; une demande sans établissement (née d'un refus à
   l'accueil) reste rattachée au seul `userId`.

## Conséquences

- Migration additive `20261024191932_demande_assistance`.
- Le « Prendre rendez-vous » du registre (lien sortant vers btry.fr) passe
  par ce composant.
- À faire : brancher l'envoi quand le driver e-mail existera ; une purge à
  trois ans ; la création d'établissement refusée DANS l'app n'a pas encore
  son encart.
