function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateTime(isoString) {
  if (!isoString) return "-";

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

module.exports = {
  formatDateTime
};