import React, { useState, useEffect } from 'react';
import './GigForm.css';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const GigForm = ({ onSubmit, editingGig, onCancel, resetTrigger }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    gig_place: '',
    gig_type: 'sub_gig'
  });
  const [gigPlaces, setGigPlaces] = useState([]);
  const [showRegularGigOptions, setShowRegularGigOptions] = useState(false);
  const [regularGigData, setRegularGigData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    days: []
  });

  useEffect(() => {
    // Fetch gig places from backend
    window.electronAPI.getAllGigPlaces().then(setGigPlaces);
  }, []);

  useEffect(() => {
    if (editingGig) {
      setFormData({
        title: editingGig.title,
        description: editingGig.description || '',
        amount: editingGig.amount.toString(),
        date: editingGig.date,
        status: editingGig.status,
        gig_place: editingGig.gig_place || '',
        gig_type: editingGig.gig_type || 'sub_gig'
      });
      setShowRegularGigOptions((editingGig.gig_type || 'sub_gig') === 'regular_gig');
    } else {
      setFormData({
        title: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        gig_place: '',
        gig_type: 'sub_gig'
      });
      setShowRegularGigOptions(false);
    }
  }, [editingGig, resetTrigger]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (name === 'gig_type') {
      setShowRegularGigOptions(value === 'regular_gig');
    }
  };

  const handleRegularGigChange = (e) => {
    const { name, value } = e.target;
    setRegularGigData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const gigData = {
      ...formData,
      amount: parseInt(formData.amount, 10)
    };

    try {
      if (formData.gig_type === 'regular_gig' && showRegularGigOptions) {
        // Add regular gig with weekly occurrences
        await window.electronAPI.addRegularGig(
          gigData,
          regularGigData.startDate,
          regularGigData.endDate,
          regularGigData.days
        );
        // Only trigger refresh, do NOT call onSubmit(gigData) again
        if (onSubmit) await onSubmit(null, { refreshOnly: true });
      } else {
        // Add single gig
        await onSubmit(gigData);
      }
      
      if (!editingGig) {
        setFormData({
          title: '',
          description: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
          gig_place: '',
          gig_type: 'sub_gig'
        });
        setShowRegularGigOptions(false);
      }
    } catch (error) {
      console.error('Error submitting gig:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="gig_type">Gig Type</label>
        <select
          id="gig_type"
          name="gig_type"
          value={formData.gig_type}
          onChange={handleChange}
          required
        >
          <option value="sub_gig">Sub Gig (One-time Substitute)</option>
          <option value="regular_gig">Regular Gig (Weekly)</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="gig_place">Gig Place</label>
        <input
          list="gig-places-list"
          id="gig_place"
          name="gig_place"
          value={formData.gig_place}
          onChange={handleChange}
          placeholder="Enter or select a place"
          required
        />
        <datalist id="gig-places-list">
          {gigPlaces.map(place => (
            <option key={place.id} value={place.name} />
          ))}
        </datalist>
      </div>

      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="3"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="amount">Amount ($)</label>
        <input
          type="number"
          id="amount"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          step="1"
          min="0"
          required
        />
      </div>
      
      {formData.gig_type === 'sub_gig' ? (
        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>
      ) : null}

      {formData.gig_type === 'regular_gig' && (
        <div className="gigform-weekly-schedule">
          <h4 className="gigform-weekly-title">Weekly Schedule</h4>
          <div className="form-group">
            <label htmlFor="days">Select Days</label>
            <div style={{ display: 'flex', gap: '16px', margin: '8px 0', flexWrap: 'wrap' }}>
              {dayNames.map((day, index) => (
                <label key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    name="days"
                    value={index}
                    checked={regularGigData.days.includes(index)}
                    onChange={handleRegularGigChange}
                    style={{ marginRight: '4px' }}
                  />
                  {day.slice(0, 3)}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={regularGigData.startDate}
              onChange={handleRegularGigChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="endDate">End Date</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={regularGigData.endDate}
              onChange={handleRegularGigChange}
              required
            />
          </div>
          <div className="gigform-weekly-desc">
            This will create a regular gig that appears on the selected days from {regularGigData.startDate} to {regularGigData.endDate}
          </div>
        </div>
      )}
      
      <div className="form-group">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      
      <div className="gigform-btn-row">
        <button type="submit" className="btn">
          {editingGig ? 'Update Gig' : formData.gig_type === 'regular_gig' && showRegularGigOptions ? 'Create Regular Gig' : 'Add Gig'}
        </button>
        {editingGig && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default GigForm; 