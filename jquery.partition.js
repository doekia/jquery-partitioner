/*
 * jQuery UI partitioner 1.0.0
 *
 * Copyright 2011, changhong,zhou
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * 
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.mouse.js
 *	jquery.ui.widget.js
 */
(function( $, undefined ) {

// number of pages in a partitioner
// (how many times can you page up/down to go through the whole range)
var numPages = 5;

$.widget( "ui.partitioner", $.ui.mouse, {

	widgetEventPrefix: "partitioner",

	options: {
		animate: false,
		distance: 0,
		max: 100,
		min: 0,
		orientation: "horizontal",
		step: 1,
		values: null,
		colors: ["green","blue","yellow","red","#6B3F7F","#ccc"],
		indicator:true
	},

	_create: function() {
		var self = this,
			o = this.options,
			existingHandles = this.element.find( ".ui-partitioner-handle" ).addClass( "ui-state-default ui-corner-all" ),
			handle = "<a class='ui-partitioner-handle ui-state-default ui-corner-all' href='#'></a>",
			handleCount = ( o.values && o.values.length ) || 1,
			handles = [];

		this._keySliding = false;
		this._mouseSliding = false;
		this._animateOff = true;
		this._handleIndex = null;
		this._detectOrientation();
		this._mouseInit();

		this.element
			.addClass( "ui-partitioner" +
				" ui-partitioner-" + this.orientation +
				" ui-widget" +
				" ui-widget-content" +
				" ui-corner-all" +
				( o.disabled ? " ui-partitioner-disabled ui-state-disabled ui-disabled" : "" ) );
		
		for ( var i = existingHandles.length; i < handleCount; i += 1 ) {
			handles.push( handle );
		}

		this.handles = existingHandles.add( $( handles.join( "" ) ).appendTo( self.element ) );

		this.handle = this.handles.eq( 0 );
		
		this.ranges = [];
		for(var i=0 ; i<= this.options.values.length; i++){
			var valPercent,
			self = this;
			this.ranges[i] = $( "<div></div>" )
			.appendTo( this.element )
			.addClass( "ui-partitioner-range").css({
				"float":"left",
				"background-color":this.options.colors[i]
			});
			//this.handles.add(this.ranges[i]);
		}
		
		this.handles.filter( "a" )
			.click(function( event ) {
				event.preventDefault();
			})
			.hover(function() {
				if ( !o.disabled ) {
					$( this ).addClass( "ui-state-hover" );
				}
			}, function() {
				$( this ).removeClass( "ui-state-hover" );
			})
			.focus(function() {
				if ( !o.disabled ) {
					$( ".ui-partitioner .ui-state-focus" ).removeClass( "ui-state-focus" );
					$( this ).addClass( "ui-state-focus" );
				} else {
					$( this ).blur();
				}
			})
			.blur(function() {
				$( this ).removeClass( "ui-state-focus" );
			});

		this.handles.each(function( i ) {
			$( this ).data( "index.ui-partitioner-handle", i );
		});

		this.handles
			.keydown(function( event ) {
				var index = $( this ).data( "index.ui-partitioner-handle" ),
					allowed,
					curVal,
					newVal,
					step;
	
				if ( self.options.disabled ) {
					return;
				}
	
				switch ( event.keyCode ) {
					case $.ui.keyCode.HOME:
					case $.ui.keyCode.END:
					case $.ui.keyCode.PAGE_UP:
					case $.ui.keyCode.PAGE_DOWN:
					case $.ui.keyCode.UP:
					case $.ui.keyCode.RIGHT:
					case $.ui.keyCode.DOWN:
					case $.ui.keyCode.LEFT:
						event.preventDefault();
						if ( !self._keySliding ) {
							self._keySliding = true;
							$( this ).addClass( "ui-state-active" );
							allowed = self._start( event, index );
							if ( allowed === false ) {
								return;
							}
						}
						break;
				}
	
				step = self.options.step;
				if ( self.options.values && self.options.values.length ) {
					curVal = newVal = self.values( index );
				} else {
					curVal = newVal = self.value();
				}
	
				switch ( event.keyCode ) {
					case $.ui.keyCode.HOME:
						newVal = self._valueMin();
						break;
					case $.ui.keyCode.END:
						newVal = self._valueMax();
						break;
					case $.ui.keyCode.PAGE_UP:
						newVal = self._trimAlignValue( curVal + ( (self._valueMax() - self._valueMin()) / numPages ) );
						break;
					case $.ui.keyCode.PAGE_DOWN:
						newVal = self._trimAlignValue( curVal - ( (self._valueMax() - self._valueMin()) / numPages ) );
						break;
					case $.ui.keyCode.UP:
					case $.ui.keyCode.RIGHT:
						if ( curVal === self._valueMax() ) {
							return;
						}
						newVal = self._trimAlignValue( curVal + step );
						break;
					case $.ui.keyCode.DOWN:
					case $.ui.keyCode.LEFT:
						if ( curVal === self._valueMin() ) {
							return;
						}
						newVal = self._trimAlignValue( curVal - step );
						break;
				}
	
				self._slide( event, index, newVal );
			})
			.keyup(function( event ) {
				var index = $( this ).data( "index.ui-partitioner-handle" );
	
				if ( self._keySliding ) {
					self._keySliding = false;
					self._stop( event, index );
					self._change( event, index );
					$( this ).removeClass( "ui-state-active" );
				}
	
			});

		this._refreshValue();

		this._animateOff = false;
	},

	destroy: function() {
		this.handles.remove();
		for(var i=0 ; i< this.ranges.length;i++){
			this.ranges[i].remove();
		}
		
		this.element
			.removeClass( "ui-partitioner" +
				" ui-partitioner-horizontal" +
				" ui-partitioner-vertical" +
				" ui-partitioner-disabled" +
				" ui-widget" +
				" ui-widget-content" +
				" ui-corner-all" )
			.removeData( "partitioner" )
			.unbind( ".partitioner" );

		this._mouseDestroy();

		return this;
	},

	_mouseCapture: function( event ) {
		var o = this.options,
			position,
			normValue,
			distance,
			closestHandle,
			self,
			index,
			allowed,
			offset,
			clickOnHandle = false,
			mouseOverHandle;

		if ( o.disabled ) {
			return false;
		}

		this.elementSize = {
			width: this.element.outerWidth(),
			height: this.element.outerHeight()
		};
		this.elementOffset = this.element.offset();

		position = { x: event.pageX, y: event.pageY };
		normValue = this._normValueFromMouse( position );
		distance = this._valueMax() - this._valueMin() + 1;
		self = this;
		
		this.handles.each(function( i ) {
			var thisDistance = Math.abs( normValue - self.values(i) );
			if ( $(this).hasClass( "ui-state-hover" ) )
			{
				clickOnHandle = true;
				closestHandle = $( this );
				distance = thisDistance;
				index = i;
				return false;
			}
			/*if ( distance > thisDistance ) {
				distance = thisDistance;
				closestHandle = $( this );
				index = i;
			}*/
		});
		if(!clickOnHandle)
		{
			return false;
		}
		// workaround for bug #3736 (if both handles of a range are at 0,
		// the first is always used as the one with least distance,
		// and moving it is obviously prevented by preventing negative ranges)
		if( this.values(1) === o.min ) {
			index += 1;
			closestHandle = $( this.handles[index] );
		}

		allowed = this._start( event, index );
		if ( allowed === false ) {
			return false;
		}
		this._mouseSliding = true;

		self._handleIndex = index;

		closestHandle
			.addClass( "ui-state-active" )
			.focus();
		
		offset = closestHandle.offset();
		mouseOverHandle = !$( event.target ).parents().andSelf().is( ".ui-partitioner-handle" );
		this._clickOffset = mouseOverHandle ? { left: 0, top: 0 } : {
			left: event.pageX - offset.left - ( closestHandle.width() / 2 ),
			top: event.pageY - offset.top -
				( closestHandle.height() / 2 ) -
				( parseInt( closestHandle.css("borderTopWidth"), 10 ) || 0 ) -
				( parseInt( closestHandle.css("borderBottomWidth"), 10 ) || 0) +
				( parseInt( closestHandle.css("marginTop"), 10 ) || 0)
		};

		if ( !this.handles.hasClass( "ui-state-hover" ) ) {
			this._slide( event, index, normValue );
		}
		this._animateOff = true;
		return true;
	},

	_mouseStart: function( event ) {
		return true;
	},

	_mouseDrag: function( event ) {
		var position = { x: event.pageX, y: event.pageY },
			normValue = this._normValueFromMouse( position );
		
		this._slide( event, this._handleIndex, normValue );

		return false;
	},

	_mouseStop: function( event ) {
		this.handles.removeClass( "ui-state-active" );
		this._mouseSliding = false;

		this._stop( event, this._handleIndex );
		this._change( event, this._handleIndex );

		this._handleIndex = null;
		this._clickOffset = null;
		this._animateOff = false;

		return false;
	},
	
	_detectOrientation: function() {
		this.orientation = ( this.options.orientation === "vertical" ) ? "vertical" : "horizontal";
	},

	_normValueFromMouse: function( position ) {
		var pixelTotal,
			pixelMouse,
			percentMouse,
			valueTotal,
			valueMouse;

		if ( this.orientation === "horizontal" ) {
			pixelTotal = this.elementSize.width;
			pixelMouse = position.x - this.elementOffset.left - ( this._clickOffset ? this._clickOffset.left : 0 );
		} else {
			pixelTotal = this.elementSize.height;
			pixelMouse = position.y - this.elementOffset.top - ( this._clickOffset ? this._clickOffset.top : 0 );
		}

		percentMouse = ( pixelMouse / pixelTotal );
		if ( percentMouse > 1 ) {
			percentMouse = 1;
		}
		if ( percentMouse < 0 ) {
			percentMouse = 0;
		}
		if ( this.orientation === "vertical" ) {
			percentMouse = 1 - percentMouse;
		}

		valueTotal = this._valueMax() - this._valueMin();
		valueMouse = this._valueMin() + percentMouse * valueTotal;

		return this._trimAlignValue( valueMouse );
	},

	_start: function( event, index ) {
		var uiHash = {
			handle: this.handles[ index ]
		};
		if ( this.options.values && this.options.values.length ) {
			uiHash.values = this.values();
		}
		return this._trigger( "start", event, uiHash );
	},

	_slide: function( event, index, newVal ) {
		var preVal,nextVal,
			newValues,
			allowed;
	
		preVal = index ? this.values(index-1) : this.options.min;
		nextVal = (index == (this.options.values.length-1))? this.options.max : this.values(index+1);
		
		if ( newVal >= nextVal - this.options.min){
			newVal = nextVal - this.options.min;
			this.values( index, newVal, true );
			return;
		}else if(newVal <= preVal + this.options.min && index != 0){
			newVal = preVal + this.options.min;
			this.values( index, newVal, true );
			return;
		}		

		if ( newVal !== this.values( index ) ) {
			newValues = this.values();
			newValues[ index ] = newVal;
			// A slide can be canceled by returning false from the slide callback
			allowed = this._trigger( "slide", event, {
				handle: this.handles[ index ],
				value: newVal,
				values: newValues
			} );
			if ( allowed !== false ) {
				this.values( index, newVal, true );
			}
		}
		
	},

	_stop: function( event, index ) {
		var uiHash = {
			handle: this.handles[ index ]
		};
		if ( this.options.values && this.options.values.length ) {
			uiHash.values = this.values();
		}

		this._trigger( "stop", event, uiHash );
	},

	_change: function( event, index ) {
		if ( !this._keySliding && !this._mouseSliding ) {
			var uiHash = {
				handle: this.handles[ index ]
			};
			if ( this.options.values && this.options.values.length ) {
				uiHash.values = this.values();
			}

			this._trigger( "change", event, uiHash );
		}
	},
	
	values: function( index, newValue ) {
		var vals,
			newValues,
			i;

		if ( arguments.length > 1 ) {
			this.options.values[ index ] = this._trimAlignValue( newValue );
			this._refreshValue();
			this._change( null, index );
			return;
		}

		if ( arguments.length ) {
			if ( $.isArray( arguments[ 0 ] ) ) {
				vals = this.options.values;
				newValues = arguments[ 0 ];
				for ( i = 0; i < vals.length; i += 1 ) {
					vals[ i ] = this._trimAlignValue( newValues[ i ] );
					this._change( null, i );
				}
				this._refreshValue();
			} else {
				return this._values( index );				
			}
		} else {
			return this._values();
		}
	},
    
	_span: function(index){
		if(index <=0){
			return this.values(0);
		}
		else if(index >= this.options.values.length){
			return this._valueMax() - this.values(this.options.values.length-1);
		}
		else{
			return this.values(index)-this.values(index-1);
		}
	},
	spans: function(){
		var spans = [];
		for(var i=0;i<=this.options.values.length; i++){
			spans[i] = this._span(i);
		}
		return spans;
	},
	_setOption: function( key, value ) {
		var i,
			valsLength = 0;

		if ( $.isArray( this.options.values ) ) {
			valsLength = this.options.values.length;
		}

		$.Widget.prototype._setOption.apply( this, arguments );

		switch ( key ) {
			case "disabled":
				if ( value ) {
					this.handles.filter( ".ui-state-focus" ).blur();
					this.handles.removeClass( "ui-state-hover" );
					this.handles.propAttr( "disabled", true );
					this.element.addClass( "ui-disabled" );
				} else {
					this.handles.propAttr( "disabled", false );
					this.element.removeClass( "ui-disabled" );
				}
				break;
			case "orientation":
				this._detectOrientation();
				this.element
					.removeClass( "ui-partitioner-horizontal ui-partitioner-vertical" )
					.addClass( "ui-partitioner-" + this.orientation );
				this._refreshValue();
				break;
			case "values":
				if(valsLength != value.length){
					
				}
				this._animateOff = true;
				this._refreshValue();
				for ( i = 0; i < valsLength; i += 1 ) {
					this._change( null, i );
				}
				this._animateOff = false;
				break;
			case "colors":
				for ( i = 0; i < valsLength; i += 1 ) {
					this.ranges[i].css("background-color",this.options.colors[i]);
				}
				break;
		}
	},

	//internal values getter
	// _values() returns array of values trimmed by min and max, aligned by step
	// _values( index ) returns single value trimmed by min and max, aligned by step
	_values: function( index ) {
		var val,
			vals,
			i;

		if ( arguments.length ) {
			val = this.options.values[ index ];
			val = this._trimAlignValue( val );

			return val;
		} else {
			// .slice() creates a copy of the array
			// this copy gets trimmed by min and max and then returned
			vals = this.options.values.slice();
			for ( i = 0; i < vals.length; i+= 1) {
				vals[ i ] = this._trimAlignValue( vals[ i ] );
			}

			return vals;
		}
	},
	
	// returns the step-aligned value that val is closest to, between (inclusive) min and max
	_trimAlignValue: function( val ) {
		if ( val <= this._valueMin() ) {
			return this._valueMin();
		}
		if ( val >= this._valueMax() ) {
			return this._valueMax();
		}
		var step = ( this.options.step > 0 ) ? this.options.step : 1,
			valModStep = (val - this._valueMin()) % step,
			alignValue = val - valModStep;

		if ( Math.abs(valModStep) * 2 >= step ) {
			alignValue += ( valModStep > 0 ) ? step : ( -step );
		}

		// Since JavaScript has problems with large floats, round
		// the final value to 5 digits after the decimal point (see #4124)
		return parseFloat( alignValue.toFixed(5) );
	},

	_valueMin: function() {
		return this.options.min;
	},

	_valueMax: function() {
		return this.options.max;
	},
	
	_diskSizeFormate : function(size){
		var strSize;
		if(size >= ((1<<30) * (1<<10))){
			strSize = (size / ((1<<30) * (1<<10))).toFixed(1) + "T";
		}
		else if (size >= (1 << 30))
		{
			strSize = (size / (1 << 30)).toFixed(1) + "G";
		}
		else if (size >= (1 << 20))
		{
			strSize = (size / (1 << 20)).toFixed(1) + "M";
		}
		else if(size >= (1 << 10))
		{
			strSize = (size / (1 << 10)).toFixed(1) + "KB";
		}
		else
		{
			strSize = size + "B";
		}
		return strSize;
	},
	
	_renderIndicator : function(range,index,span){
		if(	typeof(this.options.indicator) === "function"){
			this.options.indicator(range,index,span);
			return;
		}
		switch(this.options.indicator){
		case "value":
			range.text(span);
			break;
		case "diskSize":
			var sizeStr = 
			range.text(this._diskSizeFormate(span));
			break;
		case "percent":
		default:
			var valPercent = ( span - this._valueMin() ) / ( this._valueMax() - this._valueMin() ) * 100;
			range.text(valPercent.toFixed(1) + "%");
		
		}
	},
	_refreshValue: function() {
		var	o = this.options,
			self = this,
			animate = ( !this._animateOff ) ? o.animate : false,
			valPercent,
			_set = {},
			lastValPercent = 0,
			lastVal = 0,
			valueMin,
			valueMax;

		if ( this.options.values && this.options.values.length ) {
			this.handles.each(function( i, j ) {
				valPercent = ( self.values(i)) / ( self._valueMax()) * 100;
				_set[ self.orientation === "horizontal" ? "left" : "bottom" ] = valPercent + "%";
				$( this ).stop( 1, 1 )[ animate ? "animate" : "css" ]( _set, o.animate );
				
				if ( self.orientation === "horizontal" ) {
						self.ranges[i].stop( 1, 1 )[ animate ? "animate" : "css" ]( { left: lastValPercent + "%" }, o.animate );
						self.ranges[i][ animate ? "animate" : "css" ]( { width: ( valPercent - lastValPercent ) + "%" }, { queue: false, duration: o.animate } );
											
				} else {
						self.ranges[i].stop( 1, 1 )[ animate ? "animate" : "css" ]( { bottom: ( lastValPercent ) + "%" }, o.animate );
						self.ranges[i][ animate ? "animate" : "css" ]( { height: ( valPercent - lastValPercent ) + "%" }, { queue: false, duration: o.animate } );
						
				}
				if(self.options.indicator){
					self._renderIndicator(self.ranges[i],i,self.values(i)-lastVal);
				}
				lastValPercent = valPercent;
				lastVal = self.values(i);
			});
			//deal the last block
			if ( self.orientation === "horizontal" ) {
				self.ranges[self.ranges.length-1].stop( 1, 1 )[ animate ? "animate" : "css" ]( { left: lastValPercent + "%" }, o.animate );
				self.ranges[self.ranges.length-1][ animate ? "animate" : "css" ]( { width: ( 100 - lastValPercent ) + "%" }, { queue: false, duration: o.animate } );
			}
			else
			{
				self.ranges[self.ranges.length-1].stop( 1, 1 )[ animate ? "animate" : "css" ]( { bottom: ( lastValPercent ) + "%" }, o.animate );
				self.ranges[self.ranges.length-1][ animate ? "animate" : "css" ]( { height: ( 100 - lastValPercent ) + "%" }, { queue: false, duration: o.animate } );
			}
			if(self.options.indicator){
				self._renderIndicator(self.ranges[self.ranges.length-1],self.ranges.length-1,self._span(self.options.values.length));
			}
		}
	}
});

$.extend( $.ui.partitioner, {
	version: "1.0.0"
});

}(jQuery));