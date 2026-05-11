export type SessionStatus =
  | 'uploading'
  | 'transcribing'
  | 'analyzing'
  | 'ready'
  | 'failed';

export type DiagramType =
  | 'flowchart'
  | 'mindmap'
  | 'architecture'
  | 'decision_tree'
  | 'sequence';

export interface Analysis {
  title: string;
  diagram_type: DiagramType;
  reasoning: string;
  mermaid_code: string;
  summary: string;
  key_concepts: string[];
}

export interface Session {
  id: string;
  user_id: string;
  status: SessionStatus;
  audio_path: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  title: string | null;
  diagram_type: DiagramType | null;
  diagram_reasoning: string | null;
  mermaid_code: string | null;
  summary: string | null;
  key_concepts: string[] | null;
  share_token: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
