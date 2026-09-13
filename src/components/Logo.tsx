import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" aria-label="Tirtonic — Home" className="flex">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Tirtonic" width={52} height={52} className="block h-[52px] w-[52px]" />
    </Link>
  );
}
