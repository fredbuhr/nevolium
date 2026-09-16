export interface NevoliumGraphNode {
  id: string
  entityType: string
  label: string
  projectId?: string
}

export interface NevoliumGraphEdge {
  id: string
  source: string
  target: string
  relation: string
  directed: boolean
  // Derived membership is a view of projectId, never an inferred semantic relation.
  presentation?: 'project-membership'
}

export interface NevoliumGraphSnapshot {
  nodes: NevoliumGraphNode[]
  edges: NevoliumGraphEdge[]
}

export * from './membership'

export * from './mindmap'
export * from './spatial'
