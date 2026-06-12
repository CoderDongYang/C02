import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePipelineStore } from '@/stores/pipelineStore';

export default function DashboardPage() {
  const pipelines = usePipelineStore((s) => s.pipelines);
  const isLoading = usePipelineStore((s) => s.isLoading);
  const error = usePipelineStore((s) => s.error);
  const fetchPipelines = usePipelineStore((s) => s.fetchPipelines);
  const deletePipeline = usePipelineStore((s) => s.deletePipeline);
  const clearCanvas = usePipelineStore((s) => s.clearCanvas);
  const navigate = useNavigate();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const handleCreate = () => {
    clearCanvas();
    navigate('/editor');
  };

  const handleOpen = (id: string) => {
    navigate(`/editor/${id}`);
  };

  const handleDelete = async (id: string) => {
    await deletePipeline(id);
    setShowDeleteConfirm(null);
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">我的流水线</h1>
            <p className="text-gray-400 mt-1">管理和编排你的数据流水线</p>
          </div>
          <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
            <span className="text-lg leading-none">+</span>
            新建流水线
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-gray-400 py-16">加载中...</div>
        ) : pipelines.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-30">⟐</div>
            <p className="text-gray-400 text-lg mb-2">还没有流水线</p>
            <p className="text-gray-500 text-sm mb-6">创建你的第一个数据流水线，开始可视化编排</p>
            <button onClick={handleCreate} className="btn-primary">
              创建流水线
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pipelines.map((p) => (
              <div
                key={p.id}
                className="card hover:border-gray-600 transition-colors cursor-pointer group"
                onClick={() => handleOpen(p.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-100 group-hover:text-brand-400 transition-colors">
                    {p.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(showDeleteConfirm === p.id ? null : p.id);
                    }}
                    className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
                {p.description && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{p.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>更新于 {new Date(p.updatedAt).toLocaleDateString('zh-CN')}</span>
                  <span className="text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    编辑 →
                  </span>
                </div>

                {showDeleteConfirm === p.id && (
                  <div
                    className="mt-3 pt-3 border-t border-gray-700 flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-sm text-gray-400 flex-1">确认删除？</span>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                      删除
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
