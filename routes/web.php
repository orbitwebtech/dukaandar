<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\InvitationController;
use App\Http\Controllers\Auth\SelectStoreController;
use App\Http\Controllers\Vendor\DashboardController;
use App\Http\Controllers\Vendor\CustomerController;
use App\Http\Controllers\Vendor\ProductController;
use App\Http\Controllers\Vendor\CategoryController;
use App\Http\Controllers\Vendor\OrderController;
use App\Http\Controllers\Vendor\CouponController;
use App\Http\Controllers\Vendor\SettingController;
use App\Http\Controllers\Vendor\ReportController;
use App\Http\Controllers\Org\StoreController as OrgStoreController;
use App\Http\Controllers\Org\TeamController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\OrganizationController;
use App\Http\Controllers\PublicInvoiceController;

Route::get('/', function () {
    if (!auth()->check()) return redirect('/login');
    if (auth()->user()->isSuperAdmin()) return redirect('/admin/dashboard');
    return redirect('/select-store');
});

// Guest auth
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
    Route::get('/invitations/{token}', [InvitationController::class, 'show'])->name('invitations.show');
    Route::post('/invitations/{token}', [InvitationController::class, 'accept'])->name('invitations.accept');
});

// Email verification (accessible to guests so emailed link works pre-login)
Route::get('/email/verify', [EmailVerificationController::class, 'notice'])->name('verification.notice');
Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');
Route::post('/email/verify/resend', [EmailVerificationController::class, 'resend'])
    ->middleware('throttle:3,1')
    ->name('verification.resend');

Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

// Public signed invoice URL — for sharing with customers via WhatsApp/SMS
Route::get('/i/{order}', [PublicInvoiceController::class, 'show'])
    ->middleware('signed')
    ->name('public.invoice');

// Authenticated, non-admin
Route::middleware(['auth', 'verified', 'system_role:member'])->group(function () {
    Route::get('/select-store', [SelectStoreController::class, 'index'])->name('select-store');

    // Org-level (owner / manager surface)
    Route::prefix('org')->name('org.')->group(function () {
        Route::get('/stores', [OrgStoreController::class, 'index'])->name('stores.index');
        Route::get('/stores/create', [OrgStoreController::class, 'create'])->name('stores.create');
        Route::post('/stores', [OrgStoreController::class, 'store'])->name('stores.store');
        Route::get('/stores/{store}/edit', [OrgStoreController::class, 'edit'])
            ->scopeBindings()->name('stores.edit');
        Route::put('/stores/{store}', [OrgStoreController::class, 'update'])
            ->scopeBindings()->name('stores.update');

        Route::get('/team', [TeamController::class, 'index'])->name('team.index');
        Route::post('/team/invite', [TeamController::class, 'invite'])->name('team.invite');
        Route::put('/team/members/{member}', [TeamController::class, 'updateMember'])->name('team.update');
        Route::delete('/team/members/{member}', [TeamController::class, 'removeMember'])->name('team.remove');
        Route::delete('/team/invitations/{invitation}', [TeamController::class, 'revokeInvitation'])->name('team.invitation.revoke');
    });
});

// Store-scoped routes
Route::prefix('store/{store}')->middleware(['auth', 'verified', 'system_role:member', 'store.access'])->scopeBindings()->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Customers
    Route::get('/customers', [CustomerController::class, 'index'])->name('customers.index');
    Route::get('/customers-export', [CustomerController::class, 'export'])->name('customers.export');
    Route::get('/customers/create', [CustomerController::class, 'create'])
        ->middleware('store.can:customers.create')->name('customers.create');
    Route::post('/customers', [CustomerController::class, 'store'])
        ->middleware('store.can:customers.create')->name('customers.store');
    Route::get('/customers/{customer}', [CustomerController::class, 'show'])->name('customers.show');
    Route::get('/customers/{customer}/edit', [CustomerController::class, 'edit'])
        ->middleware('store.can:customers.update')->name('customers.edit');
    Route::put('/customers/{customer}', [CustomerController::class, 'update'])
        ->middleware('store.can:customers.update')->name('customers.update');
    Route::delete('/customers/{customer}', [CustomerController::class, 'destroy'])
        ->middleware('store.can:customers.delete')->name('customers.destroy');
    Route::post('/customers/{customer}/issue-coupon', [CustomerController::class, 'issueCoupon'])
        ->middleware('store.can:coupons.update')->name('customers.issue-coupon');
    Route::get('/customers/{customer}/label', [CustomerController::class, 'printLabel'])
        ->middleware('store.can:customers.read')->name('customers.label');
    Route::post('/customers/{customer}/toggle-reviewed', [CustomerController::class, 'toggleReviewed'])
        ->middleware('store.can:customers.update')->name('customers.toggle-reviewed');

    // Products
    Route::get('/products', [ProductController::class, 'index'])->name('products.index');
    Route::get('/products/import', [ProductController::class, 'showImport'])
        ->middleware('store.can:products.create')->name('products.import');
    Route::post('/products/import', [ProductController::class, 'bulkImport'])
        ->middleware('store.can:products.create')->name('products.import.run');
    Route::get('/products/sample-csv', [ProductController::class, 'sampleCsv'])
        ->middleware('store.can:products.create')->name('products.sample-csv');
    Route::get('/products/lookup', [ProductController::class, 'lookup'])
        ->middleware('store.can:orders.create')->name('products.lookup');
    Route::get('/products/create', [ProductController::class, 'create'])
        ->middleware('store.can:products.create')->name('products.create');
    Route::post('/products', [ProductController::class, 'store'])
        ->middleware('store.can:products.create')->name('products.store');
    Route::get('/products/{product}', [ProductController::class, 'show'])->name('products.show');
    Route::get('/products/{product}/edit', [ProductController::class, 'edit'])
        ->middleware('store.can:products.update')->name('products.edit');
    Route::put('/products/{product}', [ProductController::class, 'update'])
        ->middleware('store.can:products.update')->name('products.update');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])
        ->middleware('store.can:products.delete')->name('products.destroy');
    Route::post('/products/{product}/adjust-stock', [ProductController::class, 'adjustStock'])
        ->middleware('store.can:products.update')->name('products.adjust-stock');

    // Categories
    Route::post('/categories', [CategoryController::class, 'store'])
        ->middleware('store.can:categories.create')->name('categories.store');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])
        ->middleware('store.can:categories.delete')->name('categories.destroy');

    // Orders
    Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('/orders/create', [OrderController::class, 'create'])
        ->middleware('store.can:orders.create')->name('orders.create');
    Route::post('/orders', [OrderController::class, 'store'])
        ->middleware('store.can:orders.create')->name('orders.store');
    Route::get('/orders/{order}', [OrderController::class, 'show'])->name('orders.show');
    Route::get('/orders/{order}/edit', [OrderController::class, 'edit'])
        ->middleware('store.can:orders.update')->name('orders.edit');
    Route::put('/orders/{order}', [OrderController::class, 'update'])
        ->middleware('store.can:orders.update')->name('orders.update');
    Route::patch('/orders/{order}/quick', [OrderController::class, 'quickUpdate'])
        ->middleware('store.can:orders.update')->name('orders.quick-update');
    Route::delete('/orders/{order}', [OrderController::class, 'destroy'])
        ->middleware('store.can:orders.delete')->name('orders.destroy');
    Route::post('/orders/{order}/send-invoice', [OrderController::class, 'sendInvoice'])
        ->middleware('store.can:orders.update')->name('orders.send-invoice');
    Route::get('/orders/{order}/invoice-pdf', [OrderController::class, 'invoicePdf'])->name('orders.invoice-pdf');

    // Coupons
    Route::get('/coupons', [CouponController::class, 'index'])->name('coupons.index');
    Route::get('/coupons/create', [CouponController::class, 'create'])
        ->middleware('store.can:coupons.create')->name('coupons.create');
    Route::post('/coupons', [CouponController::class, 'store'])
        ->middleware('store.can:coupons.create')->name('coupons.store');
    Route::get('/coupons/{coupon}/edit', [CouponController::class, 'edit'])
        ->middleware('store.can:coupons.update')->name('coupons.edit');
    Route::put('/coupons/{coupon}', [CouponController::class, 'update'])
        ->middleware('store.can:coupons.update')->name('coupons.update');
    Route::delete('/coupons/{coupon}', [CouponController::class, 'destroy'])
        ->middleware('store.can:coupons.delete')->name('coupons.destroy');
    Route::post('/coupons/{coupon}/toggle', [CouponController::class, 'toggle'])
        ->middleware('store.can:coupons.update')->name('coupons.toggle');
    Route::post('/coupons/validate', [CouponController::class, 'validate'])
        ->middleware('store.can:orders.create')->name('coupons.validate');

// Reports
    Route::get('/reports/inventory', [ReportController::class, 'inventory'])
        ->middleware('store.can:reports.read')->name('reports.inventory');
    Route::get('/reports/sales', [ReportController::class, 'sales'])
        ->middleware('store.can:reports.read')->name('reports.sales');
    Route::get('/reports/export/{type}', [ReportController::class, 'export'])
        ->middleware('store.can:reports.read')->name('reports.export');

    // Settings
    Route::get('/settings', [SettingController::class, 'index'])
        ->middleware('store.can:settings.read')->name('settings.index');
    Route::post('/settings', [SettingController::class, 'update'])
        ->middleware('store.can:settings.update')->name('settings.update');
    Route::post('/settings/logo', [SettingController::class, 'uploadLogo'])
        ->middleware('store.can:settings.update')->name('settings.logo');
});

// Super admin
Route::prefix('admin')->name('admin.')->middleware(['auth', 'system_role:super_admin'])->group(function () {
    Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

    Route::get('/organizations', [OrganizationController::class, 'index'])->name('organizations');
    Route::get('/organizations/create', [OrganizationController::class, 'create'])->name('organizations.create');
    Route::post('/organizations', [OrganizationController::class, 'store'])->name('organizations.store');
    Route::get('/organizations/{organization}/edit', [OrganizationController::class, 'edit'])->name('organizations.edit');
    Route::put('/organizations/{organization}', [OrganizationController::class, 'update'])->name('organizations.update');
    Route::post('/organizations/{organization}/impersonate', [OrganizationController::class, 'impersonate'])->name('organizations.impersonate');
    Route::post('/organizations/{organization}/suspend', [OrganizationController::class, 'suspend'])->name('organizations.suspend');
    Route::post('/organizations/{organization}/activate', [OrganizationController::class, 'activate'])->name('organizations.activate');
    Route::post('/organizations/{organization}/record-payment', [OrganizationController::class, 'recordPayment'])->name('organizations.record-payment');
    Route::post('/organizations/{organization}/subscription-end', [OrganizationController::class, 'setSubscriptionEnd'])->name('organizations.subscription-end');
    Route::post('/organizations/{organization}/trial', [OrganizationController::class, 'setTrial'])->name('organizations.set-trial');

    Route::get('/analytics', [AdminDashboardController::class, 'analytics'])->name('analytics');
    Route::get('/plans', [AdminDashboardController::class, 'plans'])->name('plans');
});
