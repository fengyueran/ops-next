import React, { useCallback, useMemo, useState } from 'react';

import { TextBtnSet } from 'src/components';

interface ListItem {
  name: string;
  isAll?: boolean;
  [key: string]: any;
}

interface Props {
  list: ListItem[];
  onClick: (data?: ListItem[]) => void;
}

export const FilterButtonSet: React.FC<Props> = ({ list, onClick }) => {
  const selectedInitvalue = useMemo(() => {
    const s: { [name: string]: boolean } = {};
    list.forEach(({ name }) => {
      s[name] = true;
    });
    return s;
  }, [list]);

  const [selectedMap, setSelectedList] = useState(selectedInitvalue);

  const handleClick = useCallback(
    (data: ListItem) => {
      const newSelectedMap = { ...selectedMap };

      const allNode = list.find(({ isAll }) => isAll)!;

      const getSelected = () => {
        const selectedArr: ListItem[] = [];
        list.forEach((l) => {
          const { name, isAll } = l;
          if (newSelectedMap[name] && !isAll) {
            selectedArr.push(l);
          }
        });
        if (!selectedArr.length) {
          selectedArr.push({ name: allNode.name, status: '' });
        }
        return selectedArr;
      };

      if (data.isAll) {
        const selected = !newSelectedMap[data.name];
        setSelectedList(selected ? selectedInitvalue : {});
        onClick(selected ? undefined : [{ name: allNode.name, status: '' }]);
      } else {
        newSelectedMap[data.name] = !newSelectedMap[data.name];

        const selectedCount = Object.keys(newSelectedMap).reduce((s, curr: string) => {
          if (curr !== allNode.name && newSelectedMap[curr]) {
            s++;
          }
          return s;
        }, 0);
        const isSelectedAll = selectedCount === Object.keys(newSelectedMap).length - 1;
        newSelectedMap[allNode!.name] = isSelectedAll;
        setSelectedList(newSelectedMap);
        onClick(isSelectedAll ? undefined : getSelected());
      }
    },
    [list, selectedInitvalue, selectedMap, onClick],
  );

  return <TextBtnSet onClick={handleClick} list={list} selectedMap={selectedMap} />;
};
