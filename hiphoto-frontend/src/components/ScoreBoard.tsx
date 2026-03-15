import type { ScoreRound } from '../types'

interface ScoreBoardProps {
  scoreRound: ScoreRound
}

export default function ScoreBoard({ scoreRound }: ScoreBoardProps) {
  const { round_number, status, scoreboard } = scoreRound

  const getCriteriaNames = () => {
    const names = new Set<string>()
    scoreboard.forEach((entry) => {
      Object.keys(entry.criteria_scores).forEach((name) => names.add(name))
    })
    return Array.from(names)
  }

  const criteriaNames = getCriteriaNames()

  if (scoreboard.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        暂无评分数据
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">第 {round_number} 轮评分</h3>
        <span
          className={`px-2 py-1 text-xs rounded ${
            status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {status === 'active' ? '进行中' : '已结束'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left font-medium">排名</th>
              <th className="px-4 py-2 text-left font-medium">上传者</th>
              {criteriaNames.map((name) => (
                <th key={name} className="px-4 py-2 text-center font-medium">
                  {name}
                </th>
              ))}
              <th className="px-4 py-2 text-center font-medium">总分</th>
            </tr>
          </thead>
          <tbody>
            {scoreboard.map((entry, index) => (
              <tr key={entry.photo_id} className="border-b">
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : index === 1
                        ? 'bg-gray-100 text-gray-700'
                        : index === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3">{entry.uploader_name || '未知用户'}</td>
                {criteriaNames.map((name) => (
                  <td key={name} className="px-4 py-3 text-center">
                    {entry.criteria_scores[name]?.toFixed(1) || '-'}
                  </td>
                ))}
                <td className="px-4 py-3 text-center font-semibold">
                  {entry.total_score.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
