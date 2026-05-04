<?php

namespace App\Http\Controllers\Org;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $org = $request->user()->organization;
        abort_unless($org, 403);

        $query = $org->expenses()
            ->with(['store:id,name,slug', 'recorder:id,name'])
            ->orderByDesc('expense_date')
            ->orderByDesc('id');

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }
        if ($storeId = $request->input('store_id')) {
            $query->where('store_id', $storeId === 'org' ? null : $storeId);
        }
        if ($from = $request->input('from')) {
            $query->whereDate('expense_date', '>=', $from);
        }
        if ($to = $request->input('to')) {
            $query->whereDate('expense_date', '<=', $to);
        }

        $expenses = $query->paginate($request->input('per_page', 25))->withQueryString();

        // Summary across the same filters (excluding pagination)
        $totalsQuery = $org->expenses();
        if ($request->input('category')) $totalsQuery->where('category', $request->input('category'));
        if ($request->input('store_id')) {
            $totalsQuery->where('store_id', $request->input('store_id') === 'org' ? null : $request->input('store_id'));
        }
        if ($request->input('from')) $totalsQuery->whereDate('expense_date', '>=', $request->input('from'));
        if ($request->input('to')) $totalsQuery->whereDate('expense_date', '<=', $request->input('to'));
        $filteredTotal = (float) (clone $totalsQuery)->sum('amount');

        $byCategory = (clone $totalsQuery)
            ->selectRaw('category, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('category')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        return Inertia::render('Org/Expenses/Index', [
            'expenses' => $expenses,
            'filters' => $request->only(['category', 'store_id', 'from', 'to']),
            'stores' => $org->stores()->orderBy('name')->get(['id', 'name', 'slug']),
            'categories' => $org->expenses()->select('category')->distinct()->orderBy('category')->pluck('category'),
            'summary' => [
                'filtered_total' => $filteredTotal,
                'by_category' => $byCategory,
                'this_month_total' => (float) $org->expenses()
                    ->whereMonth('expense_date', now()->month)
                    ->whereYear('expense_date', now()->year)
                    ->sum('amount'),
            ],
        ]);
    }

    public function create(Request $request)
    {
        $this->authorize('manage-organization');
        $org = $request->user()->organization;

        return Inertia::render('Org/Expenses/Form', [
            'stores' => $org->stores()->orderBy('name')->get(['id', 'name', 'slug']),
            'categories' => $org->expenses()->select('category')->distinct()->orderBy('category')->pluck('category'),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('manage-organization');
        $org = $request->user()->organization;

        $validated = $request->validate([
            'category' => 'required|string|max:100',
            'amount' => 'required|numeric|min:0.01',
            'expense_date' => 'required|date',
            'store_id' => ['nullable', Rule::exists('stores', 'id')->where('organization_id', $org->id)],
            'notes' => 'nullable|string|max:2000',
        ]);

        $org->expenses()->create([
            'store_id' => $validated['store_id'] ?: null,
            'recorded_by' => $request->user()->id,
            'category' => trim($validated['category']),
            'amount' => $validated['amount'],
            'expense_date' => $validated['expense_date'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->route('org.expenses.index')->with('success', 'Expense recorded.');
    }

    public function edit(Request $request, Expense $expense)
    {
        $this->authorize('manage-organization');
        abort_unless($expense->organization_id === $request->user()->organization_id, 403);
        $org = $request->user()->organization;

        return Inertia::render('Org/Expenses/Form', [
            'expense' => $expense,
            'stores' => $org->stores()->orderBy('name')->get(['id', 'name', 'slug']),
            'categories' => $org->expenses()->select('category')->distinct()->orderBy('category')->pluck('category'),
        ]);
    }

    public function update(Request $request, Expense $expense)
    {
        $this->authorize('manage-organization');
        abort_unless($expense->organization_id === $request->user()->organization_id, 403);
        $org = $request->user()->organization;

        $validated = $request->validate([
            'category' => 'required|string|max:100',
            'amount' => 'required|numeric|min:0.01',
            'expense_date' => 'required|date',
            'store_id' => ['nullable', Rule::exists('stores', 'id')->where('organization_id', $org->id)],
            'notes' => 'nullable|string|max:2000',
        ]);

        $expense->update([
            'store_id' => $validated['store_id'] ?: null,
            'category' => trim($validated['category']),
            'amount' => $validated['amount'],
            'expense_date' => $validated['expense_date'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->route('org.expenses.index')->with('success', 'Expense updated.');
    }

    public function destroy(Request $request, Expense $expense)
    {
        $this->authorize('manage-organization');
        abort_unless($expense->organization_id === $request->user()->organization_id, 403);

        $expense->delete();

        return back()->with('success', 'Expense deleted.');
    }
}
