'use client';

import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { CopyIcon, CheckIcon, TrashIcon } from '@radix-ui/react-icons';

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

  return (
    <div className="h-full w-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 md:p-6">
        <h2 className="text-xl font-semibold mb-4">Add New Citation</h2>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4 p-1 bg-neutral-900 rounded-lg">
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              mode === 'manual'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setMode('url')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              mode === 'url'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            URL Only
          </button>
        </div>

        {mode === 'url' ? (
          <>
            <label className="block text-sm mb-1">Website URL</label>
            <input
              type="url"
              className="w-full mb-4 px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-700"
              placeholder="https://example.com/article"
              value={urlOnly}
              onChange={(e) => setUrlOnly(e.target.value)}
            />
            <p className="text-xs text-neutral-400 mb-4">
              Paste a URL and we'll automatically extract citation information
            </p>
          </>
        ) : (
          <>
            <label className="block text-sm mb-1">Title <span className="text-red-400">*</span></label>
        <input
          type="text"
          required
          className="w-full mb-4 px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-700"
          placeholder="Research paper title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="block text-sm mb-1">Authors <span className="text-red-400">*</span></label>
        <input
          type="text"
          required
          className="w-full mb-1 px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-700"
          placeholder="Smith, J.; Johnson, A."
          value={authors}
          onChange={(e) => setAuthors(e.target.value)}
        />
        <p className="text-xs text-neutral-400 mb-4">Separate multiple authors with semicolons</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Year <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-700"
              placeholder="2025"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">URL <span className="text-red-400">*</span></label>
            <input
              type="url"
              required
              className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-700"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>
          </>
        )}

        <div className="mt-4">
          <p className="text-sm mb-2">Format</p>
          <div className="flex flex-wrap gap-2">
            {formats.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={
                  'px-3 py-1.5 rounded-md border transition-colors ' +
                  (format === f
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-neutral-900 text-neutral-200 border-neutral-800 hover:border-neutral-700')
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={addCitation}
          disabled={loading || (mode === 'url' ? !urlOnly.trim() : !title.trim() || !authors.trim() || !year.trim() || !url.trim())}
          className="mt-6 w-full rounded-md px-4 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating…' : mode === 'url' ? 'Generate from URL' : '+ Add Citation'}
        </button>
      </div>

      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 md:p-6 flex flex-col overflow-hidden h-full min-h-[300px]">
        <h2 className="text-xl font-semibold mb-4 flex-shrink-0">Your Citations</h2>
        {loadingCitations ? (
          <p className="text-neutral-400">Loading citations...</p>
        ) : items.length === 0 ? (
          <p className="text-neutral-400">No citations yet. Add one from the form.</p>
        ) : (
          <ul className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0">
            {items.map((c, i) => (
              <li key={c.id || i} className="p-4 bg-neutral-900 border border-neutral-800 rounded-md space-y-3 relative group">
                <button
                  onClick={() => deleteCitation(c.id, i)}
                  className="absolute top-2 right-2 p-1.5 rounded hover:bg-red-500/20 text-neutral-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete citation"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
                {/* Full Citation */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <label className="text-xs font-medium text-neutral-400">Full Citation</label>
                    <button
                      onClick={() => copyToClipboard(c.fullCitation, 'full', i)}
                      className="p-1.5 rounded hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
                      title="Copy full citation"
                    >
                      {copiedIndex?.type === 'full' && copiedIndex?.index === i ? (
                        <CheckIcon className="h-4 w-4 text-green-400" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-neutral-200 break-words">{c.fullCitation}</p>
                </div>

                {/* In-Text Citation */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <label className="text-xs font-medium text-neutral-400">In-Text Citation</label>
                    <button
                      onClick={() => copyToClipboard(c.inTextCitation, 'inText', i)}
                      className="p-1.5 rounded hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
                      title="Copy in-text citation"
                    >
                      {copiedIndex?.type === 'inText' && copiedIndex?.index === i ? (
                        <CheckIcon className="h-4 w-4 text-green-400" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-neutral-200 break-words">{c.inTextCitation}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


