import React, { useMemo, useState } from 'react';
import './EarningsHeatmap.css';

// Helper to get all days in a given year (or past year if not specified)
function getYearDays(year) {
  const days = [];
  const today = new Date();
  let start, end;
  if (year === today.getFullYear()) {
    // From the first day of the same month last year to today
    start = new Date(today);
    start.setFullYear(today.getFullYear() - 1);
    start.setDate(1); // move to 1st of that month so full month is included
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
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Sizing constants
const LABEL_COL_WIDTH = 28; // px for the weekday label column
const CELL_SIZE = 10;        // px for each day square (width & height)
const SPACER_COL_WIDTH = 6; // px spacer column between months

// Helper: get week index (0-5) of date within its month (Sunday-start)
function getWeekOfMonth(date) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfWeek = firstOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
  return Math.floor((date.getDate() + dayOfWeek - 1) / 7);
}

const BLOCK_SIZE = CELL_SIZE;
const BLOCK_GAP = 1;

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

  // Calculate statistics
  const stats = useMemo(() => {
    const activeDays = days.filter(date => {
      const dateStr = formatDate(date);
      const { amount = 0 } = earningsMap[dateStr] || {};
      return amount > 0;
    }).length;
    
    const totalDays = days.length;
    
    // Calculate streaks
    const { maxStreak, currentStreak } = calculateStreaks(days, earningsMap);
    
    return {
      totalGigs: Object.values(earningsMap).reduce((sum, { amount = 0 }) => sum + (amount > 0 ? 1 : 0), 0),
      activeDays,
      totalDays,
      maxStreak,
      currentStreak
    };
  }, [days, earningsMap]);

  // Helper function to calculate max streak and current streak
  function calculateStreaks(days, earningsMap) {
    if (days.length === 0) return { maxStreak: 0, currentStreak: 0 };
    
    // Sort days chronologically to ensure proper order
    const sortedDays = [...days].sort((a, b) => a.getTime() - b.getTime());
    
    let maxStreak = 0;
    let currentStreakCount = 0;
    let tempStreak = 0;
    
    // Check each day for activity
    for (let i = 0; i < sortedDays.length; i++) {
      const dateStr = formatDate(sortedDays[i]);
      const { amount = 0 } = earningsMap[dateStr] || {};
      const hasActivity = amount > 0;
      
      if (hasActivity) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 0; // Reset streak when no activity
      }
    }
    
    // Calculate current streak (from today backwards)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    
    // Find today's position in our sorted days array
    let todayIndex = -1;
    for (let i = sortedDays.length - 1; i >= 0; i--) {
      const dayTime = new Date(sortedDays[i]);
      dayTime.setHours(0, 0, 0, 0);
      if (dayTime.getTime() <= today.getTime()) {
        todayIndex = i;
        break;
      }
    }
    
    // Calculate current streak starting from today (or most recent day) backwards
    if (todayIndex >= 0) {
      for (let i = todayIndex; i >= 0; i--) {
        const dateStr = formatDate(sortedDays[i]);
        const { amount = 0 } = earningsMap[dateStr] || {};
        const hasActivity = amount > 0;
        
        if (hasActivity) {
          currentStreakCount++;
        } else {
          break; // Stop at first day without activity
        }
      }
    }
    
    return { maxStreak, currentStreak: currentStreakCount };
  }

  // Find max amount for scaling
  const max = 400;
  const thresholds = [
    max * 0.25,
    max * 0.5,
    max * 0.75
  ];

  // Replace monthLabels & monthGapWeeks definitions with new monthKeys
  const monthKeys = useMemo(() => {
    const keys = new Set();
    days.forEach(d => {
      // key in format YYYY-MM
      keys.add(`${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`);
    });
    return Array.from(keys).sort((a,b)=> new Date(a+'-01') - new Date(b+'-01'));
  }, [days]);

  const monthIndexMap = useMemo(() => {
    const map = {};
    monthKeys.forEach((k,i)=>{ map[k]=i; });
    return map;
  }, [monthKeys]);

  // Build month meta with dynamic weeksCount
  const monthMeta = useMemo(() => {
    // Build lookup of week indices per month
    const monthWeekMap = {};
    days.forEach(d => {
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
      const w = getWeekOfMonth(d);
      if (!monthWeekMap[key]) monthWeekMap[key] = new Set();
      monthWeekMap[key].add(w);
    });

    const result = [];
    let colCursor = 2; // first usable grid column (after weekday labels)

    monthKeys.forEach((k, i) => {
      const weeksSet = monthWeekMap[k] || new Set();
      let weeksCount = 6; // default full
      if (i === monthKeys.length - 1) {
        // last month - compute up to active week
        const maxWeek = Math.max(...Array.from(weeksSet));
        weeksCount = Math.min(maxWeek + 1, 6);
      }

      const [yearStr, monStr] = k.split('-');
      const monthNum = Number(monStr);
      const labelText = new Date(Number(yearStr), monthNum).toLocaleString('default', { month: 'short' });
      const show = weeksSet.has(4);

      result.push({ key: k, index: i, label: labelText, show, colStart: colCursor, weeksCount });

      // advance cursor: weeks + spacer (except after last)
      colCursor += weeksCount + 1; // +1 for spacer
    });

    return result;
  }, [monthKeys, days]);

  // Build gridTemplateColumns using monthMeta
  const gridTemplateColumns = useMemo(() => {
    const cols = [`${LABEL_COL_WIDTH}px`];
    monthMeta.forEach((m, idx) => {
      if (idx > 0) cols.push(`${SPACER_COL_WIDTH}px`);
      for (let j = 0; j < m.weeksCount; j++) cols.push(`${CELL_SIZE}px`);
    });
    return cols.join(' ');
  }, [monthMeta]);

  // Create grid structure: organize days into weeks starting from Sunday
  const weeks = useMemo(() => {
    if (days.length === 0) return [];
    
    const firstDay = days[0];
    const startOfWeek = new Date(firstDay);
    startOfWeek.setDate(firstDay.getDate() - firstDay.getDay()); // Go back to Sunday
    
    const weeks = [];
    let currentWeek = [];
    
    // Fill the first partial week if needed
    for (let i = 0; i < firstDay.getDay(); i++) {
      currentWeek.push(null);
    }
    
    days.forEach(day => {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });
    
    // Fill the last partial week if needed
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
    
    return weeks;
  }, [days]);

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
      onSelectDate && onSelectDate(date);
    } else if (selectedDate && !selectedRange) {
      if (date.toDateString() === selectedDate.toDateString()) {
        onSelectDate && onSelectDate(null);
      } else {
        const start = selectedDate < date ? selectedDate : date;
        const end = selectedDate > date ? selectedDate : date;
        onSelectRange && onSelectRange([start, end]);
      }
    } else if (selectedRange && selectedRange[0] && selectedRange[1]) {
      onSelectDate && onSelectDate(date);
      onSelectRange && onSelectRange(null);
    }
  };

  // Generate year options (last 5 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <div className="heatmap-stats">
          <span className="heatmap-stat-number">{stats.totalGigs}</span>
          <span className="heatmap-stat-text">gigs in the past one year</span>
        </div>
        <div className="heatmap-additional-stats">
          <span className="heatmap-stat-item">Total active days: <strong>{stats.activeDays}</strong></span>
          <span className="heatmap-stat-item">Max streak: <strong>{stats.maxStreak}</strong></span>
          <span className="heatmap-stat-item">Current streak: <strong>{stats.currentStreak}</strong></span>
        </div>
      </div>
      
      <div className="heatmap-grid-container" style={{ gridTemplateColumns: gridTemplateColumns, paddingLeft: '8px' }}>
        {/* Month labels */}
        <div className="heatmap-months">
          {monthMeta.filter(m => m.show).map(({ label, colStart, weeksCount, index }) => {
            const baseCol = colStart; // dynamic start
            return (
              <div
                key={index}
                className="heatmap-month-label"
                style={{ gridColumn: `${baseCol} / span ${weeksCount}`, gridRow: '1' }}
              >
                {label}
              </div>
            );
          })}
        </div>
        
        {/* Day labels */}
        <div className="heatmap-days">
          {['Mon', 'Wed', 'Fri'].map((day, index) => (
            <div
              key={day}
              className="heatmap-day-label"
              style={{
                gridColumn: '1',
                gridRow: `${[3, 5, 7][index]}`
              }}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Heatmap grid */}
        <div className="heatmap-grid">
          {days.map((day) => {
            const monthKey = `${day.getFullYear()}-${String(day.getMonth()).padStart(2,'0')}`;
            const meta = monthMeta[ monthIndexMap[monthKey] ];
            const weekOfMonth = getWeekOfMonth(day);
            const gridColumn = meta.colStart + weekOfMonth;
            const gridRow = day.getDay() + 2;

            const dateStr = formatDate(day);
            const { amount = 0, status = undefined } = earningsMap[dateStr] || {};
            const color = getColor(amount, thresholds, status);
            const selected = isSelected(day);

            return (
              <div
                key={dateStr}
                title={`${dateStr}: $${amount.toFixed(2)}${status ? ' (' + status + ')' : ''}`}
                onClick={() => handleDayClick(day)}
                className={`heatmap-block${selected ? ' selected' : ''}`}
                style={{ backgroundColor: color, gridColumn, gridRow }}
              />
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="heatmap-legend" style={{ marginTop: '8px', paddingLeft: '36px' }}>
        <span>Less</span>
        {COLORS.map((c, i) => (
          <span key={i} className="heatmap-legend-block" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
        <span className="heatmap-legend-block" style={{ backgroundColor: PENDING_COLOR, marginLeft: 8 }} />
        <span>Pending</span>
      </div>
    </div>
  );
};

export default EarningsHeatmap; 