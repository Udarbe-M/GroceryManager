export function sanitizeQuantity(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  if (digits.length === 0) {
    return '';
  }

  return String(Math.max(1, Number.parseInt(digits, 10)));
}

export function sanitizePrice(value: string) {
  const normalized = value.replace(/[^0-9.]/g, '');
  const parts = normalized.split('.');

  if (parts.length === 1) {
    return normalized;
  }

  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
}
