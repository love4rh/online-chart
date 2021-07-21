import React, { Component } from 'react';
import { LineTooltipChart } from '../sample/LineTooltipChart.js';


class MainFrame extends Component {
  constructor (props) {
    super(props);

    this.state = {
      viewNo: 0
    };
  }

  render () {
    return (
      <div>
        <LineTooltipChart />
      </div>
    );

  }
}

export default MainFrame;
export { MainFrame };
