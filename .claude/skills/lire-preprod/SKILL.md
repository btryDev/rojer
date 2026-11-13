---
name: lire-preprod
description: Lire la base de la préproduction Clever Cloud de Rojer, en lecture seule — un testeur s'est-il connecté, quand, qu'a-t-il créé. À utiliser pour toute question sur l'activité d'un compte en préprod. Un seul chemin, pnpm lire-preprod ; jamais Docker, psql ni clever ssh.
---

# Lire la préproduction

```sh
pnpm lire-preprod connexions julien@rojer.invalid testeur@rojer.invalid
pnpm lire-preprod activite julien@rojer.invalid
```

- `connexions` : le compte existe-t-il, depuis quand, combien de sessions
  ouvertes, date de la dernière connexion.
- `activite` : ce que porte le compte de cette personne — entreprises,
  établissements, équipements, vérifications, rapports, actions, salariés,
  DUERP — en nombres, et la date de la dernière écriture.

Depuis n'importe quel checkout qui a ses `node_modules` et la CLI `clever`
connectée. Heures de Paris.

## Ce que le script garantit (`scripts/lire-preprod.ts`)

- la cible est la préproduction, en dur ; aucune option ne la change ;
- l'adresse de la base vient de `clever env` à l'exécution, jamais affichée ;
- TLS vérifié contre le certificat de l'add-on, sinon refus ;
- transaction `READ ONLY` : la base refuse l'écriture (éprouvé le 2026-11-13,
  erreur 25006) ;
- réponses en nombres et en dates, pour des adresses **nommées**.

## Règles

- **Toujours rendre une réponse.** Coller la sortie du script. S'il échoue,
  le dire en une phrase avec son message — ne pas chercher un autre chemin.
- **Jamais Docker, jamais `psql`, jamais `clever ssh` pour lire**, jamais
  `clever env` affiché à l'écran (il porte des secrets). Le 2026-11-13, une
  session a lancé Docker pour y trouver `psql`, tronqué puis filtré son
  résultat, et n'a rien su répondre.
- **Ne jamais lister les comptes** ni sortir leur contenu : ce qui s'affiche
  entre dans la conversation.
- Une question que le script ne couvre pas : l'ajouter au script, par une PR —
  nombres et dates, adresses nommées, même transaction. Pas de requête à la
  main.
- Aucune écriture en base sans demande de la propriétaire : ce n'est pas
  l'objet de cette skill.
- RiskBoard partage le compte Clever Cloud : on n'y touche jamais.
