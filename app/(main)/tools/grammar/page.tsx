// Grammar Tool Page
"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "react-toastify";
import { CheckCircledIcon, Cross2Icon, ExclamationTriangleIcon, InfoCircledIcon } from "@radix-ui/react-icons";

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

export default function GrammarPage() {
  const [text, setText] = useState("");
  const [grammarScore, setGrammarScore] = useState<number | null>(null);
  const [issues, setIssues] = useState<GrammarIssue[]>([]);
  const [checkingGrammar, setCheckingGrammar] = useState(false);
  const [grammarResult, setGrammarResult] = useState<GrammarResult | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
        headers: { "Content-Type": "application/json" },
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "from-emerald-500 to-emerald-600";
    if (score >= 60) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500/10 border-emerald-500/30";
    if (score >= 60) return "bg-yellow-500/10 border-yellow-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Great";
    if (score >= 70) return "Good";
    if (score >= 60) return "Fair";
    return "Needs Work";
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'error':
        return <Cross2Icon className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />;
      default:
        return <InfoCircledIcon className="h-4 w-4 text-blue-400" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className="h-full flex flex-col lg:flex-row gap-5">
      {/* Left Panel */}
      <aside className="lg:w-[320px] flex-shrink-0 space-y-5">
        {/* Score Card */}
        <div className="bg-card border border-theme rounded-2xl p-5 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--brand-blue)]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <h3 className="text-sm font-medium text-muted mb-4">Grammar Score</h3>
          
          <div className="flex items-center gap-4">
            <div className={`relative w-20 h-20 rounded-2xl border-2 flex items-center justify-center ${
              grammarScore !== null ? getScoreBg(grammarScore) : 'bg-subtle-bg border-theme'
            }`}>
              {grammarScore !== null ? (
                <div className="text-center">
                  <div className={`text-2xl font-bold bg-gradient-to-r ${getScoreColor(grammarScore)} bg-clip-text text-transparent`}>
                    {grammarScore}
                  </div>
                  <div className="text-[10px] text-muted">/ 100</div>
                </div>
              ) : (
                <div className="text-2xl font-bold text-muted">—</div>
              )}
            </div>
            
            <div className="flex-1">
              {grammarScore !== null ? (
                <>
                  <div className={`text-lg font-semibold bg-gradient-to-r ${getScoreColor(grammarScore)} bg-clip-text text-transparent`}>
                    {getScoreLabel(grammarScore)}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {issues.length === 0 ? "No issues found!" : `${issues.length} issue${issues.length > 1 ? 's' : ''} found`}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted">
                  Enter text and click check to get your score
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Check Button */}
        <button
          type="button"
          className="w-full px-5 py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[var(--brand-blue)]/25 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, var(--brand-blue), #4F46E5)" }}
          onClick={handleCheckGrammar}
          disabled={checkingGrammar || !text.trim()}
        >
          {checkingGrammar ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <CheckCircledIcon className="h-4 w-4" />
              Check Grammar
            </>
          )}
        </button>

        {/* Issues Section */}
        <div className="bg-card border border-theme rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted">Issues</h3>
            {issues.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                {issues.length}
              </span>
            )}
          </div>
          
          {issues.length > 0 ? (
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {issues.map((issue, idx) => (
                <div key={idx} className={`p-3 rounded-xl border ${getSeverityBg(issue.severity)}`}>
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed">{issue.message}</p>
                      <p className="text-xs text-muted mt-1.5 capitalize">{issue.type.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-subtle-bg border border-dashed border-theme flex items-center justify-center mx-auto mb-3">
                <CheckCircledIcon className="h-6 w-6 text-muted" />
              </div>
              <p className="text-sm text-muted">
                {grammarScore !== null ? "No issues found! 🎉" : "No issues detected yet"}
              </p>
            </div>
          )}
        </div>

        {/* View Report Button */}
        {mounted && (
          <Dialog.Root open={reportModalOpen} onOpenChange={setReportModalOpen}>
            <Dialog.Trigger asChild>
              <button className="w-full px-5 py-3 rounded-xl border border-theme bg-card hover:bg-subtle-bg transition-all text-sm font-medium text-foreground flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Full Report
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
              <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg rounded-2xl bg-card p-6 shadow-2xl z-50 border border-theme">
                <div className="flex items-center justify-between mb-5">
                  <Dialog.Title className="text-lg font-semibold text-foreground">
                    Grammar Report
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button className="p-1.5 rounded-lg hover:bg-subtle-bg text-muted hover:text-foreground transition-all">
                      <Cross2Icon className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                </div>
                
                {grammarResult ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-subtle-bg border border-theme">
                      <div className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center ${getScoreBg(grammarResult.score)}`}>
                        <span className={`text-2xl font-bold bg-gradient-to-r ${getScoreColor(grammarResult.score)} bg-clip-text text-transparent`}>
                          {grammarResult.score}
                        </span>
                      </div>
                      <div>
                        <div className={`text-lg font-semibold bg-gradient-to-r ${getScoreColor(grammarResult.score)} bg-clip-text text-transparent`}>
                          {getScoreLabel(grammarResult.score)}
                        </div>
                        <div className="text-sm text-muted">
                          {grammarResult.issues?.length || 0} issues • {wordCount} words
                        </div>
                      </div>
                    </div>
                    
                    {grammarResult.summary && (
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-2">Summary</h4>
                        <p className="text-sm text-muted p-3 rounded-xl bg-subtle-bg border border-theme">
                          {grammarResult.summary}
                        </p>
                      </div>
                    )}
                    
                    {grammarResult.suggestions && grammarResult.suggestions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-2">Suggestions</h4>
                        <div className="space-y-2">
                          {grammarResult.suggestions.map((suggestion, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-3 rounded-xl bg-[var(--brand-blue)]/10 border border-[var(--brand-blue)]/20">
                              <span className="text-[var(--brand-blue)]">💡</span>
                              <span className="text-sm text-foreground">{suggestion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-subtle-bg border border-dashed border-theme flex items-center justify-center mx-auto mb-4">
                      <CheckCircledIcon className="h-8 w-8 text-muted" />
                    </div>
                    <p className="text-muted">Run a grammar check to see the full report.</p>
                  </div>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </aside>

      {/* Right Panel - Editor */}
      <div className="flex-1 flex flex-col bg-card border border-theme rounded-2xl overflow-hidden">
        {/* Editor Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-theme bg-subtle-bg/50">
          <span className="text-sm font-medium text-foreground">Text Editor</span>
          <div className="flex items-center gap-4 text-xs text-muted">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
          </div>
        </div>
        
        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 min-h-[400px] p-5 text-sm resize-none outline-none bg-transparent text-foreground placeholder:text-muted leading-relaxed"
          placeholder="Paste or type your text here to check for grammar issues..."
        />
        
        {/* Footer */}
        <div className="px-5 py-3 border-t border-theme bg-subtle-bg/30">
          <p className="text-xs text-muted">
            💡 Tip: For best results, check paragraphs at a time rather than entire documents.
          </p>
        </div>
      </div>
    </div>
  );
}
