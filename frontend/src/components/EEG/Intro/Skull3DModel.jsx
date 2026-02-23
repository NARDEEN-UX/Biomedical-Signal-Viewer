import React from 'react';

const Skull3DModel = () => {
  // Electrode coordinates mapped to a top-down 10-20 system layout.
  // The SVG viewBox is 200x200, so center is (100, 100)
  const electrodes = [
    { id: 'Cz', x: 100, y: 100 },
    
    // Midline
    { id: 'Fz', x: 100, y: 55 },
    { id: 'Pz', x: 100, y: 145 },
    
    // Frontal Lobe
    { id: 'Fp1', x: 70, y: 25 },
    { id: 'Fp2', x: 130, y: 25 },
    { id: 'F3', x: 65, y: 65 },
    { id: 'F4', x: 135, y: 65 },
    { id: 'F7', x: 35, y: 55 },
    { id: 'F8', x: 165, y: 55 },

    // Central / Temporal
    { id: 'C3', x: 55, y: 100 },
    { id: 'C4', x: 145, y: 100 },
    { id: 'T3', x: 25, y: 100 },
    { id: 'T4', x: 175, y: 100 },

    // Parietal / Posterior Temporal
    { id: 'P3', x: 65, y: 135 },
    { id: 'P4', x: 135, y: 135 },
    { id: 'T5', x: 35, y: 145 },
    { id: 'T6', x: 165, y: 145 },

    // Occipital Lobe
    { id: 'O1', x: 75, y: 175 },
    { id: 'O2', x: 125, y: 175 },
    { id: 'Oz', x: 100, y: 185 },
  ];

  return (
    <div className="skull-3d-background" style={containerStyle}>
      {/* We embed the CSS animation directly here so nothing is missing */}
      <style>
        {`
          @keyframes gentle-pulse {
            0% { transform: scale(0.95); opacity: 0.8; filter: drop-shadow(0 0 10px rgba(2, 132, 199, 0.3)); }
            50% { transform: scale(1.05); opacity: 1; filter: drop-shadow(0 0 25px rgba(56, 189, 248, 0.6)); }
            100% { transform: scale(0.95); opacity: 0.8; filter: drop-shadow(0 0 10px rgba(2, 132, 199, 0.3)); }
          }
          .eeg-svg-icon {
            animation: gentle-pulse 4s ease-in-out infinite;
            transform-origin: center;
          }
        `}
      </style>

      <svg 
        className="eeg-svg-icon"
        viewBox="0 0 200 200" 
        style={{ width: '400px', height: '400px', maxWidth: '100%' }}
      >
        {/* 1. Head Outline (Dashed Wireframe) */}
        <ellipse 
          cx="100" 
          cy="105" 
          rx="80" 
          ry="90" 
          fill="rgba(2, 132, 199, 0.05)" 
          stroke="#0284c7" 
          strokeWidth="1.5" 
          strokeDasharray="4 4" 
        />
        
        {/* 2. Nose Indicator (Top) */}
        <polygon 
          points="90,15 110,15 100,0" 
          fill="rgba(2, 132, 199, 0.3)" 
          stroke="#0284c7" 
          strokeWidth="1" 
        />

        {/* 3. Ear Indicators (Left & Right) */}
        <path d="M 20 85 C 10 90, 10 110, 20 115" fill="none" stroke="#0284c7" strokeWidth="1.5" />
        <path d="M 180 85 C 190 90, 190 110, 180 115" fill="none" stroke="#0284c7" strokeWidth="1.5" />

        {/* 4. Connection Lines (Grid representing neural connections) */}
        <line x1="100" y1="25" x2="100" y2="185" stroke="rgba(2, 132, 199, 0.2)" strokeWidth="1" />
        <line x1="25" y1="100" x2="175" y2="100" stroke="rgba(2, 132, 199, 0.2)" strokeWidth="1" />
        <circle cx="100" cy="100" r="45" fill="none" stroke="rgba(2, 132, 199, 0.2)" strokeWidth="1" />

        {/* 5. Glowing Electrodes */}
        {electrodes.map((point) => (
          <g key={point.id}>
            {/* Outer Soft Halo */}
            <circle 
              cx={point.x} 
              cy={point.y} 
              r="8" 
              fill="#0ea5e9" 
              opacity="0.25" 
            />
            {/* Inner Bright Core */}
            <circle 
              cx={point.x} 
              cy={point.y} 
              r="3.5" 
              fill="#bae6fd" 
            />
          </g>
        ))}
      </svg>
    </div>
  );
};

// Container styling to center the SVG perfectly in the background
const containerStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 0,
  pointerEvents: 'none', // Allows clicking on the buttons layered above it
  overflow: 'hidden'
};

export default Skull3DModel;