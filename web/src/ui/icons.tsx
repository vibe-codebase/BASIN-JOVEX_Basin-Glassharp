type P = { size?: number };
const s = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const Pause = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 6.5v11M15 6.5v11" /></svg>;
export const Back = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>;
export const Next = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>;
export const Restart = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4 4.5v3.5h3.5" /></svg>;
export const Undo = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 7 4.5 11.5 9 16" /><path d="M5 11.5h9a5 5 0 0 1 0 10h-2" /></svg>;
export const Lamp = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg>;
export const Gear = ({ size }: P) => (
  <svg {...s(size)} aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></svg>
);
/** A note on a stave. */
export const Note = ({ size }: P) => <svg {...s(size)} aria-hidden><ellipse cx="8.5" cy="17.5" rx="3.2" ry="2.4" transform="rotate(-20 8.5 17.5)" /><path d="M11.5 16.5V4.5l7 2.5" /></svg>;
/** A pour: a tipping glass and its stream. */
export const Pour = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M5 4.5l8 3-2.6 6.4a3.5 3.5 0 0 1-6.4-2.6z" /><path d="M13 7.5c2.5 1.5 4 5 4 11" opacity=".75" /><path d="M14.5 20h5" /></svg>;
/** Stars are wine glasses, filled with gold when earned. */
export const Glass = ({ size = 22, on = true }: P & { on?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    {on && <path d="M7.4 9.2h9.2a4.7 4.7 0 0 1-9.2 0z" fill="url(#gh-w)" />}
    <defs><linearGradient id="gh-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2c4" /><stop offset="1" stopColor="#e0a84a" /></linearGradient></defs>
    <path d="M6.6 3.5h10.8c.3 3.2.1 5.6-.8 7.4a4.8 4.8 0 0 1-9.2 0c-.9-1.8-1.1-4.2-.8-7.4z M12 15.8v4.4 M8.5 20.5h7" fill="none" stroke={on ? '#ffe7a6' : 'rgba(246,234,216,.5)'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
