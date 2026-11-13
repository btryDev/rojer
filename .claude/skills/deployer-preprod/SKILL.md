---
name: deployer-preprod
description: Déployer la branche main sur la préproduction Clever Cloud de Rojer. À utiliser après toute fusion dans main, ou quand on demande « déploie », « mets en préprod », « c'est en prod ? ». Une seule porte, scripts/deployer-cc.sh ; jamais RiskBoard, jamais Vercel.
---

# Déployer la préproduction

Une fusion dans `main` ne déploie rien : l'application Clever Cloud n'est pas
reliée à GitHub. **Toute fusion dans `main` se déploie donc sur la
préproduction** (décision de la propriétaire, 2026-11-12), par une seule
commande. « C'est en prod ? » veut dire la préproduction : la production
Clever Cloud n'existe pas encore.

[2026-11-13 : la branche `cc` est devenue `main`. Vercel ne déploie plus rien.]

## La commande

Depuis le **dépôt principal**, sur `main`, à jour et sans fichier suivi modifié :

```sh
git pull --ff-only
pnpm deployer:preprod        # = sh scripts/deployer-cc.sh preprod
```

Rien d'autre à fournir. Le script connaît l'application (par son identifiant)
et son adresse, relie le dossier à Clever Cloud s'il ne l'est pas, et ne
déploie que sous l'alias que ce dossier donne à l'application de Rojer.
`sh scripts/deployer-cc.sh preprod` marche sans `node_modules`.

Où se placer : le dépôt principal, comme pour tout le reste. Si sa branche
est occupée par un travail en cours, un second clone fait l'affaire
(`git clone --branch main --single-branch <dépôt>`). **Jamais un worktree** :
la CLI Clever Cloud ne lit pas le `.git` d'un worktree, et le script le
refuse. Pas non plus un dossier temporaire qui disparaît avec la session.

## Ce que le script vérifie, et qu'il ne faut pas contourner

- branche `main`, aucun fichier suivi modifié (les fichiers non suivis ne
  gênent pas), tête locale = `origin/main` ;
- CI du commit verte, job `build-cc` compris — si elle tourne encore, attendre ;
- après le déploiement : le commit servi (`clever status`) est bien celui
  déployé, et l'application répond.

Un refus se corrige à sa cause. Jamais de `clever deploy` à la main, jamais de
`git push` vers Clever Cloud, jamais de variable posée pour faire passer.

## Après

1. Si le lot porte des migrations, les lire dans les logs (la commande ne se
   termine pas seule, d'où l'alarme) :
   ```sh
   perl -e 'alarm 30; exec @ARGV' clever logs \
     --app app_9bbac77c-af66-4562-81a7-0257a21401ad --since <heure ISO> \
     | grep -iE "migration|applied"
   ```
2. Rendre compte : commit servi, migrations appliquées, ce qui n'a pas été
   vérifié.

## Interdits

- **RiskBoard partage le compte Clever Cloud.** Toute commande `clever` porte
  `--app app_9bbac77c-af66-4562-81a7-0257a21401ad` (ou l'alias relu par le
  script). Aucune commande `clever` sans cible, aucun `clever link` dans un
  autre dossier.
- Rien ne part sur Vercel (2026-11-12).
- `prod` : la cible n'existe pas ; le script la refuse sans `CC_APP_PROD_ID`.
- Variables, add-ons, taille d'instance, domaines : jamais sans demande de la
  propriétaire.
