<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Store;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function index(Request $request, Store $store)
    {
        $categories = $store->categories()
            ->withCount('products')
            ->when($request->input('search'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->paginate($request->input('per_page', 15))
            ->withQueryString();

        return Inertia::render('Vendor/Categories/Index', [
            'categories' => $categories,
            'filters' => ['search' => $request->input('search', '')],
        ]);
    }

    public function store(Request $request, Store $store)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);
        $validated['name'] = trim($validated['name']);

        if ($store->categories()->where('name', $validated['name'])->exists()) {
            return back()->withErrors(['name' => 'This category already exists.']);
        }

        $store->categories()->create(['name' => $validated['name']]);

        return back()->with('success', 'Category created.');
    }

    public function update(Request $request, Store $store, Category $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);
        $validated['name'] = trim($validated['name']);

        if ($store->categories()->where('name', $validated['name'])->where('id', '!=', $category->id)->exists()) {
            return back()->withErrors(['name' => 'This category already exists.']);
        }

        $category->update(['name' => $validated['name']]);

        return back()->with('success', 'Category updated.');
    }

    public function destroy(Store $store, Category $category)
    {
        $category->delete();
        return back()->with('success', 'Category deleted.');
    }
}
