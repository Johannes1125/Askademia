// Chat Page
"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "react-toastify";
import { PaperPlaneIcon, PlusIcon } from "@radix-ui/react-icons";

type Message = { id: string; role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; messages: Message[] };

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "seed",
      title: "New Conversation",
      messages: [],
    },
  ]);
  const [activeId, setActiveId] = useState<string>(conversations[0].id);
  const active = useMemo(
    () => conversations.find((c) => c.id === activeId)!,
    [conversations, activeId]
  );
  const [input, setInput] = useState("");

  function createConversation() {
    const id = crypto.randomUUID();
    const conv: Conversation = { id, title: "New Conversation", messages: [] };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);
  }

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              title: c.messages.length === 0 ? text.slice(0, 40) : c.title,
              messages: [
                ...c.messages,
                { id: crypto.randomUUID(), role: "user", content: text },
              ],
            }
          : c
      )
    );
    toast.success("Message queued (no backend yet)");
    // simple echo assistant
    setTimeout(() => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: `You said: ${text}`,
                  },
                ],
              }
            : c
        )
      );
    }, 400);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-full">
      {/* Left: conversation list */}
      <div className="card bg-[#11161d] border-white/10 text-white flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <button
            onClick={createConversation}
            className="w-full flex items-center gap-2 justify-center rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: "var(--brand-yellow)", color: "#1f2937" }}
          >
            <PlusIcon /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.map((c) => {
            const active = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                  active ? "bg-[var(--brand-yellow)]/20" : "hover:bg-white/5"
                }`}
              >
                {c.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: conversation panel */}
      <div className="card bg-[#11161d] border-white/10 text-white flex flex-col overflow-hidden">
        <div className="h-12 flex items-center px-4 border-b border-white/10 text-white/90">
          {active.messages.length === 0 ? "New Conversation" : active.title}
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {active.messages.length === 0 ? (
            <div className="h-full grid place-items-center text-center text-white/80">
              <div>
                <div className="text-2xl font-semibold mb-2">Start a Research Conversation</div>
                <div className="text-sm text-white/60">
                  Ask me anything about research, citations, academic writing, or finding sources
                </div>
              </div>
            </div>
          ) : (
            active.messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] md:max-w-[70%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[var(--brand-blue)] text-white"
                      : "bg-white/5"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about research, citations, grammar, or sources..."
              className="flex-1 rounded-lg bg-[#0f1218] border border-white/10 px-3 h-11 text-sm outline-none focus:border-white/20"
            />
            <button
              onClick={sendMessage}
              className="h-11 w-11 grid place-items-center rounded-lg disabled:opacity-50"
              style={{ background: "var(--brand-yellow)", color: "#1f2937" }}
              disabled={!input.trim()}
            >
              <PaperPlaneIcon />
            </button>
          </div>
          <div className="mt-2 text-xs text-white/50">Askademia can make mistakes. Verify important info.</div>
        </div>
      </div>

      {/* Keep the confirmation modal for clearing chat if needed */}
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button className="hidden" />
        </Dialog.Trigger>
      </Dialog.Root>
    </div>
  );
}


