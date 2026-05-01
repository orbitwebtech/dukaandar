<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Store;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function store(Request $request, Store $store)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        if ($store->categories()->where('name', $validated['name'])->exists()) {
            return back()->withErrors(['name' => 'This category already exists.']);
        }

        $store->categories()->create(['name' => $validated['name']]);

        return back()->with('success', 'Category created.');
    }

    public function destroy(Store $store, Category $category)
    {
        $category->delete();
        return back()->with('success', 'Category deleted.');
    }
}
