const nowEl = document.getElementById("now");
const scheduleHead = document.getElementById("schedule-head");
const scheduleBody = document.getElementById("schedule-body");
const viewDateInput = document.getElementById("view-date");
const prevDayBtn = document.getElementById("prev-day");
const nextDayBtn = document.getElementById("next-day");
const tableFocusBtn = document.getElementById("table-focus-btn");
const scheduleRoot = document.getElementById("schedule-root");
const CAL_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

let pickerBackdropEl = null;
let pickerPopoverEl = null;
let pickerViewMonth = new Date();

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

function renderSchedule() {
  const viewDate = parseDateOnly(viewDateInput.value);

  const entries = loadEntries();
  const rooms = loadRooms();
  renderScheduleHead(rooms);
  scheduleBody.innerHTML = "";

  rooms.forEach((room) => {
    const tr = document.createElement("tr");

    const roomTd = document.createElement("td");
    roomTd.textContent = room;
    tr.appendChild(roomTd);

    SLOT_ORDER.forEach((slot) => {
      const td = document.createElement("td");
      const matched = entries.filter((entry) => isEntryActiveOn(entry, viewDate, slot, room));

      if (matched.length === 0) {
        td.textContent = "-";
      } else {
        matched.forEach((entry) => {
          const chip = document.createElement("div");
          chip.className = "class-chip";
          const slotTime =
            (entry.slotTimes && entry.slotTimes[slot]) ||
            entry.startTime ||
            "--:--";
          const nameSpan = document.createElement("span");
          nameSpan.className = "class-name";
          nameSpan.textContent = entry.name;

          const timeSpan = document.createElement("span");
          timeSpan.className = "class-time";
          timeSpan.textContent = slotTime;

          chip.appendChild(nameSpan);
          chip.appendChild(timeSpan);
          td.appendChild(chip);
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

function syncTableFocusUi() {
  const isFocused = document.fullscreenElement === scheduleRoot;
  document.body.classList.toggle("table-focus", isFocused);
  tableFocusBtn.textContent = isFocused ? "화면 출력 해제" : "화면 출력";
}

async function toggleTableFocusMode() {
  if (document.fullscreenElement === scheduleRoot) {
    await document.exitFullscreen();
    return;
  }
  await scheduleRoot.requestFullscreen();
}

prevDayBtn.addEventListener("click", () => shiftViewDate(-1));
nextDayBtn.addEventListener("click", () => shiftViewDate(1));
viewDateInput.addEventListener("click", openDatePicker);
tableFocusBtn.addEventListener("click", () => {
  toggleTableFocusMode().catch(() => {
    alert("전체화면 전환을 사용할 수 없는 환경입니다.");
  });
});
window.addEventListener("resize", () => {
  if (pickerPopoverEl) positionDatePicker();
});
window.addEventListener("storage", renderSchedule);
document.addEventListener("fullscreenchange", syncTableFocusUi);

const todayStr = formatDateOnly(new Date());
viewDateInput.value = todayStr;

updateCurrentDateTime(nowEl, { showYear: false, prefix: "" });
setInterval(() => updateCurrentDateTime(nowEl, { showYear: false, prefix: "" }), 1000);
syncTableFocusUi();
renderSchedule();
