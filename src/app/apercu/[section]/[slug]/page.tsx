import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderPreview } from "@/features/content/pages";
import { SECTIONS, type Section } from "@/features/content/schema";

/** Aperçu d'un contenu, brouillon ou programmé : en développement seulement (404 en production). */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Page({
  params,
}: {
  params: Promise<{ section: string; slug: string }>;
}) {
  const { section, slug } = await params;
  if (!(SECTIONS as readonly string[]).includes(section)) notFound();
  return renderPreview(section as Section, slug);
}
