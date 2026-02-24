import React, { useState, useEffect, useRef, useCallback } from 'react';
import Plot from 'react-plotly.js';
import '../../../styles/eeg/Viewers/PolarViewer.css';

const PolarViewer = ({ fileId, metadata }) => {
  // --- STATE MANAGEMENT ---
  const [dataBuffer, setDataBuffer] = useState({ time: [] });
  const [nextPageToFetch, setNextPageToFetch] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const fetchedPages = useRef(new Set());

  // Playback & Timeline State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0); // The "playhead" position

  // Polar Visualization Settings
  const [selectedChannel, setSelectedChannel] = useState('');
  const [viewMode, setViewMode] = useState('fixed'); // 'fixed' or 'cumulative'
  
  // User Inputs for the Math & Styling
  const [polarConfig, setPolarConfig] = useState({
    windowSize: 2.0,     // W: Seconds per 360 degree rotation
    offset: 100,         // C: Baseline offset so negative values don't cross the origin
    color: '#64b5f6',    // Line color
    thickness: 1.5       // Line thickness
  });

  const playIntervalRef = useRef(null);
  const dataLimit = 1000;

  // --- INITIALIZATION ---
  useEffect(() => {
    if (metadata && metadata.features && metadata.features.channels && metadata.features.channels.length > 0) {
      setSelectedChannel(metadata.features.channels[0]); // Default to first channel
      
      const initialBuffer = { time: [] };
      metadata.features.channels.forEach(ch => {
        initialBuffer[ch] = [];
      });
      setDataBuffer(initialBuffer);
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
        console.error("API Error:", response.statusText);
        return;
      }

      const newData = await response.json();

      if (newData.time && newData.time.length > 0) {
        setDataBuffer(prev => {
          const lastTime = prev.time.length > 0 ? prev.time[prev.time.length - 1] : -1;
          
          let startIndex = -1;
          for (let i = 0; i < newData.time.length; i++) {
            if (newData.time[i] > lastTime) {
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

  useEffect(() => {
    fetchedPages.current.clear();
    setNextPageToFetch(1);
    setCurrentTime(0);
  }, [fileId]);

  useEffect(() => {
    if (nextPageToFetch === 1) {
        fetchNextChunk();
    }
  }, [nextPageToFetch, fetchNextChunk]);

  // Buffer ahead
  const maxTimeLoaded = dataBuffer.time[dataBuffer.time.length - 1] || 0;
  useEffect(() => {
    if (currentTime > maxTimeLoaded - 1.0 && maxTimeLoaded > 0) {
      fetchNextChunk();
    }
  }, [currentTime, maxTimeLoaded, fetchNextChunk]);

  // --- PLAYBACK LOGIC ---
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const step = 0.05 * playbackSpeed; 
          if (prev + step >= maxTimeLoaded && !isFetching) {
            setIsPlaying(false);
            return prev;
          }
          return prev + step;
        });
      }, 50); 
    } else {
      clearInterval(playIntervalRef.current);
    }
    return () => clearInterval(playIntervalRef.current);
  }, [isPlaying, playbackSpeed, maxTimeLoaded, isFetching]);

  // --- HANDLERS ---
  const handleSliderChange = (e) => {
    setCurrentTime(Number(e.target.value));
  };

  const updateConfig = (key, value) => {
    setPolarConfig(prev => ({ ...prev, [key]: value }));
  };

  // --- POLAR MATH & DATA TRANSFORMATION ---
  const getPolarData = () => {
    if (!selectedChannel || !dataBuffer.time.length || !dataBuffer[selectedChannel]) {
      return { r: [], theta: [] };
    }

    const tArray = dataBuffer.time;
    const yArray = dataBuffer[selectedChannel];

    // Determine the time window bounds based on mode
    let startTime = viewMode === 'fixed' ? Math.max(0, currentTime - polarConfig.windowSize) : 0;
    
    // Find array indices for startTime and currentTime
    // (Using simple findIndex for brevity, binary search is better for huge arrays)
    let startIndex = tArray.findIndex(t => t >= startTime);
    let endIndex = tArray.findIndex(t => t >= currentTime);
    
    if (startIndex === -1) startIndex = 0;
    if (endIndex === -1) endIndex = tArray.length;

    const slicedT = tArray.slice(startIndex, endIndex);
    const slicedY = yArray.slice(startIndex, endIndex);

    // Map Cartesian to Polar
    const theta = slicedT.map(t => ((t % polarConfig.windowSize) / polarConfig.windowSize) * 360);
    const r = slicedY.map(y => y + polarConfig.offset);

    return { r, theta };
  };

  const polarData = getPolarData();

  return (
    <div className="polar-viewer-layout">
      
      {/* LEFT AREA: MAIN CONTENT */}
      <div className="viewer-main-area">
        
        {/* TOP CONTROL PANEL */}
        <div className="top-control-panel">
          <button className={`ctrl-btn ${isPlaying ? 'active-play' : ''}`} onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          
          <select className="ctrl-select" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))}>
            <option value={0.5}>0.5x Speed</option>
            <option value={1}>1x Speed</option>
            <option value={2}>2x Speed</option>
            <option value={4}>4x Speed</option>
          </select>
        </div>

        {/* GRAPH VIEWPORT */}
        <div className="graph-viewport">
          <Plot
            data={[{
              type: 'scatterpolar',
              mode: 'lines',
              r: polarData.r,
              theta: polarData.theta,
              line: { color: polarConfig.color, width: polarConfig.thickness },
              name: selectedChannel,
            }]}
            layout={{
              autosize: true,
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#b9d2e2' },
              polar: {
                bgcolor: 'transparent',
                angularaxis: {
                  tickcolor: 'rgba(28, 110, 160, 0.5)',
                  linecolor: 'rgba(28, 110, 160, 0.5)',
                  rotation: 90,
                  direction: "clockwise"
                },
                radialaxis: {
                  visible: true,
                  showticklabels: false, // Hide raw values as they include offset
                  gridcolor: 'rgba(28, 110, 160, 0.2)',
                  linecolor: 'rgba(28, 110, 160, 0.5)',
                }
              },
              margin: { l: 40, r: 40, t: 40, b: 40 },
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
            max={maxTimeLoaded} 
            step="0.1" 
            value={currentTime} 
            onChange={handleSliderChange} 
          />
          {/* Time Display with CSS color control */}
          <span className="time-display">
            {currentTime.toFixed(1)}s / {maxTimeLoaded.toFixed(1)}s
          </span>
        </div>

      </div>

      {/* RIGHT AREA: SETTINGS PANEL */}
      <div className="right-settings-panel">
        <h3 className="panel-title">Polar Settings</h3>
        
        <div className="settings-content">
          {/* 1. Channel Selector */}
          <div className="settings-group">
            <label className="settings-label">Active Channel</label>
            <select 
              className="settings-input-full"
              value={selectedChannel} 
              onChange={(e) => setSelectedChannel(e.target.value)}
            >
              {metadata?.features?.channels?.map(ch => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>

          {/* 2. Mode Selector */}
          <div className="settings-group">
            <label className="settings-label">Display Mode</label>
            <div className="mode-toggle-group">
              <button 
                className={`mode-btn ${viewMode === 'fixed' ? 'active' : ''}`}
                onClick={() => setViewMode('fixed')}
              >
                Fixed Window
              </button>
              <button 
                className={`mode-btn ${viewMode === 'cumulative' ? 'active' : ''}`}
                onClick={() => setViewMode('cumulative')}
              >
                Cumulative
              </button>
            </div>
            <p className="helper-text">
              {viewMode === 'fixed' ? 'Shows only the latest rotation.' : 'Draws a continuous overlapping web.'}
            </p>
          </div>

          {/* 3. Window Size (W) */}
          <div className="settings-group">
            <label className="settings-label">
              Rotation Time (W): {polarConfig.windowSize}s
            </label>
            <input 
              type="range" 
              min="0.1" max="5.0" step="0.1"
              value={polarConfig.windowSize}
              onChange={(e) => updateConfig('windowSize', Number(e.target.value))}
            />
          </div>

          {/* 4. Visual Attributes */}
          <div className="settings-group">
            <label className="settings-label">Visuals</label>
            <div className="ctrl-row">
              <span>Color:</span>
              <input 
                type="color" 
                value={polarConfig.color}
                onChange={(e) => updateConfig('color', e.target.value)}
              />
            </div>
            <div className="ctrl-row">
              <span>Thickness:</span>
              <input 
                type="range" 
                min="0.5" max="5" step="0.5"
                value={polarConfig.thickness}
                onChange={(e) => updateConfig('thickness', Number(e.target.value))}
              />
            </div>
            <div className="ctrl-row">
              <span title="Pushes signal outward to prevent crossing origin">Offset (r):</span>
              <input 
                type="range" 
                min="0" max="500" step="10"
                value={polarConfig.offset}
                onChange={(e) => updateConfig('offset', Number(e.target.value))}
              />
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
};

export default PolarViewer;