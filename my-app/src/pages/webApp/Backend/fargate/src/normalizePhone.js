// lib/normalizePhone.js
export function normalizeNumber(raw) {
    // strip out everything but digits
    const digits = raw.replace(/\D/g, '')
    // ensure leading “+”
    return digits.startsWith('+') ? `+${digits.replace(/^\+/, '')}` : `+${digits}`
  }