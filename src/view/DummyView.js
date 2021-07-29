import React, { Component } from 'react';
import PropTypes from 'prop-types';


class DummyView extends Component {
  static propTypes = {
    width: PropTypes.number,
    height: PropTypes.number,
  }

  render () {
    const { title, width, height } = this.props;

    return (
      <div style={{ width:width, height:height }}>
        {title}
      </div>
    );
  }
}

export default DummyView;
export { DummyView };
