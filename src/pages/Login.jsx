import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/molecules/LoginForm';
import RegisterForm from '../components/molecules/RegisterForm';
import './Login.css';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      const from = location.state?.from?.pathname || (user.role === 'admin' ? '/admin' : '/profile');
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  const toggleMode = () => setIsLogin(!isLogin);

  const handleSuccess = () => {
    // Redirection is handled by the useEffect above
  };

  if (loading) return null;

  return (
    <div className="btg-auth-page">
      <div className="btg-auth-page__overlay" />
      
      <div className="btg-auth-page__container">
        <div className="btg-auth-page__branding">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="btg-auth-page__logo-wrap"
          >
            <img src="/assets/branding/logo.jpeg" alt="BTG Logo" className="btg-auth-page__logo" />
            <h1 className="btg-auth-page__brand-name">Badol Tyre Ghar</h1>
          </motion.div>
        </div>

        <div className="btg-auth-page__content">
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="btg-auth-page__form-wrap"
              >
                <LoginForm onSuccess={handleSuccess} />
                <div className="btg-auth-page__switch">
                  <p>Don't have a B2B account? <button onClick={toggleMode}>Register Now</button></p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="btg-auth-page__form-wrap"
              >
                <RegisterForm onToggleLogin={toggleMode} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="btg-auth-page__background">
        <div className="btg-auth-page__bg-image" />
        <div className="btg-auth-page__bg-gradient" />
      </div>
    </div>
  );
};

export default Login;
