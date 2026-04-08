import { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import ErrorBanner from '@/components/ErrorBanner';
import { useData } from '@/hooks/useData';
import { storageAPI } from '@/lib/api';
import { PROTOCOL_DIFFICULTY_LABELS, type Protocol } from '@/lib/types';

const DIFFICULTY_COLORS: Record<Protocol['difficulty'], string> = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
};

function showFeatureNotice() {
  window.alert('This update focuses on shared sync. Add and edit forms can be added next.');
}

export default function ProtocolsBoard() {
  const fetchProtocols = useCallback(() => storageAPI.getProtocols(), []);
  const { data: protocols, loading, error, refetch } = useData(fetchProtocols, { refreshInterval: 4000 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this protocol?')) {
      return;
    }

    try {
      setDeletingId(id);
      await storageAPI.deleteProtocol(id);
      await refetch();
      setExpandedId((current) => (current === id ? null : current));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Protocols</h1>
        <button
          onClick={showFeatureNotice}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white transition hover:bg-purple-700"
        >
          <Plus size={20} />
          New Protocol
        </button>
      </div>

      {error && <ErrorBanner message={error.message} />}

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading...</div>
      ) : (protocols ?? []).length > 0 ? (
        <div className="space-y-4">
          {protocols!.map((protocol) => {
            const isExpanded = expandedId === protocol.id;

            return (
              <div key={protocol.id} className="overflow-hidden rounded-lg bg-white shadow transition hover:shadow-md">
                <div className="flex items-center justify-between gap-4 p-6">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : protocol.id)}
                    className="flex flex-1 items-center justify-between gap-4 text-left"
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{protocol.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span className="text-sm text-gray-600">{protocol.category}</span>
                        <span
                          className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${DIFFICULTY_COLORS[protocol.difficulty]}`}
                        >
                          {PROTOCOL_DIFFICULTY_LABELS[protocol.difficulty]}
                        </span>
                        <span className="text-sm text-gray-600">Duration: {protocol.estimatedTime}</span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={24} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={24} className="text-gray-400" />
                    )}
                  </button>

                  <button
                    onClick={() => void handleDelete(protocol.id)}
                    disabled={deletingId === protocol.id}
                    className="rounded p-2 text-red-600 transition hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Delete ${protocol.title}`}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <p className="mb-4 text-gray-700">{protocol.description}</p>

                    <div>
                      <h4 className="mb-3 font-semibold text-gray-900">Steps</h4>
                      <div className="space-y-3">
                        {protocol.steps.map((step) => (
                          <div key={step.stepNumber} className="rounded border border-gray-200 bg-white p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                                {step.stepNumber}
                              </div>

                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-900">{step.title}</h5>
                                <p className="mt-1 text-sm text-gray-600">{step.description}</p>

                                {step.materials && step.materials.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-semibold text-gray-700">Materials:</p>
                                    <ul className="list-inside list-disc text-sm text-gray-600">
                                      {step.materials.map((material) => (
                                        <li key={material}>{material}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {step.duration && (
                                  <p className="mt-2 text-xs text-gray-500">Time: {step.duration}</p>
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
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center text-gray-500">No protocols yet</div>
      )}

      <div className="mt-8 text-center text-xs text-gray-500">Shared data syncs automatically every 4 seconds</div>
    </div>
  );
}
