export default function Label({ children, required, className = '', ...props }) {
    return (
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${className}`} {...props}>
            {children}
            {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
    );
}
