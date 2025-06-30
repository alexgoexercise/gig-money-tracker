import React from 'react';

const Notification = ({ message, type = 'info' }) => {
  return (
    <div className={`notification ${type}`}>
      {message}
    </div>
  );
};

export default Notification; 