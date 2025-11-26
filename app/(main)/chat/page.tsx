// Chat Page
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "react-toastify";
import { PaperPlaneIcon, PlusIcon, TrashIcon, ReloadIcon, DownloadIcon, BookmarkIcon, ReaderIcon } from "@radix-ui/react-icons";
import ReactMarkdown from "react-markdown";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { WorkspaceQuickAddButton } from "@/components/workspace/QuickAdd";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Speech Recognition types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var webkitSpeechRecognition: {
  new (): SpeechRecognition;
};

declare var SpeechRecognition: {
  new (): SpeechRecognition;
};

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
  const [messageReactions, setMessageReactions] = useState<Record<string, "like" | "dislike">>({});
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const committedTextRef = useRef<string>("");

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

  useEffect(() => {
    if (!activeId || !UUID_REGEX.test(activeId)) {
      setMessageReactions({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/messages/feedback?conversationId=${activeId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load reactions');
        if (cancelled) return;
        const map: Record<string, "like" | "dislike"> = {};
        (data.feedback || []).forEach((fb: any) => {
          if (fb.message_id && (fb.reaction === 'like' || fb.reaction === 'dislike')) {
            map[fb.message_id] = fb.reaction;
          }
        });
        setMessageReactions(map);
      } catch (error) {
        console.error('Error loading message feedback', error);
      }
    })();
    return () => { cancelled = true; };
  }, [activeId]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect Opera browser
    const isOpera = (navigator.userAgent.includes('OPR') || navigator.userAgent.includes('Opera'));

    // Check browser support
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!SpeechRecognition) {
      setRecognitionError('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    // Warn Opera users about potential issues
    if (isOpera) {
      console.warn('Opera has limited Web Speech API support. Voice input may not work reliably.');
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onstart = () => {
      setIsListening(true);
      setRecognitionError(null);
    };

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Update transcript state for display (interim only for live feedback)
      setTranscript(interimTranscript);
      
      // Update input field - only add NEW final results to avoid duplicates
      if (finalTranscript) {
        // Append only the new final transcript to committed text
        committedTextRef.current = (committedTextRef.current + ' ' + finalTranscript.trim()).trim();
        setInput(committedTextRef.current + (interimTranscript ? ' ' + interimTranscript : ''));
      } else if (interimTranscript) {
        // Show committed text + current interim as preview
        setInput(committedTextRef.current + (interimTranscript ? ' ' + interimTranscript : ''));
      }
    };

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      let errorMessage = 'Speech recognition error';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your microphone.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      setRecognitionError(errorMessage);
      setIsRecording(false);
      recognitionInstance.stop();
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
      // Auto-restart if still in recording mode
      if (isRecording) {
        try {
          recognitionInstance.start();
        } catch (err) {
          // Already started or error
          setIsRecording(false);
        }
      }
    };

    setRecognition(recognitionInstance);

    // Cleanup
    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, []);

  // Handle recording state changes
  useEffect(() => {
    if (!recognition) return;

    if (isRecording) {
      try {
        recognition.start();
      } catch (err: any) {
        if (err.message?.includes('already started')) {
          // Already running, ignore
        } else {
          console.error('Error starting recognition:', err);
          setIsRecording(false);
          setRecognitionError('Failed to start voice recording');
        }
      }
    } else {
      recognition.stop();
      setTranscript("");
    }
  }, [isRecording, recognition]);

  function handlePromptClick(prompt: string) {
    setInput(prompt);
    // Optionally auto-send or just populate the input
    // For now, just populate so user can edit if needed
  }

  async function logExport(kind: 'citation' | 'chat', itemId: string | undefined, format: string) {
    try {
      await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, itemId, format, timestamp: new Date().toISOString() }),
      });
    } catch (err) {
      // non-blocking
      console.warn('Export log failed', err);
    }
  }

  // Strip markdown for plain text export
  function stripMarkdown(text: string): string {
    return text
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
      .trim();
  }

  // Parse markdown and return formatted paragraphs for DOCX
  function parseMarkdownForDocx(text: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const lines = text.split('\n');
    
    let currentParagraph: TextRun[] = [];
    
    for (const line of lines) {
      // Check for headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        // Save previous paragraph if exists
        if (currentParagraph.length > 0) {
          paragraphs.push(new Paragraph({
            children: currentParagraph,
            spacing: { after: 200 },
          }));
          currentParagraph = [];
        }
        
        const level = headerMatch[1].length;
        const headerText = headerMatch[2].trim();
        const headerSize = 32 - (level * 4); // H1=28, H2=24, H3=20, etc.
        
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: headerText, bold: true, size: headerSize })],
          spacing: { after: 200 },
        }));
        continue;
      }
      
      // Empty line = new paragraph
      if (!line.trim()) {
        if (currentParagraph.length > 0) {
          paragraphs.push(new Paragraph({
            children: currentParagraph,
            spacing: { after: 200 },
          }));
          currentParagraph = [];
        }
        continue;
      }
      
      // Parse inline formatting
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/);
      for (const part of parts) {
        if (!part) continue;
        
        if (part.startsWith('**') && part.endsWith('**')) {
          // Bold
          const text = part.slice(2, -2);
          currentParagraph.push(new TextRun({ text, bold: true, size: 20 }));
        } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
          // Italic
          const text = part.slice(1, -1);
          currentParagraph.push(new TextRun({ text, italics: true, size: 20 }));
        } else if (part.startsWith('`') && part.endsWith('`')) {
          // Code
          const text = part.slice(1, -1);
          currentParagraph.push(new TextRun({ text, font: 'Courier New', size: 18 }));
        } else {
          // Regular text
          currentParagraph.push(new TextRun({ text: part, size: 20 }));
        }
      }
      
      // Add line break if not last line
      currentParagraph.push(new TextRun({ text: ' ', size: 20 }));
    }
    
    // Add remaining paragraph
    if (currentParagraph.length > 0) {
      paragraphs.push(new Paragraph({
        children: currentParagraph,
        spacing: { after: 200 },
      }));
    }
    
    return paragraphs;
  }

  function formatConversationForExport(): string {
    if (!active) return '';
    
    let formatted = `Conversation: ${active.title || 'Untitled Conversation'}\n\n`;
    active.messages.forEach((message) => {
      const role = message.role === 'user' ? 'You' : 'Askademia';
      const content = stripMarkdown(message.content);
      formatted += `${role}:\n${content}\n\n`;
    });
    return formatted;
  }

  async function exportConversationPdf(useAI: boolean = false) {
    if (!active || active.messages.length === 0) {
      toast.error('No conversation to export');
      return;
    }

    try {
      let content = formatConversationForExport();
      
      // Use AI to format if requested
      if (useAI) {
        toast.info('Formatting with AI...');
        try {
          const response = await fetch('/api/export/format', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, type: 'conversation', format: 'pdf' }),
          });
          
          if (!response.ok) {
            throw new Error('AI formatting failed');
          }
          
          const data = await response.json();
          content = data.formattedContent;
        } catch (err) {
          console.error('AI formatting error:', err);
          toast.warning('AI formatting failed, using standard export');
        }
      }

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;
      const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 60;

      // Title
      doc.setFontSize(18);
      doc.text(active.title || 'Conversation Export', margin, yPos);
      yPos += 30;

      // Parse markdown if AI-enhanced, otherwise use plain text
      if (useAI) {
        // Process line by line to handle headers and formatting
        const lines = content.split('\n');
        
        for (const line of lines) {
          if (yPos > pageHeight - 100) {
            doc.addPage();
            yPos = 60;
          }
          
          // Check for headers
          const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
          if (headerMatch) {
            const level = headerMatch[1].length;
            const headerText = headerMatch[2].trim();
            const fontSize = 18 - (level * 2);
            
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', 'bold');
            const headerLines = doc.splitTextToSize(headerText, pageWidth);
            doc.text(headerLines, margin, yPos);
            yPos += headerLines.length * (fontSize + 2) + 10;
            continue;
          }
          
          // Process regular line with inline formatting
          // For PDF, we'll strip markdown but keep structure
          let processedLine = line
            .replace(/\*\*(.*?)\*\*/g, '$1') // Bold - keep text
            .replace(/\*(.*?)\*/g, '$1') // Italic - keep text
            .replace(/`(.*?)`/g, '$1'); // Code - keep text
          
          if (processedLine.trim()) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const textLines = doc.splitTextToSize(processedLine, pageWidth);
            doc.text(textLines, margin, yPos);
            yPos += textLines.length * 12 + 5;
          } else {
            // Empty line
            yPos += 8;
          }
        }
      } else {
        // Standard export - plain text
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(content, pageWidth);
        let currentLine = 0;
        
        while (currentLine < lines.length) {
          if (yPos > pageHeight - 100) {
            doc.addPage();
            yPos = 60;
          }
          
          const linesToFit = Math.floor((pageHeight - yPos - 100) / 12);
          const linesForThisPage = lines.slice(currentLine, currentLine + linesToFit);
          doc.text(linesForThisPage, margin, yPos);
          yPos += linesForThisPage.length * 12 + 10;
          currentLine += linesToFit;
        }
      }

      const blob = doc.output('blob');
      const safeName = (active.title || 'conversation').replace(/[^a-z0-9-_ ]/gi, '').slice(0, 100) || 'conversation';
      const suffix = useAI ? '-ai-enhanced' : '';
      saveAs(blob, `${safeName}${suffix}.pdf`);

      if (active.id) {
        await logExport('chat', active.id, useAI ? 'pdf-ai' : 'pdf');
      }
      toast.success(`Conversation exported as PDF${useAI ? ' (AI-enhanced)' : ''}`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    }
  }

  async function exportConversationDocx(useAI: boolean = false) {
    if (!active || active.messages.length === 0) {
      toast.error('No conversation to export');
      return;
    }

    try {
      let content = formatConversationForExport();
      
      // Use AI to format if requested
      if (useAI) {
        toast.info('Formatting with AI...');
        try {
          const response = await fetch('/api/export/format', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, type: 'conversation', format: 'docx' }),
          });
          
          if (!response.ok) {
            throw new Error('AI formatting failed');
          }
          
          const data = await response.json();
          content = data.formattedContent;
        } catch (err) {
          console.error('AI formatting error:', err);
          toast.warning('AI formatting failed, using standard export');
        }
      }

      // Parse markdown if AI-enhanced, otherwise use simple formatting
      let paragraphs: Paragraph[] = [
        new Paragraph({
          children: [new TextRun({ text: active.title || 'Conversation Export', bold: true, size: 32 })],
          spacing: { after: 300 },
        }),
      ];

      if (useAI) {
        // Use markdown parser
        const parsedParagraphs = parseMarkdownForDocx(content);
        paragraphs = paragraphs.concat(parsedParagraphs);
      } else {
        // Standard export - simple formatting
        const contentParagraphs = content.split(/\n\n+/).filter(p => p.trim());
        contentParagraphs.forEach((para) => {
          const trimmed = para.trim();
          if (!trimmed) return;
          
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: trimmed, size: 20 })],
              spacing: { after: 200 },
            })
          );
        });
      }

      const doc = new Document({
        sections: [
          {
            children: paragraphs,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const safeName = (active.title || 'conversation').replace(/[^a-z0-9-_ ]/gi, '').slice(0, 100) || 'conversation';
      const suffix = useAI ? '-ai-enhanced' : '';
      saveAs(blob, `${safeName}${suffix}.docx`);

      if (active.id) {
        await logExport('chat', active.id, useAI ? 'docx-ai' : 'docx');
      }
      toast.success(`Conversation exported as DOCX${useAI ? ' (AI-enhanced)' : ''}`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    }
  }

  const startRecording = () => {
    if (!recognition) {
      toast.error('Speech recognition not available. Please use Chrome or Edge.');
      return;
    }

    // Request microphone permission
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setIsRecording(true);
        setTranscript("");
        setRecognitionError(null);
        // Preserve existing input in the ref
        committedTextRef.current = input.trim();
      })
      .catch((err) => {
        console.error('Microphone permission denied:', err);
        toast.error('Microphone permission is required for voice input.');
        setRecognitionError('Microphone permission denied');
      });
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Don't clear the committed text ref - keep it so user can edit
    // Don't auto-send - just stop recording and keep text in input for editing
    setTranscript("");
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  async function sendMessage(customText?: string) {
    if (!active || !activeId) return;
    
    const text = (customText ?? input).trim();
    if (!text || loading) return;

    if (!customText) {
      setInput("");
    } else {
      setInput("");
    }
    setLoading(true);

    // Check if conversation exists in database (check if it's a valid UUID from database)
    // UUIDs are typically 36 characters with dashes: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const conversationExists = active.id && UUID_REGEX.test(active.id);
    
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

  const handleReaction = async (messageId: string, reaction: "like" | "dislike") => {
    if (!activeId) return;
    const previous = messageReactions[messageId];
    const nextReaction = previous === reaction ? undefined : reaction;
    setMessageReactions((prev) => {
      const updated = { ...prev };
      if (nextReaction) updated[messageId] = nextReaction; else delete updated[messageId];
      return updated;
    });
    try {
      const res = await fetch('/api/messages/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeId, messageId, reaction: nextReaction ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save reaction');
    } catch (error: any) {
      toast.error(error.message || 'Could not save reaction');
      setMessageReactions((prev) => {
        const updated = { ...prev };
        if (previous) updated[messageId] = previous; else delete updated[messageId];
        return updated;
      });
    }
  };

  const handleReprompt = (messageId: string) => {
    if (!active) return;
    const messageIndex = active.messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex <= 0) {
      toast.error('No previous prompt to reprompt');
      return;
    }
    const previousUserMessage = [...active.messages]
      .slice(0, messageIndex)
      .reverse()
      .find((msg) => msg.role === 'user');

    if (!previousUserMessage) {
      toast.error('No user prompt found for this response');
      return;
    }

    sendMessage(previousUserMessage.content);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-4rem)] overflow-hidden border border-theme rounded-xl bg-app shadow-xl backdrop-blur-sm">
      {/* Sidebar */}
      <aside className="w-64 bg-card/50 backdrop-blur-sm border-r border-theme flex flex-col overflow-hidden rounded-l-xl">
        <div className="p-4 border-b border-theme flex items-center gap-2 bg-card/80 backdrop-blur-sm">
          <button
            onClick={createConversation}
            className="flex-1 flex items-center gap-2 justify-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
            style={{ background: "var(--brand-yellow)", color: "#1f2937" }}
          >
            <PlusIcon /> New Chat
          </button>
          <button
            onClick={loadConversations}
            disabled={loadingConversations}
            className="p-2.5 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-foreground transition-all hover:scale-110 active:scale-95"
            title="Refresh conversations"
          >
            <ReloadIcon className={`h-4 w-4 ${loadingConversations ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingConversations ? (
            <div className="text-center text-muted text-sm py-4">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-muted text-sm py-4">
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
                  className={`group relative flex items-center rounded-lg transition-all ${
                    isActive 
                      ? "bg-[var(--brand-yellow)]/20 border border-[var(--brand-yellow)]/30 shadow-sm" 
                      : "hover:bg-white/5 border border-transparent hover:border-theme/50"
                  }`}
                >
                  <button
                    onClick={() => setActiveId(c.id)}
                    className="flex-1 text-left rounded-lg px-3 py-2.5 text-sm pr-8 truncate text-foreground transition-colors"
                  >
                    <div className="truncate">{c.title || "New Conversation"}</div>
                    {c.messages && c.messages.length > 0 && (
                      <div className="text-xs text-muted mt-0.5">
                        {c.messages.length} message{c.messages.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </button>
                  {isDatabaseConv && (
                    <button
                      onClick={(e) => openDeleteModal(c.id, e)}
                      className="absolute right-2 p-1.5 rounded hover:bg-red-500/20 text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
      </aside>

      {/* Messages Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-app/50 backdrop-blur-sm rounded-r-xl">
        {/* Header */}
        <div className="h-14 flex-shrink-0 border-b border-theme px-6 flex items-center justify-between text-foreground bg-card/50 backdrop-blur-sm">
          <span>
            {loadingConversations ? "Loading..." : (active ? (active.messages.length === 0 ? "New Conversation" : active.title) : "No conversation selected")}
          </span>
          {active && active.messages.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => exportConversationPdf(false)}
                className="px-3 py-1.5 text-sm rounded-lg border border-theme hover:bg-subtle-bg text-foreground flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                title="Export as PDF"
              >
                <DownloadIcon className="h-4 w-4" />
                PDF
              </button>
              <button
                onClick={() => exportConversationDocx(false)}
                className="px-3 py-1.5 text-sm rounded-lg border border-theme hover:bg-subtle-bg text-foreground flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                title="Export as DOCX"
              >
                <DownloadIcon className="h-4 w-4" />
                DOCX
              </button>
              <button
                onClick={() => exportConversationPdf(true)}
                className="px-3 py-1.5 text-sm rounded-lg border border-theme hover:bg-subtle-bg text-foreground flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 bg-[var(--brand-blue)]/10 hover:bg-[var(--brand-blue)]/20 shadow-sm hover:shadow-md"
                title="Export as PDF (AI-enhanced)"
              >
                <DownloadIcon className="h-4 w-4" />
                PDF AI
              </button>
              <button
                onClick={() => exportConversationDocx(true)}
                className="px-3 py-1.5 text-sm rounded-lg border border-theme hover:bg-subtle-bg text-foreground flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 bg-[var(--brand-blue)]/10 hover:bg-[var(--brand-blue)]/20 shadow-sm hover:shadow-md"
                title="Export as DOCX (AI-enhanced)"
              >
                <DownloadIcon className="h-4 w-4" />
                DOCX AI
              </button>
            </div>
          )}
        </div>

        {/* Messages Area - WITH SCROLLBAR */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 min-h-0"
        >
          {loadingConversations ? (
            <div className="h-full grid place-items-center text-center text-foreground">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-theme border-t-[var(--brand-blue)] rounded-full animate-spin"></div>
                <div className="text-sm text-muted">Loading conversations...</div>
              </div>
            </div>
          ) : !active ? (
            <div className="h-full grid place-items-center text-center text-foreground">
              <div className="max-w-md px-6">
                <div className="text-3xl font-bold mb-3 bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-yellow)] bg-clip-text text-transparent">
                  No Conversation Selected
                </div>
                <div className="text-sm text-muted">
                  Click "New Chat" to start a conversation
                </div>
              </div>
            </div>
          ) : active.messages.length === 0 ? (
            <div className="h-full grid place-items-center text-center text-foreground">
              <div className="max-w-md px-6">
                <div className="text-3xl font-bold mb-3 bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-yellow)] bg-clip-text text-transparent">
                  Start a Research Conversation
                </div>
                <div className="text-sm text-muted">
                  Ask me anything about research, citations, academic writing, or finding sources
                </div>
              </div>
            </div>
          ) : (
            <>
              {active.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} mb-5`}>
                  <div
                    className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-4 text-sm border-2 transition-all hover:shadow-lg ${
                      m.role === "user"
                        ? "bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-blue)]/90 text-white whitespace-pre-wrap border-white/40 shadow-lg shadow-blue-500/30"
                        : "bg-card text-foreground border-2 shadow-lg backdrop-blur-sm"
                    }`}
                    style={m.role === "assistant" ? { borderColor: "var(--border)" } : undefined}
                  >
                    {m.content ? (
                      m.role === "assistant" ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              h1: ({node, ...props}: any) => <h1 className="text-lg font-semibold mt-2 mb-1 text-foreground" {...props} />,
                              h2: ({node, ...props}: any) => <h2 className="text-base font-semibold mt-2 mb-1 text-foreground" {...props} />,
                              h3: ({node, ...props}: any) => <h3 className="text-sm font-semibold mt-2 mb-1 text-foreground" {...props} />,
                              p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 leading-relaxed text-foreground" {...props} />,
                              strong: ({node, ...props}: any) => <strong className="font-semibold text-foreground" {...props} />,
                              em: ({node, ...props}: any) => <em className="italic text-foreground" {...props} />,
                              ul: ({node, ...props}: any) => <ul className="list-disc list-inside mb-2 space-y-1.5 text-foreground ml-2" {...props} />,
                              ol: ({node, ...props}: any) => <ol className="list-decimal list-inside mb-2 space-y-1.5 text-foreground ml-2" {...props} />,
                              li: ({node, ...props}: any) => <li className="ml-1" {...props} />,
                              code: ({node, ...props}: any) => <code className="bg-white/10 dark:bg-black/20 px-1.5 py-0.5 rounded text-xs font-mono text-foreground" {...props} />,
                              pre: ({node, ...props}: any) => <pre className="bg-white/10 dark:bg-black/20 p-3 rounded-lg mb-2 overflow-x-auto text-foreground text-xs font-mono border border-theme" {...props} />,
                              blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-theme pl-4 italic my-2 text-muted" {...props} />,
                            }}
                          >
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-foreground leading-relaxed whitespace-pre-wrap">{m.content}</div>
                      )
                    ) : (
                      <div className="flex items-center gap-1.5 py-1">
                        <div className="h-2 w-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-2 w-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                    {m.role === "assistant" && m.content && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <button
                          onClick={() => handleReaction(m.id, "like")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full border border-theme transition-colors ${
                            messageReactions[m.id] === 'like' ? 'bg-[var(--brand-blue)]/15 text-[var(--brand-blue)] border-[var(--brand-blue)]/40' : 'text-muted hover:text-foreground'
                          }`}
                          title="Like response"
                        >
                          <span role="img" aria-label="Like">👍</span>
                          <span className="hidden sm:inline">Like</span>
                        </button>
                        <button
                          onClick={() => handleReaction(m.id, "dislike")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full border border-theme transition-colors ${
                            messageReactions[m.id] === 'dislike' ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'text-muted hover:text-foreground'
                          }`}
                          title="Dislike response"
                        >
                          <span role="img" aria-label="Dislike">👎</span>
                          <span className="hidden sm:inline">Dislike</span>
                        </button>
                        <button
                          onClick={() => handleReprompt(m.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-theme text-muted hover:text-foreground transition-colors"
                          title="Reprompt"
                        >
                          <ReloadIcon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Reprompt</span>
                        </button>
                        <WorkspaceQuickAddButton
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-theme text-muted hover:text-foreground transition-colors"
                          variant="fullpage"
                          derive={() => ({
                            title: `${active?.title || 'Chat'} response`,
                            content: m.content,
                            section: 'notes',
                          })}
                        >
                          <BookmarkIcon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Save</span>
                        </WorkspaceQuickAddButton>
                        <WorkspaceQuickAddButton
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-theme text-muted hover:text-foreground transition-colors"
                          variant="fullpage"
                          derive={() => ({
                            title: `${active?.title || 'Chat'} citation`,
                            content: m.content,
                            section: 'references',
                            tags: ['citation']
                          })}
                        >
                          <ReaderIcon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Save Citation</span>
                        </WorkspaceQuickAddButton>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
              
              {/* Rating Prompt */}
              {showRatingPrompt && active && (
                <div className="mt-4 p-4 rounded-lg bg-card border border-theme">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Rate this conversation</h3>
                    <button
                      onClick={() => setShowRatingPrompt(false)}
                      className="text-muted hover:text-foreground text-sm"
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
                              : 'text-muted hover:text-foreground'
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
                    className="w-full rounded-lg bg-input-bg border border-theme px-3 py-2 text-sm text-foreground placeholder-muted outline-none focus:border-primary mb-3 resize-none"
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

        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-theme p-4 bg-card/50 backdrop-blur-sm">
          {/* Prompt Templates - Show when conversation is empty or input is empty */}
          {active && active.messages.length === 0 && !input.trim() && (
            <div className="mb-4 flex flex-wrap gap-2">
              {promptTemplates.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePromptClick(prompt)}
                  className="px-4 py-2 rounded-xl bg-card border border-theme text-foreground hover:bg-white/10 hover:border-theme/80 transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-md text-sm font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Voice Recording Status */}
          {isRecording && (
            <div className="mb-3 p-3 rounded-lg bg-[var(--brand-blue)]/10 border border-[var(--brand-blue)]/30">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  {/* Pulsing recording indicator */}
                  <div className={`absolute h-3 w-3 rounded-full bg-red-500 ${isListening ? 'animate-pulse' : 'opacity-50'}`} />
                  <div className="absolute h-3 w-3 rounded-full bg-red-500/50 animate-ping" />
                  {/* Waveform animation */}
                  <div className="flex items-center gap-1 ml-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-[var(--brand-blue)] rounded-full waveform-bar"
                        style={{
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-[var(--brand-blue)] mb-1">
                    {isListening ? 'Listening...' : 'Processing...'}
                  </div>
                  {transcript && (
                    <div className="text-xs text-muted italic line-clamp-1">
                      "{transcript}"
                    </div>
                  )}
                </div>
                <button
                  onClick={stopRecording}
                  className="px-3 py-1 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Stop
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {recognitionError && !isRecording && (
            <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center justify-between">
                <p className="text-xs text-red-400">{recognitionError}</p>
                <button
                  onClick={() => setRecognitionError(null)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (isRecording) {
                    stopRecording();
                  } else {
                    sendMessage();
                  }
                }
              }}
              placeholder={isRecording ? "Speaking..." : "Ask about research, citations, grammar, or sources..."}
              className="flex-1 px-5 py-3.5 rounded-xl bg-input-bg border-2 border-theme text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/50 focus:border-[var(--brand-blue)] transition-all shadow-sm"
              disabled={loading || !active}
            />
            
            {/* Microphone Button */}
            <button
              type="button"
              onClick={toggleRecording}
              disabled={loading || !active || !recognition}
              className={`h-12 w-12 grid place-items-center rounded-xl transition-all hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/90'
              }`}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? (
                <div className="relative">
                  <div className="h-5 w-5 rounded-full bg-white" />
                  <div className="absolute inset-0 h-5 w-5 rounded-full bg-white animate-ping opacity-75" />
                </div>
              ) : (
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </button>

            {/* Send Button */}
            <button
              onClick={() => {
                if (isRecording) {
                  stopRecording();
                } else {
                  sendMessage();
                }
              }}
              className="h-12 w-12 grid place-items-center rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl"
              style={{ background: "var(--brand-yellow)", color: "#1f2937" }}
              disabled={(!input.trim() && !transcript.trim()) || loading || !active || isRecording}
              title="Send message"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-[#1f2937] border-t-transparent rounded-full animate-spin" />
              ) : (
                <PaperPlaneIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <div className="flex items-center gap-4">
              <span>Askademia can make mistakes. Verify important info.</span>
              {recognition && (
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" />
                    <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
                  </svg>
                  Voice input available
                </span>
              )}
            </div>
            {isRecording && (
              <span className="text-[var(--brand-blue)] font-medium">
                Click Stop to finish recording, then edit and send
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {mounted && (
        <Dialog.Root open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded-xl bg-white p-6 shadow-xl z-50 border border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-black mb-2">
              Delete Conversation
            </Dialog.Title>
            <Dialog.Description className="text-sm text-black mb-6">
              Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently deleted.
            </Dialog.Description>
            <div className="flex gap-3 justify-end">
              <Dialog.Close asChild>
                <button
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-black hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={confirmDeleteConversation}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium rounded-lg text-black transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700"
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


