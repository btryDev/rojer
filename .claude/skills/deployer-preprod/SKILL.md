---
name: deployer-preprod
description: Déployer la branche cc sur la préproduction Clever Cloud de Rojer. À utiliser après toute fusion dans cc, ou quand on demande « déploie », « mets en préprod », « c'est en prod ? ». Une seule porte, scripts/deployer-cc.sh ; jamais RiskBoard, jamais Vercel.
---

# Déployer la préproduction

Une fusion dans `cc` ne déploie rien : l'application Clever Cloud n'est pas
reliée à GitHub. **Toute fusion dans `cc` se déploie donc sur la préproduction**
(décision de la propriétaire, 2026-11-12), par une seule commande.
« C'est en prod ? » veut dire la préproduction : la production Clever Cloud
n'existe pas encore.

## La commande

Depuis un **clone** propre de `cc`, à jour :

```sh
git pull --ff-only
pnpm deployer:preprod        # = sh scripts/deployer-cc.sh preprod
```

Rien d'autre à fournir. Le script connaît l'application (par son identifiant)
et son adresse, relie le dossier à Clever Cloud s'il ne l'est pas, et ne
déploie que sous l'alias que ce dossier donne à l'application de Rojer. `sh scripts/deployer-cc.sh
preprod` marche sans `node_modules`.

Où se placer : un clone dédié, sans modification, n'importe où sur le poste
(`git clone --branch cc --single-branch <dépôt> rojer-deploiement`). **Pas un
worktree** : la CLI Clever Cloud ne lit pas le `.git` d'un worktree, et le
script le refuse. Pas non plus un dossier temporaire qui disparaît avec la
session.

## Ce que le script vérifie, et qu'il ne faut pas contourner

- branche `cc`, arbre propre, tête locale = `origin/cc` ;
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
- Rien ne part sur `main` ni sur Vercel (2026-11-12).
- `prod` : la cible n'existe pas ; le script la refuse sans `CC_APP_PROD_ID`.
- Variables, add-ons, taille d'instance, domaines : jamais sans demande de la
  propriétaire.
