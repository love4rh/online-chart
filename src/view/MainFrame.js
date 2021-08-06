import React, { Component } from 'react';

import { isvalid, setGlobalMessageHandle } from '../util/tool.js';
import { apiProxy } from '../util/apiProxy.js';
// import { Log } from '../util/Logging.js';

import { BsList } from 'react-icons/bs';
import Spinner from 'react-bootstrap/Spinner'
import Toast from 'react-bootstrap/Toast'

import { appData } from '../app/AppData.js';
import { AppFrame } from '../view/AppFrame.js';

import './MainFrame.scss';



class MainFrame extends Component {
  constructor (props) {
    super(props);

    this.state = {
      pageType: 'main', // entry, main,
      message: null,
      waiting: false,
      menuShown: false,
      redrawCount: 0,
      appData: appData
    };

    console.log('MainFrame', props);

    this.handleUnload = this.handleUnload.bind(this);
  }

  componentDidMount() {
    document.title = this.props.appTitle;

    setGlobalMessageHandle(this.showInstanceMessage);

    window.addEventListener('beforeunload', this.handleUnload);
    apiProxy.setWaitHandle(this.enterWaiting, this.leaveWaiting);
  }


  // Application Close Event Handler
  handleUnload = (ev) => {
    console.log('handleUnload', ev);

    /*
    const message = 'Are you sure you want to close?';

    ev.preventDefault();
    (ev || window.event).returnValue = message;

    return message;
    // */

    // apiProxy.signOut();
  }

  showInstanceMessage = (msg) => {
    // console.log('showInstanceMessage', msg);
    this.setState({ waiting: false, message: msg });
  }

  enterWaiting = () => {
    this.setState({ waiting: true });
  }

  leaveWaiting = () => {
    this.setState({ waiting: false });
  }

  handleMenu = () => {
    const { menuShown } = this.state;
    this.setState({ menuShown: !menuShown });
  }

  handleClickMenu = (type) => () => {
    if( 'close' === type ) {
      this.setState({ menuShown: false });
    }
  }

  hideToastShow = () => {
    this.setState({ message: null });
  }

  render () {
    const { waiting, pageType, message, menuShown, appData } = this.state;
    const toastOn = isvalid(message);

    return (
      <div className="mainWrap">
        <div className="mainHeader">
          { <div className="mainMenuButton" onClick={this.handleMenu}><BsList size="28" color="#ffffff" /></div> }
          <div className="mainTitle">{this.props.appTitle}</div>
        </div>
        <div className="scrollLock">
          { pageType === 'entry' && <div>Hello World!</div> }
          { pageType === 'main' && <AppFrame appData={appData} /> }
        </div>
        { waiting &&
          <div className="blockedLayer">
            <Spinner className="spinnerBox" animation="border" variant="primary" />
          </div>
        }
        { toastOn &&
          <div className="blockedLayer" onClick={this.hideToastShow}>
            <Toast className="toastBox" onClose={this.hideToastShow} show={toastOn} delay={3000} autohide animation>
              <Toast.Header>
                <strong className="mr-auto">Message</strong>
              </Toast.Header>
              <Toast.Body>{message}</Toast.Body>
            </Toast>
          </div>
        }
        { menuShown &&
          <div className="overlayLayer" onClick={this.handleClickMenu('close')}>&nbsp;</div>
        }
      </div>
    );
  }
}

export default MainFrame;
export { MainFrame };
