import React from 'react';
import MarketIntro from './MarketIntro';
import '../../styles/stock-market/stockMarket.css';

const StockMarket = () => {
  return (
    <div className="stock-market-wrapper">
      <div className="stock-header">
        <h1>Trading Signals & Predictions</h1>
        <p>Analyze real-time data for stocks, currencies, and minerals, and forecast future behavior.</p>
      </div>

      {/* The Animated Intro Section */}
      <MarketIntro />

      {/* Future sections for data fetching and predictive charts will go below */}
      <div className="stock-dashboard-content">
        {/* Placeholder for future ML charts */}
      </div>
    </div>
  );
};

export default StockMarket;