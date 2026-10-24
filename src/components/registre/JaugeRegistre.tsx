// Où en est le registre entier, en tête d'écran.
//
// C'est la première question du dirigeant, et la seule qui compte avant une
// visite : « qu'est-ce qui manquerait si l'inspecteur arrivait demain ». Le
// registre listait ses fiches sans jamais y répondre — on lisait un
// sommaire, pas un état.
//
// La jauge distingue quatre choses qu'on aurait tort de confondre :
//   — ce qui est **rempli** ici ;
//   — ce qui **reste à remplir** ici, et que le dirigeant peut faire ;
//   — ce qui se tient **sur un autre écran** — l'inventaire des moyens de
//     secours est le parc d'équipements, les vérifications sont le
//     calendrier. Ces fiches n'ont pas de formulaire ici, et n'en auront
//     jamais : ce serait une seconde saisie du même fait. Les compter comme
//     non outillées ferait dire à la jauge l'inverse de la vérité — 34
//     fiches sur 49 « pas encore outillées » quand 31 sont tenues depuis
//     toujours ;
//   — ce que l'application **ne sait pas encore recueillir** du tout, et
//     qu'il doit tenir hors de l'outil. Fondre cette part dans « à faire »
//     lui reprocherait un trou qui n'est pas le sien ; la taire lui ferait
//     croire son registre complet.
//
// Ce compteur dit ce qui est saisi. Il ne dit pas que le registre est
// conforme, et la note sous la jauge le dit en toutes lettres : l'outil
// assiste, il ne certifie pas.

import type { BilanRegistre } from "@/lib/registre/completude";

function Part({
  valeur,
  total,
  fond,
}: {
  valeur: number;
  total: number;
  fond: string;
}) {
  if (valeur === 0) return null;
  return (
    <span
      className="block h-full"
      style={{ width: `${(valeur / total) * 100}%`, background: fond }}
    />
  );
}

function Legende({
  fond,
  bord,
  nombre,
  libelle,
  precision,
}: {
  fond: string;
  bord?: string;
  nombre: number;
  libelle: string;
  precision: string;
}) {
  return (
    <div className="flex gap-2.5">
      <span
        className="mt-[5px] size-[9px] flex-none rounded-full"
        style={{ background: fond, boxShadow: bord }}
      />
      <div className="min-w-0">
        <p className="m-0 text-[13.5px] font-semibold leading-[1.35] text-[color:var(--board-ink)]">
          <span className="tabular-nums">{nombre}</span> {libelle}
        </p>
        <p className="m-0 mt-0.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          {precision}
        </p>
      </div>
    </div>
  );
}

export function JaugeRegistre({ bilan }: { bilan: BilanRegistre }) {
  const { dues, outillees, faites, aRemplir, tenuesAilleurs, nonOutillees } =
    bilan;

  // Un établissement sans aucune fiche due n'a pas de jauge à lire : une
  // barre vide et « 0 sur 0 » laisseraient croire à un écran cassé.
  if (dues === 0) return null;

  return (
    <section className="carte-board px-7 py-6 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Où en est votre registre
        </p>
        <p className="m-0 text-[12px] text-[color:var(--board-slate-mid)]">
          {dues} fiches dues pour cet établissement
        </p>
      </div>

      {/* La phrase de tête compte ce que l'application couvre — rempli ici ou
          tenu ailleurs — parce que c'est la question posée : qu'est-ce qui
          manquerait demain. Le détail, lui, ne fond rien. */}
      <p className="board-titre m-0 mt-3 max-w-[24ch] text-[22px]">
        {outillees} fiche{outillees > 1 ? "s" : ""} sur {dues}{" "}
        {outillees > 1 ? "sont couvertes" : "est couverte"}{" "}
        par
        l&apos;application.
      </p>

      <div
        className="mt-5 flex h-2 w-full overflow-hidden rounded-full bg-[color:var(--board-slate-pale)]"
        role="img"
        aria-label={`${faites} fiches renseignées ici, ${tenuesAilleurs} tenues sur un autre écran, ${aRemplir} à remplir, ${nonOutillees} à tenir hors de l'outil, sur ${dues} fiches dues.`}
      >
        <Part valeur={faites} total={dues} fond="var(--board-green)" />
        <Part
          valeur={tenuesAilleurs}
          total={dues}
          fond="var(--board-blue-soft)"
        />
        <Part valeur={aRemplir} total={dues} fond="var(--board-slate)" />
        <Part
          valeur={nonOutillees}
          total={dues}
          fond="repeating-linear-gradient(135deg,var(--board-slate-line) 0 3px,transparent 3px 6px)"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Legende
          fond="var(--board-green)"
          nombre={faites}
          libelle={
            faites > 1 ? "fiches renseignées ici" : "fiche renseignée ici"
          }
          precision="Tout ce que la fiche demande a une réponse enregistrée."
        />
        <Legende
          fond="var(--board-blue-soft)"
          nombre={tenuesAilleurs}
          libelle={
            tenuesAilleurs > 1
              ? "fiches tenues sur un autre écran"
              : "fiche tenue sur un autre écran"
          }
          precision="Vos équipements et votre calendrier les remplissent — rien à ressaisir ici."
        />
        <Legende
          fond="var(--board-slate)"
          nombre={aRemplir}
          libelle={aRemplir > 1 ? "fiches à remplir" : "fiche à remplir"}
          precision="L'application sait les recueillir — les réponses manquent."
        />
        <Legende
          fond="transparent"
          bord="inset 0 0 0 1px var(--board-slate-line)"
          nombre={nonOutillees}
          libelle={
            nonOutillees > 1
              ? "fiches à tenir hors de l'outil"
              : "fiche à tenir hors de l'outil"
          }
          precision="Dues aussi, mais l'application ne sait pas encore les recueillir : conservez-les de votre côté et présentez-les avec le reste."
        />
      </div>

      <p className="m-0 mt-6 max-w-[var(--board-mesure)] border-t border-[color:var(--board-slate-line)] pt-5 text-[12px] leading-[1.6] text-[color:var(--board-slate-mid)]">
        Ce compteur dit ce que{" "}
        <strong className="font-semibold text-[color:var(--board-ink)]">
          l&apos;application recueille
        </strong>
        , et rien d&apos;autre. Il ne dit pas que votre registre est conforme :
        une fiche renseignée peut l&apos;être avec une réponse fausse, une
        fiche tenue sur un autre écran peut y être incomplète, et une fiche que
        l&apos;outil ne recueille pas encore reste due. C&apos;est un état de
        remplissage, pas une attestation.
      </p>
    </section>
  );
}
