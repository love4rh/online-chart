import { tickCount, randomReal, randomInteger } from '../util/tool.js';


const appData = {
  // DiosDataSource에서 가져옴
  // { (title), columns, records }

  
  getSampleData: () => {
    const columns = [
      { name: 'Label', type: 'string' },
      { name: 'X', type: 'datetime' },
      { name: 'Y1', type: 'number' },
      { name: 'Y2', type: 'number' }
    ];

    const nowTick = tickCount();
    const records = [];

    for(var i = 0; i < 100; ++i) {
      records.push([
        'P' + i,
        nowTick + 1000 * randomInteger(-80000, 80000),
        Math.round(randomReal(-1, 1) * 10000) / 10000,
        randomInteger(-1000, 1000)
      ]);
    }

    return {
      title: 'sample',
      columns,
      records,
      editable: true
    };
  }
};

export default appData;
export {appData};
