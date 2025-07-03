import React, { useMemo, useEffect, useState } from 'react';
import './RegularGigDetails.css';

function getDatesInRange(start, end, daysOfWeek) {
  // Returns array of Date objects for all dates in [start, end] that match daysOfWeek
  const dates = [];
  let current = new Date(start);
  while (current <= end) {
    if (daysOfWeek.includes(current.getDay())) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

const RegularGigDetails = ({ regularGig, onClose }) => {
  // Debug logging
  console.log('RegularGigDetails regularGig:', regularGig);

  const [overrides, setOverrides] = useState({});
  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState({ status: 'pending', amount: '', notes: '' });
  const [calendarStart, setCalendarStart] = useState('');
  const [calendarEnd, setCalendarEnd] = useState('');
  const [calendarDays, setCalendarDays] = useState([]);
  const [addError, setAddError] = useState('');
  const [showAddOccurrence, setShowAddOccurrence] = useState(false);

  // Map full_time_days to routine_days for compatibility
  const routineDays = React.useMemo(() => {
    if (regularGig.routine_days && Array.isArray(regularGig.routine_days)) return regularGig.routine_days;
    if (regularGig.routine_days && typeof regularGig.routine_days === 'string') return regularGig.routine_days.split(',').map(Number);
    if (regularGig.full_time_days && typeof regularGig.full_time_days === 'string') return regularGig.full_time_days.split(',').map(Number);
    return [];
  }, [regularGig]);

  useEffect(() => {
    if (regularGig?.id) {
      window.electronAPI.getAllOccurrenceOverridesForGig(regularGig.id).then(data => {
        const map = {};
        data.forEach(o => { map[o.date] = o; });
        setOverrides(map);
      });
    }
  }, [regularGig]);

  // Compute all occurrences in the UI (support multiple days)
  const occurrences = useMemo(() => {
    if (!regularGig || !regularGig.date || !regularGig.recurring_end_date || !routineDays.length) return [];
    const start = new Date(regularGig.date);
    const end = new Date(regularGig.recurring_end_date);
    return getDatesInRange(start, end, routineDays);
  }, [regularGig, routineDays]);

  // Debug logging
  console.log('RegularGigDetails weeklyOccurrences:', occurrences);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const handleEdit = (idx, occDate) => {
    setEditingIdx(idx);
    const isoDate = occDate.toISOString().split('T')[0];
    const override = overrides[isoDate];
    setEditForm({
      status: override?.status || 'pending',
      amount: override?.amount !== null && override?.amount !== undefined ? override.amount.toString() : regularGig.amount.toString(),
      notes: override?.notes || ''
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: value }));
  };

  const handleEditSave = async (occDate) => {
    const isoDate = occDate.toISOString().split('T')[0];
    await window.electronAPI.setOccurrenceOverride(
      regularGig.id,
      isoDate,
      editForm.status,
      parseFloat(editForm.amount) || 0,
      editForm.notes
    );
    // If marking as completed, also update parent gig status
    if (editForm.status === 'completed' && regularGig.status !== 'completed') {
      await window.electronAPI.updateGig(regularGig.id, { ...regularGig, status: 'completed' });
    }
    // Refresh overrides
    const data = await window.electronAPI.getAllOccurrenceOverridesForGig(regularGig.id);
    const map = {};
    data.forEach(o => { map[o.date] = o; });
    setOverrides(map);
    setEditingIdx(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'cancelled': return '#dc3545';
      default: return '#ffc107';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'cancelled': return '❌';
      default: return '⏳';
    }
  };

  // Add new occurrences via calendar picker
  const handleAddOccurrences = async () => {
    setAddError('');
    if (!calendarStart || !calendarEnd || calendarDays.length === 0) {
      setAddError('Please select a start date, end date, and at least one day of week.');
      return;
    }
    const start = new Date(calendarStart);
    const end = new Date(calendarEnd);
    if (start > end) {
      setAddError('Start date must be before end date.');
      return;
    }
    const datesToAdd = getDatesInRange(start, end, calendarDays.map(Number));
    for (const dateObj of datesToAdd) {
      const isoDate = dateObj.toISOString().split('T')[0];
      // Only add if not already present
      if (!occurrences.some(d => d.toISOString().split('T')[0] === isoDate)) {
        await window.electronAPI.setOccurrenceOverride(
          regularGig.id,
          isoDate,
          'pending',
          parseFloat(regularGig.amount) || 0,
          ''
        );
      }
    }
    // Refresh overrides
    const data = await window.electronAPI.getAllOccurrenceOverridesForGig(regularGig.id);
    const map = {};
    data.forEach(o => { map[o.date] = o; });
    setOverrides(map);
    setCalendarStart('');
    setCalendarEnd('');
    setCalendarDays([]);
  };

  // Delete an occurrence
  const handleDeleteOccurrence = async (occDate) => {
    const isoDate = occDate.toISOString().split('T')[0];
    await window.electronAPI.deleteOccurrenceOverride(regularGig.id, isoDate);
    // Refresh overrides
    const data = await window.electronAPI.getAllOccurrenceOverridesForGig(regularGig.id);
    const map = {};
    data.forEach(o => { map[o.date] = o; });
    setOverrides(map);
  };

  // Show error if recurring_pattern is missing or invalid
  if (!regularGig.recurring_pattern || typeof regularGig.recurring_pattern !== 'string' || !regularGig.recurring_pattern.startsWith('weekly_')) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Regular Gig Details</h2>
            <button className="close-button" onClick={onClose}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="regulardetails-error">
              This regular gig is missing a valid recurring pattern.<br />
              Please edit or recreate this gig.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Regular Gig Details</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="regulardetails-info">
            <h3 className="regulardetails-title">{regularGig.title}</h3>
            {regularGig.description && <p className="regulardetails-description">{regularGig.description}</p>}
            <div className="regulardetails-meta">
              <div><strong>Amount:</strong> {formatCurrency(regularGig.amount)}</div>
              <div><strong>Place:</strong> {regularGig.gig_place}</div>
              <div><strong>Routine Days:</strong> {routineDays.map(idx => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][idx]).join(', ')}</div>
              <div><strong>Period:</strong> {formatDate(regularGig.date)} to {formatDate(regularGig.recurring_end_date)}</div>
            </div>
          </div>
          <div className="regulardetails-calendar-add">
            <button className="btn btn-primary" onClick={() => setShowAddOccurrence(v => !v)}>
              {showAddOccurrence ? 'Cancel' : 'Add Occurrence'}
            </button>
            {showAddOccurrence && (
              <div style={{ marginTop: 16 }}>
                <h4>Add Occurrences</h4>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label>Start Date: <input type="date" value={calendarStart} onChange={e => setCalendarStart(e.target.value)} /></label>
                  <label>End Date: <input type="date" value={calendarEnd} onChange={e => setCalendarEnd(e.target.value)} /></label>
                  <span>Days:</span>
                  {[0,1,2,3,4,5,6].map(idx => (
                    <label key={idx} style={{ marginRight: 8 }}>
                      <input type="checkbox" value={idx} checked={calendarDays.includes(idx)} onChange={e => {
                        if (e.target.checked) setCalendarDays([...calendarDays, idx]);
                        else setCalendarDays(calendarDays.filter(d => d !== idx));
                      }} />
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][idx]}
                    </label>
                  ))}
                  <button className="btn btn-small btn-primary" onClick={handleAddOccurrences}>Add</button>
                </div>
                {addError && <div style={{ color: 'red', marginTop: 4 }}>{addError}</div>}
              </div>
            )}
          </div>
          <div className="weekly-gigs-section">
            <h4>Occurrences ({occurrences.length} total)</h4>
            {occurrences.length === 0 ? (
              <p>No occurrences found.</p>
            ) : (
              <div className="weekly-gigs-list">
                {occurrences.map((date, idx) => {
                  const isoDate = date.toISOString().split('T')[0];
                  const override = overrides[isoDate];
                  const status = override?.status || 'pending';
                  const amount = override?.amount !== null && override?.amount !== undefined ? override.amount : regularGig.amount;
                  return (
                    <div key={idx} className={`regulardetails-occurrence regulardetails-occurrence-${status}`}>
                      {editingIdx === idx ? (
                        <form onSubmit={e => { e.preventDefault(); handleEditSave(date); }} className="regulardetails-edit-form">
                          <div className="regulardetails-date">{formatDate(date)}</div>
                          <div>
                            <label>Status: </label>
                            <select name="status" value={editForm.status} onChange={handleEditChange}>
                              <option value="pending">Pending</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                          <div>
                            <label>Amount: </label>
                            <input name="amount" type="number" step="1" min="0" value={editForm.amount} onChange={handleEditChange} />
                          </div>
                          <div>
                            <label>Notes: </label>
                            <textarea 
                              name="notes" 
                              value={editForm.notes} 
                              onChange={handleEditChange}
                              rows="3"
                              className="regulardetails-textarea"
                              placeholder="Add any notes about this occurrence..."
                            />
                          </div>
                          <div className="regulardetails-btn-row">
                            <button type="submit" className="btn btn-small btn-primary">Save</button>
                            <button type="button" className="btn btn-small btn-secondary" onClick={() => setEditingIdx(null)}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <div className="regulardetails-occurrence-row">
                          <div className="regulardetails-occurrence-col">
                            <div className="regulardetails-occurrence-header">
                              <div className="regulardetails-date">{formatDate(date)}</div>
                              <span className={`regulardetails-status regulardetails-status-${status}`}>
                                {getStatusIcon(status)} {status.toUpperCase()}
                              </span>
                            </div>
                            <div className="regulardetails-amount">
                              {amount}
                            </div>
                            {override?.notes && (
                              <div className="regulardetails-notes">
                                <strong>Notes:</strong> {override.notes}
                              </div>
                            )}
                          </div>
                          <div className="regulardetails-btn-col">
                            <button 
                              className="btn btn-small" 
                              onClick={() => handleEdit(idx, date)}
                              style={{ fontSize: '12px', padding: '4px 8px' }}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-small btn-danger" 
                              onClick={() => handleDeleteOccurrence(date)}
                              style={{ fontSize: '12px', padding: '4px 8px', marginLeft: 4 }}
                            >
                              Delete
                            </button>
                            {status === 'pending' && (
                              <button 
                                className="btn btn-small btn-success" 
                                onClick={async () => {
                                  const isoDate = date.toISOString().split('T')[0];
                                  await window.electronAPI.setOccurrenceOverride(
                                    regularGig.id,
                                    isoDate,
                                    'completed',
                                    parseFloat(amount) || 0,
                                    override?.notes || ''
                                  );
                                  if (regularGig.status !== 'completed') {
                                    await window.electronAPI.updateGig(regularGig.id, { ...regularGig, status: 'completed' });
                                  }
                                  // Refresh overrides
                                  const data = await window.electronAPI.getAllOccurrenceOverridesForGig(regularGig.id);
                                  const map = {};
                                  data.forEach(o => { map[o.date] = o; });
                                  setOverrides(map);
                                }}
                                style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#28a745', color: 'white' }}
                              >
                                Mark Complete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegularGigDetails; 