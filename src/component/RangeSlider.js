import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './RangeSlider.scss';



/**
 * https://material-ui.com/components/slider/ 와 비슷한 슬라이더.
 * Thumb을 이동할 수 있는 것이 차이가 있음.
 */
class RangeSlider extends Component {
	static propTypes = {
    range: PropTypes.array, // 선택할 수 있는 값의 범위
    selectedRange: PropTypes.array, // 전체(range) 중 현재 선택된 범위. 없으면 전체가 선택된 것으로 처리함
    eventHandler: PropTypes.func, // 이벤트 발생 시 전달할 핸들러. 상위 객체와의 소통을 위하여 사용됨
  };

  constructor (props) {
    super(props);

    const { range, selectedRange } = props;

    this.state = {
      range,
      selectedRange
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

  onMouseDown = (ev) => {
    //
  }

  render () {

  	return (
  		<div ref={this._mainDiv} className="rangeSliderMain">
        <span className="rangeRail" />
        <span className="rangeTrack" style={{ left:`100px`, width:`200px` }} />
        <span className="rangeThumb" style={{ left:`100px` }}>
          <span className="thumbText">2020-07-23</span>
        </span>
        <span className="rangeThumb" style={{ left:`300px` }}>
          <span className="thumbText">2020-08-23</span>
        </span>
  		</div>
  	);
  }
}

export default RangeSlider;
export { RangeSlider };
