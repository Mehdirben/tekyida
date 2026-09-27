export function formatBalance(amount: number, mask?: (value: string) => string): string {
    const sign = amount >= 0 ? "+" : "";
    const formatted = `${sign}${amount.toFixed(2)} MAD`;
    return mask ? mask(formatted) : formatted;
}

export function balanceColor(amount: number, zeroClass = "text-(--text-primary)"): string {
    if (amount > 0) return "text-accent-500";
    if (amount < 0) return "text-danger-500";
    return zeroClass;
}
