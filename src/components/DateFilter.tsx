"use client";

import { useRouter, useSearchParams } from "next/navigation";

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export default function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("date") || "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 8 }, (_, i) => {
    const date = addDays(today, i);
    const iso = toISODate(date);
    const weekday = date.toLocaleDateString("pt-PT", { weekday: "short" });
    const label = date.toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "short",
    });
    return { iso, weekday, label, offset: i };
  });

  function selectDate(iso: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (iso) params.set("date", iso);
    else params.delete("date");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <div className="mb-6">
      <p className="text-xs font-medium text-slate-500 mb-2">Data</p>
      <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
        <button
          onClick={() => selectDate("")}
          className={`snap-start shrink-0 px-4 py-2 rounded-2xl text-sm font-medium border transition-colors ${
            !current
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-slate-700 border-slate-200"
          }`}
        >
          Todas
        </button>
        {days.map((day) => (
          <button
            key={day.iso}
            onClick={() => selectDate(day.iso)}
            className={`snap-start shrink-0 min-w-[72px] px-3 py-2 rounded-2xl text-sm border transition-colors ${
              current === day.iso
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            <span className="block text-[11px] uppercase opacity-80">
              {day.offset === 0 ? "Hoje" : day.weekday}
            </span>
            <span className="block font-semibold">{day.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
