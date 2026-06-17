/**
 * Fix Product Images: Map frontend image filenames to inventory paths
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

// Image mapping from frontend products.ts
const imageMap = {
  'PT-004': ['/images/products/olivecomfort.png'],
  'PT-005': ['/images/products/blankpants.jpeg'],
  'FP-001': ['/images/products/formal-6.jpeg'],
  'FP-002': ['/images/products/formal-pants-2.jpg'],
  'FP-003': ['/images/products/formal-pants-3.jpg'],
  'JN-003': ['/images/products/jeans-3.jpg'],
  'JN-004': ['/images/products/jeans-8.jpg'],
  'JN-005': ['/images/products/jeans-33.jpg'],
  'TP-002': ['/images/products/track-pants-2.jpg'],
  'TP-005': ['/images/products/slimfit.png'],
  'TP-006': ['/images/products/grey.png'],
  'TP-007': ['/images/products/olivecomfort.png'],
  'FP-004': ['/images/products/imported-beggy-black.jpeg'],
  'FP-005': ['/images/products/olive-formal-belt.jpeg'],
  'FP-006': ['/images/products/preuim-gray.jpeg'],
  'FP-007': ['/images/products/formal-1.jpeg'],
  'FP-008': ['/images/products/formal-2.jpeg'],
  'FP-009': ['/images/products/beige-formal.jpeg'],
  'FP-010': ['/images/products/belt-formal-balck.jpeg'],
  'FP-011': ['/images/products/belt-formal-beige.jpeg'],
  'FP-012': ['/images/products/belt-imported.jpeg'],
  'FP-013': ['/images/products/olive-fomral-belt.jpeg'],
  'FP-014': ['/images/products/brown-formal.jpeg'],
  'FP-015': ['/images/products/imported-beggy-black-formal.jpeg'],
  'FP-016': ['/images/products/imported-beggy-gray-formal.jpeg'],
  'FP-017': ['/images/products/preuim-black.jpeg'],
  'FP-018': ['/images/products/preuim-dark-brown.jpeg'],
  'FP-019': ['/images/products/preuim-gray.jpeg'],
  'FP-020': ['/images/products/slimfit-formal-pants-black,grey.jpeg'],
  'FP-021': ['/images/products/white-formal-belt.jpeg'],
  'TP-009': ['/images/products/blackbutton.png'],
  'FP-022': ['/images/products/brownbelt.png'],
  'FP-023': ['/images/products/greylace.png'],
  'FP-024': ['/images/products/blackmom.png'],
  'FP-025': ['/images/products/buttoncargo.png'],
  'FP-026': ['/images/products/blacklace.png'],
  'FP-027': ['/images/products/brownlace.png'],
  'FP-028': ['/images/products/widelook.jpeg'],
  'FP-029': ['/images/products/brownside.png'],
  'FP-030': ['/images/products/blackbutton.png'],
  'FP-031': ['/images/products/olivedouble button.png'],
  'TP-010': ['/images/products/balckcar2.png'],
  'TP-012': ['/images/products/khakifront.png'],
  'ACC-001': ['/images/products/belt-formal-balck.jpeg'],
  'FP-032': ['/images/products/blackstraight.png'],
  'TP-013': ['/images/products/blackcargo1.png'],
  'FP-033': ['/images/products/beige-formal.jpeg'],
  'FP-034': ['/images/products/front.jpeg'],
  'FP-035': ['/images/products/blacklacepant.jpeg'],
  'FP-036': ['/images/products/brownlacepant.jpeg'],
  'FP-037': ['/images/products/whitelacepant.jpeg'],
  'FP-038': ['/images/products/black cordset.jpeg'],
  'FP-039': ['/images/products/brown cordset (1).jpeg'],
  'FP-040': ['/images/products/beige cordset.jpeg'],
  'TP-014': ['/images/products/greencausal.jpeg'],
  'TP-015': ['/images/products/creamcausal.jpeg'],
  'TP-016': ['/images/products/greycausal.jpeg'],
  'TP-017': ['/images/products/lavendercausal.jpeg'],
  'TP-018': ['/images/products/navybluecausal.jpeg'],
  'TP-019': ['/images/products/browncausal.jpeg'],
  'FP-041': ['/images/products/blackpalted.jpeg'],
  'FP-042': ['/images/products/beggyplatedkoreanfront.png'],
  'FP-043': ['/images/products/beggyplatedkoreanback.png'],
  'JN-006': ['/images/products/frontdenim.png'],
};

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  images: [String],
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

async function fixImages() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected\n');

  let updated = 0;
  let skipped = 0;

  for (const [sku, images] of Object.entries(imageMap)) {
    const result = await Product.updateOne(
      { sku },
      { $set: { images } }
    );
    if (result.modifiedCount > 0) {
      console.log(`  ✅ ${sku}: ${images[0]}`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Image Fix Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (not found): ${skipped}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  await mongoose.disconnect();
  console.log('✅ Done!');
}

fixImages().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
