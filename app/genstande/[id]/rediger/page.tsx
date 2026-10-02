import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../../../lib/auth";
import { getCategories, getItem } from "../../../../lib/items";
import ItemWizard from "../../../components/item-wizard/ItemWizard";

export const metadata: Metadata = {
  title: "Rediger opslag · Hittegodscentralen",
};

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Copenhagen" });

export default async function EditItemPage({ params }: PageProps<"/genstande/[id]/rediger">) {
  const [user, item, categories] = await Promise.all([
    getCurrentUser(),
    params.then(({ id }) => getItem(id)),
    getCategories(),
  ]);
  if (!user) redirect("/profil");
  // Other people's items look the same as missing ones.
  if (!item || item.ownerId !== user.id) notFound();

  return (
    <ItemWizard
      mode="edit"
      itemId={item.id}
      categories={categories}
      userEmail={user.email}
      initialDraft={{
        type: item.type,
        title: item.title,
        description: item.description ?? "",
        categoryId: item.category ? String(item.category.id) : "",
        imageUrl: item.images[0]?.url ?? null,
        region: item.region ?? "",
        city: item.city ?? "",
        postalCode: item.postalCode ?? "",
        address: item.address ?? "",
        occurredOn: dayFormat.format(new Date(item.occurredAt)),
        latitude: item.latitude,
        longitude: item.longitude,
      }}
    />
  );
}
