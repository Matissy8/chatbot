import { notFound, redirect } from "next/navigation";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { createClient } from "@/lib/supabase/server";
import { MUSIC_SUBJECTS } from "@/lib/music-subjects";
import type { ChatMessage } from "@/lib/chat-types";

export default async function DynamicChatPage({ params }: PageProps<"/chat/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id, subject")
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

  const initialSubject = MUSIC_SUBJECTS.find((subject) => subject.name === chat.subject)?.id;

  return <ChatInterface key={id} chatId={id} initialMessages={initialMessages} initialSubject={initialSubject} />;
}