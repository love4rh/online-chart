import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { LayoutDivider, DividerDirection } from '../component/LayoutDivider.js';

import { RunTooltipChart } from '../chart/RunTooltipChart.js';
// import { LineTooltipChart } from '../chart/LineTooltipChart.js';

import { makeid } from '../grid/common.js';

import DataGrid from '../grid/DataGrid.js';
import BasicDataSource from '../grid/BasicDataSource.js';

import ConsoleView from '../view/ConsoleView.js';
import DummyView from '../view/DummyView.js';

import './AppFrame.scss';



class AppFrame extends Component {
  static propTypes = {
    appData: PropTypes.object.isRequired  // Application 전반에 걸쳐 사용되는 데이터 객체. redux 컨셉으로 사용할 객체임
  };

  constructor (props) {
    super(props);

    const { appData } = this.props;
    const ds = new BasicDataSource(appData.getSampleData());

    ds.setEventHandler(this.handleDataEvent);

    this.state = {
      drawKey: makeid(8),
      clientWidth: 800,
      clientHeight: 400,
      bottomHeight: 150,
      leftWidth: 300,
      controlPaneHeight: 300,
      ds
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

  // DataSource에 변경이 있을 경우 발생하는 이벤트 처리
  handleDataEvent = (ev) => {
    console.log('DATA CHANGED EVENT OCCURED');
    this.setState({ drawKey: makeid(8) });
  }

  handleLayoutChanged = (type) => (from, to) => {
    const { bottomHeight, leftWidth, controlPaneHeight } = this.state;

    if( 'topBottom' === type ) {
      // console.log('layout top-bottom', bottomHeight, to - from);
      this.setState({ bottomHeight: bottomHeight + to - from });
    } else if( 'leftRight' === type ) {
      // console.log('layout left-right', leftWidth, to - from);
      this.setState({ leftWidth: leftWidth + to - from });
    } else if( 'leftTopBottom' === type ) {
      this.setState({ controlPaneHeight: controlPaneHeight + to - from });
    }
  }

  render() {
    const dividerSize = 4;
    const { drawKey, clientWidth, clientHeight, bottomHeight, leftWidth, controlPaneHeight, ds } = this.state;

    const mainWidth = clientWidth - leftWidth - dividerSize;
    const mainHeight = clientHeight - bottomHeight - dividerSize;

    const dataPaneHeight = mainHeight - controlPaneHeight - dividerSize;

    return (
      <div ref={this._mainDiv} className="appFrame">
        <div className="topPane">
          <div className="leftPane" style={{ flexBasis:`${leftWidth}px` }}>
            <div className="leftTopPane" style={{ flexBasis:`${dataPaneHeight}px` }}>
              <DataGrid
                width={leftWidth}
                height={dataPaneHeight}
                dataSource={ds}
                userBeginRow={0}
                editable={true}
              />
            </div>
            <LayoutDivider direction={DividerDirection.horizontal}
              size={dividerSize}
              onLayoutChange={this.handleLayoutChanged('leftTopBottom')}
            />
            <div className="leftBottomPane" style={{ flexBasis:`${controlPaneHeight}px` }}>
              <DummyView title="Left Bottom Pane" width={leftWidth} height={controlPaneHeight} />
            </div>
          </div>
          <LayoutDivider direction={DividerDirection.vertical}
            size={dividerSize}
            onLayoutChange={this.handleLayoutChanged('leftRight')}
          />
          <div key={`chart-${drawKey}`} className="rightPane" style={{ flexBasis:`${mainWidth}px` }}>
            <RunTooltipChart ds={ds} time={-1} y1={[2, 3]} y2={[4, 5]} width={mainWidth} height={mainHeight - 36} />
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
