import React from 'react';
import './GigList.css';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const GigList = ({ gigs, onEdit, onDelete, onRegularGigClick }) => {
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
        <div key={gig.id} className="gig-card">
          <div className="giglist-header">
            <div className="giglist-badges">
              <span className="giglist-type-badge">
                {gig.gig_type === 'regular_gig' ? 'Regular Gig' : 'Sub Gig'}
              </span>
              <span className={`giglist-status-badge giglist-status-${gig.status}`}>{gig.status.toUpperCase()}</span>
            </div>
            <h4 className="giglist-title">{gig.title}</h4>
          </div>
          <p className="giglist-description">{gig.description}</p>
          <div className="giglist-row">
            <span className="giglist-amount">{formatCurrency(gig.amount)}</span>
          </div>
          <div className="giglist-meta">
            {gig.gig_type === 'sub_gig' && <div>Date: {formatDate(gig.date)}</div>}
            {gig.gig_place && <div>Place: {gig.gig_place}</div>}
            {gig.gig_type === 'regular_gig' && gig.routine_days && gig.routine_days.length > 0 && (
              <div>Routine Days: {gig.routine_days.map(idx => dayNames[idx]).join(', ')}</div>
            )}
            {gig.gig_type === 'regular_gig' && <div>Period: {formatDate(gig.date)} to {formatDate(gig.recurring_end_date)}</div>}
          </div>
          <div className="giglist-actions">
            {gig.gig_type === 'regular_gig' && (
              <button
                className="giglist-action-btn giglist-view-btn-main"
                onClick={() => onRegularGigClick && onRegularGigClick(gig)}
              >
                Click to view and manage occurrences →
              </button>
            )}
            <button
              className="giglist-action-btn giglist-delete-btn"
              title={gig.gig_type === 'regular_gig' ? 'Delete this regular gig and all its occurrences' : 'Delete this sub gig'}
              onClick={e => {
                e.stopPropagation();
                if (window.confirm(gig.gig_type === 'regular_gig' ? 'Delete this regular gig and all its occurrences?' : 'Delete this sub gig?')) {
                  onDelete(gig.id);
                }
              }}
            >
              Delete
            </button>
            {gig.gig_type === 'sub_gig' && (
              <button 
                className="giglist-action-btn btn btn-secondary" 
                onClick={() => onEdit(gig)}
              >
                Edit
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GigList; 