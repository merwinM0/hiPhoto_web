import { useState, useRef, useEffect } from 'react'
import type { Tag } from '../types'

interface PhotoViewerProps {
  imageBase64: string
  tags: Tag[]
  width: number
  height: number
  onTagClick?: (x: number, y: number) => void
  readOnly?: boolean
}

export default function PhotoViewer({
  imageBase64,
  tags,
  width,
  height,
  onTagClick,
  readOnly = false,
}: PhotoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [imageRect, setImageRect] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [hoveredTag, setHoveredTag] = useState<string | null>(null)

  // 计算图片在容器中的实际位置和尺寸
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return
      
      const containerWidth = containerRef.current.clientWidth
      const containerHeight = containerRef.current.clientHeight
      
      // 计算保持比例的图片尺寸
      const imageRatio = width / height
      const containerRatio = containerWidth / containerHeight
      
      let actualWidth, actualHeight, offsetX, offsetY
      
      if (imageRatio > containerRatio) {
        // 图片更宽，以宽度为准
        actualWidth = containerWidth
        actualHeight = containerWidth / imageRatio
        offsetX = 0
        offsetY = (containerHeight - actualHeight) / 2
      } else {
        // 图片更高，以高度为准
        actualHeight = containerHeight
        actualWidth = containerHeight * imageRatio
        offsetX = (containerWidth - actualWidth) / 2
        offsetY = 0
      }
      
      setContainerSize({ width: containerWidth, height: containerHeight })
      setImageRect({ x: offsetX, y: offsetY, width: actualWidth, height: actualHeight })
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [width, height])

  // 点击图片添加标签
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (readOnly || !onTagClick) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    
    // 确保坐标在 0-1 范围内
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      onTagClick(x, y)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden"
    >
      <img
        src={`data:image/jpeg;base64,${imageBase64}`}
        alt="Photo"
        className="max-w-full max-h-full object-contain cursor-crosshair"
        onClick={handleImageClick}
        draggable={false}
      />
      
      {/* 标签 */}
      {tags.map((tag) => {
        const left = imageRect.x + tag.x * imageRect.width
        const top = imageRect.y + tag.y * imageRect.height
        
        return (
          <div
            key={tag.id}
            className="absolute pointer-events-none"
            style={{ left: `${left}px`, top: `${top}px`, transform: 'translate(-50%, -50%)' }}
            onMouseEnter={() => setHoveredTag(tag.id)}
            onMouseLeave={() => setHoveredTag(null)}
          >
            {/* 标签点 */}
            <div
              className={`w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg pointer-events-auto cursor-pointer transition-transform ${
                hoveredTag === tag.id ? 'scale-125' : ''
              }`}
            />
            
            {/* 标签文字 */}
            {hoveredTag === tag.id && (
              <div className="absolute left-6 top-0 bg-white px-3 py-1 rounded-lg shadow-lg whitespace-nowrap z-10">
                <p className="text-sm font-medium text-gray-800">{tag.content}</p>
                {tag.creator_name && (
                  <p className="text-xs text-gray-500">by {tag.creator_name}</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
