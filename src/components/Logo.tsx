// Visit Rwanda logo — used in the header and on the Me page.
//
// To swap back to the built-in SVG flag, set USE_CUSTOM_LOGO to false.
// To use your own image, drop it at:  public/logo.png
//
const USE_CUSTOM_LOGO = true;

export default function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  if (USE_CUSTOM_LOGO) {
    return (
      <div
        className={`relative rounded-2xl overflow-hidden flex-shrink-0 shadow-sm bg-navy/5 ${className}`}
        style={{ width: size, height: size }}
      >
        <img src="/logo.png" alt="Visit Rwanda" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-2xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="60" height="34" fill="#00A1DE" />
        <rect y="34" width="60" height="13" fill="#FAD201" />
        <rect y="47" width="60" height="13" fill="#20603D" />
        <g transform="translate(45, 15)">
          <circle r="3" fill="#E5BE01" />
          <g stroke="#E5BE01" strokeWidth="0.6" strokeLinecap="round">
            <line x1="-4.8" y1="0"     x2="-6.5" y2="0" />
            <line x1="4.8"  y1="0"     x2="6.5"  y2="0" />
            <line x1="0"    y1="-4.8"  x2="0"    y2="-6.5" />
            <line x1="0"    y1="4.8"   x2="0"    y2="6.5" />
            <line x1="-3.4" y1="-3.4"  x2="-4.6" y2="-4.6" />
            <line x1="3.4"  y1="-3.4"  x2="4.6"  y2="-4.6" />
            <line x1="-3.4" y1="3.4"   x2="-4.6" y2="4.6" />
            <line x1="3.4"  y1="3.4"   x2="4.6"  y2="4.6" />
          </g>
        </g>
      </svg>
    </div>
  );
}