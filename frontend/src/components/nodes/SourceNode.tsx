import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function SourceNode({ data, selected }: { data: Record<string, unknown>; selected: boolean }) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-emerald-950 border-emerald-600 min-w-[160px] ${
        selected ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-900/50' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
          S
        </span>
        <span className="font-semibold text-emerald-200 text-sm">
          {String(data.label || '数据源')}
        </span>
      </div>
      <div className="text-xs text-emerald-400/70">
        {String(data.sourceType || 'API / DB / File')}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-emerald-500 !border-emerald-300 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(SourceNode);
