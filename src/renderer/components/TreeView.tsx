import React from 'react'
import { formatPremiumCompact } from '../utils/reportFormatters'

export interface TreeNode {
  id: string
  name: string
  value: number
  percentage: number
  color?: string
  children: TreeNode[]
}

interface TreeItemProps {
  node: TreeNode
  expanded: Set<string>
  onToggle: (id: string) => void
  currency: string
  depth: number
  ancestorIsLast: boolean[]
  isLast: boolean
}

function fmt(n: number, sym = 'AED') {
  const { valueStr, suffix } = formatPremiumCompact(n)
  const sign = n < 0 ? '-' : ''
  return <>{sign}{sym} {valueStr}{suffix}</>
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{
        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s',
        flexShrink: 0,
      }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function TreeRecursive({ node, expanded, onToggle, currency, depth, ancestorIsLast, isLast }: TreeItemProps) {
  const hasChildren = node.children.length > 0
  const isExpanded = expanded.has(node.id)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) onToggle(node.id)
  }

  const rowPaddingLeft = 16 + depth * 24

  return (
    <div className="tv-item">
      <div
        className={`tv-row${hasChildren ? ' tv-row-clickable' : ''}`}
        style={{ paddingLeft: rowPaddingLeft }}
        onClick={handleClick}
      >
        <div className="tv-connectors">
          {ancestorIsLast.map((lastFlag, i) => (
            <div key={i} className="tv-cseg">
              <div className={`tv-line${lastFlag ? ' tv-line-none' : ' tv-line-v'}`} />
            </div>
          ))}
          <div className="tv-cseg">
            <div className={`tv-line${isLast ? ' tv-line-corner' : ' tv-line-tee'}`} />
          </div>
        </div>

        <span className="tv-toggle">
          {hasChildren ? <Chevron expanded={isExpanded} /> : <span className="tv-toggle-spacer" />}
        </span>

        <span className="tv-name">{node.name}</span>
        <span className="tv-pct">{node.percentage.toFixed(1)}%</span>
        <span className="tv-value">{fmt(node.value, currency)}</span>
      </div>

      {hasChildren && isExpanded && node.children.map((child, i) => {
        const childIsLast = i === node.children.length - 1
        return (
          <TreeRecursive
            key={child.id}
            node={child}
            expanded={expanded}
            onToggle={onToggle}
            currency={currency}
            depth={depth + 1}
            ancestorIsLast={[...ancestorIsLast, childIsLast]}
            isLast={childIsLast}
          />
        )
      })}
    </div>
  )
}

interface Props {
  nodes: TreeNode[]
  expanded: Set<string>
  onToggle: (id: string) => void
  currency: string
}

export function TreeView({ nodes, expanded, onToggle, currency }: Props) {
  if (nodes.length === 0) return null
  return (
    <div className="tv">
      {nodes.map((node, i) => (
        <TreeRecursive
          key={node.id}
          node={node}
          expanded={expanded}
          onToggle={onToggle}
          currency={currency}
          depth={0}
          ancestorIsLast={[]}
          isLast={i === nodes.length - 1}
        />
      ))}
    </div>
  )
}
