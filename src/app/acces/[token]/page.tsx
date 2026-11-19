import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { clientDuProprietaire } from "@/lib/auth/compte-hors-session";
import { notFound } from "next/navigation";
import { verifierAccessToken } from "@/lib/access-tokens/verify";
import { motifLisible } from "@/lib/access-tokens/motif-lisible";
import { LegalBadge } from "@/components/ui-kit/LegalBadge";
import { SignerOuProposer } from "@/components/signatures/SignerOuProposer";
import { formaterDateFr } from "@/lib/dates";
import { objetEstSignable } from "@/lib/signatures/etat-signable";
import { renvoiOtpPossibleLe } from "@/lib/signatures/otp";
import {
  contenuASigner,
  etablissementDuJeton,
  type ContenuASigner,
  type ContenuPermisASigner,
  type ContenuPlanASigner,
} from "@/lib/signatures/contenu-a-signer";
import {
  CHAPEAU_R4512_8,
  RUBRIQUES_R4512_8,
  texteRubrique,
} from "@/lib/plan-prevention/contenu-r4512-8";
import { ligneHeuresRevisees } from "@/lib/plan-prevention/annonces-plan";
import { LABEL_NATURE } from "@/lib/permis-feu/schema";
import { mesureParId, surListeAnterieure } from "@/lib/permis-feu/referentiel";
import type { PartieSignataire } from "@prisma/client";

/**
 * Page publique non authentifiée : un prestataire arrive ici via un lien
 * magique envoyé par email. Selon le scope du token, on propose une action
 * (signer / déposer un rapport / consulter).
 *
 * Au MVP, on implémente le scope `signature`. Les autres scopes affichent
 * un message « à venir » avec les détails de l'objet.
 *
 * Gabarit repris de l'interface approuvée (cahier de reprise § 3.1,
 * 2026-11-19) : en-tête centré, UNE carte — référence, faits en grille,
 * badge « Vous », contenu du plan — et son pied « Action requise », qui porte
 * la signature ou la proposition (`SignerOuProposer`). Le contenu est celui
 * d'avant, entier : parties, travaux, risques, rubriques de R. 4512-8, textes.
 * Les états d'un lien inutilisable partagent un même habillage (`EtatDuLien`),
 * leur motif traduit (`motifLisible`).
 *
 * Les morceaux (`etatDuLien`, `fait`, `vous`) sont des fonctions qui rendent
 * du JSX, pas des composants : la page reste un seul arbre, qu'un test lit en
 * entier.
 */
export default async function AccesParTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const res = await verifierAccessToken(token);

  if (!res.ok) {
    // Qui contacter : l'entreprise du lien, quand le lien a existé.
    const contact = res.raison === "inexistant" ? null : await entrepriseDuLien(res.etablissementId);
    switch (res.raison) {
      case "inexistant":
        return etatDuLien({
          titre: "Ce lien n'existe pas",
          phrase: "Vérifiez que vous avez bien ouvert le dernier lien reçu, en entier.",
          contact,
        });
      case "expire":
        return etatDuLien({
          titre: "Ce lien a expiré",
          phrase: `Il était valable jusqu'au ${formaterDateFr(res.expireLe)}.`,
          contact,
        });
      case "revoque":
        return etatDuLien({ titre: "Ce lien a été révoqué", phrase: motifLisible(res.motif), contact });
      case "deja_utilise":
        return etatDuLien({
          titre: "Ce lien a déjà servi",
          phrase: `Le document a été signé le ${formaterDateFr(res.utiliseLe)}.`,
          contact,
          si: "Si une nouvelle signature vous est demandée",
        });
    }
  }

  const t = res.token;

  // Le client borné au compte propriétaire de l'établissement DU JETON
  // (ADR-051). Il s'ajoute aux contrôles du jeton : chaque lecture ci-dessous
  // reste bornée à `t.etablissementId`.
  const db = await clientDuProprietaire(t.etablissementId);
  if (!db) notFound();

  // Récupération du contexte métier pour affichage (qui signe quoi).
  const etablissement = await etablissementDuJeton(db, t.etablissementId);
  if (!etablissement) notFound();
  const demandeur = etablissement.entreprise.raisonSociale;

  // Lecture bornée à l'établissement DU JETON : c'est par une lecture non
  // bornée que cette page a déjà laissé fuir le rapport d'un autre client.
  const contenu = await contenuASigner(
    db,
    t.objetType,
    t.objetId,
    t.etablissementId,
  );
  const libelleObjet = libelleDe(contenu);

  // Un objet clos ou annulé ne se signe plus : on le dit ici plutôt que de
  // présenter un formulaire que la pose de signature refusera. Bornée à
  // l'établissement du jeton, comme toute lecture de cette page.
  if (
    t.scope === "signature" &&
    !(await objetEstSignable(db, t.objetType, t.objetId, t.etablissementId))
  ) {
    // Une proposition de modification attend une décision (ADR-061) : ce
    // n'est ni une clôture ni une panne, et la page le dit pour que le
    // signataire ne croie pas à une erreur.
    const propositionEnAttente =
      t.objetType === "plan_prevention" &&
      (await db.propositionModificationPlan.count({
        where: { planPreventionId: t.objetId, etablissementId: t.etablissementId, enAttente: true },
      })) > 0;
    if (propositionEnAttente) {
      return etatDuLien({
        titre: "Signature en pause, ce n'est pas une erreur",
        phrase:
          "Une modification de ce plan a été proposée, et la personne qui vous a envoyé ce lien ne l'a pas encore acceptée ni refusée. Le plan ne se signe pas d'ici là : revenez sur ce lien plus tard.",
        contact: demandeur,
        si: "Si le plan est modifié",
      });
    }
    return etatDuLien({
      titre: "Ce document n'est plus à signer",
      phrase: "Il a été clos ou annulé par la personne qui vous a envoyé ce lien.",
      contact: demandeur,
      si: "Si une signature reste attendue",
    });
  }

  if (t.scope === "signature") {
    const partie = t.partie;
    const proposition =
      contenu?.type === "plan_prevention" && partie === "entreprise_exterieure"
        ? {
            fiche: {
              entrepriseExterieureRaison: contenu.entrepriseExterieureRaison,
              entrepriseExterieureSiret: contenu.entrepriseExterieureSiret,
              efChefNom: contenu.efChefNom,
              efEffectifIntervenant: contenu.efEffectifIntervenant,
            },
            lignes: contenu.lignes,
          }
        : null;
    const engagee = entrepriseEngagee(contenu, partie, demandeur);

    return (
      <main className="min-h-screen bg-[color:var(--board-canvas)] px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <header className="text-center">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Rojer
            </p>
            <h1 className="board-titre m-0 mt-2 text-[clamp(26px,3vw,34px)]">{titreDePage(contenu)}</h1>
            <p className="m-0 mt-2 text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              Vérifiez les informations ci-dessous avant de signer électroniquement.
            </p>
          </header>

          <article className="carte-board mt-8 overflow-hidden">
            <div className="px-5 py-6 sm:px-8">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {reference(contenu) && (
                  <span className="font-mono text-[12px] tracking-[0.12em] text-[color:var(--board-slate-soft)]">
                    {reference(contenu)}
                  </span>
                )}
                <span className="pastille-board bg-[color:var(--board-amber)] text-[color:var(--board-amber-ink)]">
                  En attente de signatures
                </span>
              </div>
              <h2 className="board-titre m-0 mt-3 text-[22px]">{libelleObjet.titre}</h2>
              <p className="m-0 mt-1 text-[13.5px] text-[color:var(--board-slate-mid)]">
                Signature demandée par <strong className="text-[color:var(--board-ink)]">{demandeur}</strong>
                {" · "}
                {etablissement.raisonDisplay}
              </p>
              {/* ~~L'encadré « Ce que vous signez » (WhyCard)~~ : devenu le
                  chapeau de la carte (cahier § 3.1, 2026-11-19). */}
              <p className="m-0 mt-4 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                {libelleObjet.description}
              </p>
              <div className="mt-3">
                <LegalBadge
                  libelle="Textes"
                  reference="Textes : art. 1366 et 1367 du Code civil · règlement (UE) n° 910/2014"
                  extrait="L'écrit électronique a la même force probante que l'écrit sur support papier, sous réserve que puisse être dûment identifiée la personne dont il émane et qu'il soit établi et conservé dans des conditions de nature à en garantir l'intégrité."
                >
                  Votre signature est posée avec une preuve d&apos;intégrité
                  (empreinte SHA-256 du document) et un horodatage serveur.
                  Vous pourrez à tout moment vérifier qu&apos;elle porte bien sur
                  le document non modifié.
                </LegalBadge>
              </div>

              {contenu?.type === "plan_prevention" && faitsPlan(contenu, demandeur, partie)}
              {contenu?.type === "permis_feu" && faitsPermis(contenu, partie)}
            </div>

            {contenu?.type === "plan_prevention" && sectionsPlan(contenu)}
            {contenu?.type === "permis_feu" && sectionsPermis(contenu)}

            <footer className="border-t border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-5 py-6 sm:px-8">
              <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                Action requise
              </p>
              <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-ink)]">
                {engagee ? (
                  <>
                    Vous engagez <strong>{engagee}</strong>.{" "}
                  </>
                ) : null}
                Signez électroniquement si le document vous convient — le code de confirmation
                part à <strong>{t.emailDestinataire}</strong>
                {proposition ? " —, ou proposez des modifications." : "."}
              </p>
              <div className="mt-5">
                <SignerOuProposer
                  signature={{
                    token,
                    destinataire: { email: t.emailDestinataire, nom: t.nomDestinataire },
                    expireLe: t.expireLe,
                    codeDejaDemande: t.otpHash !== null,
                    essaisRestants: t.otpEssaisRestants,
                    renvoiPossibleLe: renvoiOtpPossibleLe(t.otpExpireLe),
                  }}
                  proposition={proposition}
                />
              </div>
            </footer>
          </article>
        </div>
      </main>
    );
  }

  // Autres scopes — placeholders pour phases futures.
  return (
    <main className="mx-auto max-w-xl px-6 py-16 sm:px-10 text-center">
      <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">Accès externe</p>
      <h1 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.02em]">
        Cette action n&apos;est pas encore disponible
      </h1>
      <p className="mt-4 text-[0.9rem] text-[color:var(--muted-foreground)]">
        Vous avez été invité à : <strong>{t.scope}</strong> sur{" "}
        <em>{libelleObjet.titre}</em>. Ce flux sera activé dans une prochaine
        mise à jour.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block font-mono text-[0.8rem] uppercase tracking-[0.12em] text-[color:var(--board-blue-ink)] hover:underline"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}

/**
 * La raison sociale de l'entreprise d'un lien devenu inutilisable — pour
 * dire qui contacter. Lue par le client borné au propriétaire de
 * l'établissement DU JETON, comme le reste de la page ; `null` au moindre
 * doute (établissement disparu, sans propriétaire).
 */
async function entrepriseDuLien(etablissementId: string): Promise<string | null> {
  const db = await clientDuProprietaire(etablissementId);
  if (!db) return null;
  const etablissement = await etablissementDuJeton(db, etablissementId);
  return etablissement?.entreprise.raisonSociale ?? null;
}

/**
 * Un lien qu'on ne peut pas utiliser : un titre, une phrase, et toujours qui
 * contacter pour en obtenir un nouveau (cahier de reprise § 3.4). Les cas
 * restent ceux d'avant ; seul l'habillage est commun.
 */
function etatDuLien({
  titre,
  phrase,
  contact,
  si,
}: {
  titre: string;
  phrase: string | null;
  /** La raison sociale de l'entreprise du lien, si on la connaît. */
  contact: string | null;
  /** Le cas où un nouveau lien serait utile, quand il n'est pas évident. */
  si?: string;
}) {
  const qui = contact ?? "la personne qui vous a envoyé ce lien";
  const consigne = `contactez ${qui} pour obtenir un nouveau lien.`;
  return (
    <main className="min-h-screen bg-[color:var(--board-canvas)] px-4 py-16 sm:px-6">
      <div className="carte-board mx-auto max-w-xl px-6 py-8 text-center sm:px-8">
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-[color:var(--board-amber)] text-[color:var(--board-amber-ink)]">
          <AlertTriangle aria-hidden className="size-5" />
        </span>
        <h1 className="board-titre m-0 mt-4 text-[22px]">{titre}</h1>
        {phrase ? (
          <p className="m-0 mt-3 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">{phrase}</p>
        ) : null}
        <p className="m-0 mt-3 text-[13.5px] leading-[1.6] text-[color:var(--board-ink)]">
          {si ? `${si}, ${consigne}` : consigne.charAt(0).toUpperCase() + consigne.slice(1)}
        </p>
      </div>
    </main>
  );
}

/**
 * Libellé de l'objet visé, pour dire au porteur du lien ce qu'il signe.
 *
 * Le contenu arrive déjà borné à l'établissement du jeton
 * (`contenuASigner`). Un objet hors de ce périmètre vaut `null` : on retombe
 * sur le libellé générique, exactement comme pour un type d'objet qu'on ne
 * sait pas encore montrer — et l'identifiant interne n'est plus affiché, il
 * n'apprenait rien au signataire.
 */
function libelleDe(contenu: ContenuASigner | null): {
  titre: string;
  description: string;
} {
  if (!contenu) {
    return {
      titre: "Document à signer",
      description:
        "Le détail de ce document n'est pas disponible sur cette page. Rapprochez-vous de la personne qui vous a envoyé ce lien avant de signer.",
    };
  }
  switch (contenu.type) {
    case "rapport_verification":
      return { titre: contenu.titre, description: contenu.description };
    case "plan_prevention":
      return {
        titre: `Plan de prévention ${reference(contenu)}`,
        description:
          "Le plan arrêté en commun avant les travaux (art. R. 4512-6 CT). Votre signature porte sur l'ensemble du contenu ci-dessous : relisez-le avant de signer.",
      };
    case "permis_feu":
      return {
        titre: `Permis de feu ${reference(contenu)}`,
        description:
          "L'autorisation de travaux par point chaud et ses mesures de prévention. Votre signature porte sur l'ensemble du contenu ci-dessous : relisez-le avant de signer.",
      };
  }
}

function titreDePage(contenu: ContenuASigner | null): string {
  if (contenu?.type === "plan_prevention") return "Plan de prévention à signer";
  if (contenu?.type === "permis_feu") return "Permis de feu à signer";
  return "Document à signer";
}

function reference(contenu: ContenuASigner | null): string | null {
  if (contenu?.type === "plan_prevention") return `PP-${String(contenu.numero).padStart(3, "0")}`;
  if (contenu?.type === "permis_feu") return `PF-${String(contenu.numero).padStart(3, "0")}`;
  return null;
}

/** L'entreprise au nom de laquelle le porteur du lien signe, si on la sait. */
function entrepriseEngagee(
  contenu: ContenuASigner | null,
  partie: PartieSignataire | null,
  demandeur: string,
): string | null {
  if (partie === "entreprise_utilisatrice") return demandeur;
  if (partie === "entreprise_exterieure") {
    if (contenu?.type === "plan_prevention") return contenu.entrepriseExterieureRaison;
    if (contenu?.type === "permis_feu") return contenu.prestataireRaison;
  }
  return null;
}

const CLASSE_SECTION = "border-t border-[color:var(--board-slate-line)] px-5 py-6 sm:px-8";
const CLASSE_SURTITRE =
  "board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]";
const CLASSE_TEXTE = "m-0 mt-2 whitespace-pre-wrap text-[14px] leading-[1.55] text-[color:var(--board-ink)]";
const CLASSE_VIDE = "m-0 mt-2 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]";

function periode(debut: Date, fin: Date): string {
  return `Du ${formaterDateFr(debut)} au ${formaterDateFr(fin)}`;
}

/** Le badge « Vous » : la partie au nom de laquelle le porteur du lien signe. */
function vous() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-[color:var(--board-blue-pale)] px-2 py-[1px] align-middle text-[11px] font-semibold text-[color:var(--board-blue-ink)]">
      Vous
    </span>
  );
}

/** Un fait de la grille : sa clé, sa valeur, une précision facultative. */
function Fait({
  cle,
  children,
  large,
}: {
  cle: string;
  children: ReactNode;
  /** Sur les deux colonnes : un texte long. */
  large?: boolean;
}) {
  return (
    <div className={large ? "sm:col-span-2" : undefined}>
      <dt className="text-[12.5px] text-[color:var(--board-slate-mid)]">{cle}</dt>
      <dd className="m-0 mt-0.5 whitespace-pre-wrap text-[14px] leading-[1.45] text-[color:var(--board-ink)]">
        {children}
      </dd>
    </div>
  );
}

const CLASSE_GRILLE = "m-0 mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2";
const CLASSE_PRECISION = "block text-[13px] text-[color:var(--board-slate-mid)]";

/**
 * Le plan tel que le signataire l'engage. Des fonctions qui rendent du JSX,
 * pas des composants : la page reste un seul arbre, qu'un test lit en entier.
 */
function faitsPlan(c: ContenuPlanASigner, raisonSocialeEU: string, partie: PartieSignataire | null) {
  return (
    <dl className={CLASSE_GRILLE}>
      <Fait cle="Entreprise utilisatrice">
        {raisonSocialeEU}
        {partie === "entreprise_utilisatrice" && vous()}
        <span className={CLASSE_PRECISION}>
          {c.euChefNom}
          {c.euChefFonction ? `, ${c.euChefFonction}` : ""}
        </span>
      </Fait>
      <Fait cle="Entreprise extérieure">
        {c.entrepriseExterieureRaison}
        {partie === "entreprise_exterieure" && vous()}
        <span className={CLASSE_PRECISION}>
          {c.efChefNom}
          {c.entrepriseExterieureSiret ? ` · SIRET ${c.entrepriseExterieureSiret}` : ""}
        </span>
      </Fait>
      <Fait cle="Lieu d'intervention">{c.lieux}</Fait>
      <Fait cle="Période">
        {periode(c.dateDebut, c.dateFin)}
        {c.dureeHeuresEstimee != null ? ` · ${c.dureeHeuresEstimee} h estimées` : ""}
      </Fait>
      <Fait cle="Effectif intervenant">
        {c.efEffectifIntervenant} intervenant{c.efEffectifIntervenant > 1 ? "s" : ""}
      </Fait>
      <Fait cle="Inspection commune">
        {c.inspectionDate
          ? `Le ${formaterDateFr(c.inspectionDate)}${
              c.inspectionParticipants ? ` — ${c.inspectionParticipants}` : ""
            }`
          : "Non renseignée"}
      </Fait>
      {/* R. 4512-7, 1°, seconde phrase (2026-10-12) : la révision notée en
          cours de chantier, dans les mots de la fiche. */}
      {c.heuresPrevisiblesRevisees != null && c.heuresPrevisiblesReviseesLe ? (
        <Fait cle="En cours de chantier" large>
          {ligneHeuresRevisees(c.heuresPrevisiblesRevisees, formaterDateFr(c.heuresPrevisiblesReviseesLe))}
        </Fait>
      ) : null}
      <Fait cle="Nature des travaux" large>
        {c.naturesTravaux}
        {c.travauxDangereux
          ? " — travaux figurant sur la liste dangereuse (arrêté du 19 mars 1993)"
          : ""}
      </Fait>
    </dl>
  );
}

function sectionsPlan(c: ContenuPlanASigner) {
  return (
    <>
      <section className={CLASSE_SECTION}>
        <p className={CLASSE_SURTITRE}>Risques d&apos;interférence et mesures de chaque partie</p>
        {c.lignes.length === 0 ? (
          <p className={CLASSE_VIDE}>Aucun risque d&apos;interférence n&apos;est inscrit au plan.</p>
        ) : (
          <ol className="m-0 mt-3 flex list-decimal flex-col gap-3 pl-5 text-[14px] text-[color:var(--board-ink)]">
            {c.lignes.map((l) => (
              <li key={l.ordre}>
                <p className="m-0 font-semibold whitespace-pre-wrap">{l.risque}</p>
                <p className="m-0 mt-1 whitespace-pre-wrap">
                  Entreprise utilisatrice : {l.mesureEntrepriseUtilisatrice || "—"}
                </p>
                <p className="m-0 whitespace-pre-wrap">
                  Entreprise extérieure : {l.mesureEntrepriseExterieure || "—"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={CLASSE_SECTION}>
        <p className={CLASSE_SURTITRE}>Contenu minimal · art. R. 4512-8 CT</p>
        <p className={CLASSE_VIDE}>{CHAPEAU_R4512_8}</p>
        {RUBRIQUES_R4512_8.map((r) => (
          <div key={r.numero} className="mt-4">
            <p className="m-0 text-[14px] font-semibold text-[color:var(--board-ink)]">
              {r.numero}° {r.titre}
            </p>
            {!r.renseignee(c) ? (
              <p className={CLASSE_VIDE}>Non renseigné.</p>
            ) : r.numero === 1 ? (
              <ul className="m-0 mt-2 flex list-disc flex-col gap-2 pl-5 text-[14px] text-[color:var(--board-ink)]">
                {c.phasesDangereuses.map((f) => (
                  <li key={f.ordre} className="whitespace-pre-wrap">
                    {f.phase || "—"} → {f.moyensPrevention || "moyens de prévention non renseignés"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={CLASSE_TEXTE}>{texteRubrique(c, r.numero)}</p>
            )}
          </div>
        ))}
      </section>
    </>
  );
}

function faitsPermis(c: ContenuPermisASigner, partie: PartieSignataire | null) {
  return (
    <dl className={CLASSE_GRILLE}>
      <Fait cle="Intervenant">
        {c.prestataireRaison}
        {partie === "entreprise_exterieure" && vous()}
        <span className={CLASSE_PRECISION}>{c.prestataireContact}</span>
      </Fait>
      <Fait cle="Donneur d'ordre">
        {c.donneurOrdreNom}
        {c.donneurOrdreFonction ? `, ${c.donneurOrdreFonction}` : ""}
        {partie === "entreprise_utilisatrice" && vous()}
      </Fait>
      <Fait cle="Période">{periode(c.dateDebut, c.dateFin)}</Fait>
      <Fait cle="Lieu">{c.lieu}</Fait>
      <Fait cle="Nature">
        {c.naturesTravaux
          .map((n) => LABEL_NATURE[n as keyof typeof LABEL_NATURE] ?? n)
          .join(", ") || "—"}
      </Fait>
      <Fait cle="Surveillance après travaux">{c.dureeSurveillanceMinutes} minutes</Fait>
      <Fait cle="Description" large>
        {c.descriptionTravaux}
      </Fait>
    </dl>
  );
}

function sectionsPermis(c: ContenuPermisASigner) {
  return (
    <section className={CLASSE_SECTION}>
      <p className={CLASSE_SURTITRE}>Mesures de prévention retenues</p>
      {c.mesuresValidees.length === 0 ? (
        <p className={CLASSE_VIDE}>Aucune mesure n&apos;est cochée sur ce permis.</p>
      ) : (
        <ul className="m-0 mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[14px] text-[color:var(--board-ink)]">
          {c.mesuresValidees.map((id) => (
            <li key={id}>{mesureParId(id)?.libelle ?? id}</li>
          ))}
        </ul>
      )}
      {surListeAnterieure(c.mesuresValidees, c.createdAt) ? (
        <p className={CLASSE_TEXTE}>
          Ce permis a été établi sur une liste antérieure de mesures&nbsp;:
          les libellés ci-dessus sont ceux qu&apos;il portait.
        </p>
      ) : null}
      {c.mesuresNotes ? <p className={CLASSE_TEXTE}>{c.mesuresNotes}</p> : null}
    </section>
  );
}
