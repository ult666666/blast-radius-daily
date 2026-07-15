import { context, requestExpandedMode } from '@devvit/web/client';

const startButton = document.getElementById('start-button');
const greeting = document.getElementById('greeting');
const episode = document.getElementById('episode');

if (!(startButton instanceof HTMLButtonElement)) {
  throw new Error('Start button is missing');
}

const firstDay = Date.UTC(2026, 5, 17);
const today = new Date();
const requestedDay = new URLSearchParams(window.location.search).get('day');
const utcToday = requestedDay?.match(/^\d{4}-\d{2}-\d{2}$/)
  ? Date.parse(`${requestedDay}T00:00:00.000Z`)
  : Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
const episodeNumber = Math.max(1, Math.floor((utcToday - firstDay) / 86_400_000) + 1);

if (episode) {
  episode.textContent = `#${episodeNumber}`;
}
if (greeting) {
  const username = context?.username;
  greeting.textContent = username ? `u/${username}, YOU'RE ON CALL` : 'INCIDENT COMMAND';
}

startButton.addEventListener('click', (event) => {
  requestExpandedMode(event, 'game');
});
