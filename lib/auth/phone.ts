import { z } from "zod";

export const phoneInputSchema = z
  .string()
  .min(10, "Телефон слишком короткий")
  .max(18, "Телефон слишком длинный")
  .transform((value) => value.replace(/[^\d+]/g, ""));

export function normalizeRuPhone(input: string): string {
  const cleaned = input.replace(/\D/g, "");

  if (cleaned.length === 11 && cleaned.startsWith("8")) {
    return `7${cleaned.slice(1)}`;
  }

  if (cleaned.length === 10) {
    return `7${cleaned}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith("7")) {
    return cleaned;
  }

  throw new Error("Введите корректный телефон в формате +7XXXXXXXXXX");
}

export function isPhoneIdentifier(value: string): boolean {
  const trimmed = value.trim();
  return !trimmed.includes("@");
}

export function buildPhoneAliasEmail(rawPhone: string): string {
  const normalized = normalizeRuPhone(rawPhone);
  return `${normalized}@login.wisery.local`;
}
