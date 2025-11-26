'use client';

import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { CopyIcon, CheckIcon, TrashIcon, DownloadIcon, BookmarkIcon, Link2Icon, FileTextIcon, PlusIcon } from '@radix-ui/react-icons';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { WorkspaceQuickAddButton } from '@/components/workspace/QuickAdd';

type Format = 'APA' | 'MLA' | 'Chicago' | 'IEEE';

type CitationItem = {
  id?: string;
  fullCitation: string;
  inTextCitation: string;
};

export default function CitationsPage() {
  const [mode, setMode] = useState<'manual' | 'url'>('manual');
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [year, setYear] = useState('');
  const [url, setUrl] = useState('');
  const [urlOnly, setUrlOnly] = useState('');
  const [format, setFormat] = useState<Format>('APA');
  const [items, setItems] = useState<CitationItem[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<{ type: 'full' | 'inText'; index: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCitations, setLoadingCitations] = useState(true);

  const formats: Format[] = useMemo(() => ['APA', 'MLA', 'Chicago', 'IEEE'], []);

  useEffect(() => {
    async function loadCitations() {
      try {
        setLoadingCitations(true);
        const res = await fetch('/api/citations');
        if (!res.ok) throw new Error('Failed to load citations');
        const data = await res.json();
        setItems(data.citations || []);
      } catch (e: any) {
        console.error('Error loading citations:', e);
        toast.error('Failed to load citations');
      } finally {
        setLoadingCitations(false);
      }
    }
    loadCitations();
  }, []);

  async function copyToClipboard(text: string, type: 'full' | 'inText', index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex({ type, index });
      toast.success(`${type === 'full' ? 'Full' : 'In-text'} citation copied!`);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      toast.error('Failed to copy citation');
    }
  }

  async function addCitation() {
    if (mode === 'url') {
      if (!urlOnly.trim()) {
        toast.error('Please enter a URL');
        return;
      }
    } else {
      const errors: string[] = [];
      if (!title.trim()) errors.push('Title is required');
      if (!authors.trim()) errors.push('Authors is required');
      if (!year.trim()) errors.push('Year is required');
      if (!url.trim()) errors.push('URL is required');
      if (errors.length > 0) {
        errors.forEach(error => toast.error(error));
        return;
      }
    }

    setLoading(true);
    try {
      const payload = mode === 'url' 
        ? { urlOnly: urlOnly.trim(), format }
        : { title: title.trim(), authors: authors.trim(), year: year.trim(), url: url.trim(), format };
      
      const res = await fetch('/api/citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create citation');
      
      const citationItem: CitationItem = typeof data === 'string' || data.citation
        ? { id: data.id, fullCitation: data.citation || data, inTextCitation: '(n.d.)' }
        : { id: data.id, fullCitation: data.fullCitation || '', inTextCitation: data.inTextCitation || '(n.d.)' };
      
      setItems((prev) => [citationItem, ...prev]);
      toast.success('Citation created successfully!');
      if (mode === 'url') {
        setUrlOnly('');
      } else {
        setTitle('');
        setAuthors('');
        setYear('');
        setUrl('');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create citation');
    } finally {
      setLoading(false);
    }
  }

  async function deleteCitation(citationId: string | undefined, index: number) {
    if (!citationId) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    try {
      const res = await fetch(`/api/citations/${citationId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete citation');
      setItems((prev) => prev.filter((item) => item.id !== citationId));
      toast.success('Citation deleted successfully');
    } catch (e: any) {
      console.error('Error deleting citation:', e);
      toast.error(e?.message || 'Failed to delete citation');
    }
  }

  async function logExport(kind: 'citation' | 'chat', itemId: string | undefined, format: string) {
    try {
      await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, itemId, format, timestamp: new Date().toISOString() }),
      });
    } catch (err) {
      console.warn('Export log failed', err);
    }
  }

  function formatCitationsForExport(): string {
    let formatted = 'Citations Export\n\n';
    items.forEach((citation, index) => {
      formatted += `Citation ${index + 1}\n`;
      formatted += `Full Citation: ${citation.fullCitation}\n`;
      formatted += `In-Text Citation: ${citation.inTextCitation}\n\n`;
    });
    return formatted;
  }

  function parseMarkdownForDocx(text: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const lines = text.split('\n');
    let currentParagraph: TextRun[] = [];
    
    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        if (currentParagraph.length > 0) {
          paragraphs.push(new Paragraph({ children: currentParagraph, spacing: { after: 200 } }));
          currentParagraph = [];
        }
        const level = headerMatch[1].length;
        const headerText = headerMatch[2].trim();
        const sizes = [32, 28, 24, 22, 20, 18];
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: headerText, bold: true, size: sizes[level - 1] || 20 })],
          spacing: { before: 300, after: 200 },
        }));
        continue;
      }

      if (!line.trim()) {
        if (currentParagraph.length > 0) {
          paragraphs.push(new Paragraph({ children: currentParagraph, spacing: { after: 200 } }));
          currentParagraph = [];
        }
        continue;
      }

      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
      for (const part of parts) {
        if (!part) continue;
        if (part.startsWith('**') && part.endsWith('**')) {
          currentParagraph.push(new TextRun({ text: part.slice(2, -2), bold: true, size: 20 }));
        } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
          currentParagraph.push(new TextRun({ text: part.slice(1, -1), italics: true, size: 20 }));
        } else if (part.startsWith('`') && part.endsWith('`')) {
          currentParagraph.push(new TextRun({ text: part.slice(1, -1), font: 'Courier New', size: 18 }));
        } else {
          currentParagraph.push(new TextRun({ text: part, size: 20 }));
        }
      }
      currentParagraph.push(new TextRun({ text: ' ', size: 20 }));
    }
    
    if (currentParagraph.length > 0) {
      paragraphs.push(new Paragraph({ children: currentParagraph, spacing: { after: 200 } }));
    }
    return paragraphs;
  }

  async function exportAllCitationsPdf() {
    if (items.length === 0) {
      toast.error('No citations to export');
      return;
    }

    try {
      let content = formatCitationsForExport();
      toast.info('Formatting with AI...');
      
      try {
        const response = await fetch('/api/export/format', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, type: 'citations', format: 'pdf' }),
        });
        if (response.ok) {
          const data = await response.json();
          content = data.formattedContent;
        }
      } catch (err) {
        console.error('AI formatting error:', err);
      }

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;
      const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 60;

      const lines = content.split('\n');
      for (const line of lines) {
        if (yPos > pageHeight - 100) {
          doc.addPage();
          yPos = 60;
        }
        
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
        
        let processedLine = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1');
        if (processedLine.trim()) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const textLines = doc.splitTextToSize(processedLine, pageWidth);
          doc.text(textLines, margin, yPos);
          yPos += textLines.length * 12 + 5;
        } else {
          yPos += 8;
        }
      }
      
      saveAs(doc.output('blob'), 'citations-export.pdf');
      toast.success('Citations exported as PDF');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    }
  }

  async function exportAllCitationsDocx() {
    if (items.length === 0) {
      toast.error('No citations to export');
      return;
    }

    try {
      let content = formatCitationsForExport();
      toast.info('Formatting with AI...');
      
      try {
        const response = await fetch('/api/export/format', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, type: 'citations', format: 'docx' }),
        });
        if (response.ok) {
          const data = await response.json();
          content = data.formattedContent;
        }
      } catch (err) {
        console.error('AI formatting error:', err);
      }

      const paragraphs: Paragraph[] = [
        new Paragraph({
          children: [new TextRun({ text: 'Citations Export', bold: true, size: 32 })],
          spacing: { after: 300 },
        }),
        ...parseMarkdownForDocx(content),
      ];

      const doc = new Document({ sections: [{ children: paragraphs }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'citations-export.docx');
      toast.success('Citations exported as DOCX');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    }
  }

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 min-h-0">
      {/* Left Panel - Add Citation Form */}
      <div className="bg-card border border-theme rounded-2xl p-4 flex flex-col overflow-hidden max-h-[600px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-indigo-600 flex items-center justify-center">
            <FileTextIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Add Citation</h2>
            <p className="text-xs text-muted">Generate formatted references</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 p-1 bg-subtle-bg rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === 'manual'
                ? 'bg-card text-foreground shadow-sm border border-theme'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <FileTextIcon className="h-4 w-4" />
            Manual
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === 'url'
                ? 'bg-card text-foreground shadow-sm border border-theme'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Link2Icon className="h-4 w-4" />
            From URL
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {mode === 'url' ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Website URL</label>
              <input
                type="url"
                className="w-full px-3 py-2 rounded-xl bg-input-bg border border-theme focus:outline-none focus:border-[var(--brand-blue)] transition-colors text-foreground placeholder-muted"
                placeholder="https://example.com/article"
                value={urlOnly}
                onChange={(e) => setUrlOnly(e.target.value)}
              />
              <p className="text-xs text-muted mt-2 flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                We'll automatically extract citation info
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-xl bg-input-bg border border-theme focus:outline-none focus:border-[var(--brand-blue)] transition-colors text-foreground placeholder-muted"
                  placeholder="Research paper title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Authors <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-xl bg-input-bg border border-theme focus:outline-none focus:border-[var(--brand-blue)] transition-colors text-foreground placeholder-muted"
                  placeholder="Smith, J.; Johnson, A."
                  value={authors}
                  onChange={(e) => setAuthors(e.target.value)}
                />
                <p className="text-xs text-muted mt-1">Separate with semicolons</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Year <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl bg-input-bg border border-theme focus:outline-none focus:border-[var(--brand-blue)] transition-colors text-foreground placeholder-muted"
                    placeholder="2025"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    className="w-full px-3 py-2 rounded-xl bg-input-bg border border-theme focus:outline-none focus:border-[var(--brand-blue)] transition-colors text-foreground placeholder-muted"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Format Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Citation Format</label>
            <div className="flex flex-wrap gap-2">
              {formats.map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    format === f
                      ? 'bg-gradient-to-r from-[var(--brand-blue)] to-indigo-600 text-white shadow-lg shadow-[var(--brand-blue)]/25'
                      : 'bg-subtle-bg text-muted hover:text-foreground border border-theme hover:border-white/20'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Add Button */}
        <button
          type="button"
          onClick={addCitation}
          disabled={loading || (mode === 'url' ? !urlOnly.trim() : !title.trim() || !authors.trim() || !year.trim() || !url.trim())}
          className="mt-3 w-full rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-[var(--brand-blue)]/25 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, var(--brand-blue), #4F46E5)' }}
        >
          {loading ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <PlusIcon className="h-4 w-4" />
              {mode === 'url' ? 'Generate from URL' : 'Add Citation'}
            </>
          )}
        </button>
      </div>

      {/* Right Panel - Citations List */}
      <div className="bg-card border border-theme rounded-2xl flex flex-col overflow-hidden max-h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-subtle-bg/30">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">Your Citations</h2>
            {items.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]">
                {items.length}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportAllCitationsPdf}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-theme bg-card hover:bg-subtle-bg text-foreground flex items-center gap-2 transition-all"
              >
                <DownloadIcon className="h-4 w-4" />
                PDF
              </button>
              <button
                type="button"
                onClick={exportAllCitationsDocx}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-theme bg-card hover:bg-subtle-bg text-foreground flex items-center gap-2 transition-all"
              >
                <DownloadIcon className="h-4 w-4" />
                DOCX
              </button>
            </div>
          )}
        </div>

        {/* Citations List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingCitations ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 border-2 border-[var(--brand-blue)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted">Loading citations...</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-xs">
                <div className="w-16 h-16 rounded-2xl bg-subtle-bg border border-dashed border-theme flex items-center justify-center mx-auto mb-4">
                  <FileTextIcon className="h-8 w-8 text-muted" />
                </div>
                <h3 className="font-medium text-foreground mb-1">No citations yet</h3>
                <p className="text-sm text-muted">Add your first citation using the form on the left.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((c, i) => (
                <div 
                  key={c.id || i} 
                  className="group p-5 bg-subtle-bg/50 hover:bg-subtle-bg border border-theme hover:border-white/20 rounded-2xl transition-all"
                >
                  {/* Full Citation */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-blue)]">
                        Full Citation
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <WorkspaceQuickAddButton
                          className="p-2 rounded-lg hover:bg-card transition-colors text-muted hover:text-foreground"
                          derive={() => ({
                            title: `Citation ${i + 1}`,
                            content: `${c.fullCitation}\n\nIn-Text: ${c.inTextCitation}`,
                            section: 'references',
                            tags: ['citation']
                          })}
                        >
                          <BookmarkIcon className="h-4 w-4" />
                        </WorkspaceQuickAddButton>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(c.fullCitation, 'full', i)}
                          className="p-2 rounded-lg hover:bg-card transition-colors text-muted hover:text-foreground"
                          title="Copy"
                        >
                          {copiedIndex?.type === 'full' && copiedIndex?.index === i ? (
                            <CheckIcon className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <CopyIcon className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCitation(c.id, i)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{c.fullCitation}</p>
                  </div>

                  {/* In-Text Citation */}
                  <div className="pt-4 border-t border-theme/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                        In-Text Citation
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(c.inTextCitation, 'inText', i)}
                        className="p-2 rounded-lg hover:bg-card transition-colors text-muted hover:text-foreground opacity-0 group-hover:opacity-100"
                        title="Copy"
                      >
                        {copiedIndex?.type === 'inText' && copiedIndex?.index === i ? (
                          <CheckIcon className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <CopyIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm font-medium text-foreground">{c.inTextCitation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
