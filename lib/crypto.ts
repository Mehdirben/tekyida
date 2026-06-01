/**
 * Cryptographic utility functions for PIN hashing.
 * Uses native Web Crypto APIs to ensure client-side security.
 */

/**
 * Computes a PBKDF2 hash of a PIN combined with a salt.
 * Uses 100,000 iterations of SHA-256 to make brute-force expensive.
 *
 * @param pin The 6-digit PIN string.
 * @param salt The cryptographic salt string.
 * @returns A promise resolving to the hex string representation of the hash.
 * @throws If WebCrypto is unavailable (e.g. non-HTTPS context or SSR).
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
    if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
        throw new Error("Secure crypto not available — PIN lock requires HTTPS.");
    }

    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(pin),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const derivedBits = await window.crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: encoder.encode(salt),
            iterations: 100_000,
            hash: "SHA-256",
        },
        keyMaterial,
        256
    );

    const hashArray = Array.from(new Uint8Array(derivedBits));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a cryptographically strong random salt string.
 *
 * @returns A unique hex string.
 * @throws If WebCrypto is unavailable (e.g. non-HTTPS context or SSR).
 */
export function generateSalt(): string {
    if (typeof window === "undefined" || !window.crypto) {
        throw new Error("Secure crypto not available — PIN lock requires HTTPS.");
    }
    const array = new Uint32Array(4);
    window.crypto.getRandomValues(array);
    return Array.from(array).map((n) => n.toString(16)).join("");
}
