<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Avant de relire un texte réglementaire, ouvre le journal

`docs/journal-des-verifications.md` dit **ce qui a déjà été lu, quand, comment,
et ce qui en a été appliqué**. `docs/etat-verification-referentiel.md` dit, pour
chaque obligation, le degré de vérification de ses sources — il se régénère par
`pnpm verification --ecrire` et un test le compare au fichier.

Ces deux documents existent parce que leur absence a coûté cher, et la panne
mérite d'être connue plutôt que répétée : dans la nuit du 26 août 2026, six
agents ont relu 123 articles à la source. Leurs relevés sont restés dans un
compte rendu au lieu d'entrer dans le corpus. Six jours plus tard, personne ne
savait plus si une relecture avait eu lieu — et deux sessions ont failli
relancer l'ouverture de 78 articles déjà lus. `L. 4711-5`, lui, a été mis en
cause **quatre fois en onze jours** par quatre passages qui s'ignoraient.

Trois règles en découlent, dans cet ordre :

1. **Lis le journal avant de lancer une relecture.** Ce que tu t'apprêtes à
   ouvrir a peut-être déjà été ouvert, et le constat qui en est sorti attend
   peut-être une décision plutôt qu'une seconde lecture.
2. **Écris ton relevé dans le corpus, pas dans un rapport.** Un verbatim qui
   vit dans un `.md` ne compte pour rien : ni pour la veille, ni pour le dossier
   remis à un relecteur, ni pour le prochain agent. Les champs sont
   `prescrit`, `citationCle`, `versionEnVigueur`, `luLe`, `lecture`.
3. **Inscris au journal ce que tu as lu et ce que tu en as conclu**, y compris
   — surtout — ce que tu laisses en suspens faute de décision.
