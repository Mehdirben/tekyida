export interface ParsedTransactionForm {
    amount: number;
    description?: string;
    date: number;
}

/**
 * Parses a transaction form's raw inputs into mutation args.
 * Returns null when the amount is missing or not positive.
 */
export function parseTransactionForm(
    amountInput: string,
    isPositive: boolean,
    description: string,
    dateInput: string
): ParsedTransactionForm | null {
    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return null;

    const parsedDate = dateInput ? new Date(dateInput).getTime() : Date.now();
    return {
        amount: isPositive ? parsedAmount : -parsedAmount,
        description: description.trim() || undefined,
        date: isNaN(parsedDate) ? Date.now() : parsedDate,
    };
}
