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

		// wire the appear event to set the inner html to autosize.
		this.getChildControl("html").addListenerOnce("appear", this.__updateHtmlSize, this);

		// wire the resize event to update scrollable area.
		var scroller = this.getChildControl("pane");
		scroller.addListener("resize", this.__onPaneResize, this);
		scroller.addListener("changeScrollbarXVisibility", this.__onScrollBarChangeVisibility, this);
		scroller.addListener("changeScrollbarXVisibility", this.__onScrollBarChangeVisibility, this);
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
		 * Determines which scrollbars should be visible: 1 = Horizontal, 2 = Vertical, 3 = Both.
		 */
		scrollBars: { init: 3, check: "PositiveInteger", apply: "_applyScrollBars" },
	},

	members: {

		// reference to the isolated style sheet.
		__stylesheet: null,

		/**
		 * Updates the panel size to fit the content.
		 */
		updateSize: function () {
			this.__updateHtmlSize();
		},

		/**
		 * Applies the HTML text.
		 */
		_applyHtml: function (value, old) {

			var html = this.getChildControl("html");
			html.setHtml("<div class='" + this.__getClassName() + "'>" + (value || "") + "</div>");

			// update the inner HTML element size.
			this.__updateHtmlSize();

		},

		/**
		 * Applies the scrollBar property.
		 */
		_applyScrollBars: function (value, old) {

			var scroller = this.getChildControl("pane");
			scroller.setScrollbarY((value & wisej.web.ScrollableControl.VERTICAL_SCROLLBAR) ? "auto" : "off");
			scroller.setScrollbarX((value & wisej.web.ScrollableControl.HORIZONTAL_SCROLLBAR) ? "auto" : "off");
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

			this.__updateHtmlSize();

		},

		__onScrollBarChangeVisibility: function (e) {

			var me = this;
			setTimeout(function () {
				me.__updateHtmlSize();
			}, 1);
		},

		__updateHtmlSize: function () {

			var html = this.getChildControl("html");
			var el = html.getContentElement();
			if (el) {
				el.__flush();
				var htmlDom = el.getDomElement();
				var wrapperDom = htmlDom.firstChild;
				var paneSize = this.getChildControl("pane").getPaneSize();
				if (wrapperDom && paneSize) {

					wrapperDom.style.height = "auto";
					wrapperDom.style.overflow = "hidden";
					wrapperDom.style.width = paneSize.width + "px";

					if (wrapperDom.scrollWidth > 0 && wrapperDom.scrollHeight > 0) {
						html.setWidth(wrapperDom.scrollWidth);
						html.setHeight(wrapperDom.scrollHeight);
						wrapperDom.style.width = "100%";
					}
				}
			}
		},

		// Process clicks on inner elements.
		__onElementClick: function (e) {

			var evt = e.getNativeEvent();
			if (evt) {

				var target = evt.target;
				if (target) {

					if (!this.getAllowNavigation()) {
						if (target.tagName == "A")
							e.stop();
					}
					this.fireDataEvent("elementClick", target.outerHTML);
				}
			}
		},

		/**
		 * Overridden to create an inner scrollable pane.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "html":
					var control = new qx.ui.embed.Html().set({
						width: 1,
						height: 1
					});
					this.add(control);
					break;
			}

			return control || this.base(arguments, id);
		},
	},

	destruct: function () {

		if (this.__stylesheet) {
			qx.bom.Stylesheet.removeSheet(this.__stylesheet);
			this.__stylesheet = null;
		}
	}
});