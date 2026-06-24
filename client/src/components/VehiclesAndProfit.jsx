import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Vehicles from './Vehicles';
import ProfitReport from './ProfitReport';

export default function VehiclesAndProfit({ showToast }) {
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab || 'register');

  useEffect(() => {
    if (location.state?.tab) setTab(location.state.tab);
  }, [location.state?.tab]);

  return (
    <>
      <div className="inner-tabs">
        <button
          className={`inner-tab ${tab === 'register' ? 'active' : ''}`}
          onClick={() => setTab('register')}
        >
          <i className="fa fa-car-side" /> Vehicle Register
        </button>
        <button
          className={`inner-tab ${tab === 'profit' ? 'active' : ''}`}
          onClick={() => setTab('profit')}
        >
          <i className="fa fa-chart-line" /> Profit Report
        </button>
      </div>

      {tab === 'register'
        ? <Vehicles showToast={showToast} />
        : <ProfitReport showToast={showToast} />
      }
    </>
  );
}
