import React from 'react';
import { Link } from 'react-router-dom';
import './HeroCTA.css';

export default function HeroCTA() {
  return (
    <div className="hero-cta">
      <Link to="/catalog" className="cta-button">
        অর্ডার করুন / ডিলার রেজিস্টার করুন
      </Link>
    </div>
  );
}
