import { useState, useEffect, useCallback } from 'react';
import type { Node } from '@xyflow/react';

interface NodeConfigModalProps {
  node: Node | null;
  onClose: () => void;
  onSave: (nodeId: string, data: Record<string, unknown>) => void;
}

interface CustomParam {
  id: string;
  key: string;
  value: string;
}

const sourceTypes = [
  { value: 'API', label: 'API 接口' },
  { value: 'DB', label: '数据库' },
  { value: 'File', label: '文件读取' },
  { value: 'Kafka', label: 'Kafka 消息' },
];

const transformTypes = [
  { value: 'Map', label: '数据映射' },
  { value: 'Filter', label: '数据过滤' },
  { value: 'Reduce', label: '数据聚合' },
  { value: 'Join', label: '数据合并' },
  { value: 'Sort', label: '数据排序' },
];

const filterTypes = [
  { value: 'Condition', label: '条件过滤' },
  { value: 'Regex', label: '正则匹配' },
  { value: 'Range', label: '范围筛选' },
  { value: 'Distinct', label: '去重' },
];

const sinkTypes = [
  { value: 'DB', label: '数据库写入' },
  { value: 'API', label: 'API 推送' },
  { value: 'File', label: '文件输出' },
  { value: 'Elasticsearch', label: 'ES 索引' },
];

const connectionConfigKeys: Record<string, string[]> = {
  'source-API': ['url', 'method', 'headers'],
  'source-DB': ['connection', 'query'],
  'source-File': ['path', 'format'],
  'source-Kafka': ['brokers', 'topic', 'groupId'],
  'transform-Map': ['expression'],
  'transform-Filter': ['condition'],
  'transform-Reduce': ['groupBy', 'aggregation', 'field'],
  'transform-Join': ['joinType', 'leftKey', 'rightKey'],
  'transform-Sort': ['sortField', 'order'],
  'filter-Condition': ['condition'],
  'filter-Regex': ['field', 'pattern'],
  'filter-Range': ['field', 'min', 'max'],
  'filter-Distinct': ['fields'],
  'sink-DB': ['connection', 'table', 'mode'],
  'sink-API': ['url', 'method', 'headers'],
  'sink-File': ['path', 'format'],
  'sink-Elasticsearch': ['url', 'index', 'idField'],
};

const getTypeOptions = (nodeType: string) => {
  switch (nodeType) {
    case 'source': return sourceTypes;
    case 'transform': return transformTypes;
    case 'filter': return filterTypes;
    case 'sink': return sinkTypes;
    default: return [];
  }
};

const getTypeKey = (nodeType: string) => {
  switch (nodeType) {
    case 'source': return 'sourceType';
    case 'transform': return 'transformType';
    case 'filter': return 'filterType';
    case 'sink': return 'sinkType';
    default: return 'type';
  }
};

let _paramId = 0;
const genId = () => `p_${++_paramId}_${Date.now()}`;

function ConnectionConfigFields({ nodeType, selectedType, config, onChange }: {
  nodeType: string;
  selectedType: string;
  config: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const inputCls = 'input-field text-sm py-1.5';
  const labelCls = 'block text-xs text-gray-400 mb-1';

  if (nodeType === 'source' && selectedType === 'API') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>API 地址</label>
          <input type="text" value={config.url || ''} onChange={(e) => onChange('url', e.target.value)} className={inputCls} placeholder="https://api.example.com/data" />
        </div>
        <div>
          <label className={labelCls}>请求方法</label>
          <select value={config.method || 'GET'} onChange={(e) => onChange('method', e.target.value)} className={inputCls}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>请求头 (JSON)</label>
          <textarea value={config.headers || ''} onChange={(e) => onChange('headers', e.target.value)} className={`${inputCls} h-20 resize-none font-mono`} placeholder='{"Authorization": "Bearer xxx"}' />
        </div>
      </div>
    );
  }

  if (nodeType === 'source' && selectedType === 'DB') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>数据库连接</label>
          <input type="text" value={config.connection || ''} onChange={(e) => onChange('connection', e.target.value)} className={inputCls} placeholder="mysql://user:pass@localhost:3306/db" />
        </div>
        <div>
          <label className={labelCls}>SQL 查询</label>
          <textarea value={config.query || ''} onChange={(e) => onChange('query', e.target.value)} className={`${inputCls} h-20 resize-none font-mono`} placeholder="SELECT * FROM users" />
        </div>
      </div>
    );
  }

  if (nodeType === 'source' && selectedType === 'File') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>文件路径</label>
          <input type="text" value={config.path || ''} onChange={(e) => onChange('path', e.target.value)} className={inputCls} placeholder="/data/input.csv" />
        </div>
        <div>
          <label className={labelCls}>文件格式</label>
          <select value={config.format || 'csv'} onChange={(e) => onChange('format', e.target.value)} className={inputCls}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="parquet">Parquet</option>
            <option value="txt">TXT</option>
          </select>
        </div>
      </div>
    );
  }

  if (nodeType === 'source' && selectedType === 'Kafka') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Brokers</label>
          <input type="text" value={config.brokers || ''} onChange={(e) => onChange('brokers', e.target.value)} className={inputCls} placeholder="localhost:9092" />
        </div>
        <div>
          <label className={labelCls}>Topic</label>
          <input type="text" value={config.topic || ''} onChange={(e) => onChange('topic', e.target.value)} className={inputCls} placeholder="my-topic" />
        </div>
        <div>
          <label className={labelCls}>消费者组</label>
          <input type="text" value={config.groupId || ''} onChange={(e) => onChange('groupId', e.target.value)} className={inputCls} placeholder="flowforge-group" />
        </div>
      </div>
    );
  }

  if (nodeType === 'transform' && selectedType === 'Map') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>映射表达式</label>
          <textarea value={config.expression || ''} onChange={(e) => onChange('expression', e.target.value)} className={`${inputCls} h-24 resize-none font-mono`} placeholder="{ newField: data.oldField * 2 }" />
        </div>
      </div>
    );
  }

  if (nodeType === 'transform' && selectedType === 'Filter') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>过滤条件</label>
          <input type="text" value={config.condition || ''} onChange={(e) => onChange('condition', e.target.value)} className={inputCls} placeholder="data.age > 18" />
        </div>
      </div>
    );
  }

  if (nodeType === 'transform' && selectedType === 'Reduce') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>分组字段</label>
          <input type="text" value={config.groupBy || ''} onChange={(e) => onChange('groupBy', e.target.value)} className={inputCls} placeholder="category" />
        </div>
        <div>
          <label className={labelCls}>聚合函数</label>
          <select value={config.aggregation || 'sum'} onChange={(e) => onChange('aggregation', e.target.value)} className={inputCls}>
            <option value="sum">求和 (SUM)</option>
            <option value="avg">平均值 (AVG)</option>
            <option value="count">计数 (COUNT)</option>
            <option value="max">最大值 (MAX)</option>
            <option value="min">最小值 (MIN)</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>聚合字段</label>
          <input type="text" value={config.field || ''} onChange={(e) => onChange('field', e.target.value)} className={inputCls} placeholder="amount" />
        </div>
      </div>
    );
  }

  if (nodeType === 'transform' && selectedType === 'Join') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Join 类型</label>
          <select value={config.joinType || 'inner'} onChange={(e) => onChange('joinType', e.target.value)} className={inputCls}>
            <option value="inner">Inner Join</option>
            <option value="left">Left Join</option>
            <option value="right">Right Join</option>
            <option value="full">Full Join</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>左表关联键</label>
          <input type="text" value={config.leftKey || ''} onChange={(e) => onChange('leftKey', e.target.value)} className={inputCls} placeholder="id" />
        </div>
        <div>
          <label className={labelCls}>右表关联键</label>
          <input type="text" value={config.rightKey || ''} onChange={(e) => onChange('rightKey', e.target.value)} className={inputCls} placeholder="user_id" />
        </div>
      </div>
    );
  }

  if (nodeType === 'transform' && selectedType === 'Sort') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>排序字段</label>
          <input type="text" value={config.sortField || ''} onChange={(e) => onChange('sortField', e.target.value)} className={inputCls} placeholder="createdAt" />
        </div>
        <div>
          <label className={labelCls}>排序方式</label>
          <select value={config.order || 'desc'} onChange={(e) => onChange('order', e.target.value)} className={inputCls}>
            <option value="desc">降序 (DESC)</option>
            <option value="asc">升序 (ASC)</option>
          </select>
        </div>
      </div>
    );
  }

  if (nodeType === 'filter' && selectedType === 'Condition') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>过滤条件表达式</label>
          <input type="text" value={config.condition || ''} onChange={(e) => onChange('condition', e.target.value)} className={inputCls} placeholder="data.status === 'active'" />
        </div>
      </div>
    );
  }

  if (nodeType === 'filter' && selectedType === 'Regex') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>匹配字段</label>
          <input type="text" value={config.field || ''} onChange={(e) => onChange('field', e.target.value)} className={inputCls} placeholder="email" />
        </div>
        <div>
          <label className={labelCls}>正则表达式</label>
          <input type="text" value={config.pattern || ''} onChange={(e) => onChange('pattern', e.target.value)} className={`${inputCls} font-mono`} placeholder="^[a-zA-Z0-9]+@" />
        </div>
      </div>
    );
  }

  if (nodeType === 'filter' && selectedType === 'Range') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>筛选字段</label>
          <input type="text" value={config.field || ''} onChange={(e) => onChange('field', e.target.value)} className={inputCls} placeholder="amount" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>最小值</label>
            <input type="number" value={config.min || ''} onChange={(e) => onChange('min', e.target.value)} className={inputCls} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>最大值</label>
            <input type="number" value={config.max || ''} onChange={(e) => onChange('max', e.target.value)} className={inputCls} placeholder="100" />
          </div>
        </div>
      </div>
    );
  }

  if (nodeType === 'filter' && selectedType === 'Distinct') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>去重字段（逗号分隔）</label>
          <input type="text" value={config.fields || ''} onChange={(e) => onChange('fields', e.target.value)} className={inputCls} placeholder="email, phone" />
        </div>
      </div>
    );
  }

  if (nodeType === 'sink' && selectedType === 'DB') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>数据库连接</label>
          <input type="text" value={config.connection || ''} onChange={(e) => onChange('connection', e.target.value)} className={inputCls} placeholder="mysql://user:pass@localhost:3306/db" />
        </div>
        <div>
          <label className={labelCls}>目标表名</label>
          <input type="text" value={config.table || ''} onChange={(e) => onChange('table', e.target.value)} className={inputCls} placeholder="output_table" />
        </div>
        <div>
          <label className={labelCls}>写入模式</label>
          <select value={config.mode || 'append'} onChange={(e) => onChange('mode', e.target.value)} className={inputCls}>
            <option value="append">追加 (Append)</option>
            <option value="overwrite">覆盖 (Overwrite)</option>
            <option value="upsert">更新或插入 (Upsert)</option>
          </select>
        </div>
      </div>
    );
  }

  if (nodeType === 'sink' && selectedType === 'API') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>API 地址</label>
          <input type="text" value={config.url || ''} onChange={(e) => onChange('url', e.target.value)} className={inputCls} placeholder="https://api.example.com/ingest" />
        </div>
        <div>
          <label className={labelCls}>请求方法</label>
          <select value={config.method || 'POST'} onChange={(e) => onChange('method', e.target.value)} className={inputCls}>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>请求头 (JSON)</label>
          <textarea value={config.headers || ''} onChange={(e) => onChange('headers', e.target.value)} className={`${inputCls} h-16 resize-none font-mono`} placeholder='{"Content-Type": "application/json"}' />
        </div>
      </div>
    );
  }

  if (nodeType === 'sink' && selectedType === 'File') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>输出路径</label>
          <input type="text" value={config.path || ''} onChange={(e) => onChange('path', e.target.value)} className={inputCls} placeholder="/data/output.csv" />
        </div>
        <div>
          <label className={labelCls}>文件格式</label>
          <select value={config.format || 'csv'} onChange={(e) => onChange('format', e.target.value)} className={inputCls}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="parquet">Parquet</option>
          </select>
        </div>
      </div>
    );
  }

  if (nodeType === 'sink' && selectedType === 'Elasticsearch') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>ES 地址</label>
          <input type="text" value={config.url || ''} onChange={(e) => onChange('url', e.target.value)} className={inputCls} placeholder="http://localhost:9200" />
        </div>
        <div>
          <label className={labelCls}>索引名</label>
          <input type="text" value={config.index || ''} onChange={(e) => onChange('index', e.target.value)} className={inputCls} placeholder="flowforge-logs" />
        </div>
        <div>
          <label className={labelCls}>ID 字段</label>
          <input type="text" value={config.idField || ''} onChange={(e) => onChange('idField', e.target.value)} className={inputCls} placeholder="id" />
        </div>
      </div>
    );
  }

  return (
    <p className="text-xs text-gray-500">请先选择节点类型</p>
  );
}

export default function NodeConfigModal({ node, onClose, onSave }: NodeConfigModalProps) {
  const [label, setLabel] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [connectionConfig, setConnectionConfig] = useState<Record<string, string>>({});
  const [customParams, setCustomParams] = useState<CustomParam[]>([]);

  const loadNodeData = useCallback(() => {
    if (!node) return;
    setLabel(String(node.data.label || ''));
    const typeKey = getTypeKey(node.type || '');
    const subType = String(node.data[typeKey] || '');
    setSelectedType(subType);

    const nodeConfig = (node.data.config as Record<string, unknown>) || {};
    const connKeys = connectionConfigKeys[`${node.type}-${subType}`] || [];

    const connCfg: Record<string, string> = {};
    const customList: CustomParam[] = [];

    Object.entries(nodeConfig).forEach(([k, v]) => {
      if (connKeys.includes(k)) {
        connCfg[k] = String(v);
      } else {
        customList.push({ id: genId(), key: k, value: String(v) });
      }
    });

    setConnectionConfig(connCfg);
    setCustomParams(customList);
  }, [node]);

  useEffect(() => {
    loadNodeData();
  }, [loadNodeData]);

  if (!node) return null;

  const typeOptions = getTypeOptions(node.type || '');
  const typeKey = getTypeKey(node.type || '');

  const updateConn = (key: string, value: string) => {
    setConnectionConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);
    const oldConnKeys = connectionConfigKeys[`${node.type}-${selectedType}`] || [];
    const newConnKeys = connectionConfigKeys[`${node.type}-${newType}`] || [];

    const oldCfg = { ...connectionConfig };
    const newConnCfg: Record<string, string> = {};
    const extraParams: CustomParam[] = [];

    oldConnKeys.forEach((k) => {
      if (!newConnKeys.includes(k) && oldCfg[k]) {
        extraParams.push({ id: genId(), key: k, value: oldCfg[k] });
      }
    });

    newConnKeys.forEach((k) => {
      if (oldCfg[k] !== undefined) {
        newConnCfg[k] = oldCfg[k];
      }
    });

    setConnectionConfig(newConnCfg);
    setCustomParams((prev) => [...prev, ...extraParams]);
  };

  const updateCustomKey = (id: string, newKey: string) => {
    setCustomParams((prev) => prev.map((p) => (p.id === id ? { ...p, key: newKey } : p)));
  };

  const updateCustomValue = (id: string, value: string) => {
    setCustomParams((prev) => prev.map((p) => (p.id === id ? { ...p, value } : p)));
  };

  const addCustomParam = () => {
    setCustomParams((prev) => [...prev, { id: genId(), key: '', value: '' }]);
  };

  const removeCustomParam = (id: string) => {
    setCustomParams((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSave = () => {
    const mergedConfig: Record<string, string> = {};
    Object.entries(connectionConfig).forEach(([k, v]) => {
      if (v.trim() !== '') mergedConfig[k] = v;
    });
    customParams.forEach((p) => {
      if (p.key.trim() !== '') mergedConfig[p.key.trim()] = p.value;
    });

    const data: Record<string, unknown> = {
      label,
      [typeKey]: selectedType,
      config: mergedConfig,
    };
    onSave(node.id, data);
    onClose();
  };

  const getNodeTypeLabel = () => {
    switch (node.type) {
      case 'source': return '数据源节点';
      case 'transform': return '转换节点';
      case 'filter': return '过滤节点';
      case 'sink': return '输出节点';
      default: return '节点';
    }
  };

  const getNodeColor = () => {
    switch (node.type) {
      case 'source': return 'emerald';
      case 'transform': return 'blue';
      case 'filter': return 'purple';
      case 'sink': return 'orange';
      default: return 'gray';
    }
  };

  const color = getNodeColor();
  const colorClasses: Record<string, string> = {
    emerald: 'text-emerald-400 border-emerald-500 bg-emerald-900/20',
    blue: 'text-blue-400 border-blue-500 bg-blue-900/20',
    purple: 'text-purple-400 border-purple-500 bg-purple-900/20',
    orange: 'text-orange-400 border-orange-500 bg-orange-900/20',
    gray: 'text-gray-400 border-gray-500 bg-gray-900/20',
  };

  const activeColorClass = colorClasses[color] || colorClasses.gray;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={`text-lg font-semibold ${activeColorClass.split(' ')[0]}`}>
              编辑 {getNodeTypeLabel()}
            </h3>
            <p className="text-sm text-gray-500 mt-1">节点 ID: {node.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">节点名称</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="input-field" placeholder="输入节点名称" autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">节点类型</label>
            <select value={selectedType} onChange={(e) => handleTypeChange(e.target.value)} className="input-field">
              <option value="">请选择类型</option>
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {selectedType && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">连接配置</label>
              <div className={`p-3 rounded-lg border ${activeColorClass}`}>
                <ConnectionConfigFields
                  nodeType={node.type || ''}
                  selectedType={selectedType}
                  config={connectionConfig}
                  onChange={updateConn}
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">自定义参数</label>
              <button onClick={addCustomParam} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                + 添加参数
              </button>
            </div>
            {customParams.length === 0 ? (
              <p className="text-xs text-gray-600 py-2">暂无自定义参数，点击上方按钮添加</p>
            ) : (
              <div className="space-y-2">
                {customParams.map((param) => (
                  <div key={param.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={param.key}
                      onChange={(e) => updateCustomKey(param.id, e.target.value)}
                      className="input-field text-sm py-1.5 flex-1 font-mono"
                      placeholder="参数名"
                    />
                    <input
                      type="text"
                      value={param.value}
                      onChange={(e) => updateCustomValue(param.id, e.target.value)}
                      className="input-field text-sm py-1.5 flex-1"
                      placeholder="参数值"
                    />
                    <button onClick={() => removeCustomParam(param.id)} className="text-red-400 hover:text-red-300 px-2 shrink-0">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-800">
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button onClick={handleSave} className="btn-primary">保存</button>
        </div>
      </div>
    </div>
  );
}
