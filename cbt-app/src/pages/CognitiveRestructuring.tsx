import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Copy, Check, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { SelectWithAdd } from '../components/SelectWithAdd';
import { NRSSlider } from '../components/NRSSlider';
import { TrainingGuide } from '../components/TrainingGuide';
import { CheckboxList, type CheckboxOption } from '../components/CheckboxList';
import { AITitleGenerator } from '../components/AITitleGenerator';
import { useAutoSave } from '../hooks/useAutoSave';
import { saveTraining, getTrainingCountByType, getAllTrainings, generateId } from '../utils/storage';
import { generateTitleFromThought } from '../utils/ai';
import { useAuth } from '../hooks/useAuth';
import type { CognitiveRestructuringData, TrainingData } from '../types';
import { PopoverGuide } from '../components/PopoverGuide';

const INITIAL_EMOTIONS_3 = [
  '怖い', '見捨てられた', '怒り', 'イライラ', '焦り', '混乱', '落ち込む', 
  '絶望', '恥ずかしい', 'ムカムカ', '無力', 'お手上げ', '傷ついた', 
  '我慢できない', '不適切', '不安', '無視(見たくない)', 'やきもち', 
  '緊張', '拒絶', '憤り', '切羽詰まった', '悲しい', '心配'
];

const INITIAL_ACTIONS_3 = [
  '反論する', 'けなす', '責める', 'いじめる', '文句を言う', '泣く', '飲む', '食べる', 
  '逃げる', '戦う', 'あらさがしをする', '諦める', '噂話をする', '侮辱する', '邪魔する', 
  '眠れない', '操作する', '執着する', '過度に働く', '自分を哀れむ', '説教する', '偽る', 
  '先延ばしにする', '買う', '閉じる', '喫煙する', '苦しむ', '閉じこもる', 'さけぶ'
];

const INITIAL_EMOTIONS_7 = [
  '穏やか', '済んだ', '思いやり', 'つながり', '好奇心', '気づきをえた', '夢中', '楽しい', 
  '自由', '感謝', '正直', '謙虚', '親密', '光', '愛', '楽観的', '平和', '無邪気', '落ち着いた', 
  '安心', '静か', '支えられた', '寛大な', '真実', '理解'
];

const INITIAL_ACTIONS_7 = [
  '受け入れる', '謝る', '近づく', '正直になる', '深呼吸する', '明確にする', '伝える', 
  '与える', 'ゆだねる', '運動する', '探検する', '集中する', 'やり通す', '許す', '感謝する', 
  '聴く', '償いをする', '人脈を作る', '聞く', '参加する', '優先順位を決める', '接触する', 
  '共有する', '話す', '助ける'
];

const COGNITIVE_DISTORTIONS: CheckboxOption[] = [
  { id: '1', label: '1. 全か無か思考', description: '「成功か失敗か」「いいか悪いか」の両極端で物事を考え、多くはネガティブな方を選択する。二分法的思考。' },
  { id: '2', label: '2. 過度の一般化', description: '否定的なできごとがひとつでもあると、すべてを否定的に捉える。そしてその先もそうなると考える。' },
  { id: '3', label: '3. 心のフィルター', description: '誰かの批判など、否定的なことにとらわれ、ものごとのポジティブな面が何も見えなくなってしまう。' },
  { id: '4', label: '4. マイナス化思考', description: 'ポジティブなできごとがあっても、「こんなの誰にでもできる」などと軽視する。他者からの賞賛も拒絶する。' },
  { id: '5', label: '5. 結論の飛躍', description: '根拠なく結論を決めつける。人の内心を決めつける「読心術」と、物事の結果を決めつける「先読み」がある。' },
  { id: '6', label: '6. 拡大解釈と過小評価', description: '自分の欠点や失敗を過大に捉え、長所や成功を過小に捉える。結果的に自己評価が低くなりみじめな気分に。' },
  { id: '7', label: '7. 感情的決めつけ', description: '感情こそが事実の反映で、根拠であると考える。「こんなに気が滅入るのはうまくいっていない証拠だ。」など。' },
  { id: '8', label: '8. すべき思考', description: '「〜べきだ」「〜でなければ」などとマイルールに頑なにとらわれ、高すぎる基準で自分を追い込んだりする。' },
  { id: '9', label: '9. レッテル貼り', description: '「過度の一般化の」の極端な形。「自分はダメ人間」「あの人は冷淡」などの極端なレッテルを自分や他人に張る。' },
  { id: '10', label: '10. 個人化', description: '自分に関係のないことまで、自分に関連付ける。ネガティブなできごとを自分のせいにし、罪悪感で落ち込む。' },
];

export function CognitiveRestructuring() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isCopied, setIsCopied] = React.useState(false);
  const [isGuideOpen, setIsGuideOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = React.useState(false);
  const DRAFT_KEY = id ? `edit_cognitiveRestructuring_${id}` : 'draft_cognitiveRestructuring_new';
  
  const { user } = useAuth();
  const [trainingCount, setTrainingCount] = React.useState(0);
  const [historyList, setHistoryList] = React.useState<TrainingData[]>([]);
  const [formData, setFormData, clearDraft] = useAutoSave<Partial<CognitiveRestructuringData>>(DRAFT_KEY, {
    title: '',
    step1_autoThought: '',
    step2_score: null,
    step3_1_emotions: [],
    step3_2_actions: [],
    step4_evidence: '',
    step5_rewrite: '',
    step6_counterEvidence: '',
    step7_1_emotions: [],
    step7_2_actions: [],
    step8_score: null,
    step9_cognitiveDistortions: []
  });

  React.useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const count = await getTrainingCountByType(user.uid, 'cognitiveRestructuring');
      setTrainingCount(count);
      
      const all = await getAllTrainings(user.uid);
      setHistoryList(all.filter(t => t.type === 'cognitiveRestructuring'));
      
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

  const handleChange = (key: keyof CognitiveRestructuringData, value: any) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleGenerateTitle = async () => {
    const sourceText = formData.step1_autoThought;
    if (!sourceText) {
      alert('先にSTEP1の自動思考を入力してください。');
      return;
    }
    
    setIsGeneratingTitle(true);
    try {
      const generated = await generateTitleFromThought(sourceText);
      handleChange('title', generated);
    } catch (err) {
      alert('タイトルの生成に失敗しました。');
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleCopy = () => {
    const text = `【トレーニング】認知再構成法 Lv.1
【日付】${new Date(formData.createdAt || new Date()).toLocaleDateString('ja-JP')}
【No】${id ? getHistoryIndex(id) : trainingCount + 1}
【タイトル】${formData.title || '無題'}

■ STEP1 自動思考
${formData.step1_autoThought || 'なし'}

■ STEP2 思考の採点 (0〜10)
${formData.step2_score ?? '未入力'}

■ STEP3 感情と行動
・感情: ${formData.step3_1_emotions?.length ? formData.step3_1_emotions.join('、') : 'なし'}
・行動: ${formData.step3_2_actions?.length ? formData.step3_2_actions.join('、') : 'なし'}

■ STEP4 根拠
${formData.step4_evidence || 'なし'}

■ STEP5 認知の歪みの書き換え
${formData.step5_rewrite || 'なし'}

■ STEP6 反証
${formData.step6_counterEvidence || 'なし'}

■ STEP7 感情と行動の把握
・感情: ${formData.step7_1_emotions?.length ? formData.step7_1_emotions.join('、') : 'なし'}
・行動: ${formData.step7_2_actions?.length ? formData.step7_2_actions.join('、') : 'なし'}

■ STEP8 思考の再採点
${formData.step8_score ?? '未入力'}

■ STEP9 推論の誤り
${formData.step9_cognitiveDistortions?.length ? formData.step9_cognitiveDistortions.map(id => COGNITIVE_DISTORTIONS.find(d => d.id === id)?.label).join('、') : 'なし'}`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleComplete = async () => {
    setIsSaving(true);
    let finalTitle = formData.title;

    if (!finalTitle || finalTitle.trim() === '') {
      const sourceText = formData.step1_autoThought || '';
      finalTitle = sourceText ? await generateTitleFromThought(sourceText) : '無題';
    }

    const finalData: CognitiveRestructuringData = {
      id: formData.id || generateId(),
      ...formData,
      title: finalTitle,
      type: 'cognitiveRestructuring' as const,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      step2_score: formData.step2_score ?? null,
      step8_score: formData.step8_score ?? null,
      step9_cognitiveDistortions: formData.step9_cognitiveDistortions || []
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
    <div className="animate-fade-in pb-24">
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
          <h1 className="font-bold text-gray-900 text-xl mb-1">認知再構成法 Lv.1</h1>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <span>{new Date(formData.createdAt || new Date()).toLocaleDateString('ja-JP')}</span>
            <span className="text-gray-300">|</span>
            <span>No.{id ? getHistoryIndex(id) : trainingCount + 1}</span>
          </div>
        </div>
      </header>

      <TrainingGuide type="cognitiveRestructuring" isOpen={isGuideOpen} />

      <div className="glass-card mb-6">
        <AITitleGenerator 
          currentTitle={formData.title || ''} 
          onTitleChange={(val) => handleChange('title', val)}
          onGenerate={handleGenerateTitle}
          isGenerating={isGeneratingTitle}
        />
      </div>

      <div className="glass-card mb-6 space-y-8">
        
        {/* STEP 1 */}
        <div className="form-group">
          <label className="form-label text-lg flex flex-col items-start gap-1">
            <span>STEP1 自動思考</span>
            <PopoverGuide content="感情を動かす自動思考を書きます。「〜べき」「〜べきでない」「きっと〜に違いない」「〜だったらどうしよう」という言い回しを使うと書きやすいです。" />
          </label>
          <textarea
            className="form-textarea"
            placeholder="例) デート代は男性が出すべきだ、など"
            value={formData.step1_autoThought || ''}
            onChange={(e) => handleChange('step1_autoThought', e.target.value)}
          />
        </div>

        {/* STEP 2 */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          <NRSSlider
            label="STEP2 思考の採点：その考えはどれだけ現実味がありますか？"
            value={formData.step2_score ?? null}
            onChange={(val) => handleChange('step2_score', val)}
            minLabel="【疑わしい】"
            maxLabel="【正しいと信じている】"
          />
        </div>

        {/* STEP 3 */}
        <div className="space-y-6">
          <h3 className="heading-2 text-lg border-b pb-2 flex flex-col items-start gap-1">
            <span>STEP3 感情と行動の把握</span>
            <PopoverGuide content="その思考が頭をよぎった時に感じている感情と、とってしまう行動を選びます。" />
          </h3>
          <SelectWithAdd
            label="3-1 感情の把握"
            options={INITIAL_EMOTIONS_3}
            selectedValues={formData.step3_1_emotions || []}
            onChange={(vals) => handleChange('step3_1_emotions', vals)}
            showDictionary={true}
          />
          <SelectWithAdd
            label="3-2 行動の把握"
            options={INITIAL_ACTIONS_3}
            selectedValues={formData.step3_2_actions || []}
            onChange={(vals) => handleChange('step3_2_actions', vals)}
          />
        </div>

        {/* STEP 4 */}
        <div className="form-group">
          <label className="form-label text-lg flex flex-col items-start gap-1">
            <span>STEP4 根拠</span>
            <PopoverGuide content="その考えが正しいことを裏付ける根拠を思いつく限り書きます。「なぜならば〜だから」の形式でサンドイッチして書くと書きやすいです。" />
          </label>
          <textarea
            className="form-textarea"
            value={formData.step4_evidence || ''}
            onChange={(e) => handleChange('step4_evidence', e.target.value)}
          />
        </div>

        {/* STEP 5 */}
        <div className="form-group">
          <label className="form-label text-lg flex flex-col items-start gap-1">
            <span>STEP5 リライト</span>
            <PopoverGuide content="STEP1で書いた文章を「部分否定文」に書き換えます。いきなり部分否定文にするのが難しい場合は、まず「否定文（反対の主張）」に直してください。その後、文頭に「現時点では」「その時点では」「その状況では」といった枕詞をつけると部分否定文が完成します。" />
          </label>
          <textarea
            className="form-textarea"
            placeholder="例) 現実的には、その状況では、デート代を男性が出すのは好ましくない"
            value={formData.step5_rewrite || ''}
            onChange={(e) => handleChange('step5_rewrite', e.target.value)}
          />
        </div>

        {/* STEP 6 */}
        <div className="form-group">
          <label className="form-label text-lg flex flex-col items-start gap-1">
            <span>STEP6 反証</span>
            <PopoverGuide content="STEP5で作った部分否定文が、仮に「正しい（現実的）」としたら、それを示す証拠（反証）を思いつく限り書きます。想像を膨らませすぎた根拠のない妄想や断定は避け、「〜かもしれない」「〜の可能性がある」といった含みを持たせた表現を使うのがコツです。過去の経験など、わずかでも根拠がある可能性を探ってください。" />
          </label>
          <p className="text-muted mb-2 text-sm">
            仮にその否定文の方が、「現時点では」「その時点では」「その状況では」正しい（現実的）としたら、それを示す根拠を書いてください。（思いつく限り書いてください。）
          </p>
          <textarea
            className="form-textarea"
            value={formData.step6_counterEvidence || ''}
            onChange={(e) => handleChange('step6_counterEvidence', e.target.value)}
          />
        </div>

        {/* STEP 7 */}
        <div className="space-y-6">
          <h3 className="heading-2 text-lg border-b pb-2 flex flex-col items-start gap-1">
            <span>STEP7 感情と行動の把握</span>
            <PopoverGuide content="否定文を現実的と考えた時に湧き上がる感情（7-1）と、その時に取れる行動（7-2）を選択します。白黒思考ではなく、「代替案を示す」「少し譲歩する」など、グラデーションのある行動（優先順位を決めた行動）を選択できるようになることを目指します。" />
          </h3>
          <SelectWithAdd
            label="7-1 感情の把握：否定文を現実的と考えた時に湧き上がる感情はどれでしょうか。"
            options={INITIAL_EMOTIONS_7}
            selectedValues={formData.step7_1_emotions || []}
            onChange={(vals) => handleChange('step7_1_emotions', vals)}
            showDictionary={true}
          />
          <SelectWithAdd
            label="7-2 行動の把握：その感情が生まれた時にあなたがとる行動はどれでしょうか。"
            options={INITIAL_ACTIONS_7}
            selectedValues={formData.step7_2_actions || []}
            onChange={(vals) => handleChange('step7_2_actions', vals)}
          />
        </div>

        {/* STEP 8 */}
        <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
          <div className="mb-2 flex flex-col items-start gap-1">
            <span className="font-bold text-gray-700">STEP8 思考の採点</span>
            <PopoverGuide content="STEP1の文章を再度読み、今どれだけ現実味があるかを再採点します。他の考え方を探ることで点数が下がることが多いですが、下がらなくても問題ありません。" />
          </div>
          <NRSSlider
            label="STEP1で書いた文章をもう一度読んでください。その考えは、今、どれだけ真実味がありますか？"
            value={formData.step8_score !== undefined ? formData.step8_score : null}
            onChange={(val) => handleChange('step8_score', val)}
            minLabel="【疑わしい】"
            maxLabel="【正しいと信じている】"
          />
        </div>
        
        {/* STEP 9 */}
        <div className="form-group mt-8 border-t pt-8">
          <div className="mb-2 flex flex-col items-start gap-1">
            <span className="font-bold text-gray-700 text-lg">STEP9 推論の誤り</span>
            <PopoverGuide content="STEP1の自動思考が、10個の「推論の誤り」（白黒思考、心のフィルター、結論の飛躍など）のどれに当てはまるかチェックします。現実のデータ不足を脳が勝手に都合のいい物語で補って生じる錯覚（自分の思考の癖）を振り返ります。" />
          </div>
          <CheckboxList
            label="STEP1で書いた、あなたの自動思考にはどんな推論の誤りがありますか？（複数選択）"
            options={COGNITIVE_DISTORTIONS}
            selectedIds={formData.step9_cognitiveDistortions || []}
            onChange={(vals) => handleChange('step9_cognitiveDistortions', vals)}
          />
        </div>

      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 flex justify-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-3xl flex justify-between items-center gap-2">
          <span className="text-xs text-gray-500 hidden sm:inline w-full sm:w-auto mb-2 sm:mb-0">
            ※入力内容は自動保存されています
          </span>
          <button onClick={handleComplete} disabled={isSaving} className="btn bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-md ml-auto flex items-center gap-2">
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

