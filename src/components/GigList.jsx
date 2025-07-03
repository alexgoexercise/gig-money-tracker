import React from 'react';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const GigList = ({ gigs, onEdit, onDelete, onRegularGigClick, onFullTimeGigClick }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getGigTypeLabel = (gigType) => {
    if (gigType === 'regular_gig') return 'Regular Gig';
    if (gigType === 'full_time_gig') return 'Full-time Gig';
    return 'Sub Gig';
  };

  const getGigTypeColor = (gigType) => {
    if (gigType === 'regular_gig') return '#28a745';
    if (gigType === 'full_time_gig') return '#007bff';
    return '#007bff';
  };

  if (gigs.length === 0) {
    return (
      <div className="gig-list">
        <p>No gigs yet. Add your first gig!</p>
      </div>
    );
  }

  return (
    <div className="gig-list">
      {gigs.map(gig => (
        <div key={gig.id} className="gig-item">
          {gig.gig_type === 'regular_gig' ? (
            // Regular gig - show as clickable tag
            <div 
              className="regular-gig-tag"
              style={{
                cursor: 'pointer',
                padding: '15px',
                border: '2px solid #28a745',
                borderRadius: '8px',
                backgroundColor: '#f8fff8',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onClick={() => onRegularGigClick(gig)}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#e8f5e8';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#f8fff8';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, color: '#28a745' }}>{gig.title}</h4>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <span 
                    style={{ 
                      fontSize: '10px', 
                      padding: '2px 6px', 
                      borderRadius: '10px', 
                      backgroundColor: '#28a745',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    🔄 Regular Gig
                  </span>
                  <button
                    className="btn btn-small btn-danger"
                    style={{ marginLeft: 10, cursor: 'pointer' }}
                    title="Delete this regular gig and all its occurrences"
                    onClick={e => {
                      e.stopPropagation();
                      if (window.confirm('Delete this regular gig and all its weekly occurrences?')) {
                        onDelete(gig.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {gig.description && <p style={{ margin: '5px 0', color: '#666' }}>{gig.description}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span className="amount" style={{ fontSize: '16px', fontWeight: 'bold' }}>{formatCurrency(gig.amount)}</span>
                <span className={`status ${gig.status}`}>{gig.status}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                <div>Place: {gig.gig_place}</div>
                <div>Schedule: Every {gig.recurring_pattern?.replace('weekly_', '') === '0' ? 'Sunday' : 
                  gig.recurring_pattern?.replace('weekly_', '') === '1' ? 'Monday' :
                  gig.recurring_pattern?.replace('weekly_', '') === '2' ? 'Tuesday' :
                  gig.recurring_pattern?.replace('weekly_', '') === '3' ? 'Wednesday' :
                  gig.recurring_pattern?.replace('weekly_', '') === '4' ? 'Thursday' :
                  gig.recurring_pattern?.replace('weekly_', '') === '5' ? 'Friday' : 'Saturday'}</div>
                <div>Period: {formatDate(gig.date)} to {formatDate(gig.recurring_end_date)}</div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#28a745', fontStyle: 'italic' }}>
                Click to view and manage weekly occurrences →
              </div>
            </div>
          ) : gig.gig_type === 'full_time_gig' ? (
            // Full-time gig - show as a blue tag
            <div
              className="full-time-gig-tag"
              style={{
                cursor: 'pointer',
                padding: '15px',
                border: '2px solid #007bff',
                borderRadius: '8px',
                backgroundColor: '#f8faff',
                marginBottom: '10px',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
              onClick={() => onFullTimeGigClick(gig)}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#e6f3ff';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#f8faff';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, color: '#007bff' }}>{gig.title}</h4>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    🗓️ Full-time Gig
                  </span>
                  <button
                    className="btn btn-small btn-danger"
                    style={{ marginLeft: 10, cursor: 'pointer' }}
                    title="Delete this full-time gig"
                    onClick={e => {
                      e.stopPropagation();
                      if (window.confirm('Delete this full-time gig?')) {
                        onDelete(gig.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {gig.description && <p style={{ margin: '5px 0', color: '#666' }}>{gig.description}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span className="amount" style={{ fontSize: '16px', fontWeight: 'bold' }}>{formatCurrency(gig.amount)}</span>
                <span className={`status ${gig.status}`}>{gig.status}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                <div>Place: {gig.gig_place}</div>
                <div>Period: {formatDate(gig.full_time_start_date)} to {formatDate(gig.full_time_end_date)}</div>
                <div>Routine Days: {gig.full_time_days ? gig.full_time_days.split(',').map(idx => dayNames[idx]).join(', ') : ''}</div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#007bff', fontStyle: 'italic' }}>
                Click to view and manage daily occurrences →
              </div>
            </div>
          ) : (
            // Sub gig - show as regular item
            <div className="gig-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <h4>{gig.title}</h4>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <span 
                    style={{ 
                      fontSize: '10px', 
                      padding: '2px 6px', 
                      borderRadius: '10px', 
                      backgroundColor: getGigTypeColor(gig.gig_type || 'sub_gig'),
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    {getGigTypeLabel(gig.gig_type || 'sub_gig')}
                  </span>
                </div>
              </div>
              {gig.description && <p>{gig.description}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span className="amount">{formatCurrency(gig.amount)}</span>
                <span className={`status ${gig.status}`}>{gig.status}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                <div>Date: {formatDate(gig.date)}</div>
                {gig.gig_place && <div>Place: {gig.gig_place}</div>}
              </div>
              <div style={{ marginTop: '10px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => onEdit(gig)}
                  style={{ marginRight: '5px' }}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => onDelete(gig.id)}
                  style={{ background: '#dc3545' }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default GigList; 