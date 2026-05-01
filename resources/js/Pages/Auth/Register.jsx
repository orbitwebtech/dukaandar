import { useForm, Head } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import TextInput from '@/Components/TextInput';
import Label from '@/Components/Label';
import Button from '@/Components/Button';

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        organization_name: '',
        store_name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/register');
    };

    return (
        <GuestLayout>
            <Head title="Register" />
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">Create Your Account</h2>
                <p className="text-sm text-gray-500 text-center mb-8">Start your 14-day free trial as the owner</p>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label required>Your Name</Label>
                        <TextInput
                            value={data.name}
                            onChange={e => setData('name', e.target.value)}
                            placeholder="Your full name"
                            error={errors.name}
                        />
                    </div>
                    <div>
                        <Label required>Organization / Business Name</Label>
                        <TextInput
                            value={data.organization_name}
                            onChange={e => setData('organization_name', e.target.value)}
                            placeholder="e.g. Shivam Enterprises"
                            error={errors.organization_name}
                        />
                        <p className="mt-1 text-xs text-gray-400">Your overall business — the umbrella for all your stores.</p>
                    </div>
                    <div>
                        <Label required>First Store Name</Label>
                        <TextInput
                            value={data.store_name}
                            onChange={e => setData('store_name', e.target.value)}
                            placeholder="e.g. Shivam Fashion - Surat"
                            error={errors.store_name}
                        />
                        <p className="mt-1 text-xs text-gray-400">You can add more stores after signing in.</p>
                    </div>
                    <div>
                        <Label required>Email</Label>
                        <TextInput
                            type="email"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            placeholder="you@example.com"
                            error={errors.email}
                        />
                    </div>
                    <div>
                        <Label required>WhatsApp Number</Label>
                        <TextInput
                            value={data.phone}
                            onChange={e => setData('phone', e.target.value)}
                            placeholder="+919876543210"
                            error={errors.phone}
                        />
                    </div>
                    <div>
                        <Label required>Password</Label>
                        <TextInput
                            type="password"
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                            placeholder="Min 8 characters"
                            error={errors.password}
                        />
                    </div>
                    <div>
                        <Label required>Confirm Password</Label>
                        <TextInput
                            type="password"
                            value={data.password_confirmation}
                            onChange={e => setData('password_confirmation', e.target.value)}
                            placeholder="Confirm your password"
                        />
                    </div>
                    <Button type="submit" loading={processing} className="w-full">
                        Create Account
                    </Button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <a href="/login" className="font-medium text-primary-500 hover:text-primary-600">
                        Sign in
                    </a>
                </p>
            </div>
        </GuestLayout>
    );
}
