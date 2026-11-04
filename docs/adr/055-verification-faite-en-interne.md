# ADR-055 — Une vérification faite en interne s'enregistre par un formulaire, sans fichier

- **Statut** : acceptée, 2026-11-04 — décision de la propriétaire (« faire un
  switch : fait en interne → formulaire ; si prestataire, alors rapport
  PDF » ; « quand une vérif peut être faite pas obligatoirement par un
  organisme, mettre ce système »).
- **Amende** l'ADR-034 sur un point : un rapport n'est plus toujours un
  fichier. L'historique reste fait des rapports.
- **Numéro** : 052 à 054 existent sur `cc` ; 055 est le suivant.

## Contexte

Tout enregistrement d'une vérification exigeait un fichier
(`RapportVerification.fichierCle` non nul). L'alarme hebdomadaire de `MS 69`
ou l'essai mensuel de l'éclairage de sécurité sont faits par l'exploitant
lui-même : il n'a aucun PDF à déposer. Il fabriquait donc un fichier, ou ne
consignait rien.

## Décision

1. **Un switch sur le formulaire** : « En interne » ou « Par un
   prestataire » (`UploadRapportForm`). En interne : date, résultat, « fait
   par » (le nom, facultatif), observations, pièce jointe facultative. Par un
   prestataire : le rapport est obligatoire, comme avant.
2. **Où le switch apparaît** se lit sur `Verification.realisateurRequis`
   (`rapports/interne.ts`, une seule fonction, `modeParDefaut`) :
   - l'**exploitant** y figure → ouvert sur « En interne » ;
   - une **personne qualifiée ou compétente** seulement (qui peut appartenir
     à l'établissement, `R. 4323-24`) → ouvert sur « Par un prestataire »,
     l'interne reste possible ;
   - un **tiers seul** (organisme agréé ou accrédité, bureau de contrôle,
     fabricant, professionnel de santé) → pas de switch, rapport exigé
     (`R. 4323-26` : le rapport d'un tiers s'annexe au registre).
   Un prestataire attitré (ADR-049) fait ouvrir sur « Par un prestataire ».
3. **Le serveur tient la règle**, pas seulement l'écran : tout ce qui n'est
   pas `faitPar=interne` se lit « prestataire » ; « interne » sur une ligne qui
   exige un tiers est refusé.
4. **En base** : `realiseEnInterne` (booléen, faux par défaut), et les quatre
   colonnes du fichier deviennent facultatives. Deux CHECK : le fichier est
   complet ou absent ; absent seulement en interne. Le nom de la personne vit
   dans `organismeVerif`, lu par `libelleRealisePar`.
5. **Partout ailleurs, l'absence se dit** : pas de lien « Ouvrir », pas
   d'entrée au ZIP de contrôle (l'index du registre la porte), colonne
   « Réalisé par » au registre et au dossier, « En interne (nom) ». Une
   signature porte sur le relevé en JSON canonique (ADR-008), marqué
   `releve-v1:`, qui ne se compare jamais à l'empreinte d'un fichier.

## Ce qui n'est pas fait

- Pas de liste de points à cocher propre à chaque vérification (« toutes les
  lampes s'allument », « remise en veille »…) : le formulaire est le même pour
  toutes, les observations restent du texte libre.
- On ne peut pas ajouter une pièce jointe plus tard : il faut supprimer la
  vérification et l'enregistrer de nouveau.
