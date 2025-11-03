// Grammar & Plagiarism Tool Page
"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "react-toastify";

export default function GrammarPlagiarismPage() {
  const [text, setText] = useState("");

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* Left: sidebar-like panel */}
      <aside className="card bg-[#11161d] border-white/10 text-white p-4 space-y-4">
        <div>
          <div className="text-xs text-white/60 mb-1">Score</div>
          <div className="inline-flex items-center rounded-md px-2 py-1 text-sm font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            92 / 100
          </div>
        </div>
        <div className="space-y-2">
          <button
            className="w-full px-3 py-2 rounded-md text-sm text-white"
            style={{ background: "var(--brand-blue)" }}
            onClick={() => toast.success("Grammar checked (placeholder)")}
          >
            Check Grammar
          </button>
          <button
            className="w-full px-3 py-2 rounded-md text-sm"
            style={{ background: "var(--brand-yellow)", color: "#1f2937" }}
            onClick={() => toast.info("Plagiarism checked (placeholder)")}
          >
            Check Plagiarism
          </button>
        </div>
        <div>
          <div className="text-xs text-white/60 mb-2">Issues (placeholder)</div>
          <ul className="text-sm space-y-1">
            <li className="flex items-start gap-2"><span>•</span><span>Passive voice detected</span></li>
            <li className="flex items-start gap-2"><span>•</span><span>Sentence may be too long</span></li>
            <li className="flex items-start gap-2"><span>•</span><span>Consider a stronger verb</span></li>
          </ul>
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button className="mt-3 w-full px-3 py-2 rounded-md border border-white/10">View Report</button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/40" />
              <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-xl rounded-xl bg-white p-4 shadow-xl">
                <Dialog.Title className="font-medium mb-2">Detailed Report</Dialog.Title>
                <div className="space-y-2 text-sm">
                  <div>Grammar score: 92</div>
                  <div>Plagiarism: 3% similarity</div>
                </div>
                <div className="mt-4 text-right">
                  <Dialog.Close asChild>
                    <button className="px-3 py-2 rounded-md border border-black/10">Close</button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </aside>

      {/* Right: editor */}
      <div className="card bg-[#11161d] border-white/10 text-white p-4 flex flex-col">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 min-h-[320px] rounded-lg bg-[#0f1218] border border-white/10 p-3 text-sm"
          placeholder="Paste or type text to check..."
        />
        <div className="mt-3 text-xs text-white/50">Askademia can make mistakes. Verify important info.</div>
      </div>
    </div>
  );
}


