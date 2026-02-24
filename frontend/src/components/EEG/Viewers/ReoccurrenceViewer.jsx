import React, { useState, useEffect, useRef, useCallback } from 'react';
import Plot from 'react-plotly.js';
import '../../../styles/eeg/Viewers/ContinuousViewer.css'; // Reusing your layout styles

const ReoccurrenceViewer = ({ fileId, metadata }) => {
  // --- STATE MANAGEMENT ---
  const [dataBuffer, setDataBuffer] = useState({ time: [] });
  const [nextPageToFetch, setNextPageToFetch] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  
  // Playback & Viewport
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const initialWindowSize = 2.0; 
  // xRange[0] is ALWAYS 0 for cumulative. xRange[1] is the current elapsed time.
  const [xRange, setXRange] = useState([0, initialWindowSize]);

  // Reoccurrence Specific State
  const channels = metadata?.features?.channels || [];
  const [channelX, setChannelX] = useState(channels[0] || '');
  const [channelY, setChannelY] = useState(channels[1] || channels[0] || '');
  const [colorMap, setColorMap] = useState('Viridis'); // The 2D Map Intensity Control

  const playIntervalRef = useRef(null);
  const fetchedPages = useRef(new Set());
  const dataLimit = 1000;

  // --- DATA FETCHING (Same logic as Continuous to keep data synced) ---
  const fetchNextChunk = useCallback(async () => {
    if (!fileId || isFetching || fetchedPages.current.has(nextPageToFetch)) return;

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
          let startIndex = newData.time.findIndex(t => t > lastCurrentTime);
          if (startIndex === -1) return prev;

          const updatedBuffer = { ...prev };
          updatedBuffer.time = [...prev.time, ...newData.time.slice(startIndex)];
          if (newData.signals) {
            Object.keys(newData.signals).forEach(ch => {
              updatedBuffer[ch] = [...(prev[ch] || []), ...newData.signals[ch].slice(startIndex)];
            });
          }
          return updatedBuffer;
        });
        setNextPageToFetch(prev => prev + 1);
      }
    } catch (error) {
      console.error("Fetch failed", error);
      fetchedPages.current.delete(nextPageToFetch);
    } finally {
      setIsFetching(false);
    }
  }, [fileId, nextPageToFetch, isFetching]);

  useEffect(() => {
    fetchedPages.current.clear();
    setNextPageToFetch(1);
  }, [fileId]);

  useEffect(() => {
    if (nextPageToFetch === 1) fetchNextChunk();
  }, [nextPageToFetch, fetchNextChunk]);

  useEffect(() => {
    const maxLoadedTime = dataBuffer.time[dataBuffer.time.length - 1] || 0;
    if (xRange[1] > maxLoadedTime - 1.0 && maxLoadedTime > 0) fetchNextChunk();
  }, [xRange, dataBuffer.time, fetchNextChunk]);

  // --- PLAYBACK LOGIC ---
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setXRange(prev => {
          const step = 0.05 * playbackSpeed;
          const maxLoadedTime = dataBuffer.time[dataBuffer.time.length - 1] || 0;
          if (prev[1] + step >= maxLoadedTime) {
            setIsPlaying(false);
            return prev;
          }
          // Cumulative: keep start at 0, only advance the end point
          return [0, prev[1] + step];
        });
      }, 50);
    } else {
      clearInterval(playIntervalRef.current);
    }
    return () => clearInterval(playIntervalRef.current);
  }, [isPlaying, playbackSpeed, dataBuffer.time]);

  // --- HELPERS ---
  const handleSliderChange = (e) => {
    const currentEnd = Number(e.target.value);
    // When slider moves, update the end time, keep start at 0
    setXRange([0, currentEnd]);
  };

  // Filter data to only show what's in the current time window
  const getWindowedData = () => {
    const times = dataBuffer.time || [];
    const startIdx = 0; // Always start from the very beginning
    const endIdx = times.findIndex(t => t >= xRange[1]);
    
    const sliceEnd = endIdx === -1 ? times.length : endIdx;
    
    return {
      x: (dataBuffer[channelX] || []).slice(startIdx, sliceEnd),
      y: (dataBuffer[channelY] || []).slice(startIdx, sliceEnd)
    };
  };

  const windowedData = getWindowedData();
  const maxTimeLoaded = dataBuffer.time[dataBuffer.time.length - 1] || initialWindowSize;

  return (
    <div className="continuous-viewer-layout">
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
          </select>

          <div className="control-separator"></div>
          
          <span className="ctrl-label">Intensity Map:</span>
          <select className="ctrl-select" value={colorMap} onChange={(e) => setColorMap(e.target.value)}>
            <option value="Viridis">Viridis</option>
            <option value="Hot">Hot (Thermal)</option>
            <option value="Portland">Portland</option>
            <option value="Cividis">Cividis</option>
            <option value="Greys">Greys</option>
          </select>
        </div>

        {/* GRAPH VIEWPORT */}
        <div className="graph-viewport">
          <Plot
            data={[{
              x: windowedData.x,
              y: windowedData.y,
              type: 'histogram2d',
              colorscale: colorMap,
              showscale: true,
              nbinsx: 50,
              nbinsy: 50
            }]}
            layout={{
              autosize: true,
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'rgba(0,0,0,0.2)',
              font: { color: '#b9d2e2' },
              xaxis: { title: `${channelX} Amplitude`, gridcolor: 'rgba(28, 110, 160, 0.2)' },
              yaxis: { title: `${channelY} Amplitude`, gridcolor: 'rgba(28, 110, 160, 0.2)' },
              margin: { l: 60, r: 20, t: 40, b: 60 },
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ displayModeBar: false }}
          />
        </div>

        {/* BOTTOM SLIDER PANEL */}
        <div className="bottom-slider-panel">
          <span className="slider-label">Cumulative Time:</span>
          <input 
            type="range" 
            className="time-slider"
            min="0" 
            max={Math.max(0.1, maxTimeLoaded)} // Max is now the total time loaded
            step="0.1" 
            value={xRange[1]} // Value tracks the END of the cumulative window
            onChange={handleSliderChange} 
          />
          {/* Display Current Time / Max Loaded Time */}
<span className="time-display" style={{ minWidth: '100px', textAlign: 'right', color: '#f6fcf6' }}>
  {xRange[1].toFixed(1)}s / {maxTimeLoaded.toFixed(1)}s
</span>
        </div>
      </div>

      {/* RIGHT AREA: CHANNEL SELECTION */}
      <div className="right-settings-panel">
        <h3 className="panel-title">Reoccurrence Pair</h3>
        
        <div className="channels-list">
          <div className="channel-card">
            <div className="channel-header"><span>Channel X (Horizontal)</span></div>
            <select className="ctrl-select w-100" value={channelX} onChange={(e) => setChannelX(e.target.value)}>
              {channels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </div>

          <div className="channel-card">
            <div className="channel-header"><span>Channel Y (Vertical)</span></div>
            <select className="ctrl-select w-100" value={channelY} onChange={(e) => setChannelY(e.target.value)}>
              {channels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </div>
          
          <div className="info-box" style={{ marginTop: '20px', fontSize: '0.8rem', color: '#888' }}>
            <p>The intensity (color) represents the frequency of overlapping values between the two channels cumulatively from the start of the recording up to the selected time.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReoccurrenceViewer;