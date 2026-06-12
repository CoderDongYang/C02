import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { usePipelineStore } from '@/stores/pipelineStore';
import NodePalette from '@/components/NodePalette';
import PipelineCanvas from '@/components/PipelineCanvas';
import NodeConfigModal from '@/components/NodeConfigModal';

export default function PipelineEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentPipeline = usePipelineStore((s) => s.currentPipeline);
  const fetchPipeline = usePipelineStore((s) => s.fetchPipeline);
  const savePipeline = usePipelineStore((s) => s.savePipeline);
  const updatePipeline = usePipelineStore((s) => s.updatePipeline);
  const clearCanvas = usePipelineStore((s) => s.clearCanvas);
  const updateNodeData = usePipelineStore((s) => s.updateNodeData);
  const pushHistory = usePipelineStore((s) => s.pushHistory);
  const nodes = usePipelineStore((s) => s.nodes);
  const isSaving = usePipelineStore((s) => s.isSaving);
  const error = usePipelineStore((s) => s.error);
  const clearError = usePipelineStore((s) => s.clearError);

  const [pipelineName, setPipelineName] = useState('');
  const [pipelineDesc, setPipelineDesc] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    if (id) {
      fetchPipeline(id);
    } else {
      clearCanvas();
    }
    return () => {
      clearCanvas();
    };
  }, [id, fetchPipeline, clearCanvas]);

  useEffect(() => {
    if (currentPipeline && !pipelineName) {
      setPipelineName(currentPipeline.name);
      setPipelineDesc(currentPipeline.description || '');
    }
  }, [currentPipeline, pipelineName]);

  const handleSave = async () => {
    if (!pipelineName.trim()) return;
    try {
      if (id) {
        await updatePipeline(id, pipelineName, pipelineDesc || undefined);
      } else {
        await savePipeline(pipelineName, pipelineDesc || undefined);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setShowSaveDialog(false);
    } catch {}
  };

  const handleQuickSave = () => {
    if (id && pipelineName) {
      updatePipeline(id, pipelineName, pipelineDesc || undefined);
    } else {
      setShowSaveDialog(true);
    }
  };

  const handleNodeDoubleClick = (node: Node) => {
    setSelectedNode(node);
  };

  const handleSaveNodeConfig = (nodeId: string, data: Record<string, unknown>) => {
    updateNodeData(nodeId, data);
    setTimeout(pushHistory, 0);
    setSelectedNode(null);
  };

  return (
    <ReactFlowProvider>
      <div className="h-full flex flex-col">
        {error && (
          <div className="px-4 py-2 bg-red-900/50 border-b border-red-700 text-red-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        <div className="h-11 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-gray-200 transition-colors text-sm"
            >
              ← 返回
            </button>
            <div className="w-px h-5 bg-gray-700" />
            <span className="text-sm text-gray-200 font-medium">
              {currentPipeline?.name || '新建流水线'}
            </span>
            <span className="text-xs text-gray-500">
              {nodes.length} 个节点
            </span>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-emerald-400 text-sm mr-2">✓ 已保存</span>
            )}
            {isSaving && (
              <span className="text-brand-400 text-sm mr-2">保存中...</span>
            )}
            <button
              onClick={() => setShowSaveDialog(true)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              另存为
            </button>
            <button
              onClick={handleQuickSave}
              disabled={isSaving}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {id ? '保存' : '保存流水线'}
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <NodePalette />
          <PipelineCanvas onNodeDoubleClick={handleNodeDoubleClick} />
        </div>

        {showSaveDialog && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="card w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">保存流水线</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">名称</label>
                  <input
                    type="text"
                    value={pipelineName}
                    onChange={(e) => setPipelineName(e.target.value)}
                    className="input-field"
                    placeholder="输入流水线名称"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">描述（可选）</label>
                  <textarea
                    value={pipelineDesc}
                    onChange={(e) => setPipelineDesc(e.target.value)}
                    className="input-field h-20 resize-none"
                    placeholder="描述此流水线的用途"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!pipelineName.trim() || isSaving}
                  className="btn-primary"
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        <NodeConfigModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onSave={handleSaveNodeConfig}
        />
      </div>
    </ReactFlowProvider>
  );
}
