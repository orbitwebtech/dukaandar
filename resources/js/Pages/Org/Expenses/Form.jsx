import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import Card, { CardHeader } from '@/Components/Card';
import TextInput from '@/Components/TextInput';
import Label from '@/Components/Label';
import Button from '@/Components/Button';
import { ArrowLeft } from 'lucide-react';

const SUGGESTED = ['Parcel charge', 'Stock purchase', 'Salary', 'Tea / Snacks', 'Internet', 'Electricity', 'Rent', 'Packaging', 'Repairs', 'Marketing'];

export default function ExpenseForm({ expense, stores = [], categories = [] }) {
    const isEdit = !!expense;
    const today = new Date().toISOString().split('T')[0];

    const { data, setData, post, put, processing, errors } = useForm(isEdit ? {
        category: expense.category,
        amount: expense.amount,
        expense_date: expense.expense_date ? new Date(expense.expense_date).toISOString().split('T')[0] : today,
        store_id: expense.store_id || '',
        notes: expense.notes || '',
    } : {
        category: '',
        amount: '',
        expense_date: today,
        store_id: '',
        notes: '',
    });

    // Combined unique suggestion list
    const suggestions = Array.from(new Set([...categories, ...SUGGESTED])).sort();

    const submit = (e) => {
        e.preventDefault();
        if (isEdit) put(`/org/expenses/${expense.id}`);
        else post('/org/expenses');
    };

    return (
        <VendorLayout title={isEdit ? 'Edit Expense' : 'Add Expense'}>
            <Head title={isEdit ? 'Edit Expense' : 'Add Expense'} />

            <div className="max-w-2xl">
                <Link href="/org/expenses" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
                    <ArrowLeft className="h-4 w-4" /> Back to Expenses
                </Link>

                <Card>
                    <CardHeader title={isEdit ? 'Edit Expense' : 'New Expense'} />

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <Label required>Category</Label>
                            <input
                                type="text"
                                value={data.category}
                                onChange={(e) => setData('category', e.target.value)}
                                list="expense-categories"
                                placeholder="e.g. Tea bill, Internet, Salary"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                            />
                            <datalist id="expense-categories">
                                {suggestions.map(c => <option key={c} value={c} />)}
                            </datalist>
                            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
                            <p className="mt-1 text-xs text-gray-400">Pick from previously used or type a new category.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label required>Amount (₹)</Label>
                                <TextInput
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                    error={errors.amount}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <Label required>Date</Label>
                                <TextInput
                                    type="date"
                                    value={data.expense_date}
                                    onChange={(e) => setData('expense_date', e.target.value)}
                                    error={errors.expense_date}
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Store</Label>
                            <select
                                value={data.store_id || ''}
                                onChange={(e) => setData('store_id', e.target.value || '')}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                            >
                                <option value="">Organization-wide (no store)</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <p className="mt-1 text-xs text-gray-400">Leave blank for org-wide expenses (internet, owner salary, etc.). Pick a store for store-specific costs (parcel, stock for that shop).</p>
                            {errors.store_id && <p className="mt-1 text-xs text-red-600">{errors.store_id}</p>}
                        </div>

                        <div>
                            <Label>Notes</Label>
                            <textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={3}
                                placeholder="Vendor name, reference number, anything to remember"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                            />
                            {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes}</p>}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                            <Button type="submit" loading={processing}>{isEdit ? 'Save changes' : 'Record expense'}</Button>
                            <Link href="/org/expenses">
                                <Button variant="outline" type="button">Cancel</Button>
                            </Link>
                        </div>
                    </form>
                </Card>
            </div>
        </VendorLayout>
    );
}
