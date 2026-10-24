# ADR-049 — Un contrôle a un prestataire attitré et un rendez-vous, qui ne le datent pas

- **Statut** : acceptée, 2026-10-24 — décision de la propriétaire du même jour
  (« yes pour 1 et 2 »), après l'état des lieux du parcours échéance →
  contrôle → rapport.
- **Précise** : ADR-036 (l'échéance se calcule depuis des faits stockés) et
  ADR-034 (au dépôt, la ligne roule).

## Contexte

Rojer disait quand un contrôle est dû et enregistrait son rapport, sans rien
entre les deux : ni qui le fait, ni quand il est prévu. L'annuaire des
prestataires existait sans lien avec les contrôles.

## Décision

1. **Le prestataire attitré.** `Verification.prestataireId` désigne un
   prestataire de l'annuaire de l'établissement (`onDelete: SetNull`). Il
   reste d'un passage au suivant. Qu'il soit de l'établissement de la ligne
   est tenu par l'action serveur (`resoudrePrestataireOptionnel`).
2. **Le rendez-vous.** `rendezVousLe` (date et heure, heure de Paris) et
   `rendezVousNote` (une ligne, 300 caractères au plus, CHECK). Une note sans
   rendez-vous n'est pas écrite.
3. **Ni l'un ni l'autre ne date la ligne.** L'échéance reste celle des faits
   (ADR-036) ; le moteur du calendrier ne lit ni n'écrit ces colonnes.
   ~~Le rendez-vous s'affiche à côté de l'échéance, jamais à sa place.~~
   [2026-10-24, décision de la propriétaire : « à la place de la date
   d'échéance on met le rdv, mais il faut qu'il soit autour de
   l'échéance ».] Un rendez-vous fixé au plus tard le jour de l'échéance
   **pose la ligne au calendrier à sa date**, l'échéance légale écrite à côté
   (`datePoseeAuCalendrier`) ; après l'échéance, la ligne reste à
   l'échéance et passe en retard comme toute autre, le rendez-vous signalé
   en rose. Affichage seulement : retards, compteurs et « dans les 30 jours »
   restent sur l'échéance. Le formulaire signale un rendez-vous après
   l'échéance ou à plus de trois mois avant, sans bloquer ; il refuse une
   date absurde (plus d'un mois passé, plus de deux ans d'ici).
4. **Le rapport consomme le rendez-vous.** Le dépôt d'un rapport l'efface
   (dans la transaction du dépôt) et pré-remplit l'organisme avec le
   prestataire attitré. Un rendez-vous passé sans rapport se dit
   « passé : rapport attendu » (`rendezVousEnAttenteDeRapport`).
5. **Où.** Contrôles ouverts et matériels seulement (`recoitUnSuivi`) : ni une
   ligne éteinte, ni l'échéance d'une personne. Carte « Prestataire et
   rendez-vous » sur la fiche du contrôle ; mention au calendrier et au
   « À faire » de l'appareil ; « Contrôles suivis » sur la fiche du
   prestataire.

## Conséquences

- Migration additive `20261024190748_prestataire_rendez_vous`.
- Une ligne que la régénération supprime (obligation qui ne s'applique plus,
  sans trace) emporte son rendez-vous : il n'a plus d'objet.
- Pas de relance par e-mail : l'envoi est gelé. Le dépôt du rapport par le
  prestataire lui-même (jeton `depot_rapport`) reste sans écran.
