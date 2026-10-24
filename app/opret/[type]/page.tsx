import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import type { ItemType } from "../../../lib/item-card";
import ItemWizard from "../../components/item-wizard/ItemWizard";

// /opret/tabt and /opret/fundet. The type was chosen on the frontpage, so the wizard skips step 1.
const TYPES: Record<string, { type: ItemType; title: string }> = {
  tabt: { type: "lost", title: "Opret tabt genstand" },
  fundet: { type: "found", title: "Opret fundet genstand" },
};

export async function generateMetadata({
  params,
}: PageProps<"/opret/[type]">): Promise<Metadata> {
  const config = TYPES[(await params).type];
  return { title: `${config?.title ?? "Opret opslag"} · Hittegodscentralen` };
}

export default async function CreateTypedItemPage({ params }: PageProps<"/opret/[type]">) {
  const config = TYPES[(await params).type];
  if (!config) notFound();

  const user = await getCurrentUser();
  return (
    <ItemWizard
      mode="create"
      initialDraft={{ type: config.type }}
      userEmail={user?.email ?? null}
    />
  );
}
