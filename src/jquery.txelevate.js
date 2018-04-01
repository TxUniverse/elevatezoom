(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
      // AMD is used - Register as an anonymous module.
      define(['jquery'], factory);
    } else if (typeof exports === 'object') {
      module.exports = factory(require('jquery'));
    } else {
      // Neither AMD nor CommonJS used. Use global variables.
      if (typeof jQuery === 'undefined') {
        throw 'Tx-Elevate requires jQuery to be loaded first';
      }
      factory(jQuery);
    }
  }(function ($) {
      'use strict'

      let defaultOptions = {
        zoomEnabled: true, //false disables zoomwindow from showing
        zoomLevel: 1, //default zoom level of image
        scrollZoom: true, //allow zoom on mousewheel, true to activate
        scrollZoomIncrement: 0.05,  //steps of the scrollzoom
        minZoomLevel: 0.5,
        maxZoomLevel: 2,
        easing: true,
        easingAmount: 5,
        zoomWindowWidth: 400,
        zoomWindowHeight: 400,
        zoomWindowPosition: 1,
        zoomWindowFadeIn: false,
        zoomWindowFadeOut: false,
        cursor: "crosshair",
        onComplete: $.noop,
        onDestroy: function() {},
        onZoomedImageLoaded: function() {}
      }

      let TxElevate = {

        init: function( el, options ) {
          let jTxElevate = this
          jTxElevate.options = options
          jTxElevate.elem = el
          jTxElevate.$elem = $( el )

          jTxElevate.imageSrc = options.zoomImage || jTxElevate.$elem.attr("src")
          jTxElevate.options = Object.assign( defaultOptions, options )

          console.log(jTxElevate.options, options)

          //Remove alt on hover
          jTxElevate.$elem.parent().removeAttr('title').removeAttr('alt')
          jTxElevate.zoomImage = jTxElevate.imageSrc
          jTxElevate.refresh( 1 )
        },

        refresh: function ( length ) {
          let jTxElevate = this
          setTimeout(function() {
            jTxElevate.fetch(jTxElevate.imageSrc)
          }, length || jTxElevate.options.refresh )
        },

        fetch: function ( imgSrc ) {
          let jTxElevate = this
          //get the image
          let newImg = new Image()
          newImg.onload = function() {
            //set the large image dimensions - used to calculte ratio's
            jTxElevate.largeWidth = newImg.width
            jTxElevate.largeHeight = newImg.height
            //once image is loaded start the calls
            jTxElevate.startZoom()
            jTxElevate.currentImage = jTxElevate.imageSrc
            //let caller know image has been loaded
            jTxElevate.options.onZoomedImageLoaded(jTxElevate.$elem)
          }
          newImg.src = imgSrc // this must be done AFTER setting onload
        },

        startZoom: function () {
          let jTxElevate = this
          //get dimensions of the non zoomed image
          jTxElevate.nzWidth = jTxElevate.$elem.width()
          jTxElevate.nzHeight = jTxElevate.$elem.height()

          //activated elements
          jTxElevate.isWindowActive = false
          jTxElevate.overWindow = false

          jTxElevate.zoomLock = 1
          jTxElevate.scrollingLock = false
          jTxElevate.changeBgSize = false
          jTxElevate.currentZoomLevel = jTxElevate.options.zoomLevel

          //get offset of the non zoomed image
          jTxElevate.nzOffset = jTxElevate.$elem.offset()
          //calculate the width ratio of the large/small image
          jTxElevate.widthRatio = (jTxElevate.largeWidth/jTxElevate.currentZoomLevel) / jTxElevate.nzWidth
          jTxElevate.heightRatio = (jTxElevate.largeHeight/jTxElevate.currentZoomLevel) / jTxElevate.nzHeight

          let borderWidth = jTxElevate.$elem.css("border-left-width");
          jTxElevate.zoomWindowStyle = "overflow: hidden;"
            + "margin-left: " + String(borderWidth) + ";"
            + "margin-top: " + String(borderWidth) + ";"
            + "background-position: 0px 0px;"
            + "width: " + String(jTxElevate.nzWidth) + "px;"
            + "height: " + String(jTxElevate.nzHeight) + "px;"
            + "px;float: left;"
            + "display: none;"
            + "cursor:"+(jTxElevate.options.cursor)+";"
            + ";background-repeat: no-repeat;"
            + "position: absolute;"

          jTxElevate.zoomContainer = $('<div class="zoomContainer" style="-webkit-transform: translateZ(0);position:absolute;left:'+jTxElevate.nzOffset.left+'px;top:'+jTxElevate.nzOffset.top+'px;height:'+jTxElevate.nzHeight+'px;width:'+jTxElevate.nzWidth+'px;"></div>');
          $('body').append(jTxElevate.zoomContainer);

          //create zoom window
          if (isNaN(jTxElevate.options.zoomWindowPosition)){
            jTxElevate.zoomWindow = $("<div style='z-index:999;left:"+(jTxElevate.windowOffsetLeft)+"px;top:"+(jTxElevate.windowOffsetTop)+"px;" + jTxElevate.zoomWindowStyle + "' class='zoomWindow'>&nbsp;</div>")
              .appendTo('body')
              .click(function () {
                jTxElevate.$elem.trigger('click')
              })
          } else {
            jTxElevate.zoomWindow = $("<div style='z-index:999;left:"+(jTxElevate.windowOffsetLeft)+"px;top:"+(jTxElevate.windowOffsetTop)+"px;" + jTxElevate.zoomWindowStyle + "' class='zoomWindow'>&nbsp;</div>")
              .appendTo(jTxElevate.zoomContainer)
              .click(function () {
                jTxElevate.$elem.trigger('click')
              })
          }
          jTxElevate.zoomWindowContainer = $('<div/>').addClass('zoomWindowContainer').css("width",jTxElevate.options.zoomWindowWidth);
          jTxElevate.zoomWindow.wrap(jTxElevate.zoomWindowContainer);

          jTxElevate.zoomWindow.css({ backgroundImage: "url('" + jTxElevate.imageSrc + "')" });

          /*-------------------END THE ZOOM WINDOW ----------------------------------*/

          //touch events
          jTxElevate.$elem.bind('touchmove', function(e){
            e.preventDefault()
            let touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0]
            jTxElevate.setPosition(touch)
          })

          jTxElevate.zoomContainer.bind('touchmove', function(e){
            jTxElevate.showHideWindow("show")
            e.preventDefault()
            let touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0]
            jTxElevate.setPosition(touch)
          });

          jTxElevate.zoomContainer.bind('touchend', function(e){
            jTxElevate.showHideWindow("hide")
          });

          jTxElevate.$elem.bind('touchend', function(e){
            jTxElevate.showHideWindow("hide")
          });

          //Needed to work in IE
          jTxElevate.$elem.bind('mousemove', function(e){
            if (jTxElevate.overWindow === false) { jTxElevate.setElements("show") }
            //make sure on orientation change the setposition is not fired
            if (jTxElevate.lastX !== e.clientX || jTxElevate.lastY !== e.clientY){
              jTxElevate.setPosition(e)
              jTxElevate.currentLoc = e
            }
            jTxElevate.lastX = e.clientX
            jTxElevate.lastY = e.clientY
          })

          jTxElevate.zoomContainer.bind('mousemove', function(e){
            if (jTxElevate.overWindow === false) { jTxElevate.setElements("show") }
            //make sure on orientation change the setposition is not fired
            if (jTxElevate.lastX !== e.clientX || jTxElevate.lastY !== e.clientY){
              jTxElevate.setPosition(e)
              jTxElevate.currentLoc = e
            }
            jTxElevate.lastX = e.clientX
            jTxElevate.lastY = e.clientY
          })

          jTxElevate.zoomWindow.bind('mousemove', function(e) {
            //make sure on orientation change the setposition is not fired
            if (jTxElevate.lastX !== e.clientX || jTxElevate.lastY !== e.clientY){
              jTxElevate.setPosition(e)
              jTxElevate.currentLoc = e
            }
            jTxElevate.lastX = e.clientX
            jTxElevate.lastY = e.clientY
          })

          jTxElevate.zoomContainer.add(jTxElevate.$elem).mouseenter(function() {
            if (jTxElevate.overWindow === false){jTxElevate.setElements("show")}
          }).mouseleave(function(){
            jTxElevate.setElements("hide")
            jTxElevate.options.onDestroy(jTxElevate.$elem)
          })

          if (jTxElevate.options.scrollZoom) {
            jTxElevate.zoomContainer.add(jTxElevate.$elem).bind('mousewheel DOMMouseScroll MozMousePixelScroll', function(e){
              jTxElevate.scrollLock = true
              clearTimeout($.data(this, 'timer'))
              $.data(this, 'timer', setTimeout(function() {
                jTxElevate.scrollLock = false;
                //do something
              }, 250))

              let theEvent = e.originalEvent.wheelDelta || e.originalEvent.detail*-1

              e.stopImmediatePropagation()
              e.stopPropagation()
              e.preventDefault()

              if (theEvent /120 > 0) {
                //scrolling up
                if (jTxElevate.currentZoomLevel >= jTxElevate.minZoomLevel){
                  jTxElevate.changeZoomLevel(jTxElevate.currentZoomLevel-jTxElevate.options.scrollZoomIncrement);
                }
              } else {
                //scrolling down
                if (jTxElevate.options.maxZoomLevel) {
                  if (jTxElevate.currentZoomLevel <= jTxElevate.options.maxZoomLevel){
                    jTxElevate.changeZoomLevel(parseFloat(jTxElevate.currentZoomLevel)+jTxElevate.options.scrollZoomIncrement);
                  }
                } else {
                  //andy
                  jTxElevate.changeZoomLevel(parseFloat(jTxElevate.currentZoomLevel)+jTxElevate.options.scrollZoomIncrement);
                }
              }
              return false
            })
          }
        },

        setElements: function( type ) {
          let jTxElevate = this
          if (!jTxElevate.options.zoomEnabled) { return false }
          if (type === "show" && jTxElevate.isWindowSet) jTxElevate.showHideWindow("show")
          if (type === "hide") jTxElevate.showHideWindow("hide")
        },

        setPosition: function( e ) {
          let jTxElevate = this
          if (!jTxElevate.options.zoomEnabled) { return false }

          //recaclc offset each time in case the image moves
          //this can be caused by other on page elements
          jTxElevate.nzHeight = jTxElevate.$elem.height()
          jTxElevate.nzWidth = jTxElevate.$elem.width()
          jTxElevate.nzOffset = jTxElevate.$elem.offset()

          //container fix
          jTxElevate.zoomContainer.css({ top: jTxElevate.nzOffset.top})
          jTxElevate.zoomContainer.css({ left: jTxElevate.nzOffset.left})
          jTxElevate.mouseLeft = parseInt(e.pageX - jTxElevate.nzOffset.left)
          jTxElevate.mouseTop = parseInt(e.pageY - jTxElevate.nzOffset.top)

          jTxElevate.Etoppos = (jTxElevate.mouseTop < ((jTxElevate.nzHeight/2)/jTxElevate.heightRatio) )
          jTxElevate.Eboppos = (jTxElevate.mouseTop > (jTxElevate.nzHeight - ((jTxElevate.nzHeight/2)/jTxElevate.heightRatio)))
          jTxElevate.Eloppos = (jTxElevate.mouseLeft < ((jTxElevate.nzWidth/2)/jTxElevate.widthRatio))
          jTxElevate.Eroppos = (jTxElevate.mouseLeft > (jTxElevate.nzWidth - (jTxElevate.nzWidth/2)/jTxElevate.widthRatio))

          // if the mouse position of the slider is one of the outer bounds, then hide window
          if (jTxElevate.mouseLeft < 0 || jTxElevate.mouseTop < 0 || jTxElevate.mouseLeft > jTxElevate.nzWidth || jTxElevate.mouseTop > jTxElevate.nzHeight ) {
            jTxElevate.setElements("hide")
          } else {
            //adjust the background position if the mouse is in one of the outer regions
            //Left Region
            if (jTxElevate.Eloppos) {
              jTxElevate.windowLeftPos = 0
            }

            jTxElevate.setWindowPosition( e );
          }
        },

        showHideWindow: function( change ) {
          let jTxElevate = this
          if (change === "show") {
            if (!jTxElevate.isWindowActive){
              if (jTxElevate.options.zoomWindowFadeIn) {
                jTxElevate.zoomWindow.stop(true, true, false).fadeIn(jTxElevate.options.zoomWindowFadeIn)
              }
              else { jTxElevate.zoomWindow.show() }
              jTxElevate.isWindowActive = true;
            }
          }
          if (change === "hide") {
            if (jTxElevate.isWindowActive){
              if (jTxElevate.options.zoomWindowFadeOut){
                jTxElevate.zoomWindow.stop(true, true).fadeOut(jTxElevate.options.zoomWindowFadeOut, function () {
                  if (jTxElevate.loop) {
                    //stop moving the zoom window when zoom window is faded out
                    clearInterval( jTxElevate.loop )
                    jTxElevate.loop = false
                  }
                })
              } else { jTxElevate.zoomWindow.hide() }
              jTxElevate.isWindowActive = false
            }
          }
        },

        setWindowPosition: function( e ) {
          let jTxElevate = this
          if (!isNaN(jTxElevate.options.zoomWindowPosition)) {
            switch (jTxElevate.options.zoomWindowPosition) {
              case 1: //done
                jTxElevate.windowOffsetTop = (0) //DONE - 1
                jTxElevate.windowOffsetLeft = (+jTxElevate.nzWidth)  //DONE 1, 2, 3, 4, 16
                break
              case 2:
                if (jTxElevate.options.zoomWindowHeight > jTxElevate.nzHeight) { //positive margin
                  jTxElevate.windowOffsetTop = ((jTxElevate.options.zoomWindowHeight/2)-(jTxElevate.nzHeight/2))*(-1)
                  jTxElevate.windowOffsetLeft = (jTxElevate.nzWidth) //DONE 1, 2, 3, 4, 16
                }
                break
              case 3: //done
                jTxElevate.windowOffsetTop = (jTxElevate.nzHeight - jTxElevate.zoomWindow.height()) //DONE 3,9
                jTxElevate.windowOffsetLeft = (jTxElevate.nzWidth) //DONE 1, 2, 3, 4, 16
                break
              case 4: //done
                jTxElevate.windowOffsetTop = (jTxElevate.nzHeight) //DONE - 4,5,6,7,8
                jTxElevate.windowOffsetLeft = (jTxElevate.nzWidth) //DONE 1, 2, 3, 4, 16
                break
              case 5: //done
                jTxElevate.windowOffsetTop = (jTxElevate.nzHeight) //DONE - 4,5,6,7,8
                jTxElevate.windowOffsetLeft = (jTxElevate.nzWidth-jTxElevate.zoomWindow.width()) //DONE - 5,15
                break
              case 6:
                if (jTxElevate.options.zoomWindowHeight > jTxElevate.nzHeight){ //positive margin
                  jTxElevate.windowOffsetTop = (jTxElevate.nzHeight)  //DONE - 4,5,6,7,8
                  jTxElevate.windowOffsetLeft = ((jTxElevate.options.zoomWindowWidth/2)-(jTxElevate.nzWidth/2))*(-1)
                }
                break
              case 7: //done
                jTxElevate.windowOffsetTop = (jTxElevate.nzHeight)  //DONE - 4,5,6,7,8
                jTxElevate.windowOffsetLeft = 0 //DONE 7, 13
                break
              case 8: //done
                jTxElevate.windowOffsetTop = (jTxElevate.nzHeight) //DONE - 4,5,6,7,8
                jTxElevate.windowOffsetLeft = (jTxElevate.zoomWindow.width() )* (-1)  //DONE 8,9,10,11,12
                break
              case 9:  //done
                jTxElevate.windowOffsetTop = (jTxElevate.nzHeight - jTxElevate.zoomWindow.height()) //DONE 3,9
                jTxElevate.windowOffsetLeft = (jTxElevate.zoomWindow.width() )* (-1) //DONE 8,9,10,11,12
                break
              case 10:
                if (jTxElevate.options.zoomWindowHeight > jTxElevate.nzHeight) { //positive margin
                  jTxElevate.windowOffsetTop = ((jTxElevate.options.zoomWindowHeight/2)-(jTxElevate.nzHeight/2))*(-1)
                  jTxElevate.windowOffsetLeft = (jTxElevate.zoomWindow.width() )* (-1) //DONE 8,9,10,11,12
                }
                break
              case 11:
                jTxElevate.windowOffsetTop = (0)
                jTxElevate.windowOffsetLeft = (jTxElevate.zoomWindow.width() )* (-1) //DONE 8,9,10,11,12
                break
              case 12: //done
                jTxElevate.windowOffsetTop = (jTxElevate.zoomWindow.height())*(-1) //DONE 12,13,14,15,16
                jTxElevate.windowOffsetLeft = (jTxElevate.zoomWindow.width() )* (-1)  //DONE 8,9,10,11,12
                break
              case 13: //done
                jTxElevate.windowOffsetTop = (jTxElevate.zoomWindow.height())*(-1) //DONE 12,13,14,15,16
                jTxElevate.windowOffsetLeft = (0) //DONE 7, 13
                break
              case 14:
                if (jTxElevate.options.zoomWindowHeight > jTxElevate.nzHeight) { //positive margin
                  jTxElevate.windowOffsetTop = (jTxElevate.zoomWindow.height())*(-1) //DONE 12,13,14,15,16
                  jTxElevate.windowOffsetLeft = ((jTxElevate.options.zoomWindowWidth/2)-(jTxElevate.nzWidth/2))*(-1)
                }
                break
              case 15://done
                jTxElevate.windowOffsetTop = (jTxElevate.zoomWindow.height())*(-1) //DONE 12,13,14,15,16
                jTxElevate.windowOffsetLeft = (jTxElevate.nzWidth-jTxElevate.zoomWindow.width()) //DONE - 5,15
                break
              case 16:  //done
                jTxElevate.windowOffsetTop = (jTxElevate.zoomWindow.height())*(-1) //DONE 12,13,14,15,16
                jTxElevate.windowOffsetLeft = (jTxElevate.nzWidth) //DONE 1, 2, 3, 4, 16
                break
              default: //done
                jTxElevate.windowOffsetTop = (0) //DONE - 1
                jTxElevate.windowOffsetLeft = (jTxElevate.nzWidth) //DONE 1, 2, 3, 4, 16
            }
          } else {
            //WE CAN POSITION IN A CLASS - ASSUME THAT ANY STRING PASSED IS
            jTxElevate.externalContainer = $('#'+jTxElevate.options.zoomWindowPosition)
            jTxElevate.externalContainerWidth = jTxElevate.externalContainer.width()
            jTxElevate.externalContainerHeight = jTxElevate.externalContainer.height()
            jTxElevate.externalContainerOffset = jTxElevate.externalContainer.offset()

            jTxElevate.windowOffsetTop = jTxElevate.externalContainerOffset.top //DONE - 1
            jTxElevate.windowOffsetLeft =jTxElevate.externalContainerOffset.left //DONE 1, 2, 3, 4, 16
          }
          jTxElevate.isWindowSet = true

          jTxElevate.zoomWindow.css({ top: jTxElevate.windowOffsetTop})
          jTxElevate.zoomWindow.css({ left: jTxElevate.windowOffsetLeft})

          jTxElevate.zoomWindow.css({ top: 0})
          jTxElevate.zoomWindow.css({ left: 0})

          jTxElevate.windowLeftPos = String(((e.pageX - jTxElevate.nzOffset.left) * jTxElevate.widthRatio - jTxElevate.zoomWindow.width() / 2) * (-1))
          jTxElevate.windowTopPos = String(((e.pageY - jTxElevate.nzOffset.top) * jTxElevate.heightRatio - jTxElevate.zoomWindow.height() / 2) * (-1))
          if (jTxElevate.Etoppos) { jTxElevate.windowTopPos = 0 }
          if (jTxElevate.Eloppos) { jTxElevate.windowLeftPos = 0 }
          if (jTxElevate.Eboppos) { jTxElevate.windowTopPos = (jTxElevate.largeHeight/jTxElevate.currentZoomLevel-jTxElevate.zoomWindow.height())*(-1) }
          if (jTxElevate.Eroppos) { jTxElevate.windowLeftPos = ((jTxElevate.largeWidth/jTxElevate.currentZoomLevel-jTxElevate.zoomWindow.width())*(-1)) }

          //stops micro movements
          if (jTxElevate.fullheight) jTxElevate.windowTopPos = 0
          if (jTxElevate.fullwidth) jTxElevate.windowLeftPos = 0
          //set the css background position

          if (jTxElevate.zoomLock === 1){
            //overrides for images not zoomable
            if (jTxElevate.widthRatio <= 1) jTxElevate.windowLeftPos = 0
            if (jTxElevate.heightRatio <= 1) jTxElevate.windowTopPos = 0
          }
          // adjust images less than the window height

          //set the zoomwindow background position
          if (jTxElevate.options.easing) {
            //set the pos to 0 if not set
            if (!jTxElevate.xp) { jTxElevate.xp = 0 }
            if (!jTxElevate.yp) { jTxElevate.yp = 0 }
            //if loop not already started, then run it
            if (!jTxElevate.loop) {
              jTxElevate.loop = setInterval(function(){
                //using zeno's paradox

                jTxElevate.xp += (jTxElevate.windowLeftPos  - jTxElevate.xp) / jTxElevate.options.easingAmount
                jTxElevate.yp += (jTxElevate.windowTopPos  - jTxElevate.yp) / jTxElevate.options.easingAmount
                if (jTxElevate.scrollingLock) {

                  clearInterval(jTxElevate.loop)
                  jTxElevate.xp = jTxElevate.windowLeftPos
                  jTxElevate.yp = jTxElevate.windowTopPos

                  jTxElevate.xp = ((e.pageX - jTxElevate.nzOffset.left) * jTxElevate.widthRatio - jTxElevate.zoomWindow.width() / 2) * (-1)
                  jTxElevate.yp = (((e.pageY - jTxElevate.nzOffset.top) * jTxElevate.heightRatio - jTxElevate.zoomWindow.height() / 2) * (-1))

                  if (jTxElevate.changeBgSize) {
                    if (jTxElevate.nzHeight>jTxElevate.nzWidth) {
                      jTxElevate.zoomWindow.css({ "background-size": jTxElevate.largeWidth/jTxElevate.newvalueheight + 'px ' + jTxElevate.largeHeight/jTxElevate.newvalueheight + 'px' })
                    } else {
                      jTxElevate.zoomWindow.css({ "background-size": jTxElevate.largeWidth/jTxElevate.newvaluewidth + 'px ' + jTxElevate.largeHeight/jTxElevate.newvaluewidth + 'px' })
                    }
                    jTxElevate.changeBgSize = false
                  }

                  jTxElevate.zoomWindow.css({ backgroundPosition: jTxElevate.windowLeftPos + 'px ' + jTxElevate.windowTopPos + 'px' })
                  jTxElevate.scrollingLock = false
                  jTxElevate.loop = false
                }
                else if (Math.round(Math.abs(jTxElevate.xp - jTxElevate.windowLeftPos) + Math.abs(jTxElevate.yp - jTxElevate.windowTopPos)) < 1) {
                  //stops micro movements
                  clearInterval(jTxElevate.loop)
                  jTxElevate.zoomWindow.css({ backgroundPosition: jTxElevate.windowLeftPos + 'px ' + jTxElevate.windowTopPos + 'px' })
                  jTxElevate.loop = false
                } else {
                  if (jTxElevate.changeBgSize) {
                    if (jTxElevate.nzHeight>jTxElevate.nzWidth) {
                      jTxElevate.zoomWindow.css({ "background-size": jTxElevate.largeWidth/jTxElevate.newvalueheight + 'px ' + jTxElevate.largeHeight/jTxElevate.newvalueheight + 'px' })
                    } else {
                      jTxElevate.zoomWindow.css({ "background-size": jTxElevate.largeWidth/jTxElevate.newvaluewidth + 'px ' + jTxElevate.largeHeight/jTxElevate.newvaluewidth + 'px' })
                    }
                    jTxElevate.changeBgSize = false
                  }
                  jTxElevate.zoomWindow.css({ backgroundPosition: jTxElevate.xp + 'px ' + jTxElevate.yp + 'px' })
                }
              }, 16)
            }
          } else {
            if (jTxElevate.changeBgSize) {
              if (jTxElevate.nzHeight>jTxElevate.nzWidth) {
                jTxElevate.zoomWindow.css({ "background-size": jTxElevate.largeWidth/jTxElevate.newvalueheight + 'px ' + jTxElevate.largeHeight/jTxElevate.newvalueheight + 'px' })
              } else {
                if ((jTxElevate.largeHeight/jTxElevate.newvaluewidth) < jTxElevate.options.zoomWindowHeight) {
                  jTxElevate.zoomWindow.css({ "background-size": jTxElevate.largeWidth/jTxElevate.newvaluewidth + 'px ' + jTxElevate.largeHeight/jTxElevate.newvaluewidth + 'px' })
                } else {
                  jTxElevate.zoomWindow.css({ "background-size": jTxElevate.largeWidth/jTxElevate.newvalueheight + 'px ' + jTxElevate.largeHeight/jTxElevate.newvalueheight + 'px' })
                }
              }
              jTxElevate.changeBgSize = false
            }
            jTxElevate.zoomWindow.css({ backgroundPosition: jTxElevate.windowLeftPos + 'px ' + jTxElevate.windowTopPos + 'px' })
          }
        },

        changeZoomLevel: function( value ) {
          let jTxElevate = this
          //flag a zoom, so can adjust the easing during setPosition
          jTxElevate.scrollingLock = true

          //round to two decimal places
          jTxElevate.newvalue = parseFloat(value).toFixed(2)
          let newValue = parseFloat(value).toFixed(2)

          //maxWidth & maxHeight of the image
          let maxHeightNewValue = jTxElevate.largeHeight/((jTxElevate.options.zoomWindowHeight / jTxElevate.nzHeight) * jTxElevate.nzHeight)
          let maxWidthNewValue = jTxElevate.largeWidth/((jTxElevate.options.zoomWindowWidth / jTxElevate.nzWidth) * jTxElevate.nzWidth)

          //calculate new heightRatio
          if (maxHeightNewValue <= newValue) {
            jTxElevate.heightRatio = (jTxElevate.largeHeight/maxHeightNewValue) / jTxElevate.nzHeight
            jTxElevate.newvalueheight = maxHeightNewValue
            jTxElevate.fullheight = true
          } else {
            jTxElevate.heightRatio = (jTxElevate.largeHeight/newValue) / jTxElevate.nzHeight
            jTxElevate.newvalueheight = newValue
            jTxElevate.fullheight = false
          }
          //	calculate new width ratio
          if (maxWidthNewValue <= newValue) {
            jTxElevate.widthRatio = (jTxElevate.largeWidth/maxWidthNewValue) / jTxElevate.nzWidth
            jTxElevate.newvaluewidth = maxWidthNewValue
            jTxElevate.fullwidth = true
          } else {
            jTxElevate.widthRatio = (jTxElevate.largeWidth/newValue) / jTxElevate.nzWidth
            jTxElevate.newvaluewidth = newValue
            jTxElevate.fullwidth = false
          }

          maxHeightNewValue = parseFloat(jTxElevate.largeHeight/jTxElevate.nzHeight).toFixed(2)
          maxWidthNewValue = parseFloat(jTxElevate.largeWidth/jTxElevate.nzWidth).toFixed(2)
          if (newValue > maxHeightNewValue) newValue = maxHeightNewValue
          if (newValue > maxWidthNewValue) newValue = maxWidthNewValue

          if (maxHeightNewValue <= newValue) {
            jTxElevate.heightRatio = (jTxElevate.largeHeight/newValue) / jTxElevate.nzHeight
            if (newValue > maxHeightNewValue) {
              jTxElevate.newvalueheight = maxHeightNewValue
            } else {
              jTxElevate.newvalueheight = newValue
            }
            jTxElevate.fullheight = true
          } else {
            jTxElevate.heightRatio = (jTxElevate.largeHeight/newValue) / jTxElevate.nzHeight
            if (newValue > maxHeightNewValue) {
              jTxElevate.newvalueheight = maxHeightNewValue
            } else {
              jTxElevate.newvalueheight = newValue
            }
            jTxElevate.fullheight = false
          }

          if (maxWidthNewValue <= newValue) {
            jTxElevate.widthRatio = (jTxElevate.largeWidth/newValue) / jTxElevate.nzWidth
            if (newValue > maxWidthNewValue) {
              jTxElevate.newvaluewidth = maxWidthNewValue
            } else {
              jTxElevate.newvaluewidth = newValue
            }
            jTxElevate.fullwidth = true;
          } else {
            jTxElevate.widthRatio = (jTxElevate.largeWidth/newValue) / jTxElevate.nzWidth
            jTxElevate.newvaluewidth = newValue
            jTxElevate.fullwidth = false
          }

          let scrContinue = false
          if (jTxElevate.nzWidth >= jTxElevate.nzHeight) {
            if (jTxElevate.newvaluewidth <= maxWidthNewValue) {
              scrContinue = true
            } else {
              scrContinue = false
              jTxElevate.fullheight = true
              jTxElevate.fullwidth = true
            }
          }
          if (jTxElevate.nzHeight > jTxElevate.nzWidth){
            if ( jTxElevate.newvaluewidth <= maxWidthNewValue){
              scrContinue = true
            } else {
              scrContinue = false
              jTxElevate.fullheight = true
              jTxElevate.fullwidth = true
            }
          }

          if (scrContinue) {
            jTxElevate.zoomLock = 0
            jTxElevate.changeZoom = true
            //if lens height is less than image height
            if (((jTxElevate.options.zoomWindowHeight)/jTxElevate.heightRatio) <= jTxElevate.nzHeight) {
              jTxElevate.currentZoomLevel = jTxElevate.newvalueheight;
              jTxElevate.changeBgSize = true
            }

            jTxElevate.changeBgSize = true
            if (jTxElevate.nzWidth > jTxElevate.nzHeight) {
              jTxElevate.currentZoomLevel = jTxElevate.newvaluewidth
            }
            if (jTxElevate.nzHeight > jTxElevate.nzWidth) {
              jTxElevate.currentZoomLevel = jTxElevate.newvaluewidth
            }
          }
          //sets the boundry change, called in setWindowPos
          jTxElevate.setPosition(jTxElevate.currentLoc);
        }
      }

      $.fn.txElevate = function( options ) {
        $(this).each(function () {
          let elevate = Object.create( TxElevate )
          elevate.init( this, options )
          $.data( this, 'elevateZoom', elevate )
        })
      }

  return $.fn.txElevate
}))