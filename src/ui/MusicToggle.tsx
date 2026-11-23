// The speaker button on the menus: menu music on or off (saved). In the corner on the title
// screen, `inline` in the header bar beside Settings on the region map and city menu.
import { useUI } from './store';

export function MusicToggle({ inline = false }: { inline?: boolean }) {
  const muted = useUI((s) => s.musicMuted);
  const setMuted = useUI((s) => s.setMusicMuted);
  const label = muted ? 'Music off — turn on' : 'Music on — turn off';
  return (
    <button className={`${inline ? 'sg-btn music-inline' : 'music-toggle'}${muted ? ' off' : ''}`} title={label} aria-label={label} aria-pressed={!muted} onClick={() => setMuted(!muted)}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {muted ? (
          <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        )}
      </svg>
      <span>音楽</span>
    </button>
  );
}
