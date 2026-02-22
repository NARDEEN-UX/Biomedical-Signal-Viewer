import React, { useState } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';
import '../../styles/stock-market/marketAnalysisCard.css'; 

const MarketAnalysisCard = ({ onBack }) => {
  // 1. Form Data State
  const [file, setFile] = useState(null);
  const [maWindow, setMaWindow] = useState(20);
  const [predSteps, setPredSteps] = useState(30);

  // 2. Request Status & Chart Data State
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [chartData, setChartData] = useState(null); 
  
  // 3. Control Panel States (For conditional rendering on graphs)
  const [showCloseLine, setShowCloseLine] = useState(false); // Graph 2
  const [showBollingerCandles, setShowBollingerCandles] = useState(false); // Graph 3

  // Handle file selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Handle the API request
  const handleRunAnalysis = async () => {
    if (!file) {
      setStatusMessage(' Please upload a CSV file first.');
      return;
    }

    setLoading(true);
    setStatusMessage(' Analyzing market data...');
    setChartData(null); 

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/analysis?ma_window=${maWindow}&pred_steps=${predSteps}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      console.log(' SUCCESS! Data received:', response.data);
      setChartData(response.data); 
      setStatusMessage(' Analysis complete!');
      
    } catch (error) {
      console.error('API Error:', error);
      setStatusMessage(' Analysis failed. Is your Python server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="full-width-analysis-container">
      
      {/* Header & Back Button */}
      <div className="analysis-dashboard-header">
        <div>
          <h2>Market Analysis Dashboard</h2>
          <p>Configure parameters and run predictions on your dataset.</p>
        </div>
        <button className="analysis-back-btn" onClick={onBack}>
          ← Back to Markets
        </button>
      </div>

      {/* Top Input Panel */}
      <div className="analysis-panel">
        
        <div className="input-group">
          <label>Upload Dataset (CSV)</label>
          <input type="file" accept=".csv" onChange={handleFileChange} />
        </div>

        <div className="input-group">
          <label>Moving Average Window (Days)</label>
          <input 
            type="number" 
            value={maWindow} 
            onChange={(e) => setMaWindow(e.target.value)} 
          />
        </div>

        <div className="input-group">
          <label>Forecast Future (Days)</label>
          <input 
            type="number" 
            value={predSteps} 
            onChange={(e) => setPredSteps(e.target.value)} 
          />
        </div>

        <div className="button-group">
          <button 
            className="action-btn"
            onClick={handleRunAnalysis} 
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Run Prediction'}
          </button>
          <button 
            className="cancel-btn"
            onClick={onBack}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Show success/error messages */}
      {statusMessage && (
        <p className={`status-message ${statusMessage.includes('❌') ? 'error-text' : 'success-text'}`}>
          {statusMessage}
        </p>
      )}

      {/* --- GRAPHS SECTION --- */}
      {chartData && (
        <>
          {/* 🌟 BOX 1: Candlestick Graph */}
          <div className="graphs-container">
            <h4 className="graph-title" style={{ marginTop: 0 }}>Graph 1: Interactive OHLC Candlestick</h4>
            <Plot
              data={[
                {
                  x: chartData.time_axis,
                  open: chartData.open,
                  high: chartData.high,
                  low: chartData.low,
                  close: chartData.close,
                  type: 'candlestick',
                  xaxis: 'x',
                  yaxis: 'y',
                  increasing: { line: { color: '#26a69a' } }, 
                  decreasing: { line: { color: '#ef5350' } }, 
                }
              ]}
              layout={{
                autosize: true,
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#82a8c2' },
                margin: { t: 10, l: 40, r: 20, b: 40 },
                xaxis: {
                  title: 'Time',
                  rangeslider: { visible: true }, 
                  rangeselector: { 
                    buttons: [
                      { count: 1, label: '1m', step: 'month', stepmode: 'backward' },
                      { count: 6, label: '6m', step: 'month', stepmode: 'backward' },
                      { count: 1, label: '1y', step: 'year', stepmode: 'backward' },
                      { step: 'all', label: 'All' }
                    ],
                    bgcolor: '#1c6ea0',
                    activecolor: '#2e528b',
                    font: { color: '#fff' }
                  }
                },
                yaxis: { title: 'Price', fixedrange: false }
              }}
              useResizeHandler={true}
              className="plotly-graph"
            />
          </div>
        
          {/* 🌟 BOX 2: Moving Average Overlay Graph */}
          <div className="graphs-container">
            <div className="graph-header-with-controls">
              <h4 className="graph-title" style={{ marginTop: 0 }}>Graph 2: Moving Average Overlay</h4>
              <div className="chart-controls">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={showCloseLine} 
                    onChange={(e) => setShowCloseLine(e.target.checked)} 
                  />
                  Plot Close Price (Syncs to MA start)
                </label>
              </div>
            </div>

            <Plot
              data={[
                // 1. Moving Average Trace
                {
                  x: chartData.time_axis,
                  y: chartData.MA_overlay,
                  type: 'scatter',
                  mode: 'lines',
                  name: `MA (${maWindow} days)`,
                  line: { color: '#8f1a1a', width: 2 }
                },
                // 2. Conditional Close Price Trace
                ...(showCloseLine ? [{
                  x: chartData.time_axis,
                  // Replace close value with null if MA is null to skip the first X days identically
                  y: chartData.close.map((val, index) => chartData.MA_overlay[index] === null ? null : val),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Close Price',
                  line: { color: '#29b6f6', width: 1.5, dash: 'dot' } // Dotted line helps differentiate from MA
                }] : [])
              ]}
              layout={{
                autosize: true,
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#82a8c2' },
                margin: { t: 10, l: 40, r: 20, b: 40 },
                legend: { orientation: "h", y: 1.1, x: 0, font: { color: "#e7f7fa" } }, // Horizontal legend
                xaxis: {
                  title: 'Time',
                  rangeslider: { visible: true }, 
                  rangeselector: { 
                    buttons: [
                      { count: 1, label: '1m', step: 'month', stepmode: 'backward' },
                      { count: 6, label: '6m', step: 'month', stepmode: 'backward' },
                      { count: 1, label: '1y', step: 'year', stepmode: 'backward' },
                      { step: 'all', label: 'All' }
                    ],
                    bgcolor: '#1c6ea0',
                    activecolor: '#2e528b',
                    font: { color: '#fff' }
                  }
                },
                yaxis: { title: 'Value', fixedrange: false }
              }}
              useResizeHandler={true}
              className="plotly-graph"
            />
          </div>

          {/* 🌟 BOX 3: Bollinger Bands Graph */}
          {chartData.Bollinger_Bands && (
            <div className="graphs-container">
              <div className="graph-header-with-controls">
                <h4 className="graph-title" style={{ marginTop: 0 }}>Graph 3: Bollinger Bands</h4>
                <div className="chart-controls">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={showBollingerCandles} 
                      onChange={(e) => setShowBollingerCandles(e.target.checked)} 
                    />
                    Overlay Candlestick Chart
                  </label>
                </div>
              </div>

              <Plot
                data={[
                  // 1. Upper Band
                  {
                    x: chartData.time_axis,
                    y: chartData.Bollinger_Bands.upper,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Upper Band',
                    line: { color: '#81c784', width: 1.5, dash: 'dot' }
                  },
                  // 2. Lower Band
                  {
                    x: chartData.time_axis,
                    y: chartData.Bollinger_Bands.lower,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Lower Band',
                    line: { color: '#e57373', width: 1.5, dash: 'dot' }
                  },
                  // 3. Moving Average (Middle Band)
                  {
                    x: chartData.time_axis,
                    y: chartData.Bollinger_Bands['Moving average'],
                    type: 'scatter',
                    mode: 'lines',
                    name: `Middle Band (MA ${maWindow})`,
                    line: { color: '#941c1c', width: 2 }
                  },
                  // 4. Conditional Candlestick Trace
                  ...(showBollingerCandles ? [{
                    x: chartData.time_axis,
                    open: chartData.open,
                    high: chartData.high,
                    low: chartData.low,
                    close: chartData.close,
                    type: 'candlestick',
                    name: 'Candlestick',
                    increasing: { line: { color: '#26a69a' } }, 
                    decreasing: { line: { color: '#ef5350' } }, 
                  }] : [])
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#82a8c2' },
                  margin: { t: 10, l: 40, r: 20, b: 40 },
                  legend: { orientation: "h", y: 1.1, x: 0, font: { color: "#e7f7fa" } },
                  xaxis: {
                    title: 'Time',
                    rangeslider: { visible: true }, 
                    rangeselector: { 
                      buttons: [
                        { count: 1, label: '1m', step: 'month', stepmode: 'backward' },
                        { count: 6, label: '6m', step: 'month', stepmode: 'backward' },
                        { count: 1, label: '1y', step: 'year', stepmode: 'backward' },
                        { step: 'all', label: 'All' }
                      ],
                      bgcolor: '#1c6ea0',
                      activecolor: '#2e528b',
                      font: { color: '#fff' }
                    }
                  },
                  yaxis: { title: 'Price', fixedrange: false }
                }}
                useResizeHandler={true}
                className="plotly-graph"
              />
            </div>
          )}

          {/* 🌟 BOX 4: Volatility Graph */}
          {(chartData.Volatility || chartData.volatility) && (
            <div className="graphs-container">
              <h4 className="graph-title" style={{ marginTop: 0 }}>Graph 4: Market Volatility</h4>
              <Plot
                data={[
                  {
                    x: chartData.time_axis,
                    y: chartData.Volatility || chartData.volatility,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Volatility',
                    line: { color: '#dfcfcf', width: 2 } // Purple line for contrast
                  }
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#82a8c2' },
                  margin: { t: 10, l: 40, r: 20, b: 40 },
                  xaxis: {
                    title: 'Time',
                    rangeslider: { visible: true }, 
                    rangeselector: { 
                      buttons: [
                        { count: 1, label: '1m', step: 'month', stepmode: 'backward' },
                        { count: 6, label: '6m', step: 'month', stepmode: 'backward' },
                        { count: 1, label: '1y', step: 'year', stepmode: 'backward' },
                        { step: 'all', label: 'All' }
                      ],
                      bgcolor: '#1c6ea0',
                      activecolor: '#2e528b',
                      font: { color: '#fff' }
                    }
                  },
                  yaxis: { title: 'Volatility', fixedrange: false }
                }}
                useResizeHandler={true}
                className="plotly-graph"
              />
            </div>
          )}

          {/* 🌟 BOX 5: Future Predictions Graph */}
          {chartData.prediction_dates && chartData.prediction_values && (
            <div className="graphs-container">
              <h4 className="graph-title" style={{ marginTop: 0 }}>Graph 5: Future Price Prediction</h4>
              <Plot
                data={[
                  // 1. Historical Close Trace
                  {
                    x: chartData.time_axis,
                    y: chartData.close,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Historical Close',
                    line: { color: '#29b6f6', width: 2 }
                  },
                  // 2. Prediction Trace (Connected to the last point of historical data)
                  {
                    x: [chartData.time_axis[chartData.time_axis.length - 1], ...chartData.prediction_dates],
                    y: [chartData.close[chartData.close.length - 1], ...chartData.prediction_values],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Forecast Prediction',
                    line: { color: '#a54141', width: 2.5, dash: 'dot' } // Orange dotted line for predictions
                  }
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#82a8c2' },
                  margin: { t: 10, l: 40, r: 20, b: 40 },
                  legend: { orientation: "h", y: 1.1, x: 0, font: { color: "#e7f7fa" } },
                  xaxis: {
                    title: 'Time',
                    rangeslider: { visible: true }, 
                    rangeselector: { 
                      buttons: [
                        { count: 1, label: '1m', step: 'month', stepmode: 'backward' },
                        { count: 6, label: '6m', step: 'month', stepmode: 'backward' },
                        { count: 1, label: '1y', step: 'year', stepmode: 'backward' },
                        { step: 'all', label: 'All' }
                      ],
                      bgcolor: '#1c6ea0',
                      activecolor: '#2e528b',
                      font: { color: '#fff' }
                    }
                  },
                  yaxis: { title: 'Price', fixedrange: false }
                }}
                useResizeHandler={true}
                className="plotly-graph"
              />
            </div>
          )}

        </>
      )}
    </div>
  );
};

export default MarketAnalysisCard;