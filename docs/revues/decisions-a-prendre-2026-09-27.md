# Décisions à prendre — lot 2, audit de bout en bout (2026-09-27)

Branche `lot/audit-bout-en-bout`, sur `lot/couverture-reponse-absente` (`285e084`).
Tenu pendant l'absence de la propriétaire, sous la règle que la session de
coordination a transmise : ce qu'une règle déjà écrite décide, ou qu'un texte relu
par l'API Légifrance fonde clairement, est tranché et codé ; le reste est consigné
ici — obligation nouvelle de rythme ou de sens nouveau, retrait d'obligation,
changement de ce que voit le dirigeant, lecture qui n'est pas le texte.

Chaque entrée : le texte en cause, les options, une recommandation argumentée, ce
que chaque option change.

---

## D1 — Les lignes « à confirmer » dans l'indice et les retards (ouverte par le lot 1)

**Constat** (contre-lecture du lot 1). Avec `VERSION_MOTEUR_CALENDRIER` à 5, un
établissement de travail de moins de cinquante et une personnes, muet sur les
matières de R. 4227-22, reçoit la ligne semestrielle
`incendie-travail-exercice-semestriel` sans rapport. `calendrier/etats.ts:559-560`
la tient « en retard » ; `dashboard/score.ts:179-200` la compte dans l'indice sans
lire la marque ; le dossier PDF l'imprime « en retard » à côté de « À confirmer ».
Un dossier concerné en production au comptage du 2026-09-27.

**Options.**
- **(a)** Une ligne que seul le silence de la fiche retient n'entre ni dans les
  retards ni dans l'indice : elle s'affiche, marquée, sans pénaliser. Change :
  l'indice et le compteur de retards de ces dossiers ; le PDF n'imprime plus
  « en retard » sur elle.
- **(b)** Accepter : la ligne est traitée comme toute ligne due. Ne change rien.

**Recommandation : (a).** La règle du non-renseigné veut que la ligne SOIT affichée
— pas qu'elle soit comptée comme un manquement. L'erreur « en retard » sur une
obligation que le dirigeant ne doit peut-être pas est une affirmation qu'aucun texte
ne fonde, dans un document remis à un tiers. (a) garde la couverture et retire
l'affirmation. Un lot court : un prédicat « retenue par prudence », lu par le
compteur de retards et le score.
