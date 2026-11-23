// Importing the app builds every station at once, which blocks the page for a while.
// Let the splash in index.html paint first, then load it.
requestAnimationFrame(() => setTimeout(() => void import('./boot')));
