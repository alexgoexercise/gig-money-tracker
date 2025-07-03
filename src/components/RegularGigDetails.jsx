import React, { useMemo, useEffect, useState } from 'react';

const RegularGigDetails = ({ regularGig, onClose }) => {
  // Debug logging
  console.log('RegularGigDetails regularGig:', regularGig);

  const [overrides, setOverrides] = useState({});
  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState({ status: 'pending', amount: '', notes: '' });

  useEffect(() => {
    if (regularGig?.id) {
      window.electronAPI.getAllOccurrenceOverridesForGig(regularGig.id).then(data => {
        const map = {};
        data.forEach(o => { map[o.date] = o; });
        setOverrides(map);
      });
    }
  }, [regularGig]);

  // Compute weekly occurrences in the UI
  const weeklyOccurrences = useMemo(() => {
    if (!regularGig || !regularGig.date || !regularGig.recurring_end_date || !regularGig.recurring_pattern) return [];
    if (typeof regularGig.recurring_pattern !== 'string' || !regularGig.recurring_pattern.startsWith('weekly_')) return [];
    const start = new Date(regularGig.date);
    const end = new Date(regularGig.recurring_end_date);
    const dayOfWeek = parseInt(regularGig.recurring_pattern.replace('weekly_', ''));
    const occurrences = [];
    let current = new Date(start);
    // Move to the first correct day of week
    while (current.getDay() !== dayOfWeek) {
      current.setDate(current.getDate() + 1);
    }
    while (current <= end) {
      occurrences.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
    return occurrences;
  }, [regularGig]);

  // Debug logging
  console.log('RegularGigDetails weeklyOccurrences:', weeklyOccurrences);

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
      amount: override?.amount !== null && override?.amount !== undefined ? override.amount : regularGig.amount,
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
      parseFloat(editForm.amount),
      editForm.notes
    );
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
            <div style={{ color: 'red', fontWeight: 'bold', padding: 20 }}>
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
          <div className="regular-gig-info" style={{ background: '#f6fff6', border: '1px solid #b2e5b2', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <h3 style={{ color: '#28a745', margin: 0 }}>{regularGig.title}</h3>
            {regularGig.description && <p style={{ margin: '5px 0' }}>{regularGig.description}</p>}
            <div className="gig-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <div><strong>Amount:</strong> {formatCurrency(regularGig.amount)}</div>
              <div><strong>Place:</strong> {regularGig.gig_place}</div>
              <div><strong>Schedule:</strong> Every {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][parseInt(regularGig.recurring_pattern.replace('weekly_', ''))]}</div>
              <div><strong>Period:</strong> {formatDate(regularGig.date)} to {formatDate(regularGig.recurring_end_date)}</div>
            </div>
          </div>
          <div className="weekly-gigs-section">
            <h4>Weekly Occurrences ({weeklyOccurrences.length} total)</h4>
            {weeklyOccurrences.length === 0 ? (
              <p>No weekly occurrences found.</p>
            ) : (
              <div className="weekly-gigs-list">
                {weeklyOccurrences.map((date, idx) => {
                  const isoDate = date.toISOString().split('T')[0];
                  const override = overrides[isoDate];
                  const status = override?.status || 'pending';
                  const amount = override?.amount !== null && override?.amount !== undefined ? override.amount : regularGig.amount;
                  return (
                    <div key={idx} className="weekly-gig-item" style={{ 
                      background: '#fff', 
                      border: `2px solid ${getStatusColor(status)}`, 
                      borderRadius: 8, 
                      marginBottom: 10, 
                      padding: 12,
                      position: 'relative'
                    }}>
                      {editingIdx === idx ? (
                        <form onSubmit={e => { e.preventDefault(); handleEditSave(date); }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ fontWeight: 'bold', color: '#28a745' }}>{formatDate(date)}</div>
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
                            <input name="amount" type="number" step="0.01" value={editForm.amount} onChange={handleEditChange} />
                          </div>
                          <div>
                            <label>Notes: </label>
                            <textarea 
                              name="notes" 
                              value={editForm.notes} 
                              onChange={handleEditChange}
                              rows="3"
                              style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                              placeholder="Add any notes about this occurrence..."
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="submit" className="btn btn-small btn-primary">Save</button>
                            <button type="button" className="btn btn-small btn-secondary" onClick={() => setEditingIdx(null)}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <span style={{ fontWeight: 'bold', color: '#28a745' }}>{formatDate(date)}</span>
                              <span style={{ 
                                fontSize: '12px', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                backgroundColor: getStatusColor(status),
                                color: 'white',
                                fontWeight: 'bold'
                              }}>
                                {getStatusIcon(status)} {status.toUpperCase()}
                              </span>
                            </div>
                            <div style={{ color: '#28a745', fontWeight: 'bold', fontSize: '16px', marginBottom: 8 }}>
                              {formatCurrency(amount)}
                            </div>
                            {override?.notes && (
                              <div style={{ 
                                fontSize: '12px', 
                                color: '#666', 
                                backgroundColor: '#f8f9fa', 
                                padding: '8px', 
                                borderRadius: '4px',
                                marginBottom: 8
                              }}>
                                <strong>Notes:</strong> {override.notes}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <button 
                              className="btn btn-small" 
                              onClick={() => handleEdit(idx, date)}
                              style={{ fontSize: '12px', padding: '4px 8px' }}
                            >
                              Edit
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
                                    amount,
                                    override?.notes || ''
                                  );
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