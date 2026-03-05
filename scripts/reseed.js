import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../models/Schemas.js';
import { tubhyamProducts } from '../data/seedProducts.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tubhyam-inventory')
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Clear existing products
    await Product.deleteMany({});
    console.log('🗑️  Cleared old products');
    
    // Insert new products with images
    await Product.insertMany(tubhyamProducts);
    console.log(`✅ Reseeded ${tubhyamProducts.length} products with images!`);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
