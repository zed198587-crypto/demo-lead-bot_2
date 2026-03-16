function normalizePhone(phone) {
  if (!phone) return "";

  return String(phone)
    .trim()
    .replace(/[\s()-]/g, "");
}

function isValidPhone(phone) {
  const normalized = normalizePhone(phone);

  return /^\+?\d{9,15}$/.test(normalized);
}

module.exports = {
  normalizePhone,
  isValidPhone
};