import {
  isundef, istrue, isvalid, numberWithCommas, dateToString, tickCount, nvl
} from './common.js';



/**
 * DataGrid에서 사용할 기본적인 데이터 소스.
 * - 메모리 상에 모든 데이터를 관리
 * - 컬럼 편집 가능
 * - 레코드 편집 가능
 * - 컬럼 확장 가능
 * - 레코드 추가/삭제 가능
 * 
 * props: {
 *   title: Optional. 데이터 제목(그리드 제목)
 *   columns: 컬럼 정의. [{name, type}, ...]. type은 DateTime, Integer, Real, Text 중 하나. 값이 바뀔 수 있음
 *   records: 레코드 데이터. [[], [], ... ] 형태. 안쪽 목록이 한 레코드의 데이터 배열임. 값이 바뀔 수 있음
 *   editable: 값 편집 가능 여부
 * }
 */
class BasicDataSource {
  constructor (props) {
    this.resetData(props);

    this._modifiedTime = tickCount();
    this._filterMap = {};
  }

  resetData = (props) => {
    this.props = props;

    const { columns, records, editable } = props;

    this.state = {
      columns: columns,
      records: records,
      editable: istrue(editable)
    };

    this._rowFilter = null;
  }

  isEditable = () => {
    return this.state.editable;
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
    const type = this.state.columns[col].type;

    if( type === 'Integer' || type === 'Real' ) {
      return 'number';
    }

    return type;
  }

  setRowFilter = (rowFilter) => {
    this._rowFilter = rowFilter;
  }

  _getRowCount = (raw) => {
    return !raw && this._rowFilter ? this._rowFilter.length : this.state.records.length;
  }

  getRowCount = () => {
    return this._getRowCount(false);
  }

  getRowHeight = () => {
    return 26;
  }

  _getRawCellValue = (col, row) => {
    const { records } = this.state;
    const rec = records[row];

    if( rec ) {
      if( isundef(rec[col]) ) {
        return null;
      }

      switch( this.getColumnType(col) ) {
        case 'DateTime':
          return dateToString(new Date(rec[col]), false);
        case 'Text':
          return decodeURIComponent(rec[col]).replace(/[+]/g, ' ');
        default:
          return nvl(rec[col], '');
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

    const { records } = this.state;
    let w = Math.max(50, this.getColumnName(c).length * letterWidth + 16); // minimum size of column

    for(let r = 0; r < Math.min(20, records.length); ++r) {
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

  // eslint-disable-next-line
  isValid = (begin, end) => {
    const { records } = this.state;
    end = Math.min(end, this.getRowCount() - 1);
    return 0 <= begin && begin <= end && end < records.length;
  }

  extendColumns = (col) => {
    const columns = this.state.columns;

    if( !this.isEditable() || col < columns.length ) {
      return false;
    }

    for(var i = columns.length; i <= col; ++i) {
      columns.push({ name: 'untitled-' + i, type: 'Text' });
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

    console.log('COLUMN CHANGED', col, columns[col]);

    return true;
  }

  setCellValue = (col, row, value) => {
    const records = this.state.records;

    // TODO value의 값 형태 검사
    records[row][col] = value;

    return true;
  }
};


export default BasicDataSource;
export { BasicDataSource };
