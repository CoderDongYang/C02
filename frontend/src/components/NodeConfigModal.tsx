import { useState, useEffect } from 'react';
import type { Node } from '@xyflow/react';

interface NodeConfigModalProps {
  node: Node | null;
  onClose: () => void;
  onSave: (nodeId: string, data: Record<string, unknown>) => void;
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

export default function NodeConfigModal({ node, onClose, onSave }: NodeConfigModalProps) {
  const [label, setLabel] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    if (node) {
      setLabel(String(node.data.label || ''));
      const typeKey = getTypeKey(node.type || '');
      setSelectedType(String(node.data[typeKey] || ''));
      
      const initialConfig: Record<string, string> = {};
      if (node.data.config) {
        Object.entries(node.data.config as Record<string, unknown>).forEach(([k, v]) => {
          initialConfig[k] = String(v);
        });
      }
      setConfig(initialConfig);
    }
  }, [node]);

  if (!node) return null;

  const typeOptions = getTypeOptions(node.type || '');
  const typeKey = getTypeKey(node.type || '');

  const handleSave = () => {
    const data: Record<string, unknown> = {
      label,
      [typeKey]: selectedType,
      config,
    };
    onSave(node.id, data);
    onClose();
  };

  const addConfigField = () => {
    setConfig({ ...config, '': '' });
  };

  const updateConfigKey = (oldKey: string, newKey: string) => {
    const newConfig = { ...config };
    if (oldKey !== newKey) {
      newConfig[newKey] = newConfig[oldKey];
      delete newConfig[oldKey];
    }
    setConfig(newConfig);
  };

  const updateConfigValue = (key: string, value: string) => {
    setConfig({ ...config, [key]: value });
  };

  const removeConfigField = (key: string) => {
    const newConfig = { ...config };
    delete newConfig[key];
    setConfig(newConfig);
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
  const colorClasses = {
    emerald: 'text-emerald-400 border-emerald-500 bg-emerald-900/20',
    blue: 'text-blue-400 border-blue-500 bg-blue-900/20',
    purple: 'text-purple-400 border-purple-500 bg-purple-900/20',
    orange: 'text-orange-400 border-orange-500 bg-orange-900/20',
    gray: 'text-gray-400 border-gray-500 bg-gray-900/20',
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={`text-lg font-semibold ${colorClasses[color as keyof typeof colorClasses].split(' ')[0]}`}>
              编辑 {getNodeTypeLabel()}
            </h3>
            <p className="text-sm text-gray-500 mt-1">节点 ID: {node.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              节点名称
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="input-field"
              placeholder="输入节点名称"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              节点类型
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input-field"
            >
              <option value="">请选择类型</option>
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {selectedType && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                连接配置
              </label>
              <div className={`p-3 rounded-lg border ${colorClasses[color as keyof typeof colorClasses]}`}>
                {node.type === 'source' && selectedType === 'API' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">API 地址</label>
                      <input
                        type="text"
                        value={config.url || ''}
                        onChange={(e) => updateConfigValue('url', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="https://api.example.com/data"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">请求方法</label>
                      <select
                        value={config.method || 'GET'}
                        onChange={(e) => updateConfigValue('method', e.target.value)}
                        className="input-field text-sm py-1.5"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">请求头 (JSON)</label>
                      <textarea
                        value={config.headers || ''}
                        onChange={(e) => updateConfigValue('headers', e.target.value)}
                        className="input-field text-sm py-1.5 h-20 resize-none font-mono"
                        placeholder='{"Authorization": "Bearer xxx"}'
                      />
                    </div>
                  </div>
                )}

                {node.type === 'source' && selectedType === 'DB' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">数据库连接</label>
                      <input
                        type="text"
                        value={config.connection || ''}
                        onChange={(e) => updateConfigValue('connection', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="mysql://user:pass@localhost:3306/db"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">SQL 查询</label>
                      <textarea
                        value={config.query || ''}
                        onChange={(e) => updateConfigValue('query', e.target.value)}
                        className="input-field text-sm py-1.5 h-20 resize-none font-mono"
                        placeholder="SELECT * FROM users"
                      />
                    </div>
                  </div>
                )}

                {node.type === 'source' && selectedType === 'File' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">文件路径</label>
                      <input
                        type="text"
                        value={config.path || ''}
                        onChange={(e) => updateConfigValue('path', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="/data/input.csv"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">文件格式</label>
                      <select
                        value={config.format || 'csv'}
                        onChange={(e) => updateConfigValue('format', e.target.value)}
                        className="input-field text-sm py-1.5"
                      >
                        <option value="csv">CSV</option>
                        <option value="json">JSON</option>
                        <option value="parquet">Parquet</option>
                        <option value="txt">TXT</option>
                      </select>
                    </div>
                  </div>
                )}

                {node.type === 'source' && selectedType === 'Kafka' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Brokers</label>
                      <input
                        type="text"
                        value={config.brokers || ''}
                        onChange={(e) => updateConfigValue('brokers', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="localhost:9092"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Topic</label>
                      <input
                        type="text"
                        value={config.topic || ''}
                        onChange={(e) => updateConfigValue('topic', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="my-topic"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">消费者组</label>
                      <input
                        type="text"
                        value={config.groupId || ''}
                        onChange={(e) => updateConfigValue('groupId', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="flowforge-group"
                      />
                    </div>
                  </div>
                )}

                {node.type === 'transform' && selectedType === 'Map' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">映射表达式</label>
                      <textarea
                        value={config.expression || ''}
                        onChange={(e) => updateConfigValue('expression', e.target.value)}
                        className="input-field text-sm py-1.5 h-24 resize-none font-mono"
                        placeholder="{ newField: data.oldField * 2 }"
                      />
                    </div>
                  </div>
                )}

                {node.type === 'transform' && selectedType === 'Filter' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">过滤条件</label>
                      <input
                        type="text"
                        value={config.condition || ''}
                        onChange={(e) => updateConfigValue('condition', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="data.age > 18"
                      />
                    </div>
                  </div>
                )}

                {node.type === 'transform' && selectedType === 'Reduce' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">分组字段</label>
                      <input
                        type="text"
                        value={config.groupBy || ''}
                        onChange={(e) => updateConfigValue('groupBy', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="category"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">聚合函数</label>
                      <select
                        value={config.aggregation || 'sum'}
                        onChange={(e) => updateConfigValue('aggregation', e.target.value)}
                        className="input-field text-sm py-1.5"
                      >
                        <option value="sum">求和 (SUM)</option>
                        <option value="avg">平均值 (AVG)</option>
                        <option value="count">计数 (COUNT)</option>
                        <option value="max">最大值 (MAX)</option>
                        <option value="min">最小值 (MIN)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">聚合字段</label>
                      <input
                        type="text"
                        value={config.field || ''}
                        onChange={(e) => updateConfigValue('field', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="amount"
                      />
                    </div>
                  </div>
                )}

                {node.type === 'transform' && selectedType === 'Join' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Join 类型</label>
                      <select
                        value={config.joinType || 'inner'}
                        onChange={(e) => updateConfigValue('joinType', e.target.value)}
                        className="input-field text-sm py-1.5"
                      >
                        <option value="inner">Inner Join</option>
                        <option value="left">Left Join</option>
                        <option value="right">Right Join</option>
                        <option value="full">Full Join</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">左表关联键</label>
                      <input
                        type="text"
                        value={config.leftKey || ''}
                        onChange={(e) => updateConfigValue('leftKey', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="id"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">右表关联键</label>
                      <input
                        type="text"
                        value={config.rightKey || ''}
                        onChange={(e) => updateConfigValue('rightKey', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="user_id"
                      />
                    </div>
                  </div>
                )}

                {node.type === 'transform' && selectedType === 'Sort' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">排序字段</label>
                      <input
                        type="text"
                        value={config.sortField || ''}
                        onChange={(e) => updateConfigValue('sortField', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="createdAt"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">排序方式</label>
                      <select
                        value={config.order || 'desc'}
                        onChange={(e) => updateConfigValue('order', e.target.value)}
                        className="input-field text-sm py-1.5"
                      >
                        <option value="desc">降序 (DESC)</option>
                        <option value="asc">升序 (ASC)</option>
                      </select>
                    </div>
                  </div>
                )}

                {node.type === 'filter' && selectedType === 'Condition' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">过滤条件表达式</label>
                      <input
                        type="text"
                        value={config.condition || ''}
                        onChange={(e) => updateConfigValue('condition', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="data.status === 'active'"
                      />
                    </div>
                  </div>
                )}

                {node.type === 'filter' && selectedType === 'Regex' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">匹配字段</label>
                      <input
                        type="text"
                        value={config.field || ''}
                        onChange={(e) => updateConfigValue('field', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="email"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">正则表达式</label>
                      <input
                        type="text"
                        value={config.pattern || ''}
                        onChange={(e) => updateConfigValue('pattern', e.target.value)}
                        className="input-field text-sm py-1.5 font-mono"
                        placeholder="^[a-zA-Z0-9]+@"
                      />
                    </div>
                  </div>
                )}

                {node.type === 'filter' && selectedType === 'Range' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">筛选字段</label>
                      <input
                        type="text"
                        value={config.field || ''}
                        onChange={(e) => updateConfigValue('field', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="amount"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">最小值</label>
                        <input
                          type="number"
                          value={config.min || ''}
                          onChange={(e) => updateConfigValue('min', e.target.value)}
                          className="input-field text-sm py-1.5"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">最大值</label>
                        <input
                          type="number"
                          value={config.max || ''}
                          onChange={(e) => updateConfigValue('max', e.target.value)}
                          className="input-field text-sm py-1.5"
                          placeholder="100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {node.type === 'filter' && selectedType === 'Distinct' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">去重字段（逗号分隔）</label>
                      <input
                        type="text"
                        value={config.fields || ''}
                        onChange={(e) => updateConfigValue('fields', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="email, phone"
                      />
                    </div>
                  </div>
                )}

                {node.type === 'sink' && selectedType === 'DB' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">数据库连接</label>
                      <input
                        type="text"
                        value={config.connection || ''}
                        onChange={(e) => updateConfigValue('connection', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="mysql://user:pass@localhost:3306/db"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">目标表名</label>
                      <input
                        type="text"
                        value={config.table || ''}
                        onChange={(e) => updateConfigValue('table', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="output_table"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">写入模式</label>
                      <select
                        value={config.mode || 'append'}
                        onChange={(e) => updateConfigValue('mode', e.target.value)}
                        className="input-field text-sm py-1.5"
                      >
                        <option value="append">追加 (Append)</option>
                        <option value="overwrite">覆盖 (Overwrite)</option>
                        <option value="upsert">更新或插入 (Upsert)</option>
                      </select>
                    </div>
                  </div>
                )}

                {node.type === 'sink' && selectedType === 'API' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">API 地址</label>
                      <input
                        type="text"
                        value={config.url || ''}
                        onChange={(e) => updateConfigValue('url', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="https://api.example.com/ingest"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">请求方法</label>
                      <select
                        value={config.method || 'POST'}
                        onChange={(e) => updateConfigValue('method', e.target.value)}
                        className="input-field text-sm py-1.5"
                      >
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">请求头 (JSON)</label>
                      <textarea
                        value={config.headers || ''}
                        onChange={(e) => updateConfigValue('headers', e.target.value)}
                        className="input-field text-sm py-1.5 h-16 resize-none font-mono"
                        placeholder='{"Content-Type": "application/json"}'
                      />
                    </div>
                  </div>
                )}

                {node.type === 'sink' && selectedType === 'File' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">输出路径</label>
                      <input
                        type="text"
                        value={config.path || ''}
                        onChange={(e) => updateConfigValue('path', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="/data/output.csv"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">文件格式</label>
                      <select
                        value={config.format || 'csv'}
                        onChange={(e) => updateConfigValue('format', e.target.value)}
                        className="input-field text-sm py-1.5"
                      >
                        <option value="csv">CSV</option>
                        <option value="json">JSON</option>
                        <option value="parquet">Parquet</option>
                      </select>
                    </div>
                  </div>
                )}

                {node.type === 'sink' && selectedType === 'Elasticsearch' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">ES 地址</label>
                      <input
                        type="text"
                        value={config.url || ''}
                        onChange={(e) => updateConfigValue('url', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="http://localhost:9200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">索引名</label>
                      <input
                        type="text"
                        value={config.index || ''}
                        onChange={(e) => updateConfigValue('index', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="flowforge-logs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">ID 字段</label>
                      <input
                        type="text"
                        value={config.idField || ''}
                        onChange={(e) => updateConfigValue('idField', e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="id"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">
                自定义参数
              </label>
              <button
                onClick={addConfigField}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                + 添加参数
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(config).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => updateConfigKey(key, e.target.value)}
                    className="input-field text-sm py-1.5 flex-1 font-mono"
                    placeholder="参数名"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateConfigValue(key, e.target.value)}
                    className="input-field text-sm py-1.5 flex-1"
                    placeholder="参数值"
                  />
                  <button
                    onClick={() => removeConfigField(key)}
                    className="text-red-400 hover:text-red-300 px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-800">
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button onClick={handleSave} className="btn-primary">
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
