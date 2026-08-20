const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();

}
const calendarElement = document.getElementById("calendar");
const monthTitleElement = document.getElementById("monthTitle");
const selectedDateElement = document.getElementById("selectedDate");
const bookingTimeElement = document.getElementById("bookingTime");
const confirmButton = document.getElementById("confirmButton");

const prevMonthButton = document.getElementById("prevMonth");
const nextMonthButton = document.getElementById("nextMonth");

const today = new Date();

const params = new URLSearchParams(
  window.location.search
);

const leadId = params.get("leadId");

today.setHours(0, 0, 0, 0);

let currentMonth = new Date(
  today.getFullYear(),
  today.getMonth(),
  1
);

let selectedDate = null;

const monthFormatter = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  year: "numeric"
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric"
});


function renderCalendar() {
  calendarElement.innerHTML = "";

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  let startDay = firstDay.getDay();

  // JavaScript:
  // Sunday = 0
  // Monday = 1
  //
  // Нам нужно:
  // Monday = 0
  // Sunday = 6

  startDay = (startDay + 6) % 7;

  monthTitleElement.textContent =
    monthFormatter.format(currentMonth);

  // Пустые ячейки перед первым днём месяца

  for (let i = 0; i < startDay; i++) {
    const emptyDay = document.createElement("div");

    emptyDay.className = "calendar-day empty";

    calendarElement.appendChild(emptyDay);
  }

  // Дни месяца

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);

    date.setHours(0, 0, 0, 0);

    const button = document.createElement("button");

    button.type = "button";
    button.className = "calendar-day";

    button.textContent = day;

    // Сегодня

    if (date.getTime() === today.getTime()) {
      button.classList.add("today");
    }

    // Прошедшие даты

    if (date < today) {
      button.classList.add("disabled");
      button.disabled = true;
    }

    // Выбранная дата

    if (
      selectedDate &&
      date.getTime() === selectedDate.getTime()
    ) {
      button.classList.add("selected");
    }

    // Выбор даты

    if (date >= today) {
      button.addEventListener("click", () => {
        selectDate(date);
      });
    }

    calendarElement.appendChild(button);
  }
}


function selectDate(date) {
  selectedDate = new Date(date);

  selectedDate.setHours(0, 0, 0, 0);

  selectedDateElement.textContent =
    dateFormatter.format(selectedDate);

  renderCalendar();

  updateConfirmButton();
}


function updateConfirmButton() {
  const hasDate = selectedDate !== null;
  const hasTime = bookingTimeElement.value !== "";

  confirmButton.disabled = !(hasDate && hasTime);
}


// Предыдущий месяц

prevMonthButton.addEventListener("click", () => {
  const previousMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() - 1,
    1
  );

  // Не позволяем уйти раньше текущего месяца

  const currentMonthStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  if (previousMonth < currentMonthStart) {
    return;
  }

  currentMonth = previousMonth;

  renderCalendar();
});


// Следующий месяц

nextMonthButton.addEventListener("click", () => {
  currentMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    1
  );

  renderCalendar();
});


// Изменение времени

bookingTimeElement.addEventListener("change", () => {
  updateConfirmButton();
});


// Подтверждение

confirmButton.addEventListener("click", async () => {
  if (!selectedDate || !bookingTimeElement.value) {
    return;
  }

  const bookingDate =
    `${selectedDate.getFullYear()}-${String(
      selectedDate.getMonth() + 1
    ).padStart(2, "0")}-${String(
      selectedDate.getDate()
    ).padStart(2, "0")}`;

  const bookingTime =
    bookingTimeElement.value;

  const bookingData = {
    leadId,
    bookingDate,
    bookingTime,
    initData: tg?.initData || ""
  };

  try {
    confirmButton.disabled = true;
    confirmButton.textContent = "Сохранение...";

    const response = await fetch("/api/booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bookingData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Не удалось сохранить запись");
    }

    if (tg) {
      tg.showPopup({
        title: "Запись сохранена",
        message:
          `Дата: ${dateFormatter.format(selectedDate)}\n` +
          `Время: ${bookingTime}`,
        buttons: [
          {
            id: "ok",
            type: "ok",
            text: "Готово"
          }
        ]
      }, () => {
        tg.close();
      });
    } else {
      alert("Запись сохранена");
    }

  } catch (error) {
    console.error(error);

    alert(`Ошибка: ${error.message}`);

    confirmButton.disabled = false;
    confirmButton.textContent = "Подтвердить запись";
  }
});

// Первоначальный запуск

renderCalendar();
