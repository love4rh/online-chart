import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { isundef, cp } from '../grid/common';

import './RangeSlider.scss';



/**
 * https://material-ui.com/components/slider/ 와 비슷한 슬라이더.
 * Thumb을 이동할 수 있는 것이 차이가 있음.
 */
class RangeSlider extends Component {
	static propTypes = {
    range: PropTypes.array.isRequired, // 선택할 수 있는 값의 범위
    selectedRange: PropTypes.array, // 전체(range) 중 현재 선택된 범위. 없으면 전체가 선택된 것으로 처리함
    eventHandler: PropTypes.func, // 이벤트 발생 시 전달할 핸들러. 상위 객체와의 소통을 위하여 사용됨
  };

  constructor (props) {
    super(props);

    const { range, selectedRange } = props;

    this.state = {
      range,
      selectedRange: cp(isundef(selectedRange) ? range : selectedRange),
      mouseState: null
    };

    this._mainDiv = React.createRef();
  }

  componentDidMount () {
    const { clientWidth, clientHeight } = this._mainDiv.current;
    console.log('RangeSlider didMount', clientWidth, clientHeight);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    //

    return null; // null을 리턴하면 따로 업데이트 할 것은 없다라는 의미
  }

  componentWillUnmount () {
    //
  }

  handleMouseDown = (type) => (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    // capturing mouse event (refer: http://code.fitness/post/2016/06/capture-mouse-events.html)
    document.body.style['pointer-events'] = 'none';
    document.addEventListener('mousemove', this.handleMouseMove(type), { capture: true });
    document.addEventListener('mouseup', this.handleMouseUp(type), { capture: true });

    const ms = { type, sX: ev.clientX, sY: ev.clientY };

    console.log('handleMouseDown', ms, ev);

    this.setState({ mouseState: ms });
  }

  handleMouseMove = (type) => (ev) => {
    const { mouseState } = this.state;

    if( isundef(mouseState) || mouseState.type !== type ) {
      return;
    }

    const { clientX, clientY } = ev;

    const { sX, sY } = mouseState;

    // console.log('handleMouseMove', mouseState, clientX - sX);

    ev.preventDefault();
    ev.stopPropagation();
  }

  handleMouseUp = (type) => (ev) => {
    const { mouseState } = this.state;

    if( isundef(mouseState) || mouseState.type !== type ) {
      return;
    }

    const { clientX, clientY } = ev;

    const { sX, sY } = mouseState;

    console.log('handleMouseUp', mouseState, clientX - sX, this._mainDiv.current.clientWidth);

    document.body.style['pointer-events'] = 'auto';
    document.removeEventListener('mousemove', this.handleMouseMove(type), { capture: true });
    document.removeEventListener('mouseup', this.handleMouseUp(type), { capture: true });

    this.setState({ mouseState: null });
  }

  render () {
    const minVal = '2020-07-23';
    const maxVal = '2020-08-23';
    const { range, selectedRange } = this.state;

    const p1 = (selectedRange[0] - range[0]) / (range[1] - range[0]) * 100;
    const p2 = (selectedRange[1] - range[0]) / (range[1] - range[0]) * 100;

  	return (
  		<div ref={this._mainDiv} tabIndex="1" className="rangeSliderMain">
        <span className="rangeRail" />
        <span
          className="rangeTrack"
          style={{ left:`${p1}%`, width:`${p2 - p1}%` }}
          onMouseDown={this.handleMouseDown('thumb')}
        />
        <span
          className="rangeThumb"
          style={{ left:`${p1}%` }}
          onMouseDown={this.handleMouseDown('left')}
        >
          <span className="thumbText" style={{ width:`${minVal.length * 0.5}rem` }}>{minVal}</span>
        </span>
        <span
          className="rangeThumb"
          style={{ left:`${p2}%` }}
          onMouseDown={this.handleMouseDown('right')}
        >
          <span className="thumbText" style={{ width:`${maxVal.length * 0.5}rem` }}>{maxVal}</span>
        </span>
  		</div>
  	);
  }
}

export default RangeSlider;
export { RangeSlider };
