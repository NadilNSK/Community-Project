import React from 'react';

export function GateAsset({ name, ...props }) {
  const dimensions = { 'success-badge': 124, 'rejected-badge': 124, back: 22, search: 22, scan: 30, 'wifi-off': 20, 'route-vehicle': 16 };
  const size = dimensions[name] || (name.endsWith('-dot') ? 8 : 24);
  return <img src={`/gate-assets/${name}.svg`} alt="" width={size} height={size} draggable="false" {...props} />;
}

export function GateFrame({ children, preview, time = '09:41', offline = false, className = '' }) {
  return <div className={`gate-frame ${preview ? 'gate-preview' : ''} ${className}`}>
    {preview ? <div className="gate-status-bar" aria-hidden="true"><span>{time}</span><span>{offline ? '✕ ▮' : '●●● ▮'}</span></div> : <div className="gate-safe-top" />}
    <div className="gate-screen">{children}</div>
    {preview && <div className="gate-home-indicator" aria-hidden="true" />}
  </div>;
}

export function GateButton({ children, variant = 'primary', href, className = '', ...props }) {
  const Tag = href ? 'a' : 'button';
  return <Tag {...(href ? { href } : { type: 'button' })} className={`gate-button gate-button-${variant} ${className}`} {...props}>{children}</Tag>;
}

export function GateActions({ children, roomy = false }) {
  return <footer className={`gate-actions ${roomy ? 'gate-actions-roomy' : ''}`}>{children}</footer>;
}

export function StatusChip({ children, tone = 'info', dot = false }) {
  return <span className={`gate-chip gate-tone-${tone}`}>
    {dot && <GateAsset name={`${tone}-dot`} />}{children}
  </span>;
}

export function DetailsCard({ rows, danger = false }) {
  return <dl className={`gate-details ${danger ? 'gate-details-danger' : ''}`}>
    {rows.map(([label, value]) => <div className="gate-detail-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl>;
}

export function ResultHeading({ title, children, danger = false }) {
  return <div className={`gate-result ${danger ? 'gate-result-danger' : ''}`}>
    <div className="gate-result-badge"><GateAsset name={danger ? 'rejected-badge' : 'success-badge'} /></div>
    <h1>{title}</h1><p>{children}</p>
  </div>;
}

export function GateNotice({ children, tone = 'info', ...props }) {
  return <p className={`gate-notice gate-tone-${tone}`} {...props}>{children}</p>;
}

export function GateHeader({ title, subtitle, onBack, children, className = '' }) {
  return <header className={`gate-header ${className}`}>
    {onBack && <button type="button" className="gate-icon-button" onClick={onBack} aria-label="Back to Gate Home"><GateAsset name="back" /></button>}
    <div className="min-w-0 flex-1"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{children}
  </header>;
}

export function CompactRow({ title, description, status, tone, dot = false, muted = false, queue = false }) {
  return <li className={`gate-compact-row ${muted ? 'gate-row-muted' : ''} ${queue ? 'gate-queue-row' : ''}`}>
    <div className="gate-row-text"><h2 className="gate-mono">{title}</h2><p>{description}</p></div>
    <StatusChip tone={tone} dot={dot}>{status}</StatusChip>
  </li>;
}

export function GateBottomNav({ active, onNavigate }) {
  const items = [['home', 'Home'], ['shipments', 'Shipments'], ['scan', 'Scan gate pass'], ['alerts', 'Alerts'], ['profile', 'Profile']];
  return <nav className="gate-bottom-nav" aria-label="Gate navigation">
    {items.map(([id, label]) => <button type="button" key={id} aria-label={label} aria-current={active === id ? 'page' : undefined}
      className={`gate-nav-item ${active === id ? 'gate-nav-active' : ''} ${id === 'scan' ? 'gate-nav-scan' : ''}`} onClick={() => onNavigate(id)}>
      <GateAsset name={id === 'scan' ? 'scan' : id} />{id !== 'scan' && <span>{label}</span>}
    </button>)}
  </nav>;
}
