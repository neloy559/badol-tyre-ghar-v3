import './BTGButton.css';

/**
 * BTGButton — The primary action element for BTG V3.
 *
 * @param {string}   variant   - 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
 * @param {string}   size      - 'sm' | 'md' | 'lg'
 * @param {boolean}  isLoading - Shows spinner and disables the button
 * @param {boolean}  disabled  - Standard disabled state
 * @param {node}     icon      - Optional icon element (renders left of label)
 * @param {function} onClick   - Click handler
 */
export default function BTGButton({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon = null,
  onClick,
  type = 'button',
  className = '',
  ...rest
}) {
  const classes = [
    'btg-btn',
    `btg-btn--${variant}`,
    `btg-btn--${size}`,
    isLoading ? 'btg-btn--loading' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <span className="btg-btn__spinner" aria-label="Loading" />
      ) : (
        <>
          {icon && <span className="btg-btn__icon">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
