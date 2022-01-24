export type DiffListIdAccessor<T, IdT = string | number> = (item: T) => IdT;

export type MovedItem<T, IdT> = {
  item: T;
  id: IdT;
  from: number;
  to: number;
};

export type ListDiff<T = any, IdT = string | number> = {
  added: T[];
  removed: T[];
  updated: T[];
  moved: MovedItem<T, IdT>[];
};

export function getListDiff<T, IdT>(
  oldItems: T[],
  newItems: T[],
  idAccessor: DiffListIdAccessor<T, IdT>
): ListDiff<T, IdT> {
  const oldMap = new Map(oldItems.map((item, index) => [idAccessor(item), { item, index }]));
  const newMap = new Map(newItems.map((item, index) => [idAccessor(item), { item, index }]));

  const remainders: T[] = [];
  const toAdd: T[] = [];
  const toRemove: T[] = [];
  const moved: MovedItem<T, IdT>[] = [];

  newItems.forEach((x) => {
    const key = idAccessor(x);
    const oldItem = oldMap.get(key);
    if (!oldItem) {
      toAdd.push(x);
      newMap.delete(key);
    } else {
      const newItem = newMap.get(key);
      if (newItem && oldItem.index !== newItem.index) {
        moved.push({
          item: x,
          id: key,
          from: oldItem.index,
          to: newItem.index,
        });
      }
      remainders.push(x);
    }
  });

  oldItems.forEach((x) => {
    const key = idAccessor(x);
    if (!newMap.has(key)) {
      toRemove.push(x);
    }
  });

  return {
    added: toAdd,
    removed: toRemove,
    updated: remainders,
    moved,
  };
}
