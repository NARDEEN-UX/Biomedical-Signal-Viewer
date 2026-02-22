import React, { useState } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';
import '../../styles/stock-market/compareMarketsCard.css'; 

const CompareMarketsCard = ({ onBack }) => {
  // 1. Form Data State
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [shortMa, setShortMa] = useState(50);
  const [longMa, setLongMa] = useState(200);
  const [seasonality, setSeasonality] = useState(30);
  
  // 2. Request Status & Chart Data State
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [chartData, setChartData] = useState(null);

  // 3. Control Panel States for Graph 1 (Relative Performance)
  const [showAsset1Pct, setShowAsset1Pct] = useState(true);
  const [showAsset2Pct, setShowAsset2Pct] = useState(true);

  // 4. Control Panel States for Graph 2 (Seasonality)
  const [showAsset1Season, setShowAsset1Season] = useState(true);
  const [showAsset2Season, setShowAsset2Season] = useState(true);

  // Helper function to detect crossovers between Short MA and Long MA
  const calculateIntersections = (timeAxis, shortMA, longMA) => {
    const xPoints = [];
    const yPoints = [];
    
    if (!timeAxis || !shortMA || !longMA) return { x: xPoints, y: yPoints };

    for (let i = 1; i < shortMA.length; i++) {
      const prevShort = shortMA[i - 1];
      const prevLong = longMA[i - 1];
      const currShort = shortMA[i];
      const currLong = longMA[i];

      // If they crossed over since the last data point
      if (
        (prevShort < prevLong && currShort >= currLong) ||
        (prevShort > prevLong && currShort <= currLong)
      ) {
        xPoints.push(timeAxis[i]);
        yPoints.push(currShort); // The point of intersection
      }
    }
    return { x: xPoints, y: yPoints };
  };

  const handleRunComparison = async () => {
    if (!file1 || !file2) {
      setStatusMessage('⚠️ Please upload both CSV files.');
      return;
    }

    setLoading(true);
    setStatusMessage('⏳ Sending comparison data...');
    setChartData(null); 

    const formData = new FormData();
    formData.append('file1', file1);
    formData.append('file2', file2);

    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/compare?ma_short=${shortMa}&ma_long=${longMa}&season_period=${seasonality}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      console.log('✅ Comparison Data:', response.data);
      setChartData(response.data);
      setStatusMessage('✅ Comparison complete!');
      
    } catch (error) {
      console.error('API Error:', error);
      setStatusMessage('❌ Comparison failed. Is your server running?');
    } finally {
      setLoading(false);
    }
  };

  const getCleanName = (filename) => {
    if (!filename) return 'Asset';
    return filename.replace('.csv', '');
  };

  // Pre-calculate intersections if chartData exists
  const asset1Intersections = chartData ? calculateIntersections(
    chartData.asset_1.time_axis, 
    chartData.asset_1.ma_cross.ma_short, 
    chartData.asset_1.ma_cross.ma_long
  ) : { x: [], y: [] };

  const asset2Intersections = chartData ? calculateIntersections(
    chartData.asset_2.time_axis, 
    chartData.asset_2.ma_cross.ma_short, 
    chartData.asset_2.ma_cross.ma_long
  ) : { x: [], y: [] };

  return (
    <div className="compare-full-width-container">
      
      {/* Header & Back Button */}
      <div className="compare-dashboard-header">
        <div>
          <h2>Compare Markets Dashboard</h2>
          <p>Evaluate two different assets side-by-side to find correlations.</p>
        </div>
        <button className="compare-back-btn" onClick={onBack}>
          ← Back to Markets
        </button>
      </div>

      {/* Top Input Panel */}
      <div className="compare-panel">
        <div className="compare-input-group">
          <label>Upload Asset 1</label>
          <input type="file" accept=".csv" onChange={(e) => setFile1(e.target.files[0])} />
        </div>
        <div className="compare-input-group">
          <label>Upload Asset 2</label>
          <input type="file" accept=".csv" onChange={(e) => setFile2(e.target.files[0])} />
        </div>
        <div className="compare-input-group">
          <label>Short MA</label>
          <input type="number" value={shortMa} onChange={(e) => setShortMa(e.target.value)} />
        </div>
        <div className="compare-input-group">
          <label>Long MA</label>
          <input type="number" value={longMa} onChange={(e) => setLongMa(e.target.value)} />
        </div>
        <div className="compare-input-group">
          <label>Seasonality</label>
          <input type="number" value={seasonality} onChange={(e) => setSeasonality(e.target.value)} />
        </div>

        {/* Action Buttons */}
        <div className="compare-button-group">
          <button className="compare-action-btn" onClick={handleRunComparison} disabled={loading}>
            {loading ? 'Processing...' : 'Run Comparison'}
          </button>
          <button className="compare-cancel-btn" onClick={onBack}>
            Cancel
          </button>
        </div>
      </div>

      {/* Show success/error messages */}
      {statusMessage && (
        <p className={`compare-status-message ${statusMessage.includes('❌') ? 'error-text' : 'success-text'}`}>
          {statusMessage}
        </p>
      )}

      {/* --- GRAPHS SECTION --- */}
      {chartData && (
        <div className="compare-results-section">
          
          {/* Title Banner */}
          <div className="comparison-title-banner">
            <h3>
              Comparing: <span className="highlight-asset1">{getCleanName(chartData.asset_1.filename)}</span> 
              {" "}vs{" "} 
              <span className="highlight-asset2">{getCleanName(chartData.asset_2.filename)}</span>
            </h3>
          </div>

          {/* 🌟 GRAPH 1: Relative Performance Graph */}
          <div className="compare-graphs-container">
            <div className="compare-graph-header-with-controls">
              <h4 className="compare-graph-title">Graph 1: Relative Performance (%)</h4>
              <div className="compare-chart-controls">
                <label className="compare-checkbox-label">
                  <input type="checkbox" checked={showAsset1Pct} onChange={(e) => setShowAsset1Pct(e.target.checked)} />
                  Show {getCleanName(chartData.asset_1.filename)}
                </label>
                <label className="compare-checkbox-label">
                  <input type="checkbox" checked={showAsset2Pct} onChange={(e) => setShowAsset2Pct(e.target.checked)} />
                  Show {getCleanName(chartData.asset_2.filename)}
                </label>
              </div>
            </div>

            <Plot
              data={[
                ...(showAsset1Pct ? [{
                  x: chartData.asset_1.time_axis,
                  y: chartData.asset_1.pct_comparison,
                  type: 'scatter',
                  mode: 'lines',
                  name: getCleanName(chartData.asset_1.filename),
                  line: { color: '#237faa', width: 2 } 
                }] : []),
                ...(showAsset2Pct ? [{
                  x: chartData.asset_2.time_axis,
                  y: chartData.asset_2.pct_comparison,
                  type: 'scatter',
                  mode: 'lines',
                  name: getCleanName(chartData.asset_2.filename),
                  line: { color: '#7a2713', width: 2 } 
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
                yaxis: { title: 'Percentage Change (%)', fixedrange: false }
              }}
              useResizeHandler={true}
              className="plotly-graph"
            />
          </div>

          {/* 🌟 GRAPH 2: Seasonality Comparison Graph (SPLIT AXES) */}
          <div className="compare-graphs-container">
            <div className="compare-graph-header-with-controls">
              <h4 className="compare-graph-title">Graph 2: Seasonality Comparison</h4>
              <div className="compare-chart-controls">
                <label className="compare-checkbox-label">
                  <input type="checkbox" checked={showAsset1Season} onChange={(e) => setShowAsset1Season(e.target.checked)} />
                  Show {getCleanName(chartData.asset_1.filename)}
                </label>
                <label className="compare-checkbox-label">
                  <input type="checkbox" checked={showAsset2Season} onChange={(e) => setShowAsset2Season(e.target.checked)} />
                  Show {getCleanName(chartData.asset_2.filename)}
                </label>
              </div>
            </div>

            <Plot
              data={[
                ...(showAsset1Season ? [{
                  x: chartData.asset_1.time_axis,
                  y: chartData.asset_1.seasonality,
                  type: 'scatter',
                  mode: 'lines',
                  name: getCleanName(chartData.asset_1.filename),
                  line: { color: '#237faa', width: 1.5 },
                  yaxis: 'y1' 
                }] : []),
                ...(showAsset2Season ? [{
                  x: chartData.asset_2.time_axis,
                  y: chartData.asset_2.seasonality,
                  type: 'scatter',
                  mode: 'lines',
                  name: getCleanName(chartData.asset_2.filename),
                  line: { color: '#7a2713', width: 1.5 },
                  yaxis: 'y2' 
                }] : [])
              ]}
              layout={{
                autosize: true,
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#82a8c2' },
                margin: { t: 10, l: 60, r: 20, b: 40 },
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
                yaxis: { 
                  title: getCleanName(chartData.asset_1.filename), 
                  fixedrange: false,
                  domain: showAsset1Season && showAsset2Season ? [0.55, 1] : [0, 1], 
                  visible: showAsset1Season
                },
                yaxis2: { 
                  title: getCleanName(chartData.asset_2.filename), 
                  fixedrange: false,
                  domain: showAsset1Season && showAsset2Season ? [0, 0.45] : [0, 1], 
                  visible: showAsset2Season,
                  anchor: 'x' 
                }
              }}
              useResizeHandler={true}
              className="plotly-graph"
            />
          </div>

          {/* 🌟 GRAPH 3: Asset 1 - Moving Averages */}
          <div className="compare-graphs-container">
            <div className="compare-graph-header-with-controls">
              <h4 className="compare-graph-title">
                Graph 3: {getCleanName(chartData.asset_1.filename)} - Moving Averages
              </h4>
            </div>

            <Plot
              data={[
                {
                  x: chartData.asset_1.time_axis,
                  y: chartData.asset_1.ma_cross.ma_short,
                  type: 'scatter',
                  mode: 'lines',
                  name: `Short MA (${shortMa})`,
                  line: { color: '#237faa', width: 2 } // Light blue
                },
                {
                  x: chartData.asset_1.time_axis,
                  y: chartData.asset_1.ma_cross.ma_long,
                  type: 'scatter',
                  mode: 'lines',
                  name: `Long MA (${longMa})`,
                  line: { color: '#7a2713', width: 2 } // Orange
                },
                {
                  x: asset1Intersections.x,
                  y: asset1Intersections.y,
                  type: 'scatter',
                  mode: 'markers',
                  name: 'Crossover Points',
                  marker: { color: '#ffeb3b', size: 8, symbol: 'circle', line: { color: '#fff', width: 1 } },
                  hoverinfo: 'x+y'
                }
              ]}
              layout={{
                autosize: true,
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#82a8c2' },
                margin: { t: 10, l: 40, r: 20, b: 40 },
                legend: { orientation: "h", y: 1.1, x: 0, font: { color: "#e7f7fa" } },
                xaxis: { title: 'Time', rangeslider: { visible: false } },
                yaxis: { title: 'Value', fixedrange: false }
              }}
              useResizeHandler={true}
              className="plotly-graph"
            />
          </div>

          {/* 🌟 GRAPH 4: Asset 2 - Moving Averages */}
          <div className="compare-graphs-container">
            <div className="compare-graph-header-with-controls">
              <h4 className="compare-graph-title">
                Graph 4: {getCleanName(chartData.asset_2.filename)} - Moving Averages
              </h4>
            </div>

            <Plot
              data={[
                {
                  x: chartData.asset_2.time_axis,
                  y: chartData.asset_2.ma_cross.ma_short,
                  type: 'scatter',
                  mode: 'lines',
                  name: `Short MA (${shortMa})`,
                  line: { color: '#237faa', width: 2 } // Light blue
                },
                {
                  x: chartData.asset_2.time_axis,
                  y: chartData.asset_2.ma_cross.ma_long,
                  type: 'scatter',
                  mode: 'lines',
                  name: `Long MA (${longMa})`,
                  line: { color: '#7a2713', width: 2 } // Orange
                },
                {
                  x: asset2Intersections.x,
                  y: asset2Intersections.y,
                  type: 'scatter',
                  mode: 'markers',
                  name: 'Crossover Points',
                  marker: { color: '#ffeb3b', size: 8, symbol: 'circle', line: { color: '#fff', width: 1 } },
                  hoverinfo: 'x+y'
                }
              ]}
              layout={{
                autosize: true,
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#82a8c2' },
                margin: { t: 10, l: 40, r: 20, b: 40 },
                legend: { orientation: "h", y: 1.1, x: 0, font: { color: "#e7f7fa" } },
                xaxis: { title: 'Time', rangeslider: { visible: false } },
                yaxis: { title: 'Value', fixedrange: false }
              }}
              useResizeHandler={true}
              className="plotly-graph"
            />
          </div>

        </div>
      )}

    </div>
  );
};

export default CompareMarketsCard;