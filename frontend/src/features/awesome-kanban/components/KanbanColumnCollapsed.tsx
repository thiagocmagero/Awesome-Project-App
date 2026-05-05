/**
 * Collapsed column visuals are rendered inline by `KanbanColumn` via the
 * `.ak-column--collapsed` modifier. This module re-exports the core component
 * so consumers that prefer to compose at this granularity have a stable name.
 *
 * In a later phase we may extract a dedicated implementation if collapsed
 * columns ever diverge functionally from expanded ones (e.g. different drop
 * targets, vertical card stack, etc.).
 */
export { KanbanColumn as KanbanColumnCollapsed } from './KanbanColumn';
