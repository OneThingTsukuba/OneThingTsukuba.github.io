export type CalendarEventKind = 'mokumoku' | 'lt' | 'study' | 'project' | 'event';

export type CalendarEvent = {
  uid: string;
  summary: string;
  description: string;
  shortDescription: string;
  location: string;
  locationShort: string;
  start: Date;
  end: Date;
  allDay: boolean;
  kind: CalendarEventKind;
  statusLabel: string;
  url: string | null;
};

export type CalendarDashboard = {
  sourceUrl: string;
  fetchedAt: Date;
  events: CalendarEvent[];
  allEventCount: number;
  fetchError: string | null;
};

const CALENDAR_ICS_URL =
  'https://calendar.google.com/calendar/ical/onething.tsukuba%40gmail.com/public/basic.ics';

const TOKYO_TIME_ZONE = 'Asia/Tokyo';
const DAY_MS = 24 * 60 * 60 * 1000;

export async function getCalendarDashboard(limit = 12): Promise<CalendarDashboard> {
  const fetchedAt = new Date();

  try {
    const response = await fetch(CALENDAR_ICS_URL, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`ICS request failed with ${response.status}`);
    }

    const ics = await response.text();
    const events = parseCalendarEvents(ics, fetchedAt)
      .filter((event) => event.end.getTime() >= fetchedAt.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    return {
      sourceUrl: CALENDAR_ICS_URL,
      fetchedAt,
      events: events.slice(0, limit),
      allEventCount: events.length,
      fetchError: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown calendar error';
    console.warn(`[calendar] ${message}`);

    return {
      sourceUrl: CALENDAR_ICS_URL,
      fetchedAt,
      events: [],
      allEventCount: 0,
      fetchError: message,
    };
  }
}

export function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: TOKYO_TIME_ZONE,
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

export function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: TOKYO_TIME_ZONE,
    weekday: 'short',
  }).format(date);
}

export function formatTimeRange(event: CalendarEvent): string {
  if (event.allDay) {
    return '終日';
  }

  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: TOKYO_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  return `${formatter.format(event.start)} - ${formatter.format(event.end)}`;
}

export function formatDuration(event: CalendarEvent): string {
  if (event.allDay) {
    return '1日';
  }

  const minutes = Math.max(0, Math.round((event.end.getTime() - event.start.getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (hours > 0 && restMinutes > 0) {
    return `${hours}時間${restMinutes}分`;
  }

  if (hours > 0) {
    return `${hours}時間`;
  }

  return `${restMinutes}分`;
}

export function formatRelativeDay(event: CalendarEvent, now = new Date()): string {
  if (event.start.getTime() <= now.getTime() && event.end.getTime() >= now.getTime()) {
    return '開催中';
  }

  const today = jstDateKey(now);
  const eventDay = jstDateKey(event.start);
  const tomorrow = jstDateKey(new Date(now.getTime() + DAY_MS));

  if (eventDay === today) {
    return '今日';
  }

  if (eventDay === tomorrow) {
    return '明日';
  }

  const diffDays = Math.ceil((startOfJstDay(event.start).getTime() - startOfJstDay(now).getTime()) / DAY_MS);

  if (diffDays > 0 && diffDays < 7) {
    return `${diffDays}日後`;
  }

  return formatDateLabel(event.start);
}

export function formatFetchedAt(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: TOKYO_TIME_ZONE,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function parseCalendarEvents(ics: string, now: Date): CalendarEvent[] {
  return splitEvents(unfoldIcs(ics))
    .map((lines) => parseEvent(lines, now))
    .filter((event): event is CalendarEvent => event !== null);
}

function unfoldIcs(ics: string): string[] {
  const rawLines = ics.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines: string[] = [];

  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }

  return lines;
}

function splitEvents(lines: string[]): string[][] {
  const events: string[][] = [];
  let current: string[] | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = [];
      continue;
    }

    if (line === 'END:VEVENT') {
      if (current) {
        events.push(current);
      }

      current = null;
      continue;
    }

    if (current) {
      current.push(line);
    }
  }

  return events;
}

function parseEvent(lines: string[], now: Date): CalendarEvent | null {
  const fields = new Map<string, IcsField>();
  let status = 'CONFIRMED';

  for (const line of lines) {
    const field = parseField(line);

    if (!field) {
      continue;
    }

    if (field.name === 'STATUS') {
      status = field.value;
    }

    if (!fields.has(field.name)) {
      fields.set(field.name, field);
    }
  }

  if (status === 'CANCELLED') {
    return null;
  }

  const startField = fields.get('DTSTART');
  const start = startField ? parseIcsDate(startField.value, startField.params) : null;

  if (!start) {
    return null;
  }

  const endField = fields.get('DTEND');
  const parsedEnd = endField ? parseIcsDate(endField.value, endField.params) : null;
  const end = parsedEnd?.date ?? new Date(start.date.getTime() + 60 * 60 * 1000);

  const summary = cleanText(fields.get('SUMMARY')?.value ?? '名称未設定のイベント');
  const description = cleanText(fields.get('DESCRIPTION')?.value ?? '');
  const location = cleanText(fields.get('LOCATION')?.value ?? '');
  const kind = classifyEvent(summary);

  return {
    uid: cleanText(fields.get('UID')?.value ?? `${summary}-${start.date.toISOString()}`),
    summary,
    description,
    shortDescription: summarizeDescription(description),
    location,
    locationShort: shortenLocation(location),
    start: start.date,
    end,
    allDay: start.allDay,
    kind,
    statusLabel: getStatusLabel(start.date, end, now),
    url: findEventUrl(description),
  };
}

type IcsField = {
  name: string;
  params: string[];
  value: string;
};

function parseField(line: string): IcsField | null {
  const separatorIndex = line.indexOf(':');

  if (separatorIndex === -1) {
    return null;
  }

  const key = line.slice(0, separatorIndex);
  const value = line.slice(separatorIndex + 1);
  const [name, ...params] = key.split(';');

  return {
    name: name.toUpperCase(),
    params,
    value,
  };
}

function parseIcsDate(value: string, params: string[]): { date: Date; allDay: boolean } | null {
  const isAllDay = params.some((param) => param.toUpperCase() === 'VALUE=DATE') || /^\d{8}$/.test(value);
  const dateMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);

  if (isAllDay && dateMatch) {
    const [, year, month, day] = dateMatch;
    return {
      date: new Date(`${year}-${month}-${day}T00:00:00+09:00`),
      allDay: true,
    };
  }

  const dateTimeMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);

  if (!dateTimeMatch) {
    return null;
  }

  const [, year, month, day, hour, minute, second, utc] = dateTimeMatch;
  const offset = utc === 'Z' ? 'Z' : '+09:00';

  return {
    date: new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`),
    allDay: false,
  };
}

function cleanText(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function summarizeDescription(description: string): string {
  const text = description
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.includes('あなたがこのイベントのホストです'))
    .filter((line) => !line.includes('イベントの管理は'))
    .filter((line) => !line.startsWith('公開ページは'))
    .filter((line) => !line.startsWith('住所:'))
    .filter((line) => !line.startsWith('ホスト:'))
    .filter((line) => !/^https?:\/\//.test(line))
    .join(' ');

  if (text.length <= 120) {
    return text;
  }

  return `${text.slice(0, 119)}...`;
}

function shortenLocation(location: string): string {
  if (!location) {
    return '会場未定';
  }

  return location.split(/,|、〒|〒/)[0].trim();
}

function findEventUrl(description: string): string | null {
  const urls = description.match(/https?:\/\/[^\s)]+/g) ?? [];
  const publicLumaUrl = urls.find((url) => url.includes('luma.com/event/') && !url.includes('/manage/'));

  return publicLumaUrl ?? urls[0] ?? null;
}

function classifyEvent(summary: string): CalendarEventKind {
  if (/もくもく/.test(summary)) {
    return 'mokumoku';
  }

  if (/LT/i.test(summary)) {
    return 'lt';
  }

  if (/勉強|Claude|Git|Workshop|ワークショップ/i.test(summary)) {
    return 'study';
  }

  if (/プロジェクト|協賛|企業/.test(summary)) {
    return 'project';
  }

  return 'event';
}

function getStatusLabel(start: Date, end: Date, now: Date): string {
  if (start.getTime() <= now.getTime() && end.getTime() >= now.getTime()) {
    return 'Live';
  }

  return 'Upcoming';
}

function jstDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: TOKYO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

function startOfJstDay(date: Date): Date {
  return new Date(`${jstDateKey(date)}T00:00:00+09:00`);
}
