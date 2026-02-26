const form = document.getElementById("class-form");
const nowEl = document.getElementById("now");
const roomSelectEl = document.getElementById("room");
const startSlotEl = document.getElementById("start-slot");
const endSlotEl = document.getElementById("end-slot");
const startDateEl = document.getElementById("start-date");
const endDateEl = document.getElementById("end-date");
const entryListBodyEl = document.getElementById("entry-list-body");
const entryListWrapEl = document.getElementById("entry-list-wrap");
const clearAllBtn = document.getElementById("clear-all-btn");
const toggleEntryListBtn = document.getElementById("toggle-entry-list-btn");
const monthFilterEl = document.getElementById("month-filter");
const roomNewNameEl = document.getElementById("room-new-name");
const roomRenameNameEl = document.getElementById("room-rename-name");
const addRoomBtn = document.getElementById("add-room-btn");
const renameRoomBtn = document.getElementById("rename-room-btn");
const deleteRoomBtn = document.getElementById("delete-room-btn");
const cloudUrlEl = document.getElementById("cloud-url");
const cloudKeyEl = document.getElementById("cloud-key");
const saveCloudConfigBtn = document.getElementById("save-cloud-config-btn");
const testCloudSyncBtn = document.getElementById("test-cloud-sync-btn");
const cloudStatusEl = document.getElementById("cloud-status");
const cloudAdminBodyEl = document.getElementById("cloud-admin-body");
const toggleCloudConfigBtn = document.getElementById("toggle-cloud-config-btn");
const createPublicLinkBtn = document.getElementById("create-public-link-btn");
const publicLinkOutputEl = document.getElementById("public-link-output");
const formModeBadgeEl = document.getElementById("form-mode-badge");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const submitBtn = document.getElementById("submit-btn");
const CAL_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const CLOUD_CONFIG_COLLAPSE_KEY = "cloudConfigCollapsed";

let pickerBackdropEl = null;
let pickerPopoverEl = null;
let pickerActiveInput = null;
let pickerViewMonth = new Date();
let editingEntryId = null;
let isEntryListCollapsed = false;
let isCloudConfigCollapsed = false;

function getSelectedWeekdays() {
  return Array.from(document.querySelectorAll('input[name="weekday"]:checked')).map((el) => el.value);
}

function getSlotIndex(slot) {
  return SLOT_ORDER.indexOf(slot);
}

function isValid24HourTime(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function autoFormatTimeInput(inputEl) {
  const digits = inputEl.value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) {
    inputEl.value = digits;
    return;
  }
  inputEl.value = `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function closeDatePicker() {
  if (pickerBackdropEl) pickerBackdropEl.remove();
  if (pickerPopoverEl) pickerPopoverEl.remove();
  pickerBackdropEl = null;
  pickerPopoverEl = null;
  pickerActiveInput = null;
}

function positionDatePicker(anchorInput) {
  if (!pickerPopoverEl) return;
  const rect = anchorInput.getBoundingClientRect();
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
  if (!pickerPopoverEl || !pickerActiveInput) return;

  const year = pickerViewMonth.getFullYear();
  const month = pickerViewMonth.getMonth();
  const selected = pickerActiveInput.value ? parseDateOnly(pickerActiveInput.value) : null;

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
      pickerActiveInput.value = btn.dataset.date;
      closeDatePicker();
    });
  });
}

function openDatePicker(targetInput) {
  closeDatePicker();
  pickerActiveInput = targetInput;
  pickerViewMonth = targetInput.value ? parseDateOnly(targetInput.value) : new Date();
  pickerViewMonth.setDate(1);

  pickerBackdropEl = document.createElement("div");
  pickerBackdropEl.className = "date-picker-backdrop";
  pickerBackdropEl.addEventListener("click", closeDatePicker);

  pickerPopoverEl = document.createElement("div");
  pickerPopoverEl.className = "date-picker-popover";

  document.body.appendChild(pickerBackdropEl);
  document.body.appendChild(pickerPopoverEl);
  renderDatePicker();
  positionDatePicker(targetInput);
}

function formatEntrySlots(entry) {
  return `${entry.startSlot}~${entry.endSlot}`;
}

function hasWeekdayOverlap(aWeekdays, bWeekdays) {
  const bSet = new Set(bWeekdays || []);
  return (aWeekdays || []).some((day) => bSet.has(day));
}

function hasDateOverlap(aStartDate, aEndDate, bStartDate, bEndDate) {
  return !(aEndDate < bStartDate || aStartDate > bEndDate);
}

function hasSlotOverlap(aStartSlot, aEndSlot, bStartSlot, bEndSlot) {
  const aStart = getSlotIndex(aStartSlot);
  const aEnd = getSlotIndex(aEndSlot);
  const bStart = getSlotIndex(bStartSlot);
  const bEnd = getSlotIndex(bEndSlot);
  return !(aEnd < bStart || aStart > bEnd);
}

function getOverlapWeekdays(aWeekdays, bWeekdays) {
  const bSet = new Set(bWeekdays || []);
  return (aWeekdays || []).filter((day) => bSet.has(day));
}

function getOverlapDateRange(aStartDate, aEndDate, bStartDate, bEndDate) {
  const start = aStartDate > bStartDate ? aStartDate : bStartDate;
  const end = aEndDate < bEndDate ? aEndDate : bEndDate;
  return { start, end };
}

function getOverlapSlotRange(aStartSlot, aEndSlot, bStartSlot, bEndSlot) {
  const startIdx = Math.max(getSlotIndex(aStartSlot), getSlotIndex(bStartSlot));
  const endIdx = Math.min(getSlotIndex(aEndSlot), getSlotIndex(bEndSlot));
  return `${SLOT_ORDER[startIdx]}~${SLOT_ORDER[endIdx]}`;
}

function calculateSessionCount(entry) {
  const weekdays = new Set(entry.weekdays || []);
  if (weekdays.size === 0) return 0;

  const start = parseDateOnly(entry.startDate);
  const end = parseDateOnly(entry.endDate);
  const startIdx = getSlotIndex(entry.startSlot);
  const endIdx = getSlotIndex(entry.endSlot);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return 0;

  const slotsPerDay = endIdx - startIdx + 1;
  let matchedDays = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    const weekday = WEEKDAY_KO[cursor.getDay()];
    if (weekdays.has(weekday)) matchedDays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return matchedDays * slotsPerDay;
}

function getMonthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${year}년 ${month}월`;
}

function syncEntryListCollapseUi() {
  entryListWrapEl.classList.toggle("collapsed", isEntryListCollapsed);
  toggleEntryListBtn.textContent = isEntryListCollapsed ? "펼치기" : "접기";
}

function syncCloudStatusUi() {
  const cfg = getCloudConfig();
  cloudUrlEl.value = cfg.url;
  cloudKeyEl.value = cfg.anonKey;
  cloudStatusEl.textContent = isCloudSyncEnabled()
    ? "현재: 공유 모드(Supabase)"
    : "현재: 로컬 모드";
}

function syncCloudConfigCollapseUi() {
  cloudAdminBodyEl.classList.toggle("is-collapsed", isCloudConfigCollapsed);
  toggleCloudConfigBtn.textContent = isCloudConfigCollapsed ? "펼치기" : "접기";
  localStorage.setItem(CLOUD_CONFIG_COLLAPSE_KEY, isCloudConfigCollapsed ? "1" : "0");
}

function refreshRoomRenamePlaceholder() {
  roomRenameNameEl.placeholder = `선택 강의실(${roomSelectEl.value || "-"}) 새 이름`;
}

function renderRoomOptions(preferredRoom = "") {
  const rooms = loadRooms();
  const currentValue = preferredRoom || roomSelectEl.value;
  roomSelectEl.innerHTML = rooms.map((room) => `<option value="${room}">${room}</option>`).join("");

  if (currentValue && rooms.includes(currentValue)) {
    roomSelectEl.value = currentValue;
  } else {
    roomSelectEl.value = rooms[0];
  }
  refreshRoomRenamePlaceholder();
}

function setEditMode(isEdit) {
  formModeBadgeEl.textContent = isEdit ? "수정 모드" : "등록 모드";
  submitBtn.textContent = isEdit ? "수정 저장" : "수업 등록";
  cancelEditBtn.style.display = isEdit ? "inline-block" : "none";
}

function resetFormToDefaults() {
  form.reset();
  renderRoomOptions(loadRooms()[0]);
  startSlotEl.value = "오전";
  endSlotEl.value = "저녁";
  document.getElementById("time-오전").value = "09:00";
  document.getElementById("time-오후").value = "13:00";
  document.getElementById("time-저녁").value = "18:00";

  document.querySelectorAll('input[name="weekday"]').forEach((el) => {
    el.checked = ["월", "화", "수", "목", "금"].includes(el.value);
  });

  const todayStr = formatDateOnly(new Date());
  startDateEl.value = todayStr;
  endDateEl.value = todayStr;
  updateSlotTimeInputs();
}

function startEditEntry(entry) {
  editingEntryId = entry.id;
  setEditMode(true);

  document.getElementById("class-name").value = entry.name;
  renderRoomOptions(entry.room);
  startDateEl.value = entry.startDate;
  endDateEl.value = entry.endDate;
  startSlotEl.value = entry.startSlot;
  endSlotEl.value = entry.endSlot;

  document.querySelectorAll('input[name="weekday"]').forEach((el) => {
    el.checked = (entry.weekdays || []).includes(el.value);
  });

  document.getElementById("time-오전").value =
    (entry.slotTimes && entry.slotTimes["오전"]) || "";
  document.getElementById("time-오후").value =
    (entry.slotTimes && entry.slotTimes["오후"]) || "";
  document.getElementById("time-저녁").value =
    (entry.slotTimes && entry.slotTimes["저녁"]) || "";

  updateSlotTimeInputs();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startDuplicateEntry(entry) {
  editingEntryId = null;
  setEditMode(false);

  document.getElementById("class-name").value = entry.name;
  renderRoomOptions(entry.room);
  startDateEl.value = entry.startDate;
  endDateEl.value = entry.endDate;
  startSlotEl.value = entry.startSlot;
  endSlotEl.value = entry.endSlot;

  document.querySelectorAll('input[name="weekday"]').forEach((el) => {
    el.checked = (entry.weekdays || []).includes(el.value);
  });

  document.getElementById("time-오전").value =
    (entry.slotTimes && entry.slotTimes["오전"]) || "";
  document.getElementById("time-오후").value =
    (entry.slotTimes && entry.slotTimes["오후"]) || "";
  document.getElementById("time-저녁").value =
    (entry.slotTimes && entry.slotTimes["저녁"]) || "";

  updateSlotTimeInputs();
  window.scrollTo({ top: 0, behavior: "smooth" });
  alert("수업 정보가 복제되었습니다. 날짜/요일 등을 수정 후 수업 등록을 눌러주세요.");
}

function stopEditMode() {
  editingEntryId = null;
  setEditMode(false);
  resetFormToDefaults();
}

function renderEntryList() {
  const entries = loadEntries().sort((a, b) => a.startDate.localeCompare(b.startDate));
  entryListBodyEl.innerHTML = "";

  const monthKeys = Array.from(new Set(entries.map((entry) => getMonthKey(entry.startDate))));
  const selectedMonth = monthFilterEl.value || "all";
  const prevSelected = selectedMonth;

  monthFilterEl.innerHTML = `<option value="all">전체</option>`;
  monthKeys.forEach((monthKey) => {
    const option = document.createElement("option");
    option.value = monthKey;
    option.textContent = formatMonthLabel(monthKey);
    monthFilterEl.appendChild(option);
  });
  if (prevSelected === "all" || monthKeys.includes(prevSelected)) {
    monthFilterEl.value = prevSelected;
  } else {
    monthFilterEl.value = "all";
  }

  const filteredEntries =
    monthFilterEl.value === "all"
      ? entries
      : entries.filter((entry) => getMonthKey(entry.startDate) === monthFilterEl.value);

  if (filteredEntries.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="9">선택한 월에 등록된 수업이 없습니다.</td>`;
    entryListBodyEl.appendChild(tr);
    return;
  }

  const grouped = {};
  filteredEntries.forEach((entry) => {
    const key = getMonthKey(entry.startDate);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);
  });

  Object.keys(grouped)
    .sort()
    .forEach((monthKey) => {
      const monthTr = document.createElement("tr");
      monthTr.className = "month-group-row";
      monthTr.innerHTML = `<td colspan="9">${formatMonthLabel(monthKey)}</td>`;
      entryListBodyEl.appendChild(monthTr);

      grouped[monthKey].forEach((entry) => {
        const sessionCount = calculateSessionCount(entry);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${entry.name}</td>
          <td>${sessionCount}회</td>
          <td>${entry.room}</td>
          <td>${entry.startDate} ~ ${entry.endDate}</td>
          <td>${formatEntrySlots(entry)}</td>
          <td>${(entry.weekdays || []).join(", ")}</td>
          <td><button type="button" class="secondary-btn duplicate-entry-btn" data-id="${entry.id}">복제</button></td>
          <td><button type="button" class="secondary-btn edit-entry-btn" data-id="${entry.id}">수정</button></td>
          <td><button type="button" class="danger-btn delete-entry-btn" data-id="${entry.id}">삭제</button></td>
        `;
        entryListBodyEl.appendChild(tr);
      });
    });
}

function updateSlotTimeInputs() {
  const startIndex = getSlotIndex(startSlotEl.value);
  const endIndex = getSlotIndex(endSlotEl.value);
  const hasValidRange = startIndex !== -1 && endIndex !== -1;
  const rangeStart = hasValidRange ? Math.min(startIndex, endIndex) : -1;
  const rangeEnd = hasValidRange ? Math.max(startIndex, endIndex) : -1;

  document.querySelectorAll(".slot-time-row").forEach((row) => {
    const slot = row.dataset.slot;
    const input = row.querySelector("input");
    const slotIndex = getSlotIndex(slot);
    const active = hasValidRange && slotIndex >= rangeStart && slotIndex <= rangeEnd;

    row.classList.toggle("is-inactive", !active);
    input.disabled = !active;
    input.required = active;
    if (!active) {
      input.value = "";
    }
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("class-name").value.trim();
  const room = roomSelectEl.value;
  const startDate = startDateEl.value;
  const endDate = endDateEl.value;
  const selectedStartSlot = startSlotEl.value;
  const selectedEndSlot = endSlotEl.value;
  const slotTimes = {
    오전: document.getElementById("time-오전").value,
    오후: document.getElementById("time-오후").value,
    저녁: document.getElementById("time-저녁").value,
  };
  const weekdays = getSelectedWeekdays();

  if (!name || !startDate || !endDate) {
    alert("모든 항목을 입력해 주세요.");
    return;
  }

  if (weekdays.length === 0) {
    alert("최소 1개 이상의 요일을 선택해 주세요.");
    return;
  }

  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (start > end) {
    alert("종료 날짜는 시작 날짜보다 빠를 수 없습니다.");
    return;
  }

  const selectedStartIndex = getSlotIndex(selectedStartSlot);
  const selectedEndIndex = getSlotIndex(selectedEndSlot);
  const rangeStart = Math.min(selectedStartIndex, selectedEndIndex);
  const rangeEnd = Math.max(selectedStartIndex, selectedEndIndex);
  const startSlot = SLOT_ORDER[rangeStart];
  const endSlot = SLOT_ORDER[rangeEnd];

  for (let i = rangeStart; i <= rangeEnd; i += 1) {
    const slot = SLOT_ORDER[i];
    if (!slotTimes[slot]) {
      alert(`${slot} 시작 시간을 입력해 주세요.`);
      return;
    }
    if (!isValid24HourTime(slotTimes[slot])) {
      alert(`${slot} 시작 시간은 24시간제 HH:MM 형식으로 입력해 주세요. 예: 09:00`);
      return;
    }
  }

  const entries = loadEntries();
  const payload = {
    name,
    room,
    startDate,
    endDate,
    startSlot,
    endSlot,
    slotTimes,
    weekdays,
  };

  const conflicts = entries.filter((entry) => {
    if (editingEntryId && entry.id === editingEntryId) return false;
    if (entry.room !== payload.room) return false;
    if (!hasDateOverlap(payload.startDate, payload.endDate, entry.startDate, entry.endDate)) return false;
    if (!hasWeekdayOverlap(payload.weekdays, entry.weekdays)) return false;
    if (!hasSlotOverlap(payload.startSlot, payload.endSlot, entry.startSlot, entry.endSlot)) return false;
    return true;
  });

  if (conflicts.length > 0) {
    const details = conflicts.map((entry) => {
      const overlapDate = getOverlapDateRange(
        payload.startDate,
        payload.endDate,
        entry.startDate,
        entry.endDate
      );
      const overlapDays = getOverlapWeekdays(payload.weekdays, entry.weekdays).join(", ");
      const overlapSlots = getOverlapSlotRange(
        payload.startSlot,
        payload.endSlot,
        entry.startSlot,
        entry.endSlot
      );
      return `- ${entry.name} | 기간 ${overlapDate.start}~${overlapDate.end} | 요일 ${overlapDays} | 시간대 ${overlapSlots}`;
    });
    const shouldProceed = confirm(
      `같은 강의실(${payload.room})에 시간 충돌이 있습니다.\n\n충돌 상세:\n${details.join("\n")}\n\n무시하고 등록하시겠습니까?`
    );
    if (!shouldProceed) return;
  }

  if (editingEntryId) {
    const target = entries.find((entry) => entry.id === editingEntryId);
    if (target) {
      Object.assign(target, payload);
    }
  } else {
    entries.push({
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      ...payload,
    });
  }
  saveEntries(entries);
  await cloudSyncPush();

  const wasEditMode = Boolean(editingEntryId);
  stopEditMode();
  renderEntryList();

  alert(wasEditMode ? "수업이 수정되었습니다." : "수업이 등록되었습니다. 시간표 보기 페이지에서 확인하세요.");
});

["time-오전", "time-오후", "time-저녁"].forEach((id) => {
  const inputEl = document.getElementById(id);
  inputEl.addEventListener("input", () => autoFormatTimeInput(inputEl));
});

startSlotEl.addEventListener("change", updateSlotTimeInputs);
endSlotEl.addEventListener("change", updateSlotTimeInputs);
startSlotEl.addEventListener("input", updateSlotTimeInputs);
endSlotEl.addEventListener("input", updateSlotTimeInputs);
roomSelectEl.addEventListener("change", refreshRoomRenamePlaceholder);
startDateEl.addEventListener("click", () => openDatePicker(startDateEl));
endDateEl.addEventListener("click", () => openDatePicker(endDateEl));
window.addEventListener("resize", () => {
  if (pickerActiveInput) positionDatePicker(pickerActiveInput);
});

entryListBodyEl.addEventListener("click", async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const entryId = target.dataset.id;
  if (!entryId) return;

  if (target.classList.contains("duplicate-entry-btn")) {
    const entry = loadEntries().find((item) => item.id === entryId);
    if (!entry) return;
    startDuplicateEntry(entry);
    return;
  }

  if (target.classList.contains("edit-entry-btn")) {
    const entry = loadEntries().find((item) => item.id === entryId);
    if (!entry) return;
    startEditEntry(entry);
    return;
  }

  if (!target.classList.contains("delete-entry-btn")) return;

  const entries = loadEntries().filter((entry) => entry.id !== entryId);
  saveEntries(entries);
  await cloudSyncPush();
  if (editingEntryId === entryId) {
    stopEditMode();
  }
  renderEntryList();
});

clearAllBtn.addEventListener("click", async () => {
  if (!confirm("등록된 수업을 모두 삭제할까요?")) return;
  saveEntries([]);
  await cloudSyncPush();
  stopEditMode();
  renderEntryList();
});

cancelEditBtn.addEventListener("click", stopEditMode);
toggleEntryListBtn.addEventListener("click", () => {
  isEntryListCollapsed = !isEntryListCollapsed;
  syncEntryListCollapseUi();
});
toggleCloudConfigBtn.addEventListener("click", () => {
  isCloudConfigCollapsed = !isCloudConfigCollapsed;
  syncCloudConfigCollapseUi();
});
monthFilterEl.addEventListener("change", renderEntryList);

saveCloudConfigBtn.addEventListener("click", () => {
  setCloudConfig(cloudUrlEl.value, cloudKeyEl.value);
  syncCloudStatusUi();
  alert("공유 DB 설정이 저장되었습니다.");
});

testCloudSyncBtn.addEventListener("click", async () => {
  setCloudConfig(cloudUrlEl.value, cloudKeyEl.value);
  syncCloudStatusUi();
  if (!isCloudSyncEnabled()) {
    alert("URL과 Anon key를 모두 입력해 주세요.");
    return;
  }

  const pulled = await cloudSyncPull();
  if (!pulled) {
    alert("연결에 실패했습니다. URL/키/테이블 설정을 확인해 주세요.");
    return;
  }
  await cloudSyncPush();
  renderRoomOptions();
  renderEntryList();
  alert("연결 성공! 공유 DB와 동기화되었습니다.");
});

if (createPublicLinkBtn && publicLinkOutputEl) {
  createPublicLinkBtn.addEventListener("click", async () => {
    const isLive = isCloudSyncEnabled();
    const url = isLive ? buildPublicScheduleLiveShareUrl() : buildPublicScheduleShareUrl();
    if (!url) {
      alert("공유 링크 생성에 실패했습니다. 설정을 확인해 주세요.");
      return;
    }

    publicLinkOutputEl.value = url;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be blocked by browser policy; keep showing URL in input.
    }

    const popup = window.open(url, "_blank", "noopener");
    if (!popup) {
      alert("링크가 생성되었습니다. 아래 입력칸의 주소를 복사해 새 탭에서 열어주세요.");
    } else if (isLive) {
      alert("실시간 공유 링크를 새 탭으로 열었습니다.");
    } else {
      alert("공유 링크를 새 탭으로 열었습니다.");
    }

    if (url.length > 7000) {
      alert("등록 데이터가 많아 URL 길이가 깁니다. 일부 메신저에서 링크 전달이 제한될 수 있습니다.");
    }
  });
}

addRoomBtn.addEventListener("click", async () => {
  const newRoom = roomNewNameEl.value.trim();
  if (!newRoom) {
    alert("추가할 강의실 이름을 입력해 주세요.");
    return;
  }

  const rooms = loadRooms();
  if (rooms.includes(newRoom)) {
    alert("이미 존재하는 강의실 이름입니다.");
    return;
  }

  saveRooms([...rooms, newRoom]);
  await cloudSyncPush();
  renderRoomOptions(newRoom);
  roomNewNameEl.value = "";
});

renameRoomBtn.addEventListener("click", async () => {
  const oldRoom = roomSelectEl.value;
  const newRoom = roomRenameNameEl.value.trim();
  if (!oldRoom) return;
  if (!newRoom) {
    alert("변경할 강의실 이름을 입력해 주세요.");
    return;
  }
  if (oldRoom === newRoom) {
    alert("현재 이름과 같은 이름입니다.");
    return;
  }

  const rooms = loadRooms();
  if (rooms.includes(newRoom)) {
    alert("이미 존재하는 강의실 이름입니다.");
    return;
  }

  saveRooms(rooms.map((room) => (room === oldRoom ? newRoom : room)));
  saveEntries(loadEntries().map((entry) => (entry.room === oldRoom ? { ...entry, room: newRoom } : entry)));
  await cloudSyncPush();

  if (editingEntryId) {
    const editingEntry = loadEntries().find((entry) => entry.id === editingEntryId);
    if (editingEntry && editingEntry.room === newRoom) {
      roomSelectEl.value = newRoom;
    }
  }

  renderRoomOptions(newRoom);
  renderEntryList();
  roomRenameNameEl.value = "";
});

deleteRoomBtn.addEventListener("click", async () => {
  const roomToDelete = roomSelectEl.value;
  if (!roomToDelete) return;

  const rooms = loadRooms();
  if (rooms.length <= 1) {
    alert("강의실은 최소 1개 이상 있어야 합니다.");
    return;
  }

  const entries = loadEntries();
  const affectedCount = entries.filter((entry) => entry.room === roomToDelete).length;
  const message =
    affectedCount > 0
      ? `${roomToDelete}를 삭제하면 연결된 수업 ${affectedCount}개도 함께 삭제됩니다. 진행할까요?`
      : `${roomToDelete}를 삭제할까요?`;
  if (!confirm(message)) return;

  saveRooms(rooms.filter((room) => room !== roomToDelete));
  saveEntries(entries.filter((entry) => entry.room !== roomToDelete));
  await cloudSyncPush();

  if (editingEntryId) {
    const editingEntry = loadEntries().find((entry) => entry.id === editingEntryId);
    if (!editingEntry) {
      stopEditMode();
    }
  }

  renderRoomOptions();
  renderEntryList();
});

async function initializeRegisterPage() {
  await cloudSyncPull();

  const todayStr = formatDateOnly(new Date());
  startDateEl.value = todayStr;
  endDateEl.value = todayStr;
  renderRoomOptions();
  startSlotEl.value = "오전";
  endSlotEl.value = "저녁";
  document.getElementById("time-오전").value = "09:00";
  document.getElementById("time-오후").value = "13:00";
  document.getElementById("time-저녁").value = "18:00";

  updateSlotTimeInputs();
  setEditMode(false);
  renderEntryList();
  syncEntryListCollapseUi();
  isCloudConfigCollapsed = localStorage.getItem(CLOUD_CONFIG_COLLAPSE_KEY) === "1";
  syncCloudConfigCollapseUi();
  syncCloudStatusUi();
}

initializeRegisterPage();
updateCurrentDateTime(nowEl);
setInterval(() => updateCurrentDateTime(nowEl), 1000);
