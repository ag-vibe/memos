import type { MemoSummary } from "@/api-gen/types.gen";

interface ActivityGraphProps {
  memos: MemoSummary[];
}

function getDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getLast84Days(): string[] {
  const days: string[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(getDayKey(d));
  }
  return days;
}

export function ActivityGraph({ memos }: ActivityGraphProps) {
  const days = getLast84Days();
  const counts = new Map<string, number>();

  for (const memo of memos) {
    const key = getDayKey(new Date(memo.createdAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const max = Math.max(1, ...Array.from(counts.values()));

  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const totalMemos = memos.length;
  const activeDays = counts.size;
  const today = getDayKey(new Date());
  const todayCount = counts.get(today) ?? 0;

  function getColor(count: number): string {
    if (count === 0) return "bg-foreground/6";
    const level = Math.ceil((count / max) * 4);
    if (level >= 4) return "bg-accent";
    if (level === 3) return "bg-accent/75";
    if (level === 2) return "bg-accent/45";
    return "bg-accent/20";
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-5 rounded-lg bg-gradient-to-br from-accent/5 to-accent/[0.02] p-2.5">
        <div>
          <div className="text-2xl font-bold text-foreground">{totalMemos}</div>
          <div className="text-xs text-foreground/50">total memos</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{activeDays}</div>
          <div className="text-xs text-foreground/50">active days</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-accent">{todayCount}</div>
          <div className="text-xs text-foreground/50">today</div>
        </div>
      </div>

      {/* Grid — stretch to fill container */}
      <div className="w-full">
        <div className="flex gap-[3px] w-full">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px] flex-1">
              {week.map((day) => {
                const count = counts.get(day) ?? 0;
                return (
                  <div
                    key={day}
                    title={`${day}: ${count} memo${count !== 1 ? "s" : ""}`}
                    className={[
                      "w-full aspect-square rounded-sm transition-colors cursor-default",
                      getColor(count),
                    ].join(" ")}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-foreground/30">
          <span>12 weeks</span>
          <div className="flex items-center gap-1">
            <span>less</span>
            {["bg-foreground/6", "bg-accent/20", "bg-accent/45", "bg-accent/75", "bg-accent"].map(
              (c, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
              ),
            )}
            <span>more</span>
          </div>
        </div>
      </div>
    </div>
  );
}
