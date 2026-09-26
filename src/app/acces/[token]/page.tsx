import Link from "next/link";
import { notFound } from "next/navigation";
import { verifierAccessToken } from "@/lib/access-tokens/verify";
import { WhyCard, LegalBadge } from "@/components/ui-kit";
import { SignatureExterneForm } from "@/components/signatures/SignatureExterneForm";
import { prisma } from "@/lib/prisma";
import { formaterDateFr } from "@/lib/dates";
import { objetEstSignable } from "@/lib/signatures/etat-signable";
import {
  contenuASigner,
  type ContenuASigner,
  type ContenuPermisASigner,
  type ContenuPlanASigner,
} from "@/lib/signatures/contenu-a-signer";
import {
  CHAPEAU_R4512_8,
  RUBRIQUES_R4512_8,
  texteRubrique,
} from "@/lib/plan-prevention/contenu-r4512-8";
import { LABEL_NATURE } from "@/lib/permis-feu/schema";
import { mesureParId, surListeAnterieure } from "@/lib/permis-feu/referentiel";

/**
 * Page publique non authentifiée : un prestataire arrive ici via un lien
 * magique envoyé par email. Selon le scope du token, on propose une action
 * (signer / déposer un rapport / consulter).
 *
 * Au MVP, on implémente le scope `signature`. Les autres scopes affichent
 * un message « à venir » avec les détails de l'objet.
 */
export default async function AccesParTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const res = await verifierAccessToken(token);

  if (!res.ok) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 sm:px-10">
        <div className="rounded-2xl border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] p-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">Lien invalide</p>
          <h1 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.02em]">
            {res.raison === "inexistant" && "Ce lien n'existe pas"}
            {res.raison === "expire" && "Ce lien a expiré"}
            {res.raison === "revoque" && "Ce lien a été révoqué"}
            {res.raison === "deja_utilise" && "Ce lien a déjà servi"}
          </h1>
          <p className="mt-4 text-[0.9rem] leading-relaxed text-[color:var(--muted-foreground)]">
            {res.raison === "expire" &&
              `Demandez un nouveau lien à la personne qui vous l'a envoyé.`}
            {res.raison === "revoque" && res.motif}
            {res.raison === "deja_utilise" &&
              `Le document a été signé le ${formaterDateFr(res.utiliseLe)}.`}
            {res.raison === "inexistant" &&
              `Vérifiez que vous avez bien cliqué sur le dernier lien reçu.`}
          </p>
        </div>
      </main>
    );
  }

  const t = res.token;

  // Récupération du contexte métier pour affichage (qui signe quoi).
  const etablissement = await prisma.etablissement.findUnique({
    where: { id: t.etablissementId },
    select: {
      raisonDisplay: true,
      entreprise: { select: { raisonSociale: true } },
    },
  });
  if (!etablissement) notFound();

  // Lecture bornée à l'établissement DU JETON : c'est par une lecture non
  // bornée que cette page a déjà laissé fuir le rapport d'un autre client.
  const contenu = await contenuASigner(
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
    !(await objetEstSignable(t.objetType, t.objetId, t.etablissementId))
  ) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 sm:px-10">
        <div className="rounded-2xl border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] p-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">Signature</p>
          <h1 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.02em]">
            Ce document n&apos;est plus à signer
          </h1>
          <p className="mt-4 text-[0.9rem] leading-relaxed text-[color:var(--muted-foreground)]">
            Il a été clos ou annulé par la personne qui vous a envoyé ce lien.
            Rapprochez-vous d&apos;elle si une signature reste attendue.
          </p>
        </div>
      </main>
    );
  }

  if (t.scope === "signature") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12 sm:px-10">
        <header className="space-y-3">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">Signature demandée par</p>
          <h1 className="text-[1.6rem] font-semibold tracking-[-0.02em] leading-tight">
            {etablissement.entreprise.raisonSociale}
            <span className="text-[color:var(--muted-foreground)]">
              {" · "}
              {etablissement.raisonDisplay}
            </span>
          </h1>
        </header>

        <div className="mt-8">
          <WhyCard charte="board"
            kicker="Ce que vous signez"
            titre={libelleObjet.titre}
            enjeu={libelleObjet.description}
          >
            <LegalBadge charte="board"
              reference="Art. 1366 · 1367 Code civil · eIDAS simple"
              extrait="L'écrit électronique a la même force probante que l'écrit sur support papier, sous réserve que puisse être dûment identifiée la personne dont il émane et qu'il soit établi et conservé dans des conditions de nature à en garantir l'intégrité."
            >
              Votre signature est posée avec une preuve d&apos;intégrité
              (empreinte SHA-256 du document) et un horodatage serveur.
              Vous pourrez à tout moment vérifier qu&apos;elle porte bien sur
              le document non modifié.
            </LegalBadge>
          </WhyCard>
        </div>

        {contenu?.type === "plan_prevention" &&
          detailPlan(contenu, etablissement.entreprise.raisonSociale)}
        {contenu?.type === "permis_feu" && detailPermis(contenu)}

        <div className="mt-10">
          <SignatureExterneForm
            token={token}
            destinataire={{
              email: t.emailDestinataire,
              nom: t.nomDestinataire,
            }}
            expireLe={t.expireLe}
          />
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
        titre: `Plan de prévention PP-${String(contenu.numero).padStart(3, "0")}`,
        description:
          "Le plan arrêté en commun avant les travaux (art. R. 4512-6 CT). Votre signature porte sur l'ensemble du contenu ci-dessous : relisez-le avant de signer.",
      };
    case "permis_feu":
      return {
        titre: `Permis de feu PF-${String(contenu.numero).padStart(3, "0")}`,
        description:
          "L'autorisation de travaux par point chaud et ses mesures de prévention. Votre signature porte sur l'ensemble du contenu ci-dessous : relisez-le avant de signer.",
      };
  }
}

const CLASSE_SECTION =
  "mt-6 rounded-2xl border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] p-6";
const CLASSE_SURTITRE =
  "board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]";
const CLASSE_TEXTE = "m-0 mt-2 whitespace-pre-wrap text-[0.9rem] leading-relaxed";
const CLASSE_VIDE =
  "m-0 mt-2 text-[0.85rem] leading-relaxed text-[color:var(--muted-foreground)]";

function periode(debut: Date, fin: Date): string {
  return `Du ${formaterDateFr(debut)} au ${formaterDateFr(fin)}`;
}

/**
 * Le plan tel que le signataire l'engage. Des fonctions qui rendent du JSX,
 * pas des composants : la page reste un seul arbre, qu'un test lit en entier.
 */
function detailPlan(c: ContenuPlanASigner, raisonSocialeEU: string) {
  return (
    <div className="mt-8">
      <section className={CLASSE_SECTION}>
        <p className={CLASSE_SURTITRE}>Les parties</p>
        <dl className="mt-3 grid grid-cols-1 gap-y-2 text-[0.9rem] sm:grid-cols-[200px_1fr]">
          <dt className="text-[color:var(--muted-foreground)]">Entreprise utilisatrice</dt>
          <dd className="m-0">
            {raisonSocialeEU} — {c.euChefNom}
            {c.euChefFonction ? `, ${c.euChefFonction}` : ""}
          </dd>
          <dt className="text-[color:var(--muted-foreground)]">Entreprise extérieure</dt>
          <dd className="m-0">
            {c.entrepriseExterieureRaison}
            {c.entrepriseExterieureSiret ? ` (SIRET ${c.entrepriseExterieureSiret})` : ""}{" "}
            — {c.efChefNom} · {c.efEffectifIntervenant} intervenant
            {c.efEffectifIntervenant > 1 ? "s" : ""}
          </dd>
        </dl>
      </section>

      <section className={CLASSE_SECTION}>
        <p className={CLASSE_SURTITRE}>Les travaux</p>
        <dl className="mt-3 grid grid-cols-1 gap-y-2 text-[0.9rem] sm:grid-cols-[200px_1fr]">
          <dt className="text-[color:var(--muted-foreground)]">Période</dt>
          <dd className="m-0">
            {periode(c.dateDebut, c.dateFin)}
            {c.dureeHeuresEstimee != null ? ` · ${c.dureeHeuresEstimee} h estimées` : ""}
          </dd>
          <dt className="text-[color:var(--muted-foreground)]">Lieux</dt>
          <dd className="m-0 whitespace-pre-wrap">{c.lieux}</dd>
          <dt className="text-[color:var(--muted-foreground)]">Nature des travaux</dt>
          <dd className="m-0 whitespace-pre-wrap">
            {c.naturesTravaux}
            {c.travauxDangereux
              ? " — travaux figurant sur la liste dangereuse (arrêté du 19 mars 1993)"
              : ""}
          </dd>
          <dt className="text-[color:var(--muted-foreground)]">Inspection commune</dt>
          <dd className="m-0 whitespace-pre-wrap">
            {c.inspectionDate
              ? `Le ${formaterDateFr(c.inspectionDate)}${
                  c.inspectionParticipants ? ` — ${c.inspectionParticipants}` : ""
                }`
              : "Non renseignée"}
          </dd>
        </dl>
      </section>

      <section className={CLASSE_SECTION}>
        <p className={CLASSE_SURTITRE}>Risques d&apos;interférence et mesures de chaque partie</p>
        {c.lignes.length === 0 ? (
          <p className={CLASSE_VIDE}>Aucun risque d&apos;interférence n&apos;est inscrit au plan.</p>
        ) : (
          <ol className="m-0 mt-3 flex list-decimal flex-col gap-3 pl-5 text-[0.9rem]">
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
            <p className="m-0 text-[0.9rem] font-semibold">
              {r.numero}° {r.titre}
            </p>
            {!r.renseignee(c) ? (
              <p className={CLASSE_VIDE}>Non renseigné.</p>
            ) : r.numero === 1 ? (
              <ul className="m-0 mt-2 flex list-disc flex-col gap-2 pl-5 text-[0.9rem]">
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
    </div>
  );
}

function detailPermis(c: ContenuPermisASigner) {
  return (
    <div className="mt-8">
      <section className={CLASSE_SECTION}>
        <p className={CLASSE_SURTITRE}>Les parties et les travaux</p>
        <dl className="mt-3 grid grid-cols-1 gap-y-2 text-[0.9rem] sm:grid-cols-[200px_1fr]">
          <dt className="text-[color:var(--muted-foreground)]">Intervenant</dt>
          <dd className="m-0">
            {c.prestataireRaison} — {c.prestataireContact}
          </dd>
          <dt className="text-[color:var(--muted-foreground)]">Donneur d&apos;ordre</dt>
          <dd className="m-0">
            {c.donneurOrdreNom}
            {c.donneurOrdreFonction ? `, ${c.donneurOrdreFonction}` : ""}
          </dd>
          <dt className="text-[color:var(--muted-foreground)]">Période</dt>
          <dd className="m-0">{periode(c.dateDebut, c.dateFin)}</dd>
          <dt className="text-[color:var(--muted-foreground)]">Lieu</dt>
          <dd className="m-0 whitespace-pre-wrap">{c.lieu}</dd>
          <dt className="text-[color:var(--muted-foreground)]">Nature</dt>
          <dd className="m-0">
            {c.naturesTravaux
              .map((n) => LABEL_NATURE[n as keyof typeof LABEL_NATURE] ?? n)
              .join(", ") || "—"}
          </dd>
          <dt className="text-[color:var(--muted-foreground)]">Description</dt>
          <dd className="m-0 whitespace-pre-wrap">{c.descriptionTravaux}</dd>
          <dt className="text-[color:var(--muted-foreground)]">Surveillance après travaux</dt>
          <dd className="m-0">{c.dureeSurveillanceMinutes} minutes</dd>
        </dl>
      </section>

      <section className={CLASSE_SECTION}>
        <p className={CLASSE_SURTITRE}>Mesures de prévention retenues</p>
        {c.mesuresValidees.length === 0 ? (
          <p className={CLASSE_VIDE}>Aucune mesure n&apos;est cochée sur ce permis.</p>
        ) : (
          <ul className="m-0 mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[0.9rem]">
            {c.mesuresValidees.map((id) => (
              <li key={id}>{mesureParId(id)?.libelle ?? id}</li>
            ))}
          </ul>
        )}
        {surListeAnterieure(c.mesuresValidees) ? (
          <p className={CLASSE_TEXTE}>
            Ce permis a été établi sur une liste antérieure de mesures&nbsp;:
            les libellés ci-dessus sont ceux qu&apos;il portait.
          </p>
        ) : null}
        {c.mesuresNotes ? <p className={CLASSE_TEXTE}>{c.mesuresNotes}</p> : null}
      </section>
    </div>
  );
}
