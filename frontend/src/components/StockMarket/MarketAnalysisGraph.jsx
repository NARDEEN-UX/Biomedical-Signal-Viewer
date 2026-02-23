// import React from 'react';
// import Plot from 'react-plotly.js';
// import '../../styles/stock-market/marketAnalysisCard.css'; // Re-using your CSS file

// const MarketAnalysisGraph = ({ chartData, onClose }) => {
//   // If there is no data yet, don't render anything
//   if (!chartData) return null;

//   return (
//     <div className="fullscreen-graph-overlay">
//       <div className="graph-header">
//         <h2 style={{ color: '#e7f7fa', margin: 0 }}>Interactive OHLC Candlestick Analysis</h2>
//         <button className="close-graph-btn" onClick={onClose}>
//           ✖ Close Graph
//         </button>
//       </div>
      
//       <div className="graph-body">
//         <Plot
//           data={[
//             {
//               x: chartData.time_axis,
//               open: chartData.open,
//               high: chartData.high,
//               low: chartData.low,
//               close: chartData.close,
//               type: 'candlestick',
//               xaxis: 'x',
//               yaxis: 'y',
//               increasing: { line: { color: '#26a69a' } }, // Green for up days
//               decreasing: { line: { color: '#ef5350' } }, // Red for down days
//             }
//           ]}
//           layout={{
//             autosize: true,
//             paper_bgcolor: 'transparent',
//             plot_bgcolor: 'transparent',
//             font: { color: '#82a8c2' },
//             margin: { t: 10, l: 40, r: 20, b: 40 },
//             xaxis: {
//               title: 'Time',
//               rangeslider: { visible: true }, 
//               rangeselector: { 
//                 buttons: [
//                   { count: 1, label: '1m', step: 'month', stepmode: 'backward' },
//                   { count: 6, label: '6m', step: 'month', stepmode: 'backward' },
//                   { count: 1, label: '1y', step: 'year', stepmode: 'backward' },
//                   { step: 'all', label: 'All' }
//                 ],
//                 bgcolor: '#1c6ea0',
//                 activecolor: '#2e528b',
//                 font: { color: '#fff' }
//               }
//             },
//             yaxis: {
//               title: 'Price',
//               fixedrange: false 
//             }
//           }}
//           useResizeHandler={true}
//           style={{ width: '100%', height: '100%' }} 
//         />
//       </div>
//     </div>
//   );
// };

// export default MarketAnalysisGraph;