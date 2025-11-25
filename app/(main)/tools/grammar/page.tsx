// Grammar & Plagiarism Tool Page
"use client";

import { useState, useEffect, ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "react-toastify";

type GrammarIssue = {
  type: string;
  message: string;
  severity: string;
};

type GrammarResult = {
  score: number;
  issues: GrammarIssue[];
  suggestions: string[];
  summary: string;
};

type PlagiarismMatch = {
  id: string;
  sourceId: string;
  sourceTitle: string;
  sourceUrl: string;
  snippet: string;
  matchedText: string;
  start: number;
  end: number;
  overlapRatio: number;
};

type PlagiarismSourceSummary = {
  id: string;
  title: string;
  url: string;
  matchCount: number;
  totalOverlap: number;
};

type PlagiarismResult = {
  similarity: number;
  risk: string;
  recommendations: string[];
  summary: string;
  matches?: PlagiarismMatch[];
  sources?: PlagiarismSourceSummary[];
};

export default function GrammarPlagiarismPage() {
  const [text, setText] = useState("");
  const [grammarScore, setGrammarScore] = useState<number | null>(null);
  const [plagiarismScore, setPlagiarismScore] = useState<number | null>(null);
  const [issues, setIssues] = useState<GrammarIssue[]>([]);
  const [checkingGrammar, setCheckingGrammar] = useState(false);
  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
  const [grammarResult, setGrammarResult] = useState<GrammarResult | null>(null);
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null);
  const [plagiarismMatches, setPlagiarismMatches] = useState<PlagiarismMatch[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure Dialog only renders on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCheckGrammar = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to check");
      return;
    }

    setCheckingGrammar(true);
    try {
      const response = await fetch("/api/grammar/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check grammar");
      }

      setGrammarResult(data);
      setGrammarScore(data.score);
      setIssues(data.issues || []);
      toast.success("Grammar check completed");
    } catch (error: any) {
      console.error("Error checking grammar:", error);
      toast.error(error.message || "Failed to check grammar");
    } finally {
      setCheckingGrammar(false);
    }
  };

  const handleCheckPlagiarism = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to check");
      return;
    }

    setCheckingPlagiarism(true);
    try {
      const response = await fetch("/api/plagiarism/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check plagiarism");
      }

      setPlagiarismResult(data);
      setPlagiarismMatches(data.matches || []);
      // Calculate plagiarism score (100 - similarity, so lower similarity = higher score)
      const score = Math.max(0, 100 - data.similarity);
      setPlagiarismScore(score);
      toast.success("Plagiarism check completed");
    } catch (error: any) {
      console.error("Error checking plagiarism:", error);
      toast.error(error.message || "Failed to check plagiarism");
    } finally {
      setCheckingPlagiarism(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500/20 text-emerald-300 border-emerald-400/30";
    if (score >= 60) return "bg-yellow-500/20 text-yellow-300 border-yellow-400/30";
    return "bg-red-500/20 text-red-300 border-red-400/30";
  };

  const getPlagiarismScoreColor = (score: number) => {
    // For plagiarism, higher score (lower similarity) is better
    if (score >= 90) return "bg-emerald-500/20 text-emerald-300 border-emerald-400/30";
    if (score >= 70) return "bg-yellow-500/20 text-yellow-300 border-yellow-400/30";
    return "bg-red-500/20 text-red-300 border-red-400/30";
  };

  const renderHighlightedText = () => {
    if (!text.trim()) {
      return <span className="text-muted">Type or paste text to see highlighted overlaps.</span>;
    }
    if (plagiarismMatches.length === 0) {
      return <span className="text-muted">No overlapping passages detected yet.</span>;
    }
    const ordered = [...plagiarismMatches].sort((a, b) => a.start - b.start);
    const nodes: ReactNode[] = [];
    let cursor = 0;
    ordered.forEach((match) => {
      if (match.start > cursor) {
        nodes.push(
          <span key={`plain-${cursor}`} className="text-foreground">
            {text.slice(cursor, match.start)}
          </span>
        );
      }
      nodes.push(
        <span
          key={`match-${match.id}`}
          className="bg-red-500/30 text-foreground rounded px-1 py-0.5 inline-flex flex-wrap gap-1 items-baseline"
        >
          <span>{text.slice(match.start, match.end)}</span>
          <span className="text-[10px] uppercase tracking-wide text-red-100">
            {match.sourceTitle}
          </span>
        </span>
      );
      cursor = match.end;
    });
    if (cursor < text.length) {
      nodes.push(
        <span key={`tail-${cursor}`} className="text-foreground">
          {text.slice(cursor)}
        </span>
      );
    }
    return nodes;
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* Left: sidebar-like panel */}
      <aside className="card bg-[#11161d] border-white/10 text-foreground p-4 space-y-4">
        <div>
          <div className="text-xs text-muted mb-1">Grammar Score</div>
          <div className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium border ${
            grammarScore !== null ? getScoreColor(grammarScore) : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
          }`}>
            {grammarScore !== null ? `${grammarScore} / 100` : "— / 100"}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted mb-1">Plagiarism Score</div>
          <div className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium border ${
            plagiarismScore !== null ? getPlagiarismScoreColor(plagiarismScore) : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
          }`}>
            {plagiarismScore !== null ? `${plagiarismScore} / 100` : "— / 100"}
          </div>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            className="w-full px-3 py-2 rounded-md text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ background: "var(--brand-blue)" }}
            onClick={handleCheckGrammar}
            disabled={checkingGrammar || !text.trim()}
          >
            {checkingGrammar ? "Checking..." : "Check Grammar"}
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ background: "var(--brand-yellow)", color: "#1f2937" }}
            onClick={handleCheckPlagiarism}
            disabled={checkingPlagiarism || !text.trim()}
          >
            {checkingPlagiarism ? "Checking..." : "Check Plagiarism"}
          </button>
        </div>
        {plagiarismResult?.sources && plagiarismResult.sources.length > 0 && (
          <div>
            <div className="text-xs text-muted mb-1">Flagged Sources</div>
            <div className="space-y-2">
              {plagiarismResult.sources.map((source) => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-theme bg-card px-3 py-2 hover:border-[var(--brand-blue)] transition-colors"
                >
                  <div className="text-sm font-medium text-foreground">{source.title}</div>
                  <div className="text-[11px] text-muted truncate">{source.url}</div>
                  <div className="text-[11px] text-muted mt-1">
                    {source.matchCount} match{source.matchCount > 1 ? "es" : ""} •{" "}
                    {Math.round(source.totalOverlap)} chars overlap
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="text-xs text-muted mb-2">
            Issues {issues.length > 0 && `(${issues.length})`}
          </div>
          {issues.length > 0 ? (
            <ul className="text-sm space-y-1.5 mb-3">
              {issues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-muted mt-0.5">•</span>
                  <span className="text-foreground">{issue.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted mb-3">
              {grammarScore !== null ? "No issues found" : "No issues detected yet"}
            </div>
          )}
          {mounted ? (
            <Dialog.Root open={reportModalOpen} onOpenChange={setReportModalOpen}>
              <Dialog.Trigger asChild>
                <button className="w-full px-3 py-2 rounded-md border border-theme hover:bg-black/5 transition-colors text-sm text-foreground">
                  View Report
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
              <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-xl rounded-xl bg-card p-6 shadow-xl z-50 border border-theme text-foreground">
                <Dialog.Title className="text-lg font-semibold text-foreground mb-4">
                  Detailed Report
                </Dialog.Title>
                <div className="space-y-4 text-sm">
                  {grammarResult && (
                    <div className="border-b border-theme pb-4">
                      <h3 className="font-semibold text-foreground mb-2">Grammar Check</h3>
                      <div className="space-y-1 text-foreground">
                        <div>Score: <span className="font-medium">{grammarResult.score} / 100</span></div>
                        {grammarResult.summary && (
                          <div className="mt-2 text-muted">{grammarResult.summary}</div>
                        )}
                        {grammarResult.suggestions && grammarResult.suggestions.length > 0 && (
                          <div className="mt-2">
                            <div className="font-medium mb-1">Suggestions:</div>
                            <ul className="list-disc list-inside space-y-1">
                              {grammarResult.suggestions.map((suggestion, idx) => (
                                <li key={idx}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {plagiarismResult && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Plagiarism Check</h3>
                      <div className="space-y-1 text-foreground">
                        <div>Similarity: <span className="font-medium">{plagiarismResult.similarity}%</span></div>
                        <div>Risk Level: <span className="font-medium capitalize">{plagiarismResult.risk}</span></div>
                        {plagiarismResult.summary && (
                          <div className="mt-2 text-muted">{plagiarismResult.summary}</div>
                        )}
                        {plagiarismResult.recommendations && plagiarismResult.recommendations.length > 0 && (
                          <div className="mt-2">
                            <div className="font-medium mb-1">Recommendations:</div>
                            <ul className="list-disc list-inside space-y-1">
                              {plagiarismResult.recommendations.map((rec, idx) => (
                                <li key={idx}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {!grammarResult && !plagiarismResult && (
                    <div className="text-muted">
                      Run grammar and plagiarism checks to see the full report.
                    </div>
                  )}
                </div>
                <div className="mt-6 text-right">
                  <Dialog.Close asChild>
                    <button className="px-4 py-2 rounded-lg border border-theme bg-card text-foreground hover:bg-white/5 transition-colors">
                      Close
                    </button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          ) : (
            <button 
              onClick={() => setReportModalOpen(true)}
              className="w-full px-3 py-2 rounded-md border border-black/10 hover:bg-black/5 transition-colors text-sm text-black"
            >
              View Report
            </button>
          )}
        </div>
      </aside>

      {/* Right: editor */}
      <div className="card bg-[#11161d] border-white/10 text-foreground p-4 flex flex-col">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 min-h-[400px] rounded-lg bg-[#0f1218] border border-black/10 p-3 text-sm resize-none outline-none focus:border-black/20 text-foreground placeholder:placeholder-muted"
          placeholder="Paste or type text to check..."
        />
        {plagiarismMatches.length > 0 && (
          <div className="mt-6">
            <div className="text-xs text-muted uppercase tracking-wide mb-2">Plagiarism highlights</div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {renderHighlightedText()}
            </div>
            <div className="mt-2 text-xs text-muted">
              Highlighted passages overlap with known sources. Rephrase or cite appropriately.
            </div>
          </div>
        )}
        <div className="mt-3 text-xs text-muted">Askademia can make mistakes. Verify important info.</div>
      </div>
    </div>
  );
}


