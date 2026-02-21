const SLOT_ORDER = ["오전", "오후", "저녁"];
const DEFAULT_ROOMS = ["101호", "102호"];
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
const STORAGE_KEY = "class_schedule_entries_v1";
const ROOM_STORAGE_KEY = "class_schedule_rooms_v1";
const RESET_FLAG_KEY = "class_schedule_reset_done_v1";

if (!localStorage.getItem(RESET_FLAG_KEY)) {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(RESET_FLAG_KEY, "true");
}

function formatDateOnly(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateOnly(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatHeaderDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = dateObj.getMonth() + 1;
  const d = dateObj.getDate();
  const weekday = WEEKDAY_KO[dateObj.getDay()];
  return `${y}년 ${m}월 ${d}일 (${weekday})`;
}

function updateCurrentDateTime(targetElement, options = {}) {
  const showYear = options.showYear !== false;
  const prefix = options.prefix ?? "현재: ";
  const now = new Date();
  const yy = now.getFullYear();
  const mm = now.getMonth() + 1;
  const dd = now.getDate();
  const weekday = WEEKDAY_KO[now.getDay()];
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const sec = String(now.getSeconds()).padStart(2, "0");
  const dateText = showYear
    ? `${yy}년 ${mm}월 ${dd}일 (${weekday})`
    : `${mm}월 ${dd}일 (${weekday})`;
  targetElement.textContent = `${prefix}${dateText} ${hh}:${min}:${sec}`.trim();
}

function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadRooms() {
  const raw = localStorage.getItem(ROOM_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(DEFAULT_ROOMS));
    return [...DEFAULT_ROOMS];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_ROOMS];

    const normalized = parsed
      .map((room) => String(room).trim())
      .filter((room, idx, arr) => room && arr.indexOf(room) === idx);

    if (normalized.length === 0) return [...DEFAULT_ROOMS];
    return normalized;
  } catch {
    return [...DEFAULT_ROOMS];
  }
}

function saveRooms(rooms) {
  const normalized = rooms
    .map((room) => String(room).trim())
    .filter((room, idx, arr) => room && arr.indexOf(room) === idx);
  if (normalized.length === 0) return;
  localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(normalized));
}

function isEntryActiveOn(entry, targetDate, slot, room) {
  if (entry.room !== room) return false;

  const weekday = WEEKDAY_KO[targetDate.getDay()];
  if (!entry.weekdays || !Array.isArray(entry.weekdays) || !entry.weekdays.includes(weekday)) {
    return false;
  }

  const startDate = parseDateOnly(entry.startDate);
  const endDate = parseDateOnly(entry.endDate);
  if (targetDate < startDate || targetDate > endDate) return false;

  const slotIndex = SLOT_ORDER.indexOf(slot);
  const startSlotIndex = SLOT_ORDER.indexOf(entry.startSlot);
  const endSlotIndex = SLOT_ORDER.indexOf(entry.endSlot);
  if (slotIndex < startSlotIndex || slotIndex > endSlotIndex) return false;

  return true;
}
