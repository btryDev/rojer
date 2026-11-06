# Communication, positionnement, offres — dossier interne

*Ouvert le 2026-11-05. Dossier de travail : rien ici n'est servi par
l'application ni publié. Branche `docs/communication`, partie de
`docs/offres-abonnement` ; à ne pas fusionner dans `main` sans décision de la
propriétaire.*

## Ce que contient ce dossier

| Fichier | Quoi | État |
|---|---|---|
| [`note-de-redaction.md`](note-de-redaction.md) | La note pour écrire et concevoir la com : positionnement, preuves, l'expert, les mots interdits, ce qu'on ne promet pas encore | Brouillon, 2026-11-05 |
| ~~[`benchmark-offres-abonnement-2026-11.md`](benchmark-offres-abonnement-2026-11.md)~~ | Gamme Essentiel 29 € / Pro 69 € / Sur mesure, et benchmark de dix éditeurs | Proposition du 2026-11-03, **prix non arrêtés**  [2026-11-06 : version périmée retirée de cette branche ; la version à jour (Pro à 89 €, 30 jours d'essai) vit sur `docs/offres-abonnement`, `docs/marketing/`.] |
| ~~[`rojer-offres-abonnement-2026-11.pdf`](rojer-offres-abonnement-2026-11.pdf) · [`source/`](source/)~~ | La même proposition mise en page (HTML → PDF) | Idem  [2026-11-06 : version périmée retirée de cette branche ; la version à jour (Pro à 89 €, 30 jours d'essai) vit sur `docs/offres-abonnement`, `docs/marketing/`.] |
| [`concurrents/duerp-go-2026-11-05.md`](concurrents/duerp-go-2026-11-05.md) | DUERP & GO (Prévensia) : ce qu'ils font, prix, erreurs relevées | Relevé du 2026-11-05 |
| [`direction-photo.md`](direction-photo.md) · [`photos/`](photos/) | L'ambiance des photos : qui, où, lumière, cadrage, interdits, prompt Krea de base, deux références | Décidée le 2026-11-06 |
| [`direction-illustration.md`](direction-illustration.md) · [`illustrations/`](illustrations/) | Le style des illustrations de la page publique : isométrie au trait fin, bleu pâle, un sujet simple ; prompt de base | Piste du 2026-11-06, non définitive |

## Ce qui touche la com et vit ailleurs (ne pas recopier ici)

| Où | Quoi |
|---|---|
| `src/app/page.tsx`, `src/components/landing/` (`main`) | **La landing en ligne** : c'est le texte public qui fait foi aujourd'hui. Accroche « Votre copilote prévention », manifeste « Concentrez-vous sur votre activité », étapes, FAQ |
| `src/lib/rendu/sans-qualification.test.ts` (`main`) | **La garde des mots** : elle refuse sur les pages « en règle », « opposable », « prêt pour contrôle », toute promesse de rappel ou d'envoi… La com écrite hors code doit suivre les mêmes règles (voir la note, § 4) |
| `docs/charte-board.md` (`main`) | Charte visuelle de l'app : tokens, typo, interdits |
| Mémoire projet : direction illustration, ton des vidéos | Illustrations 2.5D trait fin, fond pastel par famille (Sumsub / Artea) ; vidéos « grand public, clean mais dynamique », vraie UI seulement. Gabarit vidéo : `scripts/visites/equipements.html` |
| Rapport Deemply du 2026-11-03 | https://claude.ai/artifact/B1K84XPvWc9i81HmHn7cR4 — conclusion : pas la même cible, ne pas se battre sur le nombre de modules |
| `docs/adr/050-*.md` (`main`) | La demande d'assistance « Besoin d'aide ? » : enregistrée en base, **ne part encore vers personne** |
| `docs/adr/053-abonnements-stripe.md`, `docs/notes-chantier-abonnements-stripe.md`, `src/app/conditions/` (`cc`) | Abonnements Stripe, conditions générales provisoires, formules lues par `src/lib/abonnements/formules.ts` |
| `docs/couverture-declaree-du-produit.md` (`main`) | Ce que Rojer couvre et ne couvre pas : la base de toute phrase sur le périmètre |
| `docs/revues/comparaison-guide-qualiconsult.md` (`main`) | Le référentiel confronté à un guide professionnel : matière pour prouver la rigueur |
| `docs/backlog.md` § 2 (`main`) | La relance du dirigeant : promesse retirée de la landing le 2026-09-26, reste à construire |
