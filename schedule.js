const nowEl = document.getElementById("now");
const scheduleHead = document.getElementById("schedule-head");
const scheduleBody = document.getElementById("schedule-body");
const scheduleMobileList = document.getElementById("schedule-mobile-list");
const viewDateInput = document.getElementById("view-date");
const prevDayBtn = document.getElementById("prev-day");
const nextDayBtn = document.getElementById("next-day");
const tableFocusBtn = document.getElementById("table-focus-btn");
const scheduleRoot = document.getElementById("schedule-root");
const roomFilterEl = document.getElementById("room-filter");
const classSearchEl = document.getElementById("class-search");
const CAL_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const CHIP_THEMES = [
  { bg: "linear-gradient(180deg, #e8f1ff 0%, #d9e8ff 100%)", border: "#b6cdf7", name: "#0b3c85", time: "#0a5bd3" },
  { bg: "linear-gradient(180deg, #e8fff2 0%, #d4f5e4 100%)", border: "#9cd8bb", name: "#145a3a", time: "#17754a" },
  { bg: "linear-gradient(180deg, #fff3e8 0%, #ffe1c7 100%)", border: "#f0bf8f", name: "#8a4d17", time: "#a6601f" },
  { bg: "linear-gradient(180deg, #f1ebff 0%, #e0d3ff 100%)", border: "#c4b0f6", name: "#4d2b87", time: "#5f39a3" },
  { bg: "linear-gradient(180deg, #ffeaf1 0%, #ffd5e5 100%)", border: "#f3b1cd", name: "#8b2755", time: "#a73567" },
];

let pickerBackdropEl = null;
let pickerPopoverEl = null;
let pickerViewMonth = new Date();
let sharedPayload = null;
let isLiveShareMode = false;
let liveShareSnapshot = null;
let hasLiveDataLoaded = false;
let isTableFocusFallback = false;

function getThemeIndex(key) {
  const text = String(key || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % CHIP_THEMES.length;
}

function getDayThemeIndex(dateStr) {
  return getThemeIndex(`day:${dateStr}`);
}

function getEntryThemeKey(entry) {
  return entry.id || entry.name;
}

function buildDayThemeMap(entries, viewDate, rooms) {
  const map = new Map();
  const used = new Set();

  entries.forEach((entry) => {
    const isActiveToday = rooms.some((room) =>
      SLOT_ORDER.some((slot) => isEntryActiveOn(entry, viewDate, slot, room))
    );
    if (!isActiveToday) return;

    const key = getEntryThemeKey(entry);
    if (map.has(key)) return;

    let idx = getThemeIndex(key);
    while (used.has(idx) && used.size < CHIP_THEMES.length) {
      idx = (idx + 1) % CHIP_THEMES.length;
    }
    used.add(idx);
    map.set(key, idx);
  });

  return map;
}

function renderRoomFilterOptions(rooms) {
  const prev = roomFilterEl.value || "all";
  roomFilterEl.innerHTML = `<option value="all">전체 강의실</option>`;
  rooms.forEach((room) => {
    const option = document.createElement("option");
    option.value = room;
    option.textContent = room;
    roomFilterEl.appendChild(option);
  });

  if (prev === "all" || rooms.includes(prev)) {
    roomFilterEl.value = prev;
  } else {
    roomFilterEl.value = "all";
  }
}

function normalizeSearchText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function closeDatePicker() {
  if (pickerBackdropEl) pickerBackdropEl.remove();
  if (pickerPopoverEl) pickerPopoverEl.remove();
  pickerBackdropEl = null;
  pickerPopoverEl = null;
}

function positionDatePicker() {
  if (!pickerPopoverEl) return;
  const rect = viewDateInput.getBoundingClientRect();
  const popoverWidth = 360;
  const left = Math.min(
    window.scrollX + rect.left,
    window.scrollX + window.innerWidth - popoverWidth - 12
  );
  const top = window.scrollY + rect.bottom + 8;
  pickerPopoverEl.style.left = `${Math.max(12, left)}px`;
  pickerPopoverEl.style.top = `${top}px`;
}

function renderDatePicker() {
  if (!pickerPopoverEl) return;

  const year = pickerViewMonth.getFullYear();
  const month = pickerViewMonth.getMonth();
  const selected = viewDateInput.value ? parseDateOnly(viewDateInput.value) : null;

  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    cells.push({ day: prevMonthDays - i, monthOffset: -1 });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ day: d, monthOffset: 0 });
  }
  while (cells.length < 42) {
    cells.push({ day: cells.length - (firstWeekday + daysInMonth) + 1, monthOffset: 1 });
  }

  pickerPopoverEl.innerHTML = `
    <div class="date-picker-header">
      <button type="button" id="dp-prev">&lt;</button>
      <div class="date-picker-title">${year}년 ${month + 1}월</div>
      <button type="button" id="dp-next">&gt;</button>
    </div>
    <div class="date-picker-weekdays">
      ${CAL_WEEKDAYS.map((w) => `<div>${w}</div>`).join("")}
    </div>
    <div class="date-picker-grid">
      ${cells
        .map((cell) => {
          const d = new Date(year, month + cell.monthOffset, cell.day);
          const value = formatDateOnly(d);
          const isSelected = selected && formatDateOnly(selected) === value;
          const className = [
            "date-picker-day",
            cell.monthOffset !== 0 ? "is-out" : "",
            isSelected ? "is-selected" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return `<button type="button" class="${className}" data-date="${value}">${cell.day}</button>`;
        })
        .join("")}
    </div>
  `;

  pickerPopoverEl.querySelector("#dp-prev").addEventListener("click", () => {
    pickerViewMonth = new Date(year, month - 1, 1);
    renderDatePicker();
  });
  pickerPopoverEl.querySelector("#dp-next").addEventListener("click", () => {
    pickerViewMonth = new Date(year, month + 1, 1);
    renderDatePicker();
  });
  pickerPopoverEl.querySelectorAll(".date-picker-day").forEach((btn) => {
    btn.addEventListener("click", () => {
      viewDateInput.value = btn.dataset.date;
      closeDatePicker();
      renderSchedule();
    });
  });
}

function openDatePicker() {
  closeDatePicker();
  pickerViewMonth = viewDateInput.value ? parseDateOnly(viewDateInput.value) : new Date();
  pickerViewMonth.setDate(1);

  pickerBackdropEl = document.createElement("div");
  pickerBackdropEl.className = "date-picker-backdrop";
  pickerBackdropEl.addEventListener("click", closeDatePicker);

  pickerPopoverEl = document.createElement("div");
  pickerPopoverEl.className = "date-picker-popover";

  document.body.appendChild(pickerBackdropEl);
  document.body.appendChild(pickerPopoverEl);
  renderDatePicker();
  positionDatePicker();
}

function renderScheduleHead(rooms) {
  scheduleHead.innerHTML = "";
  const tr = document.createElement("tr");

  const firstTh = document.createElement("th");
  firstTh.textContent = "강의실";
  tr.appendChild(firstTh);

  SLOT_ORDER.forEach((slot) => {
    const th = document.createElement("th");
    th.textContent = slot;
    tr.appendChild(th);
  });

  scheduleHead.appendChild(tr);
}

function createClassChip(entry, slot, themeIndex) {
  const chip = document.createElement("div");
  chip.className = "class-chip";
  const theme = CHIP_THEMES[themeIndex];
  chip.style.setProperty("--chip-bg", theme.bg);
  chip.style.setProperty("--chip-border", theme.border);
  chip.style.setProperty("--chip-name-color", theme.name);
  chip.style.setProperty("--chip-time-color", theme.time);

  const slotTime = (entry.slotTimes && entry.slotTimes[slot]) || entry.startTime || "--:--";
  const nameSpan = document.createElement("span");
  nameSpan.className = "class-name";
  nameSpan.textContent = entry.name;

  const timeSpan = document.createElement("span");
  timeSpan.className = "class-time";
  timeSpan.textContent = slotTime;

  chip.appendChild(nameSpan);
  chip.appendChild(timeSpan);
  return chip;
}

function renderScheduleMobileList(rooms, filteredEntries, viewDate, dayThemeMap, dayThemeIndex) {
  scheduleMobileList.innerHTML = "";

  rooms.forEach((room) => {
    const roomSection = document.createElement("section");
    roomSection.className = "mobile-room-card";

    const title = document.createElement("h3");
    title.className = "mobile-room-title";
    title.textContent = room;
    roomSection.appendChild(title);

    SLOT_ORDER.forEach((slot) => {
      const matched = filteredEntries.filter((entry) => isEntryActiveOn(entry, viewDate, slot, room));

      const slotBlock = document.createElement("div");
      slotBlock.className = "mobile-slot-block";

      const slotLabel = document.createElement("div");
      slotLabel.className = "mobile-slot-label";
      slotLabel.textContent = slot;
      slotBlock.appendChild(slotLabel);

      const slotContent = document.createElement("div");
      slotContent.className = "mobile-slot-content";

      if (matched.length === 0) {
        const empty = document.createElement("span");
        empty.className = "mobile-slot-empty";
        empty.textContent = "등록된 수업 없음";
        slotContent.appendChild(empty);
      } else {
        matched.forEach((entry) => {
          const key = getEntryThemeKey(entry);
          const themeIndex = dayThemeMap.has(key) ? dayThemeMap.get(key) : dayThemeIndex;
          slotContent.appendChild(createClassChip(entry, slot, themeIndex));
        });
      }

      slotBlock.appendChild(slotContent);
      roomSection.appendChild(slotBlock);
    });

    scheduleMobileList.appendChild(roomSection);
  });
}

function renderSchedule() {
  const viewDate = parseDateOnly(viewDateInput.value);
  const dayThemeIndex = getDayThemeIndex(viewDateInput.value);

  const baseData = sharedPayload
    ? sharedPayload
    : isLiveShareMode && !hasLiveDataLoaded && liveShareSnapshot
      ? liveShareSnapshot
      : { entries: loadEntries(), rooms: loadRooms() };
  const entries = baseData.entries;
  const configuredRooms = baseData.rooms;
  const entryRooms = Array.from(
    new Set(entries.map((entry) => String(entry.room || "").trim()).filter(Boolean))
  );
  const allRooms = Array.from(new Set([...configuredRooms, ...entryRooms]));
  renderRoomFilterOptions(allRooms);

  const selectedRoom = roomFilterEl.value;
  const keyword = normalizeSearchText(classSearchEl.value);

  const rooms = selectedRoom === "all" ? allRooms : allRooms.filter((room) => room === selectedRoom);
  const filteredEntries = entries.filter((entry) => {
    if (selectedRoom !== "all" && entry.room !== selectedRoom) return false;
    if (!keyword) return true;
    return normalizeSearchText(entry.name).includes(keyword);
  });

  const dayThemeMap = buildDayThemeMap(filteredEntries, viewDate, rooms);
  renderScheduleHead(rooms);
  scheduleBody.innerHTML = "";
  renderScheduleMobileList(rooms, filteredEntries, viewDate, dayThemeMap, dayThemeIndex);

  rooms.forEach((room) => {
    const tr = document.createElement("tr");

    const roomTd = document.createElement("td");
    roomTd.textContent = room;
    tr.appendChild(roomTd);

    SLOT_ORDER.forEach((slot) => {
      const td = document.createElement("td");
      const matched = filteredEntries.filter((entry) => isEntryActiveOn(entry, viewDate, slot, room));

      if (matched.length === 0) {
        td.textContent = "-";
      } else {
        matched.forEach((entry) => {
          const key = getEntryThemeKey(entry);
          const themeIndex = dayThemeMap.has(key) ? dayThemeMap.get(key) : dayThemeIndex;
          td.appendChild(createClassChip(entry, slot, themeIndex));
        });
      }

      tr.appendChild(td);
    });

    scheduleBody.appendChild(tr);
  });
}

function shiftViewDate(days) {
  const base = parseDateOnly(viewDateInput.value);
  base.setDate(base.getDate() + days);
  viewDateInput.value = formatDateOnly(base);
  renderSchedule();
}

function isFullscreenFocused() {
  return document.fullscreenElement === scheduleRoot;
}

function shouldUseTableFocusFallback() {
  return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
}

function syncTableFocusUi() {
  const isFocused = isFullscreenFocused() || isTableFocusFallback;
  document.body.classList.toggle("table-focus", isFocused);
  tableFocusBtn.textContent = isFocused ? "화면 출력 해제" : "화면 출력";
}

function setTableFocusFallback(nextValue) {
  isTableFocusFallback = nextValue;
  if (nextValue) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  syncTableFocusUi();
}

async function toggleTableFocusMode() {
  if (isTableFocusFallback) {
    setTableFocusFallback(false);
    return;
  }

  if (isFullscreenFocused()) {
    await document.exitFullscreen();
    return;
  }

  if (shouldUseTableFocusFallback() || typeof scheduleRoot.requestFullscreen !== "function") {
    setTableFocusFallback(true);
    return;
  }

  try {
    await scheduleRoot.requestFullscreen();
  } catch {
    setTableFocusFallback(true);
  }
}

async function refreshFromCloudAndRender(options = {}) {
  const { preferImmediate = false } = options;
  if (sharedPayload) {
    renderSchedule();
    return;
  }
  if (preferImmediate) {
    renderSchedule();
  }
  if (isCloudSyncEnabled()) {
    const pulled = await cloudSyncPull();
    if (pulled) hasLiveDataLoaded = true;
  }
  renderSchedule();
}

prevDayBtn.addEventListener("click", () => shiftViewDate(-1));
nextDayBtn.addEventListener("click", () => shiftViewDate(1));
viewDateInput.addEventListener("click", openDatePicker);
roomFilterEl.addEventListener("change", renderSchedule);
classSearchEl.addEventListener("input", renderSchedule);
tableFocusBtn.addEventListener("click", () => {
  toggleTableFocusMode().catch(() => {
    setTableFocusFallback(!isTableFocusFallback);
  });
});
window.addEventListener("resize", () => {
  if (pickerPopoverEl) positionDatePicker();
});
window.addEventListener("storage", () => {
  if (!sharedPayload) renderSchedule();
});
document.addEventListener("fullscreenchange", syncTableFocusUi);

async function initializeSchedulePage() {
  const todayStr = formatDateOnly(new Date());
  viewDateInput.value = todayStr;

  const liveSharePayload = readPublicScheduleLiveSharePayload();
  if (liveSharePayload && liveSharePayload.url && liveSharePayload.anonKey) {
    setCloudConfig(liveSharePayload.url, liveSharePayload.anonKey);
    isLiveShareMode = true;
    liveShareSnapshot = {
      entries: liveSharePayload.entries || [],
      rooms: liveSharePayload.rooms || loadRooms(),
    };
  }

  sharedPayload = readPublicScheduleSharePayload();

  syncTableFocusUi();
  refreshFromCloudAndRender({ preferImmediate: true }).catch(() => {
    renderSchedule();
  });
}

initializeSchedulePage();
setInterval(() => {
  refreshFromCloudAndRender().catch(() => {});
}, 15000);
updateCurrentDateTime(nowEl, { showYear: false, prefix: "" });
setInterval(() => updateCurrentDateTime(nowEl, { showYear: false, prefix: "" }), 1000);
