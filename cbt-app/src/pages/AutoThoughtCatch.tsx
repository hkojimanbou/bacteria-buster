import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Sparkles, Loader2 } from 'lucide-react';
import { SelectWithAdd } from '../components/SelectWithAdd';
import { NRSSlider } from '../components/NRSSlider';
import { TrainingGuide } from '../components/TrainingGuide';
import { AITitleGenerator } from '../components/AITitleGenerator';
import { useAutoSave } from '../hooks/useAutoSave';
import { saveTraining, getTrainingCountByType, generateId, getAllTrainings } from '../utils/storage';
import { generateTitleFromEvent, extractFactsFromEvent } from '../utils/ai';
import { useAuth } from '../hooks/useAuth';
import type { AutoThoughtCatchData, TrainingData } from '../types';
import { PopoverGuide } from '../components/PopoverGuide';

const INITIAL_EMOTIONS = [
  '怖い', '見捨てられた', '怒り', 'イライラ', '焦り', '混乱', '落ち込む', 
  '絶望', '恥ずかしい', 'ムカムカ', '無力', 'お手上げ', '傷ついた', 
  '我慢できない', '不適切', '不安', '無視(見たくない)', 'やきもち', 
  '緊張', '拒絶', '憤り', '切羽詰まった', '悲しい', '心配'
];

export function AutoThoughtCatch() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isCopied, setIsCopied] = React.useState(false);
  const [isGuideOpen, setIsGuideOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = React.useState(false);
  const [isExtractingFact, setIsExtractingFact] = React.useState(false);
  
  // 未完了の一時保存データ用キー
  const DRAFT_KEY = id ? `edit_autoThoughtCatch_${id}` : 'draft_autoThoughtCatch_new';
  
  const { user } = useAuth();
  const [trainingCount, setTrainingCount] = React.useState(0);
  const [historyList, setHistoryList] = React.useState<TrainingData[]>([]);
  const [formData, setFormData, clearDraft] = useAutoSave<Partial<AutoThoughtCatchData>>(DRAFT_KEY, {
    title: '',
    step0_event: '',
    step1_fact: '',
    step2_emotions: [],
    step3_physicalReactions: '',
    step4_interpretation: '',
    step5_action: '',
    nrs_score: null
  });

  React.useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const count = await getTrainingCountByType(user.uid, 'autoThoughtCatch');
      setTrainingCount(count);
      
      const all = await getAllTrainings(user.uid);
      setHistoryList(all.filter(t => t.type === 'autoThoughtCatch'));
      
      if (id) {
        const found = all.find(t => t.id === id);
        if (found) {
          setFormData(found);
        }
      }
    };
    loadData();
  }, [id, user, setFormData]);

  const getHistoryIndex = (currentId: string) => {
    const index = historyList.findIndex(t => t.id === currentId);
    if (index === -1) return trainingCount + 1;
    return historyList.length - index;
  };

  const formatText = () => {
    return `【トレーニング】自動思考キャッチトレーニング Lv.1
【日付】${new Date(formData.createdAt || new Date()).toLocaleDateString('ja-JP')}
【No】${id ? getHistoryIndex(id) : trainingCount + 1}
【タイトル】${formData.title || '無題'}

■ STEP0 出来事（自由記入）
${formData.step0_event || 'なし'}

■ STEP1 事実
${formData.step1_fact || 'なし'}

■ STEP2 感情や気分
${formData.step2_emotions?.length ? formData.step2_emotions.join('、') : 'なし'}

■ STEP3 身体の反応
${formData.step3_physicalReactions || 'なし'}

■ STEP4 解釈
${formData.step4_interpretation || 'なし'}

■ STEP5 行動
${formData.step5_action || 'なし'}

■ NRS数値評価スケール (0〜10)
${formData.nrs_score !== null && formData.nrs_score !== undefined ? formData.nrs_score : '未入力'}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formatText()).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => alert('コピーに失敗しました。'));
  };

  const handleChange = (field: keyof AutoThoughtCatchData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateTitle = async () => {
    const sourceText = formData.step0_event || formData.step1_fact;
    if (!sourceText) {
      alert('先にSTEP0またはSTEP1を入力してください。');
      return;
    }
    
    setIsGeneratingTitle(true);
    try {
      const generated = await generateTitleFromEvent(sourceText);
      handleChange('title', generated);
    } catch (err) {
      alert('タイトルの生成に失敗しました。');
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleExtractFact = async () => {
    if (!formData.step0_event) {
      alert('先にSTEP0の出来事を入力してください。');
      return;
    }

    setIsExtractingFact(true);
    try {
      const extracted = await extractFactsFromEvent(formData.step0_event);
      handleChange('step1_fact', extracted);
    } catch (err) {
      alert('事実の抽出に失敗しました。');
    } finally {
      setIsExtractingFact(false);
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    let finalTitle = formData.title;

    if (!finalTitle || finalTitle.trim() === '') {
      const sourceText = formData.step0_event || formData.step1_fact || '';
      finalTitle = sourceText ? await generateTitleFromEvent(sourceText) : '無題';
    }

    const finalData: AutoThoughtCatchData = {
      id: formData.id || generateId(),
      type: 'autoThoughtCatch',
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: finalTitle,
      step0_event: formData.step0_event || '',
      step1_fact: formData.step1_fact || '',
      step2_emotions: formData.step2_emotions || [],
      step3_physicalReactions: formData.step3_physicalReactions || '',
      step4_interpretation: formData.step4_interpretation || '',
      step5_action: formData.step5_action || '',
      nrs_score: formData.nrs_score !== undefined ? formData.nrs_score : null
    };

    if (!user) {
      alert('ログインが必要です。');
      setIsSaving(false);
      return;
    }

    await saveTraining(user.uid, finalData);
    clearDraft();
    setFormData({});
    setTrainingCount(prev => prev + 1);
    setIsSaving(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    alert('保存しました！');
    navigate('/');
  };

  return (
    <div className="animate-fade-in pb-20">
      <header className="app-header flex-col items-start gap-3 mb-6 p-4">
        <div className="flex w-full items-center gap-2">
          <button onClick={() => navigate('/')} className="btn btn-secondary py-2 px-3 text-sm flex-1 font-medium">
            戻る
          </button>
          <button 
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="btn btn-secondary py-2 px-3 text-sm flex-1 font-medium"
          >
            ガイド
          </button>
          <button onClick={handleCopy} className={`btn py-2 px-3 text-sm flex-1 font-medium ml-auto ${isCopied ? 'bg-green-500 hover:bg-green-600 text-white border-none' : 'btn-secondary'}`}>
            {isCopied ? 'コピー済' : 'テキストコピー'}
          </button>
        </div>
        
        <div className="flex flex-col w-full mt-2">
          <h1 className="font-bold text-gray-900 text-xl mb-1">自動思考キャッチLv.1</h1>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <span>{new Date(formData.createdAt || new Date()).toLocaleDateString('ja-JP')}</span>
            <span className="text-gray-300">|</span>
            <span>No.{id ? getHistoryIndex(id) : trainingCount + 1}</span>
          </div>
        </div>
      </header>

      <TrainingGuide type="autoThoughtCatch" isOpen={isGuideOpen} />

      <div className="glass-card mb-6">
        <AITitleGenerator 
          currentTitle={formData.title || ''} 
          onTitleChange={(val) => handleChange('title', val)}
          onGenerate={handleGenerateTitle}
          isGenerating={isGeneratingTitle}
        />
      </div>

      <div className="glass-card mb-6 space-y-8">
        
        <div className="form-group bg-blue-50/50 p-4 rounded-lg border border-blue-100">
          <label className="form-label text-lg flex flex-col items-start gap-1">
            <span>STEP0 出来事（自由に記入）</span>
            <PopoverGuide content="まずは感情が動いた時の出来事を、あなたの感じたまま、解釈や感情を含めて自由に書いてみましょう。後からAIを使って客観的な事実に整理することができます。" />
          </label>
          <p className="text-muted mb-2">感情が動いた時の出来事（まずは自由に）</p>
          <textarea
            className="form-textarea"
            placeholder="例) 上司に理不尽に怒られてイライラした！推しが結婚して絶望した..."
            value={formData.step0_event || ''}
            onChange={(e) => handleChange('step0_event', e.target.value)}
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleExtractFact}
              disabled={isExtractingFact || !formData.step0_event}
              className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 font-medium shadow-sm"
            >
              {isExtractingFact ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              AIで客観的な事実を抽出
            </button>
          </div>
        </div>

        <div className="flex justify-center -my-4">
          <div className="w-1 h-8 bg-gray-200"></div>
        </div>

        <div className="form-group">
          <label className="form-label text-lg flex flex-col items-start gap-1">
            <span>STEP1 事実</span>
            <PopoverGuide content="自分の解釈や印象（色眼鏡）を一切含めず、その場にいなかった誰が見てもわかる客観的な事実のみを書きます。事実と解釈をごっちゃにしないことが最も重要です（例：「寂しく一人で」「不愛想に言われて」などは解釈です）。" />
          </label>
          <p className="text-muted mb-2">客観的な事実（AIの抽出結果を添削・編集できます）</p>
          <textarea
            className="form-textarea"
            placeholder="例) 書類にミスがあり取引先から指摘された、推しが結婚した..."
            value={formData.step1_fact || ''}
            onChange={(e) => handleChange('step1_fact', e.target.value)}
          />
        </div>

        <SelectWithAdd
          label={
            <span className="flex flex-col items-start gap-1">
              <span>STEP2 感情や気分</span>
              <PopoverGuide content="その事実が起きた時に湧いた感情をリストから選ぶか、書き足します。" />
            </span>
          }
          options={INITIAL_EMOTIONS}
          selectedValues={formData.step2_emotions || []}
          onChange={(vals) => handleChange('step2_emotions', vals)}
          placeholder="該当するものを選ぶか、書き足す..."
          showDictionary={true}
        />

        <div className="form-group">
          <label className="form-label text-lg flex flex-col items-start gap-1">
            <span>STEP3 身体の反応</span>
            <PopoverGuide content="身体に現れる生理現象（胸がドキドキする、一瞬固まるなど）を書きます。実際に起きていることだけでなく、「胸のあたりがもやっとする」「重い感じがする」といった感覚的なものでも構いません。" />
          </label>
          <p className="text-muted mb-2">身体に現れる生理現象</p>
          <textarea
            className="form-textarea"
            placeholder="例) 胸がドキドキする、顔が赤くなる..."
            value={formData.step3_physicalReactions || ''}
            onChange={(e) => handleChange('step3_physicalReactions', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label text-lg flex flex-col items-start gap-1">
            <span>STEP4 解釈</span>
            <PopoverGuide content="出来事が起きた瞬間に考えたことや、頭に浮かんできた映像を書きます。" />
          </label>
          <p className="text-muted mb-2">考えたこと、浮かんできたイメージ</p>
          <textarea
            className="form-textarea"
            placeholder="例) 上司が間違っている、自分はダメな人間だ..."
            value={formData.step4_interpretation || ''}
            onChange={(e) => handleChange('step4_interpretation', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label text-lg flex flex-col items-start gap-1">
            <span>STEP5 行動</span>
            <PopoverGuide content="その時に自分が実際に取った行動や振る舞いを客観的に書きます。" />
          </label>
          <p className="text-muted mb-2">行動したこと</p>
          <textarea
            className="form-textarea"
            placeholder="例) 上司に反論した、スマホでYouTubeを見た..."
            value={formData.step5_action || ''}
            onChange={(e) => handleChange('step5_action', e.target.value)}
          />
        </div>

        <hr className="border-gray-200" />

        <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100">
          <p className="text-sm text-gray-700 font-medium mb-4">
            ※STEP2〜5が面倒な時はまとめて書いてもOK。<br/>
            さらに面倒なら、該当する痛み（ストレス）レベルを選択してください。
          </p>
          <NRSSlider
            label="(2) NRS (numeric rating scale) 数値評価スケール"
            value={formData.nrs_score !== undefined ? formData.nrs_score : null}
            onChange={(val) => handleChange('nrs_score', val)}
            minLabel="痛みがない"
            maxLabel={"想像できる\n最大の痛み"}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 flex justify-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-3xl flex justify-between items-center gap-2">
          <span className="text-xs text-gray-500 w-full sm:w-auto mb-2 sm:mb-0">
            ※入力内容は自動保存されています
          </span>
          <button onClick={handleComplete} disabled={isSaving} className="btn btn-primary ml-auto flex items-center gap-2">
            {isSaving ? (
              <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> 保存中...</>
            ) : (
              <><Save size={18} /> 確定</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
