'use client';

import React from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.min.css';
import Handsontable from 'handsontable';
import { HyperFormula } from 'hyperformula';

// register Handsontable's modules
registerAllModules();

interface SpreadsheetProps {
  data: any[][];
  hotRef?: React.RefObject<HotTable>;
}

export function Spreadsheet({ data, hotRef }: SpreadsheetProps) {
  return (
    <div className="w-full h-full handsontable-container">
      <HotTable
        ref={hotRef}
        data={data}
        rowHeaders={true}
        colHeaders={true}
        height="100%"
        width="100%"
        licenseKey="non-commercial-and-evaluation"
        stretchH="all"
        autoWrapRow={true}
        autoWrapCol={true}
        contextMenu={true}
        manualColumnResize={true}
        manualRowResize={true}
        filters={true}
        dropdownMenu={true}
        comments={true}
        mergeCells={true}
        wordWrap={true}
        formulas={{
          engine: HyperFormula,
        }}
        cell={[]}
      />
    </div>
  );
}
