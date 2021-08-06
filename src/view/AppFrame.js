import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { LayoutDivider, DividerDirection } from '../component/LayoutDivider.js';

import { LineTooltipChart } from '../chart/LineTooltipChart.js';

import DataGrid from '../grid/DataGrid.js';
import DiosDataSource from '../grid/DiosDataSource.js';

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

    this.state = {
      clientWidth: 800,
      clientHeight: 400,
      bottomHeight: 150,
      leftWidth: 300,
      controlPaneHeight: 300,

      ds: new DiosDataSource(appData.getSampleData())
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
    const { clientWidth, clientHeight, bottomHeight, leftWidth, controlPaneHeight, ds } = this.state;

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
