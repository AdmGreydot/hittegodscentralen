"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getCurrentUserId } from "../../lib/auth";
import { notifyNewMessage } from "../../lib/notifications";
import { createClient } from "../../lib/supabase/server";

const MAX_MESSAGE_LENGTH = 2000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MessageResult = { error?: string };

function cleanBody(body: string) {
  const text = body.trim();
  if (!text) return { error: "Skriv en besked først." };
  if (text.length > MAX_MESSAGE_LENGTH) {
    return { error: `Beskeden må højst være ${MAX_MESSAGE_LENGTH} tegn.` };
  }
  return { text };
}

// First message about an item, from the item page. Reuses the conversation if the user has
// written about this item before. RLS checks that the item is active and owner_id is its owner.
export async function startConversation(itemId: string, body: string): Promise<MessageResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Du skal være logget ind for at sende en besked." };
  if (!UUID_RE.test(itemId)) return { error: "Genstanden findes ikke." };
  const { text, error } = cleanBody(body);
  if (!text) return { error };

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("items")
    .select("user_id")
    .eq("id", itemId)
    .maybeSingle<{ user_id: string | null }>();
  if (!item?.user_id) return { error: "Genstanden findes ikke." };
  if (item.user_id === userId) return { error: "Du kan ikke skrive til dig selv." };

  let { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("item_id", itemId)
    .eq("starter_id", userId)
    .maybeSingle<{ id: string }>();

  if (!conversation) {
    const { data, error: insertError } = await supabase
      .from("conversations")
      .insert({ item_id: itemId, owner_id: item.user_id, starter_id: userId })
      .select("id")
      .single<{ id: string }>();
    if (insertError) {
      console.error("startConversation: insert failed", insertError);
      return { error: "Beskeden kunne ikke sendes. Prøv igen om lidt." };
    }
    conversation = data;
  }

  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({ conversation_id: conversation.id, sender_id: userId, body: text })
    .select("id")
    .single<{ id: string }>();
  if (messageError) {
    console.error("startConversation: message failed", messageError);
    return { error: "Beskeden kunne ikke sendes. Prøv igen om lidt." };
  }
  after(() => notifyNewMessage(message.id));

  redirect(`/profil?fane=beskeder&samtale=${conversation.id}`);
}

// A reply in an existing conversation. RLS only lets participants write.
export async function sendMessage(conversationId: string, body: string): Promise<MessageResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Du er blevet logget ud. Log ind igen for at sende beskeden." };
  if (!UUID_RE.test(conversationId)) return { error: "Samtalen findes ikke." };
  const { text, error } = cleanBody(body);
  if (!text) return { error };

  const supabase = await createClient();
  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: userId, body: text })
    .select("id")
    .single<{ id: string }>();
  if (insertError) {
    console.error("sendMessage failed", insertError);
    return { error: "Beskeden kunne ikke sendes. Prøv igen om lidt." };
  }
  after(() => notifyNewMessage(message.id));

  refresh();
  return {};
}

export async function markConversationRead(conversationId: string) {
  if (!UUID_RE.test(conversationId)) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_conversation_read", { target: conversationId });
  if (error) console.error("markConversationRead failed", error);
  refresh();
}
