# Cross-Connection Pipeline — Implementation Review

**File reviewed:** `src/services/crossConnections.ts`
**Date:** 2026-03-02
**Reviewer:** post-implementation audit of the cross-connection overhaul

---

## 1. Anchor Neighborhood Query — `is_anchor` vs `entity_type`

### Finding

`fetchAnchorNeighborhood` was filtering with `.eq('entity_type', 'Anchor')`. This is incorrect.

In the Synapse data model, anchors are user-promoted entities identified by the `is_anchor = true` boolean flag on `knowledge_nodes`. The `entity_type` field describes what the entity *is* — a Person, Goal, Technology, etc. — and does not change when a user promotes a node to anchor status. A user can promote any entity type to an anchor. Filtering on `entity_type = 'Anchor'` would return zero results for almost all users because `'Anchor'` is an extraction-time type assigned by Gemini, not the promotion mechanism.

Evidence from `src/services/supabase.ts`:
```typescript
export async function promoteToAnchor(nodeId: string) {
  await supabase.from('knowledge_nodes').update({ is_anchor: true }).eq('id', nodeId)
}
export async function demoteAnchor(nodeId: string) {
  await supabase.from('knowledge_nodes').update({ is_anchor: false }).eq('id', nodeId)
}
```

### Change Made

```diff
- .eq('entity_type', 'Anchor')
+ .eq('is_anchor', true)
```

**Impact:** High. Without this fix, the anchor neighborhood candidate source was silently returning zero results for every user — the feature was entirely non-functional.

---

## 2. Directional Relationship Flexibility

### Finding

The previous prompt instructed Gemini: *"the new entity is the subject, the existing entity is the object"* — hardcoding a single allowed direction. Some relationships naturally flow from existing to new (e.g., an existing regulation `enables` a newly ingested project; an existing technology `blocks` a newly ingested risk). Forcing new→existing direction causes Gemini to either skip those relationships or use a weaker bidirectional type (`relates_to`) when the correct directional type flows the other way.

The response JSON schema also used `new_entity`/`existing_entity` field names, which reinforced the single-direction assumption in parsing. The parser always assigned `sourceNodeId = newId, targetNodeId = existingId` regardless of natural relationship direction.

### Change Made

**Prompt updated** to allow either direction:
```
Default to placing the new entity as the subject, but REVERSE the direction when
the relationship naturally flows from the existing entity to the new one.
Indicate which entity is the source and which is the target in your response.
```

**Response schema** changed from `new_entity`/`existing_entity` to `source_entity`/`target_entity`:
```json
{
  "source_entity": "label — from EITHER the new or existing list",
  "target_entity": "label — from EITHER the new or existing list"
}
```

**Parser updated** to use a combined label→id lookup map (new nodes + existing candidates) so either entity can legitimately be the relationship source:
```typescript
const combinedMap = new Map([...newNodeMap, ...existingNodeMap])
const sourceId = combinedMap.get(conn.source_entity?.toLowerCase())
const targetId = combinedMap.get(conn.target_entity?.toLowerCase())
```

**Impact:** Medium-high. Relationships that flow existing→new now resolve to specific directional types rather than being dropped or downgraded to `relates_to`. The combined lookup map adds no performance cost and handles label collision (same label in both lists) gracefully — last-write-wins, which is acceptable since labels within the same extraction are unique.

---

## 3. Graph Context Query Efficiency

### Finding

`fetchEdgeContext` is already correctly implemented as two bulk queries, not N sequential per-entity queries.

**Query 1** — single bulk edge lookup across all candidate node IDs:
```typescript
const { data: edges } = await supabase
  .from('knowledge_edges')
  .select('source_node_id, target_node_id, relation_type')
  .or(`source_node_id.in.(${nodeIds.join(',')}),target_node_id.in.(${nodeIds.join(',')})`)
  .limit(nodeIds.length * 4)
```

**Query 2** — single bulk node label fetch for all IDs referenced in the returned edges:
```typescript
const { data: refNodes } = await supabase
  .from('knowledge_nodes')
  .select('id, label, entity_type')
  .in('id', [...referencedIds])
```

The in-memory grouping loop builds the per-node context strings from the two query results. Total DB round-trips per `inferBatch` call: **2**, regardless of batch size.

### Change Made

None. No change was necessary.

**Note for future review:** The `.limit(nodeIds.length * 4)` cap means if a candidate entity has more than 4 connections, some will be omitted from the context. This is intentional — we only want a cluster signal, not the full neighbourhood. The 3-connection display cap in the prompt (`slice(0, 3)`) is slightly below the query cap (4×), which provides one connection of buffer for the in-memory dedup.

---

## 4. Hardcoded Similarity Scores — Rationale

### Finding

Two synthetic similarity scores are assigned to non-semantic candidate sources so they participate in the shared priority sort alongside real embedding similarity scores:

```typescript
const ANCHOR_NEIGHBORHOOD_SIMILARITY = 0.65
const TAG_OVERLAP_SIMILARITY = 0.52
```

No code change was required. The rationale for these values is now documented inline in the code.

### Rationale (also in source)

**`ANCHOR_NEIGHBORHOOD_SIMILARITY = 0.65`**

Set above the semantic threshold (0.55) and above tag overlap (0.52) so anchor-cluster candidates rank ahead of pure keyword matches. An anchor represents a user's highest-priority entity; every node already connected to it has been implicitly validated as thematically important. This score places anchor-neighborhood candidates in the first 1–2 Gemini batches alongside high-confidence semantic matches.

*Tuning guidance:* Reduce toward 0.58 if the anchor graph becomes dense with low-quality edges (which would flood the candidate pool with noise). Raise toward 0.70 if anchor-cluster connections prove consistently high-quality in production and are being displaced by semantic candidates.

**`TAG_OVERLAP_SIMILARITY = 0.52`**

Just below the semantic threshold, ensuring tag-only candidates rank last and are processed only if capacity remains under the `MAX_GEMINI_CALLS` cap. Tags are a real but weaker signal: shared domain vocabulary (`"compliance"`, `"infrastructure"`) indicates topical relatedness but not necessarily a meaningful knowledge-graph relationship. Gemini is expected to filter most tag-overlap candidates as non-genuine.

*Tuning guidance:* Raise toward 0.60 if analysis of production results shows tag-sourced candidates converting to genuine relationships at a high rate. Lower toward 0.45 (or remove the candidate source entirely) if they consistently produce noise.

---

## Summary of Changes

| Item | File | Change | Severity |
|------|------|--------|----------|
| Anchor filter: `entity_type = 'Anchor'` → `is_anchor = true` | `crossConnections.ts:fetchAnchorNeighborhood` | Bug fix | **Critical** — feature was returning 0 results |
| Response schema: `new_entity`/`existing_entity` → `source_entity`/`target_entity` | `crossConnections.ts:inferBatch` | Enhancement | Medium-high |
| Prompt: allow reverse direction, instruct Gemini to set source/target | `crossConnections.ts:inferBatch` | Enhancement | Medium-high |
| Parser: combined label→id map for bidirectional lookup | `crossConnections.ts:inferBatch` | Enhancement | Medium-high |
| Graph context query | `crossConnections.ts:fetchEdgeContext` | No change needed | — |
| Similarity constant comments | `crossConnections.ts` top-level constants | Documentation | Low |
