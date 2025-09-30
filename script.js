const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGJxtZz8jv7tMkadmYYuH19esMQ2DXmTn2BvARsQuX0BTFAHUMifNobYveKDbUURm61MdkdZg1aPR-/pub?output=csv";

const nowReadingContent = document.getElementById("now-reading-content");
const readList = document.getElementById("read-list");
const nowReadingStatus = document.getElementById("now-reading-status");
const readStatus = document.getElementById("read-status");
const updateInfo = document.getElementById("update-info");

async function init() {
  try {
    updateInfo.textContent = "Ładuję dane z Google Sheets…";
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Błąd pobierania: ${response.status}`);
    }
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    const books = toBooks(rows);
    renderNowReading(books);
    renderReadList(books);
    updateInfo.textContent = `Ostatnia aktualizacja: ${formatDateTime(new Date())}`;
  } catch (error) {
    console.error(error);
    const errorMessage = "Nie udało się pobrać danych. Spróbuj ponownie później.";
    nowReadingStatus.textContent = errorMessage;
    readStatus.textContent = errorMessage;
    updateInfo.textContent = errorMessage;
  }
}

function parseCSV(text) {
  const result = [];
  let current = [];
  let value = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      current.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (value || current.length) {
        current.push(value.trim());
        result.push(current);
        current = [];
      }
      value = "";
    } else {
      value += char;
    }
  }
  if (value || current.length) {
    current.push(value.trim());
    result.push(current);
  }
  return result.filter((row) => row.some((cell) => cell !== ""));
}

function toBooks(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows
    .slice(1)
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] ? row[index].trim() : "";
      });
      return {
        title: record[headers[0]] || "",
        author: record[headers[1]] || "",
        cover: record[headers[2]] || "",
        note: record[headers[3]] || "",
        link: record[headers[4]] || "",
        picker: record[headers[5]] || "",
        status: (record[headers[6]] || "").toLowerCase(),
        meetingDateRaw: record[headers[7]] || "",
        ratingRaw: record[headers[8]] || ""
      };
    })
    .filter((book) => book.title);
}

function renderNowReading(books) {
  const currentBook = books.find((book) => book.status === "czytamy");
  nowReadingContent.innerHTML = "";
  if (!currentBook) {
    nowReadingStatus.textContent = "Brak aktualnie czytanej książki.";
    nowReadingContent.innerHTML = '<p class="empty-state">Dodaj w Google Sheets książkę ze statusem „Czytamy”.</p>';
    return;
  }

  nowReadingStatus.textContent = "Zaktualizowano.";
  const card = document.createElement("article");
  card.className = "now-reading-card";

  const cover = createCoverElement(currentBook.cover, currentBook.title, "cover-placeholder");
  cover.classList.add("cover-wrapper");
  card.appendChild(cover);

  const details = document.createElement("div");
  details.className = "now-reading-details";

  const title = document.createElement("h3");
  if (isValidHttpUrl(currentBook.link)) {
    const anchor = document.createElement("a");
    anchor.href = currentBook.link;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = currentBook.title;
    title.appendChild(anchor);
  } else {
    title.textContent = currentBook.title;
  }
  details.appendChild(title);

  if (currentBook.author) {
    const author = document.createElement("p");
    author.className = "author";
    author.textContent = currentBook.author;
    details.appendChild(author);
  }

  if (currentBook.picker) {
    const picker = document.createElement("p");
    picker.className = "picker";
    picker.innerHTML = `<span class="meta-label">Wybrała:</span> ${currentBook.picker}`;
    details.appendChild(picker);
  }

  const meeting = formatMeetingDate(currentBook.meetingDateRaw);
  if (meeting) {
    const meetingEl = document.createElement("p");
    meetingEl.className = "meeting-date";
    meetingEl.textContent = meeting;
    details.appendChild(meetingEl);
  }

  card.appendChild(details);
  nowReadingContent.appendChild(card);
}

function renderReadList(books) {
  const readBooks = books
    .filter((book) => book.status === "przeczytane")
    .sort((a, b) => {
      const dateA = parseDate(a.meetingDateRaw);
      const dateB = parseDate(b.meetingDateRaw);
      if (dateA && dateB) {
        return dateB.getTime() - dateA.getTime();
      }
      if (dateA) return -1;
      if (dateB) return 1;
      return 0;
    });

  readList.innerHTML = "";

  if (!readBooks.length) {
    readStatus.textContent = "Brak przeczytanych książek.";
    readList.innerHTML = '<p class="empty-state">Dodaj w Google Sheets książki ze statusem „Przeczytane”.</p>';
    return;
  }

  readStatus.textContent = "Zaktualizowano.";

  readBooks.forEach((book) => {
    const item = document.createElement("article");
    item.className = "book-card";
    item.setAttribute("role", "listitem");

    const thumb = createCoverElement(book.cover, book.title, "thumb-placeholder");
    thumb.classList.add("thumb");
    item.appendChild(thumb);

    const info = document.createElement("div");
    info.className = "book-info";

    const title = document.createElement("h3");
    if (isValidHttpUrl(book.link)) {
      const anchor = document.createElement("a");
      anchor.href = book.link;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = book.title;
      title.appendChild(anchor);
    } else {
      title.textContent = book.title;
    }
    info.appendChild(title);

    if (book.author) {
      const author = document.createElement("p");
      author.className = "author";
      author.textContent = book.author;
      info.appendChild(author);
    }

    if (book.picker) {
      const picker = document.createElement("p");
      picker.className = "picker";
      picker.innerHTML = `<span class="meta-label">Wybrała:</span> ${book.picker}`;
      info.appendChild(picker);
    }

    if (book.note) {
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = book.note;
      info.appendChild(note);
    }

    const meeting = formatMeetingDate(book.meetingDateRaw);
    if (meeting) {
      const meetingEl = document.createElement("p");
      meetingEl.className = "meeting";
      meetingEl.textContent = meeting;
      info.appendChild(meetingEl);
    }

    const rating = parseRating(book.ratingRaw);
    if (!isNaN(rating)) {
      const ratingEl = document.createElement("p");
      ratingEl.className = "rating";

      const stars = document.createElement("span");
      stars.className = "star-rating";
      const fillPercent = Math.max(0, Math.min(100, (rating / 5) * 100));
      stars.style.setProperty("--fill", `${fillPercent}%`);
      stars.setAttribute("aria-label", `Ocena: ${rating.toFixed(2)} na 5`);

      const label = document.createElement("strong");
      label.textContent = rating.toFixed(2);

      ratingEl.appendChild(stars);
      ratingEl.appendChild(label);
      ratingEl.appendChild(document.createTextNode(" / 5"));
      info.appendChild(ratingEl);
    }

    item.appendChild(info);
    readList.appendChild(item);
  });
}

function createCoverElement(url, title, placeholderClass) {
  const wrapper = document.createElement("div");
  if (isValidHttpUrl(url)) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = `Okładka książki ${title}`;
    img.loading = "lazy";
    wrapper.appendChild(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = placeholderClass;
    placeholder.textContent = initialsFromTitle(title);
    wrapper.appendChild(placeholder);
  }
  return wrapper;
}

function initialsFromTitle(title = "") {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "FT";
}

function formatMeetingDate(dateString) {
  const date = parseDate(dateString);
  if (!date) return "";
  return `Porozmawiamy o książce: ${formatDate(date)}`;
}

function parseDate(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/[.\/-]/).map((part) => part.trim());
  let date = null;

  if (parts.length === 3) {
    const [p1, p2, p3] = parts;
    if (p1.length === 4) {
      date = new Date(Number(p1), Number(p2) - 1, Number(p3));
    } else if (p3.length === 4) {
      date = new Date(Number(p3), Number(p2) - 1, Number(p1));
    }
  }

  if (!date || isNaN(date.getTime())) {
    const normalized = trimmed.replace(/\./g, "/");
    const parsed = new Date(normalized);
    if (!isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  if (!date || isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function parseRating(value) {
  if (!value) return NaN;
  const normalized = value.replace(",", ".");
  const number = parseFloat(normalized);
  if (isNaN(number)) return NaN;
  return Math.min(5, Math.max(0, number));
}

function formatDateTime(date) {
  return `${formatDate(date)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function isValidHttpUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

init();
