"use client";

// Tombol submit form server action yang minta konfirmasi dulu (hapus permanen dll).
export default function ConfirmSubmit({ message, className, children }: { message: string; className?: string; children: React.ReactNode }) {
  return (
    <button className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
