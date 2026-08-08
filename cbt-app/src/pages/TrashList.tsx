import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trash, Calendar, AlertTriangle } from 'lucide-react';
import { getTrashTrainings, restoreFromTrash, permanentlyDelete } from '../utils/storage';
import { useAuth } from '../hooks/useAuth';
import type { TrainingData } from '../types';

export function TrashList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trashItems, setTrashItems] = useState<TrainingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrash = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const trash = await getTrashTrainings(user.uid);
        setTrashItems(trash);
      } catch (error) {
        console.error('Failed to fetch trash items:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrash();
  }, [user]);

  const handleRestore = async (id: string) => {
    if (!user) return;
    await restoreFromTrash(user.uid, id);
    setTrashItems(trashItems.filter(t => t.id !== id));
  };

  const handlePermanentlyDelete = async (id: string) => {
    if (!user) return;
    if (window.confirm('この記録を完全に削除しますか？\nこの操作は取り消せません。')) {
      await permanentlyDelete(user.uid, id);
      setTrashItems(trashItems.filter(t => t.id !== id));
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

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
          <Trash size={20} className="text-gray-500" shrink-0="true" />
          <span className="truncate">ごみ箱</span>
        </h2>
        
        <p className="text-sm text-gray-500 mb-6 flex items-center gap-1.5 bg-gray-50 p-3 rounded-lg border border-gray-100">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          ごみ箱に移動したデータはここから復元するか、完全に削除することができます。
        </p>

        {loading ? (
          <div className="text-center py-8 text-gray-400">
            読み込み中...
          </div>
        ) : trashItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-3">
            <Trash size={48} className="text-gray-200" />
            <p>ごみ箱は空です</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {trashItems.map((item) => (
              <div 
                key={item.id} 
                className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex flex-col gap-3 shadow-sm relative overflow-hidden"
              >
                <div className="flex flex-col overflow-hidden w-full">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-gray-600 text-sm truncate pr-2">
                      {item.title || '(無題)'}
                    </span>
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full shrink-0">
                      {item.type === 'autoThoughtCatch' ? '自動思考' : '認知再構成'}
                    </span>
                  </div>
                  
                  {/* 一部の内容をプレビュー表示 */}
                  <p className="text-xs text-gray-400 truncate mb-2 pr-2">
                    {item.type === 'autoThoughtCatch' 
                      ? (item.step1_fact || item.step0_event || '未入力') 
                      : (item.step1_autoThought || '未入力')}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      作成日: {formatDate(item.createdAt || item.updatedAt)}
                    </span>
                    {item.deletedAt && (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        削除日: {formatDate(item.deletedAt)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-gray-200">
                  <button 
                    onClick={() => handleRestore(item.id)}
                    className="btn btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                  >
                    <RefreshCw size={14} />
                    元に戻す
                  </button>
                  <button 
                    onClick={() => handlePermanentlyDelete(item.id)}
                    className="btn btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  >
                    <Trash size={14} />
                    完全に削除
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
