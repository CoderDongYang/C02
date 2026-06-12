import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return;
    }
    try {
      await register(email, username, password);
      navigate('/');
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-brand-400 mb-2">FlowForge</h1>
          <p className="text-gray-400">数据流水线可视化编排平台</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-100 mb-6">注册</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm flex justify-between items-center">
              <span>{error}</span>
              <button onClick={clearError} className="text-red-400 hover:text-red-300 ml-2">✕</button>
            </div>
          )}

          {password && confirmPassword && password !== confirmPassword && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              两次输入的密码不一致
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="3-32个字符"
                required
                minLength={3}
                maxLength={32}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="至少6个字符"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="再次输入密码"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || (password !== confirmPassword && confirmPassword.length > 0)}
              className="btn-primary w-full"
            >
              {isLoading ? '注册中...' : '注册'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-400">
            已有账号？{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300">
              登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
