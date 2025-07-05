import React from 'react';
import { ReactComponent as HomeIcon } from './assets/icons/HomeIcon.svg';
import { ReactComponent as CRMIcon } from './assets/icons/CRMIcon.svg';
import { ReactComponent as DataIcon } from './assets/icons/DataIcon.svg';
import { ReactComponent as LogisticsIcon } from './assets/icons/LogisticsIcon.svg';
import { ReactComponent as MarketingIcon } from './assets/icons/MarketingIcon.svg';
import { ReactComponent as CommerceIcon } from './assets/icons/CommerceIcon.svg';
import { ReactComponent as SettingsIcon } from './assets/icons/SettingsIcon.svg';

interface IconItem {
  id: string;
  Component: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  submenu?: SubmenuItem[];
}

interface SubmenuItem {
  id: string;
  label: string;
  onClick?: () => void;
}

interface SideMenuProps {
  activeIcon: string;
  activeSubmenu?: string;
  onSelect: (id: string, submenuId?: string) => void;
}

const ICON_SIZE = 40;
const OFFSET_X = 20;
const BULGE = 80;
const DOT_SIZE = 5;
const PADDING = 30;

const icons: IconItem[] = [
    { id: 'home', Component: HomeIcon, label: 'Home' },
    { 
      id: 'crm', 
      Component: CRMIcon, 
      label: 'CRM',
      submenu: [
        { id: 'contacts', label: 'Contacts' },
        { id: 'inbox', label: 'Inbox' },
        { id: 'schedule', label: 'Schedule' },
        { id: 'tickets', label: 'Tickets' }
      ]
    },
    { id: 'marketing', Component: MarketingIcon, label: 'Marketing' },
    { id: 'logistics', Component: LogisticsIcon, label: 'Logistics' },
    { id: 'commerce', Component: CommerceIcon, label: 'Commerce' },
    { id: 'data', Component: DataIcon, label: 'Data' },
    { id: 'settings', Component: SettingsIcon, label: 'Settings' },
];

export const SideMenu: React.FC<SideMenuProps> = ({ activeIcon, activeSubmenu, onSelect }) => {
    const [windowHeight, setWindowHeight] = React.useState(window.innerHeight);
    const [hoveredIcon, setHoveredIcon] = React.useState<string | null>(null);
    const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        const onResize = () => setWindowHeight(window.innerHeight);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Clear timeout on unmount
    React.useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    const handleMouseEnter = (id: string) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        setHoveredIcon(id);
    };

    const handleMouseLeave = (id: string) => {
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredIcon((current) => current === id ? null : current);
        }, 150); // 150ms delay to allow moving to dropdown
    };

    const GAP = 53; // consistent gap everywhere

    const activeIndex = icons.findIndex(i => i.id === activeIcon);
    const getIndexMultiplier = (index: number) => {
        console.log(index);
      if (index === 1) return 2;
      if (index === 2) return 2;
      if (index === 3) return 1.3;
      if (index === 4) return 0.9;
      if (index === 5) return 0.7;
      return 1.4;
    };

    const centerY =
        PADDING + 100 + 
        activeIndex * (ICON_SIZE + GAP + activeIndex * getIndexMultiplier(activeIndex)) +
        ICON_SIZE / 2;
    
    const spineX = 30 + ICON_SIZE + OFFSET_X;
    
    const bulgeYSpan = ICON_SIZE * 2; // adjust 1.1-1.4 for tightness
    const bulgeStartY = centerY - bulgeYSpan / 1.6;
    const bulgeEndY   = centerY + bulgeYSpan / 1.6;
    const bulgeX      = -BULGE; // bulge direction
    
    // Modified curve with header extension
    const headerHeight = 45; // Height where the header sits
    const headerCurveRadius = 20; // Radius of the curve to horizontal
    
    const pathD = [
      `M 0,${headerHeight + headerCurveRadius}`,
      `C 0,${headerHeight + headerCurveRadius * 0.4} ${headerCurveRadius * 0.4},${headerHeight} ${headerCurveRadius},${headerHeight}`,
      `L ${window.innerWidth},${headerHeight}`, // Horizontal line across the screen
      `M 0,${headerHeight + headerCurveRadius}`, // Move back to start vertical line
      `L 0,${bulgeStartY}`,
      `C 0,${bulgeStartY + bulgeYSpan * 0.3} ${bulgeX * 1},${bulgeStartY + bulgeYSpan * 0.15} ${bulgeX},${centerY}`,
      `C ${bulgeX * 1},${bulgeEndY - bulgeYSpan * 0.15} 0,${bulgeEndY - bulgeYSpan * 0.3} 0,${bulgeEndY}`,
      `L 0,${windowHeight}`
    ].join(' ');

    const svgWidth = 1;          // Increase width to avoid rendering issues

    // Header horizontal section
    const headerFillD = [
      `M 0,0`,                                         // Start at top-left corner
      `L ${window.innerWidth},0`,                      // Across to right edge at top
      `L ${window.innerWidth},${headerHeight}`,        // Down to header height
      `L ${headerCurveRadius},${headerHeight}`,        // Back to curve start
      `C ${headerCurveRadius * 0.4},${headerHeight} 0,${headerHeight + headerCurveRadius * 0.4} 0,${headerHeight + headerCurveRadius}`, // Curve back
      `L 0,0`,                                         // Back to top-left
      `Z`                                              // Close path
    ].join(' ');

    // Divot/bulge area
    const divotFillD = [
      `M 0,${headerHeight + headerCurveRadius}`,       // Start after header curve
      `L 0,${bulgeStartY}`,                            // Down to bulge start
      `C 0,${bulgeStartY + bulgeYSpan * 0.3} ${bulgeX * 1},${bulgeStartY + bulgeYSpan * 0.15} ${bulgeX},${centerY}`, // Bulge curve out
      `C ${bulgeX * 1},${bulgeEndY - bulgeYSpan * 0.15} 0,${bulgeEndY - bulgeYSpan * 0.3} 0,${bulgeEndY}`, // Bulge curve back
      `L 0,${windowHeight}`,                           // Down to bottom
      `L ${svgWidth},${windowHeight}`,                 // Across to right edge
      `L ${svgWidth},${headerHeight + headerCurveRadius}`, // Up to after header curve
      `L 0,${headerHeight + headerCurveRadius}`,       // Back to start
      `Z`                                              // Close path
    ].join(' ');

  return (
    <div style={{ backgroundColor: '#FBF7F7', height: '100vh', zIndex: 9999, position: 'relative', marginRight: 48 }}>
    <div style={{ zIndex: 1, position: 'absolute', top: 0, left: spineX }}>
        <svg
            width={svgWidth}
            height={windowHeight}
            style={{
                overflow: 'visible',
                zIndex: 1,
                display: 'block'
            }}
        >
            {/* HEADER SECTION – match main container background */}
            <path
                d={headerFillD}
                fill="#FBF7F7" // Match the main container background color
                style={{ transition: 'd 0.3s cubic-bezier(0.4,0,0.2,1)' }}
            />

            {/* DIVOT/BULGE AREA – keep original color */}
            <path
                d={divotFillD}
                fill="#FFFBFA" // Keep original color for the exterior divot area
                style={{ transition: 'd 0.3s cubic-bezier(0.4,0,0.2,1)' }}
            />

            {/* OUTLINE – your original grey spine */}
            <path
                d={pathD}
                stroke="#D9D9D9"
                strokeWidth={1.5}
                fill="none"
                style={{ transition: 'd 0.3s cubic-bezier(0.4,0,0.2,1)' }}
            />
        </svg>
    </div>

      {/* icons column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 34,
          marginLeft: 15,
          zIndex: 1,
          paddingTop: PADDING * 4.3,
          maxHeight: windowHeight - PADDING * 2,
          overflow: 'visible', // Changed from 'hidden' to 'visible' to allow dropdown to show
          flexShrink: 0,
          position: 'relative'
        }}
      >
        {icons.map(({ id, Component, label, submenu }, index) => {
          const isActive = id === activeIcon;
          const isHovered = id === hoveredIcon;
          const borderColor = isActive ? '#DE1785' : '#D9D9D9';
          const iconColor = isActive ? '#DE1785' : '#8C8C8C';
          const labelColor = isActive ? '#DE1785' : '#595959';

          return (
            <div
              key={id}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                cursor: 'pointer', 
                position: 'relative',
                zIndex: isHovered && submenu ? 1000 : 1
              }}
              onMouseEnter={() => handleMouseEnter(id)}
              onMouseLeave={() => handleMouseLeave(id)}
            >
              <div
                onClick={() => onSelect(id)}
                style={{
                  width: ICON_SIZE,
                  height: ICON_SIZE,
                  borderRadius: '50%',
                  background: '#FFFBFA',
                  border: `1px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                  boxShadow: isActive
                    ? '0 4px 16px 0 rgba(189, 189, 189, 0.2), 0 1.5px 5px 0 rgba(0,0,0,0.11)'
                    : 'none',
                  position: 'relative',
                  zIndex: isActive ? 2 : 1,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: DOT_SIZE,
                    height: DOT_SIZE,
                    borderRadius: '50%',
                    backgroundColor: borderColor,
                    transition: 'all 0.3s',
                    top: isActive ? '46%' : (DOT_SIZE),
                    left: isActive ? ICON_SIZE - 11 : '50%',
                    transform: isActive ? 'translateY(-50%)' : 'translateX(-50%)'
                  }}
                />
                <Component style={{ width: ICON_SIZE * 0.4, height: ICON_SIZE * 0.4, color: iconColor, transition: 'color 0.3s' }} />
              </div>
              <span style={{
                marginTop: 8,
                fontSize: 12,
                color: labelColor,
                transition: 'color 0.3s',
                fontWeight: isActive ? 500 : 400,
                visibility: isActive ? 'hidden' : 'visible'
              }}>
                {label}
              </span>

              {/* Dropdown Menu */}
              {submenu && isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    left: ICON_SIZE + 25,
                    top: '0',
                    background: '#FFFFFF',
                    border: '1px solid #E5E5E5',
                    borderRadius: 8,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                    padding: '8px 0',
                    minWidth: 180,
                    zIndex: 9999,
                    display: 'block',
                  }}
                  onMouseEnter={() => handleMouseEnter(id)}
                  onMouseLeave={() => handleMouseLeave(id)}
                >
                  {/* Dropdown Header */}
                  <div
                    style={{
                      padding: '12px 16px 8px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#262626',
                      borderBottom: '1px solid #F0F0F0',
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </div>
                  
                  {/* Dropdown Items */}
                  {submenu.map((item) => {
                    const isActiveSubmenu = activeSubmenu === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.onClick) {
                            item.onClick();
                          } else {
                            // Pass both the parent icon id and submenu id
                            console.log(`Clicked ${item.label}`);
                            onSelect(id, item.id);
                          }
                        }}
                        style={{
                          padding: '10px 16px',
                          fontSize: 14,
                          color: isActiveSubmenu ? '#DE1785' : '#595959',
                          backgroundColor: isActiveSubmenu ? '#FFF0F7' : 'transparent',
                          fontWeight: isActiveSubmenu ? 500 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          borderLeft: isActiveSubmenu ? '3px solid #DE1785' : '3px solid transparent',
                          marginLeft: isActiveSubmenu ? '-3px' : '-3px',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActiveSubmenu) {
                            e.currentTarget.style.backgroundColor = '#F5F5F5';
                            e.currentTarget.style.color = '#262626';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActiveSubmenu) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#595959';
                          }
                        }}
                      >
                        {item.label}
                      </div>
                    );
                  })}
                  
                  {/* Arrow pointing to icon */}
                  <div
                    style={{
                      position: 'absolute',
                      left: -8,
                      top: '20px',
                      width: 0,
                      height: 0,
                      borderStyle: 'solid',
                      borderWidth: '8px 8px 8px 0',
                      borderColor: 'transparent #FFFFFF transparent transparent',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: -9,
                      top: '20px',
                      width: 0,
                      height: 0,
                      borderStyle: 'solid',
                      borderWidth: '8px 8px 8px 0',
                      borderColor: 'transparent #E5E5E5 transparent transparent',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};