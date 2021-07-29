import React, { Component } from 'react';

import { LayoutDivider, DividerDirection } from '../component/LayoutDivider.js';

import { LineTooltipChart } from '../sample/LineTooltipChart.js';

import ConsoleView from '../view/ConsoleView.js';

import DummyView from '../view/DummyView.js';

import './AppFrame.scss';



class AppFrame extends Component {
  constructor (props) {
    super(props);

    this.state = {
      clientWidth: 800,
      clientHeight: 400,
      bottomHeight: 150,
      leftWidth: 300
    };

    this._mainDiv = React.createRef();
  }

  componentDidMount() {
    this.onResize();
    window.addEventListener('resize', this.onResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onResize);
  }

  onResize = () => {
    const { clientWidth, clientHeight } = this._mainDiv.current;

    // console.log('SQLFrame onResize', clientWidth, clientHeight);
    this.setState({ clientWidth, clientHeight });
  }

  handleLayoutChanged = (type) => (from, to) => {
    const { bottomHeight, leftWidth } = this.state;

    if( 'topBottom' === type ) {
      // console.log('layout top-bottom', bottomHeight, to - from);
      this.setState({ bottomHeight: bottomHeight + to - from });
    } else if( 'leftRight' === type ) {
      // console.log('layout left-right', leftWidth, to - from);
      this.setState({ leftWidth: leftWidth + to - from });
    }
  }

  render() {
    const dividerSize = 4;
    const { clientWidth, clientHeight, bottomHeight, leftWidth } = this.state;

    const mainWidth = clientWidth - leftWidth - dividerSize;
    const mainHeight = clientHeight - bottomHeight - dividerSize;

    return (
      <div ref={this._mainDiv} className="appFrame">
        <div className="topPane">
          <div className="leftPane" style={{ flexBasis:`${leftWidth}px` }}>
            <DummyView title="Left Pane" width={leftWidth} height={mainHeight} />
          </div>
          <LayoutDivider direction={DividerDirection.vertical}
            size={dividerSize}
            onLayoutChange={this.handleLayoutChanged('leftRight')}
          />
          <div className="rightPane" style={{ flexBasis:`${mainWidth}px` }}>
            <LineTooltipChart width={mainWidth} height={mainHeight} />
          </div>
        </div>
        <LayoutDivider direction={DividerDirection.horizontal}
          size={dividerSize}
          onLayoutChange={this.handleLayoutChanged('topBottom')}
        />
        <div className="bottomPane" style={{ flexBasis:`${bottomHeight}px` }}>
          <ConsoleView width={clientWidth} height={bottomHeight} />
        </div>
      </div>
    );
  }
}

export default AppFrame;
export { AppFrame };
