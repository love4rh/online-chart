import React, { Component } from 'react';
import PropTypes from 'prop-types';

import cn from 'classnames';

import { RiArrowDownSFill, RiFilterLine, RiPushpin2Line, RiPushpinLine } from 'react-icons/ri';

import { isValidString } from './common.js';

import './styles.scss';



class ColumnHeader extends Component {
  static propTypes = {
    index: PropTypes.number,
    left: PropTypes.number,
    selected: PropTypes.bool,
    showNumber: PropTypes.bool,
    title: PropTypes.string,
    width: PropTypes.number,
    hasFilter: PropTypes.bool,
    onColumnEvent: PropTypes.func, // Column 이벤트 핸들러. 필터(open, close), 컬럼 고정(pinned, unpinned)
    filtered: PropTypes.bool,
    fixedType: PropTypes.number, // 0: normal, 1: fixed, 2: last fixed
    fixable: PropTypes.bool, // Fixed 컬럼 가능여부
    editable: PropTypes.bool, // 컬럼 편집 가능 여부
  }

  constructor (props) {
    super(props);

    const { title, filtered } = this.props;

    this.state = {
      title,
      filtered,
      filterOpen: false,
      titleEditing: false,
    };
  }

  static getDerivedStateFromProps (nextProps, prevState) {
    if( nextProps.filtered !== prevState.filtered ) {
      return { filtered: nextProps.filtered };
    }

    return null;
  }

  handleContextMenu = (ev) => {
    // button - 0: left, 2: right
    // console.log('Header', ev);

    ev.preventDefault();
    ev.stopPropagation();

    const target = ev.currentTarget;
    let { x, y, width, height } = target.getBoundingClientRect();
    console.log('Mouse', ev.button, ev.clientX, ev.clientY, x, y, width, height);
  }

  handleMouseDown = (type) => (ev) => {
    if( type === 'title' ) {
      const { selected } = this.props;

      if( selected ) {
        ev.preventDefault();
        ev.stopPropagation();
        this.setState({ titleEditing: true });
      }

      return;
    }

    ev.preventDefault();
    ev.stopPropagation();

    const { index, onColumnEvent, fixedType } = this.props;
    const { filterOpen } = this.state;

    if( filterOpen && type === 'filter' ) {
      if( onColumnEvent ) {
        onColumnEvent('close', { colIdx:index });
      }
      this.handleCloseFilter();
      return;
    }

    const target = ev.currentTarget;
    let { x, y, width, height } = target.getBoundingClientRect();

    x += window.pageXOffset + width;
    y += window.pageYOffset + height;

    switch( type ) {
    case 'filter':
      if( onColumnEvent ) {
        onColumnEvent('open', { colIdx:index, pos:{x, y}, cbClose:this.handleCloseFilter });
      }
      this.setState({ filterOpen: true });
      break;

    case 'pin':
      if( onColumnEvent ) {
        onColumnEvent(fixedType === 0 ? 'pinned' : 'unpinned', { colIdx:index, pos:{x, y} });
      }
      break;

    default:
      break;
    }
  }

  handleCloseFilter = () => {
    this.setState({ filterOpen: false });
  }

  handleTitleChanged = (ev) => {
    this.setState({ title: ev.target.value }); // read-only
  }

  handleTitleEditDone = (changed) => () => {
    const { index, onColumnEvent } = this.props;

    if( changed && isValidString(this.state.title ) ) {
      // TODO 메인에 시그널 보내기. this.state.title 
      if( onColumnEvent ) {
        onColumnEvent('titleChanged', { colIdx: index, changed: this.state.title });
      }
      this.setState({ titleEditing: false });
    } else {
      const { title } = this.props;
      this.setState({ title: title, titleEditing: false });
    }
  }

  handleKeyDown = (ev) => {
    const { keyCode } = ev;

    if( keyCode === 27 ) { // escape
      this.handleTitleEditDone(false)();
    } else if( keyCode === 13 ) { // enter
      this.handleTitleEditDone(true)();
    }
  }

  render () {
    const { index, width, left, selected, rowHeight, hasFilter, showNumber, fixedType, fixable } = this.props;
    const { filterOpen, filtered, title, titleEditing } = this.state;

    const lineHeight = (rowHeight - 10) + 'px';
    const btnSize = rowHeight - 2;
    const wider = width > 30;

    const css = cn({ 'column':true, 'selectedHeader':selected, 'fixedLine':fixedType === 2 });

    return (<>
      { showNumber &&
        <div className={ css } style={{ top:0 , left, width, height:rowHeight }}>
          <div
            className="columnTitle"
            style={{ lineHeight:lineHeight, height:rowHeight, width }}
            onContextMenu={this.handleContextMenu}
          >
            {index + 1}
          </div>
          { fixable && wider &&
            <div
              className={ cn({ 'columnHederButton':true }) }
              style={{ height:rowHeight, width:btnSize }}
              onMouseDown={this.handleMouseDown('pin')}
            >
              { fixedType === 0 ? <RiPushpinLine size="14" color="#b0b1ab" /> : <RiPushpin2Line size="14" color="#b0b1ab" /> }
            </div>
          }
        </div>
      }
      <div className={ css } style={{ top:(showNumber ? rowHeight : 0), left, width, height:rowHeight }}>
        { titleEditing &&
          <input
            className="columnTitleEditor"
            style={{ lineHeight:lineHeight, height:(rowHeight - 2), width:(width - 3 - (hasFilter ? btnSize : 0)) }}
            value={'' + title}
            autoFocus={true}
            onChange={this.handleTitleChanged}
            onKeyDown={this.handleKeyDown}
            onBlur={this.handleTitleEditDone(true)}
          />
        }
        { !titleEditing &&
          <div
            className="columnTitle"
            style={{ lineHeight:lineHeight, height:rowHeight, width:(width - (hasFilter ? btnSize : 0)) }}
            onMouseDown={this.handleMouseDown('title')}
            onContextMenu={this.handleContextMenu}
          >
            {title}
          </div>
        }
        { hasFilter && wider&&
          <div
            className={ cn({ 'columnHederButton':true, 'columnHederButtonPressed':filterOpen }) }
            style={{ height:rowHeight, width:btnSize }}
            onMouseDown={this.handleMouseDown('filter')}
          >
            { filtered ? <RiFilterLine size="14" /> : <RiArrowDownSFill size="16" /> }
          </div>
        }
      </div>
    </>);
  }
}

export default ColumnHeader;
export { ColumnHeader };
