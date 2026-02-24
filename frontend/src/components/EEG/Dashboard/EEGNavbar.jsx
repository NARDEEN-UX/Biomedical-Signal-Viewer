import React from 'react';
import '../../../styles/eeg/eeg-navbar.css';

const EEGNavbar = ({ activeView, setActiveView, onBack }) => {
  const navItems = [
    { id: 'continuous', label: 'Continuous Time' },
    { id: 'xor', label: 'XOR Graph' },
    { id: 'polar', label: 'Polar Graph' },
    { id: 'reoccurrence', label: 'Reoccurrence' }
  ];

  return (
    <nav className="eeg-dashboard-nav">
      
      {/* Left Side: Back Button + Brand Title */}
      <div className="eeg-nav-left">
        <button className="eeg-nav-back-btn" onClick={onBack}>
          &#8592; Back
        </button>
        <div className="eeg-nav-brand">
          <h2>EEG Analysis Dashboard</h2>
        </div>
      </div>
      
      {/* Right Side: View Tabs */}
      <ul className="eeg-nav-links">
        {navItems.map((item) => (
          <li key={item.id}>
            <button
              className={`eeg-nav-btn ${activeView === item.id ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default EEGNavbar;