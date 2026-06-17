/**
 * Auto-Sync Script: Website products.ts → Inventory Database
 * 
 * Reads all products from the frontend products.ts file,
 * compares with existing inventory database, and adds any new ones.
 * 
 * Usage: node scripts/syncFromWebsite.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env');
  process.exit(1);
}

// Import Product model
const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['formal', 'track', 'jeans', 'belt'], required: true },
  mrp: Number,
  sellingPrice: Number,
  costPrice: Number,
  currentStock: { type: Number, default: 0 },
  minStock: { type: Number, default: 5 },
  reorderPoint: { type: Number, default: 10 },
  status: { type: String, enum: ['in-stock', 'low-stock', 'out-of-stock'], default: 'in-stock' },
  sizes: [{ size: String, stock: { type: Number, default: 0 } }],
  colors: [{ color: String, stock: { type: Number, default: 0 } }],
  images: [String],
  description: String,
  material: String,
  isNew: Boolean,
  isBestSeller: Boolean,
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

/**
 * Parse product objects from products.ts using regex
 */
function parseProductsFromTS() {
  const productsFile = path.join(__dirname, '..', '..', 'src', 'data', 'products.ts');
  
  if (!fs.existsSync(productsFile)) {
    console.error('❌ Could not find src/data/products.ts');
    process.exit(1);
  }

  const content = fs.readFileSync(productsFile, 'utf-8');
  
  // Extract the products array section
  const arrayStart = content.indexOf('export const products: Product[] = [');
  const arrayEnd = content.indexOf('\n];', arrayStart);
  
  if (arrayStart === -1 || arrayEnd === -1) {
    console.error('❌ Could not locate products array in products.ts');
    process.exit(1);
  }

  const productsSection = content.substring(arrayStart, arrayEnd + 3);
  
  // Parse individual product objects
  const products = [];
  const productRegex = /\{\s*id:\s*"([^"]+)"[\s\S]*?\n\s*\}/g;
  let match;

  while ((match = productRegex.exec(productsSection)) !== null) {
    const block = match[0];
    
    const id = extractString(block, 'id');
    const name = extractString(block, 'name');
    const category = extractString(block, 'category');
    const price = extractNumber(block, 'price');
    const originalPrice = extractNumber(block, 'originalPrice');
    const description = extractString(block, 'description');
    const material = extractString(block, 'material');
    const sizes = extractArray(block, 'sizes');
    const colors = extractArray(block, 'colors');
    const inStock = block.includes('inStock: true');
    const isNew = block.includes('isNew: true');
    const isBestSeller = block.includes('isBestSeller: true');

    if (id && name && category) {
      products.push({
        id, name, category, price, originalPrice,
        description, material, sizes, colors,
        inStock, isNew, isBestSeller
      });
    }
  }

  return products;
}

function extractString(block, field) {
  // Match both single-line and multi-line string values
  const regex = new RegExp(`${field}:\\s*"([^"]*)"`, 's');
  const match = block.match(regex);
  if (match) return match[1];
  
  // Try template literal or multi-line
  const regex2 = new RegExp(`${field}:[\\s]*\n?\\s*"([\\s\\S]*?)"`, 'm');
  const match2 = block.match(regex2);
  return match2 ? match2[1] : null;
}

function extractNumber(block, field) {
  const regex = new RegExp(`${field}:\\s*(\\d+)`);
  const match = block.match(regex);
  return match ? parseInt(match[1]) : null;
}

function extractArray(block, field) {
  const regex = new RegExp(`${field}:\\s*\\[([^\\]]+)\\]`);
  const match = block.match(regex);
  if (!match) return [];
  
  // Extract quoted strings from array
  const items = [];
  const strRegex = /"([^"]+)"/g;
  let strMatch;
  while ((strMatch = strRegex.exec(match[1])) !== null) {
    items.push(strMatch[1]);
  }
  return items;
}

/**
 * Convert frontend product to inventory format
 */
function toInventoryProduct(frontendProduct) {
  const { id, name, category, price, originalPrice, description, material, sizes, colors, isNew, isBestSeller } = frontendProduct;
  
  // Generate SKU from ID (e.g., "fp-001" → "FP-001")
  const sku = id.toUpperCase();
  
  // Calculate cost price (roughly 50% of selling)
  const sellingPrice = price;
  const costPrice = Math.round(price * 0.5);
  
  // Default stock: 15 per product spread across sizes
  const totalStock = 15;
  const perSizeStock = Math.max(1, Math.floor(totalStock / (sizes.length || 1)));
  
  const sizeEntries = sizes.map((size, i) => ({
    size,
    stock: i === 0 ? totalStock - (perSizeStock * (sizes.length - 1)) : perSizeStock
  }));

  // Distribute stock across colors
  const perColorStock = Math.max(1, Math.floor(totalStock / (colors.length || 1)));
  const colorEntries = colors.map((color, i) => ({
    color,
    stock: i === 0 ? totalStock - (perColorStock * (colors.length - 1)) : perColorStock
  }));

  return {
    sku,
    name,
    category: mapCategory(category),
    mrp: originalPrice || Math.round(price * 1.3),
    sellingPrice,
    costPrice,
    currentStock: totalStock,
    minStock: 5,
    reorderPoint: 10,
    status: totalStock > 10 ? 'in-stock' : (totalStock > 5 ? 'low-stock' : 'out-of-stock'),
    sizes: sizeEntries,
    colors: colorEntries,
    images: [], // Images stay on frontend, inventory uses its own uploads
    description: description || '',
    material: material || '',
    isNew: isNew || false,
    isBestSeller: isBestSeller || false,
  };
}

function mapCategory(cat) {
  // Inventory only supports: formal, track, jeans, belt
  const map = { formal: 'formal', track: 'track', jeans: 'jeans', belt: 'belt' };
  return map[cat] || 'formal';
}

/**
 * Main sync function
 */
async function syncProducts() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // Parse frontend products
  const frontendProducts = parseProductsFromTS();
  console.log(`📦 Found ${frontendProducts.length} products in products.ts\n`);

  // Get existing SKUs from database
  const existingProducts = await Product.find({}, { sku: 1 });
  const existingSKUs = new Set(existingProducts.map(p => p.sku));
  console.log(`📊 Existing in inventory: ${existingSKUs.size} products\n`);

  // Find new products
  const newProducts = frontendProducts.filter(p => !existingSKUs.has(p.id.toUpperCase()));
  
  if (newProducts.length === 0) {
    console.log('✅ All products are already synced! Nothing to add.');
    await mongoose.disconnect();
    return;
  }

  console.log(`🆕 New products to sync: ${newProducts.length}\n`);
  
  // Insert new products
  let added = 0;
  let errors = 0;

  for (const product of newProducts) {
    const inventoryProduct = toInventoryProduct(product);
    try {
      await Product.create(inventoryProduct);
      console.log(`  ✅ Added: ${inventoryProduct.sku} - ${inventoryProduct.name}`);
      added++;
    } catch (err) {
      if (err.code === 11000) {
        console.log(`  ⚠️  Skipped (duplicate): ${inventoryProduct.sku} - ${inventoryProduct.name}`);
      } else {
        console.log(`  ❌ Error: ${inventoryProduct.sku} - ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Sync Summary:`);
  console.log(`   Total in website: ${frontendProducts.length}`);
  console.log(`   Already in inventory: ${existingSKUs.size}`);
  console.log(`   Newly added: ${added}`);
  console.log(`   Errors: ${errors}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  await mongoose.disconnect();
  console.log('✅ Done! Disconnected from MongoDB.');
}

// Run
syncProducts().catch(err => {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
});
