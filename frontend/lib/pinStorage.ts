import { hashPin, generateSalt } from "./crypto";

const LOCK_ENABLED_KEY = "tekyida-lock-enabled";
const PIN_HASH_KEY = "tekyida-lock-pin-hash";
const PIN_SALT_KEY = "tekyida-lock-pin-salt";

export function isLockEnabled(): boolean {
    return localStorage.getItem(LOCK_ENABLED_KEY) === "true";
}

export function getStoredPinCredentials(): { hash: string; salt: string } | null {
    const hash = localStorage.getItem(PIN_HASH_KEY);
    const salt = localStorage.getItem(PIN_SALT_KEY);
    return hash && salt ? { hash, salt } : null;
}

export async function verifyPin(pin: string): Promise<boolean> {
    const creds = getStoredPinCredentials();
    if (!creds) return false;
    return (await hashPin(pin, creds.salt)) === creds.hash;
}

export async function savePin(pin: string): Promise<void> {
    const salt = generateSalt();
    const hash = await hashPin(pin, salt);
    localStorage.setItem(PIN_HASH_KEY, hash);
    localStorage.setItem(PIN_SALT_KEY, salt);
    localStorage.setItem(LOCK_ENABLED_KEY, "true");
}

export function clearPinStorage(): void {
    localStorage.removeItem(LOCK_ENABLED_KEY);
    localStorage.removeItem(PIN_HASH_KEY);
    localStorage.removeItem(PIN_SALT_KEY);
}
