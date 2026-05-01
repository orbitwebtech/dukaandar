import Select from 'react-select';

const customStyles = {
    control: (base, state) => ({
        ...base,
        minHeight: '42px',
        borderColor: state.isFocused ? '#4338ca' : '#d1d5db',
        boxShadow: state.isFocused ? '0 0 0 1px #4338ca' : 'none',
        '&:hover': { borderColor: '#4338ca' },
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#4338ca' : state.isFocused ? '#eff6ff' : 'white',
        color: state.isSelected ? 'white' : '#1f2937',
        fontSize: '0.875rem',
        '&:active': { backgroundColor: '#3730a3' },
    }),
    placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' }),
    singleValue: (base) => ({ ...base, color: '#1f2937', fontSize: '0.875rem' }),
    menu: (base) => ({ ...base, borderRadius: '0.5rem', overflow: 'hidden', zIndex: 50 }),
    multiValue: (base) => ({ ...base, backgroundColor: '#eff6ff', borderRadius: '0.375rem' }),
    multiValueLabel: (base) => ({ ...base, color: '#4338ca', fontSize: '0.8rem' }),
    multiValueRemove: (base) => ({
        ...base,
        color: '#4338ca',
        '&:hover': { backgroundColor: '#4338ca', color: 'white' },
    }),
};

export default function SearchableSelect({
    options = [],
    value,
    onChange,
    placeholder = 'Select...',
    isMulti = false,
    isClearable = true,
    isDisabled = false,
    className = '',
    error,
    ...props
}) {
    return (
        <div className={className}>
            <Select
                options={options}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                isMulti={isMulti}
                isClearable={isClearable}
                isDisabled={isDisabled}
                styles={customStyles}
                classNamePrefix="react-select"
                {...props}
            />
            {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}
        </div>
    );
}
