'use client';

import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { CopyIcon, CheckIcon, TrashIcon, DownloadIcon, BookmarkIcon } from '@radix-ui/react-icons';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { WorkspaceQuickAddButton } from '@/components/workspace/QuickAdd';

type Format = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE';

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

  const formats: Format[] = useMemo(() => ['APA', 'MLA', 'Chicago', 'Harvard', 'IEEE'], []);

  // Load citations from database on mount
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
    // Validate URL mode
    if (mode === 'url') {
      if (!urlOnly.trim()) {
        toast.error('Please enter a URL');
        return;
      }
    } else {
      // Validate manual entry - all fields required
      const errors: string[] = [];
      
      if (!title.trim()) {
        errors.push('Title is required');
      }
      if (!authors.trim()) {
        errors.push('Authors is required');
      }
      if (!year.trim()) {
        errors.push('Year is required');
      }
      if (!url.trim()) {
        errors.push('URL is required');
      }

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
      
      // Handle both old format (string) and new format (object)
      const citationItem: CitationItem = typeof data === 'string' || data.citation
        ? {
            id: data.id,
            fullCitation: data.citation || data,
            inTextCitation: '(n.d.)'
          }
        : {
            id: data.id,
            fullCitation: data.fullCitation || '',
            inTextCitation: data.inTextCitation || '(n.d.)'
          };
      
      setItems((prev) => [citationItem, ...prev]);
      toast.success('Citation created successfully!');
      // Clear form
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
      // Local citation without ID, just remove from state
      setItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    try {
      const res = await fetch(`/api/citations/${citationId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete citation');
      }

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
      // non-blocking
      console.warn('Export log failed', err);
    }
  }

  function formatSingleCitationForExport(citation: CitationItem): string {
    return `Citation\n\nFull Citation: ${citation.fullCitation}\nIn-Text Citation: ${citation.inTextCitation}`;
  }

  async function exportCitationPdf(citation: CitationItem, index: number) {
    try {
      let content = formatSingleCitationForExport(citation);
      
      // Always use AI enhancement for individual citations
      toast.info('Formatting with AI...');
      try {
        const response = await fetch('/api/export/format', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, type: 'citations', format: 'pdf' }),
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

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;
      const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 60;

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
        let processedLine = line
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/`(.*?)`/g, '$1');
        
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
      
      const safeName = `citation-${index + 1}`.replace(/[^a-z0-9-_ ]/gi, '');
      const blob = doc.output('blob');
      saveAs(blob, `${safeName}-ai-enhanced.pdf`);
      
      if (citation.id) {
        await logExport('citation', citation.id, 'pdf-ai');
      }
      toast.success('PDF exported (AI-enhanced)');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    }
  }

  async function exportCitationDocx(citation: CitationItem, index: number) {
    try {
      let content = formatSingleCitationForExport(citation);
      
      // Always use AI enhancement for individual citations
      toast.info('Formatting with AI...');
      try {
        const response = await fetch('/api/export/format', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, type: 'citations', format: 'docx' }),
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

      const paragraphs: Paragraph[] = [
        new Paragraph({
          children: [new TextRun({ text: 'Citation', bold: true, size: 32 })],
          spacing: { after: 300 },
        }),
      ];

      // Use markdown parser
      const parsedParagraphs = parseMarkdownForDocx(content);
      paragraphs.push(...parsedParagraphs);

      const doc = new Document({
        sections: [
          {
            children: paragraphs,
          },
        ],
      });
      
      const blob = await Packer.toBlob(doc);
      const safeName = `citation-${index + 1}`.replace(/[^a-z0-9-_ ]/gi, '');
      saveAs(blob, `${safeName}-ai-enhanced.docx`);
      
      if (citation.id) {
        await logExport('citation', citation.id, 'docx-ai');
      }
      toast.success('DOCX exported (AI-enhanced)');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
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
      
      // Add space for line continuation
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

  async function exportAllCitationsPdf(useAI: boolean = false) {
    if (items.length === 0) {
      toast.error('No citations to export');
      return;
    }

    try {
      let content = formatCitationsForExport();
      
      // Use AI to format if requested
      if (useAI) {
        toast.info('Formatting with AI...');
        try {
          const response = await fetch('/api/export/format', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, type: 'citations', format: 'pdf' }),
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

      doc.setFontSize(18);
      doc.text('Citations Export', margin, yPos);
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
        const lines = doc.splitTextToSize(content, pageWidth);
        let currentLine = 0;
        
        while (currentLine < lines.length) {
          if (yPos > pageHeight - 100) {
            doc.addPage();
            yPos = 60;
          }
          
          const linesToFit = Math.floor((pageHeight - yPos - 100) / 12);
          const linesForThisPage = lines.slice(currentLine, currentLine + linesToFit);
          doc.setFontSize(10);
          doc.text(linesForThisPage, margin, yPos);
          yPos += linesForThisPage.length * 12 + 10;
          currentLine += linesToFit;
        }
      }

      const blob = doc.output('blob');
      const suffix = useAI ? '-ai-enhanced' : '';
      saveAs(blob, `citations-export${suffix}.pdf`);
      toast.success(`All citations exported as PDF${useAI ? ' (AI-enhanced)' : ''}`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    }
  }

  async function exportAllCitationsDocx(useAI: boolean = false) {
    if (items.length === 0) {
      toast.error('No citations to export');
      return;
    }

    try {
      let content = formatCitationsForExport();
      
      // Use AI to format if requested
      if (useAI) {
        toast.info('Formatting with AI...');
        try {
          const response = await fetch('/api/export/format', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, type: 'citations', format: 'docx' }),
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
          children: [new TextRun({ text: 'Citations Export', bold: true, size: 32 })],
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
      const suffix = useAI ? '-ai-enhanced' : '';
      saveAs(blob, `citations-export${suffix}.docx`);
      toast.success(`All citations exported as DOCX${useAI ? ' (AI-enhanced)' : ''}`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    }
  }

  return (
    <div className="h-full w-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
      <div className="card p-4 md:p-6 bg-card border-theme rounded-xl text-foreground">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Add New Citation</h2>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4 p-1 bg-subtle-bg rounded-lg">
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              mode === 'manual'
                ? 'bg-[var(--brand-blue)] text-white'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              mode === 'url'
                ? 'bg-[var(--brand-blue)] text-white'
                : 'text-muted hover:text-foreground'
            }`}
          >
            URL Only
          </button>
        </div>

        {mode === 'url' ? (
          <>
            <label className="block text-sm mb-1 text-foreground">Website URL</label>
            <input
              type="url"
              className="w-full mb-4 px-3 py-2 rounded-md bg-input-bg border border-theme focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] text-foreground placeholder-muted"
              placeholder="https://example.com/article"
              value={urlOnly}
              onChange={(e) => setUrlOnly(e.target.value)}
            />
            <p className="text-xs text-muted mb-4">
              Paste a URL and we'll automatically extract citation information
            </p>
          </>
        ) : (
          <>
            <label className="block text-sm mb-1 text-foreground">Title <span className="text-red-400">*</span></label>
        <input
          type="text"
          required
          className="w-full mb-4 px-3 py-2 rounded-md bg-input-bg border border-theme focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] text-foreground placeholder-muted"
          placeholder="Research paper title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="block text-sm mb-1 text-foreground">Authors <span className="text-red-400">*</span></label>
        <input
          type="text"
          required
          className="w-full mb-1 px-3 py-2 rounded-md bg-input-bg border border-theme focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] text-foreground placeholder-muted"
          placeholder="Smith, J.; Johnson, A."
          value={authors}
          onChange={(e) => setAuthors(e.target.value)}
        />
        <p className="text-xs text-muted mb-4">Separate multiple authors with semicolons</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1 text-foreground">Year <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 rounded-md bg-input-bg border border-theme focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] text-foreground placeholder-muted"
              placeholder="2025"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-foreground">URL <span className="text-red-400">*</span></label>
            <input
              type="url"
              required
              className="w-full px-3 py-2 rounded-md bg-input-bg border border-theme focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] text-foreground placeholder-muted"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>
          </>
        )}

        <div className="mt-4">
          <p className="text-sm mb-2 text-foreground">Format</p>
          <div className="flex flex-wrap gap-2">
            {formats.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={
                  'px-3 py-1.5 rounded-md border transition-colors ' +
                  (format === f
                    ? 'bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]'
                    : 'bg-card text-foreground border-theme hover:border-white/10')
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={addCitation}
          disabled={loading || (mode === 'url' ? !urlOnly.trim() : !title.trim() || !authors.trim() || !year.trim() || !url.trim())}
          className="mt-6 w-full rounded-md px-4 py-2 bg-[var(--brand-blue)] text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating…' : mode === 'url' ? 'Generate from URL' : '+ Add Citation'}
        </button>
      </div>
  <div className="card p-4 md:p-6 bg-card border-theme rounded-xl flex flex-col overflow-hidden h-full min-h-[300px] text-foreground">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-xl font-semibold text-foreground">Your Citations</h2>
          {items.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => exportAllCitationsPdf(true)}
                className="px-3 py-1.5 text-sm rounded-md border border-theme hover:bg-subtle-bg text-foreground flex items-center gap-1.5 transition-colors bg-[var(--brand-blue)]/10 hover:bg-[var(--brand-blue)]/20"
                title="Export all as PDF (AI-enhanced)"
              >
                <DownloadIcon className="h-4 w-4" />
                PDF AI
              </button>
              <button
                type="button"
                onClick={() => exportAllCitationsDocx(true)}
                className="px-3 py-1.5 text-sm rounded-md border border-theme hover:bg-subtle-bg text-foreground flex items-center gap-1.5 transition-colors bg-[var(--brand-blue)]/10 hover:bg-[var(--brand-blue)]/20"
                title="Export all as DOCX (AI-enhanced)"
              >
                <DownloadIcon className="h-4 w-4" />
                DOCX AI
              </button>
            </div>
          )}
        </div>
        {loadingCitations ? (
          <p className="text-muted">Loading citations...</p>
        ) : items.length === 0 ? (
          <p className="text-muted">No citations yet. Add one from the form.</p>
        ) : (
          <ul className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0">
            {items.map((c, i) => (
              <li key={c.id || i} className="p-4 bg-subtle-bg border border-theme rounded-md space-y-3 relative group">
                {/* Full Citation */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <label className="text-xs font-medium text-muted">Full Citation</label>
                    <div className="flex items-center gap-1">
                      <WorkspaceQuickAddButton
                        className="p-1.5 rounded hover:bg-black/5 transition-colors text-muted hover:text-foreground"
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
                        className="p-1.5 rounded hover:bg-black/5 transition-colors text-muted hover:text-foreground"
                        title="Copy full citation"
                      >
                        {copiedIndex?.type === 'full' && copiedIndex?.index === i ? (
                          <CheckIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <CopyIcon className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCitation(c.id, i)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors"
                        title="Delete citation"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-foreground break-words">{c.fullCitation}</p>
                </div>

                {/* In-Text Citation */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <label className="text-xs font-medium text-muted">In-Text Citation</label>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(c.inTextCitation, 'inText', i)}
                      className="p-1.5 rounded hover:bg-black/5 transition-colors text-muted hover:text-foreground"
                      title="Copy in-text citation"
                    >
                      {copiedIndex?.type === 'inText' && copiedIndex?.index === i ? (
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-foreground break-words">{c.inTextCitation}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


