import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Calendar, BookOpen, Trash2 } from 'lucide-react';
import { getAllTrainings, moveToTrash } from '../utils/storage';
import { useAuth } from '../hooks/useAuth';
import type { TrainingData } from '../types';

export function HistoryList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const [history, setHistory] = useState<TrainingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const all = await getAllTrainings(user.uid);
        const targetType = type === 'auto-thought' ? 'autoThoughtCatch' : 'cognitiveRestructuring';
        setHistory(all.filter(t => t.type === targetType));
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [type, user]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!user) return;
    if (window.confirm('この記録をごみ箱に移動しますか？')) {
      await moveToTrash(user.uid, id);
      setHistory(history.filter(t => t.id !== id));
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const isAutoThought = type === 'auto-thought';
  const title = isAutoThought ? '過去の自動思考キャッチトレーニングLv.1' : '過去の認知再構成法Lv.1';
  const linkPrefix = isAutoThought ? '/training/auto-thought/' : '/training/cognitive/';

  return (
    <div className="animate-fade-in pb-20">
      <header className="app-header mb-6 p-4">
        <button onClick={() => navigate('/')} className="btn btn-secondary py-2 px-3 flex items-center justify-center gap-1 shrink-0 h-auto min-w-[4rem] w-fit">
          <ArrowLeft size={18} />
          <span className="text-[12px] whitespace-nowrap leading-none">戻る</span>
        </button>
      </header>

      <div className="glass-card mx-4 sm:mx-0">
        <h2 className="heading-2 flex items-center gap-2 border-b border-gray-100 pb-3 mb-4 text-[15px] sm:text-[1rem]">
          <BookOpen size={20} className={isAutoThought ? "text-indigo-500" : "text-emerald-500"} shrink-0="true" />
          <span className="truncate">{title}</span>
        </h2>

        {loading ? (
          <div className="text-center py-8 text-gray-400">
            読み込み中...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            記録がありません
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((item, index) => (
              <Link 
                to={`${linkPrefix}${item.id}`} 
                key={item.id} 
                className="p-4 border border-gray-100 rounded-lg bg-white hover:bg-gray-50 transition-colors flex justify-between items-center group shadow-sm relative overflow-hidden"
              >
                <div className="flex flex-col overflow-hidden w-full pr-12">
                  <span className="font-bold text-gray-800 text-sm truncate pr-2 mb-2">
                    No.{history.length - index} | {item.title || '(無題)'}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full w-fit">
                      <Calendar size={12} />
                      {formatDate(item.createdAt || item.updatedAt)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center h-full absolute right-3 gap-2">
                  <button 
                    onClick={(e) => handleDelete(e, item.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
                  >
                    <Trash2 size={18} />
                  </button>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-indigo-500 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
