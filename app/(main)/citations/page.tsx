'use client';

import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';

type Format = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE';

export default function CitationsPage() {
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [year, setYear] = useState('');
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<Format>('APA');
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const formats: Format[] = useMemo(() => ['APA', 'MLA', 'Chicago', 'Harvard', 'IEEE'], []);

  async function addCitation() {
    setLoading(true);
    try {
      const res = await fetch('/api/citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, authors, year, url, format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create citation');
      setItems((prev) => [data.citation as string, ...prev]);
      toast.success('Citation created successfully!');
      // Clear form
      setTitle('');
      setAuthors('');
      setYear('');
      setUrl('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create citation');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full w-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 md:p-6">
        <h2 className="text-xl font-semibold mb-4">Add New Citation</h2>

        <label className="block text-sm mb-1">Title</label>
        <input
          className="w-full mb-4 px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-700"
          placeholder="Research paper title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="block text-sm mb-1">Authors</label>
        <input
          className="w-full mb-1 px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-700"
          placeholder="Smith, J.; Johnson, A."
          value={authors}
          onChange={(e) => setAuthors(e.target.value)}
        />
        <p className="text-xs text-neutral-400 mb-4">Separate multiple authors with semicolons</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Year</label>
            <input
              className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-700"
              placeholder="2025"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">URL</label>
            <input
              className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-700"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>

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
          disabled={loading}
          className="mt-6 w-full rounded-md px-4 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-60"
        >
          {loading ? 'Generating…' : '+ Add Citation'}
        </button>
      </div>

      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 md:p-6 min-h-[300px]">
        <h2 className="text-xl font-semibold mb-4">Your Citations</h2>
        {items.length === 0 ? (
          <p className="text-neutral-400">No citations yet. Add one from the form.</p>
        ) : (
          <ul className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {items.map((c, i) => (
              <li key={i} className="p-3 bg-neutral-900 border border-neutral-800 rounded-md">
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


