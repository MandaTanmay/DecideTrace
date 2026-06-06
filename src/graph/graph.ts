/**
 * src/graph/graph.ts
 *
 * LangGraph StateGraph definition for the MeetMind multi-agent pipeline.
 *
 * Execution topology:
 *
 *   __start__ ─┬─► meetingAnalyzer  ─────────────────────┐
 *              └─► knowledgeIndexer ─────────────────────┤
 *                                                         ▼
 *                                               conflictDetector
 *                                                         │
 *                                          ┌──────────────┴──────────────┐
 *                                          ▼                             ▼
 *                                    actionExtractor            knowledgeUpdater
 *                                          │                             │
 *                                          └──────────────┬──────────────┘
 *                                                         ▼
 *                                                      __end__
 *
 * Agents 1 & 2 run in parallel (both start from __start__).
 * Agent 3 waits for both (fan-in via LangGraph's default behavior).
 * Agents 4 & 5 run in parallel (both start from conflictDetector).
 */

import { StateGraph, END, START } from '@langchain/langgraph'
import { GraphState } from './state'
import { meetingAnalyzerAgent } from '../agents/meetingAnalyzer'
import { knowledgeIndexerAgent } from '../agents/knowledgeIndexer'
import { conflictDetectorAgent } from '../agents/conflictDetector'
import { actionExtractorAgent } from '../agents/actionExtractor'
import { knowledgeUpdaterAgent } from '../agents/knowledgeUpdater'

/**
 * Build and compile the MeetMind LangGraph pipeline.
 * Returns a compiled graph ready to invoke.
 *
 * Call buildGraph() once per request — the graph is lightweight to build.
 * Agents themselves hold no state between invocations.
 */
export function buildGraph() {
  // ─── Build graph with method chaining for TypeScript inference ───────────
  const graph = new StateGraph(GraphState)
    // 1. Register agent nodes
    .addNode('meetingAnalyzer', meetingAnalyzerAgent)
    .addNode('knowledgeIndexer', knowledgeIndexerAgent)
    .addNode('conflictDetector', conflictDetectorAgent)
    .addNode('actionExtractor', actionExtractorAgent)
    .addNode('knowledgeUpdater', knowledgeUpdaterAgent)

    // 2. Edges: parallel start (fan-out)
    .addEdge(START, 'meetingAnalyzer')
    .addEdge(START, 'knowledgeIndexer')

    // 3. Edges: fan-in to conflict detector
    .addEdge('meetingAnalyzer', 'conflictDetector')
    .addEdge('knowledgeIndexer', 'conflictDetector')

    // 4. Edges: parallel final agents (fan-out from Agent 3)
    .addEdge('conflictDetector', 'actionExtractor')
    .addEdge('conflictDetector', 'knowledgeUpdater')

    // 5. Edges: terminate
    .addEdge('actionExtractor', END)
    .addEdge('knowledgeUpdater', END)

  return graph.compile()
}

// ─── Export compiled graph for LangGraph Studio ──────────────────────────────
export const graph = buildGraph()
