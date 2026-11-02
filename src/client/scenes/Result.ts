import { GameObjects, Scene, Scenes } from 'phaser';
import { deleteGameData, isDemoMode, shareScore, voteForProtocol } from '../api';
import { reportDemoView } from '../demo-events';
import { announce, mountResult, prefersReducedMotion, type ResultMirror } from '../a11y';
import { scoreMessage } from '../board-a11y';
import type { ScoreResponse, SessionResponse } from '../../shared/api';
import { PROTOCOLS, type ProtocolId } from '../../shared/game';
import {
  COLORS,
  FONT,
  SANS,
  addButton,
  addKicker,
  buttonRect,
  drawBackdrop,
  drawFocusRing,
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
  private mirror: ResultMirror | null = null;
  private focusRing: GameObjects.Graphics | null = null;

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
    this.events.once(Scenes.Events.SHUTDOWN, () => {
      this.mirror?.destroy();
      this.mirror = null;
    });
    reportDemoView({ phase: 'result', selectedIds: response.outcome.shieldIds });
    drawBackdrop(this);
    if (!prefersReducedMotion()) {
      this.cameras.main.fadeIn(240, 6, 17, 29);
    }

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
    const shareLabel =
      response.share.status === 'ready'
        ? `Post score as u/${session.username}`
        : isDemoMode()
          ? 'Comments unavailable in the offline demo'
          : 'Score sharing locked pending review';
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
    this.mountMirror(session, response, shareButton, privacyButton, shareLabel);
  }

  /** The accessible mirror of this screen: score, facts and the same buttons. */
  private mountMirror(
    session: SessionResponse,
    response: ScoreResponse,
    shareButton: GameObjects.Container,
    privacyButton: GameObjects.Container,
    shareLabel: string
  ): void {
    const outcome = response.outcome;
    const labels = new Map(session.puzzle.nodes.map((node) => [node.id, node.label]));
    const points = (value: number) => value.toLocaleString('en-US');
    this.focusRing = this.add.graphics().setDepth(40);
    this.mirror = mountResult({
      title: `${outcome.optimal ? 'Optimal containment' : 'Incident report'}: ${points(outcome.score)} points`,
      facts: [
        outcome.optimal ? 'You found today’s best cut.' : 'The blast was partially contained.',
        `Personal best: ${points(response.bestScore)} points.`,
        `Blast contained: ${outcome.containment}%.`,
        `Critical endpoints saved: ${outcome.savedCriticalIds.length}.`,
        `Day streak: ${response.streak}.`,
        `Your circuit breakers: ${outcome.shieldIds.map((id) => labels.get(id) ?? id).join(' and ') || 'none'}.`,
        `${outcome.savedIds.length} assets saved, ${outcome.failedIds.length} failed. Protocol: ${session.puzzle.protocolLabel}.`,
        `Community containment: ${response.community.responders} of ${response.community.goal} responders, ${response.community.percent}% of the target.`,
      ],
      leaderboard: response.leaderboard
        .slice(0, 8)
        .map(
          (entry) =>
            `Rank ${entry.rank}: u/${entry.username}, ${points(entry.score)} points${entry.username === session.username ? ' (you)' : ''}.`
        ),
      preview: `${isDemoMode() ? 'Local score summary, not posted' : 'Optional score comment'}: ${response.commentPreview} ${response.share.message}`,
      votes: PROTOCOLS.map((protocol, index) => ({
        id: protocol.id,
        label: protocol.label,
        count: session.protocolVotes.find((vote) => vote.id === protocol.id)?.count ?? 0,
        rect: buttonRect(884, 493 + index * 51, 328, 40),
      })),
      selected: session.selectedProtocol,
      actions: [
        {
          id: 'replay',
          label: 'Replay the map',
          rect: buttonRect(510, 650, 250, 42),
          onPress: () => this.scene.start('DailyGame'),
        },
        {
          id: 'share',
          label: shareLabel,
          rect: buttonRect(215, 650, 306, 42),
          disabled: response.share.status !== 'ready',
          onPress: () => {
            if (response.share.status === 'ready') {
              void this.postScore(shareButton, response.share.token);
            }
          },
        },
        {
          id: 'privacy',
          label: 'Privacy: delete my saved game data',
          rect: buttonRect(884, 681, 328, 22),
          onPress: () => {
            void this.deleteSavedData(privacyButton);
          },
        },
      ],
      onVote: (id) => {
        void this.castVote(id);
      },
      onFocusRect: (rect) => drawFocusRing(this.focusRing, rect),
    });
    announce(scoreMessage(outcome, response.bestScore, response.streak));
  }

  /** The status line under the votes, said aloud as well. */
  private say(text: string, color: string): void {
    this.voteStatus?.setText(text).setColor(color);
    announce(text);
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
    this.mirror?.setVotes(selected, new Map(votes.map((vote) => [vote.id, vote.count])), false);
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
    this.say('Recording your community vote…', COLORS.amberText);
    try {
      const response = await voteForProtocol(protocol);
      this.renderVoteButtons(response.selectedProtocol, response.protocolVotes);
      this.say(isDemoMode() ? 'Local vote recorded. No community data was changed.' : 'Vote recorded. Tomorrow’s map will reflect the winner.', COLORS.cyanText);
    } catch (error) {
      for (const button of this.voteButtons) {
        button.setInteractive({ useHandCursor: true });
      }
      this.say(error instanceof Error ? error.message : 'Could not record vote', COLORS.coralText);
    }
  }

  private async postScore(button: GameObjects.Container, token: string): Promise<void> {
    button.disableInteractive();
    setButtonLabel(button, 'POSTING ONE COMMENT…');
    this.mirror?.setAction('share', 'Posting one comment…', true);
    try {
      const response = await shareScore(token);
      const done = response.status === 'posted' ? 'Posted to comments' : 'Already posted today';
      setButtonLabel(button, `${done.toUpperCase()}  ✓`);
      this.mirror?.setAction('share', done, true);
      announce(`${done}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Post failed';
      setButtonLabel(button, message.toUpperCase());
      button.setInteractive({ useHandCursor: true });
      this.mirror?.setAction('share', `Post failed: ${message}. Try again`);
      announce(message);
    }
  }

  private async deleteSavedData(button: GameObjects.Container): Promise<void> {
    if (!this.deleteArmed) {
      this.deleteArmed = true;
      reportDemoView({ phase: 'confirm-delete' });
      setButtonLabel(button, 'PRESS AGAIN TO DELETE SAVED DATA');
      this.mirror?.setAction('privacy', 'Press again to delete saved data');
      this.say('Deletion removes scores, votes, streak, and share drafts from app storage. Press again to confirm.', COLORS.amberText);
      return;
    }

    button.disableInteractive();
    setButtonLabel(button, 'DELETING SAVED DATA…');
    this.mirror?.setAction('privacy', 'Deleting saved data…', true);
    try {
      await deleteGameData();
      reportDemoView({ phase: 'result', selectedIds: [] });
      setButtonLabel(button, 'SAVED GAME DATA DELETED  ✓');
      this.mirror?.setAction('privacy', 'Saved game data deleted', true);
      this.say('Your app-stored game data has been removed.', COLORS.cyanText);
    } catch (error) {
      this.deleteArmed = false;
      setButtonLabel(button, 'PRIVACY · DELETE MY SAVED GAME DATA');
      button.setInteractive({ useHandCursor: true });
      this.mirror?.setAction('privacy', 'Privacy: delete my saved game data');
      this.say(error instanceof Error ? error.message : 'Could not delete saved data', COLORS.coralText);
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
