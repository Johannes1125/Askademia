// Chat Page
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "react-toastify";
import { PaperPlaneIcon, PlusIcon, TrashIcon, ReloadIcon } from "@radix-ui/react-icons";

type Message = { id: string; role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; messages: Message[] };

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!active) return;
    
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      } else if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    };
    
    // Small delay to ensure DOM has updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [active?.messages]);

  // Scroll to bottom when switching conversations
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [activeId]);

  async function createConversation() {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "New Conversation",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }

      const data = await response.json();
      const newConv = data.conversation;

      setConversations((prev) => [newConv, ...prev]);
      setActiveId(newConv.id);
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
      // Fallback to local conversation (won't persist, but allows usage)
      const id = crypto.randomUUID();
      const conv: Conversation = { id, title: "New Conversation", messages: [] };
      setConversations((prev) => [conv, ...prev]);
      setActiveId(id);
    }
  }

  async function deleteConversation(conversationId: string, e: React.MouseEvent) {
    e.stopPropagation(); // Prevent selecting the conversation when clicking delete
    
    if (!confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
      return;
    }

    // Check if it's a database conversation (UUID format)
    const isDatabaseConversation = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
    
    if (isDatabaseConversation) {
      try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete conversation");
        }
      } catch (error: any) {
        console.error("Error deleting conversation:", error);
        toast.error("Failed to delete conversation");
        return;
      }
    }

    // Remove from local state and handle active conversation
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== conversationId);
      
      // If we deleted the active conversation, switch to another one
      if (activeId === conversationId) {
        if (remaining.length > 0) {
          setActiveId(remaining[0].id);
        } else {
          // Create a new conversation if none remain
          createConversation();
        }
      }
      
      return remaining;
    });
    
    toast.success("Conversation deleted");
  }

  // Load conversations from Supabase on mount and when needed
  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const response = await fetch("/api/conversations");
      
      if (!response.ok) {
        throw new Error("Failed to load conversations");
      }

      const data = await response.json();
      const loadedConversations = data.conversations || [];

      if (loadedConversations.length > 0) {
        setConversations(loadedConversations);
        // Only set active if we don't have one or if the current one was deleted
        if (!activeId || !loadedConversations.find(c => c.id === activeId)) {
          setActiveId(loadedConversations[0].id);
        }
      } else {
        // Create a new conversation if none exist
        await createConversation();
      }
    } catch (error: any) {
      console.error("Error loading conversations:", error);
      toast.error("Failed to load conversations");
      // Create a new conversation as fallback
      await createConversation();
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendMessage() {
    if (!active || !activeId) return;
    
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    // Check if conversation exists in database (check if it's a valid UUID from database)
    // UUIDs are typically 36 characters with dashes: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const conversationExists = active.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(active.id);
    
    // Save user message to Supabase (only if conversation exists in DB)
    let userMessageId: string;
    if (conversationExists) {
      try {
        const userMsgResponse = await fetch(`/api/conversations/${activeId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "user",
            content: text,
          }),
        });

        if (!userMsgResponse.ok) {
          let errorData: any = {};
          let errorMessage = "Failed to save user message";
          
          try {
            const text = await userMsgResponse.text();
            if (text) {
              errorData = JSON.parse(text);
              errorMessage = errorData.error || errorData.message || errorMessage;
            }
          } catch (parseError) {
            console.error("Error parsing error response:", parseError);
            errorMessage = `HTTP ${userMsgResponse.status}: ${userMsgResponse.statusText}`;
          }
          
          console.error("Error saving user message:", {
            status: userMsgResponse.status,
            statusText: userMsgResponse.statusText,
            error: errorData,
          });
          
          // If conversation not found, try to create it first
          if (errorMessage.includes('Conversation not found') || userMsgResponse.status === 404) {
            console.log("Conversation not found, attempting to create it...");
            // Don't throw, just use local ID and continue
            userMessageId = crypto.randomUUID();
          } else {
            throw new Error(errorMessage);
          }
        } else {
          const userMsgData = await userMsgResponse.json();
          userMessageId = userMsgData.message.id;

          // Update conversation title if it's the first message
          if (active.messages.length === 0) {
            const newTitle = text.slice(0, 40);
            await fetch(`/api/conversations/${activeId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ title: newTitle }),
            }).catch(err => console.error("Error updating title:", err));
          }
        }
      } catch (error: any) {
        console.error("Error saving user message:", error);
        // Show error to user if it's a database issue
        if (error.message?.includes('Database tables not found') || error.message?.includes('schema')) {
          toast.error("Database tables not found. Please run the schema in Supabase SQL Editor.");
        } else if (error.message && !error.message.includes('Conversation not found')) {
          toast.error(error.message);
        }
        // Continue anyway - use local ID
        userMessageId = crypto.randomUUID();
      }
    } else {
      // Conversation doesn't exist in DB, use local ID
      userMessageId = crypto.randomUUID();
    }

    // Update local state with user message
    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: text,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              title: c.messages.length === 0 ? text.slice(0, 40) : c.title,
              messages: [...c.messages, userMessage],
            }
          : c
      )
    );

    // Add placeholder assistant message
    const assistantMessageId = crypto.randomUUID();
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              messages: [
                ...c.messages,
                {
                  id: assistantMessageId,
                  role: "assistant",
                  content: "",
                },
              ],
            }
          : c
      )
    );

    try {
      // Prepare messages for OpenAI API
      const messagesForAPI = [
        ...active.messages,
        { role: "user" as const, content: text },
      ].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messagesForAPI,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      // Save assistant message to Supabase (only if conversation exists in DB)
      if (conversationExists) {
        try {
          const assistantMsgResponse = await fetch(`/api/conversations/${activeId}/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              role: "assistant",
              content: data.message,
            }),
          });

          if (assistantMsgResponse.ok) {
            const assistantMsgData = await assistantMsgResponse.json();
            // Update with actual message ID from Supabase
            setConversations((prev) =>
              prev.map((c) =>
                c.id === activeId
                  ? {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMessageId
                          ? { id: assistantMsgData.message.id, role: "assistant", content: data.message }
                          : m
                      ),
                    }
                  : c
              )
            );
          } else {
            // Don't throw, just log and continue
            let errorData: any = {};
            try {
              const text = await assistantMsgResponse.text();
              if (text) {
                errorData = JSON.parse(text);
              }
            } catch (parseError) {
              // Ignore parse errors
            }
            console.error("Error saving assistant message:", {
              status: assistantMsgResponse.status,
              error: errorData,
            });
            // Still update UI with the response using local ID
            setConversations((prev) =>
              prev.map((c) =>
                c.id === activeId
                  ? {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMessageId
                          ? { ...m, content: data.message }
                          : m
                      ),
                    }
                  : c
              )
            );
          }
        } catch (error: any) {
          console.error("Error saving assistant message:", error);
          // Still update UI with the response
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: data.message }
                        : m
                    ),
                  }
                : c
            )
          );
        }
      } else {
        // Conversation doesn't exist in DB, just update UI with local ID
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: data.message }
                      : m
                  ),
                }
              : c
          )
        );
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message. Please try again.");
      
      // Remove the placeholder assistant message on error
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages: c.messages.filter((m) => m.id !== assistantMessageId),
              }
            : c
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-full max-h-full min-h-0">
      {/* Left: conversation list - Chat History Sidebar */}
      <div className="card bg-[#11161d] border-white/10 text-white flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <button
            onClick={createConversation}
            className="flex-1 flex items-center gap-2 justify-center rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: "var(--brand-yellow)", color: "#1f2937" }}
          >
            <PlusIcon /> New Chat
          </button>
          <button
            onClick={loadConversations}
            disabled={loadingConversations}
            className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh conversations"
          >
            <ReloadIcon className={`h-4 w-4 ${loadingConversations ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingConversations ? (
            <div className="text-center text-white/60 text-sm py-4">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-white/60 text-sm py-4">
              <p>No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeId;
              const isDatabaseConv = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
              return (
                <div
                  key={c.id}
                  className={`group relative flex items-center rounded-lg ${
                    isActive ? "bg-[var(--brand-yellow)]/20" : "hover:bg-white/5"
                  }`}
                >
                  <button
                    onClick={() => setActiveId(c.id)}
                    className="flex-1 text-left rounded-lg px-3 py-2 text-sm pr-8 truncate"
                  >
                    <div className="truncate">{c.title || "New Conversation"}</div>
                    {c.messages && c.messages.length > 0 && (
                      <div className="text-xs text-white/50 mt-0.5">
                        {c.messages.length} message{c.messages.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </button>
                  {isDatabaseConv && (
                    <button
                      onClick={(e) => deleteConversation(c.id, e)}
                      className="absolute right-2 p-1.5 rounded hover:bg-red-500/20 text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete conversation"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: conversation panel */}
      <div className="card bg-[#11161d] border-white/10 text-white flex flex-col overflow-hidden h-full max-h-full">
        <div className="h-12 flex-shrink-0 flex items-center px-4 border-b border-white/10 text-white/90">
          {loadingConversations ? "Loading..." : (active ? (active.messages.length === 0 ? "New Conversation" : active.title) : "No conversation selected")}
        </div>
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth min-h-0 max-h-full"
        >
          {loadingConversations ? (
            <div className="h-full grid place-items-center text-center text-white/80">
              <div>Loading conversations...</div>
            </div>
          ) : !active ? (
            <div className="h-full grid place-items-center text-center text-white/80">
              <div>
                <div className="text-2xl font-semibold mb-2">No Conversation Selected</div>
                <div className="text-sm text-white/60">
                  Click "New Chat" to start a conversation
                </div>
              </div>
            </div>
          ) : active.messages.length === 0 ? (
            <div className="h-full grid place-items-center text-center text-white/80">
              <div>
                <div className="text-2xl font-semibold mb-2">Start a Research Conversation</div>
                <div className="text-sm text-white/60">
                  Ask me anything about research, citations, academic writing, or finding sources
                </div>
              </div>
            </div>
          ) : (
            <>
              {active.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] md:max-w-[70%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-[var(--brand-blue)] text-white"
                        : "bg-white/5"
                    }`}
                  >
                    {m.content || (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-2 w-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        <div className="border-t border-white/10 p-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about research, citations, grammar, or sources..."
              className="flex-1 rounded-lg bg-[#0f1218] border border-white/10 px-3 h-11 text-sm outline-none focus:border-white/20"
              disabled={loading || !active}
            />
            <button
              onClick={sendMessage}
              className="h-11 w-11 grid place-items-center rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--brand-yellow)", color: "#1f2937" }}
              disabled={!input.trim() || loading || !active}
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-[#1f2937] border-t-transparent rounded-full animate-spin" />
              ) : (
                <PaperPlaneIcon />
              )}
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


