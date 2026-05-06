import { useForm, Head, usePage } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import AdminLayout from '@/Layouts/AdminLayout';
import Card, { CardHeader } from '@/Components/Card';
import TextInput from '@/Components/TextInput';
import Label from '@/Components/Label';
import Button from '@/Components/Button';
import { enterSubmits } from '@/lib/formEnter';

export default function ChangePassword() {
    const { auth } = usePage().props;
    const Layout = auth?.user?.system_role === 'super_admin' ? AdminLayout : VendorLayout;

    const { data, setData, post, processing, errors, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/account/password', {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <Layout title="Change Password">
            <Head title="Change Password" />

            <div className="max-w-xl">
                <Card>
                    <CardHeader title="Change Password" subtitle="Update the password you use to sign in." />

                    <form onSubmit={submit} onKeyDown={enterSubmits(submit)} className="space-y-5">
                        <div>
                            <Label required>Current password</Label>
                            <TextInput
                                type="password"
                                value={data.current_password}
                                onChange={(e) => setData('current_password', e.target.value)}
                                error={errors.current_password}
                                autoComplete="current-password"
                                autoFocus
                            />
                        </div>
                        <div>
                            <Label required>New password</Label>
                            <TextInput
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                error={errors.password}
                                autoComplete="new-password"
                                placeholder="At least 8 characters"
                            />
                        </div>
                        <div>
                            <Label required>Confirm new password</Label>
                            <TextInput
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button type="submit" loading={processing}>
                                Update Password
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </Layout>
    );
}
