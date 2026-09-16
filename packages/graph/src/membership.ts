import type { NevoliumGraphSnapshot } from './index'

/** Project membership already exists in canonical node data. Expose it in both views
 * without creating RelationshipRecords, changing exports, or guessing links between ideas. */
export function withProjectMembership(snapshot: NevoliumGraphSnapshot): NevoliumGraphSnapshot {
  const projects = new Set(snapshot.nodes.filter(node => node.entityType === 'project').map(node => node.id))
  const represented = new Set(snapshot.edges.flatMap(edge => [
    `${edge.source}\u0000${edge.target}`, `${edge.target}\u0000${edge.source}`,
  ]))
  const membership = snapshot.nodes.flatMap(node => {
    if (node.entityType === 'project' || !node.projectId) return []
    const parent = `project:${node.projectId}`
    if (!projects.has(parent) || represented.has(`${parent}\u0000${node.id}`)) return []
    return [{ id: `membership:${parent}:${node.id}`, source: parent, target: node.id,
      relation: 'project_membership', directed: false, presentation: 'project-membership' as const }]
  })
  return { nodes: snapshot.nodes, edges: [...snapshot.edges, ...membership] }
}
