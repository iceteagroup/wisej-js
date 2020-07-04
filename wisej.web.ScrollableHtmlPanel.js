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
 * wisej.web.ScrollableHtmlPanel
 */
qx.Class.define("wisej.web.ScrollableHtmlPanel", {

	extend: wisej.web.ScrollableControl,

	construct: function () {

		this.base(arguments);

		// wire clicks on the html panel to fire "elementClick".
		this.getChildControl("html").addListener("click", this.__onElementClick, this);

		// wire the resize event to update scrollable area.
		var scroller = this.getChildControl("pane");
		scroller.addListener("resize", this.__onPaneResize, this);

		// wire the appear/disappear events to start/stop the resizing interval.
		this.addListener("appear", this._startUpdateInterval, this);
		this.addListener("disappear", this._stopUpdateInterval, this);

		this.__timer = new qx.event.Timer();
		this.__timer.addListener("interval", this._onUpdateInterval, this);
	},

	properties: {

		appearance: { init: "panel", refine: true },

		/**
		 * HTML property.
		 */
		html: { init: "", check: "String", apply: "_applyHtml" },

		/**
		 * CSS property.
		 *
		 * Stylesheets are "scoped" to the HTML content inside this widget by
		 * using the name of the widget as the root class name.
		 */
		css: { init: "", check: "String", apply: "_applyCss" },

		/**
		 * AllowNavigation property.
		 *
		 * Enables or disable links navigation.
		 */
		allowNavigation: { init: false, check: "Boolean" },

		/**
		 * Determines which scrollbars should be visible: 0 = None, 1 = Horizontal, 2 = Vertical, 3 = Both, 4 = Hidden.
		 */
		scrollBars: { init: 3, check: "PositiveInteger", apply: "_applyScrollBars" },

		/**
		 * Interval time (in milliseconds) for the resize update timer.
		 * Setting this to 0 clears the timer.
		*/
		updateTimeout: { check: "Integer", init: 100, apply: "_applyUpdateTimeout" },
	},

	members: {

		// reference to the isolated style sheet.
		__stylesheet: null,

		// resizing update timer.
		__timer: null,

		// automatic IFrame blocker.
		__blockerElement: null,

		/**
		 * Updates the panel size to fit the content.
		 */
		updateSize: function () {

			this.__processHtml();
		},

		/**
		 * Enables or disables the automatic IFrame
		 * blocker needed to capture pointer events.
		 */
		enableIFrameBlocker: function (enable) {

			if (!enable) {
				if (this.__blockerElement) {
					qx.event.Registration.removeListener(document.body, "pointerdown", this.block, this, true);
					qx.event.Registration.removeListener(document.body, "pointerup", this.release, this, true);
					qx.event.Registration.removeListener(document.body, "losecapture", this.release, this, true);
					this._disposeObjects("__blockerElement");
				}
			}

			if (enable) {
				if (!this.__blockerElement) {
					qx.event.Registration.addListener(document.body, "pointerdown", this.block, this, true);
					qx.event.Registration.addListener(document.body, "pointerup", this.release, this, true);
					qx.event.Registration.addListener(document.body, "losecapture", this.release, this, true);
					this.__blockerElement = this._createBlockerElement();
				}
			}
		},

		/**
		 * Applies the HTML text.
		 */
		_applyUpdateTimeout: function (value, old) {
			this._startUpdateInterval();
		},

		/**
		 * Starts the current running interval
		 */
		_startUpdateInterval: function () {
			var timeout = this.getUpdateTimeout();
			if (timeout > 0) {
				this.__timer.setInterval(this.getUpdateTimeout());
				this.__timer.start();
			}
			else {
				this.__timer.stop();
			}
		},

		/**
		 * stops the current running interval
		 */
		_stopUpdateInterval: function () {
			this.__timer.stop();
		},

		/**
		 * Timer event handler. Periodically checks whether the html content
		 * requires an update of the size of the widget.
		 *
		 * The update interval is controlled by the {@link #updateTimeout} property.
		 */
		_onUpdateInterval: function () {

			this.__processHtml();
		},

		// overridden to delay the "render" event to give a chance
		// to the designer to pick the correct rendered control.
		_onDesignRender: function () {

			var me = this;
			setTimeout(function () {
				me.fireEvent("render");
			}, 150);
		},

		/**
		 * Applies the HTML text.
		 */
		_applyHtml: function (value, old) {

			var html = this.getChildControl("html");
			html.setHtml("<div style='overflow:hidden' class='"
				+ this.__getClassName()
				+ "'>" + (value || "")
				+ "</div>");

			// update the inner HTML element size.
			this.__processHtml();
		},

		/**
		 * Applies the scrollBar property.
		 */
		_applyScrollBars: function (value, old) {

			var scroller = this.getChildControl("pane");
			if (value === 4 /*hide*/) {
				scroller.setScrollbarY("hide");
				scroller.setScrollbarX("hide");
			}
			else {
				scroller.setScrollbarY((value & wisej.web.ScrollableControl.VERTICAL_SCROLLBAR) ? "auto" : "off");
				scroller.setScrollbarX((value & wisej.web.ScrollableControl.HORIZONTAL_SCROLLBAR) ? "auto" : "off");
			}
		},

		/**
		 * Creates a new style sheet from the CSS text received from the server.
		 * Then iterate all the selectors and scope each selector using the name
		 * of the widget as the root class name.
		 */
		_applyCss: function (value, old) {

			// remove previous style sheet.
			if (this.__stylesheet) {
				qx.bom.Stylesheet.removeSheet(this.__stylesheet);
				this.__stylesheet = null;
			}

			if (!value)
				return;

			// create new style sheet.
			var stylesheet = qx.bom.Stylesheet.createElement(value);

			// alter all selectors.
			var rules = stylesheet.cssRules;
			var count = rules.length;
			var className = "." + this.__getClassName();
			for (var i = 0; i < count; i++) {
				var rule = rules[i];
				var selectors = rule.selectorText.split(",");
				for (var j = 0; j < selectors.length; j++) {
					selectors[j] = className + " " + selectors[j];
				}
				rule.selectorText = selectors.join(",");
			}

			// save the new style sheet.
			this.__stylesheet = stylesheet;
		},

		__getClassName: function () {

			return "htmlPanel_" + this.$$hash;

		},

		__onPaneResize: function (e) {

			this.__processHtml();

		},

		__processHtml: function () {

			var html = this.getChildControl("html");
			var el = html.getContentElement();
			if (el) {
				el.__flush();
				var htmlDom = el.getDomElement();
				var wrapperDom = htmlDom.firstChild;
				var paneSize = this.getChildControl("pane").getPaneSize();
				if (wrapperDom && paneSize) {
					wrapperDom.style.height = "auto";
					wrapperDom.style.width = paneSize.width + "px";
					if (wrapperDom.scrollWidth > 0 && wrapperDom.scrollHeight > 0) {
						html.setWidth(wrapperDom.scrollWidth);
						html.setHeight(wrapperDom.scrollHeight);
					}
				}

				// enable/disable the automatic IFrame blocker.
				this.enableIFrameBlocker(htmlDom.getElementsByTagName("IFRAME").length > 0);
			}
		},

		// Process clicks on inner elements.
		__onElementClick: function (e) {

			var evt = e.getNativeEvent();
			if (evt) {

				var target = evt.target;
				if (target) {

					if (!this.getAllowNavigation()) {

						// find if the target is inside a link.
						var link = target;
						for (link = target; link != null && link.tagName != "A"; link = link.parentNode);

						if (link && link.tagName == "A") {
							e.stop();
							target = link;
						}
					}
					this.fireDataEvent("elementClick", { html: target.outerHTML, role: target.getAttribute("role") });
				}
			}
		},

		/**
		 * Cover the iframe with a transparent blocker div element. This prevents
		 * pointer or key events to be handled by the iframe. To release the blocker
		 * use {@link #release}.
		 *
		 */
		block: function (e) {

			if (!this.__blockerElement)
				return;

			// don't block when the pointer event is originated by the iframe, or we disable embedded content.
			if (e.getTarget().tagName === "IFRAME")
				return;

			this.__blockerElement.setStyle("display", "block");

			// adjust the blocker z-index, otherwise the fixed z-index at 20 blocks all clicks on all overlapping widgets.
			this.__blockerElement.setStyle("z-index", this.getZIndex());
		},


		/**
		 * Release the blocker set by {@link #block}.
		 *
		 */
		release: function () {
			this.__blockerElement.setStyle("display", "none");
		},

		/**
		 * Overridden to create an inner scrollable pane.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "html":
					control = new qx.ui.embed.Html().set({
						width: 1,
						height: 1
					});
					this.add(control);
					break;
			}

			return control || this.base(arguments, id);
		},

		// overridden
		renderLayout: function (left, top, width, height) {
			this.base(arguments, left, top, width, height);

			var pixel = "px";
			var insets = this.getInsets();

			if (this.__blockerElement) {
				this.__blockerElement.setStyles({
					"left": (left + insets.left) + pixel,
					"top": (top + insets.top) + pixel,
					"width": (width - insets.left - insets.right) + pixel,
					"height": (height - insets.top - insets.bottom) + pixel
				});
			}
		},

		// overridden
		setLayoutParent: function (parent) {

			// remove the blocker element from the layout parent, and avoid adding it twice causing a js error.
			var oldParent = this.getLayoutParent();
			if (oldParent && this.__blockerElement)
				oldParent.getContentElement().remove(this.__blockerElement);

			this.base(arguments, parent);

			if (parent && this.__blockerElement) {
				parent.getContentElement().add(this.__blockerElement);
			}
		},

		/**
		 * Creates <div> element which is aligned over iframe node to avoid losing pointer events.
		 *
		 * @return {Object} Blocker element node
		 */
		_createBlockerElement: function () {
			var el = new qx.html.Blocker();
			el.setStyles({
				"zIndex": 20,
				"display": "none"
			});

			return el;
		}
	},

	destruct: function () {

		if (this.__stylesheet) {
			qx.bom.Stylesheet.removeSheet(this.__stylesheet);
			this.__stylesheet = null;
		}

		this._stopUpdateInterval();
		this._disposeObjects("__timer");

		if (this.getLayoutParent() && this.__blockerElement && this.__blockerElement.getParent()) {
			this.getLayoutParent().getContentElement().remove(this.__blockerElement);
		}
		this.enableIFrameBlocker(false);
	}
});