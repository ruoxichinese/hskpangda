// Chỉ dùng khi build bản demo 1 file: nhúng file nghe (bản nén nhẹ trong .demo-audio/) vào trang
export const inlinedAudio = import.meta.glob('../../.demo-audio/audio/**/exam/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
