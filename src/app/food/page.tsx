import Link from "next/link";
import { formatSGD } from "@/lib/utils";

export const metadata = { title: "Restaurant & Bistro" };

const MAINS = [
  { n: "Swedish meatballs, 12 pcs", d: "Mash, cream sauce, lingonberry", c: 1290 },
  { n: "Plant balls, 12 pcs", d: "Pea-protein, same trimmings", c: 1090 },
  { n: "Salmon fillet, mustard-dill", d: "Butter rice, seasonal greens", c: 1590 },
  { n: "Chicken schnitzel", d: " fries, mixed salad", c: 1190 },
  { n: "Kids pasta & meatballs", d: "Small portion, fruit cup", c: 590 },
  { n: "Festive Christmas plate", d: "Turkey, ham, red cabbage, gravy", c: 1690 },
];
const BISTRO = [
  { n: "Hot dog", c: 200 }, { n: "Cinnamon bun", c: 350 }, { n: "Soft-serve", c: 200 }, { n: "Cold brew lingonberry", c: 450 },
];

export default function FoodPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#2e6b34]">Restaurant · Bistro · Swedish Food Market</p>
      <h1 className="mt-1 text-[clamp(1.9rem,4vw,3rem)] font-black tracking-tight">Come hungry, leave with a bookshelf</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="text-[20px] font-black">Restaurant mains</h2>
          <ul className="mt-3 divide-y divide-[#eee] rounded-2xl ring-1 ring-[#ece8df]">
            {MAINS.map((m) => (
              <li key={m.n} className="flex items-center justify-between gap-4 p-4">
                <span><span className="block font-bold">{m.n}</span><span className="text-[13px] text-[#5b5b5b]">{m.d}</span></span>
                <span className="font-black">{formatSGD(m.c)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-[#5b5b5b]">Family members: free coffee Mon–Fri with any main · Kids eat free Sundays (1 kid per adult main).</p>
          <h2 className="mt-8 text-[20px] font-black">Bistro grab & go</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BISTRO.map((b) => (
              <div key={b.n} className="rounded-xl bg-[#f5f3ee] p-4 text-center"><p className="font-bold text-[14px]">{b.n}</p><p className="mt-1 font-black">{formatSGD(b.c)}</p></div>
            ))}
          </div>
        </div>
        <aside className="h-fit rounded-2xl bg-[#ffdb00] p-6">
          <h2 className="font-black">Festive opening hours</h2>
          <ul className="mt-2 space-y-1.5 text-[14px]">
            <li className="flex justify-between"><span>Tampines restaurant</span><strong>09:30–21:00</strong></li>
            <li className="flex justify-between"><span>Jurong restaurant</span><strong>09:30–21:00</strong></li>
            <li className="flex justify-between"><span>Alexandra bistro</span><strong>10:00–20:00</strong></li>
            <li className="flex justify-between"><span>Christmas Eve</span><strong>till 18:00</strong></li>
          </ul>
          <Link href="/stores" className="mt-4 block rounded-full bg-black py-3 text-center text-[14px] font-bold text-white">Plan your visit →</Link>
        </aside>
      </div>
    </div>
  );
}
