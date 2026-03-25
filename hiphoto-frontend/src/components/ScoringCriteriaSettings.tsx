import { useState } from 'react'
import type { ScoringCriteria, Criterion } from '../types'

interface ScoringCriteriaSettingsProps {
  criteria: ScoringCriteria | null
  onSave: (criteria: ScoringCriteria) => Promise<void>
}

export default function ScoringCriteriaSettings({ criteria, onSave }: ScoringCriteriaSettingsProps) {
  const [localCriteria, setLocalCriteria] = useState<ScoringCriteria>(
    criteria || { criteria: [] }
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleAddCriterion = () => {
    setLocalCriteria(prev => ({
      criteria: [
        ...prev.criteria,
        { name: '', max_score: 10, description: '' }
      ]
    }))
  }

  const handleRemoveCriterion = (index: number) => {
    setLocalCriteria(prev => ({
      criteria: prev.criteria.filter((_, i) => i !== index)
    }))
  }

  const handleUpdateCriterion = (index: number, field: keyof Criterion, value: string | number) => {
    setLocalCriteria(prev => {
      const newCriteria = [...prev.criteria]
      newCriteria[index] = { ...newCriteria[index], [field]: value }
      return { criteria: newCriteria }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 验证
    const hasEmptyName = localCriteria.criteria.some(c => !c.name.trim())
    if (hasEmptyName) {
      setError('请填写所有评分标准的名称')
      return
    }

    const hasInvalidScore = localCriteria.criteria.some(c => c.max_score < 1 || c.max_score > 100)
    if (hasInvalidScore) {
      setError('评分上限必须在1-100之间')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onSave(localCriteria)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">评分标准设置</h3>
        <p className="text-sm text-gray-600">
          设置详细的评分标准，帮助成员更好地理解评分要求。每个标准可以设置不同的权重和描述。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
            评分标准保存成功
          </div>
        )}

        <div className="space-y-4">
          {localCriteria.criteria.map((criterion, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-gray-800">评分标准 #{index + 1}</h4>
                <button
                  type="button"
                  onClick={() => handleRemoveCriterion(index)}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  删除
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    标准名称 *
                  </label>
                  <input
                    type="text"
                    value={criterion.name}
                    onChange={(e) => handleUpdateCriterion(index, 'name', e.target.value)}
                    placeholder="例如：构图、色彩、创意"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    评分上限 *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={criterion.max_score}
                      onChange={(e) => handleUpdateCriterion(index, 'max_score', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="w-12 text-center font-medium">{criterion.max_score} 分</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">1-100分，拖动调整</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标准描述
                </label>
                <textarea
                  value={criterion.description || ''}
                  onChange={(e) => handleUpdateCriterion(index, 'description', e.target.value)}
                  placeholder="描述评分标准的具体要求..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
          ))}

          {localCriteria.criteria.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">暂无评分标准</p>
              <p className="text-sm text-gray-400 mt-1">添加评分标准以帮助成员更好地评分</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleAddCriterion}
            className="px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-primary-500 hover:text-primary-600"
          >
            + 添加评分标准
          </button>
          
          <div className="flex-1 flex gap-2">
            <button
              type="button"
              onClick={() => setLocalCriteria(criteria || { criteria: [] })}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              重置
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存评分标准'}
            </button>
          </div>
        </div>
      </form>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">使用说明</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 每个评分标准可以设置不同的权重（评分上限）</li>
          <li>• 成员评分时会看到这些标准的具体描述</li>
          <li>• 建议设置3-5个核心评分标准</li>
          <li>• 总分将根据各标准得分计算</li>
        </ul>
      </div>
    </div>
  )
}