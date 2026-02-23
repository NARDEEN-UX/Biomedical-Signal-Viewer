import React, { useRef, useState } from 'react';
import Skull3DModel from './Skull3DModel';

const EEGIntro = ({ onLaunch }) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleLaunchClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:8000/EEG', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Server responded with an error");
      }

      const data = await response.json();
      
      // Pass the complete data object containing file_id, features, and predictions
      onLaunch(data); 

    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload and analyze signal. Ensure the backend AI service is active.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="eeg-intro-wrapper">
      <Skull3DModel /> 

      <div className="eeg-intro-content">
        <h1 className="eeg-title">Neurological Signal Analysis</h1>
        <p className="eeg-subtitle">Multi-channel EEG evaluation with AI abnormality detection</p>

        <div className="eeg-cards-row">
          <div className="eeg-feature-card">
            <h3>Continuous Time</h3>
            <p>Standard viewport with speed, zoom, and pan controls.</p>
          </div>
          <div className="connecting-line"></div>
          <div className="eeg-feature-card">
            <h3>XOR Graph</h3>
            <p>Overlapping time-chunks using XOR logic comparison.</p>
          </div>
          <div className="connecting-line"></div>
          <div className="eeg-feature-card">
            <h3>Polar Graph</h3>
            <p>Magnitude (r) and Time (θ) cumulative mapping.</p>
          </div>
          <div className="connecting-line"></div>
          <div className="eeg-feature-card">
            <h3>Reoccurrence</h3>
            <p>2D Intensity Map and scatter plot between channel pairs.</p>
          </div>
        </div>

        <button 
          className="eeg-launch-btn" 
          onClick={handleLaunchClick}
          disabled={isUploading}
        >
          {isUploading ? 'AI Analyzing Signals...' : 'Launch Signal Analysis'}
        </button>

        <input 
          type="file" 
          accept=".parquet,.csv,.edf" 
          style={{ display: 'none' }} 
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default EEGIntro;