import React from 'react';
// Import the modular StockMarket wrapper we just built
// Adjust the path based on where your 'pages' and 'components' folders are relative to each other
import StockMarket from '../components/StockMarket/StockMarket';

const Stock = () => {
  return (
    <div className="stock-page-container">
      {/* This will render the header, the moving graph, 
        and the two cards we created earlier.
      */}
      <StockMarket />
    </div>
  );
};

export default Stock;