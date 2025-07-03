import React, { useState, useEffect, useMemo } from 'react';
import StatsGrid from './components/StatsGrid';
import GigForm from './components/GigForm';
import GigList from './components/GigList';
import Notification from './components/Notification';
import RegularGigDetails from './components/RegularGigDetails';
import FullTimeGigDetails from './components/FullTimeGigDetails';
import 'react-calendar/dist/Calendar.css';
import EarningsHeatmap from './components/EarningsHeatmap';
import './styles.css';

const currency = 'SGD'; // Change this to your preferred currency code (e.g., 'EUR', 'GBP', 'CNY', etc.)

function App() {
  const [gigs, setGigs] = useState([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalExpenses: 0,
    netIncome: 0
  });
  const [notification, setNotification] = useState(null);
  const [editingGig, setEditingGig] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [selectedGigType, setSelectedGigType] = useState('all');
  const [selectedRegularGig, setSelectedRegularGig] = useState(null);
  const [selectedFullTimeGig, setSelectedFullTimeGig] = useState(null);
  const [calendarMode, setCalendarMode] = useState('single'); // 'single' or 'range'
  const [formKey, setFormKey] = useState(0);

  // Load initial data
  useEffect(() => {
    loadStats();
    loadGigs();
  }, []);

  const loadStats = async () => {
    try {
      const [earnings, expenses, netIncome] = await Promise.all([
        window.electronAPI.getTotalEarnings(),
        window.electronAPI.getTotalExpenses(),
        window.electronAPI.getNetIncome()
      ]);

      setStats({ totalEarnings: earnings, totalExpenses: expenses, netIncome });
    } catch (error) {
      console.error('Error loading stats:', error);
      showNotification('Error loading statistics', 'error');
    }
  };

  const loadGigs = async () => {
    try {
      let gigsData;
      if (selectedGigType === 'all') {
        gigsData = await window.electronAPI.getAllGigs();
      } else {
        gigsData = await window.electronAPI.getGigsByType(selectedGigType);
      }
      setGigs(gigsData);
    } catch (error) {
      console.error('Error loading gigs:', error);
      showNotification('Error loading gigs', 'error');
    }
  };

  useEffect(() => {
    loadGigs();
  }, [selectedGigType]);

  // After loading gigs, fetch occurrences for regular and full-time gigs
  useEffect(() => {
    async function fetchOccurrences() {
      const updatedGigs = await Promise.all(gigs.map(async gig => {
        if (gig.gig_type === 'regular_gig' || gig.gig_type === 'full_time_gig') {
          const occurrences = await window.electronAPI.getAllOccurrenceOverridesForGig(gig.id);
          return { ...gig, occurrences };
        }
        return gig;
      }));
      setGigs(updatedGigs);
    }
    if (gigs.length > 0) fetchOccurrences();
    // eslint-disable-next-line
  }, [gigs.length]);

  const earningsByDay = useMemo(() => aggregateEarningsByDay(gigs), [gigs]);

  const handleAddGig = async (gigData) => {
    try {
      if (editingGig) {
        await window.electronAPI.updateGig(editingGig.id, gigData);
        showNotification('Gig updated successfully!', 'success');
        setEditingGig(null);
      } else {
        await window.electronAPI.addGig(gigData);
        showNotification('Gig added successfully!', 'success');
      }
      await loadStats();
      await loadGigs();
      setFormKey(k => k + 1); // Force form reset
    } catch (error) {
      console.error('Error saving gig:', error);
      showNotification('Error saving gig. Please try again.', 'error');
    }
  };

  const handleEditGig = (gig) => {
    setEditingGig(gig);
  };

  const handleDeleteGig = async (id) => {
    if (window.confirm('Are you sure you want to delete this gig?')) {
      try {
        await window.electronAPI.deleteGig(id);
        await loadStats();
        await loadGigs();
        showNotification('Gig deleted successfully!', 'success');
      } catch (error) {
        console.error('Error deleting gig:', error);
        showNotification('Error deleting gig.', 'error');
      }
    }
  };

  const handleRegularGigClick = (regularGig) => {
    setSelectedRegularGig(regularGig);
  };

  const handleRegularGigClose = () => {
    setSelectedRegularGig(null);
  };

  const handleRegularGigUpdate = async () => {
    await loadStats();
    await loadGigs();
  };

  const handleFullTimeGigClick = (fullTimeGig) => {
    setSelectedFullTimeGig(fullTimeGig);
  };

  const handleFullTimeGigClose = () => {
    setSelectedFullTimeGig(null);
  };

  const handleFullTimeGigUpdate = async () => {
    await loadStats();
    await loadGigs();
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter gigs based on selected date or date range (now from heatmap)
  const getFilteredGigs = () => {
    let filteredGigs = gigs;
    if (selectedDate) {
      filteredGigs = gigs.filter(gig => {
        if (gig.gig_type === 'sub_gig') {
          return gig.date === new Date(selectedDate).toISOString().split('T')[0];
        } else if (gig.gig_type === 'regular_gig') {
          if (gig.occurrences) {
            return gig.occurrences.some(occ => occ.date === new Date(selectedDate).toISOString().split('T')[0]);
          }
        } else if (gig.gig_type === 'full_time_gig') {
          if (gig.occurrences) {
            return gig.occurrences.some(occ => occ.date === new Date(selectedDate).toISOString().split('T')[0]);
          }
        }
        return false;
      });
    } else if (selectedRange && selectedRange[0] && selectedRange[1]) {
      const startDate = selectedRange[0].toISOString().split('T')[0];
      const endDate = selectedRange[1].toISOString().split('T')[0];
      filteredGigs = gigs.filter(gig => {
        if (gig.gig_type === 'sub_gig') {
          return gig.date >= startDate && gig.date <= endDate;
        } else if (gig.gig_type === 'regular_gig') {
          if (gig.occurrences) {
            return gig.occurrences.some(occ => occ.date >= startDate && occ.date <= endDate);
          }
        } else if (gig.gig_type === 'full_time_gig') {
          if (gig.occurrences) {
            return gig.occurrences.some(occ => occ.date >= startDate && occ.date <= endDate);
          }
        }
        return false;
      });
    }
    return filteredGigs;
  };

  const gigsForDisplay = getFilteredGigs();

  // Helper to mark dates with gigs
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = date.toISOString().split('T')[0];
      // Sub gigs: one-off
      const hasSubGig = gigs.some(gig => gig.gig_type === 'sub_gig' && gig.date === dateStr);
      // Regular gigs: check if this date matches the weekly pattern
      const hasRegularGig = gigs.some(gig => {
        if (gig.gig_type === 'regular_gig') {
          const gigStartDate = new Date(gig.date);
          const gigEndDate = new Date(gig.recurring_end_date);
          const currentDate = new Date(dateStr);
          if (currentDate >= gigStartDate && currentDate <= gigEndDate) {
            const dayOfWeek = parseInt(gig.recurring_pattern?.replace('weekly_', '') || '0');
            return currentDate.getDay() === dayOfWeek;
          }
        }
        return false;
      });
      // Full-time gigs: check if this date is in the range and matches any routine day
      const hasFullTimeGig = gigs.some(gig => {
        if (gig.gig_type === 'full_time_gig') {
          const start = new Date(gig.full_time_start_date);
          const end = new Date(gig.full_time_end_date);
          const current = new Date(dateStr);
          if (current >= start && current <= end) {
            if (gig.full_time_days) {
              const days = gig.full_time_days.split(',').map(Number);
              return days.includes(current.getDay());
            }
          }
        }
        return false;
      });
      return (hasSubGig || hasRegularGig || hasFullTimeGig) ? <span style={{ color: '#667eea', fontWeight: 'bold' }}>•</span> : null;
    }
    return null;
  };

  const handleCalendarChange = (value) => {
    if (calendarMode === 'range' && Array.isArray(value)) {
      // Range selection
      setSelectedRange(value);
      setSelectedDate(null);
    } else if (calendarMode === 'single' && !Array.isArray(value)) {
      // Single date selection
      setSelectedDate(value);
      setSelectedRange(null);
    }
  };

  const clearDateSelection = () => {
    setSelectedDate(null);
    setSelectedRange(null);
  };

  function aggregateEarningsByDay(gigs) {
    // Map: yyyy-mm-dd -> total amount
    const map = {};
    gigs.forEach(gig => {
      if (gig.status === 'completed') {
        if (gig.gig_type === 'sub_gig') {
          // One-off
          map[gig.date] = (map[gig.date] || 0) + (gig.amount || 0);
        } else if (gig.gig_type === 'regular_gig') {
          // Use gig_occurrences for overrides
          if (gig.occurrences) {
            gig.occurrences.forEach(occ => {
              if (occ.status === 'completed') {
                map[occ.date] = (map[occ.date] || 0) + (occ.amount || gig.amount || 0);
              }
            });
          }
        } else if (gig.gig_type === 'full_time_gig') {
          if (gig.occurrences) {
            gig.occurrences.forEach(occ => {
              if (occ.status === 'completed') {
                map[occ.date] = (map[occ.date] || 0) + (occ.amount || gig.amount || 0);
              }
            });
          }
        }
      }
    });
    // Convert to array
    return Object.entries(map).map(([date, amount]) => ({ date, amount }));
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Gig Money Tracker</h1>
        <p>Track your freelance income and expenses</p>
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-card-title">Total Earnings</div>
          <div className="stats-card-value">{stats.totalEarnings.toLocaleString(undefined, { style: 'currency', currency })}</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-title">Total Expenses</div>
          <div className="stats-card-value">{stats.totalExpenses.toLocaleString(undefined, { style: 'currency', currency })}</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-title">Net Income</div>
          <div className="stats-card-value">{stats.netIncome.toLocaleString(undefined, { style: 'currency', currency })}</div>
        </div>
      </div>

      <div className="heatmap-card">
        <div className="heatmap-title">Earnings Heatmap (Past Year)</div>
        <EarningsHeatmap
          earningsByDay={earningsByDay}
          selectedDate={selectedDate}
          selectedRange={selectedRange}
          onSelectDate={date => {
            setSelectedDate(date);
            setSelectedRange(null);
          }}
          onSelectRange={range => {
            setSelectedDate(null);
            setSelectedRange(range);
          }}
        />
        {(selectedDate || (selectedRange && selectedRange[0] && selectedRange[1])) && (
          <div style={{ marginTop: 18, fontSize: 15, color: '#444' }}>
            {selectedDate ? (
              <>Showing gigs for: <b>{new Date(selectedDate).toLocaleDateString()}</b></>
            ) : (
              <>Showing gigs from: <b>{selectedRange[0].toLocaleDateString()}</b> to <b>{selectedRange[1].toLocaleDateString()}</b></>
            )}
            (<a href="#" style={{ marginLeft: 8 }} onClick={e => { e.preventDefault(); setSelectedDate(null); setSelectedRange(null); }}>Show all</a>)
          </div>
        )}
      </div>

      <div className="main-content">
        <div className="section">
          <h2>{editingGig ? 'Edit Gig' : 'Add New Gig'}</h2>
          <GigForm
            key={formKey}
            onSubmit={handleAddGig}
            editingGig={editingGig}
            onCancel={() => setEditingGig(null)}
          />
        </div>

        <div className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h2>Gigs</h2>
            <div>
              <label style={{ marginRight: 10 }}>Filter by type:</label>
              <select
                value={selectedGigType}
                onChange={(e) => setSelectedGigType(e.target.value)}
                style={{ padding: '5px', borderRadius: '4px' }}
              >
                <option value="all">All Gigs</option>
                <option value="sub_gig">Sub Gigs</option>
                <option value="regular_gig">Regular Gigs</option>
                <option value="full_time_gig">Full-time Gigs</option>
              </select>
            </div>
          </div>
          <GigList 
            gigs={gigsForDisplay} 
            onEdit={handleEditGig} 
            onDelete={handleDeleteGig}
            onRegularGigClick={handleRegularGigClick}
            onFullTimeGigClick={handleFullTimeGigClick}
          />
        </div>
      </div>

      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
        />
      )}

      {selectedRegularGig && (
        <RegularGigDetails
          regularGig={selectedRegularGig}
          onClose={handleRegularGigClose}
          onUpdate={handleRegularGigUpdate}
        />
      )}

      {selectedFullTimeGig && (
        <FullTimeGigDetails
          fullTimeGig={selectedFullTimeGig}
          onClose={handleFullTimeGigClose}
          onUpdate={handleFullTimeGigUpdate}
        />
      )}
    </div>
  );
}

export default App; 