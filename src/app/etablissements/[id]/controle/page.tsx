import Link from "next/link";
import { compterActions } from "@/lib/actions/queries";
import { EnTetePage } from "@/components/entete-page/EnTetePage";
import { LegalBadge, WhyCard, StatusPill } from "@/components/ui-kit";
import { requireEtablissement } from "@/lib/auth/scope";
import { getDashboardData } from "@/lib/dashboard/queries";
import { compterVigilanceParGravite } from "@/lib/prestataires/queries";
import { etatDesPiecesDuDossier } from "@/lib/controle/queries";
import { formaterDateFr } from "@/lib/dates";
import { registreAuDossier } from "@/lib/accessibilite/registre-au-dossier";
import { fraicheurCalendrier, phraseFraicheur } from "@/lib/calendrier/fraicheur";
import { AvertissementFraicheur } from "@/components/calendrier/AvertissementFraicheur";
import { couvertureDuDossier } from "@/lib/perimetre/faits";
import { faitInventaire } from "@/lib/perimetre/couverture";
import {
  etatSelonCalendrier,
  type EtatPiece,
} from "@/lib/calendrier/etat-affiche";
import {
  etatDuerpDuDossier,
  faitDuerp,
  pastilleDuFait,
} from "@/lib/pdf/checklist-controle";
import { composerRegistreDeLEtablissement } from "@/lib/registre/queries";
import { bilanDuRegistre, completudesDuRegistre } from "@/lib/registre/completude";
import {
  NB_ANALYSES_DU_DOSSIER,
  PIECES_A_L_ECRAN,
  PIECES_ZIP,
  type ClePiece,
} from "@/lib/controle/pieces-zip";

export const metadata = {
  title: "Préparer un contrôle — Dossier 1 clic",
};

type ElementDossier = {
  titre: string;
  description: string;
  /**
   * La pièce part-elle dans le ZIP ?
   *
   * **Ce n'est pas un état de conformité**, et les deux se lisent sur la
   * même ligne : le registre de sécurité part dans le dossier même sans
   * aucun rapport archivé, et il est alors `present: true` ET
   * `etat: "en_retard"`. Une coche verte à droite d'une pastille rouge est
   * juste — à condition que la colonne dise ce qu'elle compte. Elle ne le
   * disait pas : ni en-tête, ni légende, ni nom pour un lecteur d'écran.
   * Sur l'écran qu'on ouvre devant un inspecteur, c'était le signal à ne
   * pas envoyer.
   */
  present: boolean;
  etat?: "a_jour" | "a_planifier" | "en_retard" | "non_conforme" | "non_applicable";
  reference?: string;
};

export default async function ControlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { etablissement } = await requireEtablissement(id);
  // Une horloge, lue une fois : l'âge du DUERP et la fenêtre de douze mois
  // décrivent le même instant.
  const maintenant = new Date();

  const [
    dashboard,
    vigilance,
    {
      nbPrestataires,
      duerpVersion,
      nbRapports,
      registreAccessibilite,
      nbRapportsDuDossier,
      nbPermisFeu,
      nbPlansPrevention,
      carnet,
    },
    fraicheur,
    couverture,
    registre,
    points,
  ] = await Promise.all([
    getDashboardData(id),
    compterVigilanceParGravite(id),
    // Ce que le ZIP met dans ses pièces, par les filtres de la route
    // (`controle/pieces-zip.ts`) : l'écran annonce ce que le ZIP contient.
    etatDesPiecesDuDossier(id, maintenant),
    // CE QU'ON SAIT AVANT DE COMPTER. C'est l'écran qu'on ouvre devant un
    // contrôleur : il ne peut affirmer « à jour » que s'il sait sur quoi.
    fraicheurCalendrier(id),
    // Par la même entrée que le dossier de conformité et le registre du ZIP
    // que cet écran fait télécharger : l'écran et les pièces disent le même
    // fait de l'inventaire (`docs/chantiers-ouverts.md` § 15).
    couvertureDuDossier(id),
    // Les fiches du registre, comptées comme l'écran du registre les compte
    // (`completudesDuRegistre`, audit du 2026-10-12, B3).
    composerRegistreDeLEtablissement(id),
    // Les points à corriger, que le plan d'actions ne compte plus (ADR-048,
    // lot 3) : un écart électrique en retard doit se voir ici.
    compterActions(id, maintenant, { origine: "verification" }),
  ]);

  // LE PATRON `etat-charge.ts`, APPLIQUÉ À UN ÉCRAN : la question « sait-on ? »
  // se tranche AVANT tout comptage. Un calendrier jamais calculé rend zéro
  // retard, et zéro retard se lit comme une bonne nouvelle — c'est exactement
  // le défaut que ce fichier portait. Tant qu'on ne sait pas, aucune ligne
  // adossée au calendrier ne dit « à jour » ; elle dit « à planifier », ce qui
  // est vrai dans les deux cas.
  const avertissement = phraseFraicheur(fraicheur);
  // « Aucun équipement déclaré », dit comme un fait. Sans lui, cet écran
  // montrait à un dossier vide un registre « 0 rapport archivé » et un plan
  // d'actions « Aucune action en cours » — un silence qui ressemble à une
  // réponse, devant la personne même à qui l'on remet le dossier. `null`
  // aussi quand la couverture n'a pu être lue : on n'affirme rien.
  const inventaire = couverture ? faitInventaire(couverture) : null;
  // La règle du ZIP, pas une paraphrase (2026-10-12) : ce que la ligne dit
  // joint est ce que le ZIP joint (`registreAuDossier`).
  const registreDossier = registreAuDossier({
    publie: registreAccessibilite?.publie ?? false,
    estERP: etablissement.estERP,
  });
  const selonCalendrier = (etat: EtatPiece): EtatPiece =>
    etatSelonCalendrier(fraicheur, etat);

  // LE DUERP SE LIT COMME LE README LE LIT (audit du 2026-10-12, B3). La
  // pastille disait ~~« À jour » dès qu'une version existait~~, et le README
  // du ZIP téléchargé ici écrivait « mise à jour annuelle échue » sur le même
  // dossier. Même entrée, même fait, même texte : la coche du README décide
  // de la pastille.
  const etatDuerp = etatDuerpDuDossier(duerpVersion, etablissement, maintenant);
  const faitDuDuerp = faitDuerp(etatDuerp);

  // LE REGISTRE SE COMPTE COMME SON ÉCRAN LE COMPTE (même audit). La pastille
  // disait « À jour » pendant que l'écran du registre annonçait des fiches à
  // remplir — dont des journaux sans aucune ligne consignée. Une fiche à
  // remplir retient désormais la pastille sur « à planifier ». C'est la règle
  // la plus prudente déjà présente au dépôt (la jauge du registre) ; le sens
  // même de « À jour » sur cet écran reste une décision de la propriétaire
  // (audit, § 4.7).
  const bilanRegistre = bilanDuRegistre([
    ...completudesDuRegistre(registre, `/etablissements/${id}`).values(),
  ]);
  const aRemplir = bilanRegistre.aRemplir;

  const analysesAvecRapport = (carnet?.analyses ?? []).filter((a) => a.rapportCle).length;
  const carnetRenseigne =
    carnet !== null &&
    (carnet._count.pointsReleve > 0 || carnet._count.analyses > 0);

  // LA LISTE SUIT LE ZIP (audit du 2026-10-12). Elle comptait six pièces quand
  // le ZIP en contient onze. Indexée par les clés de `PIECES_ZIP` : une pièce
  // que la route ajouterait sans la décrire ici ne compile pas.
  const pieces: Record<Exclude<ClePiece, "readme">, Omit<ElementDossier, "titre">> = {
    dossier: {
      description: "Synthèse globale de votre posture santé-sécurité.",
      present: true,
      // PAS D'ÉTAT, et c'est une correction : cette ligne portait
      // `etat: "a_jour"` ÉCRIT EN DUR, sans lire la moindre donnée. Un dossier
      // vide sortait donc avec une pastille verte sur la première ligne de
      // l'écran ouvert devant un contrôleur. La pièce est bien produite — d'où
      // `present: true`, qui dit ce qu'il part dans le ZIP — mais sa seule
      // existence n'est l'état de conformité de rien, et `etat` est optionnel
      // précisément pour ce cas.
    },
    duerp: {
      description: duerpVersion
        ? `Version v${duerpVersion.numero} figée le ${formaterDateFr(duerpVersion.createdAt)} — ${faitDuDuerp.texte}.`
        : "Aucune version figée. Créez-en une depuis le DUERP.",
      present: !!duerpVersion,
      etat: pastilleDuFait(faitDuDuerp),
      reference: "Art. R. 4121-1 CT",
    },
    registre: {
      description:
        `${nbRapports} rapport${nbRapports > 1 ? "s" : ""} de vérification archivé${nbRapports > 1 ? "s" : ""}` +
        (aRemplir > 0
          ? ` · ${aRemplir} ${aRemplir > 1 ? "fiches à remplir" : "fiche à remplir"} à l'écran du registre.`
          : "."),
      present: true,
      // Zéro rapport archivé n'est pas « à jour » : c'est un registre qui
      // n'atteste encore de rien. Le compteur de retard ne le disait pas —
      // il ne compte que des lignes dépassées, et un dossier sans ligne n'en
      // a aucune. Une fiche à remplir non plus (2026-10-12, ci-dessus).
      etat:
        dashboard.compteurs.verifsEnRetard > 0
          ? "en_retard"
          : nbRapports === 0 || aRemplir > 0
            ? "a_planifier"
            : selonCalendrier("a_jour"),
      // R. 4323-25 fonde la consignation des vérifications, R. 4323-26
      // l'annexion des rapports d'un tiers — c'est ce que cette carte compte.
      // Ce n'est PAS L. 4711-5, qui autorise seulement à réunir plusieurs
      // registres en un seul (verbatim relevé le 2026-08-28).
      reference: "Art. R. 4323-25 et R. 4323-26 CT",
    },
    rapports: {
      description:
        nbRapportsDuDossier > 0
          ? `${nbRapportsDuDossier} rapport${nbRapportsDuDossier > 1 ? "s" : ""} déposé${nbRapportsDuDossier > 1 ? "s" : ""}, joint${nbRapportsDuDossier > 1 ? "s" : ""} dans le dossier ${PIECES_ZIP.rapports}. Ceux déposés sur le titre d'un salarié ne sont jamais joints.`
          : "Aucun rapport déposé.",
      present: nbRapportsDuDossier > 0,
    },
    plan: {
      description:
        dashboard.compteurs.actionsOuvertes +
          dashboard.compteurs.actionsEnCours >
        0
          ? `${dashboard.compteurs.actionsOuvertes + dashboard.compteurs.actionsEnCours} mesure${dashboard.compteurs.actionsOuvertes + dashboard.compteurs.actionsEnCours > 1 ? "s" : ""} du DUERP en cours. ${phrasePoints(points)}`
          : `Aucune mesure du DUERP en cours. ${phrasePoints(points)}`,
      present: true,
      etat: selonCalendrier(
        dashboard.compteurs.actionsEnRetard > 0 || points.enRetard > 0 ? "en_retard" : "a_jour",
      ),
      reference: "Art. L. 4121-2 CT",
    },
    // ~~« Publié et consultable en ligne. » dès le registre servi~~ — le ZIP
    // écartait la pièce quand l'adresse publique manque en production
    // (relecture indépendante du 2026-10-12). Le registre reste servi : la
    // pastille ne change pas, la phrase dit qu'il ne part pas au dossier.
    accessibilite: {
      description: registreDossier.joint
        ? "Publié et consultable en ligne."
        : registreDossier.raison === "non_erp"
          ? "Non applicable — votre établissement n'est pas un ERP."
          : registreDossier.raison === "non_publie"
            ? "Registre non publié. À rendre public."
            : "Publié, mais non joint au dossier : l'adresse publique de l'application n'est pas configurée sur ce serveur.",
      present: registreDossier.joint,
      etat:
        !registreDossier.joint && registreDossier.raison === "non_erp"
          ? "non_applicable"
          : !registreDossier.joint && registreDossier.raison === "non_publie"
            ? "a_planifier"
            : "a_jour",
      reference: "Arrêté 19-04-2017",
    },
    // Les quatre pièces que l'écran taisait. Pas de pastille : leur présence
    // dit ce qui part dans le ZIP, pas un état de conformité — même partage
    // que le dossier consolidé.
    permisFeu: {
      description:
        nbPermisFeu > 0
          ? `${nbPermisFeu} permis émis sur les 12 derniers mois.`
          : "Aucun permis émis sur les 12 derniers mois.",
      present: nbPermisFeu > 0,
    },
    plansPrevention: {
      description:
        nbPlansPrevention > 0
          ? `${nbPlansPrevention} plan${nbPlansPrevention > 1 ? "s" : ""} sur les 12 derniers mois.`
          : "Aucun plan sur les 12 derniers mois.",
      present: nbPlansPrevention > 0,
      reference: "Art. R. 4512-6 CT",
    },
    carnet: {
      description: carnetRenseigne
        ? "Relevés de température et analyses de légionelles."
        : "Carnet non configuré.",
      present: carnetRenseigne,
    },
    analyses: {
      description:
        analysesAvecRapport > 0
          ? `${analysesAvecRapport} rapport${analysesAvecRapport > 1 ? "s" : ""} de laboratoire, parmi les ${NB_ANALYSES_DU_DOSSIER} dernières analyses.`
          : `Aucun rapport de laboratoire déposé parmi les ${NB_ANALYSES_DU_DOSSIER} dernières analyses.`,
      present: analysesAvecRapport > 0,
    },
    prestataires: {
      // ~~« N attestations URSSAF/RC Pro expirées ou expirant », état « en
      // retard »~~ pour TOUT prestataire qui appelait un geste — pièce non
      // fournie et date non renseignée comprises (contre-lecture du
      // 2026-09-27). Une date absente n'est pas un retard : la gravité
      // décide du mot et de l'état (`ventilerVigilance`).
      description: nbPrestataires
        ? vigilance.enRetard > 0
          ? `${vigilance.enRetard} prestataire${vigilance.enRetard > 1 ? "s" : ""} avec une pièce expirée ou à redemander.`
          : vigilance.proche > 0
            ? `${vigilance.proche} prestataire${vigilance.proche > 1 ? "s" : ""} avec une pièce qui expire sous 30 jours.`
            : vigilance.aPlanifier > 0
              ? `${vigilance.aPlanifier} prestataire${vigilance.aPlanifier > 1 ? "s" : ""} avec une pièce non fournie ou une date non renseignée.`
              : `${nbPrestataires} prestataire${nbPrestataires > 1 ? "s" : ""} · pièces à jour.`
        : "Aucun prestataire déclaré.",
      present: nbPrestataires > 0,
      etat:
        nbPrestataires === 0
          ? "a_planifier"
          : vigilance.enRetard > 0
            ? "en_retard"
            : vigilance.total > 0
              ? "a_planifier"
              : "a_jour",
      reference: "Art. L. 8222-1 CT",
    },
  };
  const elements: ElementDossier[] = PIECES_A_L_ECRAN.map((p) => ({
    titre: p.titre,
    ...pieces[p.cle],
  }));

  // ~~`pourcentPret` : part des pièces « à jour » sur leur nombre, rendue en
  // anneau coloré, et titre « Vous êtes prêt à passer un contrôle. » dès 90 %.~~
  // RETIRÉ LE 2026-09-20. C'était un SECOND SCORE, et le produit s'interdit le
  // premier : « Aucun total, aucun score, aucun pourcentage. Quatre manques sur
  // quatre axes ne font pas "4" […] un chiffre laisserait croire à une mesure
  // de complétude que rien ne fonde » (`app/etablissements/[id]/perimetre/page.tsx`).
  // Celui-ci était pire que fondé sur rien : il divisait par le nombre de
  // LIGNES DE L'ÉCRAN, si bien qu'un dossier sans aucune vérification faite
  // sortait à 100 % dès qu'il avait une version de DUERP et un registre publié.
  // Le score du tableau de bord, lui, reste — il a sa garde (`score.ts` rabat
  // sur « indéterminé » dès qu'un état permanent n'est pas déclaré) et son
  // titre honnête, « indicateur interne ».

  return (
    <>
      <EnTetePage
        item="controle"
        description="Les pièces que Rojer tient pour votre établissement, réunies en un seul dossier ZIP. Vérifiez l'état de chaque pièce, puis téléchargez le dossier."
      />

      <main className="flex flex-1 flex-col gap-7 bg-[color:var(--board-canvas)] px-[var(--board-gutter)] py-7 pb-16">
        {/* HERO — statut de préparation + gros CTA */}
        <section className="carte-board relative overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[1fr_auto]">
            {/* Gauche : statut */}
            <div className="border-b border-[color:var(--board-slate-line)] px-8 py-8 md:border-b-0 md:border-r md:px-10 md:py-10">
              <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">Dossier 1 clic</p>
              {/* Un `h2` : le titre de la page est celui de l'en-tête. Il y
                  avait deux `h1` sur cet écran. */}
              <h2 className="mt-3 text-[clamp(22px,2.2vw,27px)] font-semibold leading-tight tracking-[-0.025em]">
                Préparer votre dossier
              </h2>
              <p className="mt-4 max-w-prose text-[0.95rem] leading-relaxed text-[color:var(--board-ink)]/80">
                {/* ~~« tout ce qu'un inspecteur du travail, une commission de
                    sécurité, un assureur ou un bailleur peut demander »~~ —
                    faux, rayé le 2026-10-12 (audit) : ce que Rojer ne tient
                    pas n'est pas au ZIP. */}
                Cette page rassemble, en un seul dossier ZIP, les pièces que
                Rojer tient pour votre établissement — celles listées
                ci-dessous. Un inspecteur du travail, une commission de
                sécurité, un assureur ou un bailleur peut en demander
                d&apos;autres : celles que vous tenez hors de Rojer, et ce que{" "}
                <Link
                  href={`/etablissements/${id}/perimetre`}
                  className="text-[color:var(--board-blue-ink)] hover:underline"
                >
                  Rojer ne couvre pas
                </Link>
                . Vérifiez l&apos;état de chaque pièce, puis téléchargez le
                dossier.
              </p>
              {/* ~~« Vous êtes prêt à passer un contrôle. » dès 90 %~~ — retiré
                  le 2026-09-20 avec l&apos;anneau qui le calculait. Ce n&apos;est pas
                  au produit de dire qu&apos;un dossier est prêt : il rassemble des
                  pièces et dit l&apos;état de chacune, ce que la liste ci-dessous
                  fait ligne par ligne. Le titre annonce donc le geste, pas un
                  verdict. */}
              <AvertissementFraicheur
                phrase={avertissement}
                hrefCalendrier={`/etablissements/${id}/calendrier`}
                className="mt-4"
              />
              {inventaire && (
                <div className="mt-4 max-w-prose rounded-md border border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-4 py-3 text-[0.85rem] leading-relaxed text-[color:var(--board-ink)]/85">
                  <p className="font-semibold">{inventaire.motif}</p>
                  <p className="mt-1">{inventaire.consequence}</p>
                  <Link
                    href={`/etablissements/${id}/equipements`}
                    className="mt-2 inline-block text-[color:var(--board-blue-ink)] hover:underline"
                  >
                    Voir les équipements →
                  </Link>
                </div>
              )}
            </div>

            {/* Droite : le dossier */}
            <div className="flex flex-col items-center justify-center gap-4 bg-[color:var(--board-slate-pale)] px-8 py-10 md:px-10">
              <a
                href={`/api/etablissements/${id}/controle-zip`}
                className="inline-flex items-center gap-2 rounded-md bg-[color:var(--board-ink)] px-5 py-3 text-[0.92rem] font-medium text-[color:var(--board-card)] shadow-sm transition-colors hover:opacity-90"
              >
                Télécharger le dossier ZIP ↓
              </a>
              <p className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-[color:var(--board-slate-mid)]">
                ~5 Mo · généré à la volée
              </p>
            </div>
          </div>
        </section>

        {/* CHECKLIST — ce que contient le dossier */}
        <section className="mt-10">
          <header className="mb-5">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">Contenu du dossier</p>
            <h2 className="mt-1 text-[1.2rem] font-semibold tracking-[-0.015em]">
              Pièces incluses
            </h2>
            <p className="mt-1 text-[0.85rem] text-[color:var(--board-slate-mid)]">
              Le ZIP contient ce qui a pu être généré&nbsp;; ce qui a échoué
              est dit dans son fichier {PIECES_ZIP.readme}. Statut des données à
              l&apos;instant de la génération.
            </p>
            {/* Les deux signaux d'une ligne ne disent pas la même chose, et
                rien ne l'annonçait : la pastille dit l'état de vos données,
                la coche dit seulement que la pièce part dans le dossier. Un
                registre sans rapport part quand même — coche verte, pastille
                rouge. Juste, mais illisible sans cette phrase. */}
            <p className="mt-2 font-mono text-[0.66rem] uppercase leading-[1.7] tracking-[0.12em] text-[color:var(--board-slate-soft)]">
              Pastille = état de vos données · ✓ à droite = pièce incluse dans
              le ZIP
            </p>
          </header>

          <ol className="space-y-3">
            {elements.map((el, idx) => (
              <li
                key={el.titre}
                className="carte-board flex items-start gap-5 px-7 py-6 sm:px-8"
              >
                <span className="shrink-0 font-mono text-[1.1rem] font-light tabular-nums text-[color:var(--board-slate-soft)]">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-[0.98rem] font-semibold">
                      {el.titre}
                    </h3>
                    {el.etat && (
                      <StatusPill charte="board" status={el.etat} size="sm" />
                    )}
                  </div>
                  <p className="mt-1 text-[0.85rem] text-[color:var(--board-slate-mid)]">
                    {el.description}
                  </p>
                  {el.reference && (
                    <p className="mt-1.5 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-[color:var(--board-slate-soft)]">
                      § {el.reference}
                    </p>
                  )}
                </div>
                {/* `aria-hidden` privait un lecteur d'écran de la seule
                    information de cette colonne. Elle est nommée
                    maintenant — et nommée par ce qu'elle veut dire, pas par
                    son dessin. */}
                <span
                  title={
                    el.present
                      ? "Incluse dans le ZIP"
                      : "Absente du ZIP"
                  }
                  className={
                    "shrink-0 font-mono text-[1.1rem] " +
                    (el.present ? "text-[color:var(--board-green-ink)]" : "text-[color:var(--board-slate-soft)]")
                  }
                >
                  <span aria-hidden>{el.present ? "✓" : "○"}</span>
                  <span className="sr-only">
                    {el.present ? "Incluse dans le ZIP" : "Absente du ZIP"}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* Pourquoi ça nous rassure */}
        <section className="mt-10">
          <WhyCard charte="board"
            kicker="D'où viennent les pièces"
            titre="Ce que vous avez saisi, et les textes qu'elles citent."
            enjeu="Chaque document de ce dossier est généré à partir de ce que vous avez saisi et de ce que Rojer en calcule (obligations, échéances, retards). Les articles cités sont lus sur Légifrance ; les brochures INRS sont nommées pour ce qu'elles sont, ni article de code, ni arrêté."
            tonalite="info"
          >
            <p>
              Si un inspecteur conteste une pièce, vous pouvez la retrouver
              dans l&apos;application, à l&apos;écran d&apos;où elle vient.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <LegalBadge
                charte="board"
                reference="Art. R. 4121-1 CT · DUERP"
                href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000023795562"
                extrait="L'employeur transcrit et met à jour dans un document unique les résultats de l'évaluation des risques pour la santé et la sécurité des travailleurs à laquelle il procède en application de l'article L. 4121-3."
              />
              <LegalBadge
                charte="board"
                reference="Art. R. 4323-25 CT · Registre"
                href="https://www.legifrance.gouv.fr/codes/id/LEGISCTA000018531481/"
                extrait="Le résultat des vérifications générales périodiques est consigné sur le ou les registres de sécurité mentionnés à l'article L. 4711-5."
              />
              {/* L'ancienne pastille citait « Arrêté 19-04-2017 » seul, sans
                  lien. Relu à la source le 2026-08-28 : l'arrêté fixe le
                  CONTENU du registre, il ne l'institue pas — c'est
                  R. 164-6 CCH qui l'impose à l'exploitant, depuis la
                  recodification du 1er juillet 2021 (ex-R. 111-19-60). C'est
                  donc l'article qui est cité et ouvert ; l'arrêté est nommé
                  dans le complément, là où il agit. */}
              <LegalBadge
                charte="board"
                reference="Art. R. 164-6 CCH · Accessibilité"
                href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819305"
                extrait="L'exploitant de tout établissement recevant du public au sens de l'article R. 143-2 élabore le registre public d'accessibilité prévu à l'article L. 164-1. Celui-ci précise les dispositions prises pour permettre à tous, notamment aux personnes handicapées, quel que soit leur handicap, de bénéficier des prestations en vue desquelles cet établissement a été conçu."
              >
                <p>
                  L&apos;arrêté du 19 avril 2017 en fixe le contenu et les
                  modalités de diffusion : prestations fournies, pièces
                  administratives d&apos;accessibilité, formation du personnel
                  d&apos;accueil.
                </p>
              </LegalBadge>
              <LegalBadge
                charte="board"
                reference="Art. L. 8222-1 CT · Vigilance"
                href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024197683"
                extrait="Toute personne vérifie lors de la conclusion d'un contrat dont l'objet porte sur une obligation d'un montant minimum en vue de l'exécution d'un travail, de la fourniture d'une prestation de services ou de l'accomplissement d'un acte de commerce, et périodiquement jusqu'à la fin de l'exécution du contrat, que son cocontractant s'acquitte : 1° des formalités mentionnées aux articles L. 8221-3 et L. 8221-5 […]"
              >
                <p>
                  Le montant plancher — 5 000 € HT — et le rythme semestriel
                  ne sont pas dans cet article : ils viennent de
                  R. 8222-1 et D. 8222-5.
                </p>
              </LegalBadge>
            </div>
          </WhyCard>
        </section>

        {/* Rappel footer */}
        <footer className="mt-10 border-t border-dashed border-[color:var(--board-slate)] pt-6 text-center font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[color:var(--board-slate-mid)]">
          Ce dossier est un outil d&apos;aide · la responsabilité juridique
          reste celle de l&apos;employeur.{" "}
          <Link
            href={`/etablissements/${id}/guide`}
            className="text-[color:var(--board-blue-ink)] hover:underline"
          >
            Consulter le guide →
          </Link>
        </footer>
      </main>
    </>
  );
}

/** Les points à corriger ouverts, dits avec le plan d'actions (ADR-048, lot 3). */
function phrasePoints(p: { totalACouvrir: number; enRetard: number }): string {
  if (p.totalACouvrir === 0) return "Aucun point à corriger ouvert.";
  const retard = p.enRetard > 0 ? `, dont ${p.enRetard} en retard` : "";
  return `${p.totalACouvrir} point${p.totalACouvrir > 1 ? "s" : ""} à corriger ouvert${p.totalACouvrir > 1 ? "s" : ""}${retard}, au dossier de conformité.`;
}
