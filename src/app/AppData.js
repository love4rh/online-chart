import { tickCount, randomReal, randomInteger } from '../util/tool.js';


const appData = {
  // DiosDataSource에서 가져옴
  // { (title), columnCount, recordCount, columns, records, beginIndex, getMore, controller, (fetchDone) }

  
  getSampleData: () => {
    const columns = [
      { name: 'X', type: 'DateTime' },
      { name: 'Y1', type: 'Real' },
      { name: 'Y2', type: 'Real' },
      { name: 'Label', type: 'Text' }
    ];

    const nowTick = tickCount();
    const records = [];

    for(var i = 0; i < 100; ++i) {
      records.push([nowTick + 1000 * randomInteger(-80000, 80000), randomReal(-1, 1), randomReal(-100, 100), 'P' + i ])
    }

    return {
      title: 'sample',
      columns,
      records,
      columnCount: columns.length,
      recordCount: records.length,
      beginIndex: 0
    };
  }
};

export default appData;
export {appData};
