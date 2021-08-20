import React, { Component } from 'react';
import PropTypes from 'prop-types';

import * as d3 from 'd3';

import { makeid, isvalid, isDateTime, numberWithCommas, isundef } from '../grid/common.js';

import { RangeSlider } from '../component/RangeSlider.js';

import './styles.scss';



const sliderSize = 28;

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
    time: PropTypes.number, // 시간축 데이터 컬럼. ds의 컬럼 인덱스 중 선택. 없거나 -1이면 데이터 인덱스. 날짜가 아니라면 Label로 간주함
    y1: PropTypes.array.isRequired, // left 축에 그릴 데이터 컬럼
    y2: PropTypes.array // right 축에 그릴 데이터 컬럼
  }

  constructor(props) {
    super(props);

    const { width, height, y2 } = this.props;

    this.state = {
      compID: 'tk' + makeid(8),
      chartDiv: React.createRef(),
      data: this.initializeData(),
      margin: { LEFT: 70, RIGHT: 70, TOP: 50, BOTTOM: 50 },
      canvasWidth: width - sliderSize - (isvalid(y2) && y2.length > 0 ? sliderSize : 0),
      canvasHeight: height,
      chartElement: {}
    };

    this.hideTimeOut = null;

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
      return {
        canvasWidth: nextProps.width - sliderSize - (isvalid(nextProps.y2) && nextProps.y2.length > 0 ? sliderSize : 0),
        canvasHeight: nextProps.height
      };
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

  getSeriesColor = (idx) => d3.schemeTableau10[idx % d3.schemeTableau10.length]

  initializeData = () => {
    const { ds, time, y1, y2 } = this.props;

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
        const color = this.getSeriesColor(cCount);
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

  initializeD3Area = (canvasWidth, canvasHeight) => {
    const { compID, chartDiv, margin, data } = this.state;

    const { dateTimeAxis, yData } = data;

    const WIDTH = canvasWidth - margin.LEFT - margin.RIGHT;
    const HEIGHT = canvasHeight - margin.TOP - margin.BOTTOM;

    if( isvalid(this._svg) ) {
      this._svg.remove();
    }

    const svg = d3.select(chartDiv.current).append('svg')
      .attr('class', compID)
      .attr('width', canvasWidth)
      .attr('height', canvasHeight);

    this._svg = svg;
    this._g = svg.append('g')
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

  updateD3Chart = (userXExtent) => {
    const { chartDiv, compID, margin, data, chartElement, canvasWidth, canvasHeight } = this.state;
    const { bisectDate, axisX, axesY } = chartElement;

    // xData가 null이면 data index임. xData가 null이 아니고 dateTimeAxis가 false이면 label임.
    const { dateTimeAxis, dataSize, xData, yData, extentX, extentY } = data;

    const WIDTH = canvasWidth - margin.LEFT - margin.RIGHT;
    const HEIGHT = canvasHeight - margin.TOP - margin.BOTTOM;

    // axis props: label, scale, axis, axisCall

    axisX['scale'].domain(isvalid(userXExtent) ? userXExtent : extentX);
    axisX['axisCall'].scale(axisX['scale']);

    const indexAxisHasLabel = isvalid(xData) && !dateTimeAxis;

    const act = axisX['axis']
      .transition()
      .call(!indexAxisHasLabel ? axisX['axisCall'] : axisX['axisCall'].tickFormat(idx => idx < 1 || idx > xData.length ? '' : xData[idx - 1]))
      .selectAll('text')
      .attr('y', '10');

    if( dateTimeAxis || indexAxisHasLabel ) {
      act.attr('x', '-5')
        .attr('text-anchor', 'end')
        .transition().attr('transform', 'rotate(-45)');
    } else {
      act.attr('x', '0')
        .attr('text-anchor', 'middle');
    }

    axesY.map((axis, i) => {
      axis['scale'].domain(extentY[i]);
      axis['axisCall'].scale(axis['scale']);
      axis['axis'].transition().call( axis['axisCall'].tickFormat(v => numberWithCommas(v)) );
      return true;
    });

    const g = this._g;
    const xScaler = axisX['scale'];

    // Overlay for handling mouse event
    const focusDivID = compID + '_focus';
    const overlayDivID = compID + '_overlay';
    const tooltipDivID = compID + '_tooltip';

    [focusDivID, overlayDivID, tooltipDivID].map(k => d3.select('.' + k).remove());

    // add guidance line
    const hoverLine = g.append('g')
      .classed('focus', true).classed(focusDivID, true)
      .style('display', 'none');

    hoverLine.append('line')
      .attr('class', 'x-hover-line hover-line')
      .attr('y1', 0).attr('y2', HEIGHT);

    hoverLine.append('line')
      .attr('class', 'y-hover-line hover-line')
      .attr('x1', 0).attr('x2', WIDTH);

    const tooltipBox = d3.select(chartDiv.current)
      .append('div')
      .classed('chartToolTip', true).classed(tooltipDivID, true)
      .style('display', 'none');

    const cbShowToolTip = (ev) => {
      let dataIdx = 0;
      const x0 = xScaler.invert(ev.offsetX - margin.LEFT);

      // 날짜 축인 경우
      if( dateTimeAxis ) {
        dataIdx = bisectDate(xData, x0, 1);
        const v0 = xData[dataIdx - 1], v1 = xData[dataIdx];

        if( !v0 || !v1 ) { return; }

        hoverLine.select('.x-hover-line').attr('transform', `translate(${xScaler(x0 - v0 > v1 - x0 ? v1 : v0)}, 0)`);
      } else {
        dataIdx = Math.max(0, Math.min(Math.round(x0) - 1, dataSize - 1));
        hoverLine.select('.x-hover-line').attr('transform', `translate(${xScaler(dataIdx + 1)}, 0)`);
      }

      hoverLine.select('.y-hover-line').attr('transform', `translate(0, ${ev.offsetY - margin.TOP})`);

      // Tooltip box
      tooltipBox.html(''); // 기존 툴팁 삭제

      tooltipBox.append('div')
        .classed('tooltipItem', true)
        .text(`X: ${xData ? xData[dataIdx] : dataIdx}`); // TODO DateTime 처리

      let sCount = 1;
      yData.map(dl => {
        dl.map(dd => {
          tooltipBox.append('div')
            .classed('tooltipItem', true)
            .style('color', dd.color)
            .style('opacity', '0.8')
            .text(`${dd.title}: ${dd.data[dataIdx]}`);

          sCount += 1;
          return true;
        });
        return true;
      });

      const guideBoxWidth = 120 + 10;
      const guideBoxHeight = sCount * 24 + 10;
      const maxX = chartDiv.current.offsetLeft + chartDiv.current.offsetWidth;
      const maxY = chartDiv.current.offsetTop + chartDiv.current.offsetHeight
      const pX = ev.clientX + guideBoxWidth + margin.LEFT > maxX ? ev.clientX - guideBoxWidth + 5 : ev.clientX + 10;
      const pY = ev.clientY + guideBoxHeight + margin.BOTTOM > maxY ? ev.clientY - guideBoxHeight + 10 : ev.clientY + 10;

      tooltipBox.attr('style', `left: ${pX}px; top: ${pY}px;`);
    }; // end of callback for showing tooptip

    g.append('rect')
      .attr('class', 'overlay ' + overlayDivID)
      .attr('width', WIDTH)
      .attr('height', HEIGHT)
      .on('mouseover', () => { hoverLine.style('display', null); tooltipBox.style('display', null); })
      // [아래] line의 mouse over 이벤트 시 발생하여 가이드 선이 사라지는 현상이 있어 Timeout을 두어 처리하였음
      .on('mouseout', () => this.hideTimeOut = setTimeout(() => { hoverLine.style('display', 'none'); tooltipBox.style('display', 'none'); this.hideTimeOut = null; }, 100) )
      .on('mousemove', cbShowToolTip);
    // end of overlay

    const clipBoxID = compID + '_clip';

    g.append('clipPath')
      .attr('id', clipBoxID)
      .append('rect')
      .attr('width', WIDTH)
      .attr('height', HEIGHT)

    // Line Series Path generator
    yData.map((dl, i) => {
      const yScaler = axesY[i]['scale'];
      const line = d3.line().x((_, i) => xScaler(dateTimeAxis ? xData[i] : i + 1)).y(d => yScaler(d));

      dl.map((dd, j) => {
        const lineID = compID + '_line_' + i + '_' + j;

        d3.select('.' + lineID).remove();

        g.append('g')
          .attr('clip-path', `url(#${clipBoxID})`)
          .append('path')
          .on('mouseover', (ev) => {
            d3.select('.' + lineID).classed('selectedLine', true);
            if( isvalid(this.hideTimeOut) ) {
              clearTimeout(this.hideTimeOut);
            }
            cbShowToolTip(ev);
           })
          .on('mouseout', () => d3.select('.' + lineID).classed('selectedLine', false) )
          .classed(lineID, true)
          .attr('fill', 'none')
          .attr('stroke', dd.color)
          .attr('stroke-width', '2px')
          .attr('opacity', '0.8')
          .transition()
          .attr('d', line(dd.data));

        return dd.title;
      });

      return true;
    });

    // Axis Label
    axisX['label'].text('index');
    axesY[0]['label'].text('values');
  }

  handleSliderEvent = (axisType) => (type, param) => {
    console.log('handleSliderEvent', axisType, type, param);

    if( axisType === 'X' ) {
      this.updateD3Chart(param);
    }
  }

  render() {
    const { width, height } = this.props;
    const { data, chartDiv, margin } = this.state;
    const { xData, dateTimeAxis, extentX, extentY } = data;

    const a = 9, p = 8;
    const hasY2 = extentY.length > 1;

    return (
      <div className="chartMain">
        <div className="chartTopDiv">
          <div style={{
            'width': `${sliderSize}px`,
            'padding': `${p}px0 `,
            'margin': `${margin.TOP - 10}px 0 ${margin.BOTTOM - 10}px 0`
          }}>
            <RangeSlider
              valueRange={extentY[0]}
              onEvent={this.handleSliderEvent('Y1')}
              vertical={true}
            />
          </div>
          <div ref={chartDiv} />
          { hasY2 &&
            <div style={{
              'width': `${sliderSize}px`,
              'padding': `${p}px0 `,
              'margin': `${margin.TOP - 10}px 0 ${margin.BOTTOM - 10}px 0`
            }}>
              <RangeSlider
                valueRange={extentY[1]}
                onEvent={this.handleSliderEvent('Y1')}
                vertical={true}
              />
            </div>
          }
        </div>
        <div style={{
          'width': `${width - margin.LEFT - margin.RIGHT + (a - p) * 2 - sliderSize - (hasY2 ? sliderSize : 0)}px`,
          'height': `${sliderSize}px`,
          'flexBasis': `${sliderSize}px`,
          'padding': `0 ${p}px`,
          'margin': `0 ${margin.RIGHT - a + (hasY2 ? sliderSize : 0)}px 0 ${margin.LEFT - a + sliderSize}px`
        }}>
          <RangeSlider
            valueRange={extentX}
            labelData={xData}
            onEvent={this.handleSliderEvent('X')}
            dateTime={dateTimeAxis}
          />
        </div>
      </div>
    );
  }
}


export default RunTooltipChart;
export { RunTooltipChart };
