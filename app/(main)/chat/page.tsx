// Chat Page
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "react-toastify";
import { PaperPlaneIcon, PlusIcon, TrashIcon, ReloadIcon } from "@radix-ui/react-icons";
import ReactMarkdown from "react-markdown";

type Message = { id: string; role: "user" | "assistant"; content: string };
type Conversation = { 
  id: string; 
  title: string; 
  messages: Message[];
  rating?: number | null;
  feedback?: string | null;
  rated_at?: string | null;
};

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Ensure Dialog only renders on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Research-focused prompt templates
  const promptTemplates = [
    "Create a research topic for me",
    "Help me find academic sources",
    "Explain this research methodology",
    "Format this citation in APA style",
    "Review my research question",
    "Suggest research databases",
    "Help with literature review",
    "Improve my academic writing",
  ];

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

  function openDeleteModal(conversationId: string, e: React.MouseEvent) {
    e.stopPropagation(); // Prevent selecting the conversation when clicking delete
    setConversationToDelete(conversationId);
    setDeleteModalOpen(true);
  }

  async function confirmDeleteConversation() {
    if (!conversationToDelete) return;

    setDeleting(true);
    const conversationId = conversationToDelete;

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
        setDeleting(false);
        setDeleteModalOpen(false);
        return;
      }
    }

    // Remove from local state and handle active conversation
    setConversations((prev) => {
      const remaining = prev.filter((c: Conversation) => c.id !== conversationId);
      
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
    setDeleteModalOpen(false);
    setConversationToDelete(null);
    setDeleting(false);
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
        if (!activeId || !loadedConversations.find((c: Conversation) => c.id === activeId)) {
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

  // Check if conversation needs rating
  const checkConversationRating = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/rating`);
      if (!response.ok) return;
      
      const data = await response.json();
      
      // Only show prompt if not already rated
      if (!data.rated && active && active.id === conversationId && active.messages.length >= 2) {
        // Check if last message is from assistant (not loading)
        const lastMessage = active.messages[active.messages.length - 1];
        if (lastMessage.role === 'assistant' && lastMessage.content && !loading) {
          setShowRatingPrompt(true);
        }
      }
    } catch (error) {
      console.error('Error checking conversation rating:', error);
    }
  };

  // Submit rating and feedback
  const submitRating = async () => {
    if (!activeId || !selectedRating) return;
    
    setSubmittingRating(true);
    try {
      const response = await fetch(`/api/conversations/${activeId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: selectedRating,
          feedback: feedbackText.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit rating');
      }

      // Update local conversation state
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, rating: selectedRating, feedback: feedbackText.trim() || null }
            : c
        )
      );

      toast.success('Thank you for your feedback!');
      setShowRatingPrompt(false);
      setSelectedRating(null);
      setFeedbackText("");
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      toast.error(error.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Check rating status when active conversation or messages change
  useEffect(() => {
    if (!activeId || !active) {
      setShowRatingPrompt(false);
      return;
    }
    
    // Only check if conversation has messages and is not loading
    if (active.messages.length >= 2 && !loading) {
      checkConversationRating(activeId);
    } else {
      setShowRatingPrompt(false);
    }
  }, [activeId, active?.messages.length, loading]);

  function handlePromptClick(prompt: string) {
    setInput(prompt);
    // Optionally auto-send or just populate the input
    // For now, just populate so user can edit if needed
  }

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

          // Update conversation title if it's the first message - use AI to generate a memorable title
          if (active.messages.length === 0) {
            try {
              // Generate AI title
              const titleResponse = await fetch('/api/conversations/generate-title', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ firstMessage: text }),
              });

              let newTitle = text.slice(0, 40); // Fallback
              if (titleResponse.ok) {
                const titleData = await titleResponse.json();
                newTitle = titleData.title || text.slice(0, 40);
              }

              await fetch(`/api/conversations/${activeId}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ title: newTitle }),
              }).catch(err => console.error("Error updating title:", err));

              // Update local state with new title
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === activeId
                    ? { ...c, title: newTitle }
                    : c
                )
              );
            } catch (titleError) {
              console.error("Error generating title:", titleError);
              // Fallback to simple title
              const fallbackTitle = text.slice(0, 40);
              await fetch(`/api/conversations/${activeId}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ title: fallbackTitle }),
              }).catch(err => console.error("Error updating title:", err));
            }
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

    // Update local title temporarily (will be updated with AI title if first message)
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

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = "Failed to get response";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (!reader) {
        throw new Error("No response body");
      }

      // Read stream chunks
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              // Streaming complete, save to database
              if (conversationExists) {
                try {
                  const assistantMsgResponse = await fetch(`/api/conversations/${activeId}/messages`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      role: "assistant",
                      content: fullContent,
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
                                  ? { id: assistantMsgData.message.id, role: "assistant", content: fullContent }
                                  : m
                              ),
                            }
                          : c
                      )
                    );
                    // Check if we should show rating prompt (after a delay)
                    setTimeout(() => {
                      checkConversationRating(activeId);
                    }, 1000);
                  } else {
                    // Still update UI with local ID
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.id === activeId
                          ? {
                              ...c,
                              messages: c.messages.map((m) =>
                                m.id === assistantMessageId
                                  ? { ...m, content: fullContent }
                                  : m
                              ),
                            }
                          : c
                      )
                    );
                  }
                } catch (saveError) {
                  console.error("Error saving assistant message:", saveError);
                  // Still update UI
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.id === activeId
                        ? {
                            ...c,
                            messages: c.messages.map((m) =>
                              m.id === assistantMessageId
                                ? { ...m, content: fullContent }
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
                              ? { ...m, content: fullContent }
                              : m
                          ),
                        }
                      : c
                  )
                );
              }
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.content) {
                fullContent += parsed.content;
                // Update UI in real-time as content streams
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === activeId
                      ? {
                          ...c,
                          messages: c.messages.map((m) =>
                            m.id === assistantMessageId
                              ? { ...m, content: fullContent }
                              : m
                          ),
                        }
                      : c
                  )
                );
              }
            } catch (parseError) {
              // Skip invalid JSON lines
            }
          }
        }
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
                      onClick={(e) => openDeleteModal(c.id, e)}
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
                    className={`max-w-[85%] md:max-w-[70%] rounded-xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-[var(--brand-blue)] text-white whitespace-pre-wrap"
                        : "bg-white/5"
                    }`}
                  >
                    {m.content ? (
                      m.role === "assistant" ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              h1: ({node, ...props}: any) => <h1 className="text-lg font-semibold mt-2 mb-1 text-white" {...props} />,
                              h2: ({node, ...props}: any) => <h2 className="text-base font-semibold mt-2 mb-1 text-white" {...props} />,
                              h3: ({node, ...props}: any) => <h3 className="text-sm font-semibold mt-2 mb-1 text-white" {...props} />,
                              p: ({node, ...props}: any) => <p className="mb-2 leading-relaxed text-white/90" {...props} />,
                              strong: ({node, ...props}: any) => <strong className="font-semibold text-white" {...props} />,
                              em: ({node, ...props}: any) => <em className="italic text-white/90" {...props} />,
                              ul: ({node, ...props}: any) => <ul className="list-disc list-inside mb-2 space-y-1 text-white/90" {...props} />,
                              ol: ({node, ...props}: any) => <ol className="list-decimal list-inside mb-2 space-y-1 text-white/90" {...props} />,
                              li: ({node, ...props}: any) => <li className="ml-2" {...props} />,
                              code: ({node, ...props}: any) => <code className="bg-white/10 px-1 py-0.5 rounded text-xs text-white" {...props} />,
                              pre: ({node, ...props}: any) => <pre className="bg-white/10 p-2 rounded mb-2 overflow-x-auto text-white/90" {...props} />,
                            }}
                          >
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        m.content
                      )
                    ) : (
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
              
              {/* Rating Prompt */}
              {showRatingPrompt && active && (
                <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Rate this conversation</h3>
                    <button
                      onClick={() => setShowRatingPrompt(false)}
                      className="text-white/60 hover:text-white text-sm"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mb-3">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setSelectedRating(star)}
                          className={`text-2xl transition-colors ${
                            selectedRating && star <= selectedRating
                              ? 'text-yellow-400'
                              : 'text-white/30 hover:text-white/50'
                          }`}
                          disabled={submittingRating}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Optional: Share your feedback..."
                    className="w-full rounded-lg bg-[#0f1218] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20 mb-3 resize-none"
                    rows={3}
                    disabled={submittingRating}
                    maxLength={1000}
                  />
                  <button
                    onClick={submitRating}
                    disabled={!selectedRating || submittingRating}
                    className="w-full px-4 py-2 text-sm font-medium rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "var(--brand-blue)" }}
                  >
                    {submittingRating ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <div className="border-t border-white/10 p-3 flex-shrink-0">
          {/* Prompt Templates - Show when conversation is empty or input is empty */}
          {active && active.messages.length === 0 && !input.trim() && (
            <div className="mb-3 flex flex-wrap gap-2">
              {promptTemplates.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePromptClick(prompt)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
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

      {/* Delete Confirmation Modal */}
      {mounted && (
        <Dialog.Root open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded-xl bg-white dark:bg-[#11161d] p-6 shadow-xl z-50 border border-gray-200 dark:border-white/10">
            <Dialog.Title className="text-lg font-semibold text-black dark:text-white mb-2">
              Delete Conversation
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently deleted.
            </Dialog.Description>
            <div className="flex gap-3 justify-end">
              <Dialog.Close asChild>
                <button
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0f1218] text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={confirmDeleteConversation}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      )}
    </div>
  );
}


