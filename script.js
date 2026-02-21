const SLOT_ORDER = ["오전", "오후", "저녁"];
const ROOMS = ["101호", "102호"];
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

const form = document.getElementById("class-form");
const nowEl = document.getElementById("now");
const scheduleTitle = document.getElementById("schedule-title");
const scheduleBody = document.getElementById("schedule-body");
const viewDateInput = document.getElementById("view-date");

const prevDayBtn = document.getElementById("prev-day");
const nextDayBtn = document.getElementById("next-day");

const entries = [];

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

function updateCurrentDateTime() {
  const now = new Date();
  const yy = now.getFullYear();
  const mm = now.getMonth() + 1;
  const dd = now.getDate();
  const weekday = WEEKDAY_KO[now.getDay()];
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const sec = String(now.getSeconds()).padStart(2, "0");
  nowEl.textContent = `현재: ${yy}년 ${mm}월 ${dd}일 (${weekday}) ${hh}:${min}:${sec}`;
}

function isEntryActiveOn(entry, targetDate, slot, room) {
  if (entry.room !== room) return false;

  const startDate = parseDateOnly(entry.startDate);
  const endDate = parseDateOnly(entry.endDate);

  if (targetDate < startDate || targetDate > endDate) return false;

  const slotIndex = SLOT_ORDER.indexOf(slot);
  const startSlotIndex = SLOT_ORDER.indexOf(entry.startSlot);
  const endSlotIndex = SLOT_ORDER.indexOf(entry.endSlot);

  const targetDateOnly = formatDateOnly(targetDate);

  if (targetDateOnly === entry.startDate && slotIndex < startSlotIndex) {
    return false;
  }

  if (targetDateOnly === entry.endDate && slotIndex > endSlotIndex) {
    return false;
  }

  return true;
}

function renderSchedule() {
  const viewDate = parseDateOnly(viewDateInput.value);
  scheduleTitle.textContent = `${formatHeaderDate(viewDate)} 시간표`;

  scheduleBody.innerHTML = "";

  SLOT_ORDER.forEach((slot) => {
    const tr = document.createElement("tr");

    const timeTd = document.createElement("td");
    timeTd.textContent = slot;
    tr.appendChild(timeTd);

    ROOMS.forEach((room) => {
      const td = document.createElement("td");

      const matched = entries.filter((entry) => isEntryActiveOn(entry, viewDate, slot, room));

      if (matched.length === 0) {
        td.textContent = "-";
      } else {
        matched.forEach((entry) => {
          const chip = document.createElement("span");
          chip.className = "class-chip";
          chip.textContent = entry.name;
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

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("class-name").value.trim();
  const room = document.getElementById("room").value;
  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;
  const startSlot = document.getElementById("start-slot").value;
  const endSlot = document.getElementById("end-slot").value;

  if (!name || !startDate || !endDate) {
    alert("모든 항목을 입력해 주세요.");
    return;
  }

  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (start > end) {
    alert("종료 날짜는 시작 날짜보다 빠를 수 없습니다.");
    return;
  }

  if (startDate === endDate && SLOT_ORDER.indexOf(startSlot) > SLOT_ORDER.indexOf(endSlot)) {
    alert("같은 날짜에서는 종료 시간대가 시작 시간대보다 빠를 수 없습니다.");
    return;
  }

  entries.push({
    name,
    room,
    startDate,
    endDate,
    startSlot,
    endSlot,
  });

  form.reset();
  document.getElementById("room").value = "101호";
  document.getElementById("start-slot").value = "오전";
  document.getElementById("end-slot").value = "저녁";

  renderSchedule();
});

viewDateInput.addEventListener("change", renderSchedule);
prevDayBtn.addEventListener("click", () => shiftViewDate(-1));
nextDayBtn.addEventListener("click", () => shiftViewDate(1));

const today = new Date();
const todayStr = formatDateOnly(today);
viewDateInput.value = todayStr;
document.getElementById("start-date").value = todayStr;
document.getElementById("end-date").value = todayStr;
document.getElementById("start-slot").value = "오전";
document.getElementById("end-slot").value = "저녁";

updateCurrentDateTime();
setInterval(updateCurrentDateTime, 1000);
renderSchedule();
