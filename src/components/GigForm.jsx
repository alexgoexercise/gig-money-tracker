import React, { useState, useEffect } from 'react';

const GigForm = ({ onSubmit, editingGig, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    gig_place: ''
  });
  const [gigPlaces, setGigPlaces] = useState([]);

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
        gig_place: editingGig.gig_place || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        gig_place: ''
      });
    }
  }, [editingGig]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const gigData = {
      ...formData,
      amount: parseFloat(formData.amount)
    };

    onSubmit(gigData);
    
    if (!editingGig) {
      setFormData({
        title: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        gig_place: ''
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
            
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
          {editingGig ? 'Update Gig' : 'Add Gig'}
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