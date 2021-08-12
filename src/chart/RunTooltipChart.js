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

    const { width, height, ds, x, y2 } = this.props;

    const useRightAxis = isvalid(y2) && Array.isArray(y2) && y2.length > 0;
    const dateTimeAxis = isvalid(x) && x !== -1 && !isDateTime(ds.getColumnType(x));

    this.state = {
      compID: 'tk' + makeid(8),
      chartDiv: React.createRef(),
      margin: { LEFT: 100, RIGHT: 100, TOP: 50, BOTTOM: 100 },
      dateTimeAxis, // X 축이 시간 축인지 여부. false이면 인데스임
      useRightAxis, // Right 축 사용 여부
      canvasWidth: width,
      canvasHeight: height,
      chartElement: {}
    };

    console.log('RunTooltipChart constructor', width, height)
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
    this.state.chartElement.yLabel.text('AAAA');

    this.updateDS3Chart();
  }

  initializeD3Area = (canvasWidth, canvasHeight) => {
    const { compID, chartDiv, margin, dateTimeAxis, useRightAxis } = this.state;

    const WIDTH = canvasWidth - margin.LEFT - margin.RIGHT;
    const HEIGHT = canvasHeight - margin.TOP - margin.BOTTOM;

    d3.select('.' + compID).remove();

    const svg = d3.select(chartDiv.current).append('svg')
      .attr('class', compID)
      .attr('width', canvasWidth)
      .attr('height', canvasHeight)
    ;

    this._g = svg.append('g')
      .attr('transform', `translate(${margin.LEFT}, ${margin.TOP})`);

    const g = this._g;

    // for tooltip
    const bisectDate = d3.bisector(d => d.date).left;

    // create element for x-axis labels
    const xLabel = g.append('text')
      .attr('class', 'x axisLabel')
      .attr('y', HEIGHT + 50)
      .attr('x', WIDTH / 2)
      .attr('font-size', '20px')
      .attr('text-anchor', 'middle')
      .text('Time');

    // create element for y-axis labels
    const yLabel = g.append('text')
      .attr('class', 'y axisLabel')
      .attr('y', -60)
      .attr('x', - (HEIGHT - 70) / 2)
      .attr('font-size', '20px')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .text('Y1');

    const yLabel2 = g.append('text')
      .attr('class', 'y axisLabel')
      .attr('y', WIDTH + 60)
      .attr('x', - (HEIGHT - 70) / 2)
      .attr('font-size', '20px')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .text('Y2');

    // scales
    const x = dateTimeAxis ? d3.scaleTime().range([0, WIDTH]) : d3.scaleLinear().range([0, WIDTH]);
    const y = d3.scaleLinear().range([HEIGHT, 0]);

    // axis generators
    const xAxisCall = d3.axisBottom();
    const yAxisCall = d3.axisLeft();
    const y2AxisCall = d3.axisRight();

    // axis groups
    const xAxis = g.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${HEIGHT})`);

    const yAxis = g.append('g')
      .attr('class', 'y axis');

    const y2Axis = g.append('g')
      .attr('class', 'y axis');

    return { bisectDate, x, y, xAxisCall, yAxisCall, y2AxisCall, xAxis, yAxis, y2Axis, xLabel, yLabel, yLabel2 };
  }

  updateDS3Chart = () => {
    const { ds, y1 } = this.props;
    const { margin, chartElement, canvasWidth, canvasHeight } = this.state;
    const { bisectDate, x, y, xAxisCall, yAxisCall, xAxis, yAxis, xLabel, yLabel } = chartElement;

    const WIDTH = canvasWidth - margin.LEFT - margin.RIGHT;
    const HEIGHT = canvasHeight - margin.TOP - margin.BOTTOM;

    const trans = d3.transition().duration(1000);

    const xRange = [0, ds.getRowCount() + 1];

    // Min/Max 계산
    const y1Range = [0, 0];
    for(let c = 0; c < y1.length; ++c) {
      const tmpMM = d3.extent(ds.getDataList(y1[c]));

      if( y1Range[0] > tmpMM[0] ) {
        y1Range[0] = tmpMM[0];
      }

      if( y1Range[1] < tmpMM[1] ) {
        y1Range[1] = tmpMM[1];
      }
    }

    y1Range[0] = y1Range[0] / 1.005;
    y1Range[1] = y1Range[1] * 1.005;

    x.domain(xRange);
    y.domain(y1Range);

    xAxisCall.scale(x);
    xAxis.call(xAxisCall)
      .selectAll('text')
      .attr('y', '10')
      .attr('x', '-5')
      .attr('text-anchor', 'end');
    //  .attr('transform', 'rotate(-45)');

    yAxisCall.scale(y);
    yAxis.call(yAxisCall.tickFormat((v) => numberWithCommas(v)));

    // yAxis.style('display', 'none');
  
    d3.select('.focus').remove();
    d3.select('.overlay').remove();

    const g = this._g;
    const focus = g.append('g')
      .attr('class', 'focus')
      .style('display', 'none');

    focus.append('line')
      .attr('class', 'x-hover-line hover-line')
      .attr('y1', 0)
      .attr('y2', HEIGHT);
  
    focus.append('line')
      .attr('class', 'y-hover-line hover-line')
      .attr('x1', 0)
      .attr('x2', WIDTH);
  
    focus.append('circle')
      .attr('r', 7.5);
  
    focus.append('text')
      .attr('x', 15)
      .attr('dy', '.31em');
  
    g.append('rect')
      .attr('class', 'overlay')
      .attr('width', WIDTH)
      .attr('height', HEIGHT)
      .on('mouseover', () => focus.style('display', null))
      .on('mouseout', () => focus.style('display', 'none'))
      .on('mousemove', (ev) => {
        const x0 = x.invert(ev.offsetX - margin.LEFT);
        // const i = bisectDate(dataTimeFiltered, x0, 1);
        const i = Math.max(0, Math.min(Math.round(x0) - 1, ds.getRowCount() - 1));

        const dataList = ds.getDataList(y1[0]);

        const d = dataList[i]; // x0 - d0.date > d1.date - x0 ? d1 : d0;

        focus.attr('transform', `translate(${x(i + 1)}, ${y(d)})`);
        focus.select('text').text(d);
        focus.select(".x-hover-line")
          .attr("y1", - y(d))
          .attr("y2", HEIGHT - y(d));
        focus.select(".y-hover-line")
          .attr("x1", WIDTH - x(i + 1))
          .attr("x2", - x(i + 1));
      });
    
    // Path generator
    // for(let c = 0; c < y1.length; ++c) {
    const dataList = ds.getDataList(y1[0]);

    const line = d3.line()
      .x((_, i) => x(i + 1))
      .y(d => y(d));

    d3.select('line1').remove();

    g.append('path')
      .attr('class', 'line1')
      .attr('fill', 'none')
      .attr('stroke', d3.schemeTableau10[0])
      .attr('stroke-width', '3px')
      .attr('d', line(dataList));

    xLabel.text('index');
    yLabel.text('values');
    // */
  }

  render() {
    const { chartDiv } = this.state;

    return <div ref={chartDiv} />;
  }
}


export default RunTooltipChart;
export { RunTooltipChart };
