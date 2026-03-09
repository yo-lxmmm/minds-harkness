
export enum InteractionType {
  OPEN_QUESTION = 'OPEN_QUESTION',
  DIRECT_QUESTION = 'DIRECT_QUESTION',
  OPEN_STATEMENT = 'OPEN_STATEMENT',
  DIRECT_RESPONSE = 'DIRECT_RESPONSE',
  FACILITATOR_META = 'FACILITATOR_META'
}

export interface Participant {
  id: string;
  name: string; // Used for map display (initials)
  initials: string;
  fullName: string; // Used for report display
  scannedName: string; // Original name from transcript (for regex)
  isFacilitator: boolean;
}

export interface Interaction {
  id: string;
  speakerId: string;
  recipientId: string | 'GROUP' | null;
  type: InteractionType;
  text: string;
  summary: string;
  timestamp?: string;
}

export interface ParticipantProfile {
  participantId: string;
  totalContributions: number;
  breakdown: Record<InteractionType, number>;
  role: string;
  sixHats: string[];
  primaryInteractedWith: string;
}

export interface AnalysisReport {
  summary: {
    what: string;
    why: string;
    starConcept: string;
  };
  profiles: ParticipantProfile[];
  keyInsights: string[];
  divergence: string;
  coherence: string;
  unfinishedThreads: string[];
  silentMoments: string[];
  negativeSpace: string;
}

export interface HarknessAnalysis {
  interactions: Interaction[];
  report: AnalysisReport;
}
