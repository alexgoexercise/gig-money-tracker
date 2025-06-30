import React from 'react';

const StatsGrid = ({ stats }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <h3>Total Earnings</h3>
        <div className="amount positive">
          {formatCurrency(stats.totalEarnings)}
        </div>
      </div>
      <div className="stat-card">
        <h3>Total Expenses</h3>
        <div className="amount negative">
          {formatCurrency(stats.totalExpenses)}
        </div>
      </div>
      <div className="stat-card">
        <h3>Net Income</h3>
        <div className={`amount ${stats.netIncome >= 0 ? 'positive' : 'negative'}`}>
          {formatCurrency(stats.netIncome)}
        </div>
      </div>
    </div>
  );
};

export default StatsGrid; 