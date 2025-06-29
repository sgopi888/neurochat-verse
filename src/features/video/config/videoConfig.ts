
export const VIDEO_CONFIG = {
  enabled: true, // Easy on/off switch - change to false to disable entire video system
  provider: 'tavus',
  replicaId: 'r6ae5b6efc9d',
  autoPlay: true,
  popupPosition: 'bottom-right' as const,
  maxWidth: 400,
  maxHeight: 300
};

export type VideoConfig = typeof VIDEO_CONFIG;
