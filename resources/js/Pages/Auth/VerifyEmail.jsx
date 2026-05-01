import { Head, Link, useForm, usePage } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import Button from '@/Components/Button';
import TextInput from '@/Components/TextInput';
import Label from '@/Components/Label';
import { Mail } from 'lucide-react';

export default function VerifyEmail({ email }) {
    const { flash } = usePage().props;

    const { data, setData, post, processing, errors } = useForm({
        email: email || '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/email/verify/resend');
    };

    return (
        <GuestLayout>
            <Head title="Verify Email" />
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
                <div className="mx-auto h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                    <Mail className="h-7 w-7 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
                <p className="text-sm text-gray-500 mb-6">
                    {email ? (
                        <>We sent a verification link to <span className="font-semibold text-gray-700">{email}</span>.</>
                    ) : (
                        <>We sent you a verification link. Click it to activate your account.</>
                    )}
                </p>

                {flash?.success && (
                    <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 text-left">
                        {flash.success}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-3 text-left">
                    <div>
                        <Label>Resend to a different email</Label>
                        <TextInput
                            type="email"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            placeholder="you@example.com"
                            error={errors.email}
                        />
                    </div>
                    <Button type="submit" loading={processing} className="w-full">
                        Resend Verification Email
                    </Button>
                </form>

                <p className="mt-6 text-sm text-gray-500">
                    Already verified?{' '}
                    <Link href="/login" className="font-medium text-primary-500 hover:text-primary-600">
                        Sign in
                    </Link>
                </p>
            </div>
        </GuestLayout>
    );
}
