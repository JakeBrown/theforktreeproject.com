import { useState, useEffect } from 'react';

interface NavItem {
  label: string;
  href: string;
}

interface MobileNavProps {
  navItems: NavItem[];
  currentPath: string;
}

export default function MobileNav({ navItems, currentPath }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <button
        className="mobile-nav__toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
      >
        <span className={`mobile-nav__hamburger ${isOpen ? 'open' : ''}`}>
          <span />
          <span />
          <span />
        </span>
      </button>

      <div className={`mobile-nav__overlay ${isOpen ? 'open' : ''}`}>
        <nav className="mobile-nav__menu" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`mobile-nav__link ${currentPath === item.href ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="mobile-nav__footer">
          <a
            href="https://www.instagram.com/forktreeproject/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on Instagram"
            className="mobile-nav__social"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <img
            src="/images/logo.png"
            alt="The Forktree Project"
            className="mobile-nav__logo"
            width="40"
            height="62"
          />
        </div>
      </div>

      <style>{`
        .mobile-nav__toggle {
          display: none;
          z-index: 200;
          position: relative;
          width: 30px;
          height: 30px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        @media (max-width: 1024px) {
          .mobile-nav__toggle {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }

        .mobile-nav__hamburger {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 24px;
          height: 16px;
        }

        .mobile-nav__hamburger span {
          display: block;
          width: 100%;
          height: 2px;
          background-color: #1a1a1a;
          transition: all 0.3s ease;
          transform-origin: center;
        }

        .mobile-nav__hamburger.open span:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }

        .mobile-nav__hamburger.open span:nth-child(2) {
          opacity: 0;
        }

        .mobile-nav__hamburger.open span:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }

        .mobile-nav__overlay {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 400px;
          background-color: #ffffff;
          z-index: 150;
          transform: translateX(100%);
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
          padding: 100px 2rem 2rem;
        }

        .mobile-nav__overlay.open {
          transform: translateX(0);
        }

        .mobile-nav__menu {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }

        .mobile-nav__link {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #1a1a1a;
          text-decoration: none;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          transition: opacity 0.15s ease;
        }

        .mobile-nav__link:hover,
        .mobile-nav__link.active {
          opacity: 0.6;
        }

        .mobile-nav__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 2rem;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
        }

        .mobile-nav__social {
          color: #1a1a1a;
          display: flex;
          align-items: center;
        }

        .mobile-nav__logo {
          height: 40px;
          width: auto;
        }
      `}</style>
    </>
  );
}
