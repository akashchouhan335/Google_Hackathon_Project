import React from 'react';

/**
 * Line / Area Chart for Trends
 */
export function TrendChart({ data = [], height = 180, color = '#2563eb', gradientId = 'blue-grad' }) {
  if (!data || data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No trend data</div>;
  }

  const values = data.map(d => d.value);
  const maxVal = Math.max(...values, 4); // Min ceiling of 4 to keep scale looking nice
  const minVal = 0;
  const range = maxVal - minVal;

  const width = 500;
  const chartHeight = height - 40;
  const paddingX = 40;
  const paddingY = 20;

  // Compute points
  const points = data.map((d, index) => {
    const x = paddingX + (index * (width - 2 * paddingX) / (data.length - 1));
    const ratio = range > 0 ? (d.value - minVal) / range : 0.5;
    const y = chartHeight - paddingY - (ratio * (chartHeight - 2 * paddingY));
    return { x, y, label: d.label, value: d.value };
  });

  // Create path strings
  let linePath = '';
  let areaPath = '';

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    
    // For area, connect back to bottom corners
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const bottomY = chartHeight - paddingY;
    areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  return (
    <div className="chart-container" style={{ height }}>
      <svg viewBox={`0 0 ${width} ${chartHeight}`} className="svg-chart" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines (horizontal) */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = paddingY + ratio * (chartHeight - 2 * paddingY);
          return (
            <line
              key={idx}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              className="chart-grid-line"
            />
          );
        })}

        {/* Y Axis Max/Min text */}
        <text x={paddingX - 10} y={paddingY + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)" fontWeight="600">
          {Math.round(maxVal)}
        </text>
        <text x={paddingX - 10} y={chartHeight - paddingY + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)" fontWeight="600">
          0
        </text>

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

        {/* Stroke Line */}
        {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />}

        {/* Data points & labels */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill={color}
              stroke="var(--bg-secondary)"
              strokeWidth="2"
            />
            {/* Value tooltip label on hover */}
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--text-primary)" className="chart-val-lbl" style={{ opacity: 0.8 }}>
              {p.value}
            </text>
            {/* X-axis labels */}
            <text x={p.x} y={chartHeight - paddingY + 18} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-muted)">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * Circular Metric Gauge
 */
export function CircleGauge({ score = 0, title = '', subtitle = '', color = 'var(--primary-blue)' }) {
  const radius = 42;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.25rem', textAlign: 'center' }}>
      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.75rem' }}>{title}</h4>
      
      <div className="gauge-chart-container" style={{ height: '110px' }}>
        <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="55"
            cy="55"
            r={radius}
            fill="transparent"
            stroke="var(--bg-tertiary)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="55"
            cy="55"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', lineHeight: '1' }}>
            {score}%
          </span>
        </div>
      </div>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 500 }}>{subtitle}</span>
    </div>
  );
}

/**
 * Segmented horizontal progress bar for distributions
 */
export function DistributionBar({ distribution = { low: 0, medium: 0, high: 0 } }) {
  const { low = 0, medium = 0, high = 0 } = distribution;
  const total = low + medium + high;

  const lowPercent = total > 0 ? (low / total) * 100 : 0;
  const mediumPercent = total > 0 ? (medium / total) * 100 : 0;
  const highPercent = total > 0 ? (high / total) * 100 : 0;

  return (
    <div className="glass-card">
      <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '1rem' }}>
        Deadline Risk Distribution
      </h4>

      {total === 0 ? (
        <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No active tasks to analyze
        </div>
      ) : (
        <div>
          {/* Segmented bar */}
          <div style={{ height: '14px', borderRadius: '7px', display: 'flex', overflow: 'hidden', backgroundColor: 'var(--bg-tertiary)', marginBottom: '1.25rem' }}>
            {low > 0 && <div style={{ width: `${lowPercent}%`, backgroundColor: 'var(--success)', transition: 'width 0.4s' }} title={`Low Risk: ${low} tasks`} />}
            {medium > 0 && <div style={{ width: `${mediumPercent}%`, backgroundColor: 'var(--warning)', transition: 'width 0.4s' }} title={`Medium Risk: ${medium} tasks`} />}
            {high > 0 && <div style={{ width: `${highPercent}%`, backgroundColor: 'var(--danger)', transition: 'width 0.4s' }} title={`High Risk: ${high} tasks`} />}
          </div>

          {/* Legend */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>Low ({low})</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--warning)', display: 'inline-block' }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>Medium ({medium})</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--danger)', display: 'inline-block' }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>High ({high})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
