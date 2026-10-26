import './demo.css';
import './game';
import { getDemoSnapshot, subscribeDemoState } from './api';
import { parseDemoDay } from './demo-state';
import type { DemoView } from './demo-events';

document.addEventListener('DOMContentLoaded', () => {
  const status = document.querySelector<HTMLElement>('#demo-status')!;
  const form = document.querySelector<HTMLFormElement>('#day-form')!;
  const day = document.querySelector<HTMLInputElement>('#incident-day')!;
  let view: DemoView = { phase: 'board', selectedIds: [] };
  let ready = false;
  const output = (name: string, value: string) => {
    document.querySelector<HTMLOutputElement>(
      `output[aria-label="${name}"]`,
    )!.textContent = value;
  };
  const render = () => {
    try {
      const { session, lastOutcome, deleted } = getDemoSnapshot();
      day.value = session.puzzle.day;
      output('Local incident day', session.puzzle.day);
      output(
        'Local selected breakers',
        deleted ? 'None' : view.selectedIds?.join(', ') || 'None',
      );
      output('Local score', lastOutcome ? String(lastOutcome.score) : 'None');
      output(
        'Local best score',
        session.bestScore === null ? 'None' : String(session.bestScore),
      );
      output('Local streak', String(session.streak));
      output('Local vote', session.selectedProtocol || 'None');
      output(
        'Synthetic vote totals',
        session.protocolVotes.map((v) => v.count).join(', '),
      );
      output(
        'Local responders',
        `${session.community.responders} / ${session.community.goal} (synthetic)`,
      );
      status.textContent = deleted
        ? view.phase === 'board'
          ? 'Map ready. Local game data deleted; a new run starts fresh.'
          : 'Local game data deleted. Background fixtures remain synthetic.'
        : view.phase === 'confirm-delete'
          ? 'Confirm deletion by pressing the privacy control again.'
          : view.phase === 'cascade'
            ? 'Tracing the failure cascade…'
            : view.phase === 'result'
              ? 'Result ready. Scores and votes stay in this tab only.'
              : ready
                ? 'Map ready. Place up to two circuit breakers, then trigger the change.'
                : 'Loading the local map…';
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : 'Could not load the demo.';
    }
  };
  subscribeDemoState(render);
  window.addEventListener('blast-demo-view', (event) => {
    view = { ...view, ...(event as CustomEvent<DemoView>).detail };
    ready = true;
    render();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('day', parseDemoDay(day.value));
      window.location.assign(url.href);
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : 'Invalid date';
    }
  });
  render();
});
