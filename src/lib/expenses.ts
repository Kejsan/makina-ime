import type { ExpenseRecord } from './types';

export const expenseAmount = (expense: Pick<ExpenseRecord, 'amount'> | { amount?: unknown }) => {
    const value = expense.amount;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

export const sumExpenses = (expenses: Array<Pick<ExpenseRecord, 'amount'> | { amount?: unknown }>) => (
    expenses.reduce((total, expense) => total + expenseAmount(expense), 0)
);
