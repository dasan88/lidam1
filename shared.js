const SLOT_ORDER = ["오전", "오후", "저녁"];
const DEFAULT_ROOMS = ["101호", "102호"];
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
const STORAGE_KEY = "class_schedule_entries_v1";
const ROOM_STORAGE_KEY = "class_schedule_rooms_v1";
const RESET_FLAG_KEY = "class_schedule_reset_done_v1";
const CLOUD_CONFIG_KEY = "class_schedule_cloud_config_v1";
const SUPABASE_STATE_TABLE = "app_state";
const PUBLIC_SHARE_PARAM = "share";
const PUBLIC_LIVE_SHARE_PARAM = "liveShare";
const DEFAULT_CLOUD_CONFIG = {
  url: "https://ftopmidxpuqvjsyvwsrx.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0b3BtaWR4cHVxdmpzeXZ3c3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODc2NDcsImV4cCI6MjA4NzI2MzY0N30.GDbNkq9oI1EYvIk7ylrc4N4GHUKMaLtF29bUktOPTww",
};

if (!localStorage.getItem(RESET_FLAG_KEY)) {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(RESET_FLAG_KEY, "true");
}

function isCloudSyncEnabled() {
  const cfg = getCloudConfig();
  return Boolean(cfg.url && cfg.anonKey);
}

function normalizeCloudConfig(url, anonKey) {
  return {
    url: String(url || "").trim().replace(/\/$/, "") || DEFAULT_CLOUD_CONFIG.url,
    anonKey: String(anonKey || "").trim() || DEFAULT_CLOUD_CONFIG.anonKey,
  };
}

function getCloudConfig() {
  const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
  if (!raw) return { ...DEFAULT_CLOUD_CONFIG };
  try {
    const parsed = JSON.parse(raw);
    return normalizeCloudConfig(parsed.url, parsed.anonKey);
  } catch {
    return { ...DEFAULT_CLOUD_CONFIG };
  }
}

function setCloudConfig(url, anonKey) {
  const normalized = normalizeCloudConfig(url, anonKey);
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(normalized));
  return normalized;
}

function getCloudHeaders() {
  const cfg = getCloudConfig();
  return {
    apikey: cfg.anonKey,
    Authorization: `Bearer ${cfg.anonKey}`,
    "Content-Type": "application/json",
  };
}

async function cloudRequest(path, init = {}) {
  const cfg = getCloudConfig();
  const response = await fetch(`${cfg.url}${path}`, {
    ...init,
    headers: {
      ...getCloudHeaders(),
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Cloud request failed: ${response.status}`);
  }
  return response;
}

async function cloudFetchState() {
  const response = await cloudRequest(
    `/rest/v1/${SUPABASE_STATE_TABLE}?id=eq.1&select=id,entries,rooms&limit=1`
  );
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
}

async function cloudUpsertState(entries, rooms) {
  await cloudRequest(`/rest/v1/${SUPABASE_STATE_TABLE}?on_conflict=id`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([
      {
        id: 1,
        entries,
        rooms,
      },
    ]),
  });
}

async function cloudSyncPull() {
  if (!isCloudSyncEnabled()) return false;

  try {
    const state = await cloudFetchState();
    if (!state) {
      await cloudUpsertState(loadEntries(), loadRooms());
      return true;
    }

    const entries = Array.isArray(state.entries) ? state.entries : [];
    const rooms = Array.isArray(state.rooms) && state.rooms.length > 0 ? state.rooms : DEFAULT_ROOMS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(rooms));
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function cloudSyncPush() {
  if (!isCloudSyncEnabled()) return false;

  try {
    await cloudUpsertState(loadEntries(), loadRooms());
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
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

function encodeUtf8ToBase64Url(text) {
  const source = String(text);
  let base64 = "";

  if (typeof TextEncoder !== "undefined") {
    const bytes = new TextEncoder().encode(source);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    base64 = btoa(binary);
  } else {
    // Fallback for older Safari/WebView environments.
    base64 = btoa(unescape(encodeURIComponent(source)));
  }

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64UrlToUtf8(base64Url) {
  let base64 = String(base64Url || "").replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";
  const binary = atob(base64);

  if (typeof TextDecoder !== "undefined") {
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  // Fallback for older Safari/WebView environments.
  return decodeURIComponent(escape(binary));
}

function buildPublicScheduleShareUrl() {
  const payload = {
    entries: loadEntries(),
    rooms: loadRooms(),
    generatedAt: new Date().toISOString(),
  };
  const encoded = encodeUtf8ToBase64Url(JSON.stringify(payload));
  const url = new URL("schedule.html", window.location.href);
  url.searchParams.set(PUBLIC_SHARE_PARAM, encoded);
  return url.toString();
}

function buildPublicScheduleLiveShareUrl() {
  const cfg = getCloudConfig();
  if (!cfg.url || !cfg.anonKey) return "";

  const payload = {
    url: cfg.url,
    anonKey: cfg.anonKey,
    entries: loadEntries(),
    rooms: loadRooms(),
    generatedAt: new Date().toISOString(),
  };
  const encoded = encodeUtf8ToBase64Url(JSON.stringify(payload));
  const url = new URL("schedule.html", window.location.href);
  url.searchParams.set(PUBLIC_LIVE_SHARE_PARAM, encoded);
  return url.toString();
}

function readPublicScheduleSharePayload() {
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get(PUBLIC_SHARE_PARAM);
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(decodeBase64UrlToUtf8(encoded));
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      rooms:
        Array.isArray(parsed.rooms) && parsed.rooms.length > 0 ? parsed.rooms : [...DEFAULT_ROOMS],
      generatedAt: String(parsed.generatedAt || ""),
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

function readPublicScheduleLiveSharePayload() {
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get(PUBLIC_LIVE_SHARE_PARAM);
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(decodeBase64UrlToUtf8(encoded));
    return {
      url: String(parsed.url || "").trim().replace(/\/$/, ""),
      anonKey: String(parsed.anonKey || "").trim(),
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      rooms:
        Array.isArray(parsed.rooms) && parsed.rooms.length > 0 ? parsed.rooms : [...DEFAULT_ROOMS],
      generatedAt: String(parsed.generatedAt || ""),
    };
  } catch (error) {
    console.error(error);
    return null;
  }
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
