export type TrainingType = 'autoThoughtCatch' | 'cognitiveRestructuring';

export interface BaseTrainingData {
  id: string;
  type: TrainingType;
  createdAt: string; // ISO String
  updatedAt: string;
  title: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

// 自動思考キャッチトレーニングLv.1
export interface AutoThoughtCatchData extends BaseTrainingData {
  type: 'autoThoughtCatch';
  step0_event?: string; // 自由に記入できる出来事欄
  step1_fact: string;
  step2_emotions: string[];
  step3_physicalReactions: string;
  step4_interpretation: string;
  step5_action: string;
  nrs_score: number | null; // 0-10
  ai_suggested_thoughts?: string[]; // AIが提案した自動思考案
}

// 認知再構成法 Lv.1
export interface CognitiveRestructuringData extends BaseTrainingData {
  type: 'cognitiveRestructuring';
  step1_autoThought: string;
  step2_score: number | null;
  step3_1_emotions: string[];
  step3_2_actions: string[];
  step4_evidence: string;
  step5_rewrite: string;
  step6_counterEvidence: string;
  step7_1_emotions: string[];
  step7_2_actions: string[];
  step8_score: number | null;
  step9_cognitiveDistortions: string[];
}

export type TrainingData = AutoThoughtCatchData | CognitiveRestructuringData;
