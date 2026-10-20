"use client";

import { useEffect, useRef } from "react";

// Editor WYSIWYG kecil: tebal/miring/paragraf, ketik langsung keliatan formatnya.
// Disimpan ke hidden input (name) dalam format mini-markdown (**tebal**, *miring*,
// baris kosong = paragraf baru) → dirender MiniMarkdown, kompatibel artikel lama.
// ponytail: execCommand deprecated tapi zero-dep & jalan di semua browser.

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// mini-markdown → HTML (hanya untuk isi awal editor saat edit artikel).
function mdToHtml(md: string) {
  return escapeHtml(md)
    .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/\*([^*\n]+)\*/g, "<i>$1</i>")
    .replace(/\n/g, "<br>");
}

// HTML editor → mini-markdown.
function nodeToMd(n: Node): string {
  if (n.nodeType === Node.TEXT_NODE) return n.nodeValue ?? "";
  const el = n as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (tag === "br") return "\n";
  let inner = "";
  el.childNodes.forEach((c) => { inner += nodeToMd(c); });
  if (tag === "b" || tag === "strong") return `**${inner}**`;
  if (tag === "i" || tag === "em") return `*${inner}*`;
  if (tag === "div" || tag === "p") return `\n${inner}`; // tiap blok = baris baru
  return inner;
}

function serialize(root: HTMLElement): string {
  let out = "";
  root.childNodes.forEach((n) => { out += nodeToMd(n); });
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export default function RichText({ name, defaultValue = "", rows = 14 }: { name: string; defaultValue?: string; rows?: number }) {
  const edRef = useRef<HTMLDivElement>(null);
  const hidRef = useRef<HTMLInputElement>(null);

  // isi awal + pakai tag <b>/<i> (bukan span style) biar serialisasi bersih.
  useEffect(() => {
    if (edRef.current) edRef.current.innerHTML = mdToHtml(defaultValue);
    try { document.execCommand("styleWithCSS", false, "false"); } catch { /* abaikan */ }
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sync() {
    if (edRef.current && hidRef.current) hidRef.current.value = serialize(edRef.current);
  }
  function cmd(c: string) {
    edRef.current?.focus();
    document.execCommand(c);
    sync();
  }

  const btn = "rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:border-primary hover:text-primary";
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => cmd("bold")} className={`${btn} font-extrabold`} title="Tebal">B</button>
        <button type="button" onClick={() => cmd("italic")} className={`${btn} italic`} title="Miring">I</button>
        <button type="button" onClick={() => cmd("insertParagraph")} className={btn} title="Paragraf baru">¶</button>
      </div>
      <div
        ref={edRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        style={{ minHeight: `${rows * 1.6}rem` }}
        className="field whitespace-pre-wrap text-sm leading-relaxed focus:outline-none"
      />
      <input ref={hidRef} type="hidden" name={name} />
    </div>
  );
}
