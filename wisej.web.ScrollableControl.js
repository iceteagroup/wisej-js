///////////////////////////////////////////////////////////////////////////////
//
// (C) 2015 ICE TEA GROUP LLC - ALL RIGHTS RESERVED
//
// 
//
// ALL INFORMATION CONTAINED HEREIN IS, AND REMAINS
// THE PROPERTY OF ICE TEA GROUP LLC AND ITS SUPPLIERS, IF ANY.
// THE INTELLECTUAL PROPERTY AND TECHNICAL CONCEPTS CONTAINED
// HEREIN ARE PROPRIETARY TO ICE TEA GROUP LLC AND ITS SUPPLIERS
// AND MAY BE COVERED BY U.S. AND FOREIGN PATENTS, PATENT IN PROCESS, AND
// ARE PROTECTED BY TRADE SECRET OR COPYRIGHT LAW.
//
// DISSEMINATION OF THIS INFORMATION OR REPRODUCTION OF THIS MATERIAL
// IS STRICTLY FORBIDDEN UNLESS PRIOR WRITTEN PERMISSION IS OBTAINED
// FROM ICE TEA GROUP LLC.
//
///////////////////////////////////////////////////////////////////////////////

/**
 * wisej.web.ScrollableControl
 */
qx.Class.define("wisej.web.ScrollableControl", {

	extend: qx.ui.core.Widget,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle,
		wisej.mixin.MAccelerators,
		qx.ui.core.MRemoteChildrenHandling,
		qx.ui.core.MRightToLeftLayout
	],

	construct: function () {

		this.base(arguments);

		// configure the internal layout to have the 
		// scroll panel fill this container.
		this._setLayout(new qx.ui.layout.Dock());

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["scrollX", "scrollY"]));

		// update the scroll position properties.
		var scroller = this.getChildControl("pane");
		scroller.addListener("scrollX", this._onScrollBarX, this);
		scroller.addListener("scrollY", this._onScrollBarY, this);

		this.addListener("pointerover", this._onPointerOver);
		this.addListener("pointerout", this._onPointerOut);
	},

	events: {

		/** 
		 * Fired on scrollbar movements.
		 *
		 * The event data object is: {x, y, type, old}.
		 */
		scroll: "qx.event.type.Data",
	},

	statics: {

		/**
		 * (int) The mask for the horizontal scroll bar.
		 * May be combined with {@link #VERTICAL_SCROLLBAR}.
		 */
		HORIZONTAL_SCROLLBAR: 1,

		/**
		 * (int) The mask for the vertical scroll bar.
		 * May be combined with {@link #HORIZONTAL_SCROLLBAR}.
		 */
		VERTICAL_SCROLLBAR: 2
	},

	properties: {

		/**
		 * Enables the automatic scrolling of the content.
		 */
		autoScroll: { init: false, check: "Boolean", apply: "_applyAutoScroll" },

		/**
		 * Sets the margin for the autoscroll area.
		 */
		autoScrollMargin: { init: null, check: "Map", apply: "_applyAutoScrollMargin" },

		/**
		 * Sets the minimum size for the autoscroll area.
		 */
		autoScrollMinSize: { init: null, check: "Map", apply: "_applyAutoScrollMinSize" },

		/**
		 * scrollX property.
		 *
		 * This property is defined using the getter/setter methods.
		 */

		/**
		 * scrollY property.
		 *
		 * This property is defined using the getter/setter methods.
		 */

		/**
		 * Determines which scrollbars should be visible: 1 = Horizontal, 2 = Vertical, 3 = Both.
		 */
		scrollBars: { init: 3, check: "PositiveInteger", apply: "_applyScrollBars" },
	},

	members: {

		/**
		 * Wisej marker.
		 */
		isWisejContainer: true,

		// reference to the inner children container.
		__childrenContainer: null,

		// stored previous scroll positions, used in __fireScrollEvent.
		__oldScrollX: 0,
		__oldScrollY: 0,

		/**
		 * The children container needed by the {@link qx.ui.core.MRemoteChildrenHandling}
		 * mixin.
		 *
		 * @return {qx.ui.container.Composite} pane sub widget
		 */
		getChildrenContainer: function () {

			if (this.__childrenContainer == null)
				this.__childrenContainer = this.getChildControl("pane").getChildren()[0];

			return this.__childrenContainer;
		},

		/**
 		 * Returns the element, to which the content padding should be applied.
 		 *
 		 * @return {qx.ui.core.Widget} The content padding target.
		 */
		_getContentPaddingTarget: function () {
			return this.getChildrenContainer();
		},

		/**
		 * Applies the autoScroll property.
		 */
		_applyAutoScroll: function (value, old) {

			var scroller = this.getChildControl("pane");

			if (value) {
				var scrollBars = this.getScrollBars();
				scroller.setScrollbarY((scrollBars & wisej.web.ScrollableControl.VERTICAL_SCROLLBAR) ? "auto" : "off");
				scroller.setScrollbarX((scrollBars & wisej.web.ScrollableControl.HORIZONTAL_SCROLLBAR) ? "auto" : "off");
			}
			else {
				scroller.setScrollbarX("off");
				scroller.setScrollbarY("off");
			}
		},

		/**
		 * Applies the autoScrollMargin property.
		 *
		 * @param {Size} value. It's a Size enum defines as {width, height}.
		 */
		_applyAutoScrollMargin: function (value, old) {

			var container = this.getChildrenContainer();
			container.setPadding([0, value.width, value.height, 0]);
		},

		/**
		 * Applies the autoScrollMinSize property.
		 *
		 * @param {Size} value. It's a Size enum defined as {width, height}.
		 */
		_applyAutoScrollMinSize: function (value, old) {

			if (value == null)
				return;

			var container = this.getChildrenContainer();
			container.setMinWidth(value.width);
			container.setMinHeight(value.height);
		},

		/**
		 * Applies the scrollX property.
		 */
		getScrollX: function () {

			var scrollbar = this.getChildControl("pane").getChildControl("scrollbar-x", true);
			return scrollbar == null ? 0 : scrollbar.getPosition() | 0;
		},
		setScrollX: function (value) {

			var scrollbar = this.getChildControl("pane").getChildControl("scrollbar-x", true);
			if (scrollbar) {
				setTimeout(function () {
					scrollbar.setPosition(value);
				}, 1);
			}
		},

		/**
		 * Applies the scrollY property.
		 */
		getScrollY: function () {

			var scrollbar = this.getChildControl("pane").getChildControl("scrollbar-y", true);
			return scrollbar == null ? 0 : scrollbar.getPosition() | 0;
		},
		setScrollY: function (value) {

			var scrollbar = this.getChildControl("pane").getChildControl("scrollbar-y", true);
			if (scrollbar) {
				setTimeout(function () {
					scrollbar.setPosition(value);
				}, 1);
			}
		},

		/**
		 * Applies the scrollBar property.
		 */
		_applyScrollBars: function (value, old) {

			if (this.isAutoScroll()) {
				var scroller = this.getChildControl("pane");
				scroller.setScrollbarY((value & wisej.web.ScrollableControl.VERTICAL_SCROLLBAR) ? "auto" : "off");
				scroller.setScrollbarX((value & wisej.web.ScrollableControl.HORIZONTAL_SCROLLBAR) ? "auto" : "off");
			}
		},

		/**
		 * Fires the scroll event when scrolling.
		 */
		_onScrollBarX: function (e) {

			this.__fireScrollEvent(e, false);
		},

		/**
		 * Fires the scroll event when scrolling.
		 */
		_onScrollBarY: function (e) {

			this.__fireScrollEvent(e, true);
		},

		__fireScrollEvent: function (e, vertical) {

			this.setDirty(true);

			var position = e.getData() | 0;
			var old = (vertical ? this.__oldScrollY : this.__oldScrollX) | 0;
			vertical ? this.__oldScrollY = position : this.__oldScrollX = position;

			if (position == old)
				return;

			var scrollContainer = e.getTarget();
			var scrollbar = vertical ? scrollContainer.getScrollBarY() : scrollContainer.getScrollBarX();

			var data = {};
			data.old = old;
			data[vertical ? "scrollY" : "scrollX"] = position;
			data.type = position == 0 ? "first" : position == scrollbar.getMaximum() ? "last" : "step";

			this.fireDataEvent("scroll", data);
		},

		/**
		 * Overridden to create an inner scrollable pane.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "pane":
					var control = new wisej.web.container.Scroll();
					var pane = control.getChildControl("pane");
					pane._getLayout().dispose();
					pane._setLayout(new qx.ui.layout.Basic());

					var clientArea = new qx.ui.container.Composite(new qx.ui.layout.Basic());
					clientArea.getContentElement().setStyles({
						"overflowX": "visible",
						"overflowY": "visible"
					});

					control.add(clientArea);
					this._add(control, { edge: "center" });

					control.addListener("resize", this._onScrollerResize, this);
					control.addListener("changeScrollbarXVisibility", this._onScrollerResize, this);
					control.addListener("changeScrollbarXVisibility", this._onScrollerResize, this);

					break;
			}

			return control || this.base(arguments, id);
		},

		_onScrollerResize: function (e) {

			// ensure that the client area always fills the container.
			// it's needed in case child controls are resizable or draggable.
			var pane = this.getChildControl("pane");
			var clientArea = this.getChildrenContainer();
			var minSize = this.getAutoScrollMinSize() || {};
			var size = wisej.utils.Widget.getClientSize(pane);
			clientArea.setMinWidth(Math.max(size.width, minSize.width || 0));
			clientArea.setMinHeight(Math.max(size.height, minSize.height || 0));

		},

		/**
		 * Event handler for the pointer over event.
		 */
		_onPointerOver: function (e) {

			this.addState("hovered");
		},

		/**
		 * Event handler for the pointer out event.
		 */
		_onPointerOut: function (e) {

			this.removeState("hovered");
		},

		/*---------------------------------------------------------------------------
		  qx.ui.container.Scroll methods forwarding.
		---------------------------------------------------------------------------*/

		__forwardToScroller: function (funcName, value, duration) {

			var scroller = this.getChildControl("pane");
			if (scroller)
				return scroller[funcName].call(scroller, value, duration);
		},

		/**
		 * Scrolls the element's content to the given left coordinate
		 *
		 * @param value {Integer} The vertical position to scroll to.
		 * @param duration {Number?} The time in milliseconds the scroll to should take.
		 */
		scrollToX: function (value, duration) {

			return this.__forwardToScroller("scrollToX", value, duration);
		},

		/**
		 * Scrolls the element's content by the given left offset
		 *
		 * @param value {Integer} The vertical position to scroll to.
		 * @param duration {Number?} The time in milliseconds the scroll to should take.
		 */
		scrollByX: function (value, duration) {

			return this.__forwardToScroller("scrollByX", value, duration);
		},

		/**
		 * Scrolls the element's content to the given top coordinate
		 *
		 * @param value {Integer} The horizontal position to scroll to.
		 * @param duration {Number?} The time in milliseconds the scroll to should take.
		 */
		scrollToY: function (value, duration) {

			return this.__forwardToScroller("scrollToY", value, duration);
		},

		/**
		 * Scrolls the element's content by the given top offset
		 *
		 * @param value {Integer} The horizontal position to scroll to.
		 * @param duration {Number?} The time in milliseconds the scroll to should take.
		 */
		scrollByY: function (value, duration) {

			return this.__forwardToScroller("scrollByY", value, duration);
		},
	}

});
