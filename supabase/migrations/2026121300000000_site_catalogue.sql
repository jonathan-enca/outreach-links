-- MC.6e (18/11/2026). Migration ADDITIVE.
-- 1. Catalogue COMPLET du site à promouvoir : tout le sitemap plus les pages visitées (titre, titre
--    principal, description), stocké une fois par site. Le texte des pages lues reste dans site_pages.
-- 2. « Rédiger quand même » : une cible écartée peut être rejouée sur demande de la personne.
-- 3. Note « à relire » d'un brouillon (lien unique, ancre optimisée, article sponsorisé...) : un signal,
--    pas un refus.

create table public.site_catalogue (
  site_id uuid not null references public.sites (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  url text not null,
  title text not null default '',
  heading text not null default '',
  description text not null default '',
  -- 'sitemap' : adresse connue seulement ; 'lue' : page visitée (titre, titre principal, description).
  source text not null default 'sitemap' check (source in ('sitemap', 'lue')),
  read_at timestamptz not null default now(),
  primary key (site_id, url)
);

alter table public.site_catalogue enable row level security;
revoke all on public.site_catalogue from anon, authenticated, service_role;
grant select on public.site_catalogue to authenticated;
grant select, insert, update, delete on public.site_catalogue to service_role;
create policy site_catalogue_select on public.site_catalogue
  for select to authenticated using (public.is_workspace_member(workspace_id));

alter table public.draft_declines add column retry_requested boolean not null default false;
grant delete on public.draft_declines to service_role;

alter table public.target_drafts add column review_note text;
