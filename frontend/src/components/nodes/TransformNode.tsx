import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function TransformNode({ data, selected }: { data: Record<string, unknown>; selected: boolean }) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-blue-950 border-blue-600 min-w-[160px] ${
        selected ? 'ring-2 ring-blue-400 shadow-lg shadow-blue-900/50' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-blue-500 !border-blue-300 !w-3 !h-3"
      />
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
          T
        </span>
        <span className="font-semibold text-blue-200 text-sm">
          {String(data.label || '转换')}
        </span>
      </div>
      <div className="text-xs text-blue-400/70">
        {String(data.transformType || 'Map / Filter / Reduce')}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-blue-500 !border-blue-300 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(TransformNode);
