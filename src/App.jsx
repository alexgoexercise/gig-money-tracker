import React, { useState, useEffect, useMemo } from 'react';
import GigForm from './components/GigForm';
import GigList from './components/GigList';
import Notification from './components/Notification';
import RegularGigDetails from './components/RegularGigDetails';
import 'react-calendar/dist/Calendar.css';
import EarningsHeatmap from './components/EarningsHeatmap';
import './styles.css';

const currency = 'SGD'; // Change this to your preferred currency code (e.g., 'EUR', 'GBP', 'CNY', etc.)

function App() {
  const [gigs, setGigs] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [notification, setNotification] = useState(null);
  const [editingGig, setEditingGig] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [selectedGigType, setSelectedGigType] = useState('all');
  const [selectedRegularGig, setSelectedRegularGig] = useState(null);
  const [calendarMode, setCalendarMode] = useState('single'); // 'single' or 'range'
  const [formKey, setFormKey] = useState(0);

  // Load initial data
  useEffect(() => {
    loadTotalEarnings();
    loadGigs();
  }, []);

  const loadTotalEarnings = async () => {
    try {
      const earnings = await window.electronAPI.getTotalEarnings();
      setTotalEarnings(earnings);
    } catch (error) {
      console.error('Error loading total earnings:', error);
      showNotification('Error loading total earnings', 'error');
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

  // Helper to generate all scheduled occurrences for a regular gig
  function generateRegularGigOccurrences(gig, overrides = {}) {
    if (!gig || !gig.date || !gig.recurring_end_date || !gig.recurring_pattern) return [];
    if (typeof gig.recurring_pattern !== 'string' || !gig.recurring_pattern.startsWith('weekly_')) return [];
    const start = new Date(gig.date);
    const end = new Date(gig.recurring_end_date);
    const dayOfWeek = parseInt(gig.recurring_pattern.replace('weekly_', ''));
    const occurrences = [];
    let current = new Date(start);
    // Move to the first correct day of week
    while (current.getDay() !== dayOfWeek) {
      current.setDate(current.getDate() + 1);
    }
    while (current <= end) {
      const isoDate = current.toISOString().split('T')[0];
      const override = overrides[isoDate];
      occurrences.push({
        date: isoDate,
        status: override?.status || 'pending',
        amount: override?.amount !== null && override?.amount !== undefined ? override.amount : gig.amount,
        notes: override?.notes || ''
      });
      current.setDate(current.getDate() + 7);
    }
    return occurrences;
  }

  // After loading gigs, fetch occurrences for regular and full-time gigs
  useEffect(() => {
    async function fetchOccurrences() {
      const updatedGigs = await Promise.all(gigs.map(async gig => {
        if (gig.gig_type === 'regular_gig') {
          const overridesArr = await window.electronAPI.getAllOccurrenceOverridesForGig(gig.id);
          const overrides = {};
          overridesArr.forEach(o => { overrides[o.date] = o; });
          let allOccurrences = generateRegularGigOccurrences(gig, overrides);
          return { ...gig, occurrences: allOccurrences };
        }
        return gig;
      }));
      setGigs(updatedGigs);
    }
    if (gigs.length > 0) fetchOccurrences();
    // eslint-disable-next-line
  }, [gigs.length]);

  const earningsByDay = useMemo(() => aggregateEarningsByDay(gigs), [gigs]);

  const handleAddGig = async (gigData, options = {}) => {
    try {
      if (options.refreshOnly) {
        await loadTotalEarnings();
        await loadGigs();
        setFormKey(k => k + 1);
        return;
      }
      if (editingGig) {
        await window.electronAPI.updateGig(editingGig.id, gigData);
        showNotification('Gig updated successfully!', 'success');
        setEditingGig(null);
      } else {
        await window.electronAPI.addGig(gigData);
        showNotification('Gig added successfully!', 'success');
      }
      await loadTotalEarnings();
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
        await loadTotalEarnings();
        await loadGigs();
        setFormKey(k => k + 1); // Force form reset
        setEditingGig(null); // Clear editing state
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
    await loadTotalEarnings();
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
      const selectedDateStr = new Date(selectedDate).toISOString().split('T')[0];
      filteredGigs = gigs.filter(gig => {
        if (gig.gig_type === 'sub_gig') {
          return gig.date === selectedDateStr;
        } else if (gig.gig_type === 'regular_gig') {
          // Show if occurrence exists OR if selectedDate is within period and matches day of week
          if (gig.occurrences && gig.occurrences.some(occ => occ.date === selectedDateStr)) {
            return true;
          }
          if (gig.date && gig.recurring_end_date && gig.recurring_pattern) {
            const start = new Date(gig.date);
            const end = new Date(gig.recurring_end_date);
            const dayOfWeek = parseInt(gig.recurring_pattern.replace('weekly_', ''));
            const sel = new Date(selectedDateStr);
            return sel >= start && sel <= end && sel.getDay() === dayOfWeek;
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
          if (gig.occurrences && gig.occurrences.some(occ => occ.date >= startDate && occ.date <= endDate)) {
            return true;
          }
          if (gig.date && gig.recurring_end_date && gig.recurring_pattern) {
            const periodStart = new Date(gig.date);
            const periodEnd = new Date(gig.recurring_end_date);
            const dayOfWeek = parseInt(gig.recurring_pattern.replace('weekly_', ''));
            let d = new Date(startDate);
            while (d <= new Date(endDate)) {
              if (d >= periodStart && d <= periodEnd && d.getDay() === dayOfWeek) {
                return true;
              }
              d.setDate(d.getDate() + 1);
            }
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
      return (hasSubGig || hasRegularGig) ? <span style={{ color: '#667eea', fontWeight: 'bold' }}>•</span> : null;
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
    // Map: yyyy-mm-dd -> { amount, status }
    const map = {};
    gigs.forEach(gig => {
      if (gig.gig_type === 'sub_gig') {
        map[gig.date] = { amount: gig.amount || 0, status: gig.status };
      } else if (gig.gig_type === 'regular_gig') {
        if (gig.occurrences) {
          gig.occurrences.forEach(occ => {
            // If already completed, overwrite; otherwise, pending/cancelled
            if (!map[occ.date] || map[occ.date].status !== 'completed') {
              map[occ.date] = { amount: occ.amount || gig.amount || 0, status: occ.status };
            }
          });
        }
      }
    });
    // Convert to array
    return Object.entries(map).map(([date, { amount, status }]) => ({ date, amount, status }));
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Gig Money Tracker</h1>
        <p>Track your freelance gig income</p>
      </div>

      <div className="stats-grid">
        <div className="stats-card glass-card">
          <div className="stats-card-title">Total Earnings</div>
          <div className="stats-card-value">{totalEarnings.toLocaleString(undefined, { style: 'currency', currency })}</div>
        </div>
      </div>

      <div className="heatmap-card glass-card">
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
          <div className="date-selection-info">
            {selectedDate ? (
              <>Showing gigs for: <b>{new Date(selectedDate).toLocaleDateString()}</b></>
            ) : (
              <>Showing gigs from: <b>{selectedRange[0].toLocaleDateString()}</b> to <b>{selectedRange[1].toLocaleDateString()}</b></>
            )}
            (<a href="#" className="clear-selection-link" onClick={e => { e.preventDefault(); setSelectedDate(null); setSelectedRange(null); }}>Show all</a>)
          </div>
        )}
      </div>

      <div className="main-content">
        <div className="section glass-card">
          <h2>{editingGig ? 'Edit Gig' : 'Add New Gig'}</h2>
          <GigForm
            key={formKey}
            resetTrigger={formKey}
            onSubmit={handleAddGig}
            editingGig={editingGig}
            onCancel={() => setEditingGig(null)}
          />
        </div>

        <div className="section glass-card">
          <div className="gigs-header">
            <h2>Gigs</h2>
            <div className="filter-controls">
              <label>Filter by type:</label>
              <select
                value={selectedGigType}
                onChange={(e) => setSelectedGigType(e.target.value)}
              >
                <option value="all">All Gigs</option>
                <option value="sub_gig">Sub Gigs</option>
                <option value="regular_gig">Regular Gigs</option>
              </select>
            </div>
          </div>
          <GigList 
            gigs={gigsForDisplay} 
            onEdit={handleEditGig} 
            onDelete={handleDeleteGig}
            onRegularGigClick={handleRegularGigClick}
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
    </div>
  );
}

export default App; 