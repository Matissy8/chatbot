import { ChatInterface } from "@/components/chat/ChatInterface";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ prompt?: string | string[] }> }) {
  const params = await searchParams;
  const initialPrompt = Array.isArray(params.prompt) ? params.prompt[0] : params.prompt;

  return (
    <div className="h-full min-h-[480px] w-full">
      <ChatInterface initialPrompt={initialPrompt?.slice(0, 500)} />
    </div>
  );
}
