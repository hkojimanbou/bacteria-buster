import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, BookOpen, ChevronRight, PlusCircle, LogOut, Sparkles, Loader2, Lightbulb } from 'lucide-react';
import { getTrainingCountByType, migrateLocalDataToFirestore, getAllTrainings, saveTraining, generateId } from '../utils/storage';
import { suggestAutoThoughts } from '../utils/ai';
import { useAuth } from '../hooks/useAuth';
import type { AutoThoughtCatchData } from '../types';

export function Home() {
  const { user, loading, loginWithGoogle, logout } = useAuth();
  const [counts, setCounts] = useState({ autoThought: 0, cognitive: 0 });
  const [isMigrating, setIsMigrating] = useState(false);
  const [localDataCount, setLocalDataCount] = useState(0);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);

  useEffect(() => {
    if (!user) {
      const oldData = localStorage.getItem('cbt_history');
      if (oldData) {
        try {
          const parsed = JSON.parse(oldData);
          setLocalDataCount(parsed.length);
        } catch(e) {}
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchDataAndProcess = async () => {
      if (!user) return;
      
      try {
        setIsMigrating(true);
        // スマホなどのローカルデータをFirestoreに移行
        await migrateLocalDataToFirestore(user.uid);
        
        const allTrainings = await getAllTrainings(user.uid);
        
        const autoThoughts = allTrainings.filter(t => t.type === 'autoThoughtCatch') as AutoThoughtCatchData[];
        const cognitves = allTrainings.filter(t => t.type === 'cognitiveRestructuring');
        
        setCounts({ autoThought: autoThoughts.length, cognitive: cognitves.length });
        
        // バックグラウンドで未生成のものを一括生成
        processUnanalyzedData(autoThoughts, user.uid);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsMigrating(false);
      }
    };

    fetchDataAndProcess();
  }, [user]);

  const processUnanalyzedData = async (autoThoughts: AutoThoughtCatchData[], uid: string) => {
    // まだ新しい形式の ai_thoughts が生成されていないものを抽出
    const unanalyzed = autoThoughts.filter(t => !t.ai_thoughts || t.ai_thoughts.length === 0);
    
    // もし古い文字列配列 (ai_suggested_thoughts) があれば、それを新しい形式に変換して保存するだけ
    for (const t of unanalyzed) {
      if (t.ai_suggested_thoughts && t.ai_suggested_thoughts.length > 0) {
        const migratedData: AutoThoughtCatchData = {
          ...t,
          ai_thoughts: t.ai_suggested_thoughts.map(text => ({
            id: generateId(),
            text,
            isBookmarked: false
          }))
        };
        await saveTraining(uid, migratedData);
      }
    }

    // 本当に未生成（文字列配列すらない）のもの
    const trulyUnanalyzed = autoThoughts.filter(
      t => (!t.ai_thoughts || t.ai_thoughts.length === 0) && (!t.ai_suggested_thoughts || t.ai_suggested_thoughts.length === 0)
    );

    if (trulyUnanalyzed.length === 0) return;

    setIsGeneratingBackground(true);
    
    // 直列で順番にAIリクエストを送る（レートリミット対策）
    for (const training of trulyUnanalyzed) {
      try {
        const suggestions = await suggestAutoThoughts(
          training.step0_event || '',
          training.step1_fact || '',
          training.step2_emotions || [],
          training.step3_physicalReactions || '',
          training.step5_action || ''
        );
        
        const ai_thoughts = suggestions.map(text => ({
          id: generateId(),
          text,
          isBookmarked: false
        }));

        const updatedData = {
          ...training,
          ai_thoughts,
          updatedAt: new Date().toISOString()
        };
        
        await saveTraining(uid, updatedData);
        
        // APIの連続呼び出しを避けるため少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error('Background analysis failed for ID:', training.id, err);
      }
    }
    
    setIsGeneratingBackground(false);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center p-4 animate-fade-in text-center">
        <BrainCircuit size={64} className="text-indigo-500 mb-6" />
        <h1 className="text-3xl font-bold mb-2">CBT Gym</h1>
        <p className="text-gray-600 mb-12">心の筋トレを習慣にして、しなやかな考え方を身につけましょう。</p>
        
        {localDataCount > 0 && (
          <div className="bg-red-50 border-2 border-red-500 text-red-700 p-4 rounded-lg mb-8 w-full max-w-md animate-pulse">
            <p className="font-bold text-lg mb-1">【未同期のデータが見つかりました！】</p>
            <p className="text-sm">このブラウザに <strong>{localDataCount}件</strong> の過去の記録が安全に残っています。<br/>ログインすると自動でクラウドに保存され、消えることはなくなります。</p>
          </div>
        )}

        <div className="w-full max-w-xs flex flex-col gap-4 mx-auto">
          <button 
            onClick={loginWithGoogle}
            className="w-full btn flex items-center justify-center gap-3 bg-white text-gray-800 hover:bg-gray-50 py-3.5 rounded-full shadow-md font-bold transition-transform hover:scale-[1.02] active:scale-95 border border-gray-100"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Googleでログイン
          </button>
          <p className="text-xs text-gray-500 font-medium">
            ログインすると、どのデバイスからでも記録を引き継げます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in relative pb-10">
      <header className="app-header flex justify-between items-start">
        <div>
          <h1 className="header-title flex items-center gap-2">
            <BrainCircuit size={28} />
            CBT Training
          </h1>
          <p className="header-subtitle mt-1">認知行動療法セルフケアアプリ</p>
        </div>
        <button 
          onClick={logout} 
          className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 bg-white/50 px-2 py-1 rounded border border-gray-200"
        >
          <LogOut size={12} />
          ログアウト
        </button>
      </header>

      <div className="glass-card mb-8">
        <h2 className="heading-2 flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
          <PlusCircle size={20} className="text-indigo-500" />
          新しいトレーニングを始める
        </h2>
        
        {isMigrating && (
          <div className="text-sm text-indigo-500 mb-4 bg-indigo-50 p-2 rounded text-center">
            データを同期しています...
          </div>
        )}
        
        <div className="flex flex-col gap-4">
          <Link to="/training/auto-thought" className="btn btn-primary justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-none">
            <div className="flex flex-col items-start text-left">
              <span className="font-bold text-lg">自動思考キャッチトレーニング Lv.1</span>
              <span className="text-sm text-indigo-100 font-normal mt-1 leading-snug">
                ざわついた時の「自動思考」に気づき、事実・解釈・感情・身体反応・行動に切分ける練習。
              </span>
            </div>
            <ChevronRight size={24} className="shrink-0 ml-2" />
          </Link>

          <Link to="/training/cognitive" className="btn btn-primary justify-between p-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-none">
            <div className="flex flex-col items-start text-left">
              <span className="font-bold text-lg">認知再構成法 Lv.1</span>
              <span className="text-sm text-emerald-100 font-normal mt-1 leading-snug">
                自動思考を深掘りし、現実的で柔軟な考え方に切り替える練習。
              </span>
            </div>
            <ChevronRight size={24} className="shrink-0 ml-2" />
          </Link>
        </div>
      </div>

      <div className="glass-card">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h2 className="heading-2 flex items-center gap-2">
            <BookOpen size={20} className="text-indigo-500" />
            過去の記録
          </h2>
          {isGeneratingBackground && (
            <span className="text-xs text-indigo-500 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-full animate-pulse">
              <Loader2 size={12} className="animate-spin" /> AI分析中...
            </span>
          )}
        </div>
        
        <div className="flex flex-col gap-4">
          <Link to="/history/auto-thought-suggestions" className="btn btn-primary justify-between p-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 border-none shadow-md">
            <div className="flex flex-col items-start text-left">
              <span className="font-bold text-lg flex items-center gap-2">
                <Lightbulb size={20} /> 私の思考パターン
              </span>
              <span className="text-sm text-blue-50 font-normal mt-1 leading-snug">
                AIが分析したあなたの思考のクセを振り返る
              </span>
            </div>
            <ChevronRight size={24} className="shrink-0 ml-2" />
          </Link>

          <Link to="/history/auto-thought" className="btn btn-primary justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-none">
            <div className="flex flex-col items-start text-left">
              <span className="font-bold text-lg">過去の自動思考キャッチトレーニング Lv.1</span>
              <span className="text-sm text-indigo-100 font-normal mt-1">
                全 {counts.autoThought} 件の記録
              </span>
            </div>
            <ChevronRight size={24} />
          </Link>

          <Link to="/history/cognitive" className="btn btn-primary justify-between p-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-none">
            <div className="flex flex-col items-start text-left">
              <span className="font-bold text-lg">過去の認知再構成法 Lv.1</span>
              <span className="text-sm text-emerald-100 font-normal mt-1">
                全 {counts.cognitive} 件の記録
              </span>
            </div>
            <ChevronRight size={24} />
          </Link>
          
          <Link to="/trash" className="btn btn-secondary justify-between p-4 mt-2 bg-gray-50 hover:bg-gray-100 border border-gray-200">
            <div className="flex flex-col items-start text-left">
              <span className="font-bold text-gray-700">ごみ箱</span>
              <span className="text-xs text-gray-500 font-normal mt-1">
                削除した記録の復元・完全削除
              </span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
