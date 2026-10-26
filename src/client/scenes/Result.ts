import { GameObjects, Scene } from 'phaser';
import { deleteGameData, isDemoMode, shareScore, voteForProtocol } from '../api';
import { reportDemoView } from '../demo-events';
import type { ScoreResponse, SessionResponse } from '../../shared/api';
import { PROTOCOLS, type ProtocolId } from '../../shared/game';
import {
  COLORS,
  FONT,
  SANS,
  addButton,
  addKicker,
  drawBackdrop,
  drawPanel,
} from '../theme';

type ResultData = {
  session: SessionResponse;
  response: ScoreResponse;
};

export class Result extends Scene {
  private resultData: ResultData | null = null;
  private voteButtons: GameObjects.Container[] = [];
  private voteStatus: GameObjects.Text | null = null;
  private deleteArmed = false;

  constructor() {
    super('Result');
  }

  init(data?: ResultData): void {
    this.resultData = data ?? null;
    this.deleteArmed = false;
  }

  create(): void {
    if (!this.resultData) {
      this.scene.start('DailyGame');
      return;
    }
    const { session, response } = this.resultData;
    reportDemoView({ phase: 'result', selectedIds: response.outcome.shieldIds });
    drawBackdrop(this);
    this.cameras.main.fadeIn(240, 6, 17, 29);

    this.add.text(28, 20, 'BLAST / RADIUS', {
      fontFamily: SANS,
      fontSize: '23px',
      fontStyle: 'bold',
      color: COLORS.ink,
    });
    this.add
      .text(1072, 25, `DAILY INCIDENT #${session.puzzle.episode} · ${session.puzzle.day}`, {
        fontFamily: FONT,
        fontSize: '10px',
        color: COLORS.muted,
      })
      .setOrigin(1, 0);

    drawPanel(this, 28, 68, 650, 626, 0.97);
    drawPanel(this, 696, 68, 376, 626, 0.97);

    addKicker(
      this,
      52,
      92,
      response.outcome.optimal ? 'OPTIMAL CONTAINMENT' : 'INCIDENT REPORT',
      response.outcome.optimal ? COLORS.cyanText : COLORS.amberText
    );
    this.add.text(52, 117, response.outcome.score.toLocaleString('en-US'), {
      fontFamily: SANS,
      fontSize: '72px',
      fontStyle: 'bold',
      color: response.outcome.optimal ? COLORS.cyanText : COLORS.ink,
    });
    this.add.text(56, 190, 'POINTS', {
      fontFamily: FONT,
      fontSize: '11px',
      color: COLORS.muted,
    });
    this.add.text(
      330,
      124,
      response.outcome.optimal
        ? 'YOU FOUND TODAY\'S BEST CUT.'
        : 'THE BLAST WAS PARTIALLY CONTAINED.',
      {
        fontFamily: FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: response.outcome.optimal ? COLORS.cyanText : COLORS.amberText,
        wordWrap: { width: 300 },
      }
    );
    this.add.text(330, 170, `Personal best: ${response.bestScore.toLocaleString('en-US')}`, {
      fontFamily: FONT,
      fontSize: '11px',
      color: COLORS.muted,
    });

    this.drawMetric(52, 226, 'BLAST CONTAINED', `${response.outcome.containment}%`, COLORS.cyan);
    this.drawMetric(
      253,
      226,
      'ENDPOINTS SAVED',
      `${response.outcome.savedCriticalIds.length}`,
      COLORS.green
    );
    this.drawMetric(454, 226, 'DAY STREAK', `${response.streak}`, COLORS.violet);

    addKicker(this, 52, 342, 'YOUR CIRCUIT BREAKERS');
    const selectedLabels = response.outcome.shieldIds
      .map((id) => session.puzzle.nodes.find((node) => node.id === id)?.label ?? id)
      .join('  +  ');
    this.add.text(52, 365, selectedLabels || 'No breakers placed', {
      fontFamily: FONT,
      fontSize: '14px',
      fontStyle: 'bold',
      color: COLORS.ink,
      wordWrap: { width: 600 },
    });
    this.add.text(
      52,
      397,
      `${response.outcome.savedIds.length} assets saved · ${response.outcome.failedIds.length} failed · protocol: ${session.puzzle.protocolLabel}`,
      {
        fontFamily: SANS,
        fontSize: '11px',
        color: COLORS.muted,
        wordWrap: { width: 590 },
      }
    );

    this.drawCommunityMeter(response.community.responders, response.community.goal, response.community.percent);

    addKicker(this, 52, 507, isDemoMode() ? 'LOCAL SCORE SUMMARY (NOT POSTED)' : 'OPTIONAL SCORE COMMENT', COLORS.amberText);
    this.add.text(52, 527, response.commentPreview, {
      fontFamily: SANS,
      fontSize: '9px',
      lineSpacing: 1,
      color: '#a9bfce',
      wordWrap: { width: 595 },
    });
    this.add.text(52, 593, response.share.message, {
      fontFamily: SANS,
      fontSize: '9px',
      color: COLORS.muted,
      wordWrap: { width: 595 },
    });

    const shareButton = addButton(this, {
      x: 215,
      y: 650,
      width: 306,
      height: 42,
      label:
        response.share.status === 'ready'
          ? `POST SCORE AS u/${session.username}`
          : isDemoMode() ? 'COMMENTS UNAVAILABLE IN OFFLINE DEMO' : 'SCORE SHARING LOCKED PENDING REVIEW',
      color: response.share.status === 'ready' ? COLORS.amber : COLORS.panelLight,
      textColor: response.share.status === 'ready' ? '#191403' : COLORS.muted,
      fontSize: response.share.status === 'ready' ? 11 : 9,
      onPress: () => {
        if (response.share.status === 'ready') {
          void this.postScore(shareButton, response.share.token);
        }
      },
    });
    if (response.share.status !== 'ready') {
      shareButton.disableInteractive().setAlpha(0.68);
    }
    addButton(this, {
      x: 510,
      y: 650,
      width: 250,
      height: 42,
      label: 'REPLAY THE MAP',
      color: COLORS.panelLight,
      textColor: COLORS.ink,
      fontSize: 11,
      onPress: () => this.scene.start('DailyGame'),
    });

    addKicker(this, 720, 93, 'TODAY\'S LEADERBOARD');
    this.add.text(720, 113, `${response.community.responders} responders in this community`, {
      fontFamily: SANS,
      fontSize: '11px',
      color: COLORS.muted,
    });
    this.renderLeaderboard(response, session.username);

    this.add.rectangle(884, 399, 328, 1, COLORS.grid, 1);
    addKicker(this, 720, 420, 'CHOOSE TOMORROW\'S PROTOCOL', COLORS.amberText);
    this.add.text(720, 440, isDemoMode() ? 'Try one local vote. The fictional tally resets on reload.' : 'Your vote changes which asset class is worth 50% more tomorrow.', {
      fontFamily: SANS,
      fontSize: '11px',
      color: COLORS.muted,
      wordWrap: { width: 325 },
    });
    this.voteStatus = this.add.text(720, 654, 'One vote per responder. You can change it.', {
      fontFamily: SANS,
      fontSize: '10px',
      color: COLORS.muted,
    });
    this.renderVoteButtons(session.selectedProtocol, session.protocolVotes);
    const privacyButton = addButton(this, {
      x: 884,
      y: 681,
      width: 328,
      height: 22,
      label: 'PRIVACY · DELETE MY SAVED GAME DATA',
      color: COLORS.panelLight,
      textColor: COLORS.muted,
      fontSize: 8,
      onPress: () => {
        void this.deleteSavedData(privacyButton);
      },
    });
  }

  private drawMetric(x: number, y: number, label: string, value: string, color: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.panelLight, 0.94);
    graphics.fillRoundedRect(x, y, 182, 88, 12);
    graphics.lineStyle(1, color, 0.6);
    graphics.strokeRoundedRect(x, y, 182, 88, 12);
    this.add.text(x + 16, y + 14, label, {
      fontFamily: FONT,
      fontSize: '9px',
      color: COLORS.muted,
    });
    this.add.text(x + 16, y + 35, value, {
      fontFamily: SANS,
      fontSize: '31px',
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
    });
  }

  private drawCommunityMeter(responders: number, goal: number, percent: number): void {
    addKicker(this, 52, 437, 'COMMUNITY CONTAINMENT METER');
    this.add.text(628, 437, `${responders}/${goal} RESPONDERS`, {
      fontFamily: FONT,
      fontSize: '9px',
      color: COLORS.muted,
    }).setOrigin(1, 0);
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.grid, 0.65);
    graphics.fillRoundedRect(52, 460, 576, 14, 7);
    graphics.fillStyle(COLORS.cyan, 1);
    graphics.fillRoundedRect(52, 460, Math.max(10, 576 * (percent / 100)), 14, 7);
    this.add.text(52, 479, `${percent}% of today’s community response target`, {
      fontFamily: SANS,
      fontSize: '10px',
      color: COLORS.muted,
    });
  }

  private renderLeaderboard(response: ScoreResponse, currentUsername: string): void {
    const entries = response.leaderboard.slice(0, 8);
    if (entries.length === 0) {
      this.add.text(720, 164, 'Be the first responder on the board.', {
        fontFamily: SANS,
        fontSize: '13px',
        color: COLORS.muted,
      });
      return;
    }
    entries.forEach((entry, index) => {
      const y = 148 + index * 29;
      const isCurrent = entry.username === currentUsername;
      if (isCurrent) {
        this.add.rectangle(884, y + 10, 328, 25, COLORS.cyan, 0.09);
      }
      this.add.text(720, y, String(entry.rank).padStart(2, '0'), {
        fontFamily: FONT,
        fontSize: '11px',
        color: index < 3 ? COLORS.amberText : COLORS.muted,
      });
      this.add.text(756, y, `u/${entry.username}`, {
        fontFamily: FONT,
        fontSize: '11px',
        fontStyle: isCurrent ? 'bold' : 'normal',
        color: isCurrent ? COLORS.cyanText : COLORS.ink,
      });
      this.add
        .text(1045, y, entry.score.toLocaleString('en-US'), {
          fontFamily: FONT,
          fontSize: '11px',
          fontStyle: 'bold',
          color: COLORS.ink,
        })
        .setOrigin(1, 0);
    });
  }

  private renderVoteButtons(
    selected: ProtocolId | null,
    votes: Array<{ id: ProtocolId; count: number }>
  ): void {
    for (const button of this.voteButtons) {
      button.destroy(true);
    }
    this.voteButtons = PROTOCOLS.map((protocol, index) => {
      const count = votes.find((vote) => vote.id === protocol.id)?.count ?? 0;
      const isSelected = selected === protocol.id;
      return addButton(this, {
        x: 884,
        y: 493 + index * 51,
        width: 328,
        height: 40,
        label: `${isSelected ? '✓ ' : ''}${protocol.shortLabel}     ${count} VOTES`,
        color: isSelected ? COLORS.cyan : COLORS.panelLight,
        textColor: isSelected ? '#04110e' : COLORS.ink,
        fontSize: 10,
        onPress: () => {
          void this.castVote(protocol.id);
        },
      });
    });
  }

  private async castVote(protocol: ProtocolId): Promise<void> {
    for (const button of this.voteButtons) {
      button.disableInteractive();
    }
    this.voteStatus?.setText('Recording your community vote…').setColor(COLORS.amberText);
    try {
      const response = await voteForProtocol(protocol);
      this.renderVoteButtons(response.selectedProtocol, response.protocolVotes);
      this.voteStatus?.setText(isDemoMode() ? 'Local vote recorded. No community data was changed.' : 'Vote recorded. Tomorrow’s map will reflect the winner.').setColor(COLORS.cyanText);
    } catch (error) {
      for (const button of this.voteButtons) {
        button.setInteractive({ useHandCursor: true });
      }
      this.voteStatus
        ?.setText(error instanceof Error ? error.message : 'Could not record vote')
        .setColor(COLORS.coralText);
    }
  }

  private async postScore(button: GameObjects.Container, token: string): Promise<void> {
    button.disableInteractive();
    setButtonLabel(button, 'POSTING ONE COMMENT…');
    try {
      const response = await shareScore(token);
      setButtonLabel(
        button,
        response.status === 'posted' ? 'POSTED TO COMMENTS  ✓' : 'ALREADY POSTED TODAY  ✓'
      );
    } catch (error) {
      setButtonLabel(button, error instanceof Error ? error.message.toUpperCase() : 'POST FAILED');
      button.setInteractive({ useHandCursor: true });
    }
  }

  private async deleteSavedData(button: GameObjects.Container): Promise<void> {
    if (!this.deleteArmed) {
      this.deleteArmed = true;
      reportDemoView({ phase: 'confirm-delete' });
      setButtonLabel(button, 'PRESS AGAIN TO DELETE SAVED DATA');
      this.voteStatus
        ?.setText('Deletion removes scores, votes, streak, and share drafts from app storage.')
        .setColor(COLORS.amberText);
      return;
    }

    button.disableInteractive();
    setButtonLabel(button, 'DELETING SAVED DATA…');
    try {
      await deleteGameData();
      setButtonLabel(button, 'SAVED GAME DATA DELETED  ✓');
      this.voteStatus
        ?.setText('Your app-stored game data has been removed.')
        .setColor(COLORS.cyanText);
    } catch (error) {
      this.deleteArmed = false;
      setButtonLabel(button, 'PRIVACY · DELETE MY SAVED GAME DATA');
      button.setInteractive({ useHandCursor: true });
      this.voteStatus
        ?.setText(error instanceof Error ? error.message : 'Could not delete saved data')
        .setColor(COLORS.coralText);
    }
  }
}

function setButtonLabel(button: GameObjects.Container, label: string): void {
  for (const child of button.list) {
    if (child instanceof GameObjects.Text) {
      child.setText(label);
      return;
    }
  }
}
