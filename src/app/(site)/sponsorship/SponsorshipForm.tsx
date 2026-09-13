"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitSponsorship, SponsorState } from "./actions";
import { JENIS_EVENT, BENTUK_SPONSORSHIP } from "@/lib/constants";

const initial: SponsorState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-pill disabled:opacity-60">
      {pending ? "MENGIRIM..." : "SUBMIT FORM"}
    </button>
  );
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-6 mt-10 border-b pb-2 text-2xl font-extrabold text-gray-900">
      {n}. {children}
    </h2>
  );
}

export default function SponsorshipForm() {
  const [state, action] = useFormState(submitSponsorship, initial);

  if (state.ok) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-primary bg-green-50 p-8 text-center">
        <p className="text-lg font-semibold text-primary">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="mx-auto max-w-3xl">
      {state.message && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{state.message}</p>
      )}

      <SectionTitle n={1}>Informasi Penyelenggara Event</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Nama Penyeleggara/Organisasi</label>
          <input name="organisasi" className="field" placeholder="Enter Your Name" />
        </div>
        <div>
          <label className="label">Nama Penanggung Jawab *</label>
          <input name="penanggungJawab" required className="field" placeholder="Enter Your Name" />
        </div>
        <div>
          <label className="label">Nomor Telepon (WA aktif) *</label>
          <input name="noWa" required className="field" placeholder="Mobile Number" />
        </div>
        <div>
          <label className="label">Email *</label>
          <input name="email" type="email" required className="field" placeholder="Email Address" />
        </div>
      </div>

      <SectionTitle n={2}>Informasi Event</SectionTitle>
      <div className="space-y-4">
        <div>
          <label className="label">Nama Event</label>
          <input name="namaEvent" className="field" placeholder="Enter Your Name" />
        </div>
        <div>
          <label className="label">Jenis Event</label>
          <div className="space-y-1">
            {JENIS_EVENT.map((j) => (
              <label key={j} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="jenisEvent" value={j} /> {j}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Tanggal Pelaksanaan *</label>
          <input name="tanggalEvent" type="date" required className="field" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Lokasi Event — Alamat Lengkap</label>
            <input name="alamatEvent" className="field" placeholder="Address Line" />
          </div>
          <div>
            <label className="label">Kota</label>
            <input name="kota" className="field" placeholder="City" />
          </div>
        </div>
      </div>

      <SectionTitle n={3}>Proposal Sponsorship</SectionTitle>
      <div className="space-y-4">
        <div>
          <label className="label">Ringkasan Proposal (boleh singkat, max 200 kata): *</label>
          <textarea name="ringkasan" rows={4} required className="field" />
        </div>
        <div>
          <label className="label">• Unggah Proposal Lengkap (PDF/Docs):</label>
          <input name="proposalFile" type="file" accept=".pdf,.doc,.docx" className="text-sm" />
        </div>
      </div>

      <SectionTitle n={4}>Bentuk Sponsorship yang Diajukan</SectionTitle>
      <p className="mb-2 text-sm text-gray-600">(Silakan centang yang sesuai)</p>
      <div className="space-y-1">
        {BENTUK_SPONSORSHIP.map((b) => (
          <label key={b} className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="bentuk" value={b} /> {b}
          </label>
        ))}
      </div>

      <SectionTitle n={5}>Manfaat untuk Sponsor</SectionTitle>
      <div className="space-y-4">
        <div>
          <label className="label">
            Sebutkan bentuk eksposur yang akan diberikan kepada Tirtonic (misalnya: logo di banner, MC mention, booth, media sosial, dll):
          </label>
          <input name="eksposur" className="field" />
        </div>
        <div>
          <label className="label">Catatan Tambahan (opsional)</label>
          <textarea name="catatan" rows={4} className="field" />
        </div>
      </div>

      <div className="mt-8">
        <SubmitButton />
      </div>
    </form>
  );
}
