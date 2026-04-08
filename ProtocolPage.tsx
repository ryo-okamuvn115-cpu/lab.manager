import { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useData } from '../hooks/useData';
import { storageAPI } from '../lib/storage';
import type { Protocol } from '../types';

export default function ProtocolPage() {
  const { data: protocols, loading, refetch } = useData(() => storageAPI.getProtocols());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (confirm('このプロトコルを削除しますか？')) {
      storageAPI.deleteProtocol(id);
      refetch();
    }
  };

  const getDifficultyColor = (difficulty: Protocol['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (difficulty: Protocol['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return '簡単';
      case 'medium':
        return '中程度';
      case 'hard':
        return '難しい';
      default:
        return difficulty;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">プロトコル</h1>
        <button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition">
          <Plus size={20} />
          新しいプロトコルを追加
        </button>
      </div>

      {/* プロトコル一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : (protocols || []).length > 0 ? (
        <div className="space-y-4">
          {protocols!.map((protocol) => (
            <div key={protocol.id} className="bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === protocol.id ? null : protocol.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-900">{protocol.title}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm text-gray-600">{protocol.category}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${getDifficultyColor(protocol.difficulty)}`}>
                      {getDifficultyLabel(protocol.difficulty)}
                    </span>
                    <span className="text-sm text-gray-600">⏱️ {protocol.estimatedTime}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(protocol.id);
                    }}
                    className="text-red-600 hover:text-red-800 transition p-2 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={20} />
                  </button>
                  {expandedId === protocol.id ? (
                    <ChevronUp size={24} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={24} className="text-gray-400" />
                  )}
                </div>
              </button>

              {/* 展開時の詳細 */}
              {expandedId === protocol.id && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <p className="text-gray-700 mb-4">{protocol.description}</p>

                  {/* ステップ */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3">手順</h4>
                    <div className="space-y-3">
                      {protocol.steps.map((step) => (
                        <div key={step.stepNumber} className="bg-white rounded p-4 border border-gray-200">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                              {step.stepNumber}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-900">{step.title}</h5>
                              <p className="text-sm text-gray-600 mt-1">{step.description}</p>

                              {step.materials && step.materials.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold text-gray-700">必要な材料:</p>
                                  <ul className="text-sm text-gray-600 list-disc list-inside">
                                    {step.materials.map((material, idx) => (
                                      <li key={idx}>{material}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {step.duration && (
                                <p className="text-xs text-gray-500 mt-2">⏱️ {step.duration}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>プロトコルがまだありません</p>
        </div>
      )}

      {/* 最終更新時刻 */}
      <div className="mt-8 text-center text-xs text-gray-500">
        最終更新: {new Date().toLocaleTimeString('ja-JP')}
      </div>
    </div>
  );
}
