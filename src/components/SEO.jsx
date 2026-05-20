import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, keywords, image, url }) {
  const siteName = "Badol Tyre Ghar";
  const defaultDesc = "Premium B2B platform for high-quality tyres, tubes, and flaps. Wholesale distribution across Bangladesh.";
  const defaultImage = "https://badol-tyre-ghar.vercel.app/og-image.jpg"; // Placeholder
  const siteUrl = "https://badol-tyre-ghar.vercel.app";

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{title ? `${title} | ${siteName}` : siteName}</title>
      <meta name="description" content={description || defaultDesc} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url ? `${siteUrl}${url}` : siteUrl} />
      <meta property="og:title" content={title || siteName} />
      <meta property="og:description" content={description || defaultDesc} />
      <meta property="og:image" content={image || defaultImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url ? `${siteUrl}${url}` : siteUrl} />
      <meta name="twitter:title" content={title || siteName} />
      <meta name="twitter:description" content={description || defaultDesc} />
      <meta name="twitter:image" content={image || defaultImage} />
    </Helmet>
  );
}
