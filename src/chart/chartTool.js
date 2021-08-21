import * as d3 from 'd3';
import { isvalid, isDateTime, isundef } from '../grid/common.js';



export const getSeriesColor = (idx) => {
  return d3.schemeTableau10[idx % d3.schemeTableau10.length];
}


/**
 * 
 * @param {DataStore} ds 데이터 그리드에서 사용하는 데이터 객체
 * @param {int} time 시간 축 데이터 인덱스. -1이면 데이터 인덱스를 의미함
 * @param {array of int} y1 기본 Y축을 기준으로 그릴 컬럼 인덱스 목록
 * @param {array of int} y2 보조 Y축을 기준으로 그릴 컬럼 인덱스 목록. 없을 수 있음.
 * @returns {
 *  dataSize: 데이터 크기, xData: X축 데이터(없을 수 있음), yData: Y축 데이터 [Y1, Y2],
 *  dateTimeAxis: X출 시간축 여부, extentX: X축 범위, extentY: Y축 범위 목록
 * }
 */
 export const convertToChartData = (param) => {
  const { ds, time, y1, y2 } = param;
  const withX = isvalid(time) && time !== -1;
  const dateTimeAxis = withX && isDateTime(ds.getColumnType(time));
  const dataSize = ds._getRowCount(true);

  let xData = null;
  let sortedX = null;
  let extentX = [0, dataSize + 1];

  if( dateTimeAxis ) {
    const tmpX = [];
    // 2021-08-12 21:03:43
    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");

    for(let r = 0; r < dataSize; ++r) {
      tmpX.push([parseTime(ds.getCellValue(time, r)), r]);
    }

    tmpX.sort( (a, b) => a[0] > b[0] ? 1 : (a[0] < b[0] ? -1 : 0) );

    xData = tmpX.map(d => d[0]);
    sortedX = tmpX.map(d => d[1]);
    extentX = [xData[0], xData[xData.length - 1]];
  } else if( withX ) {
    xData = [];
    for(let r = 0; r < dataSize; ++r) {
      xData.push(ds.getCellValue(time, r));
    }
  }

  let cCount = 0;
  const yData = [], extentY = [];

  [y1, y2].map((y, i) => {
    if( isundef(y) ) {
      return false;
    }

    const tmpE = [null, null];

    yData.push( y.map(c => {
      const data = [];
      const title = ds.getColumnName(c);
      const color = getSeriesColor(cCount);

      cCount += 1;

      for(let r = 0; r < dataSize; ++r) {
        const sIdx = sortedX ? sortedX[r] : r;
        const v = ds.getCellValue(c, sIdx);

        data.push(v);

        if( isvalid(v) ) {
          if( isvalid(tmpE[0]) ) {
            tmpE[0] = Math.min(tmpE[0], v);
            tmpE[1] = Math.max(tmpE[1], v);
          } else {
            tmpE[0] = v;
            tmpE[1] = v;
          }
        }
      }
      return { data, title, color };
    }) );
    extentY.push(tmpE);
    return true;
  });
  
  return { dataSize, xData, yData, dateTimeAxis, extentX, extentY };
}
