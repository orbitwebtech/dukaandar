import { useForm, Head } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import TextInput from '@/Components/TextInput';
import Label from '@/Components/Label';
import Button from '@/Components/Button';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <GuestLayout>
            <Head title="Login" />
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">Welcome Back</h2>
                <p className="text-sm text-gray-500 text-center mb-8">Sign in to your Dukaandar account</p>

                <form onSubmit={submit} className="space-y-5">
                    <div>
                        <Label required>Email</Label>
                        <TextInput
                            type="email"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            placeholder="you@example.com"
                            error={errors.email}
                            autoFocus
                        />
                    </div>
                    <div>
                        <Label required>Password</Label>
                        <TextInput
                            type="password"
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                            placeholder="Enter your password"
                            error={errors.password}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="remember"
                            checked={data.remember}
                            onChange={e => setData('remember', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        />
                        <label htmlFor="remember" className="text-sm text-gray-600">Remember me</label>
                    </div>
                    <Button type="submit" loading={processing} className="w-full">
                        Sign In
                    </Button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-500">
                    Don't have an account?{' '}
                    <a href="/register" className="font-medium text-primary-500 hover:text-primary-600">
                        Register your shop
                    </a>
                </p>
            </div>

        </GuestLayout>
    );
}
