import "server-only";
import {
  itemClosedMail,
  itemExpiredMail,
  itemExpiringMail,
  newMessageMail,
  unreadReminderMail,
  type ItemClosedReason,
  type UnreadConversation,
} from "./emails";
import { EXPIRY_WARNING_DAYS, extendUrl, manageUrl } from "./item-expiry";
import { sendMail } from "./mail";
import { createAdminClient } from "./supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

type ConversationRef = {
  owner_id: string;
  starter_id: string;
  items: { title: string } | null;
};

// E-mail and name of a user. The e-mail lives in auth.users, the name in public.users.
async function getRecipient(supabase: Admin, userId: string) {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  const fullName = data.user.user_metadata?.full_name;
  return { email: data.user.email, fullName: typeof fullName === "string" ? fullName : "" };
}

async function getNames(supabase: Admin, userIds: string[]) {
  const { data } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", userIds)
    .returns<{ id: string; full_name: string }[]>();
  return new Map((data ?? []).map((u) => [u.id, u.full_name]));
}

// Tells the other participant about a new message, with the message in the mail.
export async function notifyNewMessage(messageId: string) {
  const supabase = createAdminClient();
  // items has two links to conversations (the item, and the one it was handed over through),
  // so the embed names which one.
  const { data: message, error } = await supabase
    .from("messages")
    .select("body, sender_id, conversation_id, conversations(owner_id, starter_id, items!conversations_item_id_fkey(title))")
    .eq("id", messageId)
    .maybeSingle<{
      body: string;
      sender_id: string;
      conversation_id: string;
      conversations: ConversationRef | null;
    }>();
  if (error) {
    console.error("notifyNewMessage: lookup failed", error);
    return;
  }
  const conversation = message?.conversations;
  if (!message || !conversation) return;

  const recipientId =
    conversation.owner_id === message.sender_id ? conversation.starter_id : conversation.owner_id;
  const [recipient, names] = await Promise.all([
    getRecipient(supabase, recipientId),
    getNames(supabase, [message.sender_id]),
  ]);
  if (!recipient) return;

  await sendMail({
    to: recipient.email,
    ...newMessageMail({
      recipientName: recipient.fullName,
      senderName: names.get(message.sender_id) ?? "",
      itemTitle: conversation.items?.title ?? "din genstand",
      body: message.body,
      conversationId: message.conversation_id,
    }),
  });
}

// Messages still unread this long after they were sent get a reminder…
const REMIND_AFTER_MS = 24 * 60 * 60 * 1000;
// …unless they're older than this (e.g. right after the feature is switched on).
const REMIND_WITHIN_MS = 7 * 24 * 60 * 60 * 1000;

type UnreadRow = {
  id: string;
  body: string;
  sender_id: string;
  conversation_id: string;
  conversations: ConversationRef | null;
};

// One mail per recipient listing their unread messages, then marks them as reminded so each
// message is only reminded about once. Run once a day by the cron route.
export async function sendUnreadReminders() {
  const supabase = createAdminClient();
  const now = Date.now();
  const { data: rows, error } = await supabase
    .from("messages")
    .select("id, body, sender_id, conversation_id, conversations(owner_id, starter_id, items!conversations_item_id_fkey(title))")
    .is("read_at", null)
    .is("reminded_at", null)
    .lt("created_at", new Date(now - REMIND_AFTER_MS).toISOString())
    .gt("created_at", new Date(now - REMIND_WITHIN_MS).toISOString())
    .order("created_at", { ascending: true })
    .limit(1000)
    .returns<UnreadRow[]>();
  if (error) throw error;

  // recipient → conversation → messages, oldest first.
  const byRecipient = new Map<string, Map<string, { row: UnreadRow; bodies: string[]; ids: string[] }>>();
  for (const row of rows) {
    const c = row.conversations;
    if (!c) continue;
    const recipientId = c.owner_id === row.sender_id ? c.starter_id : c.owner_id;
    const conversations = byRecipient.get(recipientId) ?? new Map();
    byRecipient.set(recipientId, conversations);
    const entry = conversations.get(row.conversation_id) ?? { row, bodies: [], ids: [] };
    conversations.set(row.conversation_id, entry);
    entry.bodies.push(row.body);
    entry.ids.push(row.id);
  }

  const names = await getNames(supabase, [...new Set(rows.map((r) => r.sender_id))]);
  let sent = 0;

  for (const [recipientId, conversations] of byRecipient) {
    const recipient = await getRecipient(supabase, recipientId);
    const entries = [...conversations.values()];
    const ids = entries.flatMap((e) => e.ids);

    if (recipient) {
      const list: UnreadConversation[] = entries.map((e) => ({
        conversationId: e.row.conversation_id,
        senderName: names.get(e.row.sender_id) ?? "",
        itemTitle: e.row.conversations?.items?.title ?? "din genstand",
        messages: e.bodies,
      }));
      // Not sent: leave them unmarked so tomorrow's run tries again.
      if (!(await sendMail({ to: recipient.email, ...unreadReminderMail(recipient.fullName, list) }))) {
        continue;
      }
      sent++;
    }

    const { error: updateError } = await supabase
      .from("messages")
      .update({ reminded_at: new Date().toISOString() })
      .in("id", ids);
    if (updateError) console.error("sendUnreadReminders: update failed", updateError);
  }

  return { recipients: byRecipient.size, sent };
}

type ExpiringRow = {
  id: string;
  title: string;
  expires_at: string;
  user_id: string | null;
  contact_email: string | null;
};

// Warns posters whose items expire within EXPIRY_WARNING_DAYS (once per item), then archives
// items past their expiry date. Run once a day by the cron route.
export async function processItemExpiry() {
  const supabase = createAdminClient();
  const now = new Date();
  const warnBefore = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000);

  const { data: expiring, error } = await supabase
    .from("items")
    .select("id, title, expires_at, user_id, contact_email")
    .eq("status", "active")
    .is("expiry_warned_at", null)
    .gt("expires_at", now.toISOString())
    .lte("expires_at", warnBefore.toISOString())
    .limit(500)
    .returns<ExpiringRow[]>();
  if (error) throw error;

  let warned = 0;
  for (const item of expiring) {
    const recipient = item.user_id
      ? await getRecipient(supabase, item.user_id)
      : item.contact_email
        ? { email: item.contact_email, fullName: "" }
        : null;
    if (recipient) {
      const sent = await sendMail({
        to: recipient.email,
        ...itemExpiringMail({
          fullName: recipient.fullName,
          itemId: item.id,
          itemTitle: item.title,
          expiresAt: item.expires_at,
          extendUrl: extendUrl(item.id, item.expires_at),
          hasAccount: Boolean(item.user_id),
          manageUrl: item.user_id ? undefined : manageUrl(item.id),
        }),
      });
      // Not sent: leave it unmarked so tomorrow's run tries again.
      if (!sent) continue;
      warned++;
    }
    await supabase.from("items").update({ expiry_warned_at: now.toISOString() }).eq("id", item.id);
  }

  // Expired: archived without a resolution, so the extend link can bring it back.
  const { data: archived, error: archiveError } = await supabase
    .from("items")
    .update({ status: "archived" })
    .eq("status", "active")
    .lte("expires_at", now.toISOString())
    .select("id, title, expires_at, user_id, contact_email")
    .returns<ExpiringRow[]>();
  if (archiveError) throw archiveError;

  for (const item of archived) {
    const recipient = item.user_id
      ? await getRecipient(supabase, item.user_id)
      : item.contact_email
        ? { email: item.contact_email, fullName: "" }
        : null;
    if (!recipient) continue;
    await sendMail({
      to: recipient.email,
      ...itemExpiredMail({
        fullName: recipient.fullName,
        itemTitle: item.title,
        extendUrl: extendUrl(item.id, item.expires_at),
      }),
    });
  }

  return { warned, archived: archived.length };
}

export type ItemParticipant = { email: string; fullName: string; itemTitle: string; conversationId: string };

// The other person in each conversation about these items, or (with `userId`) in each of that
// user's conversations. Read before deleting, since the conversations go with the item/user.
export async function getConversationPartners(
  filter: { itemIds: string[] } | { userId: string },
): Promise<ItemParticipant[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("conversations")
    .select("id, owner_id, starter_id, items!conversations_item_id_fkey(title)");
  query =
    "itemIds" in filter
      ? query.in("item_id", filter.itemIds)
      : query.or(`owner_id.eq.${filter.userId},starter_id.eq.${filter.userId}`);
  const { data, error } = await query.returns<
    { id: string; owner_id: string; starter_id: string; items: { title: string } | null }[]
  >();
  if (error) {
    console.error("getConversationPartners failed", error);
    return [];
  }

  const partners: ItemParticipant[] = [];
  for (const c of data) {
    // Item filter: the poster is the one acting, so tell the starter. User filter: the other one.
    const otherId = "userId" in filter && c.starter_id === filter.userId ? c.owner_id : c.starter_id;
    const recipient = await getRecipient(supabase, otherId);
    if (recipient) {
      partners.push({ ...recipient, itemTitle: c.items?.title ?? "en genstand", conversationId: c.id });
    }
  }
  return partners;
}

export async function notifyConversationPartners(partners: ItemParticipant[], reason: ItemClosedReason) {
  for (const p of partners) {
    await sendMail({
      to: p.email,
      ...itemClosedMail({
        recipientName: p.fullName,
        itemTitle: p.itemTitle,
        reason,
        conversationId: p.conversationId,
      }),
    });
  }
}
