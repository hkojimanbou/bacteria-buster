import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, BookOpen, ChevronRight, PlusCircle, LogOut, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { getTrainingCountByType, migrateLocalDataToFirestore, getAllTrainings, saveTraining } from '../utils/storage';
import { suggestAutoThoughts } from '../utils/ai';
import { useAuth } from '../hooks/useAuth';
import type { AutoThoughtCatchData } from '../types';

export function Home() {
  const { user, loading, loginWithGoogle, logout } = useAuth();
  const [counts, setCounts] = useState({ autoThought: 0, cognitive: 0 });
  const [isMigrating, setIsMigrating] = useState(false);
  const [localDataCount, setLocalDataCount] = useState(0);
  
  // AI分析用
  const [latestAutoThought, setLatestAutoThought] = useState<AutoThoughtCatchData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setIsMigrating(true);
        // スマホなどのローカルデータをFirestoreに移行
        await migrateLocalDataToFirestore(user.uid);
        
        const allTrainings = await getAllTrainings(user.uid);
        
        const autoThoughts = allTrainings.filter(t => t.type === 'autoThoughtCatch') as AutoThoughtCatchData[];
        const cognitves = allTrainings.filter(t => t.type === 'cognitiveRestructuring');
        
        setCounts({ autoThought: autoThoughts.length, cognitive: cognitves.length });
        
        if (autoThoughts.length > 0) {
          setLatestAutoThought(autoThoughts[0]); // 最新の1件
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsMigrating(false);
      }
    };

    fetchData();
  }, [user]);

  const handleAnalyzeAutoThought = async () => {
    if (!user || !latestAutoThought) return;
    
    setIsAnalyzing(true);
    try {
      const suggestions = await suggestAutoThoughts(
        latestAutoThought.step0_event || '',
        latestAutoThought.step1_fact || '',
        latestAutoThought.step2_emotions || [],
        latestAutoThought.step3_physicalReactions || '',
        latestAutoThought.step5_action || '' // 過去の記録からの推定なので行動も加味
      );
      
      const updatedData = {
        ...latestAutoThought,
        ai_suggested_thoughts: suggestions,
        updatedAt: new Date().toISOString()
      };
      
      await saveTraining(user.uid, updatedData);
      setLatestAutoThought(updatedData);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('分析に失敗しました。');
    } finally {
      setIsAnalyzing(false);
    }
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

            </div>
            <ChevronRight size={24} />
          </Link>

          <Link to="/training/cognitive" className="btn btn-primary justify-between p-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-none">
            <div className="flex flex-col items-start text-left">
              <span className="font-bold text-lg">認知再構成法 Lv.1</span>

            </div>
            <ChevronRight size={24} />
          </Link>
        </div>
      </div>
      
      {/* AI自動思考分析BOX */}
      {latestAutoThought && (
        <div className="glass-card mb-8 border-2 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-indigo-100 p-1.5 rounded-full text-indigo-600">
              <Sparkles size={20} />
            </div>
            <h2 className="font-bold text-gray-800 text-lg">自動思考を分析</h2>
          </div>
          
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            最新の記録「<span className="font-semibold text-gray-800">{latestAutoThought.title || '無題'}</span>」から、あなたの心の奥底に隠れている自動思考（思い込みのクセ）をAIが分析して提案します。振り返りの参考にしてみてください。
          </p>

          {latestAutoThought.ai_suggested_thoughts && latestAutoThought.ai_suggested_thoughts.length > 0 ? (
            <div className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm">
              <p className="text-xs font-bold text-indigo-500 mb-3 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> AIからの提案
              </p>
              <ul className="space-y-3">
                {latestAutoThought.ai_suggested_thoughts.map((thought, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2 leading-relaxed">
                    <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                    <span>{thought}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <button 
              onClick={handleAnalyzeAutoThought}
              disabled={isAnalyzing}
              className="w-full btn bg-indigo-600 hover:bg-indigo-700 text-white border-none py-3 shadow-md flex items-center justify-center gap-2 transition-all"
            >
              {isAnalyzing ? (
                <><Loader2 size={18} className="animate-spin" /> 分析中...</>
              ) : (
                <><Sparkles size={18} /> 分析を実行する</>
              )}
            </button>
          )}
        </div>
      )}

      <div className="glass-card">
        <h2 className="heading-2 flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
          <BookOpen size={20} className="text-indigo-500" />
          過去の記録
        </h2>
        
        <div className="flex flex-col gap-4">
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
