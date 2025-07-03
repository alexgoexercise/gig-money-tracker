import React, { useState, useEffect } from 'react';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const GigForm = ({ onSubmit, editingGig, onCancel }) => {
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
    dayOfWeek: new Date().getDay()
  });
  const [fullTimeGigData, setFullTimeGigData] = useState({
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
      setShowRegularGigOptions(false);
      setFullTimeGigData({
        startDate: editingGig.full_time_start_date || new Date().toISOString().split('T')[0],
        endDate: editingGig.full_time_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        days: editingGig.full_time_days ? editingGig.full_time_days.split(',').map(Number) : []
      });
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
      setFullTimeGigData({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        days: []
      });
    }
  }, [editingGig]);

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

  const handleFullTimeGigChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFullTimeGigData(prev => {
        const days = checked
          ? [...prev.days, parseInt(value)]
          : prev.days.filter(d => d !== parseInt(value));
        return { ...prev, days };
      });
    } else {
      setFullTimeGigData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const gigData = {
      ...formData,
      amount: parseFloat(formData.amount)
    };

    try {
      if (formData.gig_type === 'regular_gig' && showRegularGigOptions) {
        // Add regular gig with weekly occurrences
        await window.electronAPI.addRegularGig(
          gigData,
          regularGigData.startDate,
          regularGigData.endDate,
          parseInt(regularGigData.dayOfWeek)
        );
      } else if (formData.gig_type === 'full_time_gig') {
        await onSubmit({
          ...gigData,
          full_time_start_date: fullTimeGigData.startDate,
          full_time_end_date: fullTimeGigData.endDate,
          full_time_days: fullTimeGigData.days.join(',')
        });
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
        setFullTimeGigData({
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          days: []
        });
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
          <option value="full_time_gig">Full-time Gig (Routine)</option>
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
          step="0.01"
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
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', marginBottom: '15px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Weekly Schedule</h4>
          <div className="form-group">
            <label htmlFor="dayOfWeek">Day of Week</label>
            <select
              id="dayOfWeek"
              name="dayOfWeek"
              value={regularGigData.dayOfWeek}
              onChange={handleRegularGigChange}
              required
            >
              {dayNames.map((day, index) => (
                <option key={index} value={index}>{day}</option>
              ))}
            </select>
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
          <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            This will create a regular gig that appears every {dayNames[regularGigData.dayOfWeek]} from {regularGigData.startDate} to {regularGigData.endDate}
          </div>
        </div>
      )}

      {formData.gig_type === 'full_time_gig' && (
        <div style={{ border: '1px solid #007bff', padding: '15px', borderRadius: '5px', marginBottom: '15px', background: '#f8faff' }}>
          <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#007bff' }}>Full-time Routine Schedule</h4>
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={fullTimeGigData.startDate}
              onChange={handleFullTimeGigChange}
              required
            />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              name="endDate"
              value={fullTimeGigData.endDate}
              onChange={handleFullTimeGigChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Routine Days</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {dayNames.map((day, idx) => (
                <label key={idx} style={{ fontWeight: 'normal' }}>
                  <input
                    type="checkbox"
                    name="days"
                    value={idx}
                    checked={fullTimeGigData.days.includes(idx)}
                    onChange={handleFullTimeGigChange}
                  />
                  {day.slice(0, 3)}
                </label>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            This will create a full-time gig from {fullTimeGigData.startDate} to {fullTimeGigData.endDate} on selected days.
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
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="submit" className="btn">
          {editingGig ? 'Update Gig' : formData.gig_type === 'regular_gig' && showRegularGigOptions ? 'Create Regular Gig' : formData.gig_type === 'full_time_gig' ? 'Create Full-time Gig' : 'Add Gig'}
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