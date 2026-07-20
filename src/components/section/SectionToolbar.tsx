import React from 'react';
import { Filter, Search } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { TranslationKey } from '@/lib/translations';

interface Option { value: string; labelKey: TranslationKey; }
interface SectionToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortValue: string;
  onSortChange: (sort: string) => void;
  sortOptions: Option[];
  genreValue: string;
  onGenreChange: (genre: string) => void;
  genreOptions: Option[];
}

export function SectionToolbar({ searchQuery, onSearchChange, sortValue, onSortChange, sortOptions, genreValue, onGenreChange, genreOptions }: SectionToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="hub-toolbar">
      <label className="relative block min-w-0">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hub-subtle)]" size={18} />
        <input
          type="search"
          placeholder={t('section.search.placeholder')}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="hub-field pl-11"
        />
      </label>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <label className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--hub-subtle)]" size={15} />
          <select value={genreValue} onChange={(event) => onGenreChange(event.target.value)} className="hub-select min-w-0 pl-9 sm:min-w-40" aria-label="Filtrar por gênero">
            <option value="">{t('section.genres.all')}</option>
            {genreOptions.map((option) => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}
          </select>
        </label>
        <select value={sortValue} onChange={(event) => onSortChange(event.target.value)} className="hub-select min-w-0 sm:min-w-40" aria-label="Ordenar resultados">
          {sortOptions.map((option) => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}
        </select>
      </div>
    </div>
  );
}
