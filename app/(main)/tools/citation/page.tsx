// Citation Tool Page
"use client";

import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { CopyIcon, DownloadIcon } from "@radix-ui/react-icons";

type Citation = {
  id: string;
  title: string;
  authors: string;
  year: string;
  url: string;
  style: "APA" | "MLA" | "Chicago" | "Harvard" | "IEEE";
  formatted: string;
};

export default function CitationPage() {
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [year, setYear] = useState("");
  const [url, setUrl] = useState("");
  const [style, setStyle] = useState<Citation["style"]>("APA");
  const [citations, setCitations] = useState<Citation[]>([]);

  const isDisabled = useMemo(() => !title || !authors || !year, [title, authors, year]);

  function formatCitation(): string {
    const authorsDisplay = authors.trim();
    const y = year || "n.d.";
    const base = `${authorsDisplay}. (${y}). ${title}.`;
    switch (style) {
      case "MLA":
        return `${authorsDisplay}. "${title}." ${y}. ${url ? url : ""}`.trim();
      case "Chicago":
        return `${authorsDisplay}. ${y}. ${title}. ${url ? url : ""}`.trim();
      case "Harvard":
        return `${authorsDisplay} (${y}) ${title}. ${url ? url : ""}`.trim();
      case "IEEE":
        return `${authorsDisplay}, "${title}," ${y}. ${url ? url : ""}`.trim();
      default:
        return `${base} ${url ? url : ""}`.trim();
    }
  }

  function addCitation() {
    if (isDisabled) {
      toast.error("Please complete Title, Authors, and Year");
      return;
    }
    const item: Citation = {
      id: crypto.randomUUID(),
      title,
      authors,
      year,
      url,
      style,
      formatted: formatCitation(),
    };
    setCitations((prev) => [item, ...prev]);
    toast.success("Citation added");
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.info("Copied");
  }

  function exportTxt(text: string, name = "citation.txt") {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
      <div className="card bg-white dark:bg-[#11161d] border-black/5 dark:border-white/10 p-5">
        <h2 className="text-xl font-semibold mb-4">Add New Citation</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-[var(--muted)]">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Research paper title" className="mt-1 w-full rounded-md border border-black/10 bg-white dark:bg-[#0f1218] px-3 h-10 text-sm" />
          </div>
          <div>
            <label className="text-sm text-[var(--muted)]">Authors</label>
            <input value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="Smith, J.; Johnson, A." className="mt-1 w-full rounded-md border border-black/10 bg-white dark:bg-[#0f1218] px-3 h-10 text-sm" />
            <div className="text-xs text-[var(--muted)] mt-1">Separate multiple authors with semicolons</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-[var(--muted)]">Year</label>
              <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2025" className="mt-1 w-full rounded-md border border-black/10 bg-white dark:bg-[#0f1218] px-3 h-10 text-sm" />
            </div>
            <div>
              <label className="text-sm text-[var(--muted)]">URL</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="mt-1 w-full rounded-md border border-black/10 bg-white dark:bg-[#0f1218] px-3 h-10 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm text-[var(--muted)]">Format</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["APA", "MLA", "Chicago", "Harvard", "IEEE"] as Citation["style"][]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setStyle(opt)}
                  className={`px-3 py-1.5 rounded-md text-sm border ${
                    style === opt ? "text-white" : "text-inherit"
                  }`}
                  style={{
                    background: style === opt ? "var(--brand-blue)" : "transparent",
                    borderColor: "rgba(255,255,255,0.1)",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <button
            disabled={isDisabled}
            onClick={addCitation}
            className="w-full mt-2 rounded-md py-2 text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--brand-yellow)", color: "#1f2937" }}
          >
            + Add Citation
          </button>
        </div>
      </div>

      <div className="card bg-white dark:bg-[#11161d] border-black/5 dark:border-white/10 p-5 flex flex-col">
        <h2 className="text-xl font-semibold">Your Citations</h2>
        <div className="text-sm text-[var(--muted)] mb-4">{citations.length} citations created</div>
        <div className="space-y-4 overflow-auto">
          {citations.length === 0 ? (
            <div className="text-sm text-[var(--muted)]">No citations yet. Add one from the form.</div>
          ) : (
            citations.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="font-medium mb-1">{c.title}</div>
                <div className="text-sm text-white/70 mb-3">{c.authors}</div>
                <pre className="text-sm bg-white/5 rounded-md p-3 whitespace-pre-wrap">{c.formatted}</pre>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => copy(c.formatted)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10">
                    <CopyIcon /> Copy
                  </button>
                  <button onClick={() => exportTxt(c.formatted, `${c.title || "citation"}.txt`)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10">
                    <DownloadIcon /> Export
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


