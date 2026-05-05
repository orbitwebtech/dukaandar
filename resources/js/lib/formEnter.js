/**
 * Form keydown handler that submits the form on Enter when focus is in
 * any text-like input. Belt-and-suspenders for browsers/autofill cases
 * where the implicit "Enter submits" behaviour doesn't fire reliably.
 *
 *   <form onSubmit={submit} onKeyDown={enterSubmits(submit)}>
 *
 * Skips:
 * - textareas (Enter is a newline)
 * - select / button / contenteditable
 * - composition events (IME mid-composition)
 * - when modifier keys are held
 */
export function enterSubmits(submit) {
    return (e) => {
        if (e.key !== 'Enter') return;
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.nativeEvent?.isComposing) return;
        const t = e.target;
        if (!t) return;
        if (t.tagName === 'TEXTAREA') return;
        if (t.tagName === 'BUTTON') return; // let buttons handle their own click
        if (t.isContentEditable) return;
        if (t.tagName === 'SELECT') return;
        // For inputs, only fire on text-like types (skip checkbox/radio etc.)
        if (t.tagName === 'INPUT') {
            const okTypes = ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date'];
            if (!okTypes.includes((t.type || 'text').toLowerCase())) return;
        }
        e.preventDefault();
        submit(e);
    };
}
