import React, { useMemo, useState } from 'react';
import './EarningsHeatmap.css';

// Helper to get all days in a given year (or past year if not specified)
function getYearDays(year) {
  const days = [];
  const today = new Date();
  let start, end;
  if (year === today.getFullYear()) {
    // From last year today to today
    start = new Date(today);
    start.setFullYear(today.getFullYear() - 1);
    end = today;
  } else {
    // Full calendar year
    start = new Date(year, 0, 1);
    end = new Date(year, 11, 31);
  }
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

// Helper to format date as yyyy-mm-dd
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Add yellow for pending
const PENDING_COLOR = '#fff7b2'; // light yellow

// Modern blue/teal color scale (5 levels)
const COLORS = [
  '#e8f1fa', // 0
  '#b6e0fe', // 1
  '#5bc0eb', // 2
  '#2196f3', // 3
  '#1565c0'  // 4 (max)
];

function getColor(amount, thresholds, status) {
  if (status === 'pending') return PENDING_COLOR;
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

const BLOCK_SIZE = 12;
const BLOCK_GAP = 3;

const WEEKDAY_LABEL_WIDTH = 32; // px, match CSS

const EarningsHeatmap = ({ earningsByDay, selectedDate, selectedRange, onSelectDate, onSelectRange }) => {
  // Map: yyyy-mm-dd -> { amount, status }
  const earningsMap = useMemo(() => {
    const map = {};
    (earningsByDay || []).forEach(({ date, amount, status }) => {
      map[date] = { amount, status };
    });
    return map;
  }, [earningsByDay]);

  // Add year selection state
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Get all days for the selected year
  const days = useMemo(() => getYearDays(selectedYear), [selectedYear]);

  // Find max amount for scaling, for now we set a hard 400 as the max earning per day

  // const max = Math.max(0, ...Object.values(earningsMap));
  const max = 400;
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
  // weeks[[week 0] [week 1]...], week always end with a Saturday
  // eg. Week 1: [new Date(2024, 11, 15), new Date(2024, 11, 16), new Date(2024, 11, 17), new Date(2024, 11, 18) (end with a Saturday)]
  //     Week 2: [new Date(2024, 11, 19), new Date(2024, 11, 20), new Date(2024, 11, 21), new Date(2024, 11, 22), new Date(2024, 11, 23), new Date(2024, 11, 24), new Date(2024, 11, 25)]
  if (week.length) weeks.push(week);

  // Find the column index of the first block of each month
  const monthLabelPositions = []; // Array to store the month labels and their positions (horizontal coordinates)
  let lastMonth = null;
  let colIndex = 0;

  // Check through each week and each day of the week to find the first day of each month
  // Add the month label to the monthLabelPositions array
  weeks.forEach((week, wi) => {
    for (let di = 0; di < 7; di++) {
      const day = week[di];
      if (day && day.getDate() === 1) {
        // Only ruuns if 1. day exists (there can be weeks with less than 7 days); 2. day is the first day of the month
        // get date returns the day of the date in the month (eg. 1, 2, 3, etc.)
        const month = day.getMonth();
        if (month !== lastMonth) {
          // If the month is different from the last month, add the month label
          monthLabelPositions.push({
            label: day.toLocaleString('default', { month: 'short' }),
            left: colIndex * (BLOCK_SIZE + BLOCK_GAP)  //calculate the horizontal position of the month label
          });
          lastMonth = month;
        }
      }
    }
    colIndex++;  // Increment the column index by 1 each week
  });

  // Calculate grid width for hiding overflowing month labels
  // weeks.length is the number of weeks, BLOCK_SIZE + BLOCK_GAP is the width of each block and the gap between blocks
  const gridWidth = weeks.length * (BLOCK_SIZE + BLOCK_GAP) - BLOCK_GAP;

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

  // Generate year options (last 5 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <h2 className="heatmap-title">Earnings Heatmap (Past Year)</h2>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="heatmap-year-selector"
        >
          {yearOptions.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="heatmap-card">
        <div className="heatmap-flex-container">
          {/* Weekday labels */}
          <div className="heatmap-week-labels">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="heatmap-week-label"
              >{weekdayLabelIndexes.includes(i) ? WEEKDAYS[i] : ''}</div>
            ))}
          </div>
          <div className="heatmap-relative-container">
            {/* Month labels absolutely positioned */}
            {monthLabelPositions.map(({ label, left }, i) => (
              left + 40 <= gridWidth ? (
                <div
                  key={i}
                  className="heatmap-month-label"
                  style={{ left }}
                >
                  {label}
                </div>
              ) : null
            ))}
            {/* Heatmap grid */}
            <div className="heatmap-grid">
              {weeks.map((week, wi) => (
                <div key={wi} className="heatmap-week">
                  {Array.from({ length: 7 }).map((_, di) => {
                    const day = week[di];
                    if (!day) return <div key={di} className="heatmap-block" />;
                    const dateStr = formatDate(day);
                    const { amount = 0, status = undefined } = earningsMap[dateStr] || {};
                    const color = getColor(amount, thresholds, status);
                    const selected = isSelected(day);
                    return (
                      <div
                        key={di}
                        title={`${dateStr}: $${amount.toFixed(2)}${status ? ' (' + status + ')' : ''}`}
                        onClick={() => handleDayClick(day)}
                        className={`heatmap-block${selected ? ' selected' : ''}`}
                        style={{ background: color }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Legend */}
        <div className="heatmap-legend">
          <span>Less</span>
          {COLORS.map((c, i) => (
            <span key={i} className="heatmap-legend-block" style={{ background: c }} />
          ))}
          <span>More</span>
          <span className="heatmap-legend-block" style={{ background: PENDING_COLOR, marginLeft: 8 }} />
          <span>Pending</span>
        </div>
      </div>
    </div>
  );
};

export default EarningsHeatmap; 