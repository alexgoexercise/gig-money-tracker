import React, { useState, useEffect } from 'react';
import StatsGrid from './components/StatsGrid';
import GigForm from './components/GigForm';
import GigList from './components/GigList';
import Notification from './components/Notification';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './styles.css';

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
      const gigsData = await window.electronAPI.getAllGigs();
      setGigs(gigsData);
    } catch (error) {
      console.error('Error loading gigs:', error);
      showNotification('Error loading gigs', 'error');
    }
  };

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

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const gigsForSelectedDate = selectedDate
    ? gigs.filter(gig => gig.date === new Date(selectedDate).toISOString().split('T')[0])
    : gigs;

  // Helper to mark dates with gigs
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = date.toISOString().split('T')[0];
      const hasGig = gigs.some(gig => gig.date === dateStr);
      return hasGig ? <span style={{ color: '#667eea', fontWeight: 'bold' }}>•</span> : null;
    }
    return null;
  };

  return (
    <div className="container">
      <div className="header">
        <h1>💰 Gig Money Tracker</h1>
        <p>Track your freelance income and expenses</p>
      </div>

      <StatsGrid stats={stats} />

      <div style={{ marginBottom: 30, background: 'white', borderRadius: 10, padding: 20, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: 10 }}>Calendar</h2>
        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
          tileContent={tileContent}
        />
        {selectedDate && (
          <div style={{ marginTop: 10, fontSize: 14 }}>
            Showing gigs for: <b>{new Date(selectedDate).toLocaleDateString()}</b> (<a href="#" onClick={e => { e.preventDefault(); setSelectedDate(null); }}>Show all</a>)
          </div>
        )}
      </div>

      <div className="main-content">
        <div className="section">
          <h2>{editingGig ? 'Edit Gig' : 'Add New Gig'}</h2>
          <GigForm 
            onSubmit={handleAddGig} 
            editingGig={editingGig}
            onCancel={() => setEditingGig(null)}
          />
        </div>

        <div className="section">
          <h2>Recent Gigs</h2>
          <GigList 
            gigs={gigsForSelectedDate} 
            onEdit={handleEditGig} 
            onDelete={handleDeleteGig} 
          />
        </div>
      </div>

      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
        />
      )}
    </div>
  );
}

export default App; 