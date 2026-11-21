import type { ObjetSignable } from "@prisma/client";
import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Check, ChevronDown } from "lucide-react";
import { clientDuProprietaire } from "@/lib/auth/compte-hors-session";
import { notFound } from "next/navigation";
import { verifierAccessToken } from "@/lib/access-tokens/verify";
import { limiterPageDuLien } from "@/lib/access-tokens/limite-lien";
import { messageTropDeTentatives } from "@/lib/securite/limite-debit";
import { motifLisible } from "@/lib/access-tokens/motif-lisible";
import { LegalBadge } from "@/components/ui-kit/LegalBadge";
import { SignerOuProposer } from "@/components/signatures/SignerOuProposer";
import { formaterDateFr, formaterDateLongueFr, formaterHeureFr, formaterJourMoisFr } from "@/lib/dates";
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
import { complementsParPlace, precisionsLigne } from "@/lib/plan-prevention/complements";
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
 * 2026-11-19), habillé selon la maquette V2 (2026-11-21) : bandeau blanc à
 * pastille Rojer, puis des cartes blanches — l'objet (tuile de date, faits
 * en sous-blocs, badge « Vous »), les risques numérotés, le contenu minimal
 * repliable, et « Action requise », qui porte la signature ou la
 * proposition (`SignerOuProposer`). Le contenu est celui
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

  // La limite par réseau de la page d'un lien, AVANT la lecture du jeton :
  // la même réponse, que le lien existe ou non (2026-11-21).
  const limite = await limiterPageDuLien();
  if (!limite.ok) {
    return etatDuLien({
      titre: "Trop de demandes",
      phrase: messageTropDeTentatives(limite.reessayerDansSecondes),
      contact: null,
      si: "Si le problème persiste",
    });
  }

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
        // Retirée depuis (une proposition acceptée, une correction : ADR-061) ?
        // Le lien ne confirme alors plus une signature qui ne vaut plus.
        if (!(await signatureDuLienEnVigueur(res.etablissementId, res.signe))) {
          return etatDuLien({
            titre: "Votre signature a été retirée",
            phrase: `Vous aviez signé le ${formaterDateLongueFr(res.utiliseLe)}. Le document a été modifié depuis : pour le signer de nouveau, il faut un nouveau lien de votre interlocuteur.`,
            contact,
            si: "Si vous n'avez pas reçu de nouveau lien",
          });
        }
        // La confirmation de la signature, sur le lien lui-même (2026-11-21,
        // ADR-006 amendée) : plus d'accusé public `/signe`.
        return etatDuLien({
          titre: "Signature enregistrée",
          phrase: `Signature enregistrée le ${formaterDateLongueFr(res.utiliseLe)} à ${formaterHeureFr(res.utiliseLe)}. Quand toutes les parties auront signé, Rojer adresse à chaque signataire un e-mail avec l'empreinte du document.`,
          contact,
          si: "Si une nouvelle signature vous est demandée",
          confirme: true,
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
              entrepriseExterieureAdresse: contenu.entrepriseExterieureAdresse,
              efChefTelephone: contenu.efChefTelephone,
            },
            lignes: contenu.lignes,
          }
        : null;
    const engagee = entrepriseEngagee(contenu, partie, demandeur);

    return (
      <main className="min-h-screen bg-[color:var(--board-canvas)] pb-12">
        {/* La proposition est un écran à part (`SignerOuProposer`, 2026-11-21). */}
        <SignerOuProposer
          classeConteneur="mx-auto mt-4 flex max-w-3xl flex-col gap-4 px-3 sm:px-6"
          classeCarte={CLASSE_CARTE}
          entete={
            <header className="bg-[color:var(--board-card)]">
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pt-5 pb-2 sm:px-6">
                {pastilleRojer()}
                <span className={CLASSE_MONO}>Signature demandée</span>
              </div>
              <div className="mx-auto max-w-3xl px-4 pt-3 pb-7 sm:px-6">
                <p className={CLASSE_MONO}>De la part de {demandeur}</p>
                <h1 className="m-0 mt-2 font-display text-[clamp(30px,4vw,40px)] leading-[1.02] font-semibold tracking-[-0.035em] text-[color:var(--board-ink)]">
                  {titreDePage(contenu)}
                </h1>
                <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-ink)]">
                  Relisez-le ; signez-le s&apos;il vous convient
                  {proposition ? ", ou proposez une modification" : ""}.
                </p>
              </div>
            </header>
          }
          enteteProposition={
            <header className="bg-[color:var(--board-card)]">
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pt-5 pb-2 sm:px-6">
                {pastilleRojer()}
                <span className={CLASSE_MONO}>Proposition de modifications</span>
              </div>
              <div className="mx-auto max-w-3xl px-4 pt-3 pb-7 sm:px-6">
                <p className={CLASSE_MONO}>De la part de {demandeur}</p>
                <h1 className="m-0 mt-2 font-display text-[clamp(30px,4vw,40px)] leading-[1.02] font-semibold tracking-[-0.035em] text-[color:var(--board-ink)]">
                  Proposer des modifications
                </h1>
                <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-ink)]">
                  {titreDePage(contenu)}. Modifiez ce qui ne convient pas ; {demandeur} accepte, corrige ou refuse votre proposition.
                </p>
              </div>
            </header>
          }
          document={
            <>
              <section className={CLASSE_CARTE}>
                <div className="flex items-center gap-4">
                  {tuileDate(contenu)}
                  <div className="min-w-0">
                    <p className={`${CLASSE_MONO} text-[color:var(--board-slate-ink)]`}>
                      {[reference(contenu), etablissement.raisonDisplay].filter(Boolean).join(" · ")}
                    </p>
                    <h2 className="m-0 mt-1 font-display text-[21px] leading-[1.15] font-semibold tracking-[-0.02em] text-[color:var(--board-ink)]">
                      {libelleObjet.titre}
                    </h2>
                  </div>
                </div>
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
                    (empreinte SHA-256 du document) et un horodatage serveur ;
                    l&apos;empreinte figure sur le PDF du document signé.
                  </LegalBadge>
                </div>

                {contenu?.type === "plan_prevention" && faitsPlan(contenu, demandeur, partie)}
                {contenu?.type === "permis_feu" && faitsPermis(contenu, partie)}
              </section>

              {contenu?.type === "plan_prevention" && sectionsPlan(contenu)}
              {contenu?.type === "permis_feu" && sectionsPermis(contenu)}
            </>
          }
          chapeauAction={
            <>
                <p className={`${CLASSE_MONO} text-[color:var(--board-slate-ink)]`}>Action requise</p>
                <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.6] text-[color:var(--board-ink)]">
                  {engagee ? (
                    <>
                      Vous engagez <strong>{engagee}</strong>.{" "}
                    </>
                  ) : null}
                  Signez électroniquement si le document vous convient — le code de confirmation
                  part à <strong>{t.emailDestinataire}</strong>
                  {proposition ? " —, ou proposez des modifications." : "."}
                </p>
            </>
          }
          signature={{
            token,
            destinataire: { email: t.emailDestinataire, nom: t.nomDestinataire },
            expireLe: t.expireLe,
            codeDejaDemande: t.otpHash !== null,
            essaisRestants: t.otpEssaisRestants,
            renvoiPossibleLe: renvoiOtpPossibleLe(t.otpExpireLe),
            codeExpireLe: t.otpExpireLe,
          }}
          proposition={proposition}
        />
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
/** La signature posée par ce lien est-elle toujours en vigueur ? Dans le doute, oui. */
async function signatureDuLienEnVigueur(
  etablissementId: string,
  signe: { objetType: string | null; objetId: string | null; partie: string | null; email: string } | undefined,
): Promise<boolean> {
  if (!signe?.objetType || !signe.objetId) return true;
  const db = await clientDuProprietaire(etablissementId);
  if (!db) return true;
  const n = await db.signature.count({
    where: {
      etablissementId,
      objetType: signe.objetType as ObjetSignable,
      objetId: signe.objetId,
      signataireEmail: signe.email,
      ...(signe.partie ? { partie: signe.partie as PartieSignataire } : {}),
      active: true,
    },
  });
  return n > 0;
}

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
  confirme,
}: {
  titre: string;
  phrase: string | null;
  /** La raison sociale de l'entreprise du lien, si on la connaît. */
  contact: string | null;
  /** Le cas où un nouveau lien serait utile, quand il n'est pas évident. */
  si?: string;
  /** Une signature posée : la tuile dit « fait », pas « attention ». */
  confirme?: boolean;
}) {
  const qui = contact ?? "la personne qui vous a envoyé ce lien";
  const consigne = `contactez ${qui} pour obtenir un nouveau lien.`;
  return (
    <main className="min-h-screen bg-[color:var(--board-canvas)] px-3 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5">
        {pastilleRojer()}
        <div className={`${CLASSE_CARTE} w-full text-center`}>
          <span className="mx-auto flex size-12 items-center justify-center rounded-[14px] bg-[color:var(--board-ink)] text-white">
            {confirme ? <Check aria-hidden className="size-5" /> : <AlertTriangle aria-hidden className="size-5" />}
          </span>
          <h1 className="m-0 mt-4 font-display text-[26px] leading-[1.1] font-semibold tracking-[-0.03em] text-[color:var(--board-ink)]">
            {titre}
          </h1>
          {phrase ? (
            <p className="m-0 mt-3 text-[14px] leading-[1.6] text-[color:var(--board-slate-mid)]">{phrase}</p>
          ) : null}
          <p className="m-0 mt-4 rounded-[18px] bg-[color:var(--board-canvas)] px-4 py-3 text-[13.5px] leading-[1.6] text-[color:var(--board-ink)]">
            {si ? `${si}, ${consigne}` : consigne.charAt(0).toUpperCase() + consigne.slice(1)}
          </p>
        </div>
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

/** Une carte de la page : blanche, rayon 28, sans ombre ni aplat (V2, 2026-11-21). */
const CLASSE_CARTE = "rounded-[28px] bg-[color:var(--board-card)] p-5 sm:p-7";
/** Les petits libellés : mono, capitales, espacés. */
const CLASSE_MONO = "m-0 font-mono text-[10.5px] tracking-[0.14em] uppercase text-[color:var(--board-slate-soft)]";
const CLASSE_TITRE_CARTE =
  "m-0 font-display text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] text-[color:var(--board-ink)]";
const CLASSE_TEXTE = "m-0 mt-2 whitespace-pre-wrap text-[14px] leading-[1.55] text-[color:var(--board-ink)]";
const CLASSE_VIDE = "m-0 mt-2 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]";

/** La pastille de marque, bleu ciel. */
function pastilleRojer() {
  return (
    <span className="inline-flex rounded-full bg-[color:var(--board-sky)] px-4 py-1.5 font-display text-[16px] font-semibold tracking-[-0.02em] text-[color:var(--board-ink)]">
      Rojer
    </span>
  );
}

/** La tuile noire du premier jour des travaux : « 27 / NOV. ». */
function tuileDate(contenu: ContenuASigner | null) {
  if (contenu?.type !== "plan_prevention" && contenu?.type !== "permis_feu") return null;
  const [jour, mois] = formaterJourMoisFr(contenu.dateDebut).split(" ");
  return (
    <div
      aria-hidden
      className="flex size-14 flex-none flex-col items-center justify-center rounded-[14px] bg-[color:var(--board-ink)] text-white"
    >
      <span className="font-display text-[22px] leading-none font-bold">{jour}</span>
      <span className="mt-0.5 font-mono text-[9px] tracking-[0.1em] uppercase">{mois}</span>
    </div>
  );
}

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
    <div
      className={`rounded-[18px] bg-[color:var(--board-canvas)] px-4 py-3${large ? " sm:col-span-2" : ""}`}
    >
      <dt className="font-mono text-[10px] tracking-[0.12em] uppercase text-[color:var(--board-slate-soft)]">{cle}</dt>
      <dd className="m-0 mt-1 whitespace-pre-wrap text-[14.5px] leading-[1.45] font-medium text-[color:var(--board-ink)]">
        {children}
      </dd>
    </div>
  );
}

const CLASSE_GRILLE = "m-0 mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2";
const CLASSE_PRECISION = "block text-[13px] font-normal text-[color:var(--board-slate-mid)]";

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
          {c.euChefTelephone ? ` · ${c.euChefTelephone}` : ""}
        </span>
      </Fait>
      <Fait cle="Entreprise extérieure">
        {c.entrepriseExterieureRaison}
        {partie === "entreprise_exterieure" && vous()}
        <span className={CLASSE_PRECISION}>
          {c.efChefNom}
          {c.efChefTelephone ? ` · ${c.efChefTelephone}` : ""}
          {c.entrepriseExterieureSiret ? ` · SIRET ${c.entrepriseExterieureSiret}` : ""}
          {c.entrepriseExterieureAdresse ? (
            <span className="block">{c.entrepriseExterieureAdresse}</span>
          ) : null}
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
      {/* Repris de RiskBoard (2026-11-21) : seulement ce qui est rempli. */}
      {faitsComplements(c)}
    </dl>
  );
}

/** Les compléments remplis : horaires et CSE en court, les textes longs en large. */
function faitsComplements(c: ContenuPlanASigner) {
  const { horaires, cse, autres } = complementsParPlace(c);
  return [horaires, cse, ...autres].map((x) =>
    x ? (
      <Fait key={x.cle} cle={x.libelle} large={x !== horaires && x !== cse}>
        {x.texte}
      </Fait>
    ) : null,
  );
}

function sectionsPlan(c: ContenuPlanASigner) {
  const n = c.lignes.length;
  return (
    <>
      <section className={CLASSE_CARTE}>
        <h2 className={CLASSE_TITRE_CARTE}>
          {n === 0
            ? "Risques d'interférence"
            : `${n} risque${n > 1 ? "s" : ""} d'interférence et leurs mesures`}
        </h2>
        {n === 0 ? (
          <p className={CLASSE_VIDE}>Aucun risque d&apos;interférence n&apos;est inscrit au plan.</p>
        ) : (
          <ol className="m-0 mt-2 list-none p-0">
            {c.lignes.map((l, i) => (
              <li key={l.ordre} className="flex gap-3 border-t border-[color:var(--board-slate-pale)] py-3 first:border-t-0">
                <span
                  aria-hidden
                  className="flex size-[34px] flex-none items-center justify-center rounded-[10px] bg-[color:var(--board-ink)] font-display text-[15px] font-bold text-white"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 text-[14px] text-[color:var(--board-ink)]">
                  <p className="m-0 font-semibold whitespace-pre-wrap">{l.risque}</p>
                  {precisionsLigne(l).map((x) => (
                    <p key={x} className="m-0 mt-0.5 text-[13px] text-[color:var(--board-slate-mid)]">
                      {x}
                    </p>
                  ))}
                  <p className="m-0 mt-1 whitespace-pre-wrap text-[13px] text-[color:var(--board-slate-mid)]">
                    Entreprise utilisatrice : {l.mesureEntrepriseUtilisatrice || "—"}
                  </p>
                  <p className="m-0 whitespace-pre-wrap text-[13px] text-[color:var(--board-slate-mid)]">
                    Entreprise extérieure : {l.mesureEntrepriseExterieure || "—"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <details className={`${CLASSE_CARTE} group`}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="font-display text-[18px] font-semibold tracking-[-0.01em] text-[color:var(--board-ink)]">
            Contenu minimal (art. R. 4512-8 CT)
          </span>
          <ChevronDown aria-hidden className="size-4 flex-none transition-transform group-open:rotate-180" />
        </summary>
        <p className={CLASSE_VIDE}>{CHAPEAU_R4512_8}</p>
        {RUBRIQUES_R4512_8.map((r) => (
          <div key={r.numero} className="mt-3 rounded-[18px] bg-[color:var(--board-canvas)] px-4 py-3">
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
      </details>
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
    <section className={CLASSE_CARTE}>
      <h2 className={CLASSE_TITRE_CARTE}>Mesures de prévention retenues</h2>
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
