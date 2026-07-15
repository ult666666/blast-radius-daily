import { GameObjects, Scene } from 'phaser';
import { getSession, isDemoMode, submitScore } from '../api';
import type { SessionResponse } from '../../shared/api';
import {
  evaluateShielding,
  findOptimalShieldSets,
  type AssetNode,
  type ShieldOutcome,
} from '../../shared/game';
import {
  COLORS,
  FONT,
  SANS,
  addButton,
  addKicker,
  drawBackdrop,
  drawPanel,
} from '../theme';

type NodeState = 'default' | 'selected' | 'failed' | 'saved';

type NodeWidget = {
  node: AssetNode;
  container: GameObjects.Container;
  redraw: (state: NodeState) => void;
};

export class DailyGame extends Scene {
  private session: SessionResponse | null = null;
  private readonly selected = new Set<string>();
  private readonly widgets = new Map<string, NodeWidget>();
  private budgetText: GameObjects.Text | null = null;
  private statusText: GameObjects.Text | null = null;
  private runButton: GameObjects.Container | null = null;
  private running = false;

  constructor() {
    super('DailyGame');
  }

  create(): void {
    drawBackdrop(this);
    this.add
      .text(550, 330, 'LOADING TODAY\'S LINEAGE MAP…', {
        fontFamily: FONT,
        fontSize: '15px',
        color: COLORS.cyanText,
      })
      .setOrigin(0.5);
    const loader = this.add.circle(550, 380, 8, COLORS.cyan);
    this.tweens.add({
      targets: loader,
      alpha: 0.15,
      scale: 1.8,
      duration: 680,
      yoyo: true,
      repeat: -1,
    });
    void this.loadDailySession();
  }

  private async loadDailySession(): Promise<void> {
    try {
      this.session = await getSession();
      if (
        isDemoMode() &&
        new URLSearchParams(window.location.search).get('stage') === 'result-direct'
      ) {
        const selection = findOptimalShieldSets(this.session.puzzle)[0] ?? [];
        const response = await submitScore(selection);
        this.scene.start('Result', { session: this.session, response });
        return;
      }
      this.renderSession(this.session);
    } catch (error) {
      this.children.removeAll(true);
      drawBackdrop(this);
      drawPanel(this, 245, 220, 610, 260);
      addKicker(this, 285, 255, 'CONNECTION INTERRUPTED', COLORS.coralText);
      this.add.text(285, 290, 'THE INCIDENT MAP COULD NOT LOAD', {
        fontFamily: SANS,
        fontSize: '28px',
        fontStyle: 'bold',
        color: COLORS.ink,
      });
      this.add.text(285, 345, error instanceof Error ? error.message : 'Unknown error', {
        fontFamily: SANS,
        fontSize: '15px',
        color: COLORS.muted,
        wordWrap: { width: 520 },
      });
      addButton(this, {
        x: 550,
        y: 430,
        width: 200,
        height: 44,
        label: 'RETRY CONNECTION',
        onPress: () => this.scene.restart(),
      });
    }
  }

  private renderSession(session: SessionResponse): void {
    this.children.removeAll(true);
    this.selected.clear();
    this.widgets.clear();
    this.running = false;
    drawBackdrop(this);

    this.add.rectangle(550, 36, 1100, 72, 0x071522, 0.97);
    this.add.rectangle(550, 72, 1100, 1, COLORS.grid, 1);
    this.add
      .text(22, 18, 'BLAST / RADIUS', {
        fontFamily: SANS,
        fontSize: '23px',
        fontStyle: 'bold',
        color: COLORS.ink,
      })
      .setLetterSpacing(-1);
    this.add.text(22, 47, `DAILY INCIDENT #${session.puzzle.episode}`, {
      fontFamily: FONT,
      fontSize: '10px',
      color: COLORS.cyanText,
    });
    this.add
      .text(1078, 22, `u/${session.username}`, {
        fontFamily: FONT,
        fontSize: '11px',
        color: COLORS.ink,
      })
      .setOrigin(1, 0);
    this.add
      .text(1078, 44, `${session.streak} DAY STREAK  ·  BEST ${session.bestScore ?? '—'}`, {
        fontFamily: FONT,
        fontSize: '9px',
        color: COLORS.muted,
      })
      .setOrigin(1, 0);

    drawPanel(this, 18, 86, 765, 615, 0.93);
    this.drawEdges(session);
    for (const node of session.puzzle.nodes) {
      this.drawNode(node);
    }

    addKicker(this, 38, 100, `${session.puzzle.system} / LIVE LINEAGE`);
    this.add.text(38, 118, 'Click shieldable nodes to place circuit breakers.', {
      fontFamily: SANS,
      fontSize: '12px',
      color: COLORS.muted,
    });
    this.add.text(38, 678, '◆ breaker candidate    ● critical endpoint    red paths fail after deploy', {
      fontFamily: FONT,
      fontSize: '9px',
      color: COLORS.muted,
    });

    drawPanel(this, 800, 86, 282, 615, 0.98);
    addKicker(this, 824, 110, `TODAY / ${session.puzzle.day}`);
    this.add.text(824, 133, session.puzzle.title, {
      fontFamily: SANS,
      fontSize: '24px',
      fontStyle: 'bold',
      color: COLORS.ink,
      wordWrap: { width: 232 },
    });
    addKicker(this, 824, 201, 'BREAKING CHANGE', COLORS.coralText);
    this.add.text(824, 221, session.puzzle.change, {
      fontFamily: FONT,
      fontSize: '14px',
      fontStyle: 'bold',
      color: COLORS.coralText,
      backgroundColor: '#2a171b',
      padding: { x: 10, y: 8 },
      wordWrap: { width: 218 },
    });
    this.add.text(824, 285, session.puzzle.briefing, {
      fontFamily: SANS,
      fontSize: '13px',
      lineSpacing: 5,
      color: '#b8ccda',
      wordWrap: { width: 232 },
    });

    addKicker(this, 824, 403, 'COMMUNITY PROTOCOL', COLORS.amberText);
    this.add.text(824, 424, session.puzzle.protocolLabel.toUpperCase(), {
      fontFamily: FONT,
      fontSize: '11px',
      fontStyle: 'bold',
      color: COLORS.amberText,
      wordWrap: { width: 230 },
    });
    this.add.text(824, 450, 'Today, that asset class is worth 50% more.', {
      fontFamily: SANS,
      fontSize: '11px',
      color: COLORS.muted,
      wordWrap: { width: 225 },
    });

    addKicker(this, 824, 496, 'CIRCUIT BREAKER BUDGET');
    this.budgetText = this.add.text(824, 518, '', {
      fontFamily: FONT,
      fontSize: '20px',
      fontStyle: 'bold',
      color: COLORS.cyanText,
    });
    this.statusText = this.add.text(824, 555, 'Choose your cuts, then trigger the change.', {
      fontFamily: SANS,
      fontSize: '11px',
      color: COLORS.muted,
      wordWrap: { width: 232 },
    });
    this.runButton = addButton(this, {
      x: 941,
      y: 653,
      width: 234,
      height: 48,
      label: 'TRIGGER THE CHANGE  →',
      color: COLORS.coral,
      textColor: '#ffffff',
      onPress: () => this.runSimulation(),
    });
    this.updateBudget();

    const demoStage = new URLSearchParams(window.location.search).get('stage');
    if (isDemoMode() && (demoStage === 'selected' || demoStage === 'result')) {
      const optimal = findOptimalShieldSets(session.puzzle)[0] ?? [];
      for (const id of optimal) {
        this.selected.add(id);
        this.widgets.get(id)?.redraw('selected');
      }
      this.updateBudget();
      if (demoStage === 'result') {
        this.time.delayedCall(500, () => this.runSimulation());
      }
    }
  }

  private drawEdges(session: SessionResponse): void {
    const nodes = new Map(session.puzzle.nodes.map((node) => [node.id, node]));
    const graphics = this.add.graphics();
    for (const edge of session.puzzle.edges) {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) {
        continue;
      }
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy);
      const ux = dx / length;
      const uy = dy / length;
      const startX = from.x + ux * 72;
      const startY = from.y + uy * 32;
      const endX = to.x - ux * 72;
      const endY = to.y - uy * 32;
      graphics.lineStyle(2, COLORS.grid, 0.9);
      graphics.lineBetween(startX, startY, endX, endY);
      const wingX = -uy * 5;
      const wingY = ux * 5;
      graphics.fillStyle(COLORS.grid, 1);
      graphics.fillTriangle(
        endX,
        endY,
        endX - ux * 10 + wingX,
        endY - uy * 10 + wingY,
        endX - ux * 10 - wingX,
        endY - uy * 10 - wingY
      );
    }
  }

  private drawNode(node: AssetNode): void {
    const container = this.add.container(node.x, node.y);
    const graphics = this.add.graphics();
    const label = this.add
      .text(0, -7, node.label, {
        fontFamily: FONT,
        fontSize: '11px',
        fontStyle: 'bold',
        color: COLORS.ink,
        align: 'center',
      })
      .setOrigin(0.5);
    const kind = this.add
      .text(0, 12, node.kind.toUpperCase(), {
        fontFamily: FONT,
        fontSize: '8px',
        color: COLORS.muted,
        align: 'center',
      })
      .setOrigin(0.5);
    const cost = this.add
      .text(56, -21, node.shieldCost === null ? '●' : `◆${node.shieldCost}`, {
        fontFamily: FONT,
        fontSize: '9px',
        fontStyle: 'bold',
        color: node.shieldCost === null ? COLORS.amberText : COLORS.cyanText,
      })
      .setOrigin(0.5);

    const redraw = (state: NodeState): void => {
      graphics.clear();
      let fill: number = COLORS.panelLight;
      let stroke: number = node.shieldCost === null ? COLORS.grid : COLORS.cyan;
      const alpha = node.shieldCost === null ? 0.88 : 1;
      if (node.id === this.session?.puzzle.sourceId && state === 'default') {
        fill = 0x2b171d;
        stroke = COLORS.coral;
      }
      if (state === 'selected') {
        fill = 0x0e3938;
        stroke = COLORS.cyan;
        graphics.fillStyle(COLORS.cyan, 0.12);
        graphics.fillRoundedRect(-73, -33, 146, 66, 13);
      } else if (state === 'failed') {
        fill = 0x421c24;
        stroke = COLORS.coral;
      } else if (state === 'saved') {
        fill = 0x12352f;
        stroke = COLORS.green;
      }
      graphics.fillStyle(fill, alpha);
      graphics.fillRoundedRect(-67, -27, 134, 54, 10);
      graphics.lineStyle(state === 'selected' ? 3 : 1.5, stroke, 1);
      graphics.strokeRoundedRect(-67, -27, 134, 54, 10);
      label.setColor(state === 'failed' ? '#ffb0ac' : COLORS.ink);
      kind.setColor(state === 'saved' ? '#62e6a7' : COLORS.muted);
    };

    redraw('default');
    container.add([graphics, label, kind, cost]);
    if (node.shieldCost !== null) {
      container
        .setSize(140, 60)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          if (!this.running && !this.selected.has(node.id)) {
            container.setScale(1.035);
          }
          this.setStatus(`${node.label} · breaker cost ${node.shieldCost} · ${node.detail}`);
        })
        .on('pointerout', () => {
          container.setScale(1);
          if (!this.running) {
            this.setStatus('Choose your cuts, then trigger the change.');
          }
        })
        .on('pointerdown', () => this.toggleShield(node));
    }
    this.widgets.set(node.id, { node, container, redraw });
  }

  private toggleShield(node: AssetNode): void {
    if (this.running || node.shieldCost === null || !this.session) {
      return;
    }
    if (this.selected.has(node.id)) {
      this.selected.delete(node.id);
    } else if (this.currentCost() + node.shieldCost <= this.session.puzzle.shieldBudget) {
      this.selected.add(node.id);
    } else {
      this.cameras.main.shake(90, 0.0025);
      this.setStatus('Budget exceeded. Remove a breaker before placing another.', COLORS.amberText);
      return;
    }

    for (const widget of this.widgets.values()) {
      widget.redraw(this.selected.has(widget.node.id) ? 'selected' : 'default');
    }
    this.updateBudget();
  }

  private updateBudget(): void {
    if (!this.session || !this.budgetText) {
      return;
    }
    const used = this.currentCost();
    const tokens = Array.from({ length: this.session.puzzle.shieldBudget }, (_, index) =>
      index < used ? '◆' : '◇'
    ).join(' ');
    this.budgetText.setText(`${tokens}   ${used}/${this.session.puzzle.shieldBudget}`);
  }

  private currentCost(): number {
    if (!this.session) {
      return 0;
    }
    return [...this.selected].reduce((total, id) => {
      const node = this.session?.puzzle.nodes.find((candidate) => candidate.id === id);
      return total + (node?.shieldCost ?? 0);
    }, 0);
  }

  private runSimulation(): void {
    if (this.running || !this.session) {
      return;
    }
    let outcome: ShieldOutcome;
    try {
      outcome = evaluateShielding(this.session.puzzle, [...this.selected]);
    } catch (error) {
      this.setStatus(error instanceof Error ? error.message : 'Invalid breaker layout', COLORS.coralText);
      return;
    }

    this.running = true;
    this.runButton?.disableInteractive();
    this.setStatus('Deploying change… tracing downstream failures.', COLORS.coralText);
    this.widgets.get(this.session.puzzle.sourceId)?.redraw('failed');
    this.animateFailure(outcome);
    this.time.delayedCall(1650, () => {
      void this.finishSimulation(outcome);
    });
  }

  private animateFailure(outcome: ShieldOutcome): void {
    if (!this.session) {
      return;
    }
    const failed = new Set(outcome.failedIds);
    const nodeMap = new Map(this.session.puzzle.nodes.map((node) => [node.id, node]));
    const failedEdges = this.session.puzzle.edges.filter(
      (edge) => failed.has(edge.from) && failed.has(edge.to)
    );

    failedEdges.forEach((edge, index) => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (!from || !to) {
        return;
      }
      this.time.delayedCall(index * 80, () => {
        const pulse = this.add.circle(from.x, from.y, 6, COLORS.coral, 0.95).setDepth(20);
        this.tweens.add({
          targets: pulse,
          x: to.x,
          y: to.y,
          alpha: 0.25,
          scale: 0.45,
          duration: 310,
          ease: 'Sine.easeIn',
          onComplete: () => {
            pulse.destroy();
            this.widgets.get(to.id)?.redraw('failed');
          },
        });
      });
    });

    this.time.delayedCall(1120, () => {
      for (const id of outcome.savedIds) {
        this.widgets.get(id)?.redraw('saved');
      }
    });
  }

  private async finishSimulation(outcome: ShieldOutcome): Promise<void> {
    if (!this.session) {
      return;
    }
    try {
      const response = await submitScore(outcome.shieldIds);
      this.cameras.main.fadeOut(240, 6, 17, 29);
      this.time.delayedCall(250, () => {
        if (this.session) {
          this.scene.start('Result', { session: this.session, response });
        }
      });
    } catch (error) {
      this.running = false;
      this.runButton?.setInteractive({ useHandCursor: true });
      this.setStatus(
        error instanceof Error ? error.message : 'Could not save the result',
        COLORS.coralText
      );
    }
  }

  private setStatus(message: string, color: string = COLORS.muted): void {
    this.statusText?.setText(message).setColor(color);
  }
}
