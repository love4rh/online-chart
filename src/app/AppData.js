import { tickCount, randomReal, randomInteger } from '../util/tool.js';


const appData = {
  // DiosDataSource에서 가져옴
  // { (title), columns, records }

  
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
      records.push([
        nowTick + 1000 * randomInteger(-80000, 80000),
        Math.round(randomReal(-1, 1) * 10000) / 10000,
        randomInteger(-1000, 1000),
        'P' + i
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
