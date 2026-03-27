"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const YEAR_START = 1990;
const YEAR_END   = 2060;
const YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i);

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDay(y: number, m: number)    { return new Date(y, m, 1).getDay(); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

interface CalendarProps {
  mode?: "single";
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: ((date: Date) => boolean) | boolean;
  initialFocus?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

/* Scrollbar styles injected once into <head> */
const SCROLLBAR_CSS = `
.cal-scroll::-webkit-scrollbar {
  width: 6px;
}
.cal-scroll::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 99px;
}
.cal-scroll::-webkit-scrollbar-thumb {
  background: #9ca3af;
  border-radius: 99px;
}
.cal-scroll::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
`;

function injectScrollbarCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("cal-scrollbar-style")) return;
  const style = document.createElement("style");
  style.id = "cal-scrollbar-style";
  style.textContent = SCROLLBAR_CSS;
  document.head.appendChild(style);
}

function Calendar({ selected, onSelect, disabled: disabledProp, className, minDate, maxDate }: CalendarProps) {
  const today = new Date();

  const [viewYear,      setViewYear]      = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth,     setViewMonth]     = useState(selected?.getMonth()    ?? today.getMonth());
  const [yearDropOpen,  setYearDropOpen]  = useState(false);
  const [monthDropOpen, setMonthDropOpen] = useState(false);

  const yearListRef  = useRef<HTMLDivElement>(null);
  const monthListRef = useRef<HTMLDivElement>(null);

  useEffect(() => { injectScrollbarCSS(); }, []);

  useEffect(() => {
    if (selected) { setViewYear(selected.getFullYear()); setViewMonth(selected.getMonth()); }
  }, [selected]);

  useEffect(() => {
    if (yearDropOpen && yearListRef.current) {
      const el = yearListRef.current.querySelector("[data-sel='true']") as HTMLElement | null;
      el?.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [yearDropOpen]);

  useEffect(() => {
    if (monthDropOpen && monthListRef.current) {
      const el = monthListRef.current.querySelector("[data-sel='true']") as HTMLElement | null;
      el?.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [monthDropOpen]);

  const isDisabled = (date: Date) => {
    if (minDate && startOfDay(date) < startOfDay(minDate)) return true;
    if (maxDate && startOfDay(date) > startOfDay(maxDate)) return true;
    if (typeof disabledProp === "function") return disabledProp(date);
    if (typeof disabledProp === "boolean")  return disabledProp;
    return false;
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay  = firstDay(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (isDisabled(d)) return;
    onSelect?.(d);
  };

  const isSelected = (day: number) => selected ? sameDay(new Date(viewYear, viewMonth, day), selected) : false;
  const isToday    = (day: number) => sameDay(new Date(viewYear, viewMonth, day), today);

  return (
    <div className={cn("bg-white border border-gray-200 rounded-xl shadow-xl w-[272px] font-sans", className)}>

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">

        {/* Month + Year dropdowns */}
        <div className="flex items-center gap-2 mb-3">

          {/* Month */}
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => { setMonthDropOpen(o => !o); setYearDropOpen(false); }}
              className="w-full flex items-center justify-between gap-1 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-sm font-semibold text-gray-800 transition-colors"
            >
              {MONTHS[viewMonth].slice(0, 3)}
              <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", monthDropOpen && "rotate-180")} />
            </button>

            {monthDropOpen && (
              <div
                ref={monthListRef}
                className="cal-scroll absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl w-36 overflow-y-scroll"
                style={{ maxHeight: "208px" }}
              >
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    data-sel={i === viewMonth}
                    onClick={() => { setViewMonth(i); setMonthDropOpen(false); }}
                    className={cn(
                      "w-full text-left text-sm px-3 py-2 transition-colors",
                      i === viewMonth
                        ? "bg-gray-900 text-white font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Year */}
          <div className="relative w-24">
            <button
              type="button"
              onClick={() => { setYearDropOpen(o => !o); setMonthDropOpen(false); }}
              className="w-full flex items-center justify-between gap-1 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-sm font-semibold text-gray-800 transition-colors"
            >
              {viewYear}
              <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", yearDropOpen && "rotate-180")} />
            </button>

            {yearDropOpen && (
              <div
                ref={yearListRef}
                className="cal-scroll absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl w-28 overflow-y-scroll"
                style={{ maxHeight: "208px" }}
              >
                {YEARS.map(y => (
                  <button
                    key={y}
                    type="button"
                    data-sel={y === viewYear}
                    onClick={() => { setViewYear(y); setYearDropOpen(false); }}
                    className={cn(
                      "w-full text-center text-sm py-2 transition-colors",
                      y === viewYear
                        ? "bg-gray-900 text-white font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Month prev/next */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-gray-700 tracking-wide">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Day grid ── */}
      <div className="px-3 py-3">
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1 tracking-wider">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const dis = isDisabled(new Date(viewYear, viewMonth, day));
            const sel = isSelected(day);
            const tod = isToday(day);
            return (
              <button
                key={day}
                type="button"
                disabled={dis}
                onClick={() => handleDay(day)}
                className={cn(
                  "h-8 w-full rounded-lg text-[13px] font-medium transition-all duration-100",
                  dis  ? "text-gray-200 cursor-not-allowed"
                  : sel ? "bg-gray-900 text-white shadow-sm"
                  : tod ? "bg-gray-100 text-gray-900 ring-1 ring-gray-400 font-bold hover:bg-gray-200"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (!isDisabled(today)) {
              onSelect?.(today);
              setViewYear(today.getFullYear());
              setViewMonth(today.getMonth());
            }
          }}
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors hover:underline underline-offset-2"
        >
          Today
        </button>
        {selected && (
          <span className="text-xs text-gray-400">
            {selected.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        )}
        <button
          type="button"
          onClick={() => onSelect?.(undefined)}
          className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

Calendar.displayName = "Calendar";
export { Calendar };