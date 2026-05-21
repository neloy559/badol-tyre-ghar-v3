import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const BTG_RED   = '#CC0000';
const BTG_DARK  = '#111111';
const BTG_GREY  = '#666666';
const BTG_LIGHT = '#F5F5F5';
const BTG_BORDER = '#EEEEEE';

const getPdfImageUrl = (url) => {
  if (!url) return null;
  if (url.includes('cloudinary.com')) {
    const idx = url.indexOf('/upload/');
    if (idx === -1) return url;
    const base = url.substring(0, idx + 8);
    const path = url.substring(idx + 8).replace(/^[^/]+\//, '');
    return `${base}f_jpg,c_pad,b_white,w_200,q_70/${path}`;
  }
  return url;
};

const formatPrice = (variant) => {
  if (!variant) return 'Call for Price';
  const price = variant.pricing?.retail || variant.pricing?.wholesale || variant.price;
  if (!price) return 'Call for Price';
  return `BDT ${Number(price).toLocaleString('en-IN')}`;
};

const styles = StyleSheet.create({
  // ── Page ──────────────────────────────────────────────────
  page: {
    padding: 28,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  // ── Cover Header ──────────────────────────────────────────
  header: {
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: BTG_RED,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: BTG_RED },
  headerSub:   { fontSize: 9,  color: BTG_GREY, marginTop: 2 },
  headerRight: { fontSize: 8,  color: BTG_GREY, textAlign: 'right' },
  // ── Product Grid ──────────────────────────────────────────
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  card: {
    width: '23%',
    marginBottom: 7,
    borderWidth: 1,
    borderColor: BTG_BORDER,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: BTG_LIGHT,
  },
  imgBox:      { width: '100%', height: 68, backgroundColor: '#F0F0F0' },
  img:         { width: '100%', height: 68, objectFit: 'contain' },
  imgPlaceholder: { width: '100%', height: 68, backgroundColor: '#E8E8E8' },
  cardBody:    { padding: 5 },
  productName: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BTG_DARK, marginBottom: 2, lineHeight: 1.3 },
  brand:       { fontSize: 6.5, color: '#888', marginBottom: 2 },
  specs:       { fontSize: 6.5, color: BTG_GREY, marginBottom: 3, lineHeight: 1.3 },
  price:       { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BTG_RED },
  // ── Footer (fixed on every page) ──────────────────────────
  footer: {
    position: 'absolute',
    bottom: 14, left: 28, right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BTG_BORDER,
    paddingTop: 5,
  },
  footerText: { fontSize: 7, color: '#AAA' },
  pageNum:    { fontSize: 7, color: '#AAA' },
  // ── About Us Back Page ────────────────────────────────────
  aboutPage: {
    padding: 36,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    flex: 1,
  },
  aboutHeader: {
    borderBottomWidth: 2,
    borderBottomColor: BTG_RED,
    paddingBottom: 10,
    marginBottom: 20,
  },
  aboutTitle:    { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BTG_RED, marginBottom: 3 },
  aboutTagline:  { fontSize: 10, color: BTG_GREY, fontFamily: 'Helvetica-Oblique' },
  aboutBody:     { fontSize: 9.5, color: BTG_DARK, lineHeight: 1.7, marginBottom: 14 },
  aboutBold:     { fontFamily: 'Helvetica-Bold' },
  brandsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
  },
  brandChip: {
    backgroundColor: BTG_LIGHT,
    borderWidth: 1,
    borderColor: BTG_BORDER,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: BTG_DARK,
  },
  contactBox: {
    backgroundColor: BTG_LIGHT,
    borderRadius: 6,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: BTG_RED,
  },
  contactTitle:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BTG_RED, marginBottom: 8 },
  contactRow:    { flexDirection: 'row', marginBottom: 5, alignItems: 'flex-start' },
  contactLabel:  { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BTG_DARK, width: 70 },
  contactValue:  { fontSize: 8.5, color: BTG_GREY, flex: 1 },
  // ── Empty state ───────────────────────────────────────────
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#CCC' },
});

// ── About Us Back Page Component ──────────────────────────────
const AboutPage = ({ whatsapp }) => (
  <Page size="A4" style={styles.aboutPage}>
    <View style={styles.aboutHeader}>
      <Text style={styles.aboutTitle}>বাদল টায়ার ঘর — আমাদের কথা</Text>
      <Text style={styles.aboutTagline}>বিশ্বাস আর মানের সাথে কয়েক দশকের পথচলা।</Text>
    </View>

    <Text style={styles.aboutBody}>
      রংপুরের ঠিকাদারপাড়া মোড়ে যারা একবার এসেছেন, বাদল টায়ার ঘরের নাম তারা চেনেন। এই দোকান শুধু একটা ব্যবসা না — এটা আমার বাবার সারাজীবনের পরিশ্রম আর ভালোবাসার ফসল।
    </Text>

    <Text style={styles.aboutBody}>
      আমার বাবা{' '}
      <Text style={styles.aboutBold}>MD. Mostaq Sharker Badol</Text>
      {' '}ছোটবেলা থেকেই এই বাজারে আছেন। এই মার্কেটের কত উঠানামা, কত পরিবর্তন — সব কিছু নিজের চোখে দেখেছেন, সামলেছেন। তিনিই এই এলাকায় প্রথম{' '}
      <Text style={styles.aboutBold}>Force</Text>
      {' '}(যেটা এখন{' '}
      <Text style={styles.aboutBold}>Hussain</Text>
      {' '}নামে পরিচিত, Apex International-এর অংশ) এর সাথে অফিসিয়াল ডিলারশিপ করেন — যখন এই ধরনের কর্পোরেট চুক্তি এখানে কেউ ভাবতেও পারত না।
    </Text>

    <Text style={styles.aboutBody}>
      এখন আমরা এই ব্র্যান্ডগুলোর অফিসিয়াল ডিলার:
    </Text>

    <View style={styles.brandsRow}>
      {['Hussain', 'MTF', 'Zess', 'MRF', 'Tourino', 'Rupsha'].map(b => (
        <Text key={b} style={styles.brandChip}>{b}</Text>
      ))}
    </View>

    <Text style={styles.aboutBody}>
      আমি{' '}
      <Text style={styles.aboutBold}>MD. Faiaz Sharker Neloy</Text>
      {' '}— বাবার একমাত্র ছেলে। পড়াশোনা শেষ করে চাকরির পেছনে না দৌড়ে বাবার এই ব্যবসাটাকেই এগিয়ে নিয়ে যাওয়ার সিদ্ধান্ত নিয়েছি। ২০১৫ সাল থেকে টেকনোলজির সাথে যুক্ত আছি — এখন সেই অভিজ্ঞতাটাই কাজে লাগাচ্ছি বাবার এই পুরনো ব্যবসাকে ডিজিটাল করতে।
    </Text>

    <Text style={styles.aboutBody}>
      এই ওয়েবসাইট, এই ক্যাটালগ — সব কিছুই বাবার প্রতি আমার একটু ভালোবাসা। আর আপনাদের প্রতি একটা প্রতিশ্রুতি — একই বিশ্বাস, একই মান, এখন আরও সহজে।
    </Text>

    <View style={styles.contactBox}>
      <Text style={styles.contactTitle}>যোগাযোগ করুন</Text>
      <View style={styles.contactRow}>
        <Text style={styles.contactLabel}>📍 ঠিকানা</Text>
        <Text style={styles.contactValue}>ঠিকাদারপাড়া মোড়, স্টেশন রোড, শাপলা চত্বর, রংপুর</Text>
      </View>
      <View style={styles.contactRow}>
        <Text style={styles.contactLabel}>📞 WhatsApp</Text>
        <Text style={styles.contactValue}>+{whatsapp || '880XXXXXXXXXX'}</Text>
      </View>
      <View style={styles.contactRow}>
        <Text style={styles.contactLabel}>🌐 ওয়েবসাইট</Text>
        <Text style={styles.contactValue}>badol-tyre-ghar.vercel.app</Text>
      </View>
    </View>
  </Page>
);

// ── Main Document ─────────────────────────────────────────────
const CatalogDocument = ({
  products = [],
  categoryName = 'All Products',
  whatsapp = '',
}) => {
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
      {/* ── Product Pages ── */}
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.headerTitle}>Badol Tyre Ghar</Text>
            <Text style={styles.headerSub}>{categoryName} — Product Catalog</Text>
          </View>
          <Text style={styles.headerRight}>
            {dateStr}{'\n'}badol-tyre-ghar.vercel.app
          </Text>
        </View>

        {/* Grid */}
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
                  <View style={styles.cardBody}>
                    <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                    {brand ? <Text style={styles.brand}>{brand}</Text> : null}
                    <Text style={styles.specs}>
                      {[size, ply].filter(Boolean).join(' · ') || '—'}
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
            Badol Tyre Ghar · Shapla Chattar, Rangpur
          </Text>
          <Text
            style={styles.pageNum}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>

      {/* ── About Us Back Page ── */}
      <AboutPage whatsapp={whatsapp} />
    </Document>
  );
};

export default CatalogDocument;
