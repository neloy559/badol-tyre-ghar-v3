import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ConfirmDialog.module.css';

/**
 * ConfirmDialog — Portal-based modal for destructive action confirmation.
 *
 * Props:
 *   open: boolean
 *   title: string
 *   message: string
 *   withReason?: boolean       — if true, renders a textarea for optional reason
 *   onConfirm: (reason?: string) => void
 *   onCancel: () => void
 *   confirmLabel?: string      — default: "Confirm"
 *   confirmVariant?: 'danger' | 'primary'  — default: 'danger'
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  withReason = false,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
}) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(withReason ? reason : undefined);
    setReason('');
  };

  const handleCancel = () => {
    setReason('');
    onCancel();
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleCancel}
        >
          <motion.div
            className={styles.dialog}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.message}>{message}</p>

            {withReason && (
              <textarea
                className={styles.reasonInput}
                placeholder="Reason for rejection (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            )}

            <div className={styles.actions}>
              <button
                className={styles.cancelBtn}
                onClick={handleCancel}
                type="button"
              >
                Cancel
              </button>
              <button
                className={`${styles.confirmBtn} ${styles[confirmVariant]}`}
                onClick={handleConfirm}
                type="button"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
