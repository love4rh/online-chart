import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { isundef, cp, istrue, isvalid, dateToString } from '../grid/common';

import './RangeSlider.scss';



/**
 * https://material-ui.com/components/slider/ 와 비슷한 슬라이더.
 * Thumb을 이동할 수 있는 것이 차이가 있음.
 * 발생하는 이벤트
 * onEvent('rangeChanged', [r1, r2]) --> 선택 영역 바뀜
 */
class RangeSlider extends Component {
	static propTypes = {
    valueRange: PropTypes.array.isRequired, // 선택할 수 있는 값의 범위
    selectedRange: PropTypes.array, // 전체(range) 중 현재 선택된 범위. 없으면 전체가 선택된 것으로 처리함
    onEvent: PropTypes.func, // 이벤트 발생 시 전달할 핸들러. 상위 객체와의 소통을 위하여 사용됨
    vertical: PropTypes.bool, // 세로 여부
    labelData: PropTypes.array, // Label 데이터 여부
    dateTime: PropTypes.bool, // 날짜 (Date 객체) 여부 반환
  };

  constructor (props) {
    super(props);

    const { valueRange, selectedRange, vertical, labelData, dateTime } = props;

    const range = istrue(dateTime) ? valueRange.map(d => d.getTime()) : valueRange;

    this.state = {
      range,
      selectedRange: cp(isundef(selectedRange) ? range : selectedRange),
      vertical: istrue(vertical),
      mouseState: null,
      labelData,
      dateTime: istrue(dateTime)
    };

    this._mainDiv = React.createRef();
  }

  componentDidMount () {
    //
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    //

    return null; // null을 리턴하면 따로 업데이트 할 것은 없다라는 의미
  }

  // pos: mouse postion
  calculatePosition = (pos, gap) => {
    const { vertical, range } = this.state;

    let rp;

    if( vertical ) {
      const { offsetTop, offsetHeight } = this._mainDiv.current;
      rp = (pos - offsetTop) / offsetHeight * (range[1] - range[0]);
    } else {
      const { offsetLeft, offsetWidth } = this._mainDiv.current;
      rp = (pos - offsetLeft) / offsetWidth * (range[1] - range[0])
    }

    if( istrue(gap) ) {
      return rp;
    }

    rp += range[0];

    return Math.max(range[0], Math.min(rp, range[1]));
  }

  handleMouseDown = (type) => (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    // capturing mouse event (refer: http://code.fitness/post/2016/06/capture-mouse-events.html)
    document.body.style['pointer-events'] = 'none';
    document.addEventListener('mousemove', this.handleMouseMove(type), { capture: true });
    document.addEventListener('mouseup', this.handleMouseUp(type), { capture: true });

    this.setState({ mouseState: { type, sX: ev.clientX, sY: ev.clientY, sRange: cp(this.state.selectedRange) } });
  }

  handleMouseMove = (type) => (ev) => {
    const { vertical, mouseState, selectedRange, range } = this.state;

    if( isundef(mouseState) || mouseState.type !== type ) {
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();

    if( type === 'track' ) {
      const { sX, sY, sRange } = mouseState;
      const gap = this.calculatePosition(vertical ? ev.clientY - sY : ev.clientX - sX, true);
      if( sRange[0] + gap >= range[0] && sRange[1] + gap <= range[1] ) {
        selectedRange[0] = sRange[0] + gap;
        selectedRange[1] = sRange[1] + gap;
      }
      console.log('mouse move', sX, ev.clientX, ev.offsetX, gap, sRange, selectedRange);
    } else {
      selectedRange[type === 'left' ? 0 : 1] = this.calculatePosition(vertical ? ev.clientY : ev.clientX, false);
    }

    this.setState({ selectedRange: selectedRange });
  }

  handleMouseUp = (type) => (ev) => {
    const { vertical, mouseState, selectedRange, range } = this.state;

    if( isundef(mouseState) || mouseState.type !== type ) {
      return;
    }

    document.body.style['pointer-events'] = 'auto';
    document.removeEventListener('mousemove', this.handleMouseMove(type), { capture: true });
    document.removeEventListener('mouseup', this.handleMouseUp(type), { capture: true });

    const { onEvent } = this.props;

    if( type === 'track' ) {
      const { sX, sY, sRange } = mouseState;
      const gap = this.calculatePosition(vertical ? ev.clientY - sY : ev.clientX - sX, true);
      if( sRange[0] + gap >= range[0] && sRange[1] + gap <= range[1] ) {
        selectedRange[0] = sRange[0] + gap;
        selectedRange[1] = sRange[1] + gap;
      }
    } else {
      selectedRange[type === 'left' ? 0 : 1] = this.calculatePosition(vertical ? ev.clientY : ev.clientX);
    }

    if( onEvent ) {
      onEvent('rangeChanged', [ Math.min(selectedRange[0], selectedRange[1]), Math.max(selectedRange[0], selectedRange[1]) ]);
    }

    this.setState({ mouseState: null, selectedRange: selectedRange });
  }

  render () {
    const { range, selectedRange, mouseState, labelData, dateTime } = this.state;

    const thumbId = ['left', 'right'];

    let valueText;

    // 시간 (Date 이용)
    if( dateTime ) {
      valueText = selectedRange.map(v => dateToString(new Date(Math.round(v))) );
    } else if( isvalid(labelData) ) {
      valueText = selectedRange.map(v => labelData[Math.min(labelData.length - 1, Math.max(0, Math.floor(v) - 1))] );
    } else {
      valueText = selectedRange.map(v => '' + Math.floor(v));
    }

    const thumbPos = selectedRange.map(v => (v - range[0]) / (range[1] - range[0]) * 100 );
    const actType = isvalid(mouseState) && mouseState.type;

  	return (
  		<div ref={this._mainDiv} tabIndex="1" className="rangeSliderMain">
        <span className="rangeRail" />
        <span
          className="rangeTrack"
          style={{ left:`${Math.min(thumbPos[1], thumbPos[0])}%`, width:`${Math.abs(thumbPos[1] - thumbPos[0])}%` }}
          onMouseDown={this.handleMouseDown('track')}
        />
        { thumbId.map((id, idx) => {
          return (
            <span
              key={`thumb-${id}`}
              className="rangeThumb"
              style={{ left:`${thumbPos[idx]}%` }}
              onMouseDown={this.handleMouseDown(id)}
            >
              <span className={['thumbText', (actType === id || actType === 'track' ? 'showThumbText' : '')].join(' ')} style={{ width:`${valueText[idx].length * 0.5}rem` }}>{valueText[idx]}</span>
            </span>
          );
        })}
  		</div>
  	);
  }
}

export default RangeSlider;
export { RangeSlider };
