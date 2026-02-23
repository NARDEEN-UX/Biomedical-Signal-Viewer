import React, { useState } from 'react';
import EEGIntro from '../components/EEG/Intro/EEGIntro'; 
import EEGNavbar from '../components/EEG/Dashboard/EEGNavbar'; 
import ContinuousViewer from '../components/EEG/Viewers/ContinuousViewer';
import ReoccurrenceViewer from '../components/EEG/Viewers/ReoccurrenceViewer';
import PolarViewer from '../components/EEG/Viewers/PolarViewer'; // NEW IMPORT
import '../styles/eeg/eeg-intro.css'; 
import XORViewer from '../components/EEG/Viewers/XORViewer';

function EEG() {
  const [isLaunched, setIsLaunched] = useState(false);
  const [activeView, setActiveView] = useState('continuous');
  const [fileId, setFileId] = useState(null);
  const [eegMetadata, setEegMetadata] = useState(null);
  const [showNotification, setShowNotification] = useState(false);

  const handleFileUploadSuccess = (responseData) => {
    setFileId(responseData.file_id);
    setEegMetadata({
      features: responseData.features,
      predictions: responseData.predictions // Contains: is_normal, abnormality_type
    });
    setIsLaunched(true);
    setShowNotification(true); // Trigger the AI result notification
  };

  const handleBackToIntro = () => {
    setIsLaunched(false);
    setShowNotification(false);
  };

  return (
    <div className="eeg-page-container">
      {!isLaunched ? (
        <EEGIntro onLaunch={handleFileUploadSuccess} />
      ) : (
        <div className="eeg-dashboard-layout">
          
          {/* Mandatory AI Notification Banner */}
          {showNotification && eegMetadata?.predictions && (
            <div className={`ai-notification-banner ${eegMetadata.predictions.is_normal ? 'normal' : 'abnormal'}`}>
              <div className="notification-content">
                <strong>AI Analysis Result:</strong> {eegMetadata.predictions.is_normal ? '✅ Normal Signal' : `⚠️ Abnormal: ${eegMetadata.predictions.abnormality_type}`}
                <button className="close-notify" onClick={() => setShowNotification(false)}>×</button>
              </div>
            </div>
          )}

          <EEGNavbar 
            activeView={activeView} 
            setActiveView={setActiveView} 
            onBack={handleBackToIntro} 
          />
          
          <div className="eeg-viewers-container">
            
            {activeView === 'continuous' && (
              <div className="eeg-viewer-content" style={{ width: '100%', height: '100%' }}>
                <ContinuousViewer 
                  fileId={fileId} 
                  metadata={eegMetadata} 
                />
              </div>
            )}
            
            {activeView === 'reoccurrence' && (
              <div className="eeg-viewer-content" style={{ width: '100%', height: '100%' }}>
                <ReoccurrenceViewer 
                  fileId={fileId} 
                  metadata={eegMetadata} 
                />
              </div>
            )}

            {/* INTEGRATED POLAR VIEWER */}
            {activeView === 'polar' && (
              <div className="eeg-viewer-content" style={{ width: '100%', height: '100%' }}>
                <PolarViewer 
                  fileId={fileId} 
                  metadata={eegMetadata} 
                />
              </div>
            )}

            {/* Placeholder for future XOR viewer */}
            {activeView === 'xor' && (
              <div className="eeg-viewer-content" style={{ width: '100%', height: '100%' }}>
                <XORViewer 
                  fileId={fileId} 
                  metadata={eegMetadata} 
                  />
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

export default EEG;