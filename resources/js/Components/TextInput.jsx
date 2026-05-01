import { forwardRef } from 'react';

const TextInput = forwardRef(({ type = 'text', className = '', error, ...props }, ref) => {
    return (
        <div>
            <input
                type={type}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition ${
                    error ? 'border-danger-500' : 'border-gray-300'
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
