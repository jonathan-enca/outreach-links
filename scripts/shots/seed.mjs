// MU.0 : espace de test rejouable. Crée (ou retrouve) le compte de test, remet son mot de passe à
// celui de `.env.local`, puis remplace les sites de SON espace par trois états prêts :
//   1. un site sans analyse ;
//   2. une analyse en cours ;
//   3. une analyse finie, avec une liste courte de cibles, des constats et une mention sans contact.
// Tout est écrit dans l'espace du compte de test seulement ; aucun appel payant, aucun événement
// Inngest, aucune requête vers un site tiers. Les éditeurs utilisent le domaine réservé `.example`.
import { createClient } from "@supabase/supabase-js";
import { loadEnv, need } from "./lib.mjs";

loadEnv();
const email = need("E2E_EMAIL");
const password = need("E2E_PASSWORD");
const db = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Arrête au premier refus de la base : un jeu de données partiel fausserait les captures. */
async function must(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label} : ${error.message}`);
  return data;
}

const minutesAgo = (n) => new Date(Date.now() - n * 60_000).toISOString();

async function ensureUser() {
  let found = null;
  for (let page = 1; page <= 20 && !found; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`liste des comptes : ${error.message}`);
    found = data.users.find((u) => u.email === email) ?? null;
    if (data.users.length < 200) break;
  }
  if (found) {
    const { error } = await db.auth.admin.updateUserById(found.id, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`mot de passe du compte de test : ${error.message}`);
    return found.id;
  }
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Espace de test" },
  });
  if (error || !data.user) throw new Error(`création du compte de test : ${error?.message}`);
  return data.user.id;
}

const PROFILE = {
  activity: "Atelier Coloriages publie des dessins à colorier gratuits, prêts à imprimer.",
  offer: "Plus de 300 coloriages gratuits classés par thème, sans inscription.",
  language: "fr",
  audience: ["Parents", "Enseignants de maternelle", "Animateurs de centres de loisirs"],
  linkable_resources: [
    { url: "https://coloriages-demo.example/animaux/", title: "Coloriages d'animaux" },
    { url: "https://coloriages-demo.example/saisons/", title: "Coloriages des saisons" },
    { url: "https://coloriages-demo.example/ecole/", title: "Coloriages pour la classe" },
  ],
  name_variants: ["Atelier Coloriages", "coloriages-demo"],
  tone: "Simple et bienveillant.",
  personas: [
    {
      label: "Enseignants de maternelle",
      sites: "Blogs de classe, sites d'écoles",
      reason: "Ils partagent des supports gratuits pour les ateliers de la classe.",
    },
    {
      label: "Médiathèques et associations",
      sites: "Pages ressources de médiathèques, associations de parents",
      reason: "Elles listent des activités gratuites pour les familles.",
    },
  ],
  // Chantier H : types de sites cherchés (étiquettes modifiables) et mots du thème.
  publisher_types: [
    {
      label: "Enseignants de maternelle",
      category: "ecole",
      terms: ["école maternelle", "classe"],
      origin: "persona",
    },
    {
      label: "Médiathèques",
      category: "bibliotheque",
      terms: ["médiathèque", "bibliothèque"],
      origin: "persona",
    },
    {
      label: "Associations de parents",
      category: "association",
      terms: ["association de parents"],
      origin: "persona",
    },
    {
      label: "Clubs de loisirs créatifs",
      category: "association",
      terms: ["atelier créatif", "club"],
      origin: "voisin",
    },
  ],
  theme_terms: ["coloriages à imprimer", "coloriage enfant"],
};

/** Chantier G : chiffres de l'analyse et sites restés en réserve (jamais lus). */
const QUAL_STATS = {
  candidates: 544,
  preRead: { langue: 61, robots: 22, concurrent: 14, doublon: 9 },
  afterPreRead: 438,
  pagesRead: 310,
  alive: 126,
  judged: 118,
  relevant: 41,
  stock: 12,
  lots: 8,
  readStop: "objectif",
};
const STOCK = Array.from({ length: 12 }, (_, i) => `site-en-reserve-${i + 1}.example`);

async function addSite(workspaceId, userId, row) {
  const [site] = await must(
    `site ${row.domain}`,
    db
      .from("sites")
      .insert({ workspace_id: workspaceId, country: "FR", language: "fr", ...row })
      .select("id"),
  );
  await must(
    "profil de marque",
    db.from("brand_profiles").insert({
      site_id: site.id,
      workspace_id: workspaceId,
      version: 1,
      source: "llm",
      profile: PROFILE,
      pages_read: [{ url: `https://${row.domain}/`, title: "Accueil" }],
      created_by: userId,
    }),
  );
  return site.id;
}

const QUERIES = ["coloriages à imprimer", "dessins à colorier gratuits", "coloriage enfant"];
const COMPETITORS = [
  ["coloriages-du-mercredi.example", 3, 2, 412],
  ["dessins-a-imprimer.example", 3, 4, 958],
  ["petits-crayons.example", 2, 6, 131],
  ["colorie-moi.example", 2, 9, 77],
];

async function addAudit(workspaceId, siteId, userId, row) {
  const [audit] = await must(
    "audit",
    db
      .from("audits")
      .insert({
        workspace_id: workspaceId,
        site_id: siteId,
        plan: "payant",
        queries: QUERIES,
        max_competitors: 20,
        cost_cap_usd: 2,
        estimated_cost_usd: 0.018,
        actual_cost_usd: 0.018,
        created_by: userId,
        auto_chain: true,
        confirmed_at: minutesAgo(12),
        started_at: minutesAgo(12),
        ...row,
      })
      .select("id"),
  );
  await must(
    "concurrents",
    db.from("competitors").insert(
      COMPETITORS.map(([domain, queries, best, rd]) => ({
        audit_id: audit.id,
        workspace_id: workspaceId,
        domain,
        queries_count: queries,
        appearances: queries,
        best_rank: best,
        avg_rank: best + 1.5,
        score: 10 - best,
        selected: true,
        referring_domains: rd,
      })),
    ),
  );
  return audit.id;
}

/** Mêmes formes que les étapes réelles (M1.4 `CleanStats`, M1.5 `ProfileData`). */
const BACKLINKS_STATS = {
  before: 1840,
  after: 1012,
  excluded: 828,
  domainsBefore: 640,
  domainsAfter: 388,
  byReason: { interne: 40, plateforme: 122, spam: 301, image_reuse: 95, foreign: 212, doublon: 58 },
  perCompetitor: COMPETITORS.map(([domain], i) => ({ domain, before: 460, after: 253 - i })),
};
const PROFILE_DATA = {
  totals: { rank: 12, backlinks: 61, spamScore: 4, brokenBacklinks: 1, referringDomains: 14 },
  anchors: {
    top: [{ kind: "marque", count: 9, anchor: "Atelier Coloriages" }],
    shares: { url: 0.3, vide: 0, autre: 0.1, marque: 0.5, generique: 0.1 },
    sampleSize: 61,
    dofollowShare: 0.7,
    overOptimized: false,
  },
  ownDomainsPartial: false,
  benchmark: COMPETITORS.map(([domain, , , rd]) => ({ domain, referringDomains: rd })),
  benchmarkMedian: 271.5,
  pages: { total: 0, keywords: 0, priority: 0, checked: 0, problems: 0 },
  gap: { count: 0, topCount: 0 },
  limits: {
    keywords: 500,
    onpagePages: 10,
    backlinksSample: 1000,
    referringDomains: 1000,
    benchmarkCompetitors: 10,
  },
};

/** Liste courte : 6 cibles réalistes, chacune avec sa demande en trois lignes. */
const SHORTLIST = [
  {
    domain: "ecole-jules-ferry.example",
    url: "https://ecole-jules-ferry.example/maternelle/ressources",
    title: "Ressources pour la maternelle",
    site_type: "ecole",
    tactics: ["ressources"],
    contact_status: "email_verifie",
    contact_email: "direction@ecole-jules-ferry.example",
    why: "Page de ressources tenue par l'école : elle liste déjà des sites de coloriages pour les ateliers.",
    hook: "Votre liste « Coloriages et graphisme » cite trois sites, dont un qui ne répond plus.",
  },
  {
    domain: "mediatheque-saint-aubin.example",
    url: "https://mediatheque-saint-aubin.example/jeunesse/liens-utiles",
    title: "Liens utiles pour les enfants",
    site_type: "mairie",
    tactics: ["ressources", "inconnus"],
    contact_status: "formulaire",
    form_url: "https://mediatheque-saint-aubin.example/contact",
    why: "Médiathèque municipale : une page « liens utiles » pour les familles, jamais sollicitée.",
    hook: "Votre sélection d'activités à faire à la maison ne propose pas encore de coloriages.",
  },
  {
    domain: "maitresse-clemence.example",
    url: "https://maitresse-clemence.example/arts-visuels/coloriages-automne",
    title: "Arts visuels : mes coloriages d'automne",
    site_type: "blog",
    tactics: ["inconnus"],
    contact_status: "email_verifie",
    contact_email: "clemence@maitresse-clemence.example",
    why: "Blog de classe actif : l'article renvoie vers des coloriages pour chaque saison.",
    hook: "Dans votre article sur l'automne, le lien vers les feuilles à colorier mène à un site en anglais.",
  },
  {
    domain: "asso-parents-des-tilleuls.example",
    url: "https://asso-parents-des-tilleuls.example/idees-activites",
    title: "Idées d'activités pour les mercredis",
    site_type: "association",
    tactics: ["inconnus"],
    contact_status: "email_a_verifier",
    contact_email: "bureau@asso-parents-des-tilleuls.example",
    why: "Association de parents d'élèves : une page d'idées d'activités gratuites, mise à jour chaque trimestre.",
    hook: "Votre page d'idées pour les mercredis cite des jeux de société, pas encore d'activité à imprimer.",
  },
  {
    domain: "forum-des-nounous.example",
    url: "https://forum-des-nounous.example/sujet/coloriages-gratuits",
    title: "Vos sites de coloriages gratuits ?",
    site_type: "forum_modere",
    tactics: ["mentions", "inconnus"],
    contact_status: "formulaire",
    form_url: "https://forum-des-nounous.example/contact",
    why: "Forum modéré d'assistantes maternelles : un sujet épinglé recense les sites de coloriages.",
    hook: "Dans le sujet épinglé, une membre cite « Atelier Coloriages » sans donner l'adresse.",
  },
  {
    domain: "papeterie-du-canal.example",
    url: "https://papeterie-du-canal.example/blog/occuper-les-enfants",
    title: "10 idées pour occuper les enfants un jour de pluie",
    site_type: "ecommerce",
    tactics: ["inconnus"],
    contact_status: "email_verifie",
    contact_email: "bonjour@papeterie-du-canal.example",
    why: "Boutique indépendante avec un blog : elle vend des crayons, pas des coloriages.",
    hook: "Votre idée n° 4 conseille d'imprimer des coloriages, sans indiquer où en trouver.",
  },
];

const REQUEST = (domainLabel) => [
  `Bonjour, je vous écris au sujet de votre page ${domainLabel}.`,
  "Je propose des coloriages gratuits à imprimer, classés par thème, qui pourraient compléter votre liste.",
  "Si cela vous semble utile à vos lecteurs, accepteriez-vous d'ajouter le lien ?",
];

async function addTargets(workspaceId, siteId, auditId, userId) {
  const run = {
    audit_id: auditId,
    workspace_id: workspaceId,
    site_id: siteId,
    status: "termine",
    plan: {},
    expected_cost_usd: 0.05,
    worst_case_usd: 0.1,
    confirmed_by: userId,
    started_at: minutesAgo(9),
    finished_at: minutesAgo(6),
  };
  const [collection] = await must(
    "collecte",
    db
      .from("candidate_collections")
      .insert({
        ...run,
        expected_cost_usd: 0.265,
        worst_case_usd: 0.317,
        target_usd: 1,
        actual_cost_usd: 0.242,
      })
      .select("id"),
  );
  const [qrun] = await must(
    "qualification",
    db
      .from("qualification_runs")
      .insert({
        ...run,
        collection_id: collection.id,
        budget_usd: 0.4,
        actual_cost_usd: 0.19,
        stop_reason: "termine",
        stats: QUAL_STATS,
      })
      .select("id"),
  );
  const short = SHORTLIST.map((s, i) => ({
    run_id: qrun.id,
    audit_id: auditId,
    workspace_id: workspaceId,
    domain: s.domain,
    url: s.url,
    tactics: s.tactics,
    status: "liste_courte",
    stage_reached: 6,
    page: { title: s.title },
    site_type: s.site_type,
    fit: 0.9 - i * 0.05,
    judgement: { resource: i % 3 },
    hook: s.hook,
    contact_status: s.contact_status,
    contact_email: s.contact_email ?? null,
    form_url: s.form_url ?? null,
    sendable: s.contact_status === "email_verifie",
    score: 92 - i * 6,
    rank: i + 1,
    request_lines: REQUEST(`« ${s.title} »`),
    why: s.why,
    domain_rank: 28 - i * 3,
  }));
  const contactless = {
    run_id: qrun.id,
    audit_id: auditId,
    workspace_id: workspaceId,
    domain: "journal-du-quartier.example",
    url: "https://journal-du-quartier.example/sorties/atelier-coloriage",
    tactics: ["mentions"],
    status: "exclu",
    stage_reached: 5,
    exclusion_reason: "sans_contact",
    page: { title: "Un atelier coloriage à la bibliothèque" },
    site_type: "media",
  };
  const targets = await must(
    "cibles",
    db
      .from("qualified_targets")
      .insert(
        [
          ...short,
          contactless,
          ...STOCK.map((domain, i) => ({
            run_id: qrun.id,
            audit_id: auditId,
            workspace_id: workspaceId,
            domain,
            url: `https://${domain}/`,
            tactics: ["inconnus"],
            status: "reserve",
            stage_reached: 3,
            exclusion_reason: "hors_budget_lecture",
            exclusion_detail: "en stock : pas encore lu",
            provisional_score: 40 - i,
          })),
        ],
        { defaultToNull: false },
      )
      .select("id, domain"),
  );
  const idOf = (domain) => targets.find((t) => t.domain === domain).id;

  const [frun] = await must(
    "analyse des pages",
    db
      .from("findings_runs")
      .insert({
        ...run,
        qualification_run_id: qrun.id,
        budget_usd: 0.05,
        expected_cost_usd: 0.01,
        worst_case_usd: 0.05,
        actual_cost_usd: 0.0014,
        stop_reason: "termine",
      })
      .select("id"),
  );
  const finding = (domain, kind, rest) => ({
    run_id: frun.id,
    audit_id: auditId,
    workspace_id: workspaceId,
    target_id: idOf(domain),
    domain,
    kind,
    resource_url: "https://coloriages-demo.example/saisons/",
    resource_title: "Coloriages des saisons",
    replacement_how: "jugement",
    request_lines: REQUEST("citée ci-dessus"),
    ...rest,
  });
  await must(
    "constats",
    db.from("target_findings").insert(
      [
        finding("ecole-jules-ferry.example", "lien_mort", {
          page_url: "https://ecole-jules-ferry.example/maternelle/ressources",
          quote: "Coloriages et graphisme : le site des petits artistes",
          link_url: "https://petits-artistes.example/coloriages",
          http_status: 404,
          anchor: "le site des petits artistes",
          reason: "Le lien cité renvoie une erreur 404 : la page n'existe plus.",
          brief: {
            opening:
              "Dans votre liste « Coloriages et graphisme », le lien vers « le site des petits artistes » ne fonctionne plus.",
          },
        }),
        finding("maitresse-clemence.example", "lien_inadapte", {
          page_url: "https://maitresse-clemence.example/arts-visuels/coloriages-automne",
          quote: "Vous trouverez de jolies feuilles à colorier sur ce site américain.",
          link_url: "https://fall-coloring.example/leaves",
          anchor: "ce site américain",
          reason: "Le lien mène à un site en anglais, peu pratique pour une classe française.",
          brief: {
            opening:
              "Dans votre article sur l'automne, le lien « ce site américain » mène à une page en anglais.",
          },
        }),
        finding("journal-du-quartier.example", "mention_sans_lien", {
          page_url: "https://journal-du-quartier.example/sorties/atelier-coloriage",
          quote: "Les dessins venaient du site Atelier Coloriages, que les enfants ont adoré.",
          anchor: "Atelier Coloriages",
          resource_url: "https://coloriages-demo.example/",
          resource_title: "Atelier Coloriages",
          replacement_how: "accueil",
          proposed_sentence:
            "Les dessins venaient du site Atelier Coloriages (coloriages-demo.example), que les enfants ont adoré.",
          reason: "La marque est citée sans lien.",
          brief: {
            opening:
              "Merci d'avoir cité Atelier Coloriages dans votre article sur l'atelier de la bibliothèque.",
          },
        }),
      ],
      { defaultToNull: false },
    ),
  );
}

const userId = await ensureUser();
const memberships = await must(
  "espace du compte de test",
  db.from("memberships").select("workspace_id").eq("user_id", userId).limit(1),
);
const workspaceId = memberships[0]?.workspace_id;
if (!workspaceId) throw new Error("Le compte de test n'a pas d'espace (trigger d'inscription).");

// Rejouable : on repart de zéro DANS CET ESPACE (les suppressions descendent en cascade).
await must("remise à zéro", db.from("sites").delete().eq("workspace_id", workspaceId));

await addSite(workspaceId, userId, {
  domain: "poterie-demo.example",
  niche: "cours de poterie",
  priority_queries: ["cours de poterie", "atelier céramique", "stage tournage"],
});

const running = await addSite(workspaceId, userId, {
  domain: "rando-demo.example",
  niche: "randonnée en famille",
  priority_queries: ["randonnée en famille", "balade avec enfants", "sentier facile"],
});
await addAudit(workspaceId, running, userId, {
  analysis_status: "en_cours",
  analysis_started_at: minutesAgo(3),
  status: "termine",
  finished_at: minutesAgo(10),
  backlinks_status: "en_cours",
  backlinks_started_at: minutesAgo(2),
  estimate_details: { chain: { uncovered: [] } },
});

const done = await addSite(workspaceId, userId, {
  domain: "coloriages-demo.example",
  niche: "coloriages à imprimer",
  priority_queries: QUERIES,
  signature_first_name: "Camille",
});
const doneAudit = await addAudit(workspaceId, done, userId, {
  analysis_status: "termine",
  analysis_started_at: minutesAgo(30),
  analysis_finished_at: minutesAgo(12),
  status: "termine",
  finished_at: minutesAgo(11),
  backlinks_status: "termine",
  backlinks_started_at: minutesAgo(11),
  backlinks_finished_at: minutesAgo(10),
  backlinks_cost_usd: 0.49,
  backlinks_stats: BACKLINKS_STATS,
  profile_status: "termine",
  profile_data: PROFILE_DATA,
  profile_summary:
    "Votre site est cité par 14 sites, contre 270 en médiane chez vos concurrents. Les pages de ressources d'écoles et de médiathèques sont la piste la plus accessible.",
  profile_summary_source: "modele",
  profile_started_at: minutesAgo(10),
  profile_finished_at: minutesAgo(9),
  profile_cost_usd: 0.086,
  opportunities_status: "termine",
  opportunities_started_at: minutesAgo(9),
  opportunities_finished_at: minutesAgo(8),
  opportunities_cost_usd: 0.016,
  opportunities_stats: {
    total: 3,
    byType: { page_ressources: 2, jamais_sollicite: 1 },
    candidates: 9,
  },
  estimate_details: { chain: { uncovered: [] } },
});
await must(
  "opportunités",
  db.from("link_opportunities").insert(
    SHORTLIST.slice(0, 3).map((s, i) => ({
      audit_id: doneAudit,
      workspace_id: workspaceId,
      site_id: done,
      type: i === 2 ? "jamais_sollicite" : "page_ressources",
      source_domain: s.domain,
      source_url: s.url,
      source_title: s.title,
      target_page_url: "https://coloriages-demo.example/",
      expected_link_type: "editorial",
      rationale: s.why,
      priority_score: 80 - i * 10,
      priority: i === 0 ? "haute" : "moyenne",
    })),
  ),
);
await addTargets(workspaceId, done, doneAudit, userId);

// MU.2 : un seul des trois états (`SEED_ONLY` = poterie | rando | coloriages), pour voir où `/app` mène
// à une personne qui n'a qu'un site ; `sans-site` ne garde rien.
const only = process.env.SEED_ONLY;
if (only) {
  const keep = {
    poterie: "poterie-demo.example",
    rando: "rando-demo.example",
    coloriages: "coloriages-demo.example",
  }[only];
  let q = db.from("sites").delete().eq("workspace_id", workspaceId);
  if (keep) q = q.neq("domain", keep);
  await must("un seul état", q);
}

console.log(
  JSON.stringify({
    ok: true,
    workspaceId,
    sites: 3,
    audits: { enCours: 1, fini: 1 },
    cibles: SHORTLIST.length,
  }),
);
