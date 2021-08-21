// eslint-disable-next-line
import { tickCount, randomReal, randomInteger } from '../util/tool.js';

import sample from '../resource/sample.json';


const appData = {
  // DiosDataSource에서 가져옴
  // { (title), columns, records }

  
  getSampleData: () => {
    const oneDay = 24 * 60 * 60000;
    // eslint-disable-next-line
    const baseTick = tickCount() - oneDay * 30;
    const rindex = [];

    for(let i = 0; i < 100; ++i) {
      rindex.push(i + 1);
    }

    /*
    const columns = [
      { name: 'Label', type: 'string', data: rindex.map(d => 'P' + d) },
      { name: 'Date', type: 'datetime', data: rindex.map(d => baseTick + d * oneDay) },
      { name: 'Y1', type: 'number', data: rindex.map(d => Math.round(randomReal(0, d/2) * 10000) / 10000) },
      { name: 'Y2', type: 'number', data: rindex.map(d => Math.round(randomReal(0, 51 - d/2) * 10000) / 10000) },
      { name: 'Y3', type: 'number', data: rindex.map(d => randomInteger(-50, d * 10)) },
      { name: 'Y4', type: 'number', data: rindex.map(d => randomInteger(-50, (100 - d) * 10)) }
    ]; // */

    const { columns } = sample;

    return {
      title: 'sample',
      columns: columns,
      editable: false
    };
  }
};

export default appData;
export {appData};
