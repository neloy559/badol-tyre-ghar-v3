import React, { forwardRef } from 'react';
import './BTGInput.css';

/**
 * BTGInput — Standard form input for BTG V3.
 * Ref-forwarded for compatibility with react-hook-form.
 */
const BTGInput = forwardRef(({
  type = 'text',
  label = '',
  placeholder = '',
  error = '',
  icon = null,
  variant = '',
  id,
  className = '',
  ...rest
}, ref) => {
  const wrapperClasses = [
    'btg-input-wrapper',
    error ? 'btg-input--error' : '',
    icon ? 'btg-input--has-icon' : '',
    variant === 'search' ? 'btg-input--search' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={id} className="btg-input__label">
          {label}
        </label>
      )}
      <div className="btg-input__field-wrap">
        {icon && <span className="btg-input__icon">{icon}</span>}
        <input
          ref={ref}
          id={id}
          type={type}
          placeholder={placeholder}
          className="btg-input__field"
          {...rest}
        />
      </div>
      {error && <span className="btg-input__error-msg">{error}</span>}
    </div>
  );
});

BTGInput.displayName = 'BTGInput';

export default BTGInput;
