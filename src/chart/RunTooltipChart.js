import React, { Component } from 'react';
import PropTypes from 'prop-types';

import * as d3 from 'd3';

import { makeid, isvalid, istrue, numberWithCommas } from '../grid/common.js';

import { RangeSlider, sliderSize } from '../component/RangeSlider.js';

import { RiCheckboxBlankLine, RiCheckboxLine } from 'react-icons/ri';

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
    data: PropTypes.object.isRequired, // 차팅 데이터. convertToChartData 참고
    showingRangeX: PropTypes.array, // X축 표시 범위. 없으면 전체
    withSlider: PropTypes.bool, // 데이터 조정을 위한 슬라이더 포함 여부 (가로축)
    withYSlider: PropTypes.bool, // 데이터 조정을 위한 슬라이더 포함 여부 (세로축)
    withLegend: PropTypes.bool, // 범례 표시 여부
  }

  constructor(props) {
    super(props);

    const { width, height, data, showingRangeX, withLegend } = this.props;

    const withSlider = istrue(this.props.withSlider);
    const withYSlider = istrue(this.props.withYSlider);

    const useY2 = data && data.yData.length > 1;

    // data {
    // dataSize: 데이터 크기, xData: X축 데이터(없을 수 있음), yData: Y축 데이터 [Y1, Y2],
    // dateTimeAxis: X출 시간축 여부, extentX: X축 범위, extentY: Y축 범위 목록
    // }

    const { dataSize, xData, dateTimeAxis, extentX, extentY } = data;
    const yData = [];
    data.yData.map((dl, idx) => {
      dl.map(dd => {
        yData.push({ ...dd, shown:true, useY2:(idx > 0) });
        return true;
      });
      return true;
    });

    // console.log('ydata', yData);

    this.state = {
      compID: 'tk' + makeid(8),
      chartDiv: React.createRef(),
      data: { dataSize, xData, dateTimeAxis, extentX, yData, extentY1:extentY[0], extentY2:extentY[1] },
      useY2,
      margin: { LEFT: 70, RIGHT: 70, TOP: 50, BOTTOM: 70 },
      canvasWidth: width - (withYSlider ? (sliderSize + (useY2 ? sliderSize : 0)) : 0),
      canvasHeight: height - (withSlider ? sliderSize : 0),
      chartElement: {},
      withSlider,
      withYSlider,
      withLegend,
      userXExtent: showingRangeX
    };

    this.hideTimeOut = null;

    // console.log('RunChart construct', this.state);
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
      const withSlider = istrue(nextProps.withSlider);
      const withYSlider = istrue(nextProps.withYSlider);
      const hasY2 = nextProps.data.yData.length > 1;

      return {
        withSlider, withYSlider,
        canvasWidth: nextProps.width - (withYSlider ? (sliderSize + (hasY2 ? sliderSize : 0)) : 0),
        canvasHeight: nextProps.height - (withSlider ? sliderSize : 0)
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

  initializeD3Area = (canvasWidth, canvasHeight) => {
    const { compID, chartDiv, margin, data, useY2 } = this.state;

    const { dateTimeAxis } = data;

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

    if( useY2 ) {
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
    const { chartDiv, compID, margin, data, chartElement, canvasWidth, canvasHeight, userXExtent, userY1Extent, userY2Extent } = this.state;
    const { bisectDate, axisX, axesY } = chartElement;

    // xData가 null이면 data index임. xData가 null이 아니고 dateTimeAxis가 false이면 label임.
    const { dateTimeAxis, dataSize, xData, extentX, yData, extentY1, extentY2 } = data;

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

    axesY.map((axis, idx) => {
      if( idx === 1 ) {
        axis['scale'].domain(isvalid(userY2Extent) ? userY2Extent : extentY2);
      } else {
        axis['scale'].domain(isvalid(userY1Extent) ? userY1Extent : extentY1);
      }
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

      yData.map(dd => {
        tooltipBox.append('div')
          .classed('tooltipItem', true)
          .style('color', dd.color)
          .text(`${dd.title}: ${numberWithCommas(Math.round(dd.data[dataIdx] * 10000) / 10000)}`);

        return true;
      });

      const guideBoxWidth = 120 + 10;
      const guideBoxHeight = yData.length * 24 + 10;
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
    yData.map((dd, idx) => {
      const yScaler = axesY[dd.useY2 ? 1 : 0]['scale'];
      const line = d3.line().x((_, i) => xScaler(dateTimeAxis ? xData[i] : i + 1)).y(d => yScaler(d));
      const lineID = compID + '_line_' + idx;

      d3.select('.' + lineID).remove();

      if( !dd.shown ) {
        return false;
      }

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

      return true;
    });

    // Axis Label
    axisX['label'].text('index');
    axesY[0]['label'].text('values');
  }

  handleSliderEvent = (axisType) => (type, param) => {
    // console.log('handleSliderEvent', axisType, type, param);

    if( axisType === 'X' ) {
      this.setState({ userXExtent: param });
    } else if( axisType === 'Y1' ) {
      this.setState({ userY1Extent: param });
    } else if( axisType === 'Y2' ) {
      this.setState({ userY2Extent: param });
    }
  }

  handleLengendItemClick = (sIdx) => () => {
    const { data } = this.state;
    const { yData } = data;

    yData[sIdx].shown = !yData[sIdx].shown;

    this.setState({ data: data });
  }

  render() {
    const { width } = this.props;
    const {
      data, chartDiv, margin,
      withSlider, withYSlider, withLegend,
      useY2, userXExtent, userY1Extent, userY2Extent
    } = this.state;
    const { xData, yData, dateTimeAxis, extentX, extentY } = data;

    const a = 9, p = 8;
    const hasY2 = withYSlider && useY2;

    return (
      <div className="chartMain">
        <div className="chartTopDiv">
          { withYSlider &&
            <div style={{
              'width': `${sliderSize}px`,
              'padding': `${p}px 0`,
              'margin': `${margin.TOP - 10}px 0 ${margin.BOTTOM - 10}px 0`
            }}>
              <RangeSlider
                valueRange={extentY[0]}
                selectedRange={userY1Extent}
                onEvent={this.handleSliderEvent('Y1')}
                vertical={true}
                tipTextPos={'right'}
              />
            </div>
          }
          <div ref={chartDiv} />
          { hasY2 && withYSlider &&
            <div style={{
              'width': `${sliderSize}px`,
              'padding': `${p}px 0`,
              'margin': `${margin.TOP - 10}px 0 ${margin.BOTTOM - 10}px 0`
            }}>
              <RangeSlider
                valueRange={extentY[1]}
                selectedRange={userY2Extent}
                onEvent={this.handleSliderEvent('Y2')}
                vertical={true}
                tipTextPos={'left'}
              />
            </div>
          }
        </div>
        { withLegend &&
          <div className="legendBox">
            { yData.map((dd, idx) => {
              return (
                <div key={`legend-item-${idx}`}
                  className="legendItemBox"
                  style={{ color:`${dd.color}` }}
                  onClick={this.handleLengendItemClick(idx)}
                >
                  <div className="legendCheckBox">
                    { dd.shown ? <RiCheckboxLine size="18" /> : <RiCheckboxBlankLine size="18" /> }
                  </div>
                  <div className="legendTitle">
                    { dd.title }
                  </div>
                </div>
              );
            })}
          </div>
        }
        { withSlider &&
          <div style={{
            'width': `${width - margin.LEFT - margin.RIGHT + (a - p) * 2 - (withYSlider ? sliderSize : 0) - (hasY2 ? sliderSize : 0)}px`,
            'height': `${sliderSize}px`,
            'flexBasis': `${sliderSize}px`,
            'padding': `0 ${p}px`,
            'margin': `0 ${margin.RIGHT - a + (hasY2 ? sliderSize : 0)}px 0 ${margin.LEFT - a + (withYSlider ? sliderSize : 0)}px`
          }}>
            <RangeSlider
              valueRange={extentX}
              selectedRange={userXExtent}
              labelData={xData}
              onEvent={this.handleSliderEvent('X')}
              dateTime={dateTimeAxis}
            />
          </div>
        }
      </div>
    );
  }
}


export default RunTooltipChart;
export { RunTooltipChart };
