import { createContext, useContext } from 'react';
import { getLevel } from './data';

/** true = được dùng giọng đọc máy cho các nút nghe không có file âm thanh */
export const VoiceContext = createContext(true);
export const useVoice = () => useContext(VoiceContext);
export const levelHasVoice = (levelId?: string) => !levelId || getLevel(levelId)?.tts !== false;
