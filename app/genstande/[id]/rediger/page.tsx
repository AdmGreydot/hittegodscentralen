import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../../../lib/auth";
import { getItem } from "../../../../lib/items";
import ItemWizard from "../../../components/item-wizard/ItemWizard";

export const metadata: Metadata = {
  title: "Rediger opslag · Hittegodscentralen",
};

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Copenhagen" });

export default async function EditItemPage({ params }: PageProps<"/genstande/[id]/rediger">) {
  const [user, item] = await Promise.all([
    getCurrentUser(),
    params.then(({ id }) => getItem(id)),
  ]);
  if (!user) redirect("/profil");
  // Other people's items look the same as missing ones.
  if (!item || item.ownerId !== user.id) notFound();

  return (
    <ItemWizard
      mode="edit"
      itemId={item.id}
      userEmail={user.email}
      initialDraft={{
        type: item.type,
        title: item.title,
        description: item.description ?? "",
        imageUrl: item.images[0]?.url ?? null,
        region: item.region ?? "",
        city: item.city ?? "",
        postalCode: item.postalCode ?? "",
        address: item.address ?? "",
        occurredOn: dayFormat.format(new Date(item.occurredAt)),
        // Only an exact spot is kept. A postal code's centre is worked out again on save.
        latitude: item.locationExact ? item.latitude : null,
        longitude: item.locationExact ? item.longitude : null,
      }}
    />
  );
}
