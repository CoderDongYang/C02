import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function SinkNode({ data, selected }: { data: Record<string, unknown>; selected: boolean }) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-orange-950 border-orange-600 min-w-[160px] ${
        selected ? 'ring-2 ring-orange-400 shadow-lg shadow-orange-900/50' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-orange-500 !border-orange-300 !w-3 !h-3"
      />
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 rounded bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
          K
        </span>
        <span className="font-semibold text-orange-200 text-sm">
          {String(data.label || '输出')}
        </span>
      </div>
      <div className="text-xs text-orange-400/70">
        {String(data.sinkType || 'DB / API / File')}
      </div>
    </div>
  );
}

export default memo(SinkNode);
