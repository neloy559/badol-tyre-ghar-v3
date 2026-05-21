import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

/**
 * Builds a Cloudinary URL safe for react-pdf image loading.
 * - Uses the full URL already stored in DB (no cloud name needed)
 * - Forces JPEG output (react-pdf handles JPEG best)
 * - Adds c_pad + b_white for consistent 1:1 square
 * - Strips f_auto (react-pdf can't negotiate format)
 */
const getPdfImageUrl = (url) => {
  if (!url) return null;

  // Already a full Cloudinary URL
  if (url.includes('cloudinary.com')) {
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return url;
    const base = url.substring(0, uploadIndex + 8);
    const path = url.substring(uploadIndex + 8);
    // Remove any existing transforms, apply PDF-safe ones
    const cleanPath = path.replace(/^[^/]+\//, ''); // strip existing transform prefix if any
    return `${base}f_jpg,c_pad,b_white,w_200,q_70/${cleanPath}`;
  }

  // ImgBB or other direct URLs — use as-is
  return url;
};

const formatPrice = (variant) => {
  if (!variant) return 'Call for Price';
  // Support both old flat price and new pricing.retail/wholesale
  const price = variant.pricing?.retail || variant.pricing?.wholesale || variant.price;
  if (!price) return 'Call for Price';
  return `BDT ${price.toLocaleString('en-IN')}`;
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  // ── Header ──────────────────────────────────────────────────
  header: {
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#CC0000',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLeft: {},
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#CC0000',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 9,
    color: '#666',
  },
  headerRight: {
    fontSize: 8,
    color: '#999',
    textAlign: 'right',
  },
  // ── Grid ────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // ── Card ────────────────────────────────────────────────────
  card: {
    width: '23%',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  imgBox: {
    width: '100%',
    height: 70,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: {
    width: '100%',
    height: 70,
    objectFit: 'contain',
  },
  imgPlaceholder: {
    width: '100%',
    height: 70,
    backgroundColor: '#F0F0F0',
  },
  cardBody: {
    padding: 5,
  },
  productName: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
    marginBottom: 2,
    lineHeight: 1.3,
  },
  specs: {
    fontSize: 7,
    color: '#666',
    marginBottom: 2,
    lineHeight: 1.3,
  },
  brand: {
    fontSize: 7,
    color: '#888',
    marginBottom: 3,
  },
  price: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#CC0000',
  },
  // ── Footer ──────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: '#AAA',
  },
  pageNum: {
    fontSize: 7,
    color: '#AAA',
  },
  // ── Empty state ─────────────────────────────────────────────
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#CCC',
  },
});

const CatalogDocument = ({ products = [], categoryName = 'All Products' }) => {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <Document
      title={`Badol Tyre Ghar — ${categoryName} Catalog`}
      author="Badol Tyre Ghar"
      subject={`${categoryName} Product Catalog`}
      creator="BTG V3"
    >
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Badol Tyre Ghar</Text>
            <Text style={styles.subtitle}>{categoryName} — Product Catalog</Text>
          </View>
          <Text style={styles.headerRight}>
            Generated: {dateStr}{'\n'}
            badol-tyre-ghar.vercel.app
          </Text>
        </View>

        {/* Product Grid */}
        {products.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No products found.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {products.map((p) => {
              const imageUrl = getPdfImageUrl(p.media?.[0]);
              const variant  = p.variants?.[0];
              const size     = p.commonSpecs?.size || '';
              const ply      = variant?.ply || '';
              const brand    = p.brand?.name || '';

              return (
                <View key={p._id} style={styles.card} wrap={false}>
                  {/* Image */}
                  <View style={styles.imgBox}>
                    {imageUrl ? (
                      <Image
                        src={{ uri: imageUrl, method: 'GET', headers: {}, body: '' }}
                        style={styles.img}
                        cache={true}
                      />
                    ) : (
                      <View style={styles.imgPlaceholder} />
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.cardBody}>
                    <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                    {brand ? <Text style={styles.brand}>{brand}</Text> : null}
                    <Text style={styles.specs}>
                      {[size, ply].filter(Boolean).join(' · ') || 'See details'}
                    </Text>
                    <Text style={styles.price}>{formatPrice(variant)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Badol Tyre Ghar · Shapla Chattar, Rangpur · {import.meta.env.VITE_WHATSAPP_NUMBER || ''}
          </Text>
          <Text
            style={styles.pageNum}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

export default CatalogDocument;
