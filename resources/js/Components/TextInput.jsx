import { forwardRef } from 'react';

const TextInput = forwardRef(({ type = 'text', className = '', error, ...props }, ref) => {
    return (
        <div>
            <input
                type={type}
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 outline-none transition ${
                    error ? 'border-danger-500 focus:ring-danger-500/30' : 'border-gray-300 hover:border-gray-400'
                } ${className}`}
                ref={ref}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}
        </div>
    );
});

TextInput.displayName = 'TextInput';
export default TextInput;
