import { SalesHistory, Product } from '../models/Schemas.js';

// Simple linear regression for demand prediction
class DemandPredictor {
  constructor() {
    this.seasonalFactors = {
      summer: 1.2,
      winter: 0.9,
      monsoon: 0.8,
      festive: 1.5
    };
  }

  // Calculate moving average
  calculateMovingAverage(salesData, windowSize = 4) {
    if (salesData.length < windowSize) return null;
    
    const recentSales = salesData.slice(-windowSize);
    const sum = recentSales.reduce((acc, val) => acc + val.quantitySold, 0);
    return sum / windowSize;
  }

  // Calculate trend
  calculateTrend(salesData) {
    if (salesData.length < 2) return 0;
    
    const firstHalf = salesData.slice(0, Math.floor(salesData.length / 2));
    const secondHalf = salesData.slice(Math.floor(salesData.length / 2));
    
    const firstAvg = firstHalf.reduce((acc, val) => acc + val.quantitySold, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((acc, val) => acc + val.quantitySold, 0) / secondHalf.length;
    
    return ((secondAvg - firstAvg) / firstAvg) * 100; // percentage change
  }

  // Get seasonal factor based on current month
  getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 3 && month <= 5) return 'summer';
    if (month >= 6 && month <= 9) return 'monsoon';
    if (month >= 10 && month <= 11) return 'festive';
    return 'winter';
  }

  // Predict demand for next week
  async predictDemand(productId) {
    try {
      const salesData = await SalesHistory.find({ productId })
        .sort({ saleDate: -1 })
        .limit(12); // Last 12 weeks

      if (salesData.length === 0) {
        return { predictedDemand: 0, confidence: 0, recommendation: 'Insufficient data' };
      }

      // Calculate metrics
      const movingAvg = this.calculateMovingAverage(salesData) || 0;
      const trend = this.calculateTrend(salesData);
      const currentSeason = this.getCurrentSeason();
      const seasonalFactor = this.seasonalFactors[currentSeason];

      // Apply predictions
      let predictedDemand = movingAvg * seasonalFactor;
      
      // Adjust for trend
      if (trend > 10) {
        predictedDemand *= 1.1; // Increasing trend
      } else if (trend < -10) {
        predictedDemand *= 0.9; // Decreasing trend
      }

      // Generate recommendation
      let recommendation = '';
      if (predictedDemand > movingAvg * 1.3) {
        recommendation = `High demand expected! Consider restocking ${Math.ceil(predictedDemand * 2)} units`;
      } else if (predictedDemand < movingAvg * 0.7) {
        recommendation = 'Low demand expected. Avoid overstocking.';
      } else {
        recommendation = `Steady demand expected. Maintain current stock levels.`;
      }

      return {
        predictedDemand: Math.round(predictedDemand),
        confidence: Math.min(95, 60 + (salesData.length * 2)),
        trend: trend.toFixed(2),
        season: currentSeason,
        recommendation
      };
    } catch (error) {
      console.error('Prediction error:', error);
      return { predictedDemand: 0, confidence: 0, recommendation: 'Error calculating prediction' };
    }
  }

  // Generate insights for all products
  async generateInsights() {
    const products = await Product.find().populate('supplier');
    const insights = [];

    for (const product of products) {
      const prediction = await this.predictDemand(product._id);
      
      const shouldRestock = product.currentStock <= product.reorderPoint;
      const isOverstocked = product.currentStock > product.maxStock * 0.8;

      insights.push({
        productId: product._id,
        sku: product.sku,
        name: product.name,
        currentStock: product.currentStock,
        predictedDemand: prediction.predictedDemand,
        shouldRestock,
        isOverstocked,
        recommendation: prediction.recommendation,
        urgency: shouldRestock ? (product.currentStock === 0 ? 'critical' : 'high') : (isOverstocked ? 'low' : 'medium')
      });
    }

    return insights.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }
}

export const demandPredictor = new DemandPredictor();
