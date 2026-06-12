import type { NodeTypeDefinition } from '@/types';

const NODE_TYPES: NodeTypeDefinition[] = [
  {
    type: 'source',
    label: '数据源',
    description: '从外部获取数据',
    icon: 'S',
    color: 'emerald',
    defaultData: { label: '数据源', sourceType: 'API' },
  },
  {
    type: 'transform',
    label: '转换',
    description: '数据格式转换',
    icon: 'T',
    color: 'blue',
    defaultData: { label: '转换', transformType: 'Map' },
  },
  {
    type: 'filter',
    label: '过滤',
    description: '按条件筛选数据',
    icon: 'F',
    color: 'purple',
    defaultData: { label: '过滤', filterType: 'Condition' },
  },
  {
    type: 'sink',
    label: '输出',
    description: '数据输出/存储',
    icon: 'K',
    color: 'orange',
    defaultData: { label: '输出', sinkType: 'DB' },
  },
];

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500',
  blue: 'bg-blue-600 hover:bg-blue-500 border-blue-500',
  purple: 'bg-purple-600 hover:bg-purple-500 border-purple-500',
  orange: 'bg-orange-600 hover:bg-orange-500 border-orange-500',
};

export default function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: NodeTypeDefinition) => {
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify(nodeType)
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-56 bg-gray-900 border-r border-gray-800 p-3 flex flex-col gap-2 overflow-y-auto shrink-0">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 px-1">
        组件库
      </h3>
      {NODE_TYPES.map((nodeType) => (
        <div
          key={nodeType.type}
          draggable
          onDragStart={(e) => onDragStart(e, nodeType)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-colors ${colorMap[nodeType.color]}`}
        >
          <span className="w-7 h-7 rounded bg-white/20 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {nodeType.icon}
          </span>
          <div className="min-w-0">
            <div className="text-white text-sm font-medium">{nodeType.label}</div>
            <div className="text-white/60 text-xs truncate">{nodeType.description}</div>
          </div>
        </div>
      ))}

      <div className="mt-4 pt-3 border-t border-gray-700">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
          使用说明
        </h3>
        <ul className="text-xs text-gray-500 space-y-1 px-1">
          <li>• 拖拽组件到画布创建节点</li>
          <li>• 从节点连接点拖出连线</li>
          <li>• 滚轮缩放，拖拽平移</li>
          <li>• 选中节点后按 Delete 删除</li>
        </ul>
      </div>
    </div>
  );
}
