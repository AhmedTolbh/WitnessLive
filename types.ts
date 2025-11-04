
export interface Citation {
  uri: string;
  title: string;
}

export interface TranscriptEntry {
  id: number;
  source: 'user' | 'ai';
  text: string;
  isFinal: boolean;
  citations?: Citation[];
}