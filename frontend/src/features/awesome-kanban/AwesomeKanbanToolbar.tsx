import {
  type ChangeEvent,
  type MutableRefObject,
  type ReactNode,
  useState,
} from 'react';
import type {
  AwesomeKanbanApi,
  AwesomeKanbanLocale,
  ToolbarItem,
} from './types';
import { defaultLocale } from './core/defaults';

export interface AwesomeKanbanToolbarProps {
  apiRef: MutableRefObject<AwesomeKanbanApi | null>;
  items?: ToolbarItem[];
  locale?: AwesomeKanbanLocale;
  className?: string;
  onSearch?: (query: string) => void;
  onAddColumn?: () => void;
  onAddRow?: () => void;
}

const DEFAULT_ITEMS: ToolbarItem[] = [
  'search',
  'spacer',
  'undo',
  'redo',
  'addColumn',
  'addRow',
];

export function AwesomeKanbanToolbar({
  apiRef,
  items = DEFAULT_ITEMS,
  locale = defaultLocale,
  className,
  onSearch,
  onAddColumn,
  onAddRow,
}: AwesomeKanbanToolbarProps) {
  const [query, setQuery] = useState('');

  const api = apiRef.current;

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setQuery(next);
    onSearch?.(next);
    // Push the query through the runtime config so AwesomeKanban dims
    // non-matching cards automatically. Apps that want a different search
    // behavior just provide their own `onSearch` and don't need to wire
    // anything else.
    apiRef.current?.setConfig({ searchQuery: next });
  };

  return (
    <div
      className={['ak-toolbar', className].filter(Boolean).join(' ')}
      role="toolbar"
      aria-label="Kanban toolbar"
    >
      {items.map((item, index) => renderItem(item, index, {
        api,
        locale,
        query,
        onSearchChange: handleSearch,
        onAddColumn,
        onAddRow,
      }))}
    </div>
  );
}

interface RenderCtx {
  api: AwesomeKanbanApi | null;
  locale: AwesomeKanbanLocale;
  query: string;
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onAddColumn?: () => void;
  onAddRow?: () => void;
}

function renderItem(item: ToolbarItem, index: number, ctx: RenderCtx): ReactNode {
  if (typeof item === 'string') {
    switch (item) {
      case 'search':
        return <SearchInput key={`search-${index}`} ctx={ctx} />;
      case 'spacer':
        return <span key={`spacer-${index}`} className="ak-toolbar__spacer" />;
      case 'undo':
        return (
          <button
            key={`undo-${index}`}
            type="button"
            className="ak-toolbar__btn"
            disabled={!ctx.api?.canUndo()}
            onClick={() => ctx.api?.undo()}
            aria-label={ctx.locale.toolbar.undo}
            title={ctx.locale.toolbar.undo}
          >
            <i className="ti ti-arrow-back-up" aria-hidden="true" />
          </button>
        );
      case 'redo':
        return (
          <button
            key={`redo-${index}`}
            type="button"
            className="ak-toolbar__btn"
            disabled={!ctx.api?.canRedo()}
            onClick={() => ctx.api?.redo()}
            aria-label={ctx.locale.toolbar.redo}
            title={ctx.locale.toolbar.redo}
          >
            <i className="ti ti-arrow-forward-up" aria-hidden="true" />
          </button>
        );
      case 'sort':
        return (
          <button
            key={`sort-${index}`}
            type="button"
            className="ak-toolbar__btn"
            disabled
            title={ctx.locale.toolbar.sort + ' (Phase 8)'}
          >
            <i className="ti ti-arrows-sort" aria-hidden="true" />
            {ctx.locale.toolbar.sort}
          </button>
        );
      case 'addColumn':
        return (
          <button
            key={`addcol-${index}`}
            type="button"
            className="ak-toolbar__btn ak-toolbar__btn--soft"
            onClick={() => {
              if (ctx.onAddColumn) ctx.onAddColumn();
              else
                ctx.api?.addColumn({
                  column: { label: ctx.locale.toolbar.addColumn },
                });
            }}
          >
            <i className="ti ti-plus" aria-hidden="true" />
            {ctx.locale.toolbar.addColumn}
          </button>
        );
      case 'addRow':
        return (
          <button
            key={`addrow-${index}`}
            type="button"
            className="ak-toolbar__btn"
            onClick={() => {
              if (ctx.onAddRow) ctx.onAddRow();
              else ctx.api?.addRow({ row: { label: ctx.locale.toolbar.addRow } });
            }}
          >
            <i className="ti ti-plus" aria-hidden="true" />
            {ctx.locale.toolbar.addRow}
          </button>
        );
    }
  }
  if (item && typeof item === 'object') {
    if (item.type === 'search') {
      return (
        <SearchInput
          key={`search-cfg-${index}`}
          ctx={ctx}
          placeholder={item.placeholder}
        />
      );
    }
    if (item.type === 'sort') {
      return (
        <button
          key={`sort-cfg-${index}`}
          type="button"
          className="ak-toolbar__btn"
          disabled
          title={ctx.locale.toolbar.sort + ' (Phase 8)'}
        >
          <i className="ti ti-arrows-sort" aria-hidden="true" />
          {ctx.locale.toolbar.sort}
        </button>
      );
    }
    if (item.type === 'custom') {
      return (
        <span key={`custom-${index}`}>
          {(item.render() ?? null) as ReactNode}
        </span>
      );
    }
  }
  return null;
}

interface SearchInputProps {
  ctx: RenderCtx;
  placeholder?: string;
}

function SearchInput({ ctx, placeholder }: SearchInputProps) {
  return (
    <div className="ak-toolbar__search">
      <i className="ti ti-search" aria-hidden="true" />
      <input
        type="search"
        value={ctx.query}
        onChange={ctx.onSearchChange}
        placeholder={placeholder ?? ctx.locale.toolbar.search}
        aria-label={ctx.locale.toolbar.search}
      />
    </div>
  );
}
