import { tickCount, randomReal, randomInteger } from '../util/tool.js';


const appData = {
  // DiosDataSource에서 가져옴
  // { (title), columns, records }

  
  getSampleData: () => {
    const nowTick = tickCount();
    const rindex = [];

    for(let i = 0; i < 100; ++i) {
      rindex.push(0);
    }

    const columns = [
      { name: 'Label', type: 'string', data: rindex.map((d, i) => 'P' + i) },
      { name: 'X', type: 'datetime', data: rindex.map((d, i) => nowTick + 1000 * randomInteger(-80000, 80000)) },
      { name: 'Y1', type: 'number', data: rindex.map((d, i) => Math.round(randomReal(-1, 1) * 10000) / 10000) },
      { name: 'Y2', type: 'number', data: rindex.map((d, i) => randomInteger(-1000, 1000)) }
    ];

    return {
      title: 'sample',
      columns,
      editable: true
    };
  }
};

export default appData;
export {appData};
