import { notFound } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { EcranFiche, PastilleFiche } from "@/components/ui-kit";
import { buttonVariants } from "@/components/ui/button";
import {
  BasculerEffectif,
  RetirerTitreButton,
  SupprimerSalarieButton,
} from "@/components/salaries/ActionsSalarie";
import { CarteCeQuiManque } from "@/components/salaries/CarteCeQuiManque";
import { CarteTitresDetenus, type LigneTitre } from "@/components/salaries/CarteTitresDetenus";
import { HeroSalarie } from "@/components/salaries/HeroSalarie";
import {
  BoutonAjouterTitre,
  BoutonDeclarer,
  DeclarationTitre,
} from "@/components/salaries/ModaleTitre";
import { requireEtablissement } from "@/lib/auth/scope";
import { LIBELLE_SANS_RENDEZ_VOUS, type RegistreLigne } from "@/lib/calendrier/etats";
import { LABEL_PERIODICITE } from "@/lib/calendrier/labels";
import { formaterDateCourteFr, formaterDateLongueFr } from "@/lib/dates";
import { lireProvenance } from "@/lib/navigation/provenance";
import { mentionRythmeRetenu } from "@/lib/referentiels/conformite/mention-rythme";
import { renvoiAuxNormes } from "@/lib/referentiels/conformite/renvoi-aux-normes";
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";
import { declarerTitre } from "@/lib/salaries/actions";
import {
  cataloguerTitres,
  conflitsExclusion,
  exclusionsDuTitre,
} from "@/lib/salaries/catalogue";
import { ceQuiManqueALaPersonne, etatDuManque } from "@/lib/salaries/du-a-la-personne";
import { jaugeDuTitre } from "@/lib/salaries/jauge-titre";
import { dessinDuTitre } from "@/lib/salaries/illustration-titre";
import { obligationsDeclencheesParUnFait } from "@/lib/salaries/obligations-evenementielles";
import { getSalarie } from "@/lib/salaries/queries";
import { rythmeEnBref } from "@/lib/salaries/rythme-en-bref";
import { perimetreSuppressionSalarie } from "@/lib/salaries/suppression";

/**
 * La fiche d'une personne : ce qu'elle détient, et jusqu'à quand.
 *
 * Elle se monte avec le kit `ui-kit/fiche/`, comme les six autres fiches du
 * produit — c'est le même geste pour l'utilisateur, qu'il ouvre un équipement,
 * une vérification ou une personne.
 */
const MOT_DE_L_ETAT: Record<RegistreLigne, string> = {
  faite: "À jour",
  lointain: "À jour",
  // L'obligation ne s'applique plus ; la ligne n'est gardée que pour la
  // preuve qu'elle porte (ADR-012). Ni « à jour » — ce serait s'attribuer une
  // conformité —, ni « dépassée » — ce serait annoncer un retard sur ce qui
  // n'est plus dû.
  archivee: "Ne s'applique plus",
  proche: "Échéance déclarée proche",
  enRetard: "Échéance déclarée dépassée",
  // Pas « en retard » : un titre sans terme écrit n'a pas de rendez-vous
  // manqué. ~~Le Code renvoie ici à des modalités qu'il qualifie lui-même de
  // recommandées (ADR-023 § 6)~~ [2026-10-15, `lot/menage-1015` : c'était
  // l'habilitation, qui porte un rythme retenu triennal depuis C66,
  // 9ac4d98c] — décréter une échéance serait inventer une non-conformité.
  aPlanifier: "Sans terme écrit",
  // Un TITRE n'est jamais classé ainsi (`classerTitre`) : la table est fermée
  // sur les états d'une ligne, et le mot est le même que celui du calendrier.
  sansRendezVous: LIBELLE_SANS_RENDEZ_VOUS,
  // Un titre ne l'est jamais non plus — la table est fermée (C64).
  pourInformation: "Pour information",
  // Ni celui-là : la prudence ne vise que les lignes du calendrier (D26).
  aConfirmer: "À confirmer",
};

/**
 * Le même mot quand l'échéance est CALCULÉE — aucune date de fin sur la pièce,
 * la délivrance plus la durée du texte (`echeanceDuTitre`).
 *
 * « Déclarée » y était faux, et dans le mauvais sens : la raison du mot est que
 * la date vient de la pièce et non d'un texte ; sur une VIP sans date de fin,
 * c'est l'inverse — le dirigeant a précisément déclaré qu'il n'en avait pas, et
 * la date vient du texte (relecture du lot, 2026-09-14).
 */
const MOT_DE_L_ECHEANCE_CALCULEE: Record<"proche" | "enRetard", string> = {
  proche: "Échéance calculée proche",
  enRetard: "Échéance calculée dépassée",
};

// POURQUOI « DÉCLARÉE » DANS LES DEUX MOTS DU MILIEU. Ils disaient « Expire
// bientôt » et « Expiré », et l'entrée au catalogue de l'habilitation
// électrique (`elec-salarie-habilitation`, 2026-09-01) rend cette formulation
// intenable. La date qu'un dirigeant saisit sur ce titre-là ne vient d'aucun
// texte : `R. 4544-10` renvoie aux modalités de normes qu'il qualifie
// lui-même de recommandées, et le triennal que portent les attestations de
// recyclage vient de la NF C 18-510 — pas du Code. « Expiré », dans un outil
// de conformité, se lit comme un état de droit ; ici c'est la date de
// l'organisme de formation qui est passée, rien d'autre.
//
// Le mot vaut pour TOUS les titres, y compris ceux dont l'échéance est bien
// légale (VIP, suivi renforcé, attestation médicale). Il les sous-dit un peu.
// C'est le sens d'erreur voulu : sur ceux-là, le dirigeant lit la date et
// l'article juste à côté sur la même ligne et peut se corriger ; sur
// l'habilitation, rien à l'écran ne lui aurait signalé que « Expiré » ne
// venait pas du droit.
//
// Ce qui n'a PAS été touché, et qui reste ouvert : « À jour ». C'est une
// affirmation positive sur l'état d'une personne, et le dépôt s'interdit de
// dire à un dirigeant qu'il est conforme (CLAUDE.md, règle 8). La reprendre
// demande de décider ce que l'écran affirme, pas de choisir un synonyme —
// ce lot ne le tranche pas.

export default async function SalarieDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; salarieId: string }>;
  searchParams: Promise<{ de?: string }>;
}) {
  const { id, salarieId } = await params;
  const { de } = await searchParams;
  await requireEtablissement(id);

  const now = new Date();
  const s = await getSalarie(id, salarieId, now);
  if (!s) notFound();
  // Ce que « Supprimer ce salarié » emporterait, compté par la requête même
  // de l'effacement (`suppression.ts`) : la confirmation annonce ce qui part.
  const perimetre = await perimetreSuppressionSalarie(id, salarieId);

  const catalogue = cataloguerTitres();
  const dejaDeclares = s.titres.map((t) => t.obligationId);

  // Les cumuls que le droit écarte et qui sont DÉJÀ en place. Refuser les
  // saisies futures ne répare aucun dossier existant : c'est de ceux-là que
  // sort aujourd'hui l'échéance inventée, et le produit ne peut pas trancher à
  // la place du dirigeant — lui seul sait laquelle des deux visites cette
  // personne passe réellement.
  const conflits = conflitsExclusion(dejaDeclares);

  // Ce qui manque à cette personne (ADR-043) : les titres dus à l'entrée et
  // ceux qu'un titre déclaré appelle, jamais déclarés. La même fonction que le
  // badge d'Équipe.
  const manques = ceQuiManqueALaPersonne(s, s.titres);
  const manquants = new Set(manques.map((m) => m.obligation.id));

  // Les titres qu'un fait redéclenche — la formation à la sécurité, due de
  // nouveau à un changement de poste ou de technique. ~~Une carte « Ce qui se
  // déclenche pour cette personne » les listait~~ [2026-10-24, refonte de la
  // fiche : jamais déclaré, le titre est dans « À déclarer » ; déclaré, la
  // ligne du titre dit qu'il redeviendra dû. La carte répétait l'un ou
  // l'autre.]
  const redeclenches = new Set(
    obligationsDeclencheesParUnFait().map((d) => d.obligation.id),
  );

  // ~~La carte « Formations liées aux risques du poste » (ADR-038)~~
  // [2026-10-24, décision de la propriétaire : retirée de la fiche. Les
  // questions portent sur l'établissement, et Rojer ne sait pas qui fait la
  // tâche (ADR-023) : sur la fiche d'un serveur, elle proposait l'habilitation
  // électrique. Ce qu'elle disait vit ailleurs — les questions sur
  // « Évaluer les risques de vos salariés », les formations et l'habilitation
  // du personnel sur Équipe › Formations, les manques ci-dessous.]

  const action = declarerTitre.bind(null, id, salarieId);
  const provenance = lireProvenance(de, id);
  const annuaire = { href: `/etablissements/${id}/equipe`, label: "Équipe" };
  const nom = `${s.prenom} ${s.nom}`;

  const lignes: LigneTitre[] = s.titres.map((t) => ({
    id: t.id,
    obligationId: t.obligationId,
    libelle: t.libelle,
    // TROIS CAS, ET LE DEUXIÈME MANQUAIT. La ligne disait « aucune date de fin
    // portée sur le titre » dès que `echeanceLe` était vide — y compris sur
    // une VIP dont le calendrier inscrivait bel et bien la visite suivante,
    // calculée depuis la délivrance. L'échéance affichée est celle de
    // `echeanceDuTitre`, la même que le calendrier, et la phrase dit d'où elle
    // vient : une date calculée sur un plafond légal ne se présente pas comme
    // la date de la pièce. Et elle dit le CALCUL, pas « la durée écrite dans
    // le texte » : pour la formation du membre du CSE, L. 2315-17 pose une
    // borne liée au mandat, pas une durée depuis la délivrance.
    dates:
      `Délivré le ${formaterDateCourteFr(t.delivreLe)} · ` +
      (t.echeanceLe
        ? `jusqu'au ${formaterDateCourteFr(t.echeanceLe)}`
        : t.echeance && t.periodicite
          ? `jusqu'au ${formaterDateCourteFr(t.echeance)} (calculé : ${LABEL_PERIODICITE[t.periodicite].toLowerCase()})`
          : "sans date de fin"),
    etat: t.etat,
    mot:
      t.echeanceLe === null && (t.etat === "enRetard" || t.etat === "proche")
        ? MOT_DE_L_ECHEANCE_CALCULEE[t.etat]
        : t.etat === "aPlanifier" && t.renvoiAuxNormes
          ? // « Sans terme écrit » est vrai du Code et incomplet : il renvoie
            // le rythme aux normes (revue de fidélité du 2026-10-07).
            t.renvoiAuxNormes.court
          : MOT_DE_L_ETAT[t.etat],
    dessin: dessinDuTitre(t.obligationId),
    jauge: jaugeDuTitre(t, now),
    referencesLegales: t.referencesLegales,
    // ADR-039 : un rythme que le texte n'écrit pas se dit comme tel, à côté
    // de l'échéance qu'il calcule.
    rythmeRetenu: t.rythmeRetenu,
    renvoiAuxNormes: t.renvoiAuxNormes && !t.echeanceLe ? t.renvoiAuxNormes.long : null,
    note: t.note,
    redevientDue: s.actif && redeclenches.has(t.obligationId),
    geste:
      s.actif && (t.etat === "enRetard" || t.etat === "proche") ? (
        <BoutonDeclarer obligationId={t.obligationId} plein={t.etat === "enRetard"}>
          Renouveler
        </BoutonDeclarer>
      ) : null,
    retirer: (
      <RetirerTitreButton
        etablissementId={id}
        salarieId={s.id}
        titreId={t.id}
        libelle={t.libelle}
      />
    ),
  }));

  const manquesEnRetard = manques.filter((m) => etatDuManque(m, now) === "enRetard").length;
  const depasses = s.titres.filter((t) => t.etat === "enRetard").length;

  return (
    <DeclarationTitre
      personne={nom}
      action={action}
      dejaDeclares={dejaDeclares}
      catalogue={catalogue.map((o) => {
        // Un titre déjà déclaré n'est pas bloqué par lui-même : le redéclarer
        // est un renouvellement.
        const bloquant = exclusionsDuTitre(o.id).find(
          (x) => x.titre.id !== o.id && dejaDeclares.includes(x.titre.id),
        );
        return {
          id: o.id,
          libelle: o.libelle,
          description: o.description,
          pieceMedicale: o.pieceMedicale,
          periodicite: periodiciteEffective(o),
          rythmeRetenu: mentionRythmeRetenu(o)?.long ?? null,
          renvoiAuxNormes: renvoiAuxNormes(o)?.long ?? null,
          bloquePar: bloquant
            ? { libelle: bloquant.titre.libelle, motif: bloquant.motif }
            : undefined,
          groupe: manquants.has(o.id) ? "attendu" : o.pieceMedicale ? "medical" : "poste",
          dessin: dessinDuTitre(o.id),
          rythme: rythmeEnBref(o),
        };
      })}
    >
      <EcranFiche
        provenance={provenance}
        canonique={annuaire}
        bandeau={
          <HeroSalarie
            nom={nom}
            surtitre={s.poste ?? "Poste non renseigné"}
            chapeau={
              s.entreLe ? (
                `Dans l'effectif depuis le ${formaterDateLongueFr(s.entreLe)}.`
              ) : (
                <>
                  Date d&apos;entrée non renseignée.{" "}
                  <Link
                    href={`/etablissements/${id}/equipe/${s.id}/modifier`}
                    className="text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline"
                  >
                    La renseigner
                  </Link>
                </>
              )
            }
            pastilles={
              <>
                {!s.actif && (
                  <PastilleFiche ton="neutre">Sortie de l&apos;effectif</PastilleFiche>
                )}
                {manques.length > 0 && (
                  <PastilleFiche ton={manquesEnRetard > 0 ? "retard" : "neutre"}>
                    {manques.length} à déclarer
                  </PastilleFiche>
                )}
                {depasses > 0 && (
                  <PastilleFiche ton="retard">
                    {depasses} échéance{depasses > 1 ? "s" : ""} dépassée{depasses > 1 ? "s" : ""}
                  </PastilleFiche>
                )}
                <PastilleFiche ton={s.titres.length > 0 ? "bleu" : "neutre"}>
                  {s.titres.length === 0
                    ? "Aucun titre déclaré"
                    : `${s.titres.length} titre${s.titres.length > 1 ? "s" : ""}`}
                </PastilleFiche>
              </>
            }
            actions={
              <>
                <Link
                  href={`/etablissements/${id}/equipe/${s.id}/modifier`}
                  className={buttonVariants({ variant: "boardClair", size: "boardSm" })}
                >
                  Corriger
                </Link>
                <BasculerEffectif etablissementId={id} salarieId={s.id} actif={s.actif} />
                {perimetre && (
                  <SupprimerSalarieButton
                    etablissementId={id}
                    salarieId={s.id}
                    nom={nom}
                    perimetre={perimetre}
                  />
                )}
              </>
            }
          />
        }
      >
        {!s.actif && (
          <p className="m-0 max-w-[64ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Cette personne ne fait plus partie de l&apos;effectif. Sa fiche et
            ses titres restent enregistrés tant que vous ne la supprimez pas :
            « Supprimer ce salarié » les efface définitivement.
          </p>
        )}

        {/* Au-dessus de tout, « Titres détenus » compris : ce que le droit
            doit à cette personne et qu'aucun titre ne porte — le geste à
            faire avant l'inventaire (passage visuel du 2026-10-12). */}
        <CarteCeQuiManque
          manques={manques}
          now={now}
          lienModifier={`/etablissements/${id}/equipe/${s.id}/modifier`}
          geste={(m, enRetard) => (
            <BoutonDeclarer obligationId={m.obligation.id} plein={enRetard}>
              Déclarer
            </BoutonDeclarer>
          )}
        />

        <CarteTitresDetenus
          lignes={lignes}
          ajouter={<BoutonAjouterTitre />}
          avant={
            conflits.length > 0 && (
              <div className="mb-4 flex flex-col gap-3">
                {conflits.map((c) => (
                  <div
                    key={c.titres.map((t) => t.id).join("|")}
                    className="rounded-[18px] bg-[color:var(--board-signal-pale)] px-4 py-3.5"
                  >
                    <p className="m-0 text-[12.5px] font-semibold leading-[1.5] text-[color:var(--board-signal-ink)]">
                      Ces deux titres ne peuvent pas se cumuler : «{" "}
                      {c.titres[0].libelle} » et « {c.titres[1].libelle} ».
                    </p>
                    <p className="m-0 mt-1.5 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                      {c.motif}
                    </p>
                    {/* Rojer ne retire pas le titre de lui-même : lui seul
                        sait lequel des deux s'applique à cette personne, et
                        effacer une déclaration à sa place serait décider
                        d'une conformité qu'on ne constate pas. */}
                    <p className="m-0 mt-1.5 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                      Tant que les deux sont déclarés, votre calendrier porte
                      un rendez-vous que le texte ne prévoit pas. Retirez
                      celui qui ne s&apos;applique pas à cette personne.
                    </p>
                  </div>
                ))}
              </div>
            )
          }
          vide={
            <p className="m-0 max-w-[64ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
              Rien de déclaré pour l&apos;instant. Rojer ne peut pas le
              deviner : rien dans un intitulé de poste ne dit qu&apos;une
              personne conduit un chariot, travaille au voisinage de pièces
              sous tension, est formée au secourisme ou relève d&apos;un
              suivi médical renforcé.
            </p>
          }
        />

        {/* Le droit d'accès de la personne suivie (art. 15 RGPD). Elle n'a
            pas accès à l'outil : elle demande à son employeur, qui est le
            responsable de traitement. Sans ce bouton, l'employeur devrait
            recopier un écran à la main pour honorer une demande — et
            `docs/rgpd.md` § 5.2 promettrait un droit que rien ne sert.
            Posé en pied de fiche, hors carte : c'est une information de
            tenue du dossier, pas un geste de prévention. */}
        <section className="mt-2 flex flex-wrap items-center justify-between gap-x-10 gap-y-3 border-t border-[color:var(--board-slate-line)] pt-5">
          <div className="max-w-[72ch]">
            <p className="m-0 text-[12.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
              Rojer garde son nom, son poste, sa date d&apos;entrée et les dates
              de ses titres — aucune donnée de santé.
            </p>
            {/* [2026-10-24, retour de la propriétaire : ce paragraphe
                s'affichait en entier. Rien ne l'impose à l'écran — l'information
                du salarié (art. 13) incombe à l'employeur et se sert par le
                texte d'Équipe ; l'accès (art. 15), par le bouton. Il reste, au
                dépli, parce qu'il dit ce que Rojer ne prétend pas.] */}
            <details className="mt-1 text-[12px] leading-[1.55] text-[color:var(--board-slate-soft)]">
              <summary className="cursor-pointer text-[color:var(--board-blue-ink)]">
                En savoir plus
              </summary>
              <p className="m-0 mt-1.5">
                Pendant l&apos;emploi, le droit à l&apos;effacement est limité :
                l&apos;article 17.3.b du RGPD excepte le traitement nécessaire
                au respect d&apos;une obligation légale. Une sortie de
                l&apos;effectif garde ses titres ; la durée de conservation
                après un départ n&apos;est pas fixée par un texte que Rojer ait
                identifié. Un titre que vous retirez est effacé
                définitivement. Fiche créée le {formaterDateLongueFr(s.createdAt)}.
              </p>
            </details>
          </div>
          <Link
            href={`/api/etablissements/${id}/equipe/${s.id}/donnees`}
            className={buttonVariants({ variant: "boardClair", size: "boardSm" })}
          >
            <Download className="size-3.5" aria-hidden />
            Éditer ses données
          </Link>
        </section>
      </EcranFiche>
    </DeclarationTitre>
  );
}
