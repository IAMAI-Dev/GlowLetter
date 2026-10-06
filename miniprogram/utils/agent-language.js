// Keep in sync with the other deployment's language helper (covered by parity tests).
// Count Chinese characters and English words; quoted names/code are not language instructions.
function detectLanguage(text, fallback = 'en') {
  const value = String(text || '');
  const prose = value.replace(/`[^`]*`|"[^"\n]*"|“[^”]*”/g, ' ');
  const counts = (content) => ({
    chinese: (content.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length,
    english: (content.match(/[A-Za-z]+(?:'[A-Za-z]+)*/g) || []).length
  });
  let score = counts(prose);
  if (!score.chinese && !score.english) score = counts(value);
  if (score.chinese > score.english) return 'zh-CN';
  if (score.english > score.chinese) return 'en';
  if (score.chinese) return 'zh-CN';
  return fallback === 'zh-CN' ? 'zh-CN' : 'en';
}
module.exports = { detectLanguage };
