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
 * wisej.web.LinkLabel
 */
qx.Class.define("wisej.web.LinkLabel", {

	extend: wisej.web.Label,

	construct: function () {

		this.base(arguments);

		// create the inner link element when the dom is first created.
		this.addListenerOnce("appear", function () {
			this.__createInnerLinkElement(this.getValue());
		});
	},

	properties: {

		// appearance override
		appearance: { init: "linklabel", refine: true },

		/**
		 * LinkArea property.
		 *
		 * Defines the area in the text to convert to a hyper-link:
		 *
		 *	start: {Integer}
		 *  length: {Integer}
		 *
		 * When length = -1 the entire text becomes an hyper link.
		 */
		linkArea: { init: { start: 0, length: -1 }, check: "Object", apply: "_applyLinkArea" },

		/**
		 * LinkColor property.
		 */
		linkColor: { nullable: true, check: "Color", themeable: true, apply: "__applyStyles" },

		/**
		 * ActiveColor property.
		 */
		activeColor: { nullable: true, check: "Color", themeable: true, apply: "__applyStyles" },

		/**
		 * DisabledColor property.
		 */
		disabledColor: { nullable: true, check: "Color", themeable: true, apply: "__applyStyles" },

		/**
		 * Behavior property.
		 */
		behavior: { init: "systemDefault", check: ["systemDefault", "alwaysUnderline", "neverUnderline", "hoverUnderline"], themeable: true, apply: "__applyStyles" },
	},

	members: {

		/**
		 * Applies the linkArea property.
		 */
		_applyLinkArea: function (value, old) {

			this.__createInnerLinkElement(this.getValue());

		},

		/**
		 * Applies the value property.
		 *
		 * Splits the text and creates the link element
		 * according to the position and length in the linkArea property.
		 */
		_applyValue: function (value, old) {

			this.__createInnerLinkElement(value);

		},

		/**
		 * Applies the Enabled property.
		 * 
		 * Overridden to trigger the style update since this widget
		 * has it's own DisabledColor.
		 */
		_applyEnabled: function (value, old) {

			this.base(arguments, value, old);

			this.__applyStyles();
		},

		/**
		 * Creates the styles for the inner link elements.
		 */
		__applyStyles: function (mouseState) {

			var dom = this.getContentElement().getDomElement();
			if (dom) {

				var colorMgr = qx.theme.manager.Color.getInstance();

				var styles = {
					textDecoration: "underline",
					color: colorMgr.resolve(this.getLinkColor())
				};

				if (mouseState == null) {
					mouseState = {
						over: false,
						down: false
					};
				}

				// textDecoration
				switch (this.getBehavior()) {

					case "alwaysUnderline":
						styles.textDecoration = "underline";
						break;

					case "neverUnderline":
						styles.textDecoration = "none";
						break;

					case "hoverUnderline":
						mouseState.over
							? styles.textDecoration = "underline"
							: styles.textDecoration = "none";
						break;
				}

				// color
				if (!this.isEnabled())
					styles.color = colorMgr.resolve(this.getDisabledColor());
				else if (mouseState.down)
					styles.color = colorMgr.resolve(this.getActiveColor());

				var links = qx.bom.Selector.query("a", dom);
				for (var i = 0; i < links.length; i++) {
					qx.bom.element.Style.setStyles(links[i], styles);
				}
			}
		},

		/**
		 * Creates the link element.
		 */
		__createInnerLinkElement: function (text) {

			var dom = this.getContentElement().getDomElement();
			if (dom) {

				var area = this.getLinkArea();
				var textLeft = text.substr(0, area.start);
				var textLink = text.substr(area.start, area.length == -1 ? text.length : area.length);
				var textRight = text.substr(area.start + textLink.length);

				var html = textLink.length == 0
					? text
					: textLeft + "<a href=\'#\'>" + textLink + "</a>" + textRight;

				dom.innerHTML = html;

				this.__applyStyles();
				this.__attachNativeClickHandlers();
			}
		},

		/**
		 * Hooks up the "click" handler on all innner link elements.
		 */
		__attachNativeClickHandlers: function () {

			var dom = this.getContentElement().getDomElement();
			if (dom) {
				var links = qx.bom.Selector.query("a", dom);
				for (var i = 0; i < links.length; i++) {
					qx.bom.Event.addNativeListener(links[i], "click", this.__onNativeClick.bind(this));
					qx.bom.Event.addNativeListener(links[i], "mouseover", this.__onNativeMouseOver.bind(this));
					qx.bom.Event.addNativeListener(links[i], "mouseout", this.__onNativeMouseOut.bind(this));
					qx.bom.Event.addNativeListener(links[i], "mousedown", this.__onNativeMouseDown.bind(this));
					qx.bom.Event.addNativeListener(links[i], "mousedown", this.__onNativeMouseUp.bind(this));
				}
			}

		},

		__onNativeClick: function (e) {
			e.preventDefault();
			e.stopPropagation();

			if (this.isEnabled())
				this.fireDataEvent("linkClick", e.target.innerText);
		},
		__onNativeMouseOver: function (e) {

			this.__applyStyles({ over: true, down: false });

		},
		__onNativeMouseOut: function (e) {

			this.__applyStyles({ over: false, down: false });

		},
		__onNativeMouseDown: function (e) {

			this.__applyStyles({ over: true, down: true });

		},
		__onNativeMouseUp: function (e) {

			this.__applyStyles({ over: true, down: false });

		},

	},
});
