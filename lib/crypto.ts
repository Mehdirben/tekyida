/**
 * Cryptographic utility functions for PIN hashing.
 * Uses native Web Crypto APIs to ensure client-side security.
 */

/**
 * Computes a SHA-256 hash of a PIN combined with a salt.
 * 
 * @param pin The 6-digit PIN string.
 * @param salt The cryptographic salt string.
 * @returns A promise resolving to the hex string representation of the hash.
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
    if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
        // Fallback for non-browser/SSR environments if any
        return pin + salt;
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + salt);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a cryptographically strong random salt string.
 * 
 * @returns A unique hex string.
 */
export function generateSalt(): string {
    if (typeof window === "undefined" || !window.crypto) {
        return Math.random().toString(36).substring(2);
    }
    const array = new Uint32Array(4);
    window.crypto.getRandomValues(array);
    return Array.from(array).map((n) => n.toString(16)).join("");
}
