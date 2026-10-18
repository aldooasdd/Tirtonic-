import { Fragment, type ReactNode } from "react";

// Format konten artikel (subset Markdown): "## " judul, "### " sub-judul, **tebal**, *miring*.
// Dirender jadi elemen React (tanpa HTML mentah) → aman dari XSS. Teks lama tanpa format tetap sama.
// ponytail: subset kecil; pakai library markdown kalau butuh list/link/gambar.

export function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((part, i) => {
    if (/^\*\*[^*\n]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*\n]+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function MiniMarkdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push(<p key={blocks.length} className="mt-4 whitespace-pre-line leading-relaxed">{inline(para.join("\n"))}</p>);
    para = [];
  };
  for (const line of text.split("\n")) {
    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      blocks.push(
        h[1] === "##"
          ? <h2 key={blocks.length} className="mt-8 text-2xl font-extrabold leading-snug text-gray-900">{inline(h[2])}</h2>
          : <h3 key={blocks.length} className="mt-6 text-xl font-extrabold leading-snug text-gray-900">{inline(h[2])}</h3>,
      );
    } else if (!line.trim()) {
      flush();
    } else {
      para.push(line);
    }
  }
  flush();
  return <>{blocks}</>;
}
