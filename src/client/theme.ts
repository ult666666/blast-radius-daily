import { GameObjects, Scene } from 'phaser';

export const COLORS = {
  background: 0x06111d,
  panel: 0x0d1d2b,
  panelLight: 0x13293a,
  grid: 0x17354a,
  ink: '#eaf6ff',
  muted: '#7e9aaf',
  cyan: 0x36e1c1,
  cyanText: '#36e1c1',
  coral: 0xff5e57,
  coralText: '#ff6b64',
  amber: 0xffd166,
  amberText: '#ffd166',
  violet: 0x8b7cf6,
  green: 0x62e6a7,
  white: 0xffffff,
} as const;

export const FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
export const SANS = 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif';

export function drawBackdrop(scene: Scene): void {
  scene.cameras.main.setBackgroundColor(COLORS.background);
  const graphics = scene.add.graphics();
  graphics.lineStyle(1, COLORS.grid, 0.28);
  for (let x = 0; x <= 1100; x += 40) {
    graphics.lineBetween(x, 0, x, 720);
  }
  for (let y = 0; y <= 720; y += 40) {
    graphics.lineBetween(0, y, 1100, y);
  }
  graphics.fillStyle(0x02070d, 0.45);
  graphics.fillRect(0, 0, 1100, 720);
}

export function drawPanel(
  scene: Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 0.96
): GameObjects.Graphics {
  const panel = scene.add.graphics();
  panel.fillStyle(COLORS.panel, alpha);
  panel.fillRoundedRect(x, y, width, height, 16);
  panel.lineStyle(1, COLORS.grid, 1);
  panel.strokeRoundedRect(x, y, width, height, 16);
  return panel;
}

export function addButton(
  scene: Scene,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    color?: number;
    textColor?: string;
    fontSize?: number;
    onPress: () => void;
  }
): GameObjects.Container {
  const color = options.color ?? COLORS.cyan;
  const textColor = options.textColor ?? '#04110e';
  const container = scene.add.container(options.x, options.y);
  const background = scene.add.graphics();
  const label = scene.add
    .text(0, 0, options.label, {
      fontFamily: SANS,
      fontSize: `${options.fontSize ?? 14}px`,
      fontStyle: 'bold',
      color: textColor,
      align: 'center',
    })
    .setOrigin(0.5);

  const redraw = (hovered: boolean) => {
    background.clear();
    background.fillStyle(color, hovered ? 1 : 0.88);
    background.fillRoundedRect(
      -options.width / 2,
      -options.height / 2,
      options.width,
      options.height,
      10
    );
    background.lineStyle(1, color, 1);
    background.strokeRoundedRect(
      -options.width / 2,
      -options.height / 2,
      options.width,
      options.height,
      10
    );
  };

  redraw(false);
  container.add([background, label]);
  container
    .setSize(options.width, options.height)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => redraw(true))
    .on('pointerout', () => redraw(false))
    .on('pointerdown', options.onPress);
  return container;
}

export function addKicker(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  color: string = COLORS.cyanText
): GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: SANS,
    fontSize: '12px',
    fontStyle: 'bold',
    color,
  });
}

/** "COMMUNITY SIGNALS" as "Community signals", for data stored in capitals. */
export function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export type FocusRect = { x: number; y: number; width: number; height: number };

/** The canvas area of a centred button, with room for a focus ring around it. */
export function buttonRect(x: number, y: number, width: number, height: number): FocusRect {
  return { x: x - width / 2 - 7, y: y - height / 2 - 7, width: width + 14, height: height + 14 };
}

/**
 * Keyboard focus on the canvas: a 4px white ring with a dark outer edge, so it stays
 * visible on dark panels, cyan selections and coral failures alike.
 */
export function drawFocusRing(graphics: GameObjects.Graphics | null, rect: FocusRect | null): void {
  if (!graphics?.active) {
    return;
  }
  graphics.clear();
  if (!rect) {
    return;
  }
  graphics.lineStyle(8, COLORS.background, 1);
  graphics.strokeRoundedRect(rect.x - 3, rect.y - 3, rect.width + 6, rect.height + 6, 15);
  graphics.lineStyle(4, COLORS.white, 1);
  graphics.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 13);
}
