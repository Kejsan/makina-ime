import type { ExpenseRecord } from './types';

export const moneyValue = (value: unknown) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

    if (typeof value === 'string') {
        const cleaned = value
            .replace(/[^\d,.-]/g, '')
            .replace(/\.(?=\d{3}(?:\D|$))/g, '')
            .replace(',', '.');
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
};

export const expenseAmount = (
    expense: Partial<Pick<ExpenseRecord, 'amount'>> & { amount?: unknown; cost?: unknown }
) => {
    const amount = moneyValue(expense.amount);
    return amount !== 0 ? amount : moneyValue(expense.cost);
};

export const sumExpenses = (
    expenses: Array<Partial<Pick<ExpenseRecord, 'amount'>> & { amount?: unknown; cost?: unknown }>
) => (
    expenses.reduce((total, expense) => total + expenseAmount(expense), 0)
);
