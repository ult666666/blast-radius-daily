import './a11y.css';
import type { DailyPuzzle, ProtocolId } from '../shared/game';
import {
  boardOrder,
  describeNode,
  moveFocus,
  tokensLeftText,
  type NavigationKey,
  type NodeStatus,
} from './board-a11y';

// The Phaser canvas is a picture to assistive technology. This module keeps a DOM mirror
// of each screen next to it: real focusable elements, text for every asset, and one
// polite live region. Keyboard focus lives in the mirror; each scene draws the focus ring
// on the canvas at the matching position.

export type CanvasRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type FocusRing = (rect: CanvasRect | null) => void;
type Attributes = Record<string, string>;

const MIRROR_ID = 'blast-a11y';
const NAVIGATION: readonly string[] = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
];
export const KEY_HELP =
  'Up and Down arrows move through the assets in reading order. Left and Right jump to the ' +
  'nearest asset in the neighbouring column. Space or Enter places or removes a circuit ' +
  'breaker. Press D to trigger the change, or Tab to the Trigger button.';

// Set when a mirror that held focus is replaced, so the next screen takes focus.
let restoreFocus = false;
let ticket = 0;

export function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function element(
  tag: string,
  text: string | null,
  attributes: Attributes = {},
): HTMLElement {
  const node = document.createElement(tag);
  if (text !== null) node.textContent = text;
  for (const [key, value] of Object.entries(attributes))
    node.setAttribute(key, value);
  return node;
}

function gameContainer(): HTMLElement {
  const container = document.getElementById('game-container');
  if (!container) throw new Error('The game container is missing');
  // The canvas carries no text; the mirror before it is its accessible equivalent.
  container.setAttribute('aria-hidden', 'true');
  return container;
}

function announcer(): HTMLElement {
  const existing = document.getElementById('blast-announcer');
  if (existing) return existing;
  const region = element('div', '', {
    id: 'blast-announcer',
    class: 'blast-sr-only',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
    'aria-label': 'Game announcements',
  });
  gameContainer().before(region);
  return region;
}

/** Say something once through the polite live region. A repeat is announced again. */
export function announce(message: string): void {
  const region = announcer();
  const mine = ++ticket;
  region.textContent = '';
  window.setTimeout(() => {
    if (mine === ticket) region.textContent = message;
  }, 40);
}

type Mirror = {
  root: HTMLElement;
  heading: HTMLElement;
  subheading: (text: string) => HTMLElement;
  rect: (target: HTMLElement, rect: CanvasRect) => void;
  destroy: () => void;
  active: () => boolean;
};

/** A fresh mirror section before the canvas, wired to the scene's focus ring. */
function mount(title: string, onFocusRect: FocusRing): Mirror {
  document.getElementById(MIRROR_ID)?.remove();
  announcer();
  const root = element('section', null, {
    id: MIRROR_ID,
    class: 'blast-sr-only',
    'aria-labelledby': `${MIRROR_ID}-title`,
  });
  // The Devvit game page has no other heading, so there the screen title is the h1.
  const level = document.querySelector(`h1:not(#${MIRROR_ID}-title)`) ? 2 : 1;
  const heading = element(`h${level}`, title, {
    id: `${MIRROR_ID}-title`,
    tabindex: '-1',
  });
  root.append(heading);
  const rects = new WeakMap<EventTarget, CanvasRect>();
  let live = true;
  root.addEventListener('focusin', (event) => {
    if (live) onFocusRect(rects.get(event.target as EventTarget) ?? null);
  });
  root.addEventListener('focusout', (event) => {
    if (live && !root.contains(event.relatedTarget as Node | null))
      onFocusRect(null);
  });
  gameContainer().before(root);
  return {
    root,
    heading,
    subheading: (text) => element(`h${level + 1}`, text),
    rect: (target, rect) => rects.set(target, rect),
    active: () => live,
    destroy: () => {
      if (!live) return;
      live = false;
      if (root.contains(document.activeElement)) restoreFocus = true;
      root.remove();
    },
  };
}

function takeFocus(target: HTMLElement): void {
  if (!restoreFocus) return;
  restoreFocus = false;
  target.focus({ preventScroll: true });
}

export type BoardState = {
  selected: ReadonlySet<string>;
  statuses: ReadonlyMap<string, NodeStatus>;
  running: boolean;
};
export type BoardMirror = {
  sync: (state: BoardState) => void;
  setMotion: (motion: 'full' | 'reduced') => void;
  destroy: () => void;
};

/**
 * The board as a multi-select listbox: one option per asset in reading order, selected
 * when it holds a breaker. Assets that cannot hold one are disabled options, so they can
 * still be read. A roving tabindex keeps the whole list one Tab stop.
 */
export function mountBoard(options: {
  puzzle: DailyPuzzle;
  rectForNode: (id: string) => CanvasRect;
  deployRect: CanvasRect;
  onToggle: (id: string) => void;
  onDeploy: () => void;
  onFocusRect: FocusRing;
}): BoardMirror {
  const { puzzle } = options;
  const mirror = mount(
    `Daily incident #${puzzle.episode}: ${puzzle.title}`,
    options.onFocusRect,
  );
  mirror.root.dataset.screen = 'board';
  mirror.root.append(
    element(
      'p',
      `${puzzle.system}. Breaking change: ${puzzle.change}. ${puzzle.briefing} ` +
        `Community protocol: ${puzzle.protocolLabel}. You have ${puzzle.shieldBudget} circuit breaker tokens.`,
    ),
    element('p', KEY_HELP, { id: `${MIRROR_ID}-keys` }),
  );
  const listbox = element('ul', null, {
    role: 'listbox',
    'aria-multiselectable': 'true',
    'aria-label': 'Lineage map assets',
    'aria-describedby': `${MIRROR_ID}-keys`,
  });
  const order = boardOrder(puzzle);
  const items = new Map<string, HTMLElement>();
  for (const node of order) {
    const item = element('li', '', {
      role: 'option',
      id: `blast-node-${node.id}`,
      'data-node': node.id,
      'aria-selected': 'false',
      tabindex: '-1',
    });
    if (node.shieldCost === null) item.setAttribute('aria-disabled', 'true');
    mirror.rect(item, options.rectForNode(node.id));
    items.set(node.id, item);
    listbox.append(item);
  }
  let active = order[0]!.id;
  const activate = (id: string, focus: boolean) => {
    items.get(active)?.setAttribute('tabindex', '-1');
    active = id;
    const item = items.get(active)!;
    item.setAttribute('tabindex', '0');
    if (focus) item.focus();
  };
  activate(active, false);
  listbox.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (NAVIGATION.includes(event.key)) {
      event.preventDefault();
      activate(moveFocus(puzzle, active, event.key as NavigationKey), true);
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      options.onToggle(active);
    } else if (event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      options.onDeploy();
    }
  });
  // Screen readers in browse mode may send a click instead of a key press.
  listbox.addEventListener('click', (event) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-node]',
    );
    if (!item?.dataset.node) return;
    activate(item.dataset.node, true);
    options.onToggle(item.dataset.node);
  });
  const deploy = element('button', 'Trigger the change', { type: 'button' });
  mirror.rect(deploy, options.deployRect);
  deploy.addEventListener('click', () => options.onDeploy());
  mirror.root.append(listbox, deploy);
  takeFocus(items.get(active)!);
  return {
    sync: ({ selected, statuses, running }) => {
      if (!mirror.active()) return;
      for (const node of order) {
        const item = items.get(node.id)!;
        const status =
          statuses.get(node.id) ??
          (selected.has(node.id) ? 'selected' : 'idle');
        item.textContent = describeNode(puzzle, node, status);
        item.setAttribute('aria-selected', String(selected.has(node.id)));
      }
      deploy.textContent = running
        ? 'Change deployed'
        : `Trigger the change. ${tokensLeftText(puzzle, selected)}`;
      deploy.setAttribute('aria-disabled', String(running));
      mirror.root.dataset.phase = running ? 'cascade' : 'board';
    },
    setMotion: (motion) => {
      mirror.root.dataset.motion = motion;
    },
    destroy: mirror.destroy,
  };
}

export type ResultAction = {
  id: string;
  label: string;
  rect: CanvasRect;
  disabled?: boolean;
  onPress: () => void;
};
export type ResultVote = {
  id: ProtocolId;
  label: string;
  count: number;
  rect: CanvasRect;
};
export type ResultMirror = {
  setVotes: (
    selected: ProtocolId | null,
    counts: Map<ProtocolId, number>,
    busy: boolean,
  ) => void;
  setAction: (id: string, label: string, disabled?: boolean) => void;
  destroy: () => void;
};

/** The result screen: the score and facts as text, then the same buttons as the canvas. */
export function mountResult(options: {
  title: string;
  facts: string[];
  leaderboard: string[];
  preview: string;
  votes: ResultVote[];
  selected: ProtocolId | null;
  actions: ResultAction[];
  onVote: (id: ProtocolId) => void;
  onFocusRect: FocusRing;
}): ResultMirror {
  const mirror = mount(options.title, options.onFocusRect);
  mirror.root.dataset.screen = 'result';
  const facts = element('ul', null, { 'aria-label': 'Result summary' });
  for (const fact of options.facts) facts.append(element('li', fact));
  const board = element('ol', null, { 'aria-label': "Today's leaderboard" });
  for (const row of options.leaderboard) board.append(element('li', row));
  const voteGroup = element('div', null, {
    role: 'group',
    'aria-label': "Vote for tomorrow's protocol",
  });
  const voteButtons = new Map<ProtocolId, HTMLElement>();
  for (const vote of options.votes) {
    const button = element('button', '', {
      type: 'button',
      'aria-pressed': 'false',
    });
    mirror.rect(button, vote.rect);
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-disabled') !== 'true')
        options.onVote(vote.id);
    });
    voteButtons.set(vote.id, button);
    voteGroup.append(button);
  }
  const actionButtons = new Map<string, HTMLElement>();
  const actions = options.actions.map((action) => {
    const button = element('button', action.label, { type: 'button' });
    button.setAttribute('aria-disabled', String(action.disabled === true));
    mirror.rect(button, action.rect);
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-disabled') !== 'true') action.onPress();
    });
    actionButtons.set(action.id, button);
    return button;
  });
  mirror.root.append(
    facts,
    mirror.subheading("Today's leaderboard"),
    board,
    mirror.subheading("Choose tomorrow's protocol"),
    voteGroup,
    ...actions,
    element('p', options.preview),
  );
  const labels = new Map(options.votes.map((vote) => [vote.id, vote.label]));
  const result: ResultMirror = {
    setVotes: (selected, counts, busy) => {
      if (!mirror.active()) return;
      for (const [id, button] of voteButtons) {
        const count = counts.get(id) ?? 0;
        button.textContent = `${labels.get(id)}: ${count} ${count === 1 ? 'vote' : 'votes'}`;
        button.setAttribute('aria-pressed', String(selected === id));
        button.setAttribute('aria-disabled', String(busy));
      }
    },
    setAction: (id, label, disabled = false) => {
      const button = actionButtons.get(id);
      if (!button || !mirror.active()) return;
      button.textContent = label;
      button.setAttribute('aria-disabled', String(disabled));
    },
    destroy: mirror.destroy,
  };
  result.setVotes(
    options.selected,
    new Map(options.votes.map((vote) => [vote.id, vote.count])),
    false,
  );
  takeFocus(mirror.heading);
  return result;
}

/** A message with one action, for the screen shown when the daily map cannot load. */
export function mountMessage(options: {
  title: string;
  message: string;
  action: ResultAction;
  onFocusRect: FocusRing;
}): { destroy: () => void } {
  const mirror = mount(options.title, options.onFocusRect);
  const button = element('button', options.action.label, { type: 'button' });
  mirror.rect(button, options.action.rect);
  button.addEventListener('click', options.action.onPress);
  mirror.root.append(element('p', options.message), button);
  takeFocus(button);
  return { destroy: mirror.destroy };
}
