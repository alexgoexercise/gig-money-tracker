import React from 'react';

const GigList = ({ gigs, onEdit, onDelete }) => {
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
          <h4>{gig.title}</h4>
          {gig.description && <p>{gig.description}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <span className="amount">{formatCurrency(gig.amount)}</span>
            <span className={`status ${gig.status}`}>{gig.status}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Date: {formatDate(gig.date)}
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
      ))}
    </div>
  );
};

export default GigList; 