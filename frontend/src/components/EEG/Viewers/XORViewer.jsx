import React, { useState, useEffect, useRef, useCallback } from 'react';
import Plot from 'react-plotly.js';
import '../../../styles/eeg/Viewers/XORViewer.css';

const XORViewer = ({ fileId, metadata }) => {
  // --- STATE MANAGEMENT ---
  const [dataBuffer, setDataBuffer] = useState({ time: [] });
  const [nextPageToFetch, setNextPageToFetch] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const fetchedPages = useRef(new Set()); 
  const dataLimit = 1000; 

  // --- XOR & CHANNEL SETTINGS ---
  const [selectedChannel, setSelectedChannel] = useState('');
  const [channelThickness, setChannelThickness] = useState(1.5);
  const [verticalOffset, setVerticalOffset] = useState(30); // New: controls vertical spacing between chunks
  
  const [chunkWidth, setChunkWidth] = useState(1.0); // W: Time Period for chunking (seconds)
  const [tolerance, setTolerance] = useState(5.0);   // Epsilon: Sensitivity for erasure
  const [comparisonMode, setComparisonMode] = useState('consecutive'); // 'consecutive' or 'baseline'
  
  // --- TIMELINE & PLAYBACK SETTINGS ---
  const analysisWindowSize = 10.0; // Amount of data (seconds) to load for the XOR comparison
  const [analysisStart, setAnalysisStart] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (metadata && metadata.features && metadata.features.channels) {
      const channels = metadata.features.channels;
      if (channels.length > 0) {
        setSelectedChannel(channels[0]); // Default to first channel
      }
      channels.forEach(ch => {
        setDataBuffer(prev => ({ ...prev, [ch]: [] }));
      });
    }
  }, [metadata]);

  // --- BACKGROUND DATA FETCHING ---
  const fetchNextChunk = useCallback(async () => {
    if (!fileId || isFetching) return;
    if (fetchedPages.current.has(nextPageToFetch)) return; 

    fetchedPages.current.add(nextPageToFetch);
    setIsFetching(true);

    try {
      const response = await fetch(`http://127.0.0.1:8000/EEG/data/${fileId}?page=${nextPageToFetch}&limit=${dataLimit}`);
      
      if (!response.ok) {
        fetchedPages.current.delete(nextPageToFetch);
        return;
      }

      const newData = await response.json();

      if (newData.time && newData.time.length > 0) {
        setDataBuffer(prev => {
          const lastCurrentTime = prev.time.length > 0 ? prev.time[prev.time.length - 1] : -1;
          
          let startIndex = -1;
          for (let i = 0; i < newData.time.length; i++) {
            if (newData.time[i] > lastCurrentTime) {
              startIndex = i;
              break;
            }
          }

          if (startIndex === -1) return prev;

          const updatedBuffer = { ...prev };
          const validTimeSlice = newData.time.slice(startIndex);
          updatedBuffer.time = [...(prev.time || []), ...validTimeSlice];

          if (newData.signals) {
              Object.keys(newData.signals).forEach(channelName => {
                  const prevSignalData = prev[channelName] || [];
                  const newSignalData = newData.signals[channelName];
                  updatedBuffer[channelName] = [...prevSignalData, ...newSignalData.slice(startIndex)];
              });
          }
          return updatedBuffer;
        });
        setNextPageToFetch(prev => prev + 1);
      }
    } catch (error) {
      console.error("Failed to fetch chunk:", error);
      fetchedPages.current.delete(nextPageToFetch);
    } finally {
      setIsFetching(false);
    }
  }, [fileId, nextPageToFetch, isFetching]);

  // --- INITIAL LOAD & BUFFER AHEAD ---
  useEffect(() => {
    fetchedPages.current.clear();
    setNextPageToFetch(1);
  }, [fileId]);

  useEffect(() => {
    if (nextPageToFetch === 1) fetchNextChunk();
  }, [nextPageToFetch, fetchNextChunk]);

  const maxTimeLoaded = dataBuffer.time[dataBuffer.time.length - 1] || 0;

  useEffect(() => {
    // Fetch more if we are within 2 seconds of the end of the loaded buffer
    if (analysisStart + analysisWindowSize > maxTimeLoaded - 2.0 && maxTimeLoaded > 0) {
      fetchNextChunk();
    }
  }, [analysisStart, maxTimeLoaded, fetchNextChunk]);

  // --- PLAYBACK CONTROLLER ---
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setAnalysisStart((prev) => {
          const nextVal = prev + (0.1 * playbackSpeed);
          const maxAllowed = Math.max(0, maxTimeLoaded - analysisWindowSize);
          
          // Stop playing if we reach the end of available data
          if (nextVal >= maxAllowed && maxAllowed > 0) {
            setIsPlaying(false);
            return maxAllowed;
          }
          return nextVal;
        });
      }, 100); // 100ms interval for smooth progression
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, maxTimeLoaded, analysisWindowSize]);

  // --- XOR MATH & CHUNKING LOGIC ---
  const processXORData = () => {
    if (!selectedChannel) return [];
    const channelData = dataBuffer[selectedChannel];
    const timeData = dataBuffer.time;

    if (!timeData || timeData.length < 2 || !channelData) return [];
    
    // 1. Isolate the data within the user's chosen timeline window
    // 1. Isolate the data from the BEGINNING up to the CURRENT playhead (Cumulative Mode)
    const startIndex = 0; // دايماً هنبدأ من أول التسجيل
    
    // هنا الـ analysisStart هيمثل "الوقت الحالي" اللي واصلين له في التشغيل
    const endIndex = timeData.findIndex(t => t >= analysisStart); 
    const safeEndIndex = endIndex === -1 ? timeData.length : endIndex;
    
    if (startIndex === -1 || safeEndIndex <= startIndex) return [];

    const windowTime = timeData.slice(startIndex, safeEndIndex);
    const windowData = channelData.slice(startIndex, safeEndIndex);

    // 2. Calculate indices per chunk based on sampling rate
    const dt = windowTime[1] - windowTime[0];
    if (dt <= 0) return [];
    
    const pointsPerChunk = Math.floor(chunkWidth / dt);
    if (pointsPerChunk <= 0) return [];

    const numChunks = Math.floor(windowData.length / pointsPerChunk);
    
    let traces = [];
    const localX = Array.from({length: pointsPerChunk}, (_, i) => i * dt);

    // 3. Compare chunks with Color Gradient and Vertical Offset
    for (let i = 1; i < numChunks; i++) {
      const startIdx1 = comparisonMode === 'baseline' ? 0 : (i - 1) * pointsPerChunk;
      const startIdx2 = i * pointsPerChunk;
      
      let outX = [];
      let outY = [];

      // Color Gradient Logic: Blue (Hue 240) to Red (Hue 0) based on chunk index
      const ratio = numChunks > 1 ? (i / (numChunks - 1)) : 1;
      const hue = 240 - (ratio * 240); 
      const chunkColor = `hsl(${hue}, 100%, 60%)`;

      // Vertical stack calculation
      const yOffset = i * verticalOffset;

      for (let j = 0; j < pointsPerChunk; j++) {
        const v1 = windowData[startIdx1 + j];
        const v2 = windowData[startIdx2 + j];
        
        if (v1 === undefined || v2 === undefined) continue;

        outX.push(localX[j]);
        const diff = Math.abs(v2 - v1);
        
        // XOR Erasure Logic with Vertical Shift: 
        // If difference <= tolerance, plot NULL (true erasure). Else, plot shifted signal.
        outY.push(diff <= tolerance ? null : v2 + yOffset);
      }

      traces.push({
        x: outX,
        y: outY,
        type: 'scatter',
        mode: 'lines',
        name: `Chunk ${i}`,
        line: { color: chunkColor, width: channelThickness },
        opacity: 0.85,
        hoverinfo: 'none'
      });
    }
    
    return traces;
  };

  return (
    <div className="xor-viewer-layout">
      
      {/* LEFT AREA: MAIN CONTENT */}
      <div className="viewer-main-area">
        
        {/* PLAYBACK CONTROLS (TOP BAR) */}
        <div style={{ display: 'flex', gap: '15px', padding: '10px 20px', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '6px', marginBottom: '10px' }}>
          <button 
            style={{ 
              padding: '6px 16px', 
              cursor: 'pointer', 
              backgroundColor: isPlaying ? '#d32f2f' : '#1976d2', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              fontWeight: 'bold'
            }}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          
          <select 
            style={{ 
              padding: '6px 10px', 
              backgroundColor: '#0a1929', 
              color: 'white', 
              border: '1px solid #1e4976', 
              borderRadius: '4px' 
            }}
            value={playbackSpeed} 
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          >
            <option value={0.5}>0.5x Speed</option>
            <option value={1}>1x Speed</option>
            <option value={2}>2x Speed</option>
            <option value={5}>5x Speed</option>
          </select>
        </div>

        {/* GRAPH VIEWPORT */}
        <div className="graph-viewport">
          <Plot
            data={processXORData()}
            layout={{
              autosize: true,
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#b9d2e2' },
              title: { 
                text: `${selectedChannel} - Vertical XOR Erasure (${chunkWidth}s Window)`, 
                font: { size: 16 } 
              },
              xaxis: { 
                range: [0, chunkWidth], 
                title: 'Local Chunk Time (s)', 
                showgrid: true, 
                gridcolor: 'rgba(28, 110, 160, 0.2)' 
              },
              yaxis: {
                title: 'Amplitude + Offset', 
                showgrid: true, 
                gridcolor: 'rgba(28, 110, 160, 0.2)',
                zeroline: false // Turned off zero line to prevent distraction in stacked mode
              },
              margin: { l: 60, r: 20, t: 50, b: 50 },
              showlegend: false,
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ displayModeBar: false }}
          />
        </div>

        {/* BOTTOM SLIDER PANEL */}
        <div className="bottom-slider-panel">
          <span className="slider-label">Timeline:</span>
          <input 
            type="range" 
            className="time-slider"
            min="0" 
            max={Math.max(0, maxTimeLoaded - analysisWindowSize)} 
            step="0.1" 
            value={analysisStart} 
            onChange={(e) => {
              setAnalysisStart(Number(e.target.value));
              setIsPlaying(false); // Pause if user manually scrubs the timeline
            }} 
          />
          <span className="time-readout">
            {analysisStart.toFixed(1)}s / {maxTimeLoaded > 0 ? maxTimeLoaded.toFixed(1) : analysisWindowSize.toFixed(1)}s
          </span>
        </div>

      </div>

      {/* RIGHT AREA: XOR SETTINGS PANEL */}
      <div className="right-settings-panel">
        <h3 className="panel-title">XOR Controls</h3>
        
        <div className="settings-content">
          
          {/* 1. Channel Selection & Styling */}
          <div className="settings-block">
            <h4>Channel Selection</h4>
            <select 
              className="ctrl-select full-width" 
              value={selectedChannel} 
              onChange={(e) => setSelectedChannel(e.target.value)}
            >
              {metadata?.features?.channels?.map(ch => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>

            <div className="ctrl-row mt-10">
              <span>Thickness:</span>
              <input 
                type="range" 
                min="0.5" max="5" step="0.5"
                value={channelThickness}
                onChange={(e) => setChannelThickness(Number(e.target.value))}
              />
            </div>
            {/* New Vertical Offset Control */}
            <div className="ctrl-row mt-10">
              <span>Spacing (Offset):</span>
              <input 
                type="range" 
                min="0" max="100" step="5"
                value={verticalOffset}
                onChange={(e) => setVerticalOffset(Number(e.target.value))}
              />
            </div>
          </div>

          {/* 2. Baseline Comparison Mode */}
          <div className="settings-block">
            <h4>Comparison Baseline</h4>
            <select 
              className="ctrl-select full-width"
              value={comparisonMode}
              onChange={(e) => setComparisonMode(e.target.value)}
              style={{ padding: '6px', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white' }}
            >
              <option value="consecutive">Previous Chunk (Consecutive)</option>
              <option value="baseline">First Chunk (From Beginning)</option>
            </select>
            <p className="helper-text">Choose what each chunk is compared against.</p>
          </div>

          {/* 3. Time Period (W) Slider */}
          <div className="settings-block">
            <div className="slider-header">
              <h4>Time Period (W)</h4>
              <span>{chunkWidth.toFixed(1)}s</span>
            </div>
            <input 
              type="range" 
              className="full-width-slider"
              min="0.1" max="5.0" step="0.1" 
              value={chunkWidth} 
              onChange={(e) => setChunkWidth(Number(e.target.value))}
            />
            <p className="helper-text">Length of each overlaid chunk.</p>
          </div>

          {/* 4. Tolerance / Sensitivity Slider */}
          <div className="settings-block">
            <div className="slider-header">
              <h4>Tolerance (ε)</h4>
              <span>{tolerance.toFixed(1)}μV</span>
            </div>
            <input 
              type="range" 
              className="full-width-slider"
              min="0" max="50" step="0.5" 
              value={tolerance} 
              onChange={(e) => setTolerance(Number(e.target.value))}
            />
            <p className="helper-text">
              Threshold for erasing matching signals.
            </p>
          </div>

        </div>
      </div>
      
    </div>
  );
};

export default XORViewer;