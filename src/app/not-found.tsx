import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="text-[64px]" aria-hidden="true">🪑</p>
      <h1 className="mt-2 text-[32px] font-black">This page went flat-pack</h1>
      <p className="mt-2 text-[#5b5b5b]">It may have moved or never existed. Let&apos;s get you back to beautiful rooms.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="rounded-full bg-[#0058a3] px-7 py-3 font-bold text-white">Home</Link>
        <Link href="/shop" className="rounded-full border px-7 py-3 font-bold">Shop all</Link>
      </div>
    </div>
  );
}
