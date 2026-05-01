import { useForm, Head } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import TextInput from '@/Components/TextInput';
import Label from '@/Components/Label';
import Button from '@/Components/Button';

export default function AcceptInvitation({ invitation }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        phone: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(`/invitations/${invitation.token}`);
    };

    return (
        <GuestLayout>
            <Head title="Accept Invitation" />
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">Join {invitation.organization}</h2>
                <p className="text-sm text-gray-500 text-center mb-2">
                    You've been invited to join as <span className="font-semibold capitalize">{invitation.role}</span>
                </p>
                <p className="text-xs text-gray-400 text-center mb-6">
                    {invitation.email} · Stores: {invitation.stores.join(', ')}
                </p>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label required>Your Name</Label>
                        <TextInput
                            value={data.name}
                            onChange={e => setData('name', e.target.value)}
                            error={errors.name}
                        />
                    </div>
                    <div>
                        <Label>Phone</Label>
                        <TextInput
                            value={data.phone}
                            onChange={e => setData('phone', e.target.value)}
                            placeholder="+91…"
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
                        />
                    </div>
                    <Button type="submit" loading={processing} className="w-full">
                        Accept Invitation
                    </Button>
                </form>
            </div>
        </GuestLayout>
    );
}
