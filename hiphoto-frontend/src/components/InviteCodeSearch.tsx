import { useState } from 'react'

interface InviteCodeSearchProps {
  onJoinRoom: (inviteCode: string) => Promise<{ success: boolean; error?: string; data?: any }>
}

export default function InviteCodeSearch({ onJoinRoom }: InviteCodeSearchProps) {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inviteCode.length !== 6) {
      setError('邀请码必须是6位字符')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    const result = await onJoinRoom(inviteCode)
    
    if (result.success) {
      setSuccess(true)
      setInviteCode('')
      setTimeout(() => setSuccess(false), 3000)
    } else {
      setError(result.error || '加入失败')
    }

    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">通过邀请码加入房间</h3>
          <p className="text-sm text-gray-500 mt-1">
            输入6位邀请码直接加入房间，无需等待审批
          </p>
        </div>
        <div className="text-sm text-gray-400">
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            快速加入
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                setInviteCode(value.slice(0, 6))
                setError(null)
              }}
              maxLength={6}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center text-xl tracking-widest font-mono"
              placeholder="输入6位邀请码"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || inviteCode.length !== 6}
              className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium"
            >
              {loading ? '加入中...' : '立即加入'}
            </button>
          </div>
          
          {error && (
            <div className="mt-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="mt-2 p-3 bg-green-50 text-green-600 rounded-lg text-sm">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                成功加入房间！正在跳转...
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          <p>• 邀请码通常由房主提供，格式为6位大写字母和数字</p>
          <p>• 通过邀请码加入的房间会立即出现在你的房间列表中</p>
          <p>• 如果房间需要审批，房主会收到通知并决定是否批准</p>
        </div>
      </form>
    </div>
  )
}