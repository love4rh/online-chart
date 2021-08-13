import {
  isundef, istrue, isvalid, numberWithCommas, dateToString, tickCount, nvl,
  estimateValueType, tryParseNumber
} from './common.js';



/**
 * DataGrid에서 사용할 기본적인 데이터 소스.
 * - 메모리 상에 모든 데이터를 관리
 * - 컬럼 편집 가능
 * - 레코드 편집 가능
 * - 컬럼 확장 가능
 * - 레코드 추가/삭제 가능
 * - 데이터를 컬럼 단위로 관리함
 * 
 * props: {
 *   title: Optional. 데이터 제목(그리드 제목)
 *   columns: 컬럼 정의. [{name, type, data([])}, ...]. type은 number, datetime, boolean, string 중 하나. 값이 바뀔 수 있음
 *   editable: 값 편집 가능 여부
 * }
 */
class BasicDataSource {
  constructor (props) {
    this.resetData(props);

    this._modifiedTime = tickCount();
    this._filterMap = {};
    this._evHandler = null;
  }

  setEventHandler = (handler) => {
    this._evHandler = handler;
  }

  trigerEvent = () => {
    if( this._evHandler ) {
      this._evHandler();
    }
  }

  resetData = (props) => {
    this.props = props;

    const { columns, editable } = props;

    this.state = {
      columns: columns,
      dataSize: columns.reduce((a, d) => Math.max(a, (d.data && d.data.length) || 0), 0),
      editable: istrue(editable)
    };

    this._rowFilter = null;
  }

  // 편집 가능 여부 반환
  isEditable = () => {
    return this.state.editable;
  }

  // 데이터 추가용 레코드인지 여부 반환
  isRowForAppend = (index) => {
    return this.isEditable() && this._getRowCount(true) === index;
  }

  getTitle = () => {
    return this.props.title;
  }

  updatedTime = () => {
    return this._modifiedTime;
  }

  getColumnCount = () => {
    return this.state.columns.length;
  }

  getColumnName = (col) => {
    return this.state.columns[col].name;
  }

  getColumnType = (col) => {
    // unknown, string, Integer, Real, DateTime, Text
    return this.state.columns[col].type;
  }

  setRowFilter = (rowFilter) => {
    this._rowFilter = rowFilter;
  }

  _getRowCount = (raw) => {
    return !raw && this._rowFilter ? this._rowFilter.length : this.state.dataSize;
  }

  getRowCount = () => {
    return this._getRowCount(false) + (this.isEditable() ? 1 : 0);
  }

  getRowHeight = () => {
    return 26;
  }

  _getRawCellValue = (col, row) => {
    const { columns } = this.state;
    const { data } = columns[col];

    if( data ) {
      const value = data[row];

      if( isundef(value) ) {
        return null;
      }

      switch( this.getColumnType(col) ) {
        case 'datetime':
          return dateToString(new Date(value), false);
        case 'string':
          return decodeURIComponent(value).replace(/[+]/g, ' ');
        default:
          return nvl(value, '');
      }
    }

    return null;
  }

  getCellValue = (col, row) => {
    if( this._rowFilter ) {
      row = this._rowFilter[row];
    }

    return this._getRawCellValue(col, row);
  }

  isValid = (b, e) => {
    return true;
  }

  applyColumnFilter = (selectedItems) => {
    for(let c = 0; c < selectedItems.length; ++c) {
      let cf = this._filterMap['col' + c];
      if( isundef(selectedItems[c]) || isundef(cf) ) {
        continue;
      }

      const dict = selectedItems[c];

      let fd = cf.filterData;
      for(let i = 0; i < fd.length; ++i) {
        fd[i].selected = istrue(dict[fd[i].title]);
      }

      this._filterMap['col' + c] = { filterData:fd, selectedCount:fd.reduce((r, v) => r + (v.selected ? 1 : 0), 0) };
    }
  }

  // filterData : [{title, selected(, color)}, ...]
  setColumnFilterData = (col, filterData) => {
    const cList = this._filterMap['col' + col];

    if( isundef(cList) ) {
      this._filterMap['col' + col] = { filterData, selectedCount:filterData.length };
      return;
    }

    if( 0 === cList.filterData.reduce((res, val, i) => res + (filterData[i].selected !== val.selected ? 1 : 0), 0) ) {
      return;
    }

    // console.log('setColumnFilterData', col, filterData);
    // console.log('setColumnFilterData', col, filterData.filter((d) => d.selected).reduce((m, d) => ({...m, [d.title]:true}), {}) );

    const rb = this._filterMap['col' + col];
    const { controller } = this.props;

    this._filterMap['col' + col] = { filterData, selectedCount:filterData.reduce((r, v) => r + (v.selected ? 1 : 0), 0) };

    if( controller && controller.handleFilterChanged && !controller.handleFilterChanged(col, filterData)) {
      this._filterMap['col' + col] = rb;
    }

    this._modifiedTime = tickCount();
  }

  hasColumnFilterData = (col) => {
    return ('col' + col) in this._filterMap;
  }

  getColumnFilterData = (col) => {
    const cf = this._filterMap['col' + col];
    return cf ? cf.filterData : null;
  }

  isColumnFiltered = (col) => {
    const cf = this._filterMap['col' + col];
    if( isundef(cf) ) {
      return false;
    }
    return cf.filterData.length > cf.selectedCount;
  }

  getPreferedColumnWidth = (c) => {
    const letterWidth = 7.2;

    const dataSize = this.state.dataSize;

    let w = Math.max(50, this.getColumnName(c).length * letterWidth + 16); // minimum size of column

    for(let r = 0; r < Math.min(20, dataSize); ++r) {
      const val = this.getCellValue(c, r);

      if( isvalid(val) ) {
        if( 'number' === this.getColumnType(c) && typeof val === 'number' ) {
          w = Math.max(w, numberWithCommas(val).length * letterWidth + 16);
        } else {
          w = Math.max(w, ('' + val).length * letterWidth + 16);
        }
      }
    }

    return Math.ceil(w) + (this.hasColumnFilterData && this.hasColumnFilterData(c) ? this.getRowHeight() : 0);
  }

  extendColumns = (col) => {
    const { columns } = this.state;

    if( !this.isEditable() || col < columns.length ) {
      return false;
    }

    for(var i = columns.length; i <= col; ++i) {
      columns.push({ name: 'untitled-' + i, type: 'Text', data: columns[0].data.map(_ => null) });
    }

    return true;
  }

  // type이 없으면 기존 type을 유지함
  setColumnNameType = (col, name, type) => {
    if( !this.isEditable() ) {
      return false;
    }

    // 저장할 영역 확보
    this.extendColumns(col);

    const columns = this.state.columns;
    columns[col] = { name, type: nvl(type, columns[col].type) };

    // console.log('COLUMN CHANGED', col, columns[col]);

    return true;
  }

  setCellValue = (col, row, value) => {
    if( !this.isEditable() ) {
      return false;
    }

    const { columns, dataSize } = this.state;

    if( col >= columns.length ) {
      this.setColumnNameType(col, 'untitled-' + col, estimateValueType(value));
    }

    switch( this.getColumnType(col) ) {
      case 'number':
        value = tryParseNumber(value);
        break;
      
      case 'datetime':
      default:
        value = '' + value;
        break;
    }

    columns[col].data[row] = value;

    if( row >= dataSize ) {
      this.state.dataSize = row + 1;
    }

    // console.log('setValue', this.state);

    return true;
  }

  getDataList = (col) => {
    return this.state.columns[col].data;
  }
};


export default BasicDataSource;
export { BasicDataSource };
