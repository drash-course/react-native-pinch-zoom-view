import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, PanResponder, ViewPropTypes } from 'react-native';

// Fallback when RN version is < 0.44
const viewPropTypes = ViewPropTypes || View.propTypes;

export default class PinchZoomView extends Component {
  static propTypes = {
    ...viewPropTypes,
    scalable: PropTypes.bool,
    minScale: PropTypes.number,
    maxScale: PropTypes.number
  };

  static defaultProps = {
    scalable: true,
    minScale: 0.5,
    maxScale: 2
  };

  constructor(props) {
    super(props);
    this.state = {
      scale: 1,
      lastScale: 1,
      offsetX: 0,
      offsetY: 0,
      lastX: 0,
      lastY: 0,
      lastMovePinch: false,
    };
    this.distant = 150;
    this.angleDeg = 0;
    this.lastTapTs = 0;
    this.lastLiftLocation = null;
  }

  componentWillMount() {
    this.gestureHandlers = PanResponder.create({
      onStartShouldSetPanResponder: this._handleStartShouldSetPanResponder,
      onMoveShouldSetPanResponder: this._handleMoveShouldSetPanResponder,
      onPanResponderGrant: this._handlePanResponderGrant,
      onPanResponderMove: this._handlePanResponderMove,
      onPanResponderRelease: this._handlePanResponderEnd,
      onPanResponderTerminationRequest: evt => true,
      onShouldBlockNativeResponder: evt => false
    });
  }

  zoomIn() {
    const scale = this.state.scale * 1.45;
    if (scale < this.props.maxScale) {
      this.setState({ scale, lastScale: this.state.lastScale * 1.45 });
    } else {
      this.setState({ scale: this.props.maxScale, lastScale: this.props.maxScale });
    }
  }

  _handleTouchLift = ({ nativeEvent }) => {
    this.lastLiftLocation = [nativeEvent.pageX, nativeEvent.pageY];
  };

  _handleStartShouldSetPanResponder = (e, gestureState) => {
    // don't respond to single touch to avoid shielding click on child components
    const tapTs = Date.now();
    if (
      gestureState.numberActiveTouches === 1 &&
      this.lastLiftLocation &&
      (tapTs - this.lastTapTs) < 300
    ) {
      const [lx, ly] = this.lastLiftLocation;
      const x = e.nativeEvent.pageX;
      const y = e.nativeEvent.pageY;
      if (Math.abs(lx - x) < 10 && Math.abs(ly - y) < 10) {
        this.zoomIn();
      }
    }
    this.lastLiftLocation = null;
    this.lastTapTs = tapTs;
    if (this.props.shouldDismissPane) {
      this.props.shouldDismissPane();
    }
    return false;
  };

  _handleMoveShouldSetPanResponder = (e, gestureState) => {
    const shouldSet = (
      this.props.scalable &&
      (Math.abs(gestureState.dx) > 2 ||
        Math.abs(gestureState.dy) > 2 ||
        gestureState.numberActiveTouches === 2)
    );
    return shouldSet;
  };

  _handlePanResponderGrant = (e, gestureState) => {
    if (gestureState.numberActiveTouches === 2) {
      let dx = e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX;
      let dy = e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY;
      this.distant = Math.sqrt(dx * dx + dy * dy);
    }
  };

  _handlePanResponderEnd = (e, gestureState) => {
    this.setState({
      lastX: this.state.offsetX,
      lastY: this.state.offsetY,
      lastScale: this.state.scale,
    });
  };

  _handlePanResponderMove = (e, gestureState) => {
    // zoom
    if (gestureState.numberActiveTouches === 2) {
      let dx = e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX;
      let dy = e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY;
      let distant = Math.sqrt(dx * dx + dy * dy);
      const scale = (distant / this.distant) * this.state.lastScale;
      //check scale min to max hello
      if (scale < this.props.maxScale && scale > this.props.minScale) {
        this.setState({ scale, lastMovePinch: true });
      }
    }
    // translate
    else if (gestureState.numberActiveTouches === 1) {
      if (this.state.lastMovePinch) {
        gestureState.dx = 0;
        gestureState.dy = 0;
      }
      let offsetX = this.state.lastX + gestureState.dx / this.state.scale;
      let offsetY = this.state.lastY + gestureState.dy / this.state.scale;
      // if ( offsetX < 0  || offsetY <  0 )
      this.setState({ offsetX, offsetY, lastMovePinch: false });
    }
  };

  render() {
    return (
      <View
        style={styles.container}
        onTouchEnd={this._handleTouchLift}
        {...this.gestureHandlers.panHandlers}
      >
        <View
          style={[
            this.props.style,
            {
              transform: [
                { scaleX: this.state.scale },
                { scaleY: this.state.scale },
                { translateX: this.state.offsetX },
                { translateY: this.state.offsetY },
              ]
            }
          ]}
        >
          {this.props.children}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
