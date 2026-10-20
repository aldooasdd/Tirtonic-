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
  const inlineHtml = (s: string) =>
    escapeHtml(s).replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>").replace(/\*([^*\n]+)\*/g, "<i>$1</i>");
  return md.split("\n").map((line) => {
    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    if (h) return `<${h[1] === "##" ? "h2" : "h3"}>${inlineHtml(h[2])}</${h[1] === "##" ? "h2" : "h3"}>`;
    return line.trim() ? `<div>${inlineHtml(line)}</div>` : "<div><br></div>";
  }).join("");
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
  if (tag === "h1" || tag === "h2") return `\n## ${inner}`; // ukuran besar
  if (tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") return `\n### ${inner}`; // ukuran sedang
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
  function block(tag: string) {
    edRef.current?.focus();
    document.execCommand("formatBlock", false, tag); // <h2>=besar, <h3>=sedang, <div>=normal
    sync();
  }

  const btn = "rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:border-primary hover:text-primary";
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => cmd("bold")} className={`${btn} font-extrabold`} title="Tebal">B</button>
        <button type="button" onClick={() => cmd("italic")} className={`${btn} italic`} title="Miring">I</button>
        <button type="button" onClick={() => cmd("insertParagraph")} className={btn} title="Paragraf baru">¶</button>
        <span className="mx-1 w-px self-stretch bg-gray-200" />
        <button type="button" onClick={() => block("<h2>")} className={`${btn} font-extrabold`} title="Font besar">A+</button>
        <button type="button" onClick={() => block("<h3>")} className={`${btn} font-bold`} title="Font sedang">A</button>
        <button type="button" onClick={() => block("<div>")} className={btn} title="Font normal">a</button>
      </div>
      <style>{`.rt-editor h2{font-size:1.5rem;font-weight:800;line-height:1.3;margin:.5rem 0}.rt-editor h3{font-size:1.2rem;font-weight:700;line-height:1.3;margin:.4rem 0}`}</style>
      <div
        ref={edRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        style={{ minHeight: `${rows * 1.6}rem` }}
        className="rt-editor field whitespace-pre-wrap text-sm leading-relaxed focus:outline-none"
      />
      <input ref={hidRef} type="hidden" name={name} />
    </div>
  );
}
