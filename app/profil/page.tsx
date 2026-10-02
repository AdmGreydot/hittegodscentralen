import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid, MessageSquare, Plus } from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { initials } from "../../lib/initials";
import { getMyItems, getOwnProfile } from "../../lib/items";
import { getConversations, getMessages } from "../../lib/messages";
import LoggedOut from "./_components/LoggedOut";
import Messages from "./_components/Messages";
import MyItems from "./_components/MyItems";

export const metadata: Metadata = {
  title: "Min profil · Hittegodscentralen",
};

const memberSince = new Intl.DateTimeFormat("da-DK", {
  month: "short",
  year: "numeric",
  timeZone: "Europe/Copenhagen",
});

export default async function ProfilePage({ searchParams }: PageProps<"/profil">) {
  const user = await getCurrentUser();
  if (!user) return <LoggedOut />;

  const query = await searchParams;
  const tab = query.fane === "beskeder" ? "messages" : "items";
  const requested = typeof query.samtale === "string" ? query.samtale : null;

  const [profile, conversations] = await Promise.all([
    getOwnProfile(user.id),
    getConversations(user.id),
  ]);
  const name = profile?.full_name || user.fullName || user.email;
  const unread = conversations.reduce((sum, c) => sum + c.unread, 0);

  // Conversations about the user's own items, per item — to pick who an item was handed over to.
  const conversationsByItem: Record<string, { id: string; otherName: string }[]> = {};
  for (const c of conversations) {
    if (c.iOwnItem) (conversationsByItem[c.itemId] ??= []).push({ id: c.id, otherName: c.otherName });
  }

  // On large screens the newest conversation opens by default; on phones the list shows first.
  const active = conversations.find((c) => c.id === requested) ?? conversations[0] ?? null;
  const [items, messages] = await Promise.all([
    tab === "items" ? getMyItems(user.id) : null,
    tab === "messages" && active ? getMessages(active.id, user.id) : null,
  ]);

  return (
    <main className="flex-1 bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:py-10">
            <div className="flex items-center gap-4 sm:gap-5">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-brand-brown font-serif text-2xl font-bold text-white sm:size-[72px]">
                {initials(name)}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold">
                  Min profil
                </p>
                <h1 className="truncate font-serif text-3xl font-bold text-brand-brown sm:text-4xl">
                  {name}
                </h1>
                <p className="mt-0.5 truncate text-sm font-light text-zinc-500">
                  {user.email}
                  {profile && (
                    <> · Medlem siden {memberSince.format(new Date(profile.created_at)).replace(".", "")}</>
                  )}
                </p>
              </div>
            </div>
            <Link
              href="/opret"
              className="flex items-center justify-center gap-2 self-start rounded-xl bg-brand-rust px-6 py-3 font-medium text-white transition-colors hover:bg-brand-rust/90 sm:self-auto"
            >
              <Plus size={18} aria-hidden />
              Opret annonce
            </Link>
          </div>

          <nav aria-label="Profil" className="-mb-px flex gap-2">
            <Tab href="/profil" active={tab === "items"} icon={<LayoutGrid size={18} aria-hidden />}>
              Mine genstande
            </Tab>
            <Tab
              href="/profil?fane=beskeder"
              active={tab === "messages"}
              icon={<MessageSquare size={18} aria-hidden />}
            >
              Beskeder
              {unread > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-brand-rust px-1.5 text-xs font-semibold text-white">
                  <span className="sr-only">, </span>
                  {unread}
                  <span className="sr-only"> ulæste</span>
                </span>
              )}
            </Tab>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {items && <MyItems items={items} conversationsByItem={conversationsByItem} />}
        {tab === "messages" && (
          <Messages
            conversations={conversations}
            active={active}
            messages={messages ?? []}
            showThreadOnMobile={Boolean(requested && active?.id === requested)}
          />
        )}
      </div>
    </main>
  );
}

function Tab({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 border-b-2 px-4 py-4 font-medium transition-colors ${
        active
          ? "border-brand-brown text-brand-brown"
          : "border-transparent text-zinc-400 hover:text-brand-brown"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
