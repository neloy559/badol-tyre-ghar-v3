import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import styles from './Register.module.css';

const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  ownerName:    z.string().min(2, 'Owner name must be at least 2 characters'),
  email:        z.string().email('Please enter a valid email address'),
  phone:        z.string().min(11, 'Phone must be at least 11 digits').max(14, 'Phone must be at most 14 digits'),
  address:      z.string().min(5, 'Address must be at least 5 characters'),
  password:     z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Register() {
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setApiError('');
    try {
      await api.post('/auth/dealer/register', data);
      setSuccess(true);
    } catch (err) {
      setApiError(
        err.response?.data?.error ??
        err.response?.data?.message ??
        'Something went wrong. Please try again.'
      );
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.overlay} />

      <motion.div
        className={styles.container}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Branding */}
        <div className={styles.branding}>
          <img src="/assets/branding/logo.jpeg" alt="BTG Logo" className={styles.logo} />
          <h1 className={styles.brandName}>Badol Tyre Ghar</h1>
          <p className={styles.tagline}>Dealer Registration</p>
        </div>

        {/* Card */}
        <div className={styles.card}>
          {success ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>✓</div>
              <h2 className={styles.successTitle}>Application Submitted</h2>
              <p className={styles.successMsg}>
                Your account is under review. We will notify you once approved.
              </p>
              <Link to="/login" className={styles.loginLink}>
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className={styles.formTitle}>Apply for a Dealer Account</h2>
              <p className={styles.formSubtitle}>
                Already have an account?{' '}
                <Link to="/login" className={styles.inlineLink}>Sign in</Link>
              </p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className={styles.field}>
                  <label className={styles.label}>Business Name</label>
                  <input
                    {...register('businessName')}
                    className={`${styles.input} ${errors.businessName ? styles.inputError : ''}`}
                    placeholder="e.g. Ahmed Tyre House"
                    disabled={isSubmitting}
                  />
                  {errors.businessName && (
                    <p className={styles.fieldError}>{errors.businessName.message}</p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Owner Name</label>
                  <input
                    {...register('ownerName')}
                    className={`${styles.input} ${errors.ownerName ? styles.inputError : ''}`}
                    placeholder="e.g. Md. Ahmed"
                    disabled={isSubmitting}
                  />
                  {errors.ownerName && (
                    <p className={styles.fieldError}>{errors.ownerName.message}</p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Email Address</label>
                  <input
                    {...register('email')}
                    type="email"
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    placeholder="e.g. ahmed@example.com"
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p className={styles.fieldError}>{errors.email.message}</p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Phone Number</label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                    placeholder="e.g. 01700000000"
                    disabled={isSubmitting}
                  />
                  {errors.phone && (
                    <p className={styles.fieldError}>{errors.phone.message}</p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Business Address</label>
                  <input
                    {...register('address')}
                    className={`${styles.input} ${errors.address ? styles.inputError : ''}`}
                    placeholder="e.g. 45 Tyre Market, Dhaka"
                    disabled={isSubmitting}
                  />
                  {errors.address && (
                    <p className={styles.fieldError}>{errors.address.message}</p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Password</label>
                  <input
                    {...register('password')}
                    type="password"
                    className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                    placeholder="At least 6 characters"
                    disabled={isSubmitting}
                  />
                  {errors.password && (
                    <p className={styles.fieldError}>{errors.password.message}</p>
                  )}
                </div>

                {apiError && (
                  <p className={styles.apiError}>{apiError}</p>
                )}

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className={styles.spinner} />
                  ) : (
                    'Submit Application'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>

      <div className={styles.background}>
        <div className={styles.bgImage} />
        <div className={styles.bgGradient} />
      </div>
    </div>
  );
}
