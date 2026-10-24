# ADR-048 — Un point à corriger se rattache à son rapport et vit sur l'équipement qu'il concerne

- **Statut** : acceptée, 2026-10-24 — décisions de la propriétaire du même
  jour, après l'état des lieux du parcours échéance → contrôle → rapport →
  réserves → levée (`propositions/etat-des-lieux-echeance-reserve-2026-10-24.md`,
  hors dépôt) et son plan (`propositions/plan-points-a-corriger-2026-10-24.md`).
- **Amende** : ADR-002 (la présentation, pas le modèle : une action reste
  issue d'un risque **ou** d'une vérification) ; précise ADR-034 (l'occurrence
  d'un contrôle est le rapport) et ADR-019 (le lien d'un point à un appareil
  passe par l'appareil, jamais par un `batimentId`).

## Contexte

Une action issue d'une vérification n'était rattachée qu'à la ligne de
calendrier : on ne savait pas quel rapport l'avait fait naître. Rien ne
l'invitait à naître — le dépôt d'un rapport s'arrêtait sur « Rapport
enregistré » —, elle se créait dans un formulaire pensé pour le DUERP, se
retrouvait sur quatre écrans sous cinq noms, et se clôturait sans pièce. Les
contrôles d'ensemble (aération, installations techniques, commission) ne
pouvaient désigner aucun appareil.

## Décision

1. **Les mots.** Une action issue d'une vérification s'appelle à l'écran un
   **« point à corriger »** ; sa levée, **« corrigé »**. Un seul module de
   libellés (`lib/points-a-corriger/libelles.ts`).
2. **Le rapport d'origine.** `Action.rapportOrigineId` désigne le rapport
   qui a relevé le point. Nul pour les points antérieurs : on ne sait pas les
   réattribuer, et on ne le fait pas.
3. **L'appareil d'un contrôle d'ensemble.** `Action.equipementId` désigne
   l'appareil concerné, **seulement** pour un point relevé par un contrôle
   porté par l'établissement, et seulement parmi les appareils actifs des
   catégories que ce contrôle couvre (`equipementsEnContexte`). Pour le
   contrôle d'un appareil, l'appareil se lit par la vérification. Gardes en
   base (CHECK) et dans l'action serveur.
4. **La preuve.** Corriger un point peut joindre une pièce (photo, facture),
   aux règles du fichier d'un rapport. Elle ne fait **pas** avancer
   l'échéance : seul un rapport de contrôle le fait (ADR-036).
5. **Le lieu.** L'équipement centralise ses points à corriger — ceux de ses
   contrôles, et ceux que les contrôles d'ensemble ont désignés sur lui —, et
   les imprime. Un point sans appareil vit sur la page de son contrôle.
6. **Le dépôt d'un rapport non conforme** invite à noter ses points à
   corriger, rattachés à ce rapport.
7. **Inchangé** : le modèle unifié (ADR-002), le score, le calcul des
   échéances. Un point ouvert ne pèse pas sur l'échéance — à décider plus
   tard.

## Conséquences

- La création et la levée d'un point passent par un seul formulaire et une
  seule action serveur chacune ; l'ancien formulaire d'action de
  vérification est retiré.
- Le plan d'actions ne montrera plus que les mesures du DUERP (lot 3 du
  plan), le registre reprendra les corrections (lot 3).
