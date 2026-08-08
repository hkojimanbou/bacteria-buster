import { GoogleGenAI } from '@google/genai';

/**
 * Gemini API クライアントの初期化
 */
const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEYが設定されていません。');
  }
  return new GoogleGenAI({ apiKey: apiKey });
};

/**
 * 出来事（STEP0など）からタイトルを生成する（15文字以下）
 * @param eventText 出来事のテキスト
 * @returns 15文字以下のタイトル
 */
export async function generateTitleFromEvent(eventText: string): Promise<string> {
  if (!eventText.trim()) return '無題';
  if (eventText.length <= 15) return eventText;

  try {
    const ai = getAiClient();
    const prompt = `以下の「感情が動いた出来事」のテキストを要約し、15文字以下の簡潔なタイトルを作成してください。\n要約結果（タイトル）だけを出力し、それ以外の説明や記号は含めないでください。\n\nテキスト：\n${eventText}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    });
    
    let title = response.text || '';
    title = title.replace(/^["'\[\]（）「」『』【】\s]+|["'\[\]（）「」『』【】\s]+$/g, '');
    return title.slice(0, 15);
  } catch (error: any) {
    console.error('AI Title Generation Error:', error);
    return `エラー: ${error?.message?.slice(0, 30) || '不明なエラー'}`;
  }
}

/**
 * 自動思考からタイトルを生成する（15文字以下ならそのまま、それ以上なら要約）
 * @param thoughtText 自動思考のテキスト
 * @returns 15文字以下のタイトル
 */
export async function generateTitleFromThought(thoughtText: string): Promise<string> {
  if (!thoughtText.trim()) return '無題';
  if (thoughtText.length <= 15) return thoughtText;

  try {
    const ai = getAiClient();
    const prompt = `以下の「自動思考」のテキストを要約し、15文字以下の簡潔なタイトルを作成してください。\n要約結果（タイトル）だけを出力し、それ以外の説明や記号は含めないでください。\n\nテキスト：\n${thoughtText}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    });
    
    let title = response.text || '';
    title = title.replace(/^["'\[\]（）「」『』【】\s]+|["'\[\]（）「」『』【】\s]+$/g, '');
    return title.slice(0, 15);
  } catch (error: any) {
    console.error('AI Title Generation Error:', error);
    return `エラー: ${error?.message?.slice(0, 30) || '不明なエラー'}`;
  }
}

/**
 * STEP0（自由に記入された出来事）から客観的な事実のみを抽出する
 * @param eventText 自由に記入された出来事
 * @returns 客観的な事実だけを抽出したテキスト
 */
export async function extractFactsFromEvent(eventText: string): Promise<string> {
  if (!eventText.trim()) return '';

  try {
    const ai = getAiClient();
    const prompt = `あなたは優秀な認知行動療法のカウンセラーです。\n以下の「クライアントが自由に記入した出来事」から、クライアントの主観、解釈、感情（色眼鏡）を一切排除し、「その場にいなかった誰が見てもわかる客観的な事実」だけを抽出した簡潔な文章を作成してください。\n抽出された客観的事実の文章だけを出力してください。箇条書きにはせず、短い文章にしてください。\n\nテキスト：\n${eventText}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    });
    
    return (response.text || '').trim();
  } catch (error: any) {
    console.error('AI Fact Extraction Error:', error);
    return `抽出エラー: ${error?.message?.slice(0, 30) || '不明なエラー'}`;
  }
}
