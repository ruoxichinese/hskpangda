// Chỉ dùng khi build bản demo 1 file: nhúng file nghe của đề thi vào trang (data URI)
export const inlinedAudio = import.meta.glob('../../public/audio/**/exam/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
