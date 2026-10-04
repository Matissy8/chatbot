import { notFound, redirect } from "next/navigation";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/demo-data";

export default async function DynamicChatPage({ params }: PageProps<"/chat/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (chatError) throw new Error("Neizdevās ielādēt sarunu.");
  if (!chat) notFound();

  const { data: rows, error: messagesError } = await supabase
    .from("messages")
    .select("id, role, content")
    .eq("chat_id", id)
    .order("created_at", { ascending: true });
  if (messagesError) throw new Error("Neizdevās ielādēt sarunas ziņas.");

  const initialMessages: ChatMessage[] = (rows ?? [])
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role as ChatMessage["role"],
      content: message.content,
    }));

  return <ChatInterface key={id} chatId={id} initialMessages={initialMessages} />;
}