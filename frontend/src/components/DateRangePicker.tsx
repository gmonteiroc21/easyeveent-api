import { useEffect, useMemo, useRef, useState } from "react";

type DateRangeValue = {
  start: string;
  end: string;
};

type DateRangePickerProps = {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  placeholder?: string;
};

const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatLabel(value: DateRangeValue): string {
  if (!value.start && !value.end) return "";
  if (value.start && value.end) {
    if (value.start === value.end) return fromYmd(value.start).toLocaleDateString("pt-BR");
    return `${fromYmd(value.start).toLocaleDateString("pt-BR")} - ${fromYmd(value.end).toLocaleDateString("pt-BR")}`;
  }
  return fromYmd(value.start || value.end).toLocaleDateString("pt-BR");
}

function buildCalendarDays(monthDate: Date): Array<{ key: string; date: Date | null }> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const leading = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const cells: Array<{ key: string; date: Date | null }> = [];

  for (let i = 0; i < leading; i += 1) {
    cells.push({ key: `empty-start-${i}`, date: null });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ key: toYmd(date), date });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-end-${cells.length}`, date: null });
  }

  return cells;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Período",
}: DateRangePickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    if (value.start) return fromYmd(value.start);
    return new Date();
  });

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const days = useMemo(() => buildCalendarDays(monthCursor), [monthCursor]);

  const label = formatLabel(value);

  function pickDate(ymd: string) {
    const { start, end } = value;

    if (!start || (start && end)) {
      onChange({ start: ymd, end: ymd });
      return;
    }

    if (ymd < start) {
      onChange({ start: ymd, end: start });
      return;
    }

    onChange({ start, end: ymd });
  }

  function isInRange(ymd: string): boolean {
    if (!value.start || !value.end) return false;
    return ymd >= value.start && ymd <= value.end;
  }

  function isEdge(ymd: string): boolean {
    return ymd === value.start || ymd === value.end;
  }

  return (
    <div className="dateRangePicker" ref={rootRef}>
      <input
        readOnly
        value={label}
        placeholder={placeholder}
        onClick={() => setOpen((current) => !current)}
        aria-label="Selecionar período"
      />

      {open && (
        <div className="dateRangePopover" role="dialog" aria-modal="false">
          <header className="dateRangeHeader">
            <button
              type="button"
              className="linkBtn"
              onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            >
              ←
            </button>
            <strong>
              {monthCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </strong>
            <button
              type="button"
              className="linkBtn"
              onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            >
              →
            </button>
          </header>

          <div className="dateRangeWeekRow">
            {WEEK_LABELS.map((labelText) => (
              <span key={labelText}>{labelText}</span>
            ))}
          </div>

          <div className="dateRangeGrid">
            {days.map((cell) => {
              if (!cell.date) return <span key={cell.key} className="dateCell empty" />;

              const ymd = toYmd(cell.date);
              const inRange = isInRange(ymd);
              const edge = isEdge(ymd);

              return (
                <button
                  key={cell.key}
                  type="button"
                  className={`dateCell ${inRange ? "inRange" : ""} ${edge ? "edge" : ""}`.trim()}
                  onClick={() => pickDate(ymd)}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          <footer className="dateRangeFooter">
            <button type="button" className="btn" onClick={() => onChange({ start: "", end: "" })}>
              Limpar
            </button>
            <button type="button" className="btn primary" onClick={() => setOpen(false)}>
              Aplicar
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}

export type { DateRangeValue };
