import React, { useState } from 'react';
import MarketAnalysisCard from './MarketAnalysisCard';
import CompareMarketsCard from './CompareMarketsCard';
import '../../styles/stock-market/marketIntro.css';

const MarketIntro = () => {
  // State to track which view is active: 'intro', 'analysis', or 'compare'
  const [activeView, setActiveView] = useState('intro');

  return (
    <div className="market-intro-container" style={{ width: '100%' }}>
      
      {/* --- INTRO VIEW (Shows Animated Graph and the 2 Cards) --- */}
      {activeView === 'intro' && (
        <>
          {/* LEFT: Moving Vertical Graph */}
          <div className="animated-graph-container">
            <div className="animated-graph">
              <div className="bar bar-1"></div>
              <div className="bar bar-2"></div>
              <div className="bar bar-3"></div>
              <div className="bar bar-4"></div>
              <div className="bar bar-5"></div>
              <div className="bar bar-6"></div>
              <div className="bar bar-7"></div>
            </div>
            <div className="graph-base-line"></div>
          </div>

          {/* RIGHT: Action Cards */}
          <div className="intro-cards-container">
            
            {/* Market Analysis Intro Card */}
            <div className="action-card">
              <h3>Market Analysis</h3>
              <p>Dive deep into individual asset performance, historical trends, and predictive modeling for stocks, forex, or minerals.</p>
              <button 
                className="main-btn" 
                onClick={() => setActiveView('analysis')}
              >
                Start Analysis
              </button>
            </div>

            {/* Compare Markets Intro Card */}
            <div className="action-card">
              <h3>Compare Markets</h3>
              <p>Evaluate two different assets side-by-side to find correlations, volatility differences, and trading opportunities.</p>
              <button 
                className="main-btn" 
                onClick={() => setActiveView('compare')}
              >
                Compare Assets
              </button>
            </div>
            
          </div>
        </>
      )}

      {/* --- FULL VIEWS --- */}
      {activeView === 'analysis' && (
        <MarketAnalysisCard onBack={() => setActiveView('intro')} />
      )}

      {activeView === 'compare' && (
        <CompareMarketsCard onBack={() => setActiveView('intro')} />
      )}
      
    </div>
  );
};

export default MarketIntro;