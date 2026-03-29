import React from 'react';
import './Logo.css';

interface LogoProps {
  variant?: 'full' | 'compact' | 'mini' | 'text-only';
  size?: 'small' | 'medium' | 'large';
  theme?: 'primary' | 'light' | 'dark';
  className?: string;
  showPLN?: boolean;
  onClick?: () => void;
}

const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'medium',
  theme = 'primary',
  className = '',
  showPLN = true,
  onClick
}) => {
  const getLogoClasses = () => {
    return [
      'logo-container',
      `logo-${variant}`,
      `logo-${size}`,
      `logo-${theme}`,
      className
    ].filter(Boolean).join(' ');
  };

  const renderFullLogo = () => (
    <div className="logo-content">
      <div className="logo-images">
        <img 
          src="/src/assets/logo first.jpg" 
          alt="FIRST Logo" 
          className="logo-first-img"
          onError={(e) => {
            // Fallback if image fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
        {showPLN && (
          <img 
            src="/src/assets/Logo_PLN.svg.png" 
            alt="PLN Logo" 
            className="logo-pln-img"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>
      <span className="logo-text">FIRST</span>
    </div>
  );

  const renderCompactLogo = () => (
    <div className="logo-content">
      <div className="logo-images">
        <img 
          src="/src/assets/logo first.jpg" 
          alt="FIRST Logo" 
          className="logo-first-img"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {showPLN && (
          <img 
            src="/src/assets/Logo_PLN.svg.png" 
            alt="PLN Logo" 
            className="logo-pln-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>
      <span className="logo-text">FIRST</span>
    </div>
  );

  const renderMiniLogo = () => (
    <div className="logo-content">
      <img 
        src="/src/assets/logo first.jpg" 
        alt="FIRST Logo" 
        className="logo-first-img"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );

  const renderTextOnly = () => (
    <div className="logo-content">
      <span className="logo-text">FIRST</span>
    </div>
  );

  const renderLogo = () => {
    switch (variant) {
      case 'full':
        return renderFullLogo();
      case 'compact':
        return renderCompactLogo();
      case 'mini':
        return renderMiniLogo();
      case 'text-only':
        return renderTextOnly();
      default:
        return renderFullLogo();
    }
  };

  return (
    <div 
      className={getLogoClasses()}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {renderLogo()}
    </div>
  );
};

export default Logo;
