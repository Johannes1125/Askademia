// Survey/Interview Questions Generator Tool Page
"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { CopyIcon, CheckIcon, ReloadIcon, BookmarkIcon, Cross2Icon, FileTextIcon, ChatBubbleIcon, LightningBoltIcon } from "@radix-ui/react-icons";

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researchObjectives, questionType, numberOfQuestions }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate questions");

      setQuestions(data.questions || []);
      toast.success(`Generated ${data.questions?.length || 0} questions!`);
    } catch (error: any) {
      console.error("Error generating questions:", error);
      toast.error(error.message || "Failed to generate questions");
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

  useEffect(() => {
    if (showSaveModal) loadWorkspaces();
  }, [showSaveModal]);

  const loadWorkspaces = async () => {
    setLoadingWorkspaces(true);
    try {
      const res = await fetch("/api/workspace");
      const data = await res.json();
      if (res.ok && data.workspaces) {
        setWorkspaces(data.workspaces);
        if (data.workspaces.length > 0) setSelectedWorkspace(data.workspaces[0].id);
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
    <div className="h-full grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
      {/* Left Panel - Input Form */}
      <div className="bg-card border border-theme rounded-2xl p-6 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <LightningBoltIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Question Generator</h2>
            <p className="text-xs text-muted">AI-powered research questions</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5">
          {/* Question Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">Question Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setQuestionType('survey')}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  questionType === 'survey'
                    ? 'bg-gradient-to-r from-[var(--brand-blue)] to-indigo-600 text-white shadow-lg shadow-[var(--brand-blue)]/25'
                    : 'bg-subtle-bg text-muted hover:text-foreground border border-theme'
                }`}
              >
                <FileTextIcon className="h-4 w-4" />
                Survey
              </button>
              <button
                type="button"
                onClick={() => setQuestionType('interview')}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  questionType === 'interview'
                    ? 'bg-gradient-to-r from-[var(--brand-blue)] to-indigo-600 text-white shadow-lg shadow-[var(--brand-blue)]/25'
                    : 'bg-subtle-bg text-muted hover:text-foreground border border-theme'
                }`}
              >
                <ChatBubbleIcon className="h-4 w-4" />
                Interview
              </button>
            </div>
          </div>

          {/* Number of Questions */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Number of Questions
            </label>
            <div className="relative">
              <input
                type="number"
                min="5"
                max="30"
                value={numberOfQuestions}
                onChange={(e) => setNumberOfQuestions(parseInt(e.target.value) || 10)}
                className="w-full px-4 py-3 rounded-xl bg-input-bg border border-theme text-foreground focus:outline-none focus:border-[var(--brand-blue)] transition-colors"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                5-30
              </div>
            </div>
          </div>

          {/* Research Objectives */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-2">
              Research Objectives <span className="text-red-400">*</span>
            </label>
            <textarea
              value={researchObjectives}
              onChange={(e) => setResearchObjectives(e.target.value)}
              placeholder="Describe your research objectives, research questions, or what you want to learn from participants..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-input-bg border border-theme text-foreground placeholder-muted focus:outline-none focus:border-[var(--brand-blue)] resize-none transition-colors"
            />
            <p className="text-xs text-muted mt-2 flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Be specific for better-aligned questions
            </p>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !researchObjectives.trim()}
          className="mt-6 w-full px-5 py-3.5 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}
        >
          {generating ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <LightningBoltIcon className="h-4 w-4" />
              Generate Questions
            </>
          )}
        </button>
      </div>

      {/* Right Panel - Results */}
      <div className="bg-card border border-theme rounded-2xl flex flex-col overflow-hidden max-h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-subtle-bg/30">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">Generated Questions</h2>
            {questions.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                {questions.length}
              </span>
            )}
          </div>
          {questions.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="p-2.5 rounded-xl border border-theme bg-card hover:bg-subtle-bg text-foreground transition-all disabled:opacity-50"
                title="Regenerate"
              >
                <ReloadIcon className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={copyAllQuestions}
                className="p-2.5 rounded-xl border border-theme bg-card hover:bg-subtle-bg text-foreground transition-all"
                title="Copy all"
              >
                <CopyIcon className="h-4 w-4" />
              </button>
              <button
                onClick={openSaveModal}
                disabled={saving}
                className="p-2.5 rounded-xl border border-theme bg-card hover:bg-subtle-bg text-foreground transition-all disabled:opacity-50"
                title="Save to workspace"
              >
                <BookmarkIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto p-4">
          {questions.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-xs">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-dashed border-purple-500/30 flex items-center justify-center mx-auto mb-4">
                  <FileTextIcon className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="font-medium text-foreground mb-1">No questions yet</h3>
                <p className="text-sm text-muted">Enter your research objectives and click Generate</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((question, index) => (
                <div
                  key={index}
                  className="group p-4 bg-subtle-bg/50 hover:bg-subtle-bg border border-theme hover:border-purple-500/30 rounded-xl transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold text-xs flex items-center justify-center shadow-lg shadow-purple-500/25">
                      {index + 1}
                    </span>
                    <p className="flex-1 text-sm text-foreground leading-relaxed pt-0.5">{question}</p>
                    <button
                      onClick={() => copyQuestion(question, index)}
                      className="flex-shrink-0 p-2 rounded-lg hover:bg-card transition-colors text-muted hover:text-foreground opacity-0 group-hover:opacity-100"
                      title="Copy"
                    >
                      {copiedIndex === index ? (
                        <CheckIcon className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <BookmarkIcon className="h-4 w-4 text-white" />
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
                <label className="block text-sm font-medium text-foreground mb-2">Workspace</label>
                {loadingWorkspaces ? (
                  <div className="w-full px-4 py-3 rounded-xl bg-input-bg border border-theme text-muted text-sm flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                ) : workspaces.length === 0 ? (
                  <div className="w-full px-4 py-3 rounded-xl bg-subtle-bg border border-theme text-muted text-sm">
                    No workspaces found. Create one first.
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedWorkspace}
                      onChange={(e) => setSelectedWorkspace(e.target.value)}
                      className="w-full px-4 py-3 text-sm rounded-xl bg-input-bg border border-theme text-foreground focus:outline-none focus:border-purple-500 cursor-pointer appearance-none transition-colors"
                    >
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>{ws.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Section</label>
                <div className="relative">
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value as SectionType)}
                    className="w-full px-4 py-3 text-sm rounded-xl bg-input-bg border border-theme text-foreground focus:outline-none focus:border-purple-500 cursor-pointer appearance-none transition-colors"
                  >
                    <option value="notes">📝 Notes</option>
                    <option value="drafts">📄 Drafts</option>
                    <option value="references">📚 References</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                <p className="text-xs text-muted mb-1">Saving {questions.length} questions as:</p>
                <p className="text-sm text-foreground font-medium">
                  {questionType === 'survey' ? 'Survey' : 'Interview'} Questions - {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 justify-end px-5 py-4 border-t border-theme bg-subtle-bg/50 rounded-b-2xl">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-theme bg-card text-foreground hover:bg-input-bg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToWorkspace}
                disabled={saving || !selectedWorkspace || workspaces.length === 0}
                className="px-5 py-2.5 text-sm font-medium rounded-xl text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-purple-500/25"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Save
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
