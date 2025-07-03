import React, { useMemo, useEffect, useState } from 'react';

const FullTimeGigDetails = ({ fullTimeGig, onClose }) => {
  const [overrides, setOverrides] = useState({});
  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState({ status: 'pending', amount: '', notes: '' });

  useEffect(() => {
    if (fullTimeGig?.id) {
      window.electronAPI.getAllOccurrenceOverridesForGig(fullTimeGig.id).then(data => {
        const map = {};
        data.forEach(o => { map[o.date] = o; });
        setOverrides(map);
      });
    }
  }, [fullTimeGig]);

  // Compute daily occurrences in the UI
  const dailyOccurrences = useMemo(() => {
    if (!fullTimeGig || !fullTimeGig.full_time_start_date || !fullTimeGig.full_time_end_date || !fullTimeGig.full_time_days) return [];
    
    const start = new Date(fullTimeGig.full_time_start_date);
    const end = new Date(fullTimeGig.full_time_end_date);
    const days = fullTimeGig.full_time_days.split(',').map(Number);
    const occurrences = [];
    
    let current = new Date(start);
    while (current <= end) {
      if (days.includes(current.getDay())) {
        occurrences.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return occurrences;
  }, [fullTimeGig]);

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
      amount: override?.amount !== null && override?.amount !== undefined ? override.amount : fullTimeGig.amount,
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
      fullTimeGig.id,
      isoDate,
      editForm.status,
      parseFloat(editForm.amount),
      editForm.notes
    );
    // Refresh overrides
    const data = await window.electronAPI.getAllOccurrenceOverridesForGig(fullTimeGig.id);
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Full-time Gig Details</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="full-time-gig-info" style={{ background: '#f0f8ff', border: '1px solid #b3d9ff', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <h3 style={{ color: '#007bff', margin: 0 }}>{fullTimeGig.title}</h3>
            {fullTimeGig.description && <p style={{ margin: '5px 0' }}>{fullTimeGig.description}</p>}
            <div className="gig-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <div><strong>Amount:</strong> {formatCurrency(fullTimeGig.amount)}</div>
              <div><strong>Place:</strong> {fullTimeGig.gig_place}</div>
              <div><strong>Period:</strong> {formatDate(fullTimeGig.full_time_start_date)} to {formatDate(fullTimeGig.full_time_end_date)}</div>
              <div><strong>Routine Days:</strong> {fullTimeGig.full_time_days ? fullTimeGig.full_time_days.split(',').map(idx => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][parseInt(idx)]).join(', ') : ''}</div>
            </div>
          </div>
          <div className="daily-gigs-section">
            <h4>Daily Occurrences ({dailyOccurrences.length} total)</h4>
            {dailyOccurrences.length === 0 ? (
              <p>No daily occurrences found.</p>
            ) : (
              <div className="daily-gigs-list">
                {dailyOccurrences.map((date, idx) => {
                  const isoDate = date.toISOString().split('T')[0];
                  const override = overrides[isoDate];
                  const status = override?.status || 'pending';
                  const amount = override?.amount !== null && override?.amount !== undefined ? override.amount : fullTimeGig.amount;
                  const notes = override?.notes || '';
                  
                  return (
                    <div key={idx} className="daily-gig-item" style={{ 
                      background: '#fff', 
                      border: `2px solid ${getStatusColor(status)}`, 
                      borderRadius: 8, 
                      marginBottom: 10, 
                      padding: 12,
                      position: 'relative'
                    }}>
                      {editingIdx === idx ? (
                        <form onSubmit={e => { e.preventDefault(); handleEditSave(date); }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ fontWeight: 'bold', color: '#007bff' }}>{formatDate(date)}</div>
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
                              <span style={{ fontWeight: 'bold', color: '#007bff' }}>{formatDate(date)}</span>
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
                            <div style={{ color: '#007bff', fontWeight: 'bold', fontSize: '16px', marginBottom: 8 }}>
                              {formatCurrency(amount)}
                            </div>
                            {notes && (
                              <div style={{ 
                                fontSize: '12px', 
                                color: '#666', 
                                backgroundColor: '#f8f9fa', 
                                padding: '8px', 
                                borderRadius: '4px',
                                marginBottom: 8
                              }}>
                                <strong>Notes:</strong> {notes}
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
                                    fullTimeGig.id,
                                    isoDate,
                                    'completed',
                                    amount,
                                    notes
                                  );
                                  // Refresh overrides
                                  const data = await window.electronAPI.getAllOccurrenceOverridesForGig(fullTimeGig.id);
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

export default FullTimeGigDetails; 