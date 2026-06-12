import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function FilterNode({ data, selected }: { data: Record<string, unknown>; selected: boolean }) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-purple-950 border-purple-600 min-w-[160px] ${
        selected ? 'ring-2 ring-purple-400 shadow-lg shadow-purple-900/50' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-purple-500 !border-purple-300 !w-3 !h-3"
      />
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 rounded bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
          F
        </span>
        <span className="font-semibold text-purple-200 text-sm">
          {String(data.label || '过滤')}
        </span>
      </div>
      <div className="text-xs text-purple-400/70">
        {String(data.filterType || 'Condition / Regex / Range')}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-purple-500 !border-purple-300 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(FilterNode);
