import React, { Component } from 'react';
import PropTypes from 'prop-types';

import * as d3 from 'd3';

import { makeid, isvalid, isDateTime, numberWithCommas } from '../grid/common.js';

import './styles.scss';



/**
 * Run Chart
 * props: {
 *   width, height,
 *   base: 시간을 대변하는 데이터.
 *   series: [{ title, axis:(left|right), data:[], color }, .. ]
 *   ]
 * }
 * 참고: https://github.com/adamjanes/udemy-d3/blob/master/06/6.10.0/js/main.js
 */ 
class RunTooltipChart extends Component {
  static propTypes = {
    width: PropTypes.number, // 차트 가로 너비
    height: PropTypes.number, // 차트 세로 넢이
    title: PropTypes.string, // 차트 제목
    ds: PropTypes.object.isRequired, // 데이터 소스 (grid/DataSrouce 참고)
    x: PropTypes.number, // x축 데이터 컬럼. ds의 컬럼 인덱스 중 선택. 없거나 -1이면 데이터 인덱스
    y1: PropTypes.array.isRequired, // left 축에 그릴 데이터 컬럼
    y2: PropTypes.array // right 축에 그릴 데이터 컬럼
  }

  constructor(props) {
    super(props);

    const { width, height } = this.props;

    this.state = {
      compID: 'tk' + makeid(8),
      chartDiv: React.createRef(),
      data: this.initializeData(),
      margin: { LEFT: 100, RIGHT: 100, TOP: 50, BOTTOM: 100 },
      canvasWidth: width,
      canvasHeight: height,
      chartElement: {}
    };


    console.log('RunChart construct', this.state);
  }
  
  componentDidMount() {
    const { canvasWidth, canvasHeight } = this.state;
    const chartElement = this.initializeD3Area(canvasWidth, canvasHeight);

    this.setState({ chartElement });
  }

  componentWillUnmount() {
    //
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if( nextProps.width !== prevState.canvasWidth || nextProps.height !== prevState.canvasHeight ) {
      return { canvasWidth: nextProps.width, canvasHeight: nextProps.height };
    }

    return null;
  }

  // eslint-disable-next-line
  shouldComponentUpdate(nextProps, nextState) {
    // element를 갱신해야 하는 경우라면
    if( this.state.canvasWidth !== nextState.canvasWidth || this.state.canvasHeight !== nextState.canvasHeight ) {
      this.setState({
        chartElement: this.initializeD3Area(nextState.canvasWidth, nextState.canvasHeight)
      });
    }

    return true;
  }

  componentDidUpdate() {
    this.updateD3Chart();
  }

  initializeData = () => {
    const { ds, x, y1, y2 } = this.props;

    const withX = isvalid(x) && x !== -1;
    const dateTimeAxis = withX && isDateTime(ds.getColumnType(x));
    const dataSize = ds._getRowCount(true);

    let xData = null;
    let sortedX = null;
    let extentX = [null, null];

    if( withX ) {
      const tmpX = [];

      if( dateTimeAxis ) {
        // 2021-08-12 21:03:43
        const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");

        for(let r = 0; r < dataSize; ++r) {
          tmpX.push([parseTime(ds.getCellValue(x, r)), r]);
        }
      } else {
        for(let r = 0; r < dataSize; ++r) {
          tmpX.push([ds.getCellValue(x, r), r]);
        }
      }

      tmpX.sort( (a, b) => a[0] > b[0] ? 1 : (a[0] < b[0] ? -1 : 0) );

      xData = tmpX.map(d => d[0]);
      sortedX = tmpX.map(d => d[1]);

      extentX = [xData[0], xData[xData.length - 1]];
    } else {
      extentX = [0, dataSize + 1];
    }

    const extentY1 = [null, null];
    const y1Data = y1.map(c => {
      const data = [];
      for(let r = 0; r < dataSize; ++r) {
        const sIdx = sortedX ? sortedX[r] : r;
        const v = ds.getCellValue(c, sIdx);

        data.push(v);

        if( isvalid(v) ) {
          if( isvalid(extentY1[0]) ) {
            extentY1[0] = Math.min(extentY1[0], v);
            extentY1[1] = Math.max(extentY1[1], v);
          } else {
            extentY1[0] = v;
            extentY1[1] = v;
          }
        }
      }
      return data;
    });

    const extentY2 = [null, null];
    const y2Data = y2 && y2.map(c => {
      const data = [];
      for(let r = 0; r < dataSize; ++r) {
        const sIdx = sortedX ? sortedX[r] : r;
        const v = ds.getCellValue(c, sIdx);

        data.push(v);

        if( isvalid(v) ) {
          if( isvalid(extentY2[0]) ) {
            extentY2[0] = Math.min(extentY2[0], v);
            extentY2[1] = Math.max(extentY2[1], v);
          } else {
            extentY2[0] = v;
            extentY2[1] = v;
          }
        }
      }
      return data;
    });

    const yData = [y1Data];

    if( isvalid(y2Data) ) {
      yData.push(y2Data);
    }
    
    return { dataSize, xData, yData, dateTimeAxis, extentX, extentY:[extentY1, extentY2] };
  }

  initializeD3Area = (canvasWidth, canvasHeight) => {
    const { compID, chartDiv, margin, data } = this.state;

    const { dateTimeAxis, yData } = data;

    const WIDTH = canvasWidth - margin.LEFT - margin.RIGHT;
    const HEIGHT = canvasHeight - margin.TOP - margin.BOTTOM;

    d3.select('.' + compID).remove();

    const svg = d3.select(chartDiv.current).append('svg')
      .attr('class', compID)
      .attr('width', canvasWidth)
      .attr('height', canvasHeight)
    ;

    this._g = svg.append('g')
      .attr('class', compID)
      .attr('transform', `translate(${margin.LEFT}, ${margin.TOP})`);

    const g = this._g;

    // to find x position
    const bisectDate = d3.bisector(d => d).left;

    // create element for x-axis: label, scale, axis, axisCall
    const axisX = {};

    axisX['label'] = g.append('text')
      .attr('class', 'x axisLabel')
      .attr('y', HEIGHT + 50)
      .attr('x', WIDTH / 2)
      .attr('font-size', '20px')
      .attr('text-anchor', 'middle')
      .text('Time');

    axisX['scale'] = dateTimeAxis ? d3.scaleTime().range([0, WIDTH]) : d3.scaleLinear().range([0, WIDTH]);
    axisX['axis'] = g.append('g').attr('class', 'x axis').attr('transform', `translate(0, ${HEIGHT})`);
    axisX['axisCall'] = d3.axisBottom();

    // create element for y-axis
    const axesY = [];
    const tmpObj = {};

    tmpObj['label'] = g.append('text')
      .attr('class', 'y axisLabel')
      .attr('y', -60)
      .attr('x', - (HEIGHT - 70) / 2)
      .attr('font-size', '20px')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .text('Y1');

    tmpObj['scale'] = d3.scaleLinear().range([HEIGHT, 0]);
    tmpObj['axis'] = g.append('g').attr('class', 'y axis');
    tmpObj['axisCall'] = d3.axisLeft();

    axesY.push(tmpObj);

    if( yData.length > 1 ) { // yData의 크기가 2이상이면 right axis 사용하는 경우가 있는 것임
      const tmpObj2 = {};

      tmpObj2['label'] = g.append('text')
        .attr('class', 'y axisLabel')
        .attr('y', WIDTH + 60)
        .attr('x', - (HEIGHT - 70) / 2)
        .attr('font-size', '20px')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .text('Y2');

      tmpObj2['scale'] = d3.scaleLinear().range([HEIGHT, 0]);
      tmpObj2['axis'] = g.append('g').attr('class', 'y y2 axis').attr('transform', `translate(${WIDTH}, 0)`);;
      tmpObj2['axisCall'] = d3.axisRight();

      axesY.push(tmpObj2);
    }

    return { bisectDate, axisX, axesY };
  }

  updateD3Chart = () => {
    const { compID, margin, data, chartElement, canvasWidth, canvasHeight } = this.state;
    const { bisectDate, axisX, axesY } = chartElement;
    // xData가 null이면 data index임 
    const { dateTimeAxis, dataSize, xData, yData, extentX, extentY } = data;

    const WIDTH = canvasWidth - margin.LEFT - margin.RIGHT;
    const HEIGHT = canvasHeight - margin.TOP - margin.BOTTOM;

    // axis props: label, scale, axis, axisCall

    axisX['scale'].domain(extentX);
    axisX['axisCall'].scale(axisX['scale']);
    const act = axisX['axis'].call(axisX['axisCall'])
      .selectAll('text')
      .attr('y', '10')
      .attr('x', '-5')
      .attr('text-anchor', 'end');

    if( dateTimeAxis ) {
      act.attr("transform", "rotate(-45)");
    }

    axesY.map((axis, i) => {
      axis['scale'].domain(extentY[i]);
      axis['axisCall'].scale(axis['scale']);
      axis['axis'].call( axis['axisCall'].tickFormat((v) => numberWithCommas(v)) );
      return true;
    });

    const focusDivID = compID + '_focus';
    const overlayDivID = compID + '_overlay';

    d3.select('.' + focusDivID).remove();
    d3.select('.' + overlayDivID).remove();

    const g = this._g;
    const xScaler = axisX['scale'];
  
    // Line Series Path generator
    let seriesNo = 0;
    yData.map((dl, i) => {
      const yScaler = axesY[i]['scale'];
      const line = d3.line().x((_, i) => xScaler(xData ? xData[i] : i + 1)).y(d => yScaler(d));

      dl.map((dd, j) => {
        const lineID = compID + '_line' + i + '_' + j;

        d3.select('.' + lineID).remove();

        g.append('path')
          .attr('class', lineID)
          .attr('fill', 'none')
          .attr('stroke', d3.schemeTableau10[seriesNo % d3.schemeTableau10.length])
          .attr('stroke-width', '2px')
          .attr('d', line(dd));

        seriesNo += 1;
        return seriesNo;
      });
      
      return true;
    });

    // Axis Label
    axisX['label'].text('index');
    axesY[0]['label'].text('values');

    // add guidance line
    const hoverLine = g.append('g')
      .attr('class', 'focus ' + focusDivID)
      .style('display', 'none');

    hoverLine.append('line')
      .attr('class', 'x-hover-line hover-line')
      .attr('y1', 0)
      .attr('y2', HEIGHT);

    g.append('rect')
      .attr('class', 'overlay ' + overlayDivID)
      .attr('width', WIDTH)
      .attr('height', HEIGHT)
      .on('mouseover', () => hoverLine.style('display', null))
      .on('mouseout', () => hoverLine.style('display', 'none'))
      .on('mousemove', (ev) => {
        const x0 = xScaler.invert(ev.offsetX - margin.LEFT);

        // X축의 값이 있는 경우
        if( xData ) {
          // 날짜 or Label
          const i = bisectDate(xData, x0, 1);
          const v0 = xData[i - 1];
          const v1 = xData[i];

          if( !v0 || !v1 ) { return; }

          hoverLine.attr('transform', `translate(${xScaler(x0 - v0 > v1 - x0 ? v1 : v0)}, 0)`);
        } else {
          const i = Math.max(0, Math.min(Math.round(x0) - 1, dataSize - 1));
          hoverLine.attr('transform', `translate(${xScaler(i + 1)}, 0)`);
        }
      });
  }

  render() {
    const { chartDiv } = this.state;

    return <div ref={chartDiv} />;
  }
}


export default RunTooltipChart;
export { RunTooltipChart };
