import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideArticle } from "@/features/mailboxes/guides/guide-article";
import { guideHref, guideTitle, providerBySlug, PROVIDERS } from "@/features/mailboxes/providers";
import { t } from "@/lib/messages";

type Props = { params: Promise<{ fournisseur: string }> };

/** Une page statique par fournisseur connu ; tout autre segment répond 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return PROVIDERS.map((p) => ({ fournisseur: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = providerBySlug((await params).fournisseur);
  if (!p) return {};
  const gd = t.mailboxGuides.ui.guide;
  return {
    title: `${guideTitle(p)} | ${t.app.name}`,
    description: p.compatible
      ? gd.metaDescription(p.name)
      : gd.metaDescriptionNotCompatible(p.name),
    alternates: { canonical: guideHref(p.slug) },
  };
}

export default async function Page({ params }: Props) {
  const p = providerBySlug((await params).fournisseur);
  if (!p) notFound();
  return <GuideArticle p={p} />;
}
