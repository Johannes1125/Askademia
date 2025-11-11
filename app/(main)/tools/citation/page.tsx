// Citation Tool Page
"use client";

import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { CopyIcon, DownloadIcon } from "@radix-ui/react-icons";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

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
  const [manualEntry, setManualEntry] = useState(true);
  const [loading, setLoading] = useState(false);

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

  async function logExport(kind: "citation" | "chat", itemId: string | undefined, format: string) {
    try {
      await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, itemId, format, timestamp: new Date().toISOString() }),
      });
    } catch (err) {
      // non-blocking
      console.warn("Export log failed", err);
    }
  }

  async function exportCitationPdf(citation: Citation) {
    try {
      console.log('exportCitationPdf called for', citation.id);
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
      const text = citation.formatted || `${citation.title}\n${citation.authors} (${citation.year})\n${citation.url}`;
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(text, pageWidth);
      doc.text(lines, margin, 60);
      const blob = doc.output("blob");
      console.log('pdf blob size', blob.size);
      const safeName = ((citation.title || "citation").replace(/[^a-z0-9-_ ]/gi, '') || 'citation').slice(0, 100);
      saveAs(blob, `${safeName}.pdf`);
      await logExport("citation", citation.id, "pdf");
      toast.success("PDF exported");
    } catch (err) {
      console.error(err);
      toast.error("Export failed");
    }
  }

  async function exportCitationDocx(citation: Citation) {
    try {
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({ children: [new TextRun({ text: citation.formatted || citation.title })] }),
            ],
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${(citation.title || "citation").slice(0, 100)}.docx`);
      await logExport("citation", citation.id, "docx");
      toast.success("DOCX exported");
    } catch (err) {
      console.error(err);
      toast.error("Export failed");
    }
  }

  return (
    <div className="space-y-6 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* Add New Citation Card */}
  <div className="card p-5 sm:p-6 bg-card text-foreground border-theme hover:shadow-lg transition-shadow rounded-xl">
          <h2 className="text-xl font-bold mb-4 text-foreground">Add New Citation</h2>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setManualEntry(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                manualEntry
                  ? "bg-[var(--brand-blue)] text-white"
                  : "bg-subtle-bg text-foreground hover:bg-white/10"
              }`}
            >
              Manual Entry
            </button>
            <button
              type="button"
              onClick={() => setManualEntry(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !manualEntry
                  ? "bg-[var(--brand-blue)] text-white"
                  : "bg-subtle-bg text-foreground hover:bg-white/10"
              }`}
            >
              URL Only
            </button>
          </div>

          {manualEntry ? (
            <form className="space-y-4">
              {/* Title Field */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Research paper title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-input-bg border border-theme text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                />
              </div>

              {/* Authors Field */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Authors <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Smith, J.; Johnson, A."
                  value={authors}
                  onChange={(e) => setAuthors(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-input-bg border border-theme text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                />
                <p className="text-xs text-muted mt-1">Separate multiple authors with semicolons</p>
              </div>

              {/* Year and URL Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Year <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="2025"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-input-bg border border-theme text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-input-bg border border-theme text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                  />
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Format</label>
                <div className="flex flex-wrap gap-2">
                  {["APA", "MLA", "Chicago", "Harvard", "IEEE"].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setStyle(fmt as Citation["style"])}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        style === fmt
                          ? "bg-[var(--brand-blue)] text-white"
                          : "bg-card border border-theme text-foreground hover:bg-white/5"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={addCitation}
                disabled={loading}
                className="w-full px-4 py-2 rounded-lg bg-[var(--brand-blue)] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? "Adding..." : "+ Add Citation"}
              </button>
            </form>
          ) : (
            <form className="space-y-4">
              <input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-input-bg border border-theme text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
              />
              <button
                type="button"
                onClick={addCitation}
                disabled={loading}
                className="w-full px-4 py-2 rounded-lg bg-[var(--brand-blue)] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? "Extracting..." : "Extract & Add"}
              </button>
            </form>
          )}
        </div>

        {/* Your Citations Card */}
  <div className="card p-5 sm:p-6 bg-card border-theme text-foreground hover:shadow-lg transition-shadow rounded-xl flex flex-col h-full max-h-[70vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 text-foreground">Your Citations</h2>
          <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
            {citations.length === 0 ? (
              <p className="text-center text-muted py-8">No citations yet</p>
            ) : (
              citations.map((citation) => (
                <div key={citation.id} className="p-3 rounded-lg bg-subtle-bg border border-theme hover:shadow transition-shadow">
                  <div className="text-sm font-medium text-foreground mb-2">{citation.style}</div>
                  <div className="text-xs text-foreground mb-2">{citation.title}</div>
                  <div className="text-xs text-muted mb-2">{citation.authors}</div>
                  <div className="text-xs text-muted mb-2">{citation.year}</div>
                  <div className="text-xs text-muted mb-2">{citation.url}</div>
                  <div className="text-xs text-muted mb-2">{citation.formatted}</div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => copy(citation.formatted)}
                      className="text-xs px-2 py-1 rounded bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/30 transition-colors"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => exportCitationPdf(citation)}
                      className="text-xs px-2 py-1 rounded bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/30 transition-colors flex items-center gap-2"
                    >
                      <DownloadIcon /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => exportCitationDocx(citation)}
                      className="text-xs px-2 py-1 rounded bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/30 transition-colors flex items-center gap-2"
                    >
                      <DownloadIcon /> DOCX
                    </button>
                    <button
                      type="button"
                      onClick={() => exportTxt(citation.formatted, `${citation.title || "citation"}.txt`)}
                      className="text-xs px-2 py-1 rounded bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/30 transition-colors flex items-center gap-2"
                    >
                      TXT
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


