import { notFound } from "next/navigation";
import {
  CarteFiche,
  ChampFiche,
  ChampsFiche,
  CorpsFiche,
  EcranFiche,
  LegalBadge,
  PastilleFiche,
} from "@/components/ui-kit";
import {
  BasculerEffectif,
  RetirerTitreButton,
} from "@/components/salaries/ActionsSalarie";
import { FormulaireTitre } from "@/components/salaries/FormulaireTitre";
import { lireProvenance } from "@/lib/navigation/provenance";
import { requireEtablissement } from "@/lib/auth/scope";
import { getSalarie } from "@/lib/salaries/queries";
import {
  cataloguerTitres,
  conflitsExclusion,
  exclusionsDuTitre,
} from "@/lib/salaries/catalogue";
import { declarerTitre } from "@/lib/salaries/actions";
import { obligationsDeclencheesParUnFait } from "@/lib/salaries/obligations-evenementielles";
import { CHAMP_ETAT, ENCRE_ETAT, type RegistreLigne } from "@/lib/calendrier/etats";
import { formaterDateLongueFr } from "@/lib/dates";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

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
  // manqué. Le Code renvoie ici à des modalités qu'il qualifie lui-même de
  // recommandées (ADR-023 § 6) — décréter une échéance serait inventer une
  // non-conformité.
  aPlanifier: "Sans terme écrit",
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

  const catalogue = cataloguerTitres();
  const dejaDeclares = s.titres.map((t) => t.obligationId);

  // Les cumuls que le droit écarte et qui sont DÉJÀ en place. Refuser les
  // saisies futures ne répare aucun dossier existant : c'est de ceux-là que
  // sort aujourd'hui l'échéance inventée, et le produit ne peut pas trancher à
  // la place du dirigeant — lui seul sait laquelle des deux visites cette
  // personne passe réellement.
  const conflits = conflitsExclusion(dejaDeclares);

  // Ce qu'un fait rend dû, joint aux titres de cette personne. La liste est la
  // même pour tout l'effectif, et c'est exact : le moteur ne dérive rien d'un
  // porteur salarié (ADR-023), et la formation à la sécurité de `L. 4141-2` est
  // due à TOUS les travailleurs. Ce qui varie d'une fiche à l'autre est la date
  // du dernier titre déclaré, pas la liste.
  const declenchees = obligationsDeclencheesParUnFait(s.titres);

  const action = declarerTitre.bind(null, id, salarieId);
  const provenance = lireProvenance(de, id);
  const annuaire = { href: `/etablissements/${id}/equipe`, label: "Équipe" };

  return (
    <EcranFiche provenance={provenance} canonique={annuaire}>
      <CorpsFiche
        principal={
          <>
            <section className="carte-board px-7 py-6 sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                    {s.poste ?? "Poste non renseigné"}
                  </p>
                  <h1 className="board-titre m-0 mt-2 max-w-[30ch] text-[clamp(23px,2.1vw,30px)]">
                    {s.prenom} {s.nom}
                  </h1>
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    {!s.actif && (
                      <PastilleFiche ton="neutre">
                        Sortie de l&apos;effectif
                      </PastilleFiche>
                    )}
                    <PastilleFiche ton={s.titres.length > 0 ? "bleu" : "neutre"}>
                      {s.titres.length === 0
                        ? "Aucun titre déclaré"
                        : `${s.titres.length} titre${s.titres.length > 1 ? "s" : ""}`}
                    </PastilleFiche>
                  </div>
                </div>
                <div className="flex flex-none flex-wrap items-center gap-2">
                  <Link
                    href={`/etablissements/${id}/equipe/${s.id}/modifier`}
                    className={buttonVariants({
                      variant: "boardClair",
                      size: "boardSm",
                    })}
                  >
                    Corriger
                  </Link>
                  <BasculerEffectif
                    etablissementId={id}
                    salarieId={s.id}
                    actif={s.actif}
                  />
                </div>
              </div>

              {!s.actif && (
                <p className="m-0 mt-4 max-w-[64ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  Cette personne ne fait plus partie de l&apos;effectif. Sa fiche
                  est conservée parce que ses titres prouvent qu&apos;elle était
                  habilitée au moment où elle a travaillé — c&apos;est cette
                  preuve qui vous couvre sur la période passée.
                </p>
              )}
            </section>

            <CarteFiche titreFort="Titres détenus">
              {conflits.length > 0 && (
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
              )}
              {s.titres.length === 0 ? (
                <p className="m-0 max-w-[64ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                  Rien de déclaré pour l&apos;instant. Rojer ne peut pas le
                  deviner : rien dans un intitulé de poste ne dit qu&apos;une
                  personne conduit un chariot, travaille au voisinage de pièces
                  sous tension, est formée au secourisme ou relève d&apos;un
                  suivi médical renforcé.
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {s.titres.map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-[18px] bg-[color:var(--board-slate-pale)] px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="m-0 text-[13.5px] font-semibold leading-tight text-[color:var(--board-slate-ink)]">
                          {t.libelle}
                        </p>
                        <p className="m-0 mt-1 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                          Délivré le {formaterDateLongueFr(t.delivreLe)}
                          {t.echeanceLe
                            ? ` · valable jusqu'au ${formaterDateLongueFr(t.echeanceLe)}`
                            : " · aucune date de fin portée sur le titre"}
                        </p>
                        {t.note && (
                          <p className="m-0 mt-1 text-[12px] leading-[1.5] text-[color:var(--board-slate-soft)]">
                            {t.note}
                          </p>
                        )}
                        {t.pieceMedicale && (
                          <p className="m-0 mt-1.5 text-[11.5px] leading-[1.45] text-[color:var(--board-slate-soft)]">
                            Rojer n&apos;enregistre que l&apos;existence de cette
                            attestation et ses dates. Le document reste chez vous.
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          {/* `ReferenceLegale.url` est optionnel : une
                              référence sans URL rendait une pastille muette —
                              l'apparence d'un lien, rien dessous. Le type de
                              `LegalBadge` l'interdit désormais. Sans URL, la
                              référence s'écrit donc en texte : elle dit d'où
                              vient la contrainte sans promettre de l'ouvrir. */}
                          {t.referencesLegales.slice(0, 1).map((r) =>
                            r.url ? (
                              <LegalBadge
                                key={r.article ?? r.reference}
                                charte="board"
                                reference={r.reference}
                                href={r.url}
                              />
                            ) : (
                              <span
                                key={r.article ?? r.reference}
                                className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)]"
                              >
                                § {r.reference}
                              </span>
                            ),
                          )}
                          <RetirerTitreButton
                            etablissementId={id}
                            salarieId={s.id}
                            titreId={t.id}
                            libelle={t.libelle}
                          />
                        </div>
                      </div>

                      {/* Le point porte l'état, le mot le nomme : une
                          signalétique qui tient à une couleur disparaît en
                          niveaux de gris et pour qui n'y voit pas. */}
                      <span
                        className="inline-flex flex-none items-center gap-1.5 whitespace-nowrap text-[11.5px] font-semibold"
                        style={{ color: ENCRE_ETAT[t.etat] }}
                      >
                        <span
                          aria-hidden
                          className="size-[7px] flex-none rounded-full"
                          style={{ background: CHAMP_ETAT[t.etat] }}
                        />
                        {MOT_DE_L_ETAT[t.etat]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CarteFiche>

            {/* CE QUE LE CALENDRIER NE PEUT PAS PORTER, ET QUI EST DÛ QUAND
                MÊME. Deux obligations du catalogue sont `evenementielle` et
                `autre` : elles reviennent, sans qu'aucun texte n'écrive de
                rythme, sur un fait que le produit n'observe pas. Le générateur
                ne leur ouvre donc aucune occurrence et « Ce qui doit être en
                place » les refuse — jusqu'ici elles n'existaient que dans le
                menu déroulant ci-dessous, c'est-à-dire comme une OPTION DE
                SAISIE et jamais comme une obligation due.

                L'ADR-022 dit où elles vivent : une obligation se porte sur un
                sujet, et le sujet est la personne. Elles sont donc ici, sur sa
                fiche, et **au-dessus** du formulaire : on lit ce qui est dû
                avant de lire ce qu'on peut saisir. */}
            <CarteFiche titreFort="Ce qui se déclenche pour cette personne">
              {declenchees.length === 0 ? (
                <p className="m-0 max-w-[64ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                  Aucune obligation de ce genre n&apos;est encodée au
                  référentiel aujourd&apos;hui.
                </p>
              ) : (
                <>
                  <p className="m-0 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                    Ces obligations ne tombent à aucune date : elles sont dues à
                    un <strong className="font-semibold">fait</strong>{" "}
                    — une embauche, un changement de poste, la prise en main
                    d&apos;un engin. Rojer ne voit aucun de ces faits, donc il
                    n&apos;ouvre ici ni échéance ni retard. Chaque ligne dit à
                    quoi elle se déclenche ; vous seul savez quand le fait
                    arrive.
                  </p>
                  <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
                    {declenchees.map(({ obligation, dernierTitreLe }) => (
                      <li
                        key={obligation.id}
                        className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-4 py-3.5"
                      >
                        <p className="m-0 text-[13.5px] font-semibold leading-tight text-[color:var(--board-slate-ink)]">
                          {obligation.libelle}
                        </p>
                        {/* La phrase du RÉFÉRENTIEL, pas une reformulation.
                            C'est elle qui nomme le déclencheur — « lors de son
                            embauche, lors d'un changement de poste » — et une
                            paraphrase écrite ici finirait par dire autre chose
                            que le texte relu. */}
                        <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                          {obligation.description}
                        </p>
                        <p className="m-0 mt-2 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-soft)]">
                          {dernierTitreLe
                            ? `Un titre est déclaré pour cette obligation, délivré le ${formaterDateLongueFr(dernierTitreLe)}. Il ne la referme pas : elle redevient due au fait suivant.`
                            : "Aucun titre n'est déclaré pour cette obligation. Ce n'est pas un retard : aucune date ne dit quand elle était due."}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-3">
                          {obligation.referencesLegales.slice(0, 1).map((r) =>
                            r.url ? (
                              <LegalBadge
                                key={r.article ?? r.reference}
                                charte="board"
                                reference={r.reference}
                                href={r.url}
                              />
                            ) : (
                              <span
                                key={r.article ?? r.reference}
                                className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)]"
                              >
                                § {r.reference}
                              </span>
                            ),
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CarteFiche>

            <CarteFiche titreFort="Déclarer un titre">
              {catalogue.length === 0 ? (
                <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                  Aucun titre n&apos;est encore encodé au référentiel.
                </p>
              ) : (
                <FormulaireTitre
                  catalogue={catalogue.map((o) => {
                    // Un titre déjà déclaré n'est pas bloqué par lui-même :
                    // le redéclarer est un renouvellement.
                    const bloquant = exclusionsDuTitre(o.id).find(
                      (x) => x.titre.id !== o.id && dejaDeclares.includes(x.titre.id),
                    );
                    return {
                      id: o.id,
                      libelle: o.libelle,
                      description: o.description,
                      pieceMedicale: o.pieceMedicale,
                      periodicite: o.periodicite,
                      bloquePar: bloquant
                        ? { libelle: bloquant.titre.libelle, motif: bloquant.motif }
                        : undefined,
                    };
                  })}
                  action={action}
                  dejaDeclares={dejaDeclares}
                />
              )}
            </CarteFiche>

            {/* Le droit d'accès de la personne suivie (art. 15 RGPD). Elle n'a
                pas accès à l'outil : elle demande à son employeur, qui est le
                responsable de traitement. Sans ce bouton, l'employeur devrait
                recopier un écran à la main pour honorer une demande — et
                `docs/rgpd.md` § 5.2 promettrait un droit que rien ne sert. */}
            <CarteFiche titre="Ce que Rojer enregistre sur cette personne">
              <p className="m-0 max-w-[64ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Son nom, son poste, sa date d&apos;entrée, et pour chaque titre
                sa nature et ses dates. Rien d&apos;autre — pas de date de
                naissance, pas de numéro de sécurité sociale, aucune donnée de
                santé. Si elle vous demande ce que vous détenez sur elle, vous
                pouvez le lui remettre :
              </p>
              <div className="mt-4">
                <Link
                  href={`/api/etablissements/${id}/equipe/${s.id}/donnees`}
                  className={buttonVariants({
                    variant: "boardClair",
                    size: "boardSm",
                  })}
                >
                  <Download className="size-3.5" aria-hidden />
                  Éditer ses données
                </Link>
              </div>
              <p className="m-0 mt-3 max-w-[64ch] text-[12px] leading-[1.55] text-[color:var(--board-slate-soft)]">
                Le droit à l&apos;effacement est limité sur ces données :
                l&apos;article 17.3.b du RGPD excepte ce qui est conservé au
                titre d&apos;une obligation légale. Mieux vaut le lui dire que
                lui promettre un droit qu&apos;on ne peut pas honorer.
              </p>
            </CarteFiche>

            <CarteFiche titre="Repères">
              <ChampsFiche>
                <ChampFiche cle="Entrée dans l'effectif">
                  {s.entreLe ? formaterDateLongueFr(s.entreLe) : "Non renseignée"}
                </ChampFiche>
                <ChampFiche cle="Fiche créée le">
                  {formaterDateLongueFr(s.createdAt)}
                </ChampFiche>
              </ChampsFiche>
            </CarteFiche>
          </>
        }
      />
    </EcranFiche>
  );
}
