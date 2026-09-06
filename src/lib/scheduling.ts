export const SCHEDULE_TIME_ZONE = "America/Sao_Paulo";
export const WEEK_DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const CALENDAR_DAYS = [1, 2, 3, 4, 5, 6, 0];

export type WeeklySchedule = {
  id: string;
  tvId: string;
  playlistId: string;
  name: string;
  days: number[];
  startMinute: number;
  endMinute: number;
};

const clock = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCHEDULE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function wallClock(date: Date) {
  const parts = Object.fromEntries(clock.formatToParts(date).map((p) => [p.type, p.value]));
  return new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second));
}

// Convert a civil time in São Paulo to an instant, independent of the host timezone.
function instantForWallTime(wall: Date) {
  let instant = new Date(wall);
  for (let i = 0; i < 3; i++) {
    instant = new Date(instant.getTime() + wall.getTime() - wallClock(instant).getTime());
  }
  return instant;
}

export function formatMinute(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function parseTime(value: string) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) && value !== "24:00") return NaN;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function findScheduleConflicts<T extends WeeklySchedule>(candidate: Omit<WeeklySchedule, "id" | "name" | "playlistId"> & { id?: string }, schedules: T[]) {
  return schedules.filter((s) => s.tvId === candidate.tvId && s.id !== candidate.id &&
    s.days.some((day) => candidate.days.includes(day)) &&
    candidate.startMinute < s.endMinute && candidate.endMinute > s.startMinute);
}

export function resolveWeeklySchedule<T extends WeeklySchedule>(schedules: T[], now = new Date()) {
  const local = wallClock(now);
  const day = local.getUTCDay();
  const minute = local.getUTCHours() * 60 + local.getUTCMinutes();
  const active = schedules.find((s) => s.days.includes(day) && s.startMinute <= minute && minute < s.endMinute) ?? null;
  let next: { schedule: T; startsAt: string } | null = null;

  for (const schedule of schedules) {
    for (const scheduledDay of schedule.days) {
      let daysAhead = (scheduledDay - day + 7) % 7;
      if (daysAhead === 0 && schedule.startMinute <= minute) daysAhead = 7;
      const start = new Date(local);
      start.setUTCDate(start.getUTCDate() + daysAhead);
      start.setUTCHours(0, schedule.startMinute, 0, 0);
      const startsAt = instantForWallTime(start).toISOString();
      if (!next || startsAt < next.startsAt) next = { schedule, startsAt };
    }
  }

  let nextChangeAt = next?.startsAt ?? null;
  if (active) {
    const end = new Date(local);
    end.setUTCHours(0, active.endMinute, 0, 0);
    nextChangeAt = instantForWallTime(end).toISOString();
  }
  return { active, next, nextChangeAt };
}

export function formatScheduleDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SCHEDULE_TIME_ZONE, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}
