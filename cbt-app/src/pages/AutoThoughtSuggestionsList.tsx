import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lightbulb, Star, ExternalLink, Loader2, Filter } from 'lucide-react';
import { getAllTrainings, saveTraining } from '../utils/storage';
import { useAuth } from '../hooks/useAuth';
import type { AutoThoughtCatchData, AISuggestedThought } from '../types';

interface SuggestionItem {
  trainingId: string;
  trainingTitle: string;
  createdAt: string;
  thought: AISuggestedThought;
}

export function AutoThoughtSuggestionsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SuggestionItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'bookmarked'>('all');

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const all = await getAllTrainings(user.uid);
        const autoThoughts = all.filter(t => t.type === 'autoThoughtCatch' && !t.isDeleted) as AutoThoughtCatchData[];
        
        // 新しい順にソート
        autoThoughts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const listItems: SuggestionItem[] = [];
        
        autoThoughts.forEach(t => {
          if (t.ai_thoughts && t.ai_thoughts.length > 0) {
            t.ai_thoughts.forEach(thought => {
              listItems.push({
                trainingId: t.id,
                trainingTitle: t.title || '無題',
                createdAt: t.createdAt,
                thought
              });
            });
          }
        });
        
        setItems(listItems);
      } catch (err) {
        console.error('Failed to load suggestions', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  const toggleBookmark = async (item: SuggestionItem) => {
    if (!user) return;
    
    try {
      // 画面のStateを先に更新
      setItems(prev => prev.map(i => {
        if (i.thought.id === item.thought.id) {
          return { ...i, thought: { ...i.thought, isBookmarked: !i.thought.isBookmarked } };
        }
        return i;
      }));

      // DBを更新
      const all = await getAllTrainings(user.uid);
      const targetTraining = all.find(t => t.id === item.trainingId) as AutoThoughtCatchData;
      if (targetTraining && targetTraining.ai_thoughts) {
        const updatedAiThoughts = targetTraining.ai_thoughts.map(t => {
          if (t.id === item.thought.id) {
            return { ...t, isBookmarked: !t.isBookmarked };
          }
          return t;
        });
        
        await saveTraining(user.uid, {
          ...targetTraining,
          ai_thoughts: updatedAiThoughts,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to toggle bookmark', err);
      alert('ブックマークの保存に失敗しました。');
    }
  };

  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(item => item.thought.isBookmarked);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-20">
      <header className="app-header mb-6 p-4 border-b border-gray-100 flex-col items-start gap-4 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
        <div className="flex w-full items-center justify-between">
          <button 
            onClick={() => navigate('/')} 
            className="text-gray-500 hover:text-gray-800 transition-colors p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={24} />
          </button>
        </div>
        <div>
          <h1 className="font-bold text-gray-900 text-xl flex items-center gap-2">
            <Lightbulb size={24} className="text-blue-500" />
            自動思考案リスト
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            AIが過去の記録から分析した、あなたの思考のクセの候補です。
          </p>
        </div>
        
        {/* フィルタータブ */}
        <div className="flex bg-gray-100 p-1 rounded-lg w-full">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            すべて
          </button>
          <button
            onClick={() => setFilter('bookmarked')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
              filter === 'bookmarked' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Star size={14} className={filter === 'bookmarked' ? 'fill-yellow-400 text-yellow-400' : ''} />
            ブックマーク
          </button>
        </div>
      </header>

      <div className="px-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            {filter === 'bookmarked' ? (
              <>
                <Star size={32} className="mx-auto mb-3 text-gray-300" />
                <p>ブックマークされた<br/>自動思考案はありません。</p>
              </>
            ) : (
              <>
                <Lightbulb size={32} className="mx-auto mb-3 text-gray-300" />
                <p>まだ自動思考案がありません。<br/>新しい記録を作成するとAIが分析します。</p>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredItems.map((item) => (
              <div 
                key={item.thought.id} 
                className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-all relative group"
              >
                <div className="flex justify-between items-start mb-2 gap-4">
                  <p className="text-gray-800 text-base font-medium leading-relaxed pt-1">
                    {item.thought.text}
                  </p>
                  <button
                    onClick={() => toggleBookmark(item)}
                    className="shrink-0 p-2 -mr-2 -mt-2 rounded-full hover:bg-yellow-50 transition-colors"
                  >
                    <Star 
                      size={22} 
                      className={item.thought.isBookmarked ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 group-hover:text-yellow-200'} 
                    />
                  </button>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <div className="text-xs text-gray-400 flex flex-col">
                    <span className="truncate max-w-[200px] text-gray-500 font-medium">{item.trainingTitle}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString('ja-JP')}</span>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/training/auto-thought/${item.trainingId}`)}
                    className="text-xs flex items-center gap-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                  >
                    元の記録を見る <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
