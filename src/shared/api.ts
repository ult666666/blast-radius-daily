import type { DailyPuzzle, ProtocolId, ShieldOutcome } from './game';

export type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
};

export type CommunityStatus = {
  responders: number;
  goal: number;
  percent: number;
};

export type ProtocolVote = {
  id: ProtocolId;
  count: number;
};

export type SessionResponse = {
  type: 'session';
  username: string;
  puzzle: DailyPuzzle;
  leaderboard: LeaderboardEntry[];
  community: CommunityStatus;
  streak: number;
  bestScore: number | null;
  selectedProtocol: ProtocolId | null;
  protocolVotes: ProtocolVote[];
};

export type ScoreRequest = {
  shieldIds: string[];
};

export type ScoreResponse = {
  type: 'score';
  outcome: ShieldOutcome;
  leaderboard: LeaderboardEntry[];
  community: CommunityStatus;
  streak: number;
  bestScore: number;
  commentPreview: string;
  share: ShareAvailability;
};

export type ShareAvailability =
  | {
      status: 'ready';
      token: string;
      message: string;
    }
  | {
      status: 'disabled';
      token: null;
      message: string;
    };

export type VoteRequest = {
  protocol: ProtocolId;
};

export type VoteResponse = {
  type: 'vote';
  selectedProtocol: ProtocolId;
  protocolVotes: ProtocolVote[];
};

export type ShareRequest = {
  token: string;
};

export type ShareResponse = {
  type: 'share';
  status: 'posted' | 'already-posted';
  commentId: string | null;
};

export type DeleteDataResponse = {
  type: 'delete-data';
  status: 'deleted';
};

export type ApiError = {
  status: 'error';
  message: string;
};
