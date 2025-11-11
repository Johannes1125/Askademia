// Survey/Interview Questions Generator Tool Page
"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { CopyIcon, CheckIcon, ReloadIcon } from "@radix-ui/react-icons";

type QuestionType = 'survey' | 'interview';

export default function QuestionsGeneratorPage() {
  const [researchObjectives, setResearchObjectives] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>('survey');
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [questions, setQuestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Survey & Interview Questions Generator</h1>
        <p className="text-sm text-muted">
          Generate research-aligned survey or interview questions based on your research objectives
        </p>
      </div>

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
        <div className="card p-6 bg-card border-theme text-foreground flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              Generated Questions {questions.length > 0 && `(${questions.length})`}
            </h2>
            {questions.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={generating}
                  className="px-3 py-1.5 text-sm rounded-lg border border-theme hover:bg-subtle-bg text-foreground flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Regenerate questions"
                >
                  <ReloadIcon className="h-4 w-4" />
                  Regenerate
                </button>
                <button
                  onClick={copyAllQuestions}
                  className="px-3 py-1.5 text-sm rounded-lg border border-theme hover:bg-subtle-bg text-foreground flex items-center gap-1.5 transition-colors"
                  title="Copy all questions"
                >
                  <CopyIcon className="h-4 w-4" />
                  Copy All
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
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
    </div>
  );
}

