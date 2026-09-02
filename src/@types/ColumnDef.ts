import type { SortableColumn } from '../@enums/SortableColumn';

export interface ColumnDef {
  id: SortableColumn;
  label: string;
  numeric?: boolean;
}
