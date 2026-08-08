import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { getAllTrainings } from '../utils/storage';
import type { AutoThoughtCatchData, CognitiveRestructuringData, TrainingData } from '../types';

// 認知の歪みマスタ
const COGNITIVE_DISTORTIONS_MAP: Record<string, string> = {
  '1': '1. 全か無か思考',
  '2': '2. 過度の一般化',
  '3': '3. 心のフィルター',
  '4': '4. マイナス化思考',
  '5': '5. 結論の飛躍',
  '6': '6. 拡大解釈と過小評価',
  '7': '7. 感情的決めつけ',
  '8': '8. すべき思考',
  '9': '9. レッテル貼り',
  '10': '10. 個人化',
};

export function TrainingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<TrainingData | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const all = getAllTrainings();
    const found = all.find(t => t.id === id);
    if (found) {
      setData(found);
    }
  }, [id]);

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p>データが見つかりませんでした。</p>
        <button onClick={() => navigate('/')} className="btn btn-secondary mt-4">ホームに戻る</button>
      </div>
    );
  }

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatText = () => {
    if (data.type === 'autoThoughtCatch') {
      const d = data as AutoThoughtCatchData;
      return `【トレーニング】自動思考キャッチトレーニング Lv.1
【日付】${formatDate(d.createdAt)}
【タイトル】${d.title || '無題'}

■ STEP1 事実
${d.step1_fact || 'なし'}

■ STEP2 感情や気分
${d.step2_emotions?.length > 0 ? d.step2_emotions.join('、') : 'なし'}

■ STEP3 身体の反応
${d.step3_physicalReactions || 'なし'}

■ STEP4 解釈
${d.step4_interpretation || 'なし'}

■ STEP5 行動
${d.step5_action || 'なし'}

■ NRS数値評価スケール (0〜10)
${d.nrs_score !== null && d.nrs_score !== undefined ? d.nrs_score : '未入力'}`;
    } 
    
    if (data.type === 'cognitiveRestructuring') {
      const d = data as CognitiveRestructuringData;
      return `【トレーニング】認知再構成法 Lv.1
【日付】${formatDate(d.createdAt)}
【タイトル】${d.title || '無題'}

■ STEP1 自動思考
${d.step1_autoThought || 'なし'}

■ STEP2 思考の採点 (0〜10)
${d.step2_score !== null && d.step2_score !== undefined ? d.step2_score : '未入力'}

■ STEP3 感情と行動
・感情: ${d.step3_1_emotions?.length > 0 ? d.step3_1_emotions.join('、') : 'なし'}
・行動: ${d.step3_2_actions?.length > 0 ? d.step3_2_actions.join('、') : 'なし'}

■ STEP4 根拠
${d.step4_evidence || 'なし'}

■ STEP5 認知の歪みの書き換え
${d.step5_rewrite || 'なし'}

■ STEP6 反証
${d.step6_counterEvidence || 'なし'}

■ STEP7 感情と行動の把握
・感情: ${d.step7_1_emotions?.length > 0 ? d.step7_1_emotions.join('、') : 'なし'}
・行動: ${d.step7_2_actions?.length > 0 ? d.step7_2_actions.join('、') : 'なし'}

■ STEP8 思考の再採点 (0〜10)
${d.step8_score !== null && d.step8_score !== undefined ? d.step8_score : '未入力'}

■ STEP9 推論の誤り(認知の歪み)
${d.step9_cognitiveDistortions?.length > 0 ? d.step9_cognitiveDistortions.map(id => COGNITIVE_DISTORTIONS_MAP[id] || '').join('\\n') : 'なし'}`;
    }

    return '';
  };

  const handleCopy = () => {
    const text = formatText();
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => {
      if (textRef.current) {
        textRef.current.select();
        document.execCommand('copy');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    });
  };

  return (
    <div className="animate-fade-in pb-20">
      <header className="app-header mb-6">
        <button onClick={() => navigate('/')} className="btn btn-secondary py-1 px-3 text-sm">
          <ArrowLeft size={16} /> ホームへ
        </button>
        <div className="text-right">
          <h1 className="header-title text-xl">トレーニング詳細</h1>
          <p className="header-subtitle text-xs">{formatDate(data.createdAt)}</p>
        </div>
      </header>

      <div className="glass-card mb-6 border-indigo-100">
        <div className="flex justify-between items-center border-b border-indigo-100 pb-3 mb-4">
          <h2 className="heading-2 text-indigo-900 m-0">コミュニティ投稿用テキスト</h2>
          <button 
            onClick={handleCopy}
            className={`btn py-1.5 px-4 text-sm flex items-center gap-2 transition-all ${
              isCopied ? 'bg-green-500 hover:bg-green-600 text-white border-none' : 'btn-primary'
            }`}
          >
            {isCopied ? (
              <><Check size={16} /> コピーしました！</>
            ) : (
              <><Copy size={16} /> テキストをコピー</>
            )}
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          下の枠内のテキストは自動で生成されています。「コピー」ボタンを押して、そのままコミュニティ等に貼り付けてご活用ください。
        </p>

        <textarea
          ref={textRef}
          readOnly
          className="w-full h-[60vh] p-4 bg-white/80 border border-indigo-100 rounded-lg text-sm font-mono text-gray-800 focus:outline-none resize-none leading-relaxed"
          value={formatText()}
        />
      </div>
    </div>
  );
}
