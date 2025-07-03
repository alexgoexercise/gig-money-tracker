import React, { useMemo } from 'react';

// Helper to get all days in the past year
function getPastYearDays() {
  const days = [];
  const today = new Date();
  const start = new Date(today);
  start.setFullYear(today.getFullYear() - 1);
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

// Helper to format date as yyyy-mm-dd
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Modern blue/teal color scale (5 levels)
const COLORS = [
  '#e8f1fa', // 0
  '#b6e0fe', // 1
  '#5bc0eb', // 2
  '#2196f3', // 3
  '#1565c0'  // 4 (max)
];

function getColor(amount, thresholds) {
  if (amount === 0) return COLORS[0];
  if (amount <= thresholds[0]) return COLORS[1];
  if (amount <= thresholds[1]) return COLORS[2];
  if (amount <= thresholds[2]) return COLORS[3];
  return COLORS[4];
}

function isDateInRange(date, start, end) {
  if (!start || !end) return false;
  const d = date.getTime();
  return start.getTime() <= d && d <= end.getTime();
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LABELS = ['Mon', 'Wed', 'Fri'];

const BLOCK_SIZE = 16;
const BLOCK_GAP = 2;

const EarningsHeatmap = ({ earningsByDay, selectedDate, selectedRange, onSelectDate, onSelectRange }) => {
  // Map: yyyy-mm-dd -> amount
  const earningsMap = useMemo(() => {
    const map = {};
    (earningsByDay || []).forEach(({ date, amount }) => {
      map[date] = amount;
    });
    return map;
  }, [earningsByDay]);

  // Get all days in the past year
  const days = useMemo(() => getPastYearDays(), []);

  // Find max amount for scaling
  const max = Math.max(0, ...Object.values(earningsMap));
  // 4 thresholds for 5 levels
  const thresholds = [
    max * 0.25,
    max * 0.5,
    max * 0.75
  ];

  // Group days by week (for vertical columns)
  const weeks = [];
  let week = [];
  days.forEach((date, i) => {
    if (date.getDay() === 0 && week.length) {
      weeks.push(week);
      week = [];
    }
    week.push(new Date(date));
  });
  if (week.length) weeks.push(week);

  // Calculate offset for the first week (how many days before the first block)
  const firstDayOfWeek = days[0].getDay();

  // Find the column index of the first block of each month
  const monthLabelPositions = [];
  let lastMonth = null;
  let colIndex = 0;
  weeks.forEach((week, wi) => {
    for (let di = 0; di < 7; di++) {
      const day = week[di];
      if (day && day.getDate() === 1) {
        const month = day.getMonth();
        if (month !== lastMonth) {
          monthLabelPositions.push({
            label: day.toLocaleString('default', { month: 'short' }),
            left: colIndex * (BLOCK_SIZE + BLOCK_GAP)
          });
          lastMonth = month;
        }
      }
    }
    colIndex++;
  });

  // Selection logic
  const isSelected = (date) => {
    if (selectedRange && selectedRange[0] && selectedRange[1]) {
      return isDateInRange(date, selectedRange[0], selectedRange[1]);
    }
    if (selectedDate) {
      return date.toDateString() === selectedDate.toDateString();
    }
    return false;
  };

  const handleDayClick = (date) => {
    if (!selectedDate && !selectedRange) {
      // No selection: select single date
      onSelectDate && onSelectDate(date);
    } else if (selectedDate && !selectedRange) {
      // Single date selected: if same, clear; if different, select range
      if (date.toDateString() === selectedDate.toDateString()) {
        onSelectDate && onSelectDate(null);
      } else {
        // Range: from selectedDate to clicked date
        const start = selectedDate < date ? selectedDate : date;
        const end = selectedDate > date ? selectedDate : date;
        onSelectRange && onSelectRange([start, end]);
      }
    } else if (selectedRange && selectedRange[0] && selectedRange[1]) {
      // Range selected: reset to single date
      onSelectDate && onSelectDate(date);
      onSelectRange && onSelectRange(null);
    }
  };

  // Only show Mon, Wed, Fri labels (GitHub style)
  const weekdayLabelIndexes = [1, 3, 5];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '20px 0' }}>
      <div className="heatmap-scroll" style={{ position: 'relative', height: 7 * (BLOCK_SIZE + BLOCK_GAP) + 30 }}>
        {/* Month labels absolutely positioned */}
        {monthLabelPositions.map(({ label, left }, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 16 + left + BLOCK_SIZE + BLOCK_GAP, // 16px offset for weekday labels
              top: 0,
              fontSize: 13,
              color: '#888',
              fontWeight: 500,
              width: 40,
              textAlign: 'left',
              pointerEvents: 'none',
            }}
          >
            {label}
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'row', position: 'absolute', top: 20, left: 0 }}>
          {/* Weekday labels */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginRight: 6, height: 112 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              weekdayLabelIndexes.includes(i)
                ? <div key={i} style={{ height: 16, fontSize: 13, color: '#888', fontWeight: 500 }}>{WEEKDAYS[i]}</div>
                : <div key={i} style={{ height: 16 }} />
            ))}
          </div>
          {/* Heatmap grid */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: BLOCK_GAP }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: BLOCK_GAP }}>
                {Array.from({ length: 7 }).map((_, di) => {
                  const day = week[di];
                  if (!day) return <div key={di} style={{ width: BLOCK_SIZE, height: BLOCK_SIZE }} />;
                  const dateStr = formatDate(day);
                  const amount = earningsMap[dateStr] || 0;
                  const color = getColor(amount, thresholds);
                  const selected = isSelected(day);
                  return (
                    <div
                      key={di}
                      title={`${dateStr}: $${amount.toFixed(2)}`}
                      onClick={() => handleDayClick(day)}
                      style={{
                        width: BLOCK_SIZE,
                        height: BLOCK_SIZE,
                        background: color,
                        borderRadius: 3,
                        border: selected ? '2px solid #00bcd4' : '1px solid #cfd8dc',
                        cursor: 'pointer',
                        transition: 'background 0.2s, border 0.2s',
                        boxShadow: selected ? '0 0 4px 2px #00bcd488' : undefined
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, fontSize: 12, alignItems: 'center', color: '#888' }}>
        <span>Less</span>
        {COLORS.map((c, i) => (
          <span key={i} style={{ width: BLOCK_SIZE, height: BLOCK_SIZE, background: c, display: 'inline-block', borderRadius: 3, border: '1px solid #cfd8dc' }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

export default EarningsHeatmap; 