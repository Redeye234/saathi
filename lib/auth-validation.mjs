export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,39}$/;

export function normalizeUsername(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidUsername(value) {
  return USERNAME_PATTERN.test(normalizeUsername(value));
}

export function isValidPassword(value) {
  const password = String(value ?? "");
  return password.length >= 8 && password.length <= 200;
}
