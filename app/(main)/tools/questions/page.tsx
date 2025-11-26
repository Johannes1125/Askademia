// Survey/Interview Questions Generator Tool Page
"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { CopyIcon, CheckIcon, ReloadIcon, BookmarkIcon, Cross2Icon } from "@radix-ui/react-icons";

type QuestionType = 'survey' | 'interview';
type SectionType = 'notes' | 'drafts' | 'references';
type Workspace = { id: string; name: string };

export default function QuestionsGeneratorPage() {
  const [researchObjectives, setResearchObjectives] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>('survey');
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [questions, setQuestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [selectedSection, setSelectedSection] = useState<SectionType>("notes");
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  const handleGenerate = async () => {
    if (!researchObjectives.trim()) {
      toast.error("Please enter your research objectives");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/questions/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          researchObjectives,
          questionType,
          numberOfQuestions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate questions");
      }

      setQuestions(data.questions || []);
      toast.success(`Generated ${data.questions?.length || 0} questions successfully!`);
    } catch (error: any) {
      console.error("Error generating questions:", error);
      toast.error(error.message || "Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!researchObjectives.trim()) {
      toast.error("Please enter your research objectives");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/questions/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          researchObjectives,
          questionType,
          numberOfQuestions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to regenerate questions");
      }

      setQuestions(data.questions || []);
      toast.success(`Regenerated ${data.questions?.length || 0} questions successfully!`);
    } catch (error: any) {
      console.error("Error regenerating questions:", error);
      toast.error(error.message || "Failed to regenerate questions");
    } finally {
      setGenerating(false);
    }
  };

  const copyQuestion = async (question: string, index: number) => {
    try {
      await navigator.clipboard.writeText(question);
      setCopiedIndex(index);
      toast.success("Question copied!");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      toast.error("Failed to copy question");
    }
  };

  const copyAllQuestions = async () => {
    if (questions.length === 0) {
      toast.error("No questions to copy");
      return;
    }

    try {
      const allQuestions = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
      await navigator.clipboard.writeText(allQuestions);
      toast.success("All questions copied!");
    } catch (err) {
      toast.error("Failed to copy questions");
    }
  };

  // Load workspaces when modal opens
  useEffect(() => {
    if (showSaveModal) {
      loadWorkspaces();
    }
  }, [showSaveModal]);

  const loadWorkspaces = async () => {
    setLoadingWorkspaces(true);
    try {
      const res = await fetch("/api/workspace");
      const data = await res.json();
      if (res.ok && data.workspaces) {
        setWorkspaces(data.workspaces);
        if (data.workspaces.length > 0) {
          setSelectedWorkspace(data.workspaces[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  const openSaveModal = () => {
    if (questions.length === 0) {
      toast.error("No questions to save");
      return;
    }
    setShowSaveModal(true);
  };

  const handleSaveToWorkspace = async () => {
    if (!selectedWorkspace) {
      toast.error("Please select a workspace");
      return;
    }

    setSaving(true);
    try {
      const content = `Research Objectives:\n${researchObjectives}\n\nGenerated Questions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}`;
      
      const addRes = await fetch(`/api/workspace/${selectedWorkspace}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: selectedSection,
          title: `${questionType === 'survey' ? 'Survey' : 'Interview'} Questions - ${new Date().toLocaleDateString()}`,
          content,
          tags: [questionType, "questions"],
        }),
      });

      if (!addRes.ok) {
        const data = await addRes.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success("Saved to workspace!");
      setShowSaveModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save to workspace");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="card p-6 bg-card border-theme text-foreground">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Research Objectives</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Question Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setQuestionType('survey')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    questionType === 'survey'
                      ? 'bg-[var(--brand-blue)] text-white'
                      : 'bg-subtle-bg text-foreground hover:bg-white/10'
                  }`}
                >
                  Survey Questions
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionType('interview')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    questionType === 'interview'
                      ? 'bg-[var(--brand-blue)] text-white'
                      : 'bg-subtle-bg text-foreground hover:bg-white/10'
                  }`}
                >
                  Interview Questions
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Number of Questions
              </label>
              <input
                type="number"
                min="5"
                max="30"
                value={numberOfQuestions}
                onChange={(e) => setNumberOfQuestions(parseInt(e.target.value) || 10)}
                className="w-full px-4 py-2 rounded-lg bg-input-bg border border-theme text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Research Objectives <span className="text-red-400">*</span>
              </label>
              <textarea
                value={researchObjectives}
                onChange={(e) => setResearchObjectives(e.target.value)}
                placeholder="Describe your research objectives, research questions, or what you want to learn from participants..."
                rows={8}
                className="w-full px-4 py-3 rounded-lg bg-input-bg border border-theme text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] resize-none"
              />
              <p className="text-xs text-muted mt-2">
                Be specific about your research goals to get better-aligned questions
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !researchObjectives.trim()}
              className="w-full px-4 py-3 rounded-lg bg-[var(--brand-blue)] text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating Questions...
                </>
              ) : (
                "Generate Questions"
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="card p-6 bg-card border-theme text-foreground flex flex-col max-h-[600px]">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="text-xl font-semibold text-foreground">
              Generated Questions {questions.length > 0 && `(${questions.length})`}
            </h2>
            {questions.length > 0 && (
              <div className="flex gap-1.5">
                <button
                  onClick={handleRegenerate}
                  disabled={generating}
                  className="p-2 rounded-lg border border-theme hover:bg-subtle-bg text-foreground transition-colors disabled:opacity-50"
                  title="Regenerate questions"
                >
                  <ReloadIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={copyAllQuestions}
                  className="p-2 rounded-lg border border-theme hover:bg-subtle-bg text-foreground transition-colors"
                  title="Copy all questions"
                >
                  <CopyIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={openSaveModal}
                  disabled={saving}
                  className="p-2 rounded-lg border border-theme hover:bg-subtle-bg text-foreground transition-colors disabled:opacity-50"
                  title="Save to workspace"
                >
                  <BookmarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-2">
            {questions.length === 0 ? (
              <div className="h-full grid place-items-center text-center text-muted py-12">
                <div>
                  <p className="mb-2">No questions generated yet</p>
                  <p className="text-xs">Enter your research objectives and click "Generate Questions"</p>
                </div>
              </div>
            ) : (
              questions.map((question, index) => (
                <div
                  key={index}
                  className="p-4 bg-subtle-bg border border-theme rounded-lg group relative"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] font-semibold text-sm flex items-center justify-center">
                      {index + 1}
                    </span>
                    <p className="flex-1 text-sm text-foreground leading-relaxed">{question}</p>
                    <button
                      onClick={() => copyQuestion(question, index)}
                      className="flex-shrink-0 p-1.5 rounded hover:bg-black/5 transition-colors text-muted hover:text-foreground opacity-0 group-hover:opacity-100"
                      title="Copy question"
                    >
                      {copiedIndex === index ? (
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Save to Workspace Modal */}
      {showSaveModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowSaveModal(false)}
        >
          <div 
            className="bg-card border border-theme rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--brand-blue)]/15 flex items-center justify-center">
                  <BookmarkIcon className="h-4 w-4 text-[var(--brand-blue)]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Save to Workspace</h3>
                  <p className="text-[11px] text-muted">Choose where to save your questions</p>
                </div>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1.5 rounded-lg hover:bg-subtle-bg text-muted hover:text-foreground transition-all"
              >
                <Cross2Icon className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                  <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Workspace
                </label>
                {loadingWorkspaces ? (
                  <div className="w-full px-3 py-2.5 rounded-lg bg-input-bg border border-theme text-muted text-sm flex items-center gap-2">
                    <div className="h-3.5 w-3.5 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                    Loading workspaces...
                  </div>
                ) : workspaces.length === 0 ? (
                  <div className="w-full px-3 py-2.5 rounded-lg bg-subtle-bg border border-theme text-muted text-xs flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    No workspaces found. Create one first.
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedWorkspace}
                      onChange={(e) => setSelectedWorkspace(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-lg bg-input-bg border border-theme text-foreground focus:outline-none focus:border-[var(--brand-blue)] cursor-pointer appearance-none transition-colors"
                    >
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                  <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Section
                </label>
                <div className="relative">
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value as SectionType)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg bg-input-bg border border-theme text-foreground focus:outline-none focus:border-[var(--brand-blue)] cursor-pointer appearance-none transition-colors"
                  >
                    <option value="notes">📝 Notes</option>
                    <option value="drafts">📄 Drafts</option>
                    <option value="references">📚 References</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 rounded-lg bg-subtle-bg border border-theme">
                <p className="text-[10px] text-muted mb-0.5">Saving {questions.length} questions as:</p>
                <p className="text-xs text-foreground font-medium truncate">
                  {questionType === 'survey' ? 'Survey' : 'Interview'} Questions - {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 justify-end px-5 py-3 border-t border-theme bg-subtle-bg/50 rounded-b-2xl">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-theme bg-card text-foreground hover:bg-input-bg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToWorkspace}
                disabled={saving || !selectedWorkspace || workspaces.length === 0}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--brand-blue)] text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-3 w-3" />
                    Save & Edit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

