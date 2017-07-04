/*
 * TickP : A library for plotting Stock Charts and Technical Analysis  
 * using html canvas 
 * 
 * Copyright (c) 2010 - Abhijit Gadgil <gabhijit@gmail.com>
 * 
 * Licensed under the MIT License 
 * http://www.opensource.org/licenses/mit-license.php
 *  
 * Includes some code from jQuery. 
 * 
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 * 
 * 
 */

(function($) {
    $.tickp = function(target, options) {
        /* constructor for the plot object. Idea taken from jQuery */
        return new $.tickp.fn.init(target, options);
    };
    /* The plot object prototype */
    $.tickp.fn = {
        emas : {},
        psar: [],
        current : undefined,
        prev: undefined,

        /* The chart layout properties follow */ 
        /* first get the width */
        //******Artanisz Changes**///
        loffset : 4,
        rmargin : 50,
        //******Artanisz Changes**///
        plotwidth : 800,
        width : undefined, 
        /* tmargin and ttext row is the upper row. */
        //******Artanisz Changes**///
		tmargin:0,
        // ttextrow: 24, 
        ttextrow: 0, 
        //******Artanisz Changes**///
        topmargin : undefined,
        /* vspacing : spacing between main chart and lower indicators */
        vspacing: 5,
        limargin: 20, 
        liplotht : 100,
        loweriht : undefined,
        /* Margin at the bottom  */
        plotht : 400, 
        height : undefined,
        //******Artanisz Changes**///
		// bmargin : 20,  
        // All the logic is based on the old height
        // The new height is a scaled old height
        oldheight : undefined,
        bmargin : 30,

        interval : 0,
        /* chart mode: Supports two modes currently 
            - navigation (0): Displays values for individual candles and
                              (not very) simple trendline support. 
            - pan/zoom   (1): Moves along the time axis. TODO: Zoom mode 
            - crosshair  (2): Draws a crosshair.
        */
        mode: 2, // 0: navigation 1: pan and zoom 2: crosshair
 
        showvolume: true,
        showcrosshair: true,
        digitsafterdecimal: 0,
		selectedtrendline: -1,
        /* The focus candle is normally the last candle
		   In crosshair mode the focus candle is the one the crosshair points to
        */
		focuscandle: 0,
		candlebordercolor: '#FFFFFF',
		candlebordersize: 0,

        // supported indicators 
        supported : ['ema', 'sma', 'psar', 'bbands', 'alligator', 'envelopes',
			'rsi', 'stoch', 'macd', 'awesome', 'ac', 'atr', 'cci', 'momentum', 'osma', 'dem', 'wpr', 'w_ad','smp'],
        //******Artanisz Changes**///
        
        // our copyright text 
        copyrighttext : "\xA9 tickerplot.com",
        /* init is the constructor function for the object. 
            TODO: options support. Default options only right now. */  
        init: function(target, options) {
            /* 
            * First thing we do is initialize target - 
            *  Assumption neigh requirement is 'target' is going to be the 
            *  'id' of the div where we are going to 'create canvas and shoot.
            */
            this.target = $$(target);

            //this.cs = $.tickp.csdark;
            this.cs = options.theme;

            var self = this;

            this.width = this.loffset + this.rmargin + this.plotwidth;
            this.topmargin = this.tmargin + this.ttextrow,
            this.loweriht = this.vspacing + this.limargin + this.liplotht,
            //******Artanisz Changes**///
            // Height is initialized here but its value will be set by using setSize()
            this.oldheight = this.topmargin + this.plotht + this.loweriht + this.bmargin;
            this.height = this.topmargin + this.plotht + this.bmargin;
            //******Artanisz Changes**///

            // drawing lines
            this.lines = [];
            //******Artanisz Changes**///
            // List of trend line indexes that generate Fibonacci retracement
            this.fibonacci = [];
            // List of trend line indexes that generate percent change
            this.percentmovement = [];
			this.horizontallines = [];
            this.verticallines = [];
            this.textfields = [];
            this.selectedtextfield = -1;
            // The labels array contains all the text components to be drawn
            // by using the text over canvas method (e.g. textcanvas by Oliver Steele).
			// The idea of the design should be to update the text as few times as possible.
            // The data will be stored in an associative array
            this.labels = [];
			// Flags
            this.redrawoverlays = false;
			this.redrawindicators = false;
            //******Artanisz Changes**///
            this.undolines = [];

            this.infodiv = document.createElement('div')
            this.infodiv.id = 'info';
            this.infodiv.zIndex = "1000";
            this.target.appendChild(this.infodiv);

            this.scaleCoef = 0;
            this.extremeRanges = {
                upper: false,
                lower: false,
                upperExtreme: false,
                lowerExtreme: false,
                upperPrice: false,
                lowerPrice: false
            };

            this.currentPrice = 0;

            //inject moment
            this.moment = (options && options.moment) || undefined;

            //crosshair status
            this.crosshair = true;

            // make ourselves available to the world as window.$plot (so that refering to us
            // should not require to know the variable that held us 
            window.$plot = this;
            return this;
        },
		//******Artanisz Changes**///
        addHorizontalLine: function( y, color, text, value, id ) {
            this.horizontallines.push(new Array(y, color, text, value, id));
        },
        updateHorizontalLine: function (id, y, color, text, value) {
            for (var i = 0; i <= this.horizontallines.length - 1; i++) {
                if (this.horizontallines[i][4] === id) {
                    this.horizontallines[i] = [y, color, text, value, id];
                }
            }

        },
        addVerticalLine: function( x, color, text, value ) {
            this.verticallines.push(new Array(x, color, text, value));
        },
        _addFibonacci: function( trendLineIndex ) {
            if( trendLineIndex < 0 ) return;
            if( trendLineIndex >= this.lines.length ) return;
            // A trend line cannot generate both a Fibonacci retracement and a percent movement
            if( trendLineIndex in this.percentmovement ) return;
            this.fibonacci[ trendLineIndex ] = true;
        },
        _deleteFibonacci: function( trendLineIndex ) {
            delete this.fibonacci[trendLineIndex];
        },
        _addPercent: function( trendLineIndex ) {
            if( trendLineIndex < 0 ) return;
            if( trendLineIndex >= this.lines.length ) return;
            // A trend line cannot generate both a Fibonacci retracement and a percent movement
			if( trendLineIndex in this.fibonacci ) return;
            this.percentmovement[ trendLineIndex ] = true;
        },
        _deletePercent: function( trendLineIndex ) {
            delete this.percentmovement[trendLineIndex];
        },
        // Draws a Fibonacci retracement by using a trend line with index
        _drawFibonacci: function( trendLineIndex ) {
            if( trendLineIndex < 0 ) return;
            if( trendLineIndex >= this.lines.length ) return;
            var bx = this.candleToX( this.lines[trendLineIndex][0][0] );
            var ex = this.candleToX( this.lines[trendLineIndex][1][0] );
            var by = this.valueToY( this.lines[trendLineIndex][0][1] );
            var ey = this.valueToY( this.lines[trendLineIndex][1][1] );
            // bx should be on the left and ex should be on the right
            // if not, switch
            if( bx > ex ) {
                var store = bx;
                bx = ex;
                ex = store;
                store = by;
                by = ey;
                ey = store;
            }
            percentx = (ex - bx) / 100;
            percenty = (ey - by) / 100;
            var top = this._scaledY( this.tmargin );
            var bottom = this._scaledY( this.tmargin + this.plotht );
            var cx, cy;
            // TODO: Add logic for out of bounds x
            // bx, by is 100%
            if( (by < bottom ) && (by > top ) ) {
                this._drawHorizontalLine( bx, by, this.loffset + this.plotwidth - bx, '#000000', '100%');
            }
            // 61.8%
			cy = ey - ( 61.8 * percenty );
            cx = ex - ( 61.8 * percentx );
            if( (cy < bottom ) && (cy > top ) ) {
                this._drawHorizontalLine( cx, cy, this.loffset + this.plotwidth - cx, '#00FFFF', '61.8%' )
			}
            // 50%
            cy = ey - ( 50 * percenty );
            cx = ex - ( 50 * percentx );
            if( (cy < bottom ) && (cy > top ) ) {
                this._drawHorizontalLine( cx, cy, this.loffset + this.plotwidth - cx, '#00FF00', '50.0%' )
            }
            // 38.2%
            cy = ey - ( 38.2 * percenty );
            cx = ex - ( 38.2 * percentx );
            if( (cy < bottom ) && (cy > top ) ) {
                this._drawHorizontalLine( cx, cy, this.loffset + this.plotwidth - cx, '#FF0000', '38.2%' )
			}
            // ex, ey is 0%
            if( (ey < bottom ) && (ey > top ) ) {
                this._drawHorizontalLine( ex, ey, this.loffset + this.plotwidth - ex, '#FFFF00', '0%');
            }
        },
        _drawPercent: function( trendLineIndex ) {
            if( trendLineIndex < 0 ) return;
            if( trendLineIndex >= this.lines.length ) return;
            var bx = this.candleToX( this.lines[trendLineIndex][0][0] );
            var ex = this.candleToX( this.lines[trendLineIndex][1][0] );
			var by = this.valueToY( this.lines[trendLineIndex][0][1] );
			var ey = this.valueToY( this.lines[trendLineIndex][1][1] );
            // bx should be on the left and ex should be on the right
            // if not, switch
            var switched;
            var bvalue;
            var evalue;
            if( bx > ex ) {
			    switched = bx;
                bx = ex;
                ex = switched;
                switched = by;
                by = ey;
                ey = switched;
                // Initialize values
                bvalue = this.lines[trendLineIndex][1][1].toFixed(this.digitsafterdecimal);
                evalue = this.lines[trendLineIndex][0][1].toFixed(this.digitsafterdecimal);
            } else {
                bvalue = this.lines[trendLineIndex][0][1].toFixed(this.digitsafterdecimal);
                evalue = this.lines[trendLineIndex][1][1].toFixed(this.digitsafterdecimal);
            }
            var change = (( evalue - bvalue ) / bvalue).toFixed(2);

			// Draw the beginning and the end
            if( check_textRenderContext(this.octx) ) {
                this.octx.strokeStyle = this.cs.label;
                var top = this._scaledY( this.tmargin );
                var bottom = this._scaledY( this.tmargin + this.plotht );
                var left = this.loffset;
                // Consider text size when testing for out of border on the right
                var right = this.loffset + this.plotwidth;
                var midx = Math.round(( bx + ex ) / 2 + 10 );
				var midy = Math.round(( by + ey ) / 2);


                if( ( by < bottom ) && ( by > top) && ( bx > left ) &&
				    ( bx < right - ctx.measureText(bvalue).width + 5 ) ) {
                    //this.octx.strokeText( bvalue + '', bx+5, by-10, 6, 200, 100, 100, 'sans-serif' );
                    //deepq
                    this.octx.strokeText(bvalue + '', bx + 5, by - 10, 6);
                }

                if( ( ey < bottom ) && ( ey > top) && ( ex > left ) && 
				    ( ex < right - ctx.measureText(evalue).width + 5 ) ) {
                    //deepq
                    //this.octx.strokeText(evalue + '', ex + 5, ey - 10, 6, 200, 100, 100, 'sans-serif');
                    this.octx.strokeText(evalue + '', ex + 5, ey - 10, 6);
                }
                if( ( midy < bottom ) && ( midy > top) && ( midx > left ) 
					&& ( midx < right - ctx.measureText(change).width ) ) {
                    //deepq
                    //this.octx.strokeText( change + '%', midx, midy - 10, 6, 200, 100, 100, 'sans-serif' );
                    this.octx.strokeText( change + '%', midx, midy - 10, 6);
                }

            }
        },
        /*
         * Text field functions
         */
        // Note: The text field should be added externally
        // Note: At least one plot before adding text fields (because of cp.begin used)
        _addTextField: function( text, x, y, width, height, fontsize, color ) {
			// text is obligatory, other parameters are not
            if( !text ) return;
            if( !x ) var x = this.loffset;
            if( !y ) var y = this._scaledY( this.tmargin );
            if( !height ) var height = 20;
			if( !fontsize ) var fontsize = 8;
            if( !color ) var color = '#FF0000';
            this.octx.font = (fontsize + 1) + 'pt Arial';
            if( !width ) var width = this.octx.measureText( text ).width;
            else {
                var w = this.octx.measureText( text ).width;
                if( width < w ) width = w;
            }
            var o = { text: text, x: this.findClosestCandle( x ), y: this.yToValue( y ), 
				width: width, height: height, 
                fontsize: fontsize, fontwidth: 100, color: color, selected: false };
            this.textfields.push( o );
		},
        _deleteTextField: function( index ) {
            if( index < 0 ) return;
            if( index >= this.textfields.length ) return;
			this.textfields.splice( index, 1 );
        },
        _drawTextField: function( index ) {
            if( index < 0 ) return;
            if( index >= this.textfields.length ) return;
 
            var o = this.textfields[index];
            var x = this.candleToX( o.x );
            var y = this.valueToY( o.y );
            var width = o.width;
            var height = o.height;
         
            // Don't draw if out of borders
            var rightmost = this.loffset + this.plotwidth;
            if( x >= rightmost ) return;
            var right = x + width;
			if( right <= this.loffset ) return;
            var tmargin = this._scaledY( this.tmargin );
            var bottom = y + height;
            if( bottom <= tmargin ) return;
            var bottommost = this._scaledY( this.tmargin + this.plotht );
            if( y >= bottommost ) return;
 
            var wchanged = false;
 
            // Check for out of borders drawing
			// Draw selected bottom right
            var dsbr = true;
            // Draw selected top left
            var dstl = true;
            if( x < this.loffset ) {
                var dif = this.loffset - x;
                x = this.loffset;
                width -= dif;
                wchanged = true;
                dstl = false;
			}
            if( right > rightmost ) {
                width = rightmost - x;
                wchanged = true;
                dsbr = false;
            }
            if( y < tmargin ) {
                var dif = tmargin - y;
                y = tmargin;
                height -= dif;
                dstl = false;
            }
            if( bottom > bottommost ) {
                height = bottommost - y;
                dsbr = false;
            }
 
			// Adjust text size
            var fontwidth = o.fontwidth;
            if( wchanged ) {
                // The base width is the original width of the text field
                this.octx.font = (o.fontsize + 1) + 'pt Arial';
                var bw = this.octx.measureText(o.text).width;
                fontwidth = (80 * width) / bw;
			}

			this.octx.strokeStyle = o.color;
            this.octx.fillStyle = '#AAAAAA';
            this.octx.fillRect( x, y, width, height);
            this.octx.strokeRect( x, y, width, height);
            if( o.selected ) {
                this.octx.fillStyle = o.color;
                if( dstl ) this.octx.fillRect( x - 2, y - 2, 4, 4 );
                if( dsbr ) this.octx.fillRect( x + width - 2, y + height - 2, 4, 4 );
            }
            if( check_textRenderContext(this.octx) ) {
                if( (height > 15) && (fontwidth > 45) )
                    //this.octx.strokeText( o.text , x + 1, y + height / 2 - o.fontsize / 2,
				    //    o.fontsize, 200, 100, fontwidth, 'sans-serif' );
                    //deepq
                    this.octx.strokeText( o.text , x + 1, y + height / 2 - o.fontsize / 2, o.fontsize);
            }
        },
        selectTextField: function( x, y ) {
            var has = false;
            var len = this.textfields.length;
            var tfx;
            var tfy;
            var tf;
            this.resetSelectedTextFields();
			for( var i = 0; i < len; i++ ) {
                tf = this.textfields[i];
                // Switch to pixel based coordinates
                tfx = this.candleToX( tf.x );
                tfy = this.valueToY( tf.y );
                if( ( x >= tfx ) && ( x <= (tfx + tf.width) ) && 
				    ( y >= tfy ) && ( y <= (tfy + tf.height)) ) {
                    this.textfields[i].selected = true;
                    this.selectedtextfield = i;
                    has = true;
				}
            }
            // If no text field is selected, reset
            // if( !has ) this.resetSelectedTextFields();
            return has;
        },
		resetSelectedTextFields: function() {
            var len = this.textfields.length;
            this.selectedtextfield = -1;
            for( var i = 0; i < len; i++ ) {
                this.textfields[i].selected = false;
            }
        },
        /*
         * End of text field functions
         */
        // Note: Overlaps with functionality in drawlines TODO: Merge
        _drawHorizontalLine: function( x, y, width, color, label ) {
            var leftborder = this.loffset;
		    var rightborder = this.loffset + this.plotwidth;
            var drawlabel = true;
            var labelwidth = this.octx.measureText(label).width;
            // Left border logic
            if( x < leftborder ) {
                drawlabel = false;
                x = leftborder;
            } else if( x > rightborder - labelwidth ) {
                drawlabel = false;
                if( x > rightborder)
                   width = 0;
            }
            _drawline(this.octx, x, y , x + width, y, color);
            if( check_textRenderContext(this.octx) && drawlabel ) {
                this.octx.strokeStyle = this.cs.label;
                //this.octx.strokeText( label, x+5, y-10, 6, 200, 100, 100, 'sans-serif' );
                //deepq
                this.octx.strokeText( label, x+5, y-10, 6);
            }
		},
        moveSelectedTextField: function( deltax, deltay ) {
            if( this.selectedtextfield > -1 ) {
                this.textfields[this.selectedtextfield].y += deltay;
                this.textfields[this.selectedtextfield].x += deltax;
            }
		},
        // Returns whether the event will correspond to a text field resize
        // 0: no resize
        // resize clockwise
		// 1: resize top
        // 2: resize top right
        // 3: resize right
		// 4: resize bottom right
        // 5: resize bottom
        // 6: resize bottom left
        // 7: resize left
        // 8: resize top left
        willResizeTextField: function( x, y ) {
            if( this.selectedtextfield < 0 ) return 0;
            var top = this.valueToY( this.textfields[this.selectedtextfield].y );
            var left = this.candleToX( this.textfields[this.selectedtextfield].x );
            var right = left + this.textfields[this.selectedtextfield].width;
            var bottom = top + this.textfields[this.selectedtextfield].height;
            if( Math.abs( y - top ) < 4 ) {
                if( Math.abs( x - right ) < 4 ) {
                    return 2;
                } else if( Math.abs( x - left ) < 4 ) {
                    return 8;
                } else {
                    return 1;
                }
			} else if( Math.abs( y - bottom) < 4 ) {
                if( Math.abs( x - right ) < 4 ) {
                    return 4;
                } else if( Math.abs( x - left ) < 4 ) {
                    return 6;
                } else {
                    return 5;
                }
            } else if( Math.abs( x - right ) < 4 ) {
                return 3;
            } else if( Math.abs( x - left ) < 4 ) { 
                return 7;
            }
            return 0;
        },
        resizeSelectedTextField: function( command, deltax, deltay ) {
            if( this.selectedtextfield < 0 ) return;
			var oldc;
            var oldy;
            var oldx;
            var oldwidth = this.textfields[this.selectedtextfield].width;
            switch( command ) {
                case 1:
                    oldy = Math.round(this.valueToY( this.textfields[this.selectedtextfield].y ));
                    oldy += deltay;
                    this.textfields[this.selectedtextfield].y = this.yToValue( oldy );
                    this.textfields[this.selectedtextfield].height -= deltay;
                    break;
                case 2:
                    oldy = Math.round(this.valueToY( this.textfields[this.selectedtextfield].y ));
                    oldy += deltay;
                    this.textfields[this.selectedtextfield].y = this.yToValue( oldy );
                    this.textfields[this.selectedtextfield].height -= deltay;
                    this.textfields[this.selectedtextfield].width += deltax;
                    break;
                case 3:
                    this.textfields[this.selectedtextfield].width += deltax;
                    break;
                case 4:
                    this.textfields[this.selectedtextfield].width += deltax;
                    this.textfields[this.selectedtextfield].height += deltay;
                    break;
				case 5:
                    this.textfields[this.selectedtextfield].height += deltay;
                    break;
                case 6:
                    this.textfields[this.selectedtextfield].height += deltay;
					// Left logic
                    oldx = this.candleToX( this.textfields[this.selectedtextfield].x );
                    oldc = this.textfields[this.selectedtextfield].x;
                    oldx += deltax;
					this.textfields[this.selectedtextfield].x = this.findClosestCandle( oldx );
                    deltax = ( this.textfields[this.selectedtextfield].x - oldc ) * this.cp.minwidth;
                    this.textfields[this.selectedtextfield].width -= deltax;
                    break;
                case 7:
                    oldx = this.candleToX( this.textfields[this.selectedtextfield].x );
                    oldc = this.textfields[this.selectedtextfield].x;
                    oldx += deltax;
                    this.textfields[this.selectedtextfield].x = this.findClosestCandle( oldx );
                    deltax = ( this.textfields[this.selectedtextfield].x - oldc ) * this.cp.minwidth;
                    this.textfields[this.selectedtextfield].width -= deltax;
                    break;
                case 8:
                    oldy = Math.round(this.valueToY( this.textfields[this.selectedtextfield].y ));
                    oldy += deltay;
					this.textfields[this.selectedtextfield].y = this.yToValue( oldy );
                    this.textfields[this.selectedtextfield].height -= deltay;
                    // Left logic
                    oldx = this.candleToX( this.textfields[this.selectedtextfield].x );
                    oldc = this.textfields[this.selectedtextfield].x;
                    oldx += deltax;
                    this.textfields[this.selectedtextfield].x = this.findClosestCandle( oldx );
                    deltax = ( this.textfields[this.selectedtextfield].x - oldc ) * this.cp.minwidth;
                    this.textfields[this.selectedtextfield].width -= deltax;
                    break;
                default:
                    return 0;
            }
            // Change command limit
            var cclimit = 8;
            var changedirection = false;
            if( this.textfields[this.selectedtextfield].height < cclimit ) {
                this.textfields[this.selectedtextfield].height = cclimit;
                changedirection = true;
			}
            if( this.textfields[this.selectedtextfield].width < cclimit ) {
                this.textfields[this.selectedtextfield].width = cclimit;
                changedirection = true;
			}
            if( changedirection ) {
                switch( command ) {
                    case 1:
                    case 2:
                    case 3:
	                case 4:
                        command += 4;
                        break;
                    default:
                        command -= 4;
				}
            }
            // Adjust text size
            if( oldwidth != this.textfields[this.selectedtextfield].width ) {
                // The base width is the original width of the text field
                this.octx.font = (this.textfields[this.selectedtextfield].fontsize + 1) + 'pt Arial';
                var bw = this.octx.measureText(this.textfields[this.selectedtextfield].text).width;
			    this.textfields[this.selectedtextfield].fontwidth = 
				    (100 * this.textfields[this.selectedtextfield].width) / bw;
                
			}
            // NOTE: There are ways to fix the offset.
            // However, we will change the text library anyway
            /* if( oldwidth > this.textfields[this.selectedtextfield].width ) 
			    this.textfields[this.selectedtextfield].fontwidth-=10;
            else if( oldwidth > this.textfields[this.selectedtextfield].width ) 
                this.textfields[this.selectedtextfield].fontwidth+=10;*/
            return command;
        },
        drawTextFields: function() {
            var number = this.textfields.length;
            for( var i = 0; i < number; i++ ) {
                this._drawTextField( i );
            }
        },
		//******Artanisz Changes**///
        drawlines: function() {
            this.octx.clearRect(0,0, this.width, this.height);
            //this.octx.strokeStyle = plot.cs.trendline;
            this.octx.strokeStyle = '#AAAAAA';
            var lines = this.lines;

            //******Artanisz Changes**///
            var bx, by, ex, ey;
            var leftout, rightout, topout, bottomout;
            // Selected line, beginning/end/middle
            var selectedline = -1;
			var bem = 0;
            var linesizechange = false;
            if( this.selectedtrendline >= 0 ) {
                selectedline = Math.floor( this.selectedtrendline / 10 );
                bem = this.selectedtrendline % 10;
            }
            //******Artanisz Changes**///
            for(var i = 0; i < lines.length; i++) {
                //******Artanisz Changes**///
                // If both the beginning and the end are out of scale, do not draw the line
                leftout = 0;
                rightout = 0;
                // TODO: Use left and right instead of calculating them every time
                // TODO: Calculate a and b line coefficients once
                bx = this.candleToX( lines[i][0][0] );
                ex = this.candleToX( lines[i][1][0] );
                by = this.valueToY( lines[i][0][1] );
                ey = this.valueToY( lines[i][1][1] );
                if( bx < this.loffset ) {
                    leftout++;
                    by = by + ( (this.loffset - bx) / (ex - bx) ) * ( ey - by );
                    bx = this.loffset;      
				} else if( bx > ( this.loffset + this.plotwidth ) ) {
                    rightout++;
                    by = by - ( ( bx - this.loffset - this.plotwidth ) / ( bx - ex ) ) * ( by - ey )
                    bx = this.loffset + this.plotwidth;
				}
                if( ex < this.loffset ) {
                    leftout++;
                    ey = ey + ( (this.loffset - ex) / (bx - ex) ) * ( by - ey );
                    ex = this.loffset;      
                } else if( ex > ( this.loffset + this.plotwidth ) ) {
                    rightout++;
                    ey = ey - ( ( ex - this.loffset - this.plotwidth ) / ( ex - bx ) ) * ( ey - by )
                    ex = this.loffset + this.plotwidth;
				}
                if( (leftout > 1) || (rightout > 1) ) {
                    continue;
                }
 
                topout = 0;
				bottomout = 0;
                var top = this._scaledY( this.tmargin );
                var bottom = this._scaledY( this.tmargin + this.plotht );
                // line coefficients
                // a = (y2 - y1) / (x2 - x1)
                // b = y1 - x1 ( ( y2 - y1 ) / ( x2 - x1 ) )
                var a = ( ey - by ) / ( ex - bx );
                var b = by - bx * a;
                // y = ax + b; x = ( y - b ) / a
                if( by <= top ) {
                    topout++;
					by = top;
                } else if( by >= bottom ) {
                    bottomout++;
                    by = bottom;
                }
                bx = Math.round(( by - b ) / a);
                if( ey <= top ) {
                    topout++;
					ey = top;
                } else if( ey >= bottom ) {
                    bottomout++;
                    ey = bottom;
				}
                ex = Math.round(( ey - b ) / a);
                if( (topout > 1) || (bottomout > 1) ) {
                    continue;
                }
 
                if( i == selectedline ) {
						this.octx.fillStyle = this.cs.trendline;
                        switch( bem ) {
                        case 1:
						    this.octx.fillRect( bx-2, by - 2, 4, 4 );
							break;
                        case 2:
                            this.octx.lineWidth++;
                            linesizechange = true;
                            break;
                        case 3:
							this.octx.fillRect( ex-2, ey - 2, 4, 4 );
							break;
                        default:
                    }
				}
                this.octx.beginPath();
                this.octx.moveTo( bx, by );
                this.octx.lineTo( ex, ey );
                this.octx.stroke();
                if( linesizechange ) {
                    this.octx.lineWidth--;
				}
                //******Artanisz Changes**///
            }


            //******Artanisz Changes**///

            // Draw horizontal lines
            for(var i = 0; i < this.horizontallines.length; i++) {

                if( (selectedline == i) && (bem == 4) ) {
                    this.octx.fillStyle = this.horizontallines[i][1];
                    this.octx.fillRect((this.loffset+this.plotwidth)/2-2,
					    this.horizontallines[i][0]-2, 4, 4);
                }

                _drawline(this.octx, this.loffset, this.horizontallines[i][0] ,
						  this.loffset+this.plotwidth, this.horizontallines[i][0],
						  this.horizontallines[i][1], 2, {dash: this.cs.extremeDash });

                if( check_textRenderContext(this.octx) ) {
                    this.octx.strokeStyle = this.horizontallines[i][1];
                    //deepq
                    //this.octx.strokeText(this.horizontallines[i][2], 0, this.horizontallines[i][0]+3,
                    //    6, 200, 100, 100, 'sans-serif');

                    /*if (this.horizontallines[i][4]) {
                        console.log('draw rect',this.horizontallines[i]);
                        this.ctx.fillStyle = "green";
                        this.octx.fillRect(this.horizontallines[i][2]-4,
                            this.loffset+this.plotwidth-20,
                            this.horizontallines[i][2]+4,
                            this.loffset+this.plotwidth+20
                        );
                    }*/
                    //console.log(this.octx.font);
/*
                    this.octx.strokeText(this.horizontallines[i][2],
                        this.loffset+this.plotwidth - 40,
                        this.horizontallines[i][0]+4, 8);
*/
                    //deepq - generate text via canvas
                    _drawText(this.octx, this.horizontallines[i][2],
                        this.loffset+this.plotwidth - 42,
                        this.horizontallines[i][0]+14, 8, this.cs.extremeFont, this.horizontallines[i][1]);
                }

                //fill extremes ranges
                if (this.extremeRanges[this.horizontallines[i][4]]) {
                    this.drawRange(this.octx, this.horizontallines[i][0], this.cs.extremeRangeColor, this.horizontallines[i][4]);
                }
            }

			// Draw vertical lines
            for(var i = 0; i < this.verticallines.length; i++) {
                if( (selectedline == i) && (bem == 5) ) {
                    this.octx.fillStyle = this.verticallines[i][1];
                    this.octx.fillRect(this.verticallines[i][0]-2, 
					    this._scaledY((this.tmargin+this.plotht)/2)-2, 4, 4);
				}
                _drawline(this.octx, this.verticallines[i][0], this._scaledY( this.tmargin ), 
				          this.verticallines[i][0], this._scaledY(this.tmargin+this.plotht), 
						  this.verticallines[i][1]);
                if( check_textRenderContext(this.octx) ) {
                    this.octx.strokeStyle = this.verticallines[i][1];

                    //deepq
                    /*this.octx.strokeText(this.verticallines[i][2],
					   this.verticallines[i][0]-0.90*this.octx.measureText(this.verticallines[i][2]).width, 
					   this._scaledY((this.tmargin+this.plotht)/2),
					   6, 200, 100, 100, 'sans-serif');*/

                    this.octx.strokeText(this.verticallines[i][2],
                        this.verticallines[i][0]-0.90*this.octx.measureText(this.verticallines[i][2]).width,
                        this._scaledY((this.tmargin+this.plotht)/2), 6);
				}
			}
            // Draw Fibonacci
            for( var i in this.fibonacci ) {
                this._drawFibonacci( i );
			}
            // Draw percent movement
            for( var i in this.percentmovement ) {
                this._drawPercent( i );
            }
            //******Artanisz Changes**///
        },

        drawRange: function (ctx, y, color, type) {
            var prev_fill = this.octx.fillStyle;
            ctx.fillStyle = color;
            ctx.globalAlpha = this.cs.extremeRangeTransparency;

            if (type === 'upperExtreme') {
                ctx.fillRect(this.loffset, y, this.loffset + this.plotwidth, -1000);
            }

            if (type === 'lowerExtreme') {
                ctx.fillRect(this.loffset, y, this.loffset + this.plotwidth,
                    (this._scaledY( this.tmargin + this.plotht ) - y));
            }

            if (type === 'upperPrice' || type === 'lowerPrice') {
                ctx.fillRect(this.loffset, y, this.loffset + this.plotwidth,
                    - (y - this.currentPrice));
            }

            if (type === 'upper') {
                ctx.fillRect(this.loffset, this.currentPrice, this.loffset + this.plotwidth, -1000);
            }

            if (type === 'lower') {
                ctx.fillRect(this.loffset, this.currentPrice, this.loffset + this.plotwidth,
                    (this._scaledY( this.tmargin + this.plotht ) - this.currentPrice));
            }

            ctx.fillStyle = prev_fill;
            ctx.globalAlpha = 1;
        },


        _initPlotCanvas: function() {
            // First determine the width and height. width won't change
            this.width = this.loffset + this.rmargin + this.plotwidth;
            //******Artanisz Changes**///
            this.oldheight = this.topmargin + this.plotht + this.bmargin;
            for(var i in this.current.indicators ) {
                this.oldheight += this.current.indicators[i].height;
            }
            if( this.showvolume ) {
                this.oldheight += this.loweriht; 
            }
            // this.height is set externally by using the method setSize()
            // this.height = this.topmargin + this.plotht + this.bmargin;
            //******Artanisz Changes**///
 
            if(this.canvas) { 
                // A canvas already exists, we probably need to resize the
                // canvas
                this.canvas.height = this.height;
                this.canvas.width = this.width;
                this.overlay.height = this.height;
                this.overlay.width = this.width;
            } else { // first time call to us
                this.canvas = _getCanvas(this.width, this.height);
                if (!this.canvas) { 
                    throw "Cannot Initialize canvas";
                } 
                this.canvas.plot = this;
                this.target.appendChild(this.canvas);
            
                this.overlay = _getCanvas(this.width, this.height);
                if (!this.overlay) {
                    throw "Cannot Initialize overlay";
                } 
                this.overlay.style.position  = 'absolute';
                // FIXME: Check if the code below is correct 
                //this.overlay.style.left  = this._ElemPageOffsetX(this.canvas) + 'px';
                //this.overlay.style.top  =  this._ElemPageOffsetY(this.canvas) + 'px';
                this.overlay.style.left = '0';
                this.overlay.style.top = '0';
                this.overlay.plot = this;
                this.overlay.tabIndex = 0;
                this.target.appendChild(this.overlay);
                this.removeELs().addELs();
            }

            // following we've to do everytime. 
            this.ctx = this.canvas.getContext("2d");
            this.ctx.fillStyle = this.cs.background;
            this.ctx.fillRect(0,0,this.width,this.height);
            this.octx = this.overlay.getContext("2d");

            //this.ctx.translate(0.5,0.5);
            this.octx.translate(0.5,0.5); //antialias
            // We add copyright notice even before we've any data. lame.... :-)

            return this;
        },

        // Functions for adding and deleting indicators. We do some of our own validations
		//******Artanisz Changes**///
        // Alias
        addIndicator: function(type, params, color, thickness) {
            this.addindicator(type, params, color, thickness);
        },
        addindicator: function(type, params, color, thickness, uniqId) {
            color = (color === '') ? undefined : color;
            // We don't assume that client has validated params. It's better to validate again
            if (!validParams(type, params)) return false;
            if(this.supported.indexOf(type) == -1) { 
                return false;
            }
            // max number of indicators we support .. 
            // Note: No more than 3 overlay indicators view well on the iPhone in a portrait mode
            if (this.cp.numoverlays >= this.cs.maxIndicators) {
                return false;
            } 
            if (!this.current) { 
                return false;
            } 
            this.redrawoverlays = true;
            this.redrawindicators = true;
            // Some indicator specific checks go here . 
            switch(type) {
            case 'smp':
                var coef = params[0];
                this.smp(this.current.ohlc, coef, color, thickness, uniqId);
                break;
            case 'ema': 
            case 'sma': 
                var period = parseInt(params[1]);
                var which = params[0];

                if(type == 'ema') {
                    this.ema(this.current.ohlc, period, which, color, thickness, uniqId);
                } else {
                    this.sma(this.current.ohlc, period, which, color, thickness, uniqId);
                }
                break;

            case 'psar':
                var af = parseFloat(params[0]);
                var maxaf = parseFloat(params[1]);
                if (maxaf < af) {
                    af = parseFloat(params[1]);
                    maxaf = parseFloat(params[0]);
                }
                if (maxaf > 0.5) { // user doesn't know what he's doing. We enforce! 'bad' but can't think of a better way..
                    // 0.5 is our upper limit for maxaf
                    maxaf = 0.5
                }
                this.psar(this.current.ohlc,af,maxaf, color, thickness, uniqId);
                break;
            case 'bbands':
                var period = parseInt(params[0]);
                var mult = parseFloat(params[1]);

                if (mult > 2.0) { // user doesn't know what he's doing, we enforce for now. 
                    mult = 2.0;
                } 
                this.bbands(this.current.ohlc, period, mult, color, thickness, uniqId);
                break;
			case 'alligator':
				this.alligator(this.current.ohlc, color, thickness, uniqId);
				break;
            case 'envelopes':
                var p1 = parseInt(params[0]);
                var p2 = parseFloat(params[1]);
                this.envelopes( this.current.ohlc, p1, p2, color, thickness, uniqId);
				break;
            case 'macd': 
                var p1 = parseInt(params[0])
                var p2 = parseInt(params[1])
                var signal = parseInt(params[2])
        
                if(p1 > p2) { 
                    p1 = p2; 
                    p2 = parseInt(params[0]);
                }
                this.macd(this.current.ohlc, p1, p2, signal, color, thickness, uniqId);
                break;
            case 'osma':
                var p1 = parseInt(params[0])
                var p2 = parseInt(params[1])
                var signal = parseInt(params[2])
 
                if(p1 > p2) { 
                    p1 = p2; 
                    p2 = parseInt(params[0]);
                }
                this.osma(this.current.ohlc, p1, p2, signal, color, thickness, uniqId);
                break;
            case 'rsi':
                var lookback = parseInt(params[0]);
				this.rsi(this.current.ohlc, lookback, color, thickness, uniqId);
                break;
            case 'stoch':
                var k = parseInt(params[0]);
                var x = parseInt(params[1]);
                var d = parseInt(params[2]);
                // FIXME : any validations? 
                this.stoch(this.current.ohlc, k, x, d, color, thickness, uniqId);
                break;
            case 'awesome':
                this.awesome(this.current.ohlc, color, thickness, uniqId);
                break;
            case 'ac':
                this.ac(this.current.ohlc, color, thickness, uniqId);
				break;
            case 'w_ad':
                this.w_ad(this.current.ohlc, color, thickness, uniqId);
                break;
			case 'atr':
                var period = parseInt(params[0]);
                this.atr(this.current.ohlc, period, color, thickness, uniqId);
                break;
            case 'cci':
                var period = parseInt(params[0]);
                this.cci(this.current.ohlc, period, color, thickness, uniqId);
                break;
            case 'momentum':
                var period = parseInt(params[0]);
                var which = params[1];
                this.momentum(this.current.ohlc, period, which, color, thickness, uniqId);
                break; 
            case 'dem':
                var period = parseInt(params[0]);
                this.dem(this.current.ohlc, period, color, thickness, uniqId);
                break; 
            case 'wpr':
                var period = parseInt(params[0]);
                this.wpr(this.current.ohlc, period, color, thickness, uniqId);
                break; 
            default: 
                break;
            } 
        },
        //******Artanisz Changes**///

        delindicator: function(which) {
            if(which in this.current.overlays) {

                //deepq - delete div with this indicator
                var overlayDom = document.getElementById("overlays");
                var curOvr = overlayDom.querySelectorAll('[data-id="' + this.current.overlays[which].uniqId + '"]')[0];

                if (curOvr) {
                    curOvr.parentElement.removeChild(curOvr);
                } else {
                    console.log('element not found: ', curOvr);
                }

                delete this.current.overlays[which];
                this.cp.numoverlays -= 1; 
                //******Artanisz Changes**///
                // plot should be done manually
                // this.plot();
                this.redrawoverlays = true;
                //******Artanisz Changes**///
                return;
            }

            for(var j in this.current.indicators) { 
                if (which == this.current.indicators[j].str) {
                    //******Artanisz Changes**///
                    // delete this.current.indicators[j];
                    //deepq - delete div with this indicator
                    var indicatorDom = document.getElementById("indicators"),
                        curInd = indicatorDom.querySelectorAll('[data-id="' + this.current.indicators[j].uniqId + '"]');

                    if (curInd) {
                        [].forEach.call(curInd, function (node) {
                            node.parentElement.removeChild(node)
                        });
                    } else {
                        console.log('element not found: ', curInd);
                    }

                    this.current.indicators.splice(j, 1);
                    this.cp.numindicators -= 1; 
                    this.redrawindicators = true;
                    //******Artanisz Changes**///

                    return;
                } 
            } 
        },  
        //******Artanisz Changes**///
        // Modifies the color and thicknes of the indicator
		modifyIndicator: function( which, color, thickness ) {
            if(which in this.current.overlays) {
                if( color ) {
                    this.current.overlays[which].color = color;
				}
                if( thickness ) {
                    this.current.overlays[which].thickness = thickness;
                }
                this.redrawoverlays = true;
                this.redrawoverlays = true;
            }
            for(var j in this.current.indicators) { 
                if (which == this.current.indicators[j].str) { 
                    if( color ) {
                        this.current.indicators[j].color = color;
                    }
                    if( thickness ) {
                        this.current.indicators[j].thickness = thickness;
                    }
                    this.redrawindicators = true;
					break;
                } 
            } 
        },
	    /* Returns the index of the indicator in the array this.current.indicators
         * The index will be used for faster access to indicators, e.g.
         * when we want to change indicator's height many times
         */
         _getNonOverlayIndicatorIndex: function( which ) {
			var len = this.current.indicators.length;
            for(var i = 0; i < len; i++) { 
                if (which == this.current.indicators[i].str) { 
                    return i;
				}  
			}
            // Indicator not found
            return -1;
		},
        _setIndicatorHeight: function( indicatorIndex, height ) {
		    if( indicatorIndex < 0 ) return;
            if( indicatorIndex >= this.current.indicators.length ) return;
			this.current.indicators[indicatorIndex].height = height;
		},
        /*
         * Determines which indicator window the user wanted to resize.
         * Returns the index of the indicator in this.current.indicators 
         * or -1 if no indicator was selected
         */
		whichIndicator: function( y ) {
            var num = this.current.indicators.length;
            var t = this._scaledY( this.topmargin + this.plotht + this.vspacing );
            for( var i = 0; i < num; i++ ) {
                if( Math.abs( t - y ) < 5 ) {
                    return i;
                }
			    t += this._scaledY( this.current.indicators[i].height ); 
            }
            return -1;
		},
        /* Moves the border of the indicator so that its height changes
		 * So does the height of the element above the indicator 
         * ( that is another indicator or the main chart )
         */
        _moveIndicatorBorder: function( indicatorIndex, offset ) {
            if( offset == 0 ) return;
            if( indicatorIndex < 0 ) return;
            var last = this.current.indicators.length - 1;
            if( indicatorIndex > last ) return;
            // Note: Indicators are drawn in the reverse way
			if( indicatorIndex > 0 ) {
                // The height of an index should not be less than 20
                if( (this.current.indicators[indicatorIndex-1].height - offset) < 60 ) {
                    var totalheight = this.current.indicators[indicatorIndex-1].height +
                        this.current.indicators[indicatorIndex].height;
					this.current.indicators[indicatorIndex-1].height = 60;
                    this.current.indicators[indicatorIndex].height = totalheight - 60;
                    return;
                } else if( (this.current.indicators[indicatorIndex].height + offset) < 60 ) {
                    // offset is negative
                    var totalheight = this.current.indicators[indicatorIndex].height +
                        this.current.indicators[indicatorIndex-1].height;
					this.current.indicators[indicatorIndex].height = 60;
                    this.current.indicators[indicatorIndex-1].height = totalheight - 60;
                    return;
                }
                this.current.indicators[indicatorIndex-1].height -= offset;
                this.current.indicators[indicatorIndex].height += offset;
            } else { // indicatorIndex == 0
                if( (this.plotht - offset) < 60 ) {
                    var totalheight = this.current.indicators[0].height + this.plotht;
                    this.plotht = 60;
                    this.current.indicators[0].height = totalheight - 60;
                    return;
                } else if( (this.current.indicators[0].height + offset) < 60 ) {
                    var totalheight = this.current.indicators[0].height + this.plotht;
					this.current.indicators[0].height = 60;
                    this.plotht = totalheight - 60;
					return;
                }
                this.current.indicators[0].height += offset;
                this.plotht -= offset;
            }
        },
        // After the last candle has been updated, the indicators must be updated
        _updateindicators: function() {
            // Overlay indicators are ema, sma, psar and bbands
            // non-overlay indicators are macd, rsi and stoch
            var indicators = this.current.indicators;
            for( var j in indicators ) {
                switch( indicators[j].type ) {
                    case 'macd': 
                        this.macd( this.current.ohlc, indicators[j].fp, indicators[j].sp, indicators[j].tp, indicators[j].color, indicators[j].thickness, indicators[j].uniqId);
                        break;
                    case 'rsi':
                        this.rsi( this.current.ohlc, indicators[j].fp, indicators[j].color, indicators[j].thickness, indicators[j].uniqId);
                        break;
                    case 'stoch':
                        this.stoch( this.current.ohlc, indicators[j].fp, indicators[j].sp, indicators[j].tp, indicators[j].color, indicators[j].thickness, indicators[j].uniqId);
                        break;
                    case 'awesome':
                        this.awesome( this.current.ohlc, indicators[j].color, indicators[j].thickness, indicators[j].uniqId);
                        break;
                    case 'ac':
                        this.ac( this.current.ohlc, indicators[j].color, indicators[j].thickness, indicators[j].uniqId);
                        break;
                    case 'w_ad':
                        this.w_ad( this.current.ohlc, indicators[j].color, indicators[j].thickness, indicators[j].uniqId);
                        break;
                    case 'atr':
                        this.atr( this.current.ohlc, indicators[j].fp, indicators[j].color, indicators[j].thickness, indicators[j].uniqId);
                        break;
                    case 'cci':
                        this.cci( this.current.ohlc, indicators[j].fp, indicators[j].color, indicators[j].thickness, indicators[j].uniqId);
                        break;
                    case 'momentum':
                        this.momentum( this.current.ohlc, indicators[j].fp, indicators[j].which, indicators[j].color, indicators[j].thickness, indicators[j].uniqId);
                        break;
                    case 'osma':
                        this.osma( this.current.ohlc, indicators[j].fp, indicators[j].sp, indicators[j].tp, indicators[j].color, indicators[j].thickness, indicators[j].uniqId);
                        break;
                    case 'dem':
                        this.dem( this.current.ohlc, indicators[j].fp, indicators[j].color, indicators[j].thickness, indicators[j].uniqId);
                        break;
                    case 'wpr':
                        this.wpr( this.current.ohlc, indicators[j].fp, indicators[j].color, indicators[j].thickness, indicators[j].uniqId);
                        break;
                    default:
                        // Skip
                }
            }
            indicators = this.current.overlays;
            for( j in indicators ) {
                switch( indicators[j].type ) {
                    case 'ema': 
                        this.ema( this.current.ohlc, indicators[j].fp, indicators[j].sp, indicators[j].color, indicators[j].thickness, indicators[j].uniqId );
                        break;
                    case 'sma': 
                        this.sma( this.current.ohlc, indicators[j].fp, indicators[j].sp, indicators[j].color, indicators[j].thickness, indicators[j].uniqId );
                        break;
                    case 'psar':
                        this.psar( this.current.ohlc, indicators[j].fp, indicators[j].sp, indicators[j].color, indicators[j].thickness, indicators[j].uniqId );
                        break;
                    case 'bbands':
                        this.bbands( this.current.ohlc, indicators[j].fp, indicators[j].sp, indicators[j].color, indicators[j].thickness, indicators[j].uniqId );
                        break;
                    case 'alligator':
                        this.alligator( this.current.ohlc, indicators[j].color, indicators[j].thickness, indicators[j].uniqId );
                        break;
                    case 'envelopes':
                        this.envelopes( this.current.ohlc, indicators[j].fp, indicators[j].sp, indicators[j].color, indicators[j].thickness, indicators[j].uniqId );
                        break;
                    case 'smp':
                        this.smp( this.current.ohlc, indicators[j].coef, indicators[j].color, indicators[j].thickness, indicators[j].uniqId );
                        break;
                    default: 
                        // Skip
                }
            }
        },
        //******Artanisz Changes**///
        // sends the list of current indicators to the caller. Used in UI to Delete any indicators if not wanted
        getindicators: function() {
            var ilist = [];
            if(!this.current) { 
                return ilist;
            } 
            for(var j in this.current.overlays) { 
                ilist.push(j);
            } 
            for(var j in this.current.indicators) { 
                ilist.push(this.current.indicators[j].str);
            } 
            return ilist;
        }, 
        // removes all the event listners on the overlay. 
        removeELs: function() {
            var o = this.overlay;
            
            //bruteforce... remove everything
            o.removeEventListener('keyup', _keyActions, false);
            o.removeEventListener('mousedown', _beginTrendLine, false); 
			o.removeEventListener('mousemove', _drawTrendLine, false);
            o.removeEventListener('mouseup', _endTrendLine, false); 
            o.removeEventListener('mousedown', _beginPanning, false); 
            o.removeEventListener('mousemove', _doPanning, false);
            o.removeEventListener('mouseup', _endPanning, false);
			o.removeEventListener('mousedown', _moveCrosshair, false); 
			o.removeEventListener('mousemove', _moveCrosshair, false);
            //******Artanisz Changes**///
            o.removeEventListener('touchstart', _beginTrendLine, false); 
            o.removeEventListener('touchmove', _drawTrendLine, false);
            o.removeEventListener('touchend', _endTrendLine, false); 
            o.removeEventListener('touchstart', _beginPanning, false); 
            o.removeEventListener('touchmove', _doPanning, false);
            o.removeEventListener('touchend', _endPanning, false); 
            o.removeEventListener('gesturechange', _touchzoom, false); 
            o.removeEventListener('touchstart', _moveCrosshair, false); 
            o.removeEventListener('touchmove', _moveCrosshair, false);
            o.removeEventListener('mousewheel', _mouseWheelZoom, false);
            o.removeEventListener('DOMMouseScroll', _mouseWheelZoom, false);

            //******Artanisz Changes**///
            
            // returns self to the caller to allow chaining
            return this; 

        },

        addELs: function() { 
            //******Artanisz Changes**///
            if (!this.mode) { 
                this.overlay.addEventListener('mousedown', _beginTrendLine, false); 
                this.overlay.addEventListener('mousemove', _drawTrendLine, false);
                this.overlay.addEventListener('mouseup', _endTrendLine, false); 
                this.overlay.addEventListener('touchstart', _beginTrendLine, false);
                this.overlay.addEventListener('touchmove', _drawTrendLine, false);
                this.overlay.addEventListener('touchend', _endTrendLine, false);
            } else if( this.mode == 1) { // Pan mode 
                this.overlay.addEventListener('mousedown', _beginPanning, false); 
                this.overlay.addEventListener('mousemove', _doPanning, false);
                this.overlay.addEventListener('mouseup', _endPanning, false); 
                this.overlay.addEventListener('touchstart', _beginPanning, false);
                this.overlay.addEventListener('touchmove', _doPanning, false);
                this.overlay.addEventListener('touchend', _endPanning, false); 
                this.overlay.addEventListener('gesturechange', _touchzoom, false);
                //yuri
                this.overlay.addEventListener('mousedown', _moveCrosshair, false);
                this.overlay.addEventListener('mousemove', _moveCrosshair, false);
                this.overlay.addEventListener('touchstart', _moveCrosshair, false);
                this.overlay.addEventListener('touchmove', _moveCrosshair, false);
                this.overlay.addEventListener('mousewheel', _mouseWheelZoom, false);
                this.overlay.addEventListener('DOMMouseScroll', _mouseWheelZoom, false);
            } else if( this.mode == 2) {
                this.overlay.addEventListener('mousedown', _moveCrosshair, false); 
                this.overlay.addEventListener('mousemove', _moveCrosshair, false);
                this.overlay.addEventListener('touchstart', _moveCrosshair, false);
				this.overlay.addEventListener('touchmove', _moveCrosshair, false);
            }
			//******Artanisz Changes**///
            this.overlay.addEventListener('keyup', _keyActions, false);
            return this.overlay;

        },

        changemode: function(mode) { 
            mode = parseInt(mode);
            if (isNaN(mode)) { 
                return false;
            } 
            //******Artanisz Changes**///
            if(mode && mode != 1 && mode != 2) { 
                return false;
            } 
            //******Artanisz Changes**///
            if(this.mode === mode) { 
                return false; // don't do anything if mode is same 
            }
            this.mode = mode;
            this.removeELs().addELs(); 
            //******Artanisz Changes**///
            // this.lines = [], this.undolines = [];
            // this.plot();
            // this.drawlines();
            //******Artanisz Changes**///
        }, 
        plot: function() {
            /*
             * first try to plot the data
             */
            this._initPlotCanvas();
            this._doplot(this.ctx, this.current);
            //******Artanisz Changes**///
            // if (!this.mode) { 
		    // this.drawlines();
            // } 
            //******Artanisz Changes**///
        },
        //******Artanisz Changes**///
        // Phase 1: Initial plot
        initDataGraph: function(data, done, indicators) {
            this.cp = { numindicators : 0};
			// cp.type is candles
            this.cp.type = 1;
            this.cp.minwidth = 7;
            this.cp.logscale = false;
            this.cp.autoscale = false;
            this.cp.numoverlays = 0;
            this.cp.numindicators = 0;
            this.cp.maxxlabels = 7;
            this.cp.maxylabels = 5;
  
            //this.cs = window.tickp.csdark;
 
            if( data.length > 0 ) {
                this.initWithData( data );
            } else {
			    this.initWithNoData();
			}
 
            var numInds = indicators.length;
			for(var i=0; i<numInds; i++) {
                this.addindicator(indicators[i][0], indicators[i][1]);
            }
 
            this._initLabels();
            // plot should be called separately
        },
        //******Artanisz Changes**///
        plotempty: function() { 
            this.cp = { numindicators : 0};
            this._initPlotCanvas();
            this._drawText("Loading....", 100, 100, {font: '20pt Arial'});
        
        }, 
        /* low level plot function. Should not be used directly. */
        /* Since this is a plotting function, we don't do any calculation 
            inside this function. We assume, all data is with us
            ctx : the context on which to plot.
            dataset : complete dataset - OHLC plus overlays plus lower 
                      indicators if any 
            shift : if present, specifies , shift relative to last plot, for
                    the first plot, makes no sense, used in pan mode. 
        */
        _doplot : function(ctx, dataset, shift) {
            var cs = this.cs;
            var cp = this.cp;

            var data = dataset.ohlc;
            var vol = dataset.vol;
            var overlays = dataset.overlays;
            var indicators =dataset.indicators;
            /* let's clear ourselves before we start plotting anything */
            this._clear(ctx);

            var ob = this._window(data, overlays, shift);
            //console.log(ob);
            var xmin = ob.xmin,
                ymin = ob.ymin,
                xmax = ob.xmax,
                ymax = ob.ymax;
            //console.log('xmin',xmin,'ymin',ymin,'xmax',xmax,'ymax',ymax);
            // We get top, bottom, right, left of the plot and draw a bounding 
            // rectangle 
            var _top = this.topmargin,
                _left = this.loffset,
                _right = _left + this.plotwidth,
                _bottom = _top + this.plotht;
            var h = _bottom;

            // If the scale is log scale, we use, Math.log and Math.exp or else
            // we use identity function.
            // Max candles we'd be plotting would not be more than hundred or
            // so, hence calculating log and exp is not as expensive as it may
            // appear than doing it for entire data. 
            var _log = (cp.logscale ? Math.log : function(x) {return x});
            var _exp = (cp.logscale ? Math.exp : function(x) {return x}); 
            var c = Math.round(cp.cwidth/2); // center of first (and every) cdl

            //******Artanisz Changes**///
            var csize = Math.round(cp.cwidth/1.4);

            //******Artanisz Changes**///

            // the following variables are needed for plotting volume.
            var vt = this.topmargin + this.plotht + this.vspacing;
            var vb = vt + this.liplotht + this.limargin;
            var vl = this.loffset;
            var vr = this.loffset + this.plotwidth;
            var vymax = _minmax1d(vol.slice(xmin,xmax))[1] * 1.1;
            var vymin = 0; 
            var vrange = vymax - vymin;
            var vscale = this.liplotht/vrange;
            var vh = vb;
            ctx.strokeStyle = this.cs.stroke;
            //******Artanisz Changes**///
            if( this.showvolume ) {
                ctx.strokeRect(vl, this._scaledY(vt), this.plotwidth, this._scaledY(this.liplotht + this.limargin));
            }
            //******Artanisz Changes**///
            //var range = ymax - ymin;

            var range = ymax - ymin;
            var scale = this.plotht/range; // scale: how much a unit takes on the plot
            //console.log('scale:', scale,  'height:',this.plotht,'range:',range);

            var prevxy = []; // used for drawing line to last point
 
            //******Artanisz Changes**///
            /* and X and Y axis  FIXME:  get it right */ 
            // Make sure that exactly 15 lines are drawn

            //var ystops = this._ygrid(_exp(ymin), _exp(ymax), 6);
            var ystops = this._ygridPerc(_exp(ymin), _exp(ymax), this.cs.maxYlines);

            var textElement = this.target.childNodes[this.labels['yGrid']];
            var counter = 0;
            for(var i in ystops) {
                var logystp = _log(ystops[i]);
                var y1 = Math.round((logystp - cp.ymin)*scale);
				_drawline(ctx, _left, this._scaledY(h-y1), _right, this._scaledY(h-y1), cs.gridlines);
				label = "" +ystops[i].toFixed(this.digitsafterdecimal);
                // Deprecated
				// this._drawText(label, _right, this._scaledY(h - y1), {align:'left', padding:5});

                this._addLabelToElement( textElement, counter, label , _right + 8,
				    this.target.offsetTop + this._scaledY( h-y1 ) - 7);
                counter++;
            };
            //console.log(counter);
			if( counter > 0 )
                this._hideRedundantElements( textElement, counter );
 
            var howmany = xmax-xmin;
            var xstop = Math.floor(howmany/cp.maxxlabels);
            //console.log(xmax,xmin,howmany, xstop, cp.maxxlabels, xmin%xstop);

			//******Artanisz Changes**///
            var vlh = h;
            for( var i in this.current.indicators ) {
                vlh += this.current.indicators[i].height;
            }
            if( this.showvolume ) {
                vlh += this.loweriht;
            }
            var lastlabelrightmost = 0;
            textElement = this.target.childNodes[this.labels['xGrid']];
            counter = 0;
            //******Artanisz Changes**///
            for(var i = xmin; i < xmax; i++) { 
                if(i%xstop == 0) {
                    //******Artanisz Changes**///
                    var label = this._idxToTime(i);
                    var labeloffset = 16;
                    if( label == "00:00" ) {
                        label = this._idxToDate(i);
                        labeloffset = 16;
                    }
                    //console.log(i,label);
                    var drawlabel = true;
                    //******Artanisz Changes**///
                    // var xlo = (c + (i-xmin)*cp.cwidth) - csize + this.loffset;
					var xlo = (c + (i-xmin)*cp.cwidth) - Math.round(csize/4) + this.loffset;
                    //******Artanisz Changes**///
                    var xline = xlo + Math.round(csize/2);
                    //console.log('xline:',xline,'labeloffset:',labeloffset);
                    if( (xline - labeloffset) <= lastlabelrightmost ) {
                       drawlabel = false;
                    }
                    //******Artanisz Changes**///
                    //console.log('xlo',xlo,'loffset',this.loffset);
                    //yuri
                    if(xlo > this.loffset) {
                        _drawline(ctx, xline, this._scaledY(vlh) , xline, this._scaledY(this.topmargin), cs.gridlines);
                        //******Artanisz Changes**///
                        // Deprecated
                        // ctx.strokeStyle = cs.label;
                        // if( check_textRenderContext(this.ctx) && drawlabel ) {
						//	ctx.strokeText(label, xline-labeloffset, this._scaledY(vlh + this.vspacing + 10)-6,
						//		7, 200, 100, 100, 'sans-serif');
						//	lastlabelrightmost = xline-labeloffset + Math.round( this.ctx.measureText(label).width);
                        // }
                        if( drawlabel ) {
                            this._addLabelToElement( textElement, counter, label , xline-labeloffset + 2,
						        this.target.offsetTop + this._scaledY(vlh + this.vspacing + 10)-8);
                            lastlabelrightmost = xline-labeloffset + Math.round( this.ctx.measureText(label).width);
                        } else {
                            //console.log('textElement: ', textElement);
                            if (textElement.childNodes.length > 0) textElement.childNodes[counter].style.visibility = 'hidden';
                        }
                        counter++;
                        //******Artanisz Changes**///
                    }
                } 
            } 
            //******Artanisz Changes**///
            if( counter > 0 )
                this._hideRedundantElements( textElement, counter );
  
            oldStrokeStyle = ctx.strokeStyle;
            oldLineWidth = ctx.lineWidth;
            ctx.strokeStyle = this.candlebordercolor;
            ctx.lineWidth = this.candlebordersize;

			//******Artanisz Changes**///
            //console.log('scale orig', scale);
            for(var i = xmin; i < xmax; i++) {
                var yop = Math.round((_log(data[i][0]) - cp.ymin) * scale);
                var yhi = Math.round((_log(data[i][1]) - cp.ymin) * scale);
                var ylo = Math.round((_log(data[i][2]) - cp.ymin) * scale);
                var ycl = Math.round((_log(data[i][3]) - cp.ymin) * scale);
                
                //******Artanisz Changes**///
                var xlo = (c + (i-xmin)*cp.cwidth) - Math.round(csize/4) + this.loffset;
                //******Artanisz Changes**///
                var xline = xlo + Math.round(csize/2);

                /* invert colors if Open > Close */
                // FIXME : Fix for Opera.. Doesn't like negative width/height
                // FIXME : check if it works
                if (yop > ycl) {
                    ctx.fillStyle = cs.rcandle;
                } else {
                    ctx.fillStyle = cs.gcandle;
                    var t = ycl; ycl = yop; yop = t; 
                }
                if(cp.type == 1) {  // candle-stick
					//******Artanisz Changes**///
					_drawline(ctx,xline, this._scaledY(h-yhi), xline, this._scaledY(h-ylo),
                        ctx.fillStyle,
                        this.candlebordersize);
                    ctx.fillRect( xlo, this._scaledY(h-yop), csize, this._scaledY(yop-ycl));

                    //ctx.strokeRect( xlo, this._scaledY(h-yop), csize, this._scaledY(yop-ycl) ); //yuri

                    if(!(yop-ycl)) {
                        ctx.fillRect( xlo, this._scaledY(h-yop), csize, 1);
                        //ctx.strokeRect( xlo, this._scaledY(h-yop), csize, 1 ); //yuri
                    } 
                    // _drawline(ctx,xline, this._scaledY(h-yhi), xline, this._scaledY(h-ylo), ctx.fillStyle, 1);
                    //******Artanisz Changes**///
                } else if( cp.type == 2) { // OHLC 
                    _drawline(ctx,xline, this._scaledY(h-yhi), xline, this._scaledY(h-ylo), ctx.fillStyle, 2);
                    _drawline(ctx, xlo, this._scaledY(h-yop), xline, this._scaledY(h-yop), ctx.fillStyle, 2);
                    _drawline(ctx, xline, this._scaledY(h-ycl), xlo+csize, this._scaledY(h-ycl), ctx.fillStyle, 2);
                } else {  
                    if ( i-xmin > 0) { /* skip first line */
                        _drawline(ctx,prevxy[0], this._scaledY(prevxy[1]), xline, this._scaledY(h-ycl), cs.stroke, 3);
                    } 
                    prevxy = [xline, h-ycl];
                }
                /* try plotting the volume */ 
                if( this.showvolume ) {
                    if(vol[i]) { 
                        var yvol = vol[i] * vscale;
                        // FIXME : Fix for opera, check if it works 
                        ctx.fillRect( xlo, this._scaledY(vh-yvol), csize, this._scaledY(yvol));
                    } 
                }
            }
            //******Artanisz Changes**///
            ctx.strokeStyle = oldStrokeStyle;
            ctx.lineWidth = oldLineWidth;
 
            // Main window outline
            ctx.strokeStyle = this.cs.stroke;
			ctx.strokeRect(_left, this._scaledY(_top), this.plotwidth, this._scaledY(this.plotht));
			this.drawlines();
			this.drawTextFields();
            //******Artanisz Changes**///

            /* plot any overlay indicators */
            var k = 0; 
            for (var o in overlays) {
                
                // TODO: evaluate, whether it makes sense to have separate 
                // functions for each of the overlays. Right now this looks ok. 
                var prevxy = [];
                var o1 = overlays[o].data;
                for(var j = xmin; j < xmax; j++) {
                    var i = j  - xmin;
                    var ycl = Math.round((_log(o1[j])-ymin)*scale);
                    if (!o.search('psar')) { //overlay name begins with psar.. this is our
                        //******Artanisz Changes**///
                        overlays[o].offset = k;
                        var pwidth = Math.round(cp.minwidth/8);
                        var xlo = (c + i*cp.cwidth) - 2*pwidth + Math.round((3*csize)/4) + this.loffset;
                        ctx.fillStyle = overlays[o].color;
						//******Artanisz Changes**///
                        //FIXME: Fix for opera, check 
                        ctx.fillRect(xlo, this._scaledY(h-ycl-2*pwidth), 2*pwidth, this._scaledY(2*pwidth));
                    } else if(!o.search('bbands')) { 
                        //******Artanisz Changes**///
                        overlays[o].offset = k;
                        //******Artanisz Changes**///
                        if (!o1[j][0]) { 
                            continue;
                        }
                        //******Artanisz Changes**///
                        var xlo = (c + i*cp.cwidth) - Math.round(csize/4) + this.loffset;
                        //******Artanisz Changes**///
                        var xline = xlo + Math.round(csize/2);
                        var bmax = Math.round((_log(o1[j][0])-ymin)*scale);
                        var bm = Math.round((_log(o1[j][1])-ymin)*scale);
                        var bmin = Math.round((_log(o1[j][2])-ymin)*scale);
                        if (i > 0 && prevxy[0]) { //skip first line
                            //******Artanisz Changes**///
                            _drawline(ctx,prevxy[0][0], this._scaledY(prevxy[0][1]), xline, this._scaledY(h-bmax), overlays[o].color[0], overlays[o].thickness[0]);
                            _drawline(ctx,prevxy[1][0], this._scaledY(prevxy[1][1]), xline, this._scaledY(h-bm), overlays[o].color[1], overlays[o].thickness[1]);
                            _drawline(ctx,prevxy[2][0], this._scaledY(prevxy[2][1]), xline, this._scaledY(h-bmin), overlays[o].color[2], overlays[o].thickness[2]);
                            //******Artanisz Changes**///
                        }
                        prevxy = [[xline, h - bmax], [xline, h - bm], [xline, h-bmin]];
                    } else if( !o.search('alligator') ) {
		                overlays[o].offset = k;
                        var xlo = (c + i*cp.cwidth) - Math.round(csize/4) + this.loffset;
                        var xline = xlo + Math.round(csize/2);
                        // Take lookahead offset into consideration
                        var lips = undefined;
                        var prevy;
						if( j > 2 ) {
                            if(o1[j][0]) {
                                lips = h - Math.round((_log(o1[j][0])-ymin)*scale);
								if( prevxy.length > 0 && prevxy[0][1] !== undefined ) {
                                    _drawline( ctx, prevxy[0][0], this._scaledY(prevxy[0][1]), 
									    xline, this._scaledY(lips), overlays[o].color[0], 
										overlays[o].thickness[0]);
                                }
                            }
                        }
                        var teeth = undefined;
                        if( j > 4 ) {
                            if(o1[j][1]) {
                                teeth = h - Math.round((_log(o1[j][1])-ymin)*scale);
                            if( prevxy.length > 0 && prevxy[1][1] !== undefined ) {
                                _drawline( ctx, prevxy[1][0], this._scaledY(prevxy[1][1]), 
		                            xline, this._scaledY(teeth), overlays[o].color[1], 
		                            overlays[o].thickness[1]);
                                }
							}
						}
                        var jaws = undefined;
                        if( j > 7 ) {
                            if(o1[j][2]) {
                                jaws = h - Math.round((_log(o1[j][2])-ymin)*scale);
                                if( prevxy.length > 0 && prevxy[2][1] !== undefined ) {
                                    _drawline( ctx, prevxy[2][0], this._scaledY(prevxy[2][1]), 
		                                xline, this._scaledY(jaws), overlays[o].color[2], 
		                                overlays[o].thickness[2]);
                                }
							}
                        }
                        prevxy =[[xline, lips], [xline, teeth], [xline, jaws]];
                    } else if(!o.search('envelopes')) { 
                        overlays[o].offset = k;
                        if(!o1[j][0]) { 
                            continue;
                        }
                        //console.log('scale envelopes', scale);
                        var xlo = (c + i*cp.cwidth) - Math.round(csize/4) + this.loffset;
						var xline = xlo + Math.round(csize/2);
                        var yh = Math.round((_log(o1[j][0])-ymin)*scale);
                        var yl = Math.round((_log(o1[j][1])-ymin)*scale);
                        if (i>0 && prevxy[0]) { //skip first line
                            _drawline(ctx,prevxy[0][0], this._scaledY(prevxy[0][1]), xline, this._scaledY(h-yh), overlays[o].color[0], overlays[o].thickness[0]);
                            _drawline(ctx,prevxy[1][0], this._scaledY(prevxy[1][1]), xline, this._scaledY(h-yl), overlays[o].color[1], overlays[o].thickness[1]);
                        }
                        prevxy = [[xline, h-yh], [xline, h-yl]];
                    } else {
                        //draw other overlays
                        overlays[o].offset = k;
                        if(!o1[j]) { 
                            continue;
                        }

                        //******Artanisz Changes**///
                        var xlo = (c + i*cp.cwidth) - Math.round(csize/4) + this.loffset;
                        //******Artanisz Changes**///
                        var xline = xlo + Math.round(csize/2);
                        if (i>0 && prevxy[0]) { //skip first line
                            //******Artanisz Changes**///
                            if( overlays[o].color === undefined ) {
                                overlays[o].color = cs.overlays[k%cs.overlays.length];
                            }
                            _drawline(ctx,prevxy[0], this._scaledY(prevxy[1]), xline, this._scaledY(h-ycl), overlays[o].color, overlays[o].thickness);
                            //******Artanisz Changes**///
                        }
                        prevxy = [xline, h-ycl];
                    }
                } 
                //******Artanisz Changes**///
                // Add more space for bbands
                if(!o.search('bbands')) k+= 1;
                else if(!o.search('alligator')) k+= 1;
                else if(!o.search('envelopes')) k+= 1;
                //******Artanisz Changes**///
                k += 1;
            }
            
            var volstops = []; 
            for (var i in volstops) {
                var y1 = Math.round(volstops[i] * vscale);
                label = volstops[i];
                this._drawText(label, _right, this._scaledY(vh - y1), {align:'left', padding:5});
            }

            // Labels need to be added after the lines are drawn */
            //******Artanisz Changes**///
            k = 0;
            var textElementsDrawn = 0;
            for(var j in indicators) {
                textElementsDrawn = this._plotIndicator(indicators[j], k, textElementsDrawn);
                k += indicators[j].height;
            }
            if( textElementsDrawn > 0 ) {
                this._hideRedundantElements( this.target.childNodes[this.labels['indicators']],
				    textElementsDrawn );
                this.redrawindicators = false;
            }
            this._drawCurrentValueIndicator( ob );

            /* And now let's give it a label. */
            if (this.cp.label) {

                if( this.showvolume ) {
                    this._drawText("VOLUME", vl, this._scaledY(vt+20), {align:'left', padding:5, font:'10pt Arial'});
                }
                this._drawText(this.cp.label, this.loffset - 2, this._scaledY(24)-3, {align:'left', font:'16pt Arial'});

                var ol = this.cs.overlays;
                var vals;
                var lcolor;
                var focuscandle = 0;
                if( this.mode == 2 ) {
                    focuscandle = this.focuscandle;
                } else if( data.length > 0 ) {
                    focuscandle = data.length-1;
                }

                // Draw overlay labels text over canvas way
                // In all the modes but crosshair mode, the current value of the indicators stays constant
                // There is no need to update them all the time
                // The other exception is when an overlay has been removed or added
                if( this.redrawoverlays ) {
                    textElement = this.target.childNodes[this.labels['overlays']];
                    //console.log(textElement);
				    counter = 0;
                    for (var i in overlays) {
                        vals = "";
                        var valTag =
                            "<span class='icon icon-cog indicator-setup' data-id='" + overlays[i].uniqId + "'></span>"
                        + "<span class='icon icon-close indicator-close' data-id='" + overlays[i].uniqId + "'></span>";

                        if (overlays[i].offset !== undefined) {
                            var o = overlays[i].offset;
						    if( overlays[i].data[focuscandle] instanceof Array ) {
                                if( !i.search('alligator') ) {
                                    vals = 'Alligator:';
                                    vals += '<span style="color: ' + overlays[i].color[0] + '">L:' + overlays[i].data[focuscandle][0].toFixed(this.digitsafterdecimal) + '</span>';
                                    vals += '<span style="color: ' + overlays[i].color[1] + '">T:' + overlays[i].data[focuscandle][1].toFixed(this.digitsafterdecimal) + '</span>';
                                    vals += '<span style="color: ' + overlays[i].color[2] + '">J:' + overlays[i].data[focuscandle][2].toFixed(this.digitsafterdecimal) + '</span>';
								} else if( !i.search('envelopes') ) {
                                    vals = 'ENV:';
                                    vals += '<span style="color: ' + overlays[i].color[0] + '">U:' + overlays[i].data[focuscandle][0].toFixed(this.digitsafterdecimal) + '</span>';
                                    vals += '<span style="color: ' + overlays[i].color[1] + '">L:' + overlays[i].data[focuscandle][1].toFixed(this.digitsafterdecimal) + '</span>';
                                } else {
                                    // This is bbands
                                    vals = 'BBands:';
                                    vals += '<span style="color: ' + overlays[i].color[0] + '">UB:' + overlays[i].data[focuscandle][0].toFixed(this.digitsafterdecimal) + '</span>';
                                    vals += '<span style="color: ' + overlays[i].color[1] + '">MB:' + overlays[i].data[focuscandle][1].toFixed(this.digitsafterdecimal) + '</span>';
                                    vals += '<span style="color: ' + overlays[i].color[2] + '">LB:' + overlays[i].data[focuscandle][2].toFixed(this.digitsafterdecimal) + '</span>';
                                }
                                lcolor = this.cs.indicatorTitleColor; //overlays[i].color[0];
                                vals += valTag;
						    } else if( overlays[i].data[focuscandle] != undefined ) {
                                if( !i.search('ema') ) {
                                    vals = 'EMA';
							    } else if( !i.search('sma') ) {
                                    vals = 'SMA';
                                } else if( !i.search('psar') ) {
                                    vals = 'PSAR';
                                } else if (!i.search('smp')) {
                                    vals = 'SMP';
                                }
							    vals += ": <span style='color: "
                                    + overlays[i].color + "'>"
                                    + overlays[i].data[focuscandle].toFixed(this.digitsafterdecimal)
                                    + "</span>" + valTag;
                                lcolor = this.cs.indicatorTitleColor; //overlays[i].color;
						    }

                            //add text label to indicator/overlay deepq
                            /*var elX = o * 120 + this.loffset - 1,
                                elY = this.target.offsetTop + 20 + this._scaledY(16 + this.tmargin) - 5;*/
                            var elX = this.loffset,
                                elY = o * 30 + this.target.offsetTop + this._scaledY(16 + this.tmargin) - 5;
                            this._addLabelToElement(textElement, counter, vals, elX, elY , lcolor, overlays[i].uniqId);
                            counter++;
                        } 
                    }

                    //deepq
                    //remove overlay text data
                    if (counter === 0 && textElement.childElementCount > 0) {
                        textElement.childNodes.forEach(function(node){
                           textElement.removeChild(node);
                        });
                    }

                    if( counter > 0 )
                        this._hideRedundantElements( textElement, counter );
                    this.redrawoverlays = false;
                }
            }
            //******Artanisz Changes**///


            if (this.extremeRanges.upper) {
                this.drawRange(this.ctx,0,this.cs.extremeRangeColor,'upper');
            }
            if (this.extremeRanges.lower) {
                this.drawRange(this.ctx,0,this.cs.extremeRangeColor,'lower');
            }
        },

        _clear: function(ctx) { 
            ctx.clearRect(0,0, this.width, this.height);
            ctx.fillStyle = this.cs.background;
            ctx.fillRect(0,0,this.width,this.height);
        },  
        /* 
         * We assume the data is already downloaded using probably ajax or a local copy.  We just read this data in the TA object. If there are any known indicators in the template, we fire and store those in the TA object supported formats: json array, or JS array. Anything else, we don't process as of now Upon completion, done function is called - first parameter is 'TA object' second parameter is error code.  TODO : implement done function functionality completely.*/
        read: function(data, done) {
            // We expect the data to be in the following form 
            // { label : 'label for the chart', data: [[ts,o,h,l,c,v], [ts,o,h,l,c,v],....] } 

            //New chart param. We are not going to plot before read anyways.
            this.cp =  new $.tickp.chartparams.init(this);
            var errorcode = 0;
            var label = '';
            if (!data.label || !data.data) { 
                // see if it's an array.
                if (isArray(data)) { 
                    if(!(data.length)) { // empty array 
                        return false;
                    } 
                    var d = data;
                }
            } 
            if (data.data) {
                if (isArray(data.data)) { 
                    if(!data.data.length) { // empty array
                        return false;
                    } 
                    var d = data.data;
                }
                if (data.label) {
                    label = data.label;
                } 
            }  
            // neither data or data.data was an array, try to parse json or else give up 
            if(!d) {
                try { 
                    errorcode = 0;
                    var d = parseJSON(data);
                    if (d.data)  {
                        if (isArray(d.data)) {
                            label  = d.label;
                            d = d.data;
                        } else {
                            errorcode = -3;
                        } 
                    } else if (!isArray(d)) {
                        errorcode = -3;
                    }
                } catch (e) {
                    alert(e);  // FIXME: Is not portable. I guess alert is okay for portability
                    errorcode = -2; // JSON failure.
                }
            } 

            if (errorcode) {
                if (isFunction(done)) { // Data not good 
                    // return false; // FIXME : revisit this later
                    return done.call(this, errorcode); 
                } else {
                    return false;
                }
            }
            /*  We Got Data now. We separate this into timestamps and OHLC
                The advantage of separating these two is that, later when we 
                need slices of the data, we'd use the timestamps to obtain 
                indices and then use those offsets in ohlc and indicators.
                it'd be efficient goin through the timestamps table */
            this.current = { ts: [], ohlc:[], vol:[], overlays:{}, indicators:[]};
            this.cp.numindicators = 0; // Canvas uses this value. Need to be reset
            this.cp.label = label; // FIXME: The data should take care of it 
            var ts = [];//this.current.ts; //just for convenience
            var ohlc = [];//this.current.ohlc; //just for convenience
            var v = []; // this.current.vol;
            if (!d) { 
                var d = data;
            }
            for(var i in d) {
                //ts[i] = _getDateTs(d[i][0]);//yuri
                ts[i] = d[i][0];
                ohlc[i] = [d[i][1], d[i][2], d[i][3], d[i][4]];
                if(d[i][5]) { 
                    v[i] = d[i][5];
                }
            }
            
            this.dailydata = undefined;
            this.monthlydata = undefined;
            this.weeklydata = undefined;
            this.dailydata = {ts:ts, ohlc:ohlc, vol : v};
            if (this.interval == 1) { 
                this.timescale(ts, ohlc, v, 'weekly');
            }
            if (this.interval == 2) {  
                this.timescale(ts, ohlc, v, 'monthly');
            } 
            this.setTimeScale(this.interval);
            return true;
        },
        //******Artanisz Changes**///
        initWithData: function( candles ) {
            this.initWithNoData();
            var len = candles.length;
            for(var i = 0; i < len; i++ ) {
                // Add the new record
                this.addCandleWithoutPlot(candles[i][0], candles[i][1], 
				   candles[i][2], candles[i][3], candles[i][4]);
            }
        },
        initWithNoData: function() {
            this.current = { ts: [], ohlc:[], vol:[], overlays:{}, indicators:[]};
            this.cp.numindicators = 0; // Canvas uses this value. Need to be reset
            // The label should be set externally
            this.cp.label = ' '; // FIXME: The data should take care of it 
            var ts = [];//this.current.ts; //just for convenience
            var ohlc = [];//this.current.ohlc; //just for convenience
            var v = []; // this.current.vol;
            this.dailydata = undefined;
            this.monthlydata = undefined;
            this.weeklydata = undefined;
            this.dailydata = {ts:ts, ohlc:ohlc, vol : v};
            if (this.interval == 1) { 
                this.timescale(ts, ohlc, v, 'weekly');
            }
            if (this.interval == 2) {  
                this.timescale(ts, ohlc, v, 'monthly');
            } 
            this.setTimeScale(this.interval);
            return true;
        },
        // Phase 1 setSize()
        setSize : function( width, height ) {
            // Updates the plot width rather than the width
            this.plotwidth = width - this.loffset - this.rmargin;
            // the minimum plot width is 20
            if( this.plotwidth < 20 ) {
                this.plotwidth = 20;
            }
            // the minimum height is 20
            this.height = height;
            if( this.height < 20 ) {
                this.height = 20;
            }
        },
        setCandleBorder : function( color, size ) {
            this.candlebordercolor = color;
            this.candlebordersize = size;
        },
        showCrosshair : function( show ) {
            this.showcrosshair = show; 
            if( show && (this.mode != 2) ) {
                this.changemode(2);
                this.drawCrosshair(Math.round(( this.loffset + this.plotwidth) / 2), 
					Math.round(this._scaledY((this.tmargin + this.plotht)/2 )));
			} else if( !show ) {
                // Change to pan and zoom mode
                this.changemode(1);
				this.target.childNodes[this.labels['crossHair']].childNodes[0].style.visibility = 'hidden';
				this.target.childNodes[this.labels['crossHair']].childNodes[1].style.visibility = 'hidden';
                this.redrawoverlays = true;
                this.redrawindicators = true;
			}
        },
        // Phase 1 showVolumeChart()
        showVolumeChart : function( show ) {
            this.showvolume = show;
        },
        setCrossHairVisibility: function(visibility) {
            if (visibility){
                this.target.childNodes[this.labels['crossHair']].childNodes[0].style.visibility = 'visible';
                this.target.childNodes[this.labels['crossHair']].childNodes[1].style.visibility = 'visible';
                this.crosshair = true;
            } else {
                this.target.childNodes[this.labels['crossHair']].childNodes[0].style.visibility = 'hidden';
                this.target.childNodes[this.labels['crossHair']].childNodes[1].style.visibility = 'hidden';
                this.crosshair =  false;
            }
        },
        drawCrosshair : function( x, y ) {
            this.focuscandle = this.findClosestCandleCrossHair( x );
            this.plot();
            var ctx = this.ctx;
            var lenall = this.tmargin + this.plotht;
            for( var i in this.current.indicators ) {
                lenall += this.current.indicators[i].height;
            }
            var style = this.cs.crosshair;
			var _right = this.loffset + this.plotwidth + 4;
            var _bottom = this._scaledY(lenall)+1;
            var offset = 4;
            if( y > this._scaledY(this.tmargin + this.plotht) ) {
                y = this._scaledY(this.tmargin + this.plotht);
            } else if( y < this._scaledY(this.tmargin) ) {
                y = this._scaledY(this.tmargin)
            }
            if( x < this.loffset ) {
                x = this.loffset;
            } else if( x > (this.loffset + this.plotwidth) ) {
                x = (this.loffset + this.plotwidth);
            }
            _drawline(ctx, this.loffset, y, _right, y, style, 1);
            _drawline(ctx, x, this._scaledY(this.tmargin), x, _bottom, style, 1);
 
            var fixed = this.yToValue(y).toFixed( this.digitsafterdecimal);
            var l = Math.round( ctx.measureText( fixed ).width );
            var datetime = this._idxToDateTime( this.focuscandle );

            /*if( datetime == "00:00" ) {
                datetime = this._idxToDate( this.focuscandle );
            }*/
            var datetimel = Math.round( ctx.measureText( datetime ).width );
 
            ctx.fillStyle = style;
            // ctx.fillRect( _right+2*offset, y-8, l-2*offset, 14);
            // Smooth edges are half circles
            /*ctx.beginPath();
            ctx.arc( _right+offset, y+0.7, 7.6, Math.PI/2, 3*Math.PI/2, false); 
            ctx.closePath();
            ctx.fill();*/
			// ctx.beginPath();
            // ctx.arc( _right+l+offset, y+0.7, 7.6, Math.PI/2, 3*Math.PI/2, true); 
            // ctx.closePath();
			// ctx.fill();
 
            // Date
            // ctx.fillRect( x-(datetimel/2)-offset/2, _bottom, datetimel+offset, 12);
 
            // Deprecated
            // ctx.strokeStyle = this.cs.label;
            // if( check_textRenderContext(this.ctx) ) {
            //    ctx.strokeText(""+fixed, _right, y-4, 7, 200, 100, 100, 'sans-serif');
            //    ctx.strokeText(datetime, x-(datetimel/2), _bottom, 7, 200, 100, 100, 'sans-serif');
			// }
            var cht = this.target.childNodes[this.labels['crossHair']];
			cht.childNodes[0].innerHTML = fixed;
			cht.childNodes[0].style.left = (_right + offset) + 'px';
            cht.childNodes[0].style.top = (this.target.offsetTop + y - 7) + 'px';
			cht.childNodes[0].style.visibility = 'visible';
            cht.childNodes[0].className = 'crosshair-indicator-y';
			cht.childNodes[1].innerHTML = datetime;
			cht.childNodes[1].style.left = (x-(datetimel/2)) - 4 + 'px';
            cht.childNodes[1].style.top = (this.target.offsetTop + _bottom -2) + 'px' ;
			cht.childNodes[1].style.visibility = 'visible';
            cht.childNodes[1].className = 'crosshair-indicator-x';
 
            this.redrawoverlays = true;
            this.redrawindicators = true;
        },
        preparePlot: function() {
            this._updateindicators();
            this.updateRightSpace();
            this.determineIndicatorColor();
		},
        determineIndicatorColor: function( oldclose, newclose ) {
            // If the open value is greater than the close value
            if( oldclose && newclose ) {
                if( oldclose > newclose) {
                    this.cs.currentvalueindicator = this.cs.rcandle;
                } else {
                    this.cs.currentvalueindicator = this.cs.gcandle;
                }
            } else {
                var last = this.current.ohlc.length - 1;
                if( this.current.ohlc[last][0] > this.current.ohlc[last][3] ) {
                    this.cs.currentvalueindicator = this.cs.rcandle;
                } else {
                    this.cs.currentvalueindicator = this.cs.gcandle;
                }
		    }
        },
        // Phase 1 drawCurrentValueIndicator()
        _drawCurrentValueIndicator : function( ob ) {
			var ctx = this.ctx;
			var _left = this.loffset;
			var _right = _left + this.plotwidth;
			var cs = this.cs;
			var cp = this.cp;
			var data = this.current.ohlc;
			var last = data.length - 1;

            var xmin = ob.xmin, ymin = ob.ymin, xmax = ob.xmax, ymax = ob.ymax;
			var _log = (cp.logscale ? Math.log : function(x) {return x});
 
			// There is no data
			if( xmax == 0 ) return;
 
			// Legend text
			var focus = last;
			if( this.mode == 2) {
				focus = this.focuscandle;
			}
			var fopen = data[focus][0].toFixed(this.digitsafterdecimal);
			var fhigh = data[focus][1].toFixed(this.digitsafterdecimal);
			var flow = data[focus][2].toFixed(this.digitsafterdecimal);
			var fclose = data[focus][3].toFixed(this.digitsafterdecimal);
			var h = this.topmargin + this.plotht;

            // Deprecated
			// ctx.strokeStyle = cs.label;
			// if( check_textRenderContext(this.ctx) ) {
			//	var ohlcText = "O:" + fopen + " H:" + fhigh + " L:" + flow + " C:" + fclose;
			//	ctx.strokeText( ohlcText, this.loffset + 3, this._scaledY(h)-10,
			//		6, 200, 100, 100, 'sans-serif');
			//}
            var ohlcText = "O:" + fopen + " H:" + fhigh + " L:" + flow + " C:" + fclose;
            var ohlc = this.target.childNodes[this.labels['ohlc']];
            if( ohlc.innerHTML != ohlcText ) {
                ohlc.innerHTML = ohlcText;
            }
            // ohlc.style.top = 480 - this.height + this._scaledY(h)-6;

            //console.log('offsetTop:', this.target);

            //deepq
            //ohlc.style.top = (this.target.offsetTop + this._scaledY(h)-11) + 'px';
            ohlc.style.top = (this.target.offsetTop + this._scaledY(h) - 13) + 'px';

			// Current value indicator text
			var fixed = data[last][3].toFixed(this.digitsafterdecimal);
			// If y min is less than the y value of the current value indicator do not draw
			if( ymin > _log(fixed) ) { 
				this.target.childNodes[this.labels['currentValueIndicator']].style.visibility = 'hidden';
				return;
			}
  
            var range = ymax - ymin;
			var scale = this.plotht/range; // scale: how much a unit takes on the plot
 
			var ycl = Math.round((_log(data[last][3])-cp.ymin)*scale); 
 
			var offset = 4;
			var style = cs.currentvalueindicator;
 
			_drawline(ctx, _left, Math.round(this._scaledY(h-ycl)), _right + 2*offset, this._scaledY(h-ycl), this.cs.currentPriceLine, 2);
            //console.log(Math.round(this._scaledY(h-ycl)),_right + 2*offset,this._scaledY(h-ycl));
            this.currentPrice = Math.round(this._scaledY(h-ycl));
			var l = Math.round( ctx.measureText(fixed).width );
  
			ctx.fillStyle = style;
			// ctx.fillRect( _right+3*offset, this._scaledY(h-ycl)-8, l-2*offset, 16);
			// Smooth edges are half circles

			/*ctx.beginPath();
			ctx.arc( _right + 2 * offset, Math.round(this._scaledY(h - ycl)) + 0.7, 7.6, Math.PI/2, 3 * Math.PI / 2, false);
			ctx.closePath();
			ctx.fill();*/

            // ctx.beginPath();
			// ctx.arc( _right+2*offset+l, this._scaledY(h-ycl)+0.7, 7.6, Math.PI/2, 3*Math.PI/2, true);
			// ctx.closePath();
			// ctx.fill();
 
			// Deprecated
			// ctx.strokeStyle = cs.label;
			// if( check_textRenderContext(this.ctx) ) {
			//    ctx.strokeText(fixed, _right+2*offset, this._scaledY(h-ycl)-4,
			//		7, 200, 100, 100, 'sans-serif');
			// }
			var cvi = this.target.childNodes[this.labels['currentValueIndicator']];

			cvi.style.visibility = 'visible';
			cvi.innerHTML = fixed;
			cvi.style.left = (_right+2*offset) + 'px';
            cvi.className = "current-indicator";

            //console.log(this.target.offsetTop);
            //cvi.style.top = (this.target.offsetTop + Math.round(this._scaledY(h-ycl)) - 7) + 'px';
			cvi.style.top = (this.target.offsetTop + Math.round(this._scaledY(h-ycl)) - 7) + 'px';
            // cvi.style.top = this.target.offsetTop + Math.round(this._scaledY(h-ycl-17));
            cvi.style.background = this.cs.currentPriceBackground;
        },
        // Phase 1 height constant
        /* Most Y coordinates are derived from a limited number of Y coordinates
         * One option is to apply the transformation to the 'basic' coodrinates
         * This is a computationally cheaper option.
         * The other option is to apply the transformation to every Y coordinate
         * We must go for the second option because the log and exp functions are
         * being applied to Y coordinates and scaling won't work 
         */
        _scaledY : function( old ) {
            return ( old * ( this.height / this.oldheight ));
        },
        // Phase 1 addNewRecord()
        addNewRecord : function( record ) {
            // Adds a new candle
            // The record comes in the following format: 'Date', open, high, low, close
            // Where Date: MM/DD/YYYY hh:mm:ss
            var d = record.split(",");
 
            // Add the new record
            this.current.ts.push(d[0]);
            //this.current.ts.push( _getDateTs( Date.parse(d[0].substring(1, (d[0].length - 1)))) );
            this.current.ohlc.push( [parseFloat(d[1]), parseFloat(d[2]), 
                parseFloat(d[3]), parseFloat(d[4])] );
            this.current.vol.push( 0 );

            this.current.ts.shift();
            this.current.ohlc.shift();
            this.current.vol.shift();

            // Update indicators will do nothing if there are no indicators
            this._updateindicators();
 
            // Adjust the right space
            var close = this.current.ohlc[this.current.ohlc.length-1][3].toFixed(this.digitsafterdecimal);
                var l = this.ctx.measureText(close).width;
                if( l >= ( this.rmargin - 10 ) ) {
                    this.rmargin = l + 10;
                    // Update plot width
                    this.plotwidth = this.width - this.loffset - this.rmargin;
                    // the minimum plot width is 20
                    if( this.plotwidth < 20 ) {
                        this.plotwidth = 20;
                    }
            }
 
            // TODO: Remove automatic plot, do it manually instead
            this.preparePlot();
            this._initPlotCanvas();
            // -1 moves the window one position forward
            this._doplot(this.ctx, this.current, -1);
            if (!this.mode) { 
                this.drawlines();
            } 
        },
        addCandleWithoutPlot: function( date, open, high, low, close ) {
            // Adds a new candle
            // The record comes in the following format: 'Date', open, high, low, close
            // Where Date: MM/DD/YYYY hh:mm:ss
 
            // Add the new record
            //this.current.ts.push( _getDateTs( Date.parse(date)) );
            this.current.ts.push(date);
            this.current.ohlc.push( [open, high, low, close] );
			this.current.vol.push( 0 );
            this.redrawoverlays = true;
            this.redrawindicators = true;
 
			// TODO: Adjust the right space, if needed!
			// If there is a different number of digits before the decimal point, update
            // This code is in preparePlot()
            /* var l = Math.round( this.ctx.measureText(close.toFixed(this.digitsafterdecimal)).width );
            if( l >= ( this.rmargin - 10 ) ) {
                this.rmargin = l + 10;
                // Update plot width
                this.plotwidth = this.width - this.loffset - this.rmargin;
				// the minimum plot width is 20
                if( this.plotwidth < 20 ) {
                    this.plotwidth = 20;
                }
            }*/
        },
        // Phase 1 updateRecord()
        updateRecord : function( record ) {
            // Adds a new candle
            // The record comes in the following format: 'Date', open, high, low, close
            // Where Date: MM/DD/YYYY hh:mm:ss
            var d = record.split(",");
 
            // Everything should be re-drawn because of the current value indicator
            // TODO: Deprecate the no drawAll code
            var drawAll = true;
            this.redrawoverlays = true;
            this.redrawindicators = true;
            // Has overlay indicators
            if( this.cp.numoverlays > 0 ) {
               drawAll = true;
            }
            //console.log(this.current);
            var lastRecordIndex = this.current.ts.length - 1;
 
            var c = Math.round(this.cp.cwidth/2);
            var csize = Math.round(this.cp.cwidth/1.4);
            var ob = this._window(this.current.ohlc, this.current.overlays, 0);

            if( drawAll ) {
                this._updateRecord( lastRecordIndex, d );
                this._updateindicators();
                this.plot();
                return;
            }
  
            this._eraseLastCandle( c, csize, ob );
            this._updateRecord( lastRecordIndex, d );
            // Update indicators will do nothing if there are no indicators
            this._updateindicators();
            // Drawing
            this._drawLastCandle( c, csize, ob );
            if( this.showvolume ) {
                this._drawUpdatedVolume( c, csize, ob );
            }
    
            // Update and draw non-overlay indicators
            var k = 0;
            var indicators = this.current.indicators;
            var t = this.topmargin + this.plotht + this.vspacing;
            if( this.showvolume ) {
                t += this.loweriht;
            }
            var l = this.loffset;
            var textElementsDrawn = 0;
            for(var j in indicators) {
                // The background color
                this.ctx.fillStyle = this.cs.background;
                this.ctx.fillRect(l - 1, this._scaledY(t - 1), this.plotwidth + 2, this._scaledY(this.liplotht + this.limargin + 2));
                // Add vertical lines
                this._drawIndicatorVerticalLines( t-1, c, csize, ob );
                textElementsDrawn = this._plotIndicator(indicators[j], k, textElementsDrawn);
                k += indicators[j].height;
                t += this.loweriht;
            }
            if( textElementsDrawn > 0 ) {
                this._hideRedundantElements( this.target.childNodes[this.labels['indicators']],
			        textElementsDrawn );
                this.redrawindicators = false;
            }
            this._drawCurrentValueIndicator( ob );
        },
        _updateRecord: function( index, d ) {
            //console.log(index,d);
            //this.current.ts[index] = Date.parse(d[0].substring(1, (d[0].length - 1)));
            this.current.ts[index] = parseInt(d[0], 10);
            this.current.ohlc[index][0] = parseFloat(d[1]);
            this.current.ohlc[index][1] = parseFloat(d[2]);
            this.current.ohlc[index][2] = parseFloat(d[3]);
            var close = parseFloat(d[4]);
            // Determines the indicator color relative to the last close
            this.determineIndicatorColor(this.current.ohlc[index][3], close);
            this.current.ohlc[index][3] = close;
            this.current.vol[index] = 0;
        },
        _drawIndicatorVerticalLines : function( yoffset, c, csize, ob ) {
            var xmin = ob.xmin, ymin = ob.ymin, xmax = ob.xmax, ymax = ob.ymax;
            var cp = this.cp;
            var ctx = this.ctx;
            var cs = this.cs;
            var howmany = xmax-xmin;
            var xstop = Math.floor(howmany/cp.maxxlabels);
            for(var i = xmin; i < xmax; i++) { 
                if(i%xstop == 0) {
                    var xlo = (c + (i-xmin)*cp.cwidth) - Math.round(csize/4) + this.loffset;
                    var xline = xlo + Math.round(csize/2);
                    if(xlo > this.loffset + 20) { 
                        _drawline(ctx, xline, this._scaledY(yoffset) , xline, this._scaledY(yoffset + this.liplotht + this.limargin), cs.stroke);
                    } 
                } 
            } 
        },
        _drawUpdatedVolume : function( c, csize, ob ) {
            var vol = this.current.vol;
            var lastRecordIndex = this.current.vol.length - 1;
            var cp = this.cp;
            var ctx = this.ctx;
            var xmin = ob.xmin, ymin = ob.ymin, xmax = ob.xmax, ymax = ob.ymax;
            var vymax = _minmax1d(vol.slice(xmin,xmax))[1] * 1.1;
            var vymin = 0; 
            var vrange = vymax - vymin;
            var vscale = this.liplotht/vrange;
            var xlo = (c + (( xmax-1 )-xmin)*cp.cwidth) - Math.round(csize/4) + this.loffset;
            var vt = this.topmargin + this.plotht + this.vspacing;
            var vh = vt + this.liplotht + this.limargin;
 
            if(vol[lastRecordIndex]) { 
                var yvol = vol[lastRecordIndex] * vscale;
                // FIXME : Fix for opera, check if it works 
                ctx.fillRect( xlo, this._scaledY(vh-yvol), csize, this._scaledY(yvol) );
            } 
        },
        _drawLastCandle : function( c, csize, ob ) {
            // re-draws the last candle, this function can be generalised to any candle
            var data = this.current.ohlc;
            var vol = this.current.vol;
            // Used in _window
            var overlays = this.current.overlays; // ?
            var indicators = this.current.indicators; // ?
            // Has information about candle width
            var cp = this.cp;
            // Has information about the candle color
            var ctx = this.ctx;
            // Has information about the background
            var cs = this.cs;
 
            var xmin = ob.xmin, ymin = ob.ymin, xmax = ob.xmax, ymax = ob.ymax;
            var _log = (cp.logscale ? Math.log : function(x) {return x});

            var range = ymax - ymin;

            var scale = this.plotht/range; // scale: how much a unit takes on the plot
 
            var yop = Math.round((_log(data[xmax-1][0])-cp.ymin)*scale);
            var yhi = Math.round((_log(data[xmax-1][1])-cp.ymin)*scale);
            var ylo = Math.round((_log(data[xmax-1][2])-cp.ymin)*scale);
            var ycl = Math.round((_log(data[xmax-1][3])-cp.ymin)*scale); 
            var xlo = (c + (( xmax-1 )-xmin)*cp.cwidth) - Math.round(csize/4) + this.loffset;
            var xline = xlo + Math.round(csize/2);
 
            if (yop > ycl) {
                ctx.fillStyle = cs.rcandle;
            } else {
                ctx.fillStyle = cs.gcandle;
                var t = ycl; ycl = yop; yop = t; 
            }
            var h = this.topmargin + this.plotht;
            if(cp.type == 1) {  // candle-stick
                ctx.fillRect( xlo, this._scaledY(h-yop), csize, this._scaledY(yop-ycl));
                if(!(yop-ycl)) { 
                    ctx.fillRect( xlo, this._scaledY(h-yop), csize, 1);
                } 
                _drawline(ctx,xline, this._scaledY(h-yhi), xline, this._scaledY(h-ylo), ctx.fillStyle, 1);
            } else if( cp.type == 2) { // OHLC 
                _drawline(ctx,xline, this._scaledY(h-yhi), xline, this._scaledY(h-ylo), ctx.fillStyle, 2);
                _drawline(ctx, xlo, this._scaledY(h-yop), xline, this._scaledY(h-yop), ctx.fillStyle, 2);
                _drawline(ctx, xline, this._scaledY(h-ycl), xlo+csize, this._scaledY(h-ycl), ctx.fillStyle, 2);
            } else {  
                if ( ( xmax-1 ) -xmin > 0) { /* skip first line */
                    _drawline(ctx,prevxy[0], this._scaledY(prevxy[1]), xline, this._scaledY(h-ycl), cs.stroke, 3);
                } 
                prevxy = [xline, h-ycl];
            }
        },
        _eraseLastCandle : function( c, csize, ob ) {
            var data = this.current.ohlc;
            var vol = this.current.vol;
            var overlays = this.current.overlays; // ?
            var indicators = this.current.indicators; // ?
            // Has information about candle width
            var cp = this.cp;
            // Has information about the candle color
            var ctx = this.ctx;
            // Has information about the background
            var cs = this.cs;
 
            var xmin = ob.xmin, ymin = ob.ymin, xmax = ob.xmax, ymax = ob.ymax;
            var _log = (cp.logscale ? Math.log : function(x) {return x});
            // Exp is needed to draw the grid lines
            var _exp = (cp.logscale ? Math.exp : function(x) {return x}); 
 
            var range = ymax - ymin;
            var scale = this.plotht/range; // scale: how much a unit takes on the plot
 
            // Remove old candle 
            var yop = Math.round((_log(data[xmax-1][0])-cp.ymin)*scale);
            var yhi = Math.round((_log(data[xmax-1][1])-cp.ymin)*scale);
            var ylo = Math.round((_log(data[xmax-1][2])-cp.ymin)*scale);
            var ycl = Math.round((_log(data[xmax-1][3])-cp.ymin)*scale);
 
            var xlo = (c + (( xmax-1 )-xmin)*cp.cwidth) - Math.round(csize/4) + this.loffset;
            var xline = xlo + Math.round(csize/2);
 
            ctx.fillStyle = cs.background;
 
            if (yop <= ycl) {
                var t = ycl; ycl = yop; yop = t; 
            }
 
            // Needed to plot the candle correctly
            var h = this.topmargin + this.plotht;
 
            ctx.fillRect( xlo, this._scaledY(h-yhi), csize, this._scaledY(yhi-ylo));
            if(!(yop-ycl)) { 
                ctx.fillRect( xlo, this._scaledY(h-yop), csize, 1);
            } 
 
            // Add lines
            /* and X and Y axis  FIXME:  get it right */ 
            var ystops = this._ygrid(_exp(ymin), _exp(ymax), 5);

            for(var i in ystops) {
                var logystp = _log(ystops[i]);
                var y1 = Math.round((logystp - cp.ymin)*scale);
                if( (y1 > 20) && (y1 < yhi + ctx.lineWidth ) && (y1 > ylo - ctx.lineWidth ) ) { // don't draw anything in first 20 pixels
                    // use a solid color
                    _drawline(ctx, xlo, this._scaledY(h-y1), xlo+csize, this._scaledY(h-y1), cs.background, ctx.lineWidth + 1);
                    _drawline(ctx, xlo, this._scaledY(h-y1), xlo+csize, this._scaledY(h-y1), cs.stroke);
                } else if( y1 >= yhi + ctx.lineWidth ) {
                    // Skip the lines above the old candle high
                    break;
                }
            }
 
            // vertical lines
            var howmany = xmax-xmin;
            var xstop = Math.floor(howmany/cp.maxxlabels);
            // See if a line shall be drawn
            if( (xmax - 1)%xstop == 0 ) {
                _drawline(ctx, xline, this._scaledY(h-ylo) , xline, this._scaledY(h-yhi), cs.stroke);
            }
        },
        //******Artanisz Changes**///
        timescale : function(ts, data, volume, tmscale) {
            var cwi = -1, lwi = -1;
            var wohlc = [], wts = [], v = [];
            var whi, wlo;

            var pwd = (tmscale == 'weekly' ? 7 : 32);
            for (var i = 0; i < data.length; i++) {
                var dt = data[i]; 
                var d = new Date(ts[i]);
                var wom = (tmscale == 'weekly' ? d.getDay(): d.getDate());
                if ( wom < pwd) { // new week has started 
                    cwi++; 
                    wohlc[cwi] = [dt[0], dt[1], dt[2], dt[3]]; 
                    wts[cwi] = ts[i]; 
                    v[cwi] = volume[i];
                    whi = dt[1];
                    wlo = dt[2]; 
                } else { 
                    if (dt[1] > whi) {
                        whi = dt[1]; 
                        wohlc[cwi][1] = whi;
                    } 
                    if (dt[2] < wlo) { 
                        wlo = dt[2]; 
                        wohlc[cwi][2] = wlo;
                    } 
                    wohlc[cwi][3] = dt[3];
                    v[cwi] += volume[i];
                } 
                pwd = wom; 
            }
            if (tmscale == 'weekly') { 
                this.weeklydata = { ts: wts, ohlc : wohlc, vol : v}; 
            } 
            if (tmscale == 'monthly') { 
                this.monthlydata = { ts: wts, ohlc: wohlc, vol : v};
            } 
        }, 
        
        setTimeScale : function(ts) {
            var ts = parseInt(ts); 
            if(isNaN(ts)) ts = 0; 
            this.interval = ts;
            if (!this.dailydata) return; // just in case. 
            switch(ts) { 
                case 0:
                    this.current.ohlc = this.dailydata.ohlc;
                    this.current.ts = this.dailydata.ts;
                    this.current.vol = this.dailydata.vol;
                    this.cp.end = this.dailydata.ohlc.length;
                    break;
                case 1:
                    
                    if(!this.weeklydata) {
                        this.timescale(this.dailydata.ts, this.dailydata.ohlc, this.dailydata.vol, 'weekly');
                    }
                    this.current.ohlc = this.weeklydata.ohlc;
                    this.current.ts = this.weeklydata.ts;
                    this.current.vol = this.weeklydata.vol;
                    this.cp.end = this.weeklydata.ohlc.length;
                    break;
                case 2:
                    if(!this.monthlydata) {
                        this.timescale(this.dailydata.ts, this.dailydata.ohlc, this.dailydata.vol, 'monthly');
                    }
                    this.current.ohlc = this.monthlydata.ohlc;
                    this.current.ts = this.monthlydata.ts;
                    this.current.vol = this.monthlydata.vol;
                    this.cp.end = this.monthlydata.ohlc.length;
                    break;
                default: 
                    this.current.ohlc = this.daily.ohlc;
                    this.current.ts = this.daily.ts;
                    this.current.vol = this.daily.vol;
                    break;
            }
            // We now delete all indicators and overlays.  
            // Remember : Always use delindicator to delete an indicator. It keeps the internal
            // plot structure consistent. 
            var all = this.getindicators();
            for(var i in all) {
                this.delindicator(all[i]);
            } 
            this.plot();
        }, 
                    
        /* zooming.. basically this is very simple . We change the cpminwidth 
            value and replot
        */
        zoom: function(up) { 
            if (up) { 
                this.cp.minwidth += 2;
                if (this.cp.minwidth > 40) {
                    this.cp.minwidth = 40;
                }
            } else { 
                this.cp.minwidth -= 2;
                if (this.cp.minwidth < 6) {
                    this.cp.minwidth = 6;
                }
            } 
            this.plot();
        }, 
            
        _volgrid: function(maxvol, howmany) {
            var labels = [];
            var lookup = [1000000000.0, 1000000.0, 1000.0, 1.0];
            var avols = [];
            for(var i = 0; i < howmany; i++) {
                avols.push(maxvol/(howmany-i));
            }
            var suffix = ['B', 'M', 'K', ''];
            for (var i in lookup) {
                if (avols[0]/lookup[i] > 1) {
                    for(var j in avols ) {
                        var n =  (avols[j] - avols[j]%lookup[i])/lookup[i] + suffix[i];
                        labels.push(n);
                    }
                }
            }
            //console.log(labels);
            return labels;
        }, 

        /* The function below returns an array of values for Y axis for Grid
        Display. Basic algorithm is given below - 
        Figure out the closest separator value from the lookup 
        for given input and then return ceil of min to floor of max times the
        separator in an array. Those will be our grid points. 
        Loved, this piece of code. Not brilliant, but very clever, hopefully
        should scale from Penny stocks to Zimbabwe market */ 
        _ygrid: function(ymin, ymax, howmany) {
            var approx = (ymax - ymin)/howmany;

            //******Artanisz Changes**///
            lookup = [0.000001, 0.0000025, 0.000005, 0.00001, 0.000025, 0.00005, 0.0001, 0.00025, 0.005, 
				 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0, 2500.0, 5000.0,
                 10000.0, 25000.0, 50000.0, 100000.0, 500000.0, 1000000.0];

            //******Artanisz Changes**///

            var na = []
            for (i in lookup) {
                var b = lookup[i]/approx;
                if (b < 1) { b = 1/b; }
                na.push(b);
            }

            var closest = lookup[na.indexOf(Math.min.apply(this,na))];
            var minindex = Math.ceil(ymin/closest); 
            var maxindex = Math.floor(ymax/closest);

            vals = [];
            for(var j = minindex; j <= maxindex; j++) { 
                vals.push(j*closest);
            }

            return vals;
        },

        _ygridPerc: function(ymin,ymax,howmany){
            var step = (ymax - ymin) / howmany,
                vals = [];

            for(var i=ymin;i<=(ymax+step); i+=step){
                vals.push(i);
            }
            return vals;
        },

        /* when we plot we are not going to plot more than _window amount of 
           data. So we call this function before plotting. Or it might get
            automatically called depending upon date range being too long
            TODO: Implement date ranges. 
            This is the most important internal function in plotting. 
            This function, first determines the range of data that is to be
            plot. Then it figures out the chart specific parameters. Most 
            important being (xmin, xmax, ymin, ymax) and it returns these
            values to the caller. But this function just doesn't do that much
            it also - determines whether 'log' mode is required. 
            it also - initiates the values of the chartparams object (which
            the drawing function would later use.) 
         */
        _window : function(data, overlays, shift, datelo, datehi) {

            /* right now only intializes chart params using data.*/
            var cp = this.cp;

            //******Artanisz Changes**///
            // a fraction of csize space on the left so that the candle stays inside
            // var w = this.plotwidth;
            var w = this.plotwidth - Math.round(cp.cwidth/(1.4*1.33));
            //******Artanisz Changes**///
            /* Determine howmany candles to display and get their begin and
                end offsets. */
            var begin, end, howmany = 0;

            shift = shift || 0; 
            cp.candles = cp.candles || data.length;
            howmany = data.length;
            if(howmany > (w/cp.minwidth)) {
                howmany = Math.round(w/cp.minwidth);
            } 

            cp.end = cp.end || data.length; // first time we set it to end
            cp.end -= shift;
            if (cp.end > data.length) {
                cp.end = data.length;
            }
            cp.begin = cp.end - howmany; 
            if (cp.begin < 0) {
                cp.begin = 0;
                cp.end = cp.begin + howmany;
            }
            begin = cp.begin;
            end = cp.end;

            // -- nasty code begins : Note above code substantially simpliefies it,
            //    still, I'd keep this for some time and get rid of it, once I am convinced
            /* if (!(shift === undefined)) {
                if(cp.candles == data.length) { // no panning is required

                    return { xmin:cp.begin, xmax: cp.end, ymin:cp.ymin, ymax:cp.ymax};
                } else { 
                    howmany = cp.candles;
                } 
                begin = cp.begin - shift;
                if (begin < 0) {
                    begin = 0; 
                } 
            } else {
                howmany = data.length;

                if(howmany > ((w)/cp.minwidth)) {
                    howmany = Math.round(w/cp.minwidth);
                } 
                begin = data.length - howmany;
            } 
            end = begin + howmany;
            if (end > data.length) { 
                end = data.length;
                begin = end - howmany;
            }  */ 

            // -- nasty code ends 

            /* Stuff needed to determine width of candles */
            cp.candles = howmany;
            //******Artanisz Changes**///
            // cp.cwidth = Math.floor((w)/cp.candles);
            cp.cwidth = cp.minwidth;
            //******Artanisz Changes**///
 
            if (cp.cwidth > 40) {
                cp.cwidth = 40;
            } 

            /* Y range is going to be dynamic get, min and max from data */
            var max, min;
            var d_ = _minmax2d(data.slice(begin, end));

            var _coef = (d_[1] - d_[0])/100;
            var _scale = _coef * this.scaleCoef;
            //console.log('custom scale', _scale, d_, d_[0] - _scale, d_[1] + _scale);
            min = d_[0] - _scale, max = d_[1] + _scale;

            /* Indicators overlayed should fit in the frame. So determine the
               real 'min/max' by using the overlays data as well.  */
            if (overlays) { 
                for( var j in overlays) { 
                    var omax, omin;
                    if (!j.search('bbands')) {
                        d_ = _minmax2d(overlays[j].data.slice(begin, begin+howmany));
					//******Artanisz Changes**///
                    } else if(!j.search('alligator')) {
                        d_ = _minmax2d(overlays[j].data.slice(begin, begin+howmany));
                    } else if(!j.search('envelopes')) {
                        d_ = _minmax2d(overlays[j].data.slice(begin, begin+howmany));
					//******Artanisz Changes**///
                    } else {
                        d_ = _minmax1d(overlays[j].data.slice(begin, begin+howmany));
                    } 
                    omin = d_[0], omax = d_[1];
                    if (omax > max) max = omax;
                    if (omin < min) min = omin;
                } 
            } 
            cp.begin = begin;
            cp.end = end; 
            if ((max/min > 2.0) && cp.autoscale) {
                cp.logscale = true;
            }
            var range = max - min; 
            //******Artanisz Changes**///
            cp.ymin = min - (0.07*range); // little margin below
            //******Artanisz Changes**///
            cp.ymax = max + (0.05*range); // little margin above 

            if(cp.logscale) { 
                //******Artanisz Changes**///
                // Why?
                // min = 0.9 * min; 
                // max = 1.1 * max; 
                //******Artanisz Changes**///
                cp.ymin = Math.log(min);
                if(isNaN(cp.ymin)) { 
                    /* bollingers might go negative n stock split, for which Math.log is not defined. 
                       we set the min to 0 for now */ 
                    cp.ymin = 0;
                } 
                cp.ymax = Math.log(max);
            }
            return { xmin:begin, xmax: end, ymin:cp.ymin, ymax:cp.ymax};
        },

        _idxToDate: function(i) { 
            var ts = this.current.ts[i];
            return _tsToDate(ts);
        },
 
        //******Artanisz Changes**///
        _idxToTime: function(i) {
            var ts = this.current.ts[i];
            return this.moment(ts).utc().format('HH:mm:ss');
        },

        _idxToDateTime: function(i) {
            var ts = this.current.ts[i];
            return this.moment(ts).utc().format('DD/MM/YYYY HH:mm:ss');
        },

        _plotIndicator : function(indicator, o, textElementsDrawn) {
            var data = indicator.data;
            var type = indicator.type;     
            var str = indicator.str;
            var t = this.topmargin + this.plotht + o + this.vspacing; 
            if( this.showvolume ) {
                t += this.loweriht;
            }
			var paramvalues = "";
            var b = t + indicator.height - this.vspacing;
            //******Artanisz Changes**///
            var l = this.loffset;
            var r = this.loffset + this.plotwidth;
            var begin = this.cp.begin;
            var end = this.cp.end;
            
            var cp = this.cp;
            var cs = this.cs;
            
            ctx = this.ctx;

            var c = Math.round(cp.cwidth/2); // center of first (and every) cdl 
			//******Artanisz Changes**///
            var csize = Math.round(cp.cwidth/1.4);
            // Needed to draw text elements over canvas
            var textElement = this.target.childNodes[this.labels['indicators']];

            var valTag = "<span class='icon icon-cog indicator-setup' data-id='" + indicator.uniqId + "'></span>"
                + "<span class='icon icon-close indicator-close' data-id='" + indicator.uniqId + "'></span>";

            //******Artanisz Changes**///
            switch(type) {
            case 'macd':
                var d = _minmax2d(data.slice(begin,end));
                var ymax = d[1], ymin = d[0];
                var range = (ymax - ymin);
                ymax = ymax + 0.1 * range;
                ymin = ymin - 0.1 * range;
                range  = ymax - ymin ; 
                var scale = ( indicator.height - this.vspacing ) / range;
                var h = b; 
                prevxy = [];
                ctx.strokeStyle = this.cs.stroke;
                //******Artanisz Changes**///
                var period = 0;
                var ma = 0;
                var histogram = 0;
                ctx.strokeRect(l, this._scaledY(t), this.plotwidth, this._scaledY(indicator.height - this.vspacing));
                var mzero = Math.round((0 - ymin)*scale);
                ctx.fillStyle = indicator.color[2];
                var mhi = undefined;
                var mlo = undefined;
                var mhilookahead = undefined;
                var mlolookahead = undefined;
                var notlast = true;
                var firstdraw = true;
                for(var j = begin; j < end; j++) { 
                    if(data[j][0] === undefined ) {
                        continue;
                    }
                    if( j == end - 1 ) {
                        notlast = false;
                    }
                    var i = j - begin; 
                    //******Artanisz Changes**///
                    var xlo = (c + i*cp.cwidth) - Math.round(csize/4) + this.loffset;
                    //******Artanisz Changes**///
                    var xline = xlo + Math.round(csize/2);
                    if( (mhi === undefined) && (mlo === undefined) ) {
                        mhi = Math.round((data[j][0]-ymin)*scale);
                        mlo = Math.round((data[j][1]-ymin)*scale);
                    }
                    if( notlast ) {
                        mhilookahead = Math.round((data[j+1][0]-ymin)*scale);   
                        mlolookahead = Math.round((data[j+1][1]-ymin)*scale);
                    }
                    // Look ahead for the purpose of always drawing the rectangle above the lines
                    if (prevxy[0]) { //skip first line
                        if( firstdraw ) {
                            _drawline(ctx,prevxy[0][0], this._scaledY(prevxy[0][1]), xline, this._scaledY(h-mhi), indicator.color[0], indicator.thickness[0]);
                            _drawline(ctx,prevxy[1][0], this._scaledY(prevxy[1][1]), xline, this._scaledY(h-mlo), indicator.color[1], indicator.thickness[1]);
                            firstdraw = false;
                        }
                        if( notlast ) {
                            _drawline(ctx,xline, this._scaledY(h-mhi), xline+cp.cwidth, this._scaledY(h-mhilookahead), indicator.color[0], indicator.thickness[0]);
                            _drawline(ctx,xline, this._scaledY(h-mlo), xline+cp.cwidth, this._scaledY(h-mlolookahead), indicator.color[1], indicator.thickness[1]);
                        }
                        // FIXME : Fix for opera, check if it works
                        if(mhi-mlo > 0) {
                            ctx.fillRect(xlo, this._scaledY(h-mzero-(mhi-mlo)), indicator.thickness[2], this._scaledY(mhi-mlo));
                        } else { 
                            ctx.fillRect(xlo, this._scaledY(h-mzero), indicator.thickness[2], this._scaledY(mlo-mhi));
                        } 
                    }
                    prevxy = [[xline, h - mhi], [xline, h - mlo]];
					mhi = mhilookahead;
					mlo = mlolookahead;
                } 
 
                //******Artanisz Changes**///
                // Values shown on the right side
                ystops = [d[0], (d[0] + d[1])/2, d[1]];
                for( var j in ystops) { 
                    var ystop = Math.round((ystops[j]-ymin)*scale);
                    _drawline(ctx, this.loffset, this._scaledY(h - ystop), this.loffset+this.plotwidth, this._scaledY(h - ystop), cs.gridlines, 1);
                    label = "" + ystops[j].toFixed(this.digitsafterdecimal);
                    if( this.redrawindicators ) {
                        this._addLabelToElement( textElement, textElementsDrawn, label, r + 6,
						   this.target.offsetTop + this._scaledY(h - ystop) - 7, undefined, indicator.uniqId, 'ystop');
                        textElementsDrawn++;
                    }
                }
                //******Artanisz Changes**///
 
				// Add the current values to the legend
                if( data.length > 0 ) {
                    if( data[data.length-1] !== undefined ) {
                        if( this.mode == 2 ) {
                            period = data[this.focuscandle][0];
                            ma = data[this.focuscandle][1];
                        } else {
                            period = data[data.length-1][0];
					        ma = data[data.length-1][1];
                        }
						histogram = period - ma;
                    }
                }
				paramvalues = ( " P:" + period.toFixed(this.digitsafterdecimal) + 
							   " MA:" + ma.toFixed(this.digitsafterdecimal) + 
							   " HIST:" + histogram.toFixed(this.digitsafterdecimal) );
                //******Artanisz Changes**///
                break;
            case 'rsi': 
                ymax = 100;
                ymin = 0;
                range  = ymax - ymin ; 
				var scale = ( indicator.height - this.vspacing ) / range;
                var h = b; 
                prevxy = [];
                ctx.strokeStyle = this.cs.stroke;
                //******Artanisz Changes**///
                var period = 0;
                ctx.strokeRect(l, this._scaledY(t), this.plotwidth, this._scaledY(indicator.height - this.vspacing));
                for(var j = begin; j < end; j++) { 
                    if(!data[j]) {
                        continue;
                    }
                    var i = j - begin; 
                    //******Artanisz Changes**///
                    var xlo = (c + i*cp.cwidth) - Math.round(csize/4) + this.loffset;
                    //******Artanisz Changes**///
                    var xline = xlo + Math.round(csize/2);
                    var rsi = Math.round((data[j]-ymin)*scale);
                    if (prevxy[0]) { //skip first line
                        _drawline(ctx,prevxy[0], this._scaledY(prevxy[1]), xline, this._scaledY(h-rsi), indicator.color, indicator.thickness);
                    }
                    prevxy = [xline, h - rsi];
                } 
                ystops = [30, 50, 70];
                for( var j in ystops) { 
                    var ystop = Math.round((ystops[j]-ymin)*scale);
                    _drawline(ctx, this.loffset, this._scaledY(h - ystop), this.loffset+this.plotwidth, this._scaledY(h - ystop), cs.gridlines, 1);
                    label = "" + ystops[j];
                    //******Artanisz Changes**///
                    // Deprecated
                    // this._drawText(label, r, this._scaledY(h - ystop), {align:'left', padding:5});
                    if( this.redrawindicators ) {
						this._addLabelToElement( textElement, textElementsDrawn, label, r + 6, 
						    this.target.offsetTop + this._scaledY(h - ystop) - 7, undefined, indicator.uniqId, 'ystop');
                        textElementsDrawn++;
					}
                    //******Artanisz Changes**///
                }
                if(  data.length > 0 && data[data.length-1] ) {
                    if( this.mode == 2 ) {
                        period = data[this.focuscandle];
                    } else {
                        period = data[data.length-1];
                    }
                }
                paramvalues = ( " PERIOD:" + period.toFixed( this.digitsafterdecimal ) );
                //******Artanisz Changes**///
                break;
            case 'stoch':
                ymax = 100;
                ymin = 0;
                range  = ymax - ymin ; 
                var scale = ( indicator.height - this.vspacing ) / range;
                var h = b; 
                prevxy = [];
                ctx.strokeStyle = this.cs.stroke;
                //******Artanisz Changes**///
                var period = 0;
                var ma = 0;
                ctx.strokeRect(l, this._scaledY(t), this.plotwidth, this._scaledY(indicator.height - this.vspacing));
                for(var j = begin; j < end; j++) { 
                    if(data[j][0] === undefined ) {
                        continue;
                    }
                    var i = j - begin; 
                    //******Artanisz Changes**///
                    var xlo = (c + i*cp.cwidth) - Math.round(csize/4) + this.loffset;
                    //******Artanisz Changes**///
                    var xline = xlo + Math.round(csize/2);
                    var mhi = Math.round((data[j][0]-ymin)*scale);
                    var mlo = Math.round((data[j][1]-ymin)*scale);
                    var mzero = Math.round((0 - ymin)*scale);
                    if (prevxy[0]) { //skip first line
                        _drawline(ctx,prevxy[0][0], this._scaledY(prevxy[0][1]), xline, this._scaledY(h-mhi), indicator.color[0], indicator.thickness[0]);
                        _drawline(ctx,prevxy[1][0], this._scaledY(prevxy[1][1]), xline, this._scaledY(h-mlo), indicator.color[1], indicator.thickness[1]);
                    }
                    prevxy = [[xline, h - mhi], [xline, h - mlo]];
                } 
                ystops = [20, 50, 80];
                for( var j in ystops) { 
                    var ystop = Math.round((ystops[j]-ymin)*scale);
                    _drawline(ctx, this.loffset, this._scaledY(h - ystop), this.loffset+this.plotwidth, this._scaledY(h - ystop), cs.gridlines, 1);
                    label = "" + ystops[j];
                    //******Artanisz Changes**///
                    // Deprecated
                    // this._drawText(label, r, this._scaledY(h - ystop), {align:'left', padding:5});
                    if( this.redrawindicators ) {
                        this._addLabelToElement( textElement, textElementsDrawn, label, r + 6,
						    this.target.offsetTop + this._scaledY(h - ystop) - 7, undefined, indicator.uniqId, 'ystop');
                        textElementsDrawn++;
					}
                    //******Artanisz Changes**///
                }
                if( data.length > 0 ) {
                    if( data[data.length-1] !== undefined ) {
                        if( this.mode == 2 ) {
                            period = data[this.focuscandle][0];
                            ma = data[this.focuscandle][1];
                        } else {
                           period = data[data.length-1][0];
                           ma = data[data.length-1][1];
                        }
                    }
                }
                paramvalues = ( " PERIOD:" + period.toFixed( this.digitsafterdecimal ) + 
							   " MA:" + ma.toFixed( this.digitsafterdecimal ) );
                //******Artanisz Changes**///
                break;
            case 'atr':
            case 'cci':
			case 'momentum':
            case 'osma':
            case 'dem':
            case 'wpr':
			case 'w_ad':
                var d = _minmax1d(data.slice(begin,end));
                var ymax = d[1], ymin = d[0];
                var range = (ymax - ymin);
                ymax = ymax + 0.1 * range;
                ymin = ymin - 0.1 * range;
                range  = ymax - ymin ; 
                var scale = ( indicator.height - this.vspacing ) / range;
                var h = b; 
                prevxy = [];
                ctx.strokeStyle = this.cs.stroke;
                ctx.strokeRect(l, this._scaledY(t), this.plotwidth, this._scaledY(indicator.height - this.vspacing));
                for(var j = begin; j < end; j++) { 
                    if(data[j] === undefined ) {
                        continue;
                    }
                    var i = j - begin; 
                    var xlo = (c + i*cp.cwidth) - Math.round(csize/4) + this.loffset;
                    var xline = xlo + Math.round(csize/2);
                    var atr = h-Math.round((data[j]-ymin)*scale);
                    if(prevxy[0]) { //skip first line
                        _drawline(ctx,prevxy[0], this._scaledY(prevxy[1]), xline, 
							this._scaledY(atr), indicator.color, indicator.thickness);
					}
                    prevxy = [xline, atr];
                }
 
                //******Artanisz Changes**///
                // Values shown on the right side
                ystops = [d[0], (d[0] + d[1])/2, d[1]];
                for( var j in ystops) { 
                    var ystop = Math.round((ystops[j]-ymin)*scale);
                    _drawline(ctx, this.loffset, this._scaledY(h - ystop), this.loffset+this.plotwidth, this._scaledY(h - ystop), cs.gridlines, 1);
                    label = "" + ystops[j].toFixed(this.digitsafterdecimal);
                    if( this.redrawindicators ) {
                        this._addLabelToElement( textElement, textElementsDrawn, label, r + 6,
						   this.target.offsetTop + this._scaledY(h - ystop) - 7, undefined, indicator.uniqId, 'ystop');
                        textElementsDrawn++;
                    }
                }
                //******Artanisz Changes**///
 
                var aval;
                if( this.mode == 2 ) {
                    aval = data[this.focuscandle];
                } else {
                    aval = data[data.length-1];
                }
				var paramvalues = ":" + aval.toFixed( this.digitsafterdecimal);
                break;
            case 'awesome':
            case 'ac':
                var d = _minmax1d(data.slice(begin,end));
                var ymax = d[1], ymin = d[0];
                var range = (ymax - ymin);
                ymax = ymax + 0.1 * range;
                ymin = ymin - 0.1 * range;
                range  = ymax - ymin ; 
                var scale = ( indicator.height - this.vspacing ) / range;
                var h = b; 
                prevxy = [];
                ctx.strokeStyle = this.cs.stroke;
				ctx.strokeRect(l, this._scaledY(t), this.plotwidth, this._scaledY(indicator.height - this.vspacing));
                var mzero = Math.round((0 - ymin)*scale);
				var drawbegin;
                if( ymax < 0 ) {
                    drawbegin = Math.round((ymax - ymin)*scale);
                } else if( ymin > 0 ) {
                    drawbegin = 0;
                } else {
                    drawbegin = mzero;
                }
                for(var j = begin; j < end; j++) { 
                    if(data[j] === undefined ) {
					    continue;
                    }
                    var i = j - begin; 
                    var xlo = (c + i*cp.cwidth) - Math.round(csize/4) + this.loffset;
                    var xline = xlo + Math.round(csize/2);
                    var yval = Math.round((data[j] - ymin)*scale);
                    // Color logic
                    var color;

                    if( data[j-1] === undefined ) { color = this.cs.label; }
                    else if( data[j] < data[j-1] ) { color = indicator.color[0]; }
                    else { color = indicator.color[1]; }
					_drawline(ctx, xline, this._scaledY(h-drawbegin), xline, this._scaledY(h-yval), 
						color, indicator.thickness);
                }
 
                //******Artanisz Changes**///
                // Values shown on the right side
                ystops = [d[0], (d[0] + d[1])/2, d[1]];
                for( var j in ystops) { 
                    var ystop = Math.round((ystops[j]-ymin)*scale);
                    _drawline(ctx, this.loffset, this._scaledY(h - ystop), this.loffset+this.plotwidth, this._scaledY(h - ystop), cs.gridlines, 1);
                    label = "" + ystops[j].toFixed(this.digitsafterdecimal);
                    if( this.redrawindicators ) {
                        this._addLabelToElement( textElement, textElementsDrawn, label, r + 6,
						   this.target.offsetTop + this._scaledY(h - ystop) - 7, undefined, indicator.uniqId, 'ystop');
                        textElementsDrawn++;
                    }
				}
                //******Artanisz Changes**///
 
                var aval;
                if( this.mode == 2 ) {
                    aval = data[this.focuscandle];
                } else {
                    aval = data[data.length-1];
                }
				paramvalues = ":" + aval.toFixed( this.digitsafterdecimal );
                break;
            default:
                break;
            }
            //******Artanisz Changes**///
            str += paramvalues + valTag;
            // Deprecated
            // this._drawText(str, l, this._scaledY(t+15), {align:'left', padding:5, font:'10pt Arial'}, 6);
            if( this.redrawindicators ) {
                //adding text label to indicator
                this._addLabelToElement( textElement, textElementsDrawn, str, l,
				    this.target.offsetTop + this._scaledY(t+15) - 5, null, indicator.uniqId);
			    textElementsDrawn++;
            }
            return textElementsDrawn;
            //******Artanisz Changes**///
        },

        /* Bells and whistles functions : Gives you candles from X, Y 
            co-ordinate, if the mouse is in the area of a candle, candle
            is returned or else nothing. This is used by _showInfo to 
            display OHLC data. 
        */
        _getCandle : function(x,y) { 
            x = x - this.loffset;
            y = y - this.topmargin;
            var cp = this.cp;
                
            var pc = this.plotwidth/(cp.end - cp.begin);
            var xos = Math.round(x/pc) + cp.begin;
            if ((xos < cp.end) && (xos >= cp.begin)) { 
                var candle = this.current.ohlc[xos];
                var chi = candle[1];
                var clo = candle[2];
                pc = this.plotht / (cp.ymax - cp.ymin); 
                var yos = cp.ymax - Math.round(y/pc);
                if((chi > yos) && (clo < yos)) {
                   return xos;
                }
            }
            return null;
        },

        _showInfo : function(o, x, y) {
            var data = this.current.ohlc;
            var s = this.infodiv.style;
        /*    s.background = '#FFFFCC';  
            s.display = 'block'; 
            s.position = 'absolute';
            s.border = '2px solid #0066CC';
            s.width = '100px';
            s.height = '200px';*/
            s.cssText = this.cs.idcss;
            s.left = (x -100 -5) + 'px';
            s.top = (y - 100-5) + 'px'; 
            html = '<table>';
            html += "<tr> <td>O</td><td>" + data[o][0] + "</td></tr>";
            html += "<tr> <td>H</td><td>" + data[o][1] + "</td></tr>";
            html += "<tr> <td>L</td><td>" + data[o][2] + "</td></tr>";
            html += "<tr> <td>C</td><td>" + data[o][3] + "</td></tr>";
            html += "</td>";
            this.infodiv.innerHTML = html;
        },

        /* given PageX, PageY, find the offset on the canvas. This is of 
            importance to us to determine the candles later on
         *  FIXME : I think we can get rid of _canvasXXXX functions once the ElemPageOffsetXXX functions are there. That's for  first review. 
        */
        _canvasOffsetX: function(x, c) { 
            var ox = 0; 
            do { 
                ox += c.offsetLeft;
            }while (c = c.offsetParent) ; // from quirksmode 
            return  x-ox;
        }, 

        _canvasOffsetY: function(y,c) { 
            var oy = 0; 
            do { 
                oy += c.offsetTop;
            } while (c = c.offsetParent) ; // from quirksmode 
            return y-oy;
        }, 

        // Fixme, one can move these out of the object
        _ElemPageOffsetX: function(e) {
            var ox = 0;
            do { 
                ox += e.offsetLeft;
            } while (e = e.offsetParent) ; // from quirksmode 
            return ox;
        }, 

        _ElemPageOffsetY: function(e) { 
            var oy = 0; 
            do { 
                oy += e.offsetTop;
            } while (e = e.offsetParent) ; // from quirksmode 
            return oy;
        }, 

        /* Text handling util functions */
        // TODO: remove old code
        _drawText: function(txt, x, y, style, size) {
            if( !size ) {
                size = 7;
            }
            var cs = this.cs;
            var ctx = this.ctx;
            var color = style.color || cs.label;    
            var font = style.font || '10pt Arial bold';
            var padding = style.padding || 2;
            var align = style.align || 'start';

            ctx.textAlign = align;
            var l = x + 2*padding + ctx.measureText(txt).width;
            //******Artanisz Changes**///
			ctx.strokeStyle = color;
            if( check_textRenderContext(ctx) ) {
                ctx.strokeText(txt, x+padding, y-6, size);
                //deepq
                // ctx.strokeText(txt, x+padding, y-6,
				 //    size, 200, 100, 100, 'sans-serif');
            }
            //******Artanisz Changes**///

            return l;
        }, 
 
        //******Artanisz Changes**///
        // Initial drawing of text over canvas labels
        // In the end, this will be the only method to draw labels
        // Once drawn, text can be modified by using _modifyLabels()
        // Labels are added as children of the chart element
        // To access a particular child, we access its index in this.labels
		_initLabels: function() {
            if( !this.labels['yGrid'] ) {
                var lastchild = this.target.childNodes.length - 1;
                /*
                 * y labels
                 * The y labels is coded by one element that has a varying number of text fields
                 * as its children.
                 */
                var yl = document.createElement('div');
                yl.id = 'yGrid';
                this.target.appendChild(yl);
                lastchild++;
                this.labels['yGrid'] = lastchild;

                /*
                 * x labels
                 */
                var xl = document.createElement('div');
                xl.id = 'xGrid';
                this.target.appendChild(xl);
                lastchild++;
                this.labels['xGrid'] = lastchild;

    			/* 
                 * Add the current value indicator label
                 */
                var label = document.createElement('div');
                label.style.position = 'absolute';
                label.style.visibility = 'hidden';
                //label.style.font = this.ctx.font;
                label.style.font = this.cs.font;

                label.style.color = this.cs.label;
                label.style.height = 15 + 'px';
                // Used for debugging and navigation
                label.id = 'currentValueIndicator';
                this.target.appendChild(label);
	    		lastchild++;
                this.labels['currentValueIndicator'] = lastchild;

                /*
                 * Add the ohlc label
                 */
                label = document.createElement('div');
                label.style.position = 'absolute';
                label.style.visibility = 'visible';
                //label.style.font = this.ctx.font;
                label.style.font = this.cs.font;

                // Used for debugging and navigation
                label.id = 'ohlc';
                label.style.color = this.cs.label;
                label.style.left = (this.loffset + 3) + 'px';
			    // top depends on plot height which is variable
                this.target.appendChild(label);
                lastchild++;
                this.labels['ohlc'] = lastchild;

                /*
                 * Add the crosshair
                 * Note: The crosshair is one element that represents two text fields
                 */
			    var ch = document.createElement('div');
    			ch.id = 'crossHair';
	    		label = document.createElement('div');
		    	label.style.position = 'absolute';
			    label.style.visibility = 'hidden';

                //label.style.font = this.ctx.font;
                label.style.font = this.cs.font;

	    		label.style.color = this.cs.label;
                //label.style.background = this.cs.crosshair;

                label.style.height = 15 + 'px';

                ch.appendChild(label);
	    		label = document.createElement('div');
		    	label.style.position = 'absolute';
			    label.style.visibility = 'hidden';

                //label.style.font = this.ctx.font;
                label.style.font = this.cs.font

	    		//label.style.color = this.cs.label;
                //label.style.background = this.cs.crosshair;

			    ch.appendChild(label);
    			this.target.appendChild(ch);
	    		lastchild++;
		    	this.labels['crossHair'] = lastchild;

			    /* 
                 * overlay indicators
                 */
                var oi = document.createElement('div');
                oi.id = 'overlays';
                this.target.appendChild(oi);
                lastchild++;
                this.labels['overlays'] = lastchild;
                /*
    			 * non-overlay indicators
                 */
                var noi = document.createElement('div');
			    noi.id = 'indicators';
                this.target.appendChild(noi);
                lastchild++;
                this.labels['indicators'] = lastchild;
                // Text fields will be drawn in the old way
			}
        },
        /*
         * _addLabelToElement is designed as a replacement of _drawText
         * Many text labels are added to a container that is a child of this.target
         * Examples are: y grid elements, x grid elements, among others
         */
        _addLabelToElement: function(element, index, text, x, y, color, uniqId, ystop) {
            var self = this;
            if( index < 0 ) return;
            var countChildren = element &&  element.childNodes.length || 0;
            if( !color ) color = this.cs.label;
            var indLabels = text.split(':');

            if( index < countChildren ) {
                // Modify existing element
                /*if (uniqId && indLabels && indLabels.length > 0){
                    element.childNodes[index].childNodes[0].innerHTML = indLabels[0];
                    element.childNodes[index].childNodes[1].innerHTML = indLabels[1];
                    element.childNodes[index].childNodes[1].style.color = color;
                    element.childNodes[index].style.color = '#cecece';
                } else {*/
                    element.childNodes[index].innerHTML = text;
                    element.childNodes[index].style.color = color;
                //}
                element.childNodes[index].style.top = y+'px';
                element.childNodes[index].style.left = x+'px';
                element.childNodes[index].style.visibility = 'visible';

                if (uniqId) {
                    element.childNodes[index].setAttribute('data-id', uniqId);
                    if (!ystop) {
                        element.childNodes[index].className = 'indicator-label';
                    }
                }

            } else {
                // Add new element
                var newChild = document.createElement('div');
				//newChild.innerHTML = text;
                newChild.style.position = 'absolute';
                newChild.style.top = y + 'px';
                newChild.style.left = x+'px';
                newChild.style.visibility = 'visible';
                //newChild.style.font = this.ctx.font;
                newChild.style.font = this.cs.font;

                newChild.style.color = '#cecece';
                /*if (uniqId && indLabels && indLabels.length > 0) {
                    newChild.setAttribute('data-id', uniqId);
                    newChild.className = 'indicator-label';

                    var childName = document.createElement('span'),
                        childValue = document.createElement('span');

                    childName.innerHTML = indLabels[0];
                    childValue.innerHTML = indLabels[1];
                    childValue.style.color = color;
                    newChild.appendChild(childName);
                    newChild.appendChild(childValue);
                } else {*/
                    newChild.style.color = color;
                //}


                element && element.appendChild( newChild );
            }
        },
        /*
         * Hides the reduntant elements of container elements.
         * For example if we need 5 text labels for the y grid but the container element has 6
         * the last element is to be hidden
         */
		_hideRedundantElements: function( element, fhide ) {
		    if (!element) return;
            if( fhide < 0 ) return;
            var countChildren = element.childNodes.length;
            if( fhide >= countChildren ) return;
            for( var k = fhide; k < countChildren; k++ )
                element.childNodes[k].style.visibility = 'hidden';
        },
		//******Artanisz Changes**///
		// Deprecated
        _drawLegend: function(label, offset, color) { 
            var y = 16 + this.tmargin;
            var x = offset*100 + this.loffset;
            //******Artanisz Changes**///
            // var color = this.cs.overlays[offset%this.cs.overlays.length];
            //******Artanisz Changes**///
            this._drawText(label, x, y, {padding:0, color:color});
        }, 

        _olexists: function(prop) {
            return (prop in this.current.overlays);
        }, 
        /* 
            TA functions: will be called in one of the following ways
              1. explicitely. (eg. Someone through UI ads an indicator) 
              2. Upon loading the original data, some indicators may be part of 
                 'default' template. So the functions below get called.
         */

        /*
         Simple overlay/indicator - only for testing!!!
         */
        smp: function(data, coef, color, thickness, uniqId) {
            var prop = 'smp' + coef;

            var update = false;
            if (this._olexists(prop)) {
                update = true;
            }

            var d = [];
            for(var i = 0; i < data.length; i++) {
                var k = data[i][1] / coef;
                d.push(
                    data[i][1] + k
                    );
            };

            var i = {
                type: 'smp',
                offset:this.cs.oloffset,
                data: d,
                color: color,
                thickness: thickness,
                coef: coef,
                uniqId: uniqId
            };

            this.current.overlays[prop] = i;

            if ( update == false ) {
                this.cs.oloffset++;
                this.cp.numoverlays += 1;
            }

            return this;
        },

        /* 
         * ema: is a TA-API, and _ema is an internal API, some other indicators 
                like macd, use this. so it's better to keep them separate 
         */
        ema: function(data, period, which, color, thickness, uniqId) {
            which = which || 'close'; 
            var prop = 'ema' + period + which;
            // console.log(prop);
            //******Artanisz Changes**///
            var fp = period, sp = which;
            var update = false;
            if(this._olexists(prop)) {
                update = true;
                // return;
            } 
            //******Artanisz Changes**///
            var o;
            switch(which) {
                case 'close':
                    o = 3;
                    break;
                case 'high': 
                    o = 1;
                    break;
                case 'low': 
                    o = 2; 
                    break;
                default:
                    o = 3;
            }
            var d = [];
            for(var i = 0; i < data.length; d.push(data[i++][o]));
            var e = this._ema(d, period, which); 
            //******Artanisz Changes**///
            // this.current.overlays[prop] = {data: e, offset:this.cs.oloffset};
            // Parameters (fp, sp and tp) are stored for subsequent reference
            if( !thickness ) {
                thickness = 1;
            }
            var emaObj = {
                type: 'ema',
                data: e,
                offset:this.cs.oloffset,
                fp: fp,
                sp: sp,
                tp: 0,
                color:color,
                thickness:thickness,
                uniqId: uniqId
            };
            this.current.overlays[prop] = emaObj;

            if( update == false ) {
                this.cs.oloffset += 1;
                this.cp.numoverlays += 1;
            }
            //******Artanisz Changes**///

            return this;

        }, 
        _ema: function(data, period, which) {
            var e_ = [];
            var mult = 2.0/(period+1);

            e_[0] = data[0];
            // We should be able to handle sparse data. Also, data
            // that is undefined or null at the beginning
            for(var i = 1; i < data.length; i++) {
                if (data[i] === undefined || data[i] === null ) {
                    e_[i] = e_[i-1];
                    continue;
                } 
                if(e_[i-1]) { 
                    e_[i] = (data[i]*mult) + (1 - mult) * e_[i-1];
                } else {
                    e_[i] = data[i];
                } 
            }
            return e_;
        },

        /* simple moving average : really simple */
        sma: function(data, period, which, color, thickness, uniqId) {
            which = which || 'close';
            var o;
            switch(which) {
                case 'close':
                    o = 3;
                    break;
                case 'high':
                    o = 1;
                    break;
                case 'low' :
                    o = 2;
                    break;
                default:
                    o = 3;
            }
            var prop = 'sma' + period + which;
            //******Artanisz Changes**///
            var fp = period, sp = which;
            var update = false;
            if(this._olexists(prop)) {
                update = true;
                // return;
            } 
            //******Artanisz Changes**///
            var s_ = [];
            var _sum = 0;
            period = period - 1;
            for(i = 0; i < data.length; i++) { 
                if(i < period) { 
                    s_[i] = undefined;
                    continue;
                }
                var t = data.slice(i-period, i+1);
                _sum = 0; 
                for( j in t) { 
                    _sum += t[j][o];

                };
                s_[i] = _sum/(period+1);
            }
            //******Artanisz Changes**///
            // this.current.overlays[prop] = {data:s_, offset: this.cs.oloffset};
            // Parameters (fp, sp and tp) are stored for subsequent reference
            if( !thickness ) {
                thickness = 1;
            }
            this.current.overlays[prop] = {
                type: 'sma',
                data: s_,
                offset: this.cs.oloffset,
                fp: fp,
                sp: sp,
                tp: 0,
                color: color,
                thickness: thickness,
                uniqId: uniqId
            };
            if( update == false ) {           
                this.cs.oloffset++;
                this.cp.numoverlays +=1 ;
            }
            //******Artanisz Changes**///
            return this;    
        },

        /* parabolic SAR */ 
        psar: function(data, af, maxaf, color, thickness, uniqId) {
            var i = 0, UP = 1, DOWN = 2;
            var currtrend = UP;
            var curraf = af;
            var updated = false;
            var d;
            var trendmin, trendmax;
            var prop = 'psar' + af + '-' + maxaf;
            //******Artanisz Changes**///
            var fp = af, sp = maxaf;
            var update = false;
            if (this._olexists(prop)) {
                update = true;
                // return;
            } 
            //******Artanisz Changes**///
            var p_ = [];
            for (i in data) {
                d = data[i];
                j = parseInt(i);
                if (i == 0) {
                    p_[j+1] = d[2]; p_[j] = d[2];
                    trendmin = d[2];
                    trendmax = d[1];
                    continue;
                }
                if (currtrend == UP) { 
                    if(d[1] > trendmax) { 
                        trendmax = d[1];
                        p_[j+1] = p_[j] + curraf*(trendmax - p_[j]);
                        curraf = curraf + af;
                        updated = true;
                    }
                    if (d[2] < p_[j]) { 
                        p_[j] = trendmax;
                        p_[j+1] = trendmax;
                        curraf = af; 
                        currtrend = DOWN;
                        trendmin = d[2];
                        trendmax = d[1];
                        updated = true;
                    } 
                } 
                if (currtrend == DOWN) { 
                    if(d[2] < trendmin) { 
                        trendmin = d[2];
                        p_[j+1] = p_[j] + curraf*(trendmin - p_[j]); 
                        curraf = curraf + af;
                        updated = true;
                    }
                    if (d[1] > p_[j]) { 
                        p_[j] = trendmin;
                        p_[j+1] = trendmin;
                        curraf = af; 
                        currtrend = UP;
                        trendmin = d[2];
                        trendmax = d[1];
                        updated = true;
                    } 
                } 
                if (! updated) { 
                    if(currtrend == UP) 
                        p_[j+1] = p_[j] + curraf*(trendmax - p_[j]); 
                    else 
                        p_[j+1] = p_[j] + curraf*(trendmin - p_[j]); 
                } 
                updated = false;
                if (curraf > maxaf) {curraf = maxaf;}
            }
            //******Artanisz Changes**///
            // this.current.overlays[prop] = {data: p_ };
            // Parameters (fp, sp and tp) are stored for subsequent reference
            if( !color ) {
                var color = this.cs.psar;
            }
            if( !thickness ) {
                thickness = 1;
            }
            this.current.overlays[prop] = {
                type: 'psar',
                data: p_,
                fp: fp,
                sp: sp,
                tp: 0,
                color: color,
                thickness: thickness,
                uniqId: uniqId
            };
            if( update == false ) {
                this.cp.numoverlays +=1 ;
            }
            //******Artanisz Changes**///
            return this;
        },

        bbands: function(data,period, mult, color, thickness, uniqId) {
            var b_ = [];
            var prop = 'bbands' + period  + '-' + mult;
            //******Artanisz Changes**///
            var fp = period, sp = mult;
            var update = false;
            if (this._olexists(prop)) { 
                update = true;
            } 
            //******Artanisz Changes**///

            period = period - 1; 
            for (var i = 0; i < data.length; i++) { 
                if( i < period) { 
                    b_[i] = [undefined, undefined, undefined];
                    continue;
                } 
                var t = data.slice(i-period, i+1); 
                var tc = [];
                var _s = 0;
                for (j in t) { 
                    _s = _s + t[j][3];
                    tc.push(t[j][3]);
                } 
                var sigma = stats.pstdev(tc);
                var mu = _s/(period+1);
                b_[i] = [ (mu +  mult*sigma), mu, (mu - mult * sigma)];
            }
            //******Artanisz Changes**///
            // Parameters (fp, sp and tp) are stored for subsequent reference
            if(!color) {
                var color = new Array( this.cs.bbands[0], this.cs.bbands[1], this.cs.bbands[2] );
			} else if( !(color instanceof Array) ) {
                var color = new Array( this.cs.bbands[0], this.cs.bbands[1], this.cs.bbands[2] );
            }
            if( !thickness ) {
                thickness = 1;
            }
            this.current.overlays[prop] = {
                type: 'bbands',
                data: b_,
                fp: fp,
                sp: sp,
                tp: 0,
                color: color,
                thickness: thickness,
                uniqId: uniqId
            };
            if ( update == false ) {
                this.cp.numoverlays += 1;
            }
            //******Artanisz Changes**///
            return this;
        },
        //******Artanisz Changes**///
        alligator: function(data, color, thickness, uniqId) {
            var prop = 'alligator';
            var update = false;
            if (this._olexists(prop)) { 
                update = true;
			} 
 
            // Calculate the alligator
            var a_ = [];

            var lips; // ssma5
            var teeth; // ssma8
            var jaws; // ssma13

            var measure = [ false, false, false ];
            for( i=0; i<8; i++) {
                a_[i] = [undefined, undefined, undefined];
            }

            for( var i=0; i< data.length; i++ ) {
                if( i < 5 ) {
                    lips = undefined;
                    teeth = undefined;
                    jaws = undefined;
                } else if( i < 8 ) {
                    measure[0] = true;
                    teeth = undefined;
                    jaws = undefined;
                } else if( i < 13 ) {
                    measure[1] = true;
                    jaws = undefined;
                } else {
                    measure[2] = true;
                }
                // Lips
                if( measure[0] ) {
                    if( a_[i-1][0] === undefined ) {
                        lips = 0;
                        for( j = i-4; j <= i; j++ ) lips += data[j][3];
                        lips /= 5;
                    } else {
                        lips = ( lips * 4 + data[i][3] ) / 5;
                    }
                }
                // Teeth
                if( measure[1] ) {
                    if( a_[i-1][1] == undefined ) {
                        teeth = 0;
                        for( j = i-7; j <= i; j++ ) teeth += data[j][3];
                        teeth /= 8;
                    } else {
                        teeth = ( teeth * 7 + data[i][3] ) / 8;
	 		        }
                }
                // Jaws
                if( measure[2] ) {
                    if( a_[i-1][2] == undefined ) {
                        jaws = 0;
                        for( j = i-12; j <= i; j++ ) jaws += data[j][3];
                        jaws /= 13;
                    } else {
                        jaws = ( jaws * 12 + data[i][3] ) / 13;
			        }
                }

                //console.log(jaws,teeth,lips);

                // Note: No offset for lips, teeth and jaws. Draw with offset
			    // a_[i] = [lips, teeth, jaws];
                a_[i+8] = [undefined, undefined, jaws];
                a_[i+5][1] = teeth;
                a_[i+3][0] = lips;
			}
            if(!color) {
			    var color = new Array( '#00FF00', '#FF0000', '#0000FF' );
            } else if( !(color instanceof Array) ) {
                var color = new Array( '#00FF00', '#FF0000', '#0000FF' );
            } else if( color.length != 3 ) {
                var color = new Array( '#00FF00', '#FF0000', '#0000FF' );
            }
            if( !thickness ) {
                thickness = 1;
            }
            var obj = {
                type: 'alligator',
                data: a_,
                fp: 0,
                sp: 0,
                tp: 0,
                color: color,
                thickness: thickness,
                uniqId: uniqId
            };
            this.current.overlays[prop] = obj;

            if ( update == false ) {
                this.cp.numoverlays += 1;
            }
            return this;
        },
        //******Artanisz Changes**///
        /* p1 : is a faster Moving average (numerically lower) 
           p2 : is a slower Moving average (numerically higher)
           signal : is ema signal of p1 - p2 
        */
        macd: function(data, p1, p2, signal, color, thickness, uniqId) {
            var istr = 'MACD(' + p1 + ', ' + p2 + ', ' + signal + ')';
            //******Artanisz Changes**///
            var fp = p1, sp = p2, tp = signal;
            // Disable checking for the purpose of enabling updates
            var update = false;
            // indicator Index
            var iI;
            for(var i in this.current.indicators) { 
                if (this.current.indicators[i].str == istr) {
                    update = true;
                    iI = i;
                    break;
                    // return;
                }
            }
            //******Artanisz Changes**///
            var d = [];
            for(var i = 0; i < data.length; d.push(data[i++][3]));
            var ep1 = this._ema(d, p1);   
            var ep2 = this._ema(d, p2);   
            for(var i = 0; i < ep1.length; i++) { 
                ep1[i] = ep1[i] - ep2[i];
            } 
            ep2 = this._ema(ep1, signal);
            var m_ = [];
            for(i = 0; i < ep1.length; i++) { 
                m_[i] = [ep1[i], ep2[i], (ep1[i] - ep2[i])]; 
            }
            //******Artanisz Changes**///
            // Parameters (fp, sp and tp) are stored for subsequent reference
            // OPTION: update the istr indicator insted of deleting and inserting it again
            if(!color) {
                var color = new Array( this.cs.macd[0], this.cs.macd[1], this.cs.macdhist );
            } else if( !(color instanceof Array) ) {
                var color = new Array( this.cs.macd[0], this.cs.macd[1], this.cs.macdhist );
            }
            if( !thickness ) {
                thickness = 1;
            }
            if( update ) {
                this.current.indicators[iI].data = m_;
            } else {
                var i = {
                    type: 'macd',
                    data: m_,
                    str: istr,
                    fp: fp,
                    sp: sp,
                    tp: tp,
                    color: color,
                    thickness: thickness,
                    height: this.loweriht,
                    uniqId: uniqId
                };
				this.current.indicators.push(i);
                this.cp.numindicators += 1;
			}
            //******Artanisz Changes**///
            return this;
        },

        rsi: function(data, lookback, color, thickness, uniqId) {
            var up = 0, down = 0;
            var rs; 
            //******Artanisz Changes**///
            var fp = lookback;
            //******Artanisz Changes**///
            var istr = 'RSI(' +  lookback + ')';
            //******Artanisz Changes**///
            // Disable checking for the purpose of enabling updates
            var update = false;
            // indicator Index
            var iI;
            for(var i in this.current.indicators) { 
                if (this.current.indicators[i].str == istr) {
                    update = true;
                    iI = i;
                    break;
                }
            } 
            //******Artanisz Changes**///
            var rsi = [undefined]; // empty array plus initialization for 0.
            //******Artanisz Changes**///
            // Bug fix for empty data sets
            if(!color) {
                var color = this.cs.macd[0];
            }
            if( !thickness ) {
                thickness = 1;
			}
            if( data.length == 0 ) {
                if( update ) {
                    return;
                }
                var i = {
                    type: 'rsi',
                    data: rsi,
                    str: istr,
                    fp: fp,
                    sp: 0,
                    tp: 0,
                    color: color,
                    thickness: thickness,
                    height: this.loweriht,
                    uniqId: uniqId
                };

                this.current.indicators.push(i);
                this.cp.numindicators += 1;
				return;
            }
            //******Artanisz Changes**///
            var prev = data[0][3];
            if (lookback > data.length) lookback = data.length;
            for(var i = 1; i < lookback; i++) { 
                var diff = data[i][3] - prev;
                if (diff > 0 ) { 
                    up = up + diff;
                } else { 
                    down = down - diff;
                } 
                rsi.push(undefined);
                prev = data[i][3];
            }
            up /= lookback;
            down /= lookback;
            rs = up/down;
            for (var i = lookback; i < data.length; i++) { 
                var diff = data[i][3] - prev;
                rsi[i] = 100 - 100/(1+rs); 
                if(diff >= 0) {
                    up = (up*(lookback-1)+diff)/lookback;
                    down = down*(lookback-1)/lookback;
                } else { 
                    down = (down*(lookback-1)-diff)/lookback;
                    up = up*(lookback-1)/lookback;
                }; 
                rs = up/down;
                prev = data[i][3];
            }
            //******Artanisz Changes**///
            // Parameters (fp, sp and tp) are stored for subsequent reference
            if( update ) {
                this.current.indicators[iI].data = rsi;
            } else {
                var i = {
                    type: 'rsi',
                    data: rsi,
                    str: istr,
                    fp: fp,
                    sp: 0,
                    tp: 0,
                    color: color,
                    thickness: thickness,
                    height: this.loweriht,
                    uniqId: uniqId
                };
                this.current.indicators.push(i);
				this.cp.numindicators += 1;
            }
            //******Artanisz Changes**///
        },

        stoch: function(data, k, x, d, color, thickness, uniqId) {
            var min, max, pk, d_;
            //******Artanisz Changes**///
            var fp = k, sp = x, tp = d;
            //******Artanisz Changes**///
            var istr = 'STOCH(' + k + ', ' + x + ', ' + d + ')';
            //******Artanisz Changes**///
            // Disable checking for the purpose of enabling updates
            var update = false;

            for(var i in this.current.indicators) {
                if (this.current.indicators[i].str == istr)
                      update = true;
                        iI = i;
                      break;
            }
            console.log(uniqId, 'update:', update);

            //******Artanisz Changes**///
            k = k -1 ;
            pk = [];
            for(i = 0; i < k; pk[i++] = undefined);
            for(var i = k; i < data.length; i++) {
                d_ = _minmax2d(data.slice(i-k, i+1));
                min = d_[0]; max = d_[1];

                pk[i] = (data[i][3] - min)/(max - min) * 100;
            }
            var pk_ = this._ema(pk,x);
            var pd_ = this._ema(pk_,x);

            for(i = 0;i < data.length; i++) { 
                pk_[i] = [pk_[i] , pd_[i]];
            }
            //******Artanisz Changes**///
            // Parameters (fp, sp and tp) are stored for subsequent reference
            if(!color) {
                var color = new Array( this.cs.macd[0], this.cs.macd[1] );
            } else if( ! color instanceof Array ) {
                var color = new Array( this.cs.macd[0], this.cs.macd[1] );
			}
            if( !thickness ) {
                thickness = 1;
            }
            if( update ) {
				var iI = this._getNonOverlayIndicatorIndex(istr);
                this.current.indicators[iI].data = pk_;
            } else {
                var i = {
                    type: 'stoch',
                    data: pk_,
                    str: istr,
                    fp: fp,
                    sp: sp,
                    tp: tp,
                    color: color,
                    thickness: thickness,
                    height: this.loweriht,
                    uniqId: uniqId
                };
                //this.current.indicators.push(i);
                //this.cp.numindicators += 1;
                //console.log('update', update)
            }
            //******Artanisz Changes**///
            //update = false;
            return this;
        },
        // New indicators begin
		/*
         * Awesome oscillator
         */
        awesome: function(data, color, thickness, uniqId) {
            var istr = 'AWESOME',
                color;

            /*if(!color) {
                var color = new Array( this.cs.rcandle, this.cs.gcandle );
            } else if( ! color instanceof Array ) {
                var color = new Array( this.cs.rcandle, this.cs.gcandle );
            } else if( ! color.length != 2 ) {
                var color = new Array( this.cs.rcandle, this.cs.gcandle );
            }*/

            if (!color) {
                color = [ this.cs.rcandle, this.cs.gcandle ];
            }

            if( !thickness ) {
                thickness = 1;
            }
            var _median = [];
			// Calculate values in one pass
            var _sum5;
			var _sum34;
            var awesome_ = [];
			period = 34 - 1;
            for(i = 0; i < data.length; i++) {
                _median.push( (data[i][1] + data[i][2])/2 );
                if(i < period) { 
                    awesome_[i] = undefined;
                    continue;
                }
                _sum5 = 0;
                _sum34 = 0;
                for( j = (i-period); j <= i; j++ ) {
                    _sum34 += _median[j];
                    if( j > i - 5 )
                        _sum5 += _median[j];
                }
                awesome_[i] = _sum5/5 - _sum34/34;
            }
            // Update logic
            var iI = this._getNonOverlayIndicatorIndex( istr );
            if( iI > - 1 ) {
                this.current.indicators[iI].data = awesome_;
            } else {
                var i = {
                    type: 'awesome',
                    data: awesome_,
                    str: istr,
                    fp: 0,
                    sp: 0,
                    tp: 0,
                    color: color,
                    thickness: thickness,
                    height: this.loweriht,
                    uniqId: uniqId
                };

                this.current.indicators.push(i);
			    this.cp.numindicators += 1;
			}
            delete _median;
        },
        /*
         * Acceleration / Deceleration
         */
        ac: function(data, color, thickness, uniqId) {
            var istr = 'AC', color;

            /*if(!color) {
                var color = new Array( this.cs.rcandle, this.cs.gcandle );
            } else if( ! color instanceof Array ) {
                var color = new Array( this.cs.rcandle, this.cs.gcandle );
            } else if( ! color.length != 2 ) {
                var color = new Array( this.cs.rcandle, this.cs.gcandle );
            }*/

            if (!color) {
                color = [ this.cs.rcandle, this.cs.gcandle ];
            }

            if( !thickness ) {
                thickness = 1;
            }
            var _median = [];
            var _awesome = [];
            // Calculate values in one pass
            var _sum5;
            var _sum34;
            var _smaa;
            var ac_ = [];
            period = 34 - 1;
            for(i = 0; i < data.length; i++) {
                _median.push( (data[i][1] + data[i][2])/2 );
                if(i < period) { 
                    _awesome[i] = undefined;
                    ac_[i] = undefined;
                    continue;
			    }
                _sum5 = 0;
                _sum34 = 0;
                for( j = (i-period); j <= i; j++ ) {
                    _sum34 += _median[j];
                    if( j > i - 5 )
                        _sum5 += _median[j];
			    }
			    _awesome[i] = _sum5/5 - _sum34/34;
                if(i < period + 5) {
                    ac_[i] = undefined;
                    continue;
                }
                _smaa = 0;
                for( j = (i-4); j <= i; j++ ) {
                    _smaa += _awesome[j];
                }
                _smaa /= 5;
				ac_[i] = _awesome[i] - _smaa;
			}
            // Update logic
            var iI = this._getNonOverlayIndicatorIndex( istr );
            if( iI > - 1 ) {
                this.current.indicators[iI].data = ac_;
            } else {
                var i = {
                    type: 'ac',
                    data: ac_,
                    str: istr,
                    fp: 0,
                    sp: 0,
                    tp: 0,
                    color: color,
                    thickness: thickness,
                    height: this.loweriht,
                    uniqId: uniqId
                };
                this.current.indicators.push(i);
                this.cp.numindicators += 1;
            }
            delete _median;
            delete _awesome;
        },
        /*
         * Williams' Accumulation / Distribution
         */
        w_ad: function(data, color, thickness, uniqId) {
            var istr = 'W_A/D';
            if(!color) {
                var color = this.cs.macd[0];
            } 
            if( !thickness ) {
				var thickness = 1;
            }
            var w_ad_ = [];
            var trh;
            var trl;
            var curad;
            // Calculate
            for(i = 0; i < data.length; i++) {
                if( i > 0 ) {
                    trh = Math.max( data[i][1], data[i-1][3]);
                    trl = Math.min( data[i][2], data[i-1][3]);
                    if( data[i][3] > data[i-1][3] ) { curad = data[i][3] - trl; }
					else if( data[i][3] < data[i-1][3] ) { curad = data[i][3] - trh; }
                    else { curad = 0; }
                    w_ad_[i] = curad + w_ad_[i-1];
                } else {
                    w_ad_[i] = 0;
                }
            }
            // Update logic
            var iI = this._getNonOverlayIndicatorIndex( istr );
            if( iI > - 1 ) {
                this.current.indicators[iI].data = w_ad_;
            } else {
                var i = {
                    type: 'w_ad',
                    data: w_ad_,
                    str: istr,
                    fp: 0,
                    sp: 0,
                    tp: 0,
                    color: color,
                    thickness: thickness,
                    height: this.loweriht,
                    uniqId: uniqId
                };
                this.current.indicators.push(i);
                this.cp.numindicators += 1;
            }
        },
        /*
         * Average true range
         */
        atr: function(data, period, color, thickness, uniqId) {
            var istr = 'ATR('+period+')';
            if(!color) {
                var color = this.cs.macd[0];
            }
            if( !thickness ) {
                thickness = 1;
			}
			// True range
            _tr = [];
            atr_ = [];
            var sum;
            var periodminusone = period - 1;
            // Calculate
            for(i = 0; i < data.length; i++) {
                if( i == 0 ) {
                    _tr[i] = data[i][1] - data[i][2];
                } else {
                    _tr[i] = Math.max( 
						(data[i][1] - data[i][2]), 
						(data[i-1][3] - data[i][2]),
						(data[i-1][3] - data[i][2]) );
                }
                if(i < periodminusone) {
                    atr_[i] = undefined;
                } else {
                    sum = 0;
                    for(j = i-periodminusone; j <= i; j++) {
                        sum += _tr[j];
                    }
                    atr_[i] = sum / period;
                }
            }
            // Update logic
            var iI = this._getNonOverlayIndicatorIndex( istr );
            if( iI > - 1 ) {
                this.current.indicators[iI].data = atr_;
            } else {
                var i = {
                    type: 'atr',
                    data: atr_,
                    str: istr,
                    fp: period,
                    sp: 0,
                    tp: 0,
                    color: color,
                    thickness: thickness,
                    height: this.loweriht,
                    uniqId: uniqId
                };
                this.current.indicators.push(i);
                this.cp.numindicators += 1;
            }
            delete _tr;
        },
        /*
         * Commodity Channel Index
         */
		cci: function(data, period, color, thickness, uniqId) {
            var istr = 'CCI('+period+')';
            if(!color) {
                var color = this.cs.macd[0];
            }
            if( !thickness ) {
                thickness = 1;
            }
            // Typical price
            _tp = [];
            // Absolute values
            _d = [];
            cci_ = [];
            var sum;
            var periodminusone = period - 1;
			// Calculate
            for(i = 0; i < data.length; i++) {
                _tp[i] = (data[i][1] + data[i][2] + data[i][3]) / 3;
                if(i < periodminusone) {
					_d[i] = undefined;
                    cci_[i] = undefined;
                    continue;
                }
                sum = 0;
                for(j = i-periodminusone; j <= i; j++) {
                    sum += _tp[j];
                }
                _d[i] = _tp[i] - (sum / period);
                if( _d[i-periodminusone] === undefined ) { 
                    cci_[i] = undefined;
                    continue;
                }
                sum = 0;
                for(j = i-periodminusone; j <= i; j++) {
                    sum += _d[j];
                }
                cci_[i] = (( sum / period ) * 0.015) / _d[i];
            }
            // Update logic
            var iI = this._getNonOverlayIndicatorIndex( istr );
            if( iI > - 1 ) {
                this.current.indicators[iI].data = cci_;
            } else {
                var i = {
                    type: 'cci',
                    data: cci_,
                    str: istr,
                    fp: period,
                    sp: 0,
                    tp: 0,
                    color: color,
                    thickness: thickness,
                    height: this.loweriht,
                    uniqId: uniqId
                };
                this.current.indicators.push(i);
                this.cp.numindicators += 1;
            }
            delete _tp;
            delete _d;
        },
        /*
         * Momentum
		 */
        momentum: function(data, period, which, color, thickness, uniqId) {
            console.log('momentum which', which);
            var istr = 'MOMENTUM('+period+','+ which+')';
            if(!color) {
                var color = this.cs.macd[0];
            }
            if( !thickness ) {
                thickness = 1;
            }
            var o;
            switch(which) {
            case 'close':
                o = 3;
                break;
            case 'high':
                o = 1;
                break;
            case 'low':
                o = 2;
                break;
            default:
                o = 3;
            }
            momentum_ = [];
            // Calculate
            for(i = 0; i < data.length; i++) {
                if( i < period ) {
                    momentum_[i] = undefined;
					continue;
                }
                momentum_[i] = (data[i][o] / data[i-period][o]) * 100;
            }
            // Update logic
            var iI = this._getNonOverlayIndicatorIndex( istr );
            if( iI > - 1 ) {
                this.current.indicators[iI].data = momentum_;
            } else {
                var i = {
                    type: 'momentum',
                    data: momentum_,
                    str: istr,
                    fp: period,
                    sp: 0,
                    tp: 0,
                    color: color,
                    thickness: thickness,
                    height: this.loweriht,
                    uniqId: uniqId,
                    which: which
                };
                this.current.indicators.push(i);
                this.cp.numindicators += 1;
            }
        },
        /*
         * Moving average of oscillator (OsMA)
         */
		osma: function(data, p1, p2, signal, color, thickness, uniqId) {
            var istr = 'OSMA(' + p1 + ', ' + p2 + ', ' + signal + ')';
            var fp = p1, sp = p2, tp = signal;
            // Disable checking for the purpose of enabling updates
            var d = [];
            for(var i = 0; i < data.length; d.push(data[i++][3]));
            var ep1 = this._ema(d, p1);   
            var ep2 = this._ema(d, p2);   
            for(var i = 0; i < ep1.length; i++) { 
                ep1[i] = ep1[i] - ep2[i];
            } 
            ep2 = this._ema(ep1, signal);
            var m_ = [];
            for(i = 0; i < ep1.length; i++) { 
                m_[i] = ep1[i] - ep2[i]; 
            }
            // Parameters (fp, sp and tp) are stored for subsequent reference
            if(!color) {
			    var color = this.cs.macd[0];
			}
            if( !thickness ) {
                thickness = 1;
            }
            // Update logic
            var iI = this._getNonOverlayIndicatorIndex( istr );
            if( iI > - 1 ) {
			    this.current.indicators[iI].data = m_;
			} else {
                var i = {
                    type: 'osma',
                    data: m_,
                    str: istr,
                    fp: fp,
                    sp: sp,
                    tp: tp,
                    color: color,
                    thickness: thickness,
                    height: this.loweriht,
                    uniqId: uniqId
                };
                this.current.indicators.push(i);
                this.cp.numindicators += 1;
            }
            delete ep1;
            delete ep2;
        },
        /*
         * De Marker
         */
        dem: function(data, period, color, thickness, uniqId) {
            var istr = 'DEM('+period+')';
            if(!color) {
                var color = this.cs.macd[0];
            }
            if( !thickness ) {
                thickness = 1;
            }
            dem_ = [];
            var _demax = [];
            var _demin = [];
            var periodminusone = period - 1;
            var summin;
            var summax;
            // Calculate
            for(i = 0; i < data.length; i++) {
                if( i > 0 ) {
                    if(data[i][1] > data[i-1][1]) {
                        _demax[i] = data[i][1] - data[i-1][1];
                    } else {
                        _demax[i] = 0;
                    }
                    if(data[i][2] < data[i-1][2]) {
                        _demin[i] = data[i-1][2] - data[i][2];
                    } else {
                        _demin[i] = 0;
                    }
                } else {
                    _demax[i] = 0;
                    _demin[i] = 0;
                }
                if( i < periodminusone ) {
                    dem_[i] = undefined;
                    continue;
                }
                summin = 0;
                summax = 0;
                for(j = i-periodminusone; j <= i; j++) {
                    summin += _demin[j];
                    summax += _demax[j];
                }
                dem_[i] = ( summax / period ) / ( (summax / period ) + ( summin / period ) );
            }
            // Update logic
            var iI = this._getNonOverlayIndicatorIndex( istr );
            if( iI > - 1 ) {
                this.current.indicators[iI].data = dem_;
            } else {
                var i = {
                    type: 'dem',
                    data: dem_,
                    str: istr,
                    fp: period,
                    sp: 0,
                    tp: 0,
                    color: color,
                    thickness: thickness,
                    height: this.loweriht,
                    uniqId: uniqId
                };
				this.current.indicators.push(i);
                this.cp.numindicators += 1;
            }
            delete _demax;
            delete _demin;
        },
        /*
         * Williams percent range
         */
        wpr: function(data, period, color, thickness, uniqId) {
            var istr = 'WPR('+period+')';
            if(!color) {
                var color = this.cs.macd[0];
            }
            if( !thickness ) {
                thickness = 1;
            }
            wpr_ = [];
            var hin;
            var lon;
            var periodminusone = period - 1;
            // Calculate
            for(i = 0; i < data.length; i++) {
                hin = data[i][1];
                lon = data[i][2];
                for(j = i-periodminusone; j <= i; j++) {
                    if( j >= 0 ) {
                        if( data[j][1] > hin ) hin = data[j][1];
                        if( data[j][2] < lon ) lon = data[j][2];
                    }
                }
                wpr_[i] = 0 - ( hin - data[i][3] ) / ( hin - lon ) * 100;
            }
            // Update logic
            var iI = this._getNonOverlayIndicatorIndex( istr );
            if( iI > - 1 ) {
                this.current.indicators[iI].data = wpr_;
            } else {
                var i = {
                    type: 'wpr',
                    data: wpr_,
                    str: istr,
                    fp: period,
                    sp: 0,
                    tp: 0,
                    color: color,
                    thickness: thickness,
                    height: this.loweriht,
                    uniqId: uniqId
                };
                this.current.indicators.push(i);
                this.cp.numindicators += 1;
            }
        },
        /*
         * Envelopes
         */
        envelopes: function(data, period, shifting, color, thickness, uniqId) {
		    var prop = 'envelopes'+period+'-'+shifting;
            var update = false;
            if (this._olexists(prop)) { 
                update = true;
            } 
            if(!color) {
                var color = new Array( this.cs.macd[0], this.cs.macd[1] );
            } else if( !(color instanceof Array) ) {
                var color = new Array( this.cs.macd[0], this.cs.macd[1] );
            } else if( color.length != 2 ) {
                var color = new Array( this.cs.macd[0], this.cs.macd[1] );
            }
            if( !thickness ) {
                thickness = 1;
            }

            e_ = [];
            var periodminusone = period - 1;
            var sum;
            var sma;
            // Calculate
            for(i = 0; i < data.length; i++) {
                if( i < periodminusone ) {
                    e_[i] = [undefined, undefined];
                    continue;
                }
                sum = 0;
                for(j = i-periodminusone; j <= i; j++) {
                    sum += data[j][3];
				}
                sma = sum / period;
                e_[i] = [ sma * (1 + shifting / 1000), sma * (1 - shifting / 1000)];
            }
            var obj = {
                type: 'envelopes',
                data: e_,
                fp: period,
                sp: shifting,
                tp: 0,
                color: color,
                thickness: thickness,
                uniqId: uniqId
            };
            //console.log('envelopes', obj);
            this.current.overlays[prop] = obj;

		    if ( update == false ) {
                this.cp.numoverlays += 1;
            }
            return this;
        },
		// New indicators end
        //******Artanisz Changes**///
		setDigits: function( x ) {
            this.digitsafterdecimal = x;
		},
        updateRightSpace: function() {
            // Adjust the right space
            var lastcandle = this.current.ohlc.length - 1;
            if( lastcandle < 0 ) return;
            this._initPlotCanvas();
            var l = Math.round( this.ctx.measureText(this.current.ohlc[lastcandle][3].toFixed(this.digitsafterdecimal)).width );
            if( l >= ( this.rmargin - 10 ) ) {
			    this.rmargin = l + 10;
                // Update plot width
                this.plotwidth = this.width - this.loffset - this.rmargin;
                // the minimum plot width is 20
                if( this.plotwidth < 20 ) {
                    this.plotwidth = 20;
			    }
            }
        },
        findClosestCandleCrossHair: function( x ) {
            // TODO: some of the following are candidates for class fields
            // Note: counting candles start from 0
            var cp = this.cp;
            var c = Math.round(cp.cwidth/2); // center of first (and every) cdl
            var csize = Math.round(cp.cwidth/1.4);
            var xmin = cp.begin;
            var candle = (x - c + Math.round(csize/2) - this.loffset) / cp.cwidth + xmin;
            candle = Math.round(candle) - 1;
            if(candle < 0 ) {
                candle = 0;
            }
            if( candle >= this.current.ohlc.length ) {
                candle = this.current.ohlc.length - 1;
            }
            return candle;
        },
        findClosestCandle: function( x ) {
            // TODO: some of the following are candidates for class fields
            // Note: counting candles start from 0
            var cp = this.cp;
            var c = Math.round(cp.cwidth/2); // center of first (and every) cdl 
            var csize = Math.round(cp.cwidth/1.4);
            var xmin = cp.begin;
			var candle = (x - c + Math.round(csize/2) - this.loffset) / cp.cwidth + xmin;
            candle = Math.round(candle);
            if( candle >= this.current.ohlc.length ) {
                candle = this.current.ohlc.length - 1;
            }
            return candle;
		},
		yToValue: function( y ) {
            // TODO: some of the following are candidates for class fields
            var cp = this.cp;
            // TODO: _exp should be accessible in the class
            var _exp = (cp.logscale ? Math.exp : function(x) {return x}); 
			var h = this.topmargin + this.plotht;
            var scale = this.plotht / (cp.ymax - cp.ymin);
            // alert("y " + y + "h " + h + " scale " + scale + " real " + realy );
            var value = _exp(( h - (this.oldheight / (this.height + 0.0)) * y ) / scale + cp.ymin );
            // var value = _exp(( h - y ) / scale + cp.ymin );
            return value;
		},
        candleToX: function( candle ) {
            var cp = this.cp;
            var c = Math.round(cp.cwidth/2); // center of first (and every) cdl 
            var csize = Math.round(cp.cwidth/1.4);
            var xmin = cp.begin;
            var x = (c + (candle - xmin)*cp.cwidth) - Math.round(csize/2) + this.loffset;
            return x;
        },
        valueToY: function( value ) {
			var cp = this.cp;
            var _log = (cp.logscale ? Math.log : function(x) {return x});

            var range = cp.ymax - cp.ymin;
            var scale = this.plotht/range; // scale: how much a unit takes on the plot
            var h = this.topmargin + this.plotht;
            var y = h - Math.round((_log( value )-cp.ymin)*scale);
			y = this._scaledY( y );
            return y;
		},
        /* x and y are normalised with findClosestCandle() and yToValue()
           If touch coordinates are in the vicinity of a trend line
           the start point, or the end point, or the whole line gets selected.
           The code returned is AB (A = 0 is omitted) where A is the trend line index
           and b is a code: 1 for start point, 2 for the whole line and 3 for the end point 
           Code 4 stays for horizontal line and Code 5 for vertical line
        */
        searchTrendLine: function( cx, cy ) {
            var x = this.findClosestCandle( cx );
            var y = this.yToValue( cy );
            var lines = this.lines;
            var a,b;
            for(var i = 0; i < lines.length; i++) { 
                // Match begin
                if( x == lines[i][0][0] ) {
                    if( Math.abs( y / lines[i][0][1] - 1 ) < 0.005 ) {
                        return ( i*10 + 1 );
					}
                }
                // Match end
                if( x == lines[i][1][0] ) {
                    if( Math.abs( y / lines[i][1][1] - 1 ) < 0.005 ) {
                        return ( i*10 + 3 );
                    }
                }
                // Match middle
                // if x is in between
                if( ( lines[i][0][0] <= x ) && ( x <= lines[i][1][0] ) ||
				   ( ( lines[i][1][0] <= x ) && ( x <= lines[i][0][0] ) ) ) {
					// if y is in between
                    if( ( lines[i][0][1] <= y ) && ( y <= lines[i][1][1] ) ||
	                   ( ( lines[i][1][1] <= y ) && ( y <= lines[i][0][1] ) ) ) {
                        // if x and y satisfy the line equation (y = ax + b), then select the line
                        a = ( lines[i][1][1] - lines[i][0][1] ) / ( lines[i][1][0] - lines[i][0][0] );
                        b = lines[i][0][1] - a * lines[i][0][0];
                        if( Math.abs( y / ( a * x + b ) - 1 ) < 0.01 ) {
                            return ( i*10 + 2 );
                        }
                        // x = 0 case
                        if( lines[i][0][0] == lines[i][1][0] ) {
                            return ( i*10 + 2 );
						}
                    }
                }
            }
 
            // Search for horizontal lines
            for(var i = 0; i < this.horizontallines.length; i++) {
                if( Math.abs( this.horizontallines[i][0] - cy ) < 3 ) {
                    return (i*10 + 4);
                }
			}
			// Search for vertical lines
            for(var i = 0; i < this.verticallines.length; i++) {
                if( Math.abs( this.verticallines[i][0] - cx ) < 3 ) {
                    return (i*10 + 5);
                }
            }
			return -1;
        }
        //******Artanisz Changes**///
    };
    /* below is needed to give the object all the methods reqd. */
    $.tickp.fn.init.prototype = $.tickp.fn;

    /* the chartparams object. Used by several plot routines to findout current
        chart settings. Used for plotting */
    $.tickp.chartparams  = {
        init: function(plot) {
            this.plot = plot; // have a ref back to plot 
            return this;
        },  
        logscale: false,
        autoscale: true,
        type: 1, // 1: candlestick, 2: ohlc, 3: linecharts 
        w: undefined,
        h: undefined,
        candles : undefined,
        cwidth:undefined, 
        csize:undefined,
        ymin:undefined,
        ymax:undefined,
        numoverlays:0, // number of overlays.
        numindicators:0, // number of overlays.
        maxylabels: 5,
        maxxlabels: 5,
        minwidth: 8 //minimum width of a candle
    
    };
    /* assigning prototype */
    $.tickp.chartparams.init.prototype = $.tickp.chartparams;

    /* util functions */
    /* Get the canvas for us. */ 
    function  _getCanvas(w, h) {
        c = document.createElement('canvas');
        c.id = Math.round(Math.random()*100);
        c.width = w;
        c.height = h;
        return c; 
    };
    function _minmax2d(data) {
        var max = -Infinity;
        var min = Infinity;
        
        for(var i in data) {
            for (j in data[i]) {
                if (data[i][j] >= max)  max = data[i][j];
                if (data[i][j] < min) min = data[i][j]; 
            }
        }
        return [min, max];
    };

    function _minmax1d(data) { 
        var max = -Infinity;
        var min = Infinity;
        
        for(var i in data) {
           if (data[i] >= max)  max = data[i];
           if (data[i] < min) min = data[i]; 
        }
        return [min, max];
    };

    function _drawline(ctx, x1, y1, x2, y2, color, width, params) {
        color = color || "#111111";
        var width = width || 1.0;

        var w = ctx.lineWidth;
        ctx.lineWidth = width;
        ctx.strokeStyle = color;

        if (params && params.dash) {
            ctx.setLineDash(params.dash);
        }

        ctx.beginPath();
        ctx.moveTo(x1,y1);
        ctx.lineTo(x2,y2);
        ctx.stroke();
        ctx.closePath();
        ctx.lineWidth = w;

        if (params && params.dash) {
            ctx.setLineDash([]);
        }

    };

    function _drawText(ctx, text, x, y, width, font, color) {
        var prev_font = ctx.font,
            prev_color = ctx.fillStyle;
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.font = prev_font;
        ctx.fillStyle = prev_color;
    }

    var _mouseWheelZoom = function(event) {
        event.preventDefault();
        (event.wheelDelta > 0 || event.detail < 0) ? this.plot.zoom(1) : this.plot.zoom(0);
    };

	//******Artanisz Changes**///
    var _moveCrosshair = function(event) {
        if (!this.plot.crosshair) return;

        if(event.touches) {
            if(event.touches.length > 0) {
                event.preventDefault();
                event = event.touches[0];
			}
        }
        var ctx = this.plot.octx;
        var cx = event.pageX - this.plot._ElemPageOffsetX(this);
        var cy = event.pageY - this.plot._ElemPageOffsetY(this);
        this.plot.drawCrosshair( cx, cy );
    };
    //******Artanisz Changes**///
 
    /* event handlers in the default 'trendline' mode */
    //******Artanisz Changes**///
    // Text field command. If greated than zero, then the selected text field will be resized
    var tfcmd;
    // TODO: Change the name of the function. It does more than trend line processing
    //******Artanisz Changes**///
    var _beginTrendLine = function(event) { 
        //******Artanisz Changes**///
        if(event.touches) {
            if(event.touches.length > 0) {
                event.preventDefault();
                event = event.touches[0];
            }
        }
        //******Artanisz Changes**///
        var ctx = this.plot.octx;
        ctx.begin_x = event.pageX - this.plot._ElemPageOffsetX(this);
        ctx.begin_y = event.pageY - this.plot._ElemPageOffsetY(this);
        //******Artanisz Changes**///
        tfcmd = 0;
        // Capture line
        this.plot.selectedtrendline = this.plot.searchTrendLine( ctx.begin_x, 
            ctx.begin_y );
        if( this.plot.selectedtrendline >= 0 ) {
			this.plot.resetSelectedTextFields();
            ctx.start = false;
        } else if( this.plot.selectTextField( ctx.begin_x, ctx.begin_y ) ) {
			ctx.start = false;
            tfcmd = this.plot.willResizeTextField( ctx.begin_x, ctx.begin_y );
		} else {
            ctx.start = true;
		}
        //******Artanisz Changes**///
    };

    var _drawTrendLine = function(event) {
        //******Artanisz Changes**///
        if(event.touches) {
            if(event.touches.length > 0) {
                event.preventDefault();
                event = event.touches[0];
            }
        }
        //******Artanisz Changes**///
        ctx = this.plot.octx;
        var myx = event.pageX - this.plot._ElemPageOffsetX(this);
        var myy = event.pageY - this.plot._ElemPageOffsetY(this);
 
        //******Artanisz Changes**///
        // Stay within the borders of the main chart
		var top = this.plot._scaledY( this.plot.tmargin );
        var bottom = this.plot._scaledY( this.plot.tmargin + this.plot.plotht );
        if( myy > bottom ) myy = bottom;
        else if( myy < top) myy = top;
        //******Artanisz Changes**///
 
        if (ctx.start) { 
            this.plot.drawlines();
            //******Artanisz Changes**///
            this.plot.drawTextFields();
            //******Artanisz Changes**///
            ctx.beginPath();
            ctx.strokeStyle = plot.cs.trendline;
            ctx.lineWidth = 1;
            ctx.moveTo(ctx.begin_x, ctx.begin_y);
            ctx.lineTo(myx, myy);
            ctx.stroke();
            ctx.closePath();
        } else { 
        //******Artanisz Changes**///
        // Move trend lines around
        if( this.plot.selectedtrendline >= 0 ) {
            var selectedline = Math.floor( this.plot.selectedtrendline / 10 );
			var bem = this.plot.selectedtrendline % 10;
            var deltax;
            var deltay;
            switch( bem ) {
                case 1:
                    this.plot.lines[selectedline][0][0] = this.plot.findClosestCandle( myx );
                    this.plot.lines[selectedline][0][1] = this.plot.yToValue( myy );
                    break;
                case 2:
                    deltax = this.plot.findClosestCandle( myx ) - this.plot.findClosestCandle( ctx.begin_x );
                    deltay = this.plot.yToValue( myy ) - this.plot.yToValue( ctx.begin_y );
                    var getback = 0;
                    this.plot.lines[selectedline][0][0] += deltax;
                    this.plot.lines[selectedline][0][1] += deltay;
                    this.plot.lines[selectedline][1][0] += deltax;
                    this.plot.lines[selectedline][1][1] += deltay;
                    ctx.begin_x = myx;
					ctx.begin_y = myy;
                    break;
                case 3:
                    this.plot.lines[selectedline][1][0] = this.plot.findClosestCandle( myx );
                    this.plot.lines[selectedline][1][1] = this.plot.yToValue( myy );
                    break;
                case 4:
                    // Horizontal line
                    if( myy < this.plot._scaledY( this.plot.tmargin )) 
                       myy = this.plot._scaledY( this.plot.tmargin );
					if( myy > this.plot._scaledY( this.plot.tmargin + this.plot.plotht ))
					   myy = this.plot._scaledY( this.plot.tmargin + this.plot.plotht );
                    this.plot.horizontallines[selectedline][0] = myy;
                    break;
                case 5:
                    // Vertical line
					if( myx < this.plot.loffset ) myx = this.plot.loffset;
					if( myx > this.plot.loffset + this.plot.plotwidth ) 
					   myx = this.plot.loffset + this.plot.plotwidth;
                    this.plot.verticallines[selectedline][0] = myx;
                    break;
                default:
			}
            this.plot.drawlines();
            this.plot.drawTextFields();		    
        } else {
            // drawTextFields must be called after drawlines()
            // Change the coordinates of text fields
            this.plot.drawlines();
            var deltax;
            var deltay;
            if(  tfcmd > 0 ) {
                // x, y coordinate system
                deltax = myx - ctx.begin_x;
                deltay = myy - ctx.begin_y;
                tfcmd = this.plot.resizeSelectedTextField( tfcmd, deltax, deltay );
            } else {
                // Candle, Value coordinate system
                deltax = this.plot.findClosestCandle( myx ) - this.plot.findClosestCandle( ctx.begin_x );
                deltay = this.plot.yToValue( myy ) - this.plot.yToValue( ctx.begin_y );
                this.plot.moveSelectedTextField( deltax, deltay );
            }
            ctx.begin_x = myx;
            ctx.begin_y = myy;
            this.plot.drawTextFields();		    
        //******Artanisz Changes**///
        }
            var cdl = this.plot._getCandle(myx, myy);
		    if (cdl) { 
			    this.plot._showInfo(cdl, event.pageX, event.pageY);
		    } else { 
                this.plot.infodiv.style.display = 'none'; 
            }
        }
    };

    function _endTrendLine(event) { 
        //******Artanisz Changes**///
        if(event.changedTouches) {
            if( event.changedTouches.length > 0 ) {
                event.preventDefault();
                event = event.changedTouches[0];
            }
        }
        //******Artanisz Changes**///
        ctx = this.plot.octx;
        // completed one line 
        var bx = ctx.begin_x;
        var by = ctx.begin_y;
        var ex = this.plot._canvasOffsetX(event.pageX, this);
        var ey = this.plot._canvasOffsetY(event.pageY, this);
        var len = Math.sqrt(Math.pow((ex-bx),2) + Math.pow((ey-by),2));
		//******Artanisz Changes**///
        if ( ( len > 50 ) && ctx.start) { 
            this.plot.lines.push([[this.plot.findClosestCandle( bx ), this.plot.yToValue( by )],
					   [this.plot.findClosestCandle( ex ), this.plot.yToValue( ey )]]);
        }
        ctx.start = false;
		this.plot.drawlines();
        this.plot.drawTextFields();
        //******Artanisz Changes**///
    };

    function _keyActions(event) { 
        var p = this.plot;
        if(event.ctrlKey) { 
            if(event.keyCode === 90) {
                var line = p.lines.pop();
                if(line) 
                    p.undolines.unshift(line);
                p.drawlines();
            } else if( event.keyCode === 89) { 
                var line = p.undolines.shift();
                if(line) 
                    p.lines.push(line); 
                p.drawlines();
            } 
        } else if(event.altKey) {
            if (event.keyCode === 107) { 
                p.zoom(1);
            } else if (event.keyCode === 109) { 
                p.zoom(0);
            } 
        } 
        
    }; 

    /* event handlers in the Pan and zoom mode */
    //******Artanisz Changes**///
    // Index of the indicator to resize
    var resizeindicators = -1;
	//******Artanisz Changes**///
    var _beginPanning = function(event) { 
        //******Artanisz Changes**///
        if(event.touches) {
            event.preventDefault();
            if(event.touches.length == 1) {
                event = event.touches[0];
            } 
        }
        //******Artanisz Changes**///
        this.style.cursor = 'move';
        var ctx = this.plot.octx;
        ctx.begin_x = this.plot._canvasOffsetX(event.pageX, this);
        ctx.begin_y = this.plot._canvasOffsetY(event.pageY, this);
        ctx.start = true;
        //******Artanisz Changes**///
        resizeindicators = this.plot.whichIndicator( ctx.begin_y );
        //******Artanisz Changes**///
    };

    

    //******Artanisz Changes**///
	var doublemove = false;
    //******Artanisz Changes**///
    var _doPanning = function(event) {
        var p = this.plot;
        var ctx = p.octx;
        //******Artanisz Changes**///
        if(event.touches) {
            event.preventDefault();
            if(event.touches.length == 1) {
                event = event.touches[0];
            } 
        }
        //******Artanisz Changes**///
        var myx = p._canvasOffsetX(event.pageX, this);
        var myy = p._canvasOffsetY(event.pageY, this);
        var xo = myx - ctx.begin_x;
        var yo = myy - ctx.begin_y;
 
        //******Artanisz Changes**///
        // Resize indicators logic
        if( resizeindicators > -1 ) {
            this.plot.redrawindicators = true;
			this.plot._moveIndicatorBorder( resizeindicators,
			    Math.round((-yo) * (this.plot.oldheight / this.plot.height)) );
        }
        //******Artanisz Changes**///
        
        if(ctx.start) {
            //******Artanisz Changes**///
			// The speed of movement should be 1.5 times faster
            // if (Math.abs(xo) > p.cp.minwidth) {
		    // size = Math.floor(xo/p.cp.minwidth); 
			size = Math.round(xo/p.cp.minwidth); 
            if( size != 0 ) {
			    if( doublemove ) {
				    size *= 2;
				    doublemove = false;
			    } else {
				    doublemove = true;
			    }

			    p._doplot(p.ctx, p.current, size);
			    ctx.begin_x = myx;
			    ctx.begin_y = myy;
            } else if( resizeindicators > -1 ) {
                p._doplot(p.ctx, p.current);
                ctx.begin_y = myy;
            }
		    // } 
		    //******Artanisz Changes**///               
        }
        //update horizontal lines positions while panning/moving
        for(var i=0; i<=this.plot.horizontallines.length -1; i++){
            this.plot.horizontallines[i][0] = this.plot.valueToY(this.plot.horizontallines[i][3]);
        }
        // for(var i=0; i<=this.plot.verticallines.length -1; i++){
        //     this.plot.verticallines[i][0] = this.plot.valueToY(this.plot.verticallines[i][3]);
        // }
        this.plot.drawlines();
    };  
    var _endPanning = function(event) { 
        //******Artanisz Changes**///
        if( event.changedTouches ) {
            event.preventDefault();
        }
        resizeindicators = -1;
        //******Artanisz Changes**///
        this.plot.octx.start = false;
        this.style.cursor = 'default';
        
    };
    //******Artanisz Changes**///
    var _touchzoom = function(event) {
        var p = this.plot;
        event.preventDefault();
        if(event.scale) {
            // TODO: In order to have a smoother zoom, we need to determine
            // the relation between the event scale and the minimum witdh
            // Ideally, there would be e better graphical engine.
            // The current one is biased towards the model a way too much.
 
            // zoomCenter is a leftover from an erroneous previous version
            // it is used to calculate the offset on the x-axis once the zoom has been done
            // Though the zoom center works well under the XCode simulator
            // in reality it does not work correctly (probably because it changes constantly)
            // 200 instead, is an arbitrary value. It is a random point used to measure the offset.
            var zoomCenter = 200;
            var newMinWidth = p.cp.minwidth;
            if ( event.scale > 1 ) {
                newMinWidth += 1;
            } else if ( event.scale < 1 ) {
                newMinWidth -= 1;
            }
            if( newMinWidth < 1 ) {
                newMinWidth = 1;
            } else if( newMinWidth > 40 ) {
                newMinWidth = 40;
            }
 
            // Due to the current zoom technique (increasing the minimum width)
            // there is an undesired offset on the x axis
            // The offset is fixed by the following technique:
            // We can measure coordinates in terms of relative coordinates
            // A relative coordinate = coordinate / minimum width
            // When the minimum width changes (zoom), there is an offset deltaRelative
            // The offset is the difference between the old relative coordinate and the new one
            // The offset may be positive (zoom in) or negative (zoom out)
            var zoomRelative = Math.floor( zoomCenter / p.cp.minwidth );
            var newZoomRelative = Math.floor( zoomCenter / newMinWidth );
            var deltaRelative = zoomRelative - newZoomRelative;

            p.cp.minwidth = newMinWidth;

            // Draw with offset
            p._doplot(p.ctx, p.current, deltaRelative );
        }
    };
    //******Artanisz Changes**///
    // Function below is not perfect. But as close to usable. 
    // Some Date formats like '12-Oct' fail. But yes, thats understandable.  
    function _getDateTs(str) { 
        var d;
        d = new Date(str).getTime();
        if (!isNaN(d)) {
            return d;
        }
        str = str.replace(/-/g, ' '); //1 Jan 2010 works but 1-Jan-2010 doesn't
        d = new Date(str).getTime();
        if (!isNaN(d)) {
            return d;
        }
        // may be what we've is a time stamp. 
        if((d = parseInt(str)) > 100000) { 
            // we are not handling something that's up on 1st Jan 1971, as yet.
            // assume it is a valid time stamp and just send it back.
           return d;
        }  
    };

    function _tsToDate(ts) {
        var d = new Date(ts);
        var dd = d.getDate();
        var mm = d.getMonth() + 1;
        dd = (dd >= 10? dd : '0' + dd); 
        mm = (mm >= 10? mm : '0' + mm); 
        //******Artanisz Changes**///
        //return mm + '-' + dd;
        return dd + '/' + mm;
        //******Artanisz Changes**///
    }; 

    //******Artanisz Changes**///

    // The following validation should ideally be done by the client who calls us
    // but, let's not assume client actually validates, we validate is again.
    // better idea may be to move such functions into utils and have 'optionally' include utils 
    function validParams(type, params) {
        var notalpha = /[^a-z]+/g
        var notnumeric = /[^0-9]+/g
        var isfloat = /(^\.|[0-9]+\.)[0-9]+$/g
        switch(type) {
        case 'smp':
            if (params[0].match(notnumeric)) {
                return false;
            }
            return true;
        case 'ema':
        case 'sma':
            if (params.length != 2) {
                return false;
            } 
            if (params[0].match(notalpha)) { 
                return false;
            } 
            if (params[1].match(notnumeric)) { 
                return false;
            }   
            var validmas = ['open', 'high', 'low', 'close']
            var matched = false;
            for (i in validmas) { 
                if (validmas[i] === params[0]) {
                    matched = true;
                } 
            }
            if(!matched) vmsg = 'first parameter is not one of open,high,low,close';
            return matched;
        case 'bbands':
        case 'psar':
            if(params.length != 2) {
                vmsg = 'Invalid length of params: expected 2, received ' + params.length;
                return false;
            }
            for (var i in params) { 
                if (params[i].match(notnumeric) && !params[i].match(isfloat)) {
                    return false; 
                }
            }
            return true;
        //******Artanisz Changes**///
		case 'envelopes':
            if(params.length != 2) { 
                vmsg = 'Invalid length of params: expected 2, received ' + params.length;
                return false;
            }
            if(params[0].match(notnumeric)) return false;
            if(params[1].match(notnumeric)) {
			} else { 
                return true; 
			}
            if(params[1].match(isfloat)) return true;
            return false;
        //******Artanisz Changes**///     
        case 'stoch':
        case 'macd' : 
        //******Artanisz Changes**///
        case 'osma':
        //******Artanisz Changes**///
            if (params.length != 3) {
                return false;
            }
            for (var i in params) { 
                if(params[i].match(notnumeric)) { 
                    return false; 
                } 
            }
            return true;
        
		 case 'momentum':
             if (params.length != 2) {
                 return false;
             }
             if (params[1].match(notalpha)) {
                 return false;
             }
             if (params[0].match(notnumeric)) {
                 return false;
             }
             var validmas = ['open', 'high', 'low', 'close']
             var matched = false;
             for (i in validmas) {
                 if (validmas[i] === params[1]) {
                     matched = true;
                 }
             }
             if(!matched) vmsg = 'first parameter is not one of open,high,low,close';
             return matched;
         case 'rsi':
         case 'atr':
         case 'cci':
		 case 'dem':
		 case 'wpr':
         //******Artanisz Changes**///
            if(params.length != 1) { 
                return false;
            } 
            if (params[0].match(notnumeric)) { 
                return false;
            } 
            return true;
         //******Artanisz Changes**///
         // No parameters
         case 'awesome':
         case 'ac':
         case 'alligator':
		 case 'w_ad':
             return true;
		 //******Artanisz Changes**///
         default:
            return false;
        }

        // if we come here, something is wrong, so let's return false
        // return false;
    }; 

    /* Following functions are used from jQuery 
        The reason for doing this
        1. jquery does it properly 
        2. Including jquery for three functions is kind of an overkill. So 
            we'd keep including functions from jquery in here. If and when
            this becomes too big to be so, we'd just use jQuery library.

        Copyright 2010, John Resig (http://jquery.org/license)

    */
    function parseJSON(data) { 
        if ( typeof data !== "string" || !data ) {
            return null;
        }

        var rtrim = /^(\s|\u00A0)+|(\s|\u00A0)+$/g,
        // Make sure leading/trailing whitespace is removed (IE can't handle it)
        data = data.replace(rtrim, "");
        
        // Make sure the incoming data is actual JSON
        // Logic borrowed from http://json.org/json2.js
        if ( /^[\],:{}\s]*$/.test(data.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
            .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
            .replace(/(?:^|:|,)(?:\s*\[)+/g, "")) ) {

            // Try to use the native JSON parser first
            return window.JSON && window.JSON.parse ?
                window.JSON.parse( data ) :
                (new Function("return " + data))();

        } else {
            throw  "JSON parse error:"; 
        }
    };

    function isArray(a) { 
        return Object.prototype.toString.call(a) === "[object Array]";
    };
    function isFunction(f) { 
        return Object.prototype.toString.call(f) === "[object Function]";
    };

    // Our own lame selector. 
    function $$(selector) { 
        if (typeof selector !== "string" || !selector) {
            return selector;
        }

        // someone gave us #id or div#id. just take the id part out. 
        var i = selector.search('#');
        if(i !== -1) { 
            id = selector.substring(i+1); 
            return document.getElementById(id);
        } else { 
            // we still try by ID in case someone forgot to send the #
            var e = document.getElementById(selector);
            if (!e) { 
                // first of all elements by given name  
                e = document.getElementsByName(selector)[0];
            } 
            // we return whatever we got . 
            return e;
        }     
    };
})(window);
