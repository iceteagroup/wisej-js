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

		this.addListener("keydown", this._onKeyDown);

		this.addListener("click", this._onAnchorEvent);
		this.addListener("mouseout", this._onAnchorEvent);
		this.addListener("mousemove", this._onAnchorEvent);
		this.addListener("mousedown", this._onAnchorEvent);
		this.addListener("mouseup", this._onAnchorEvent);
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
		linkColor: { nullable: true, check: "Color", themeable: true },

		/**
		 * ActiveColor property.
		 */
		activeColor: { nullable: true, check: "Color", themeable: true },

		/**
		 * DisabledColor property.
		 */
		disabledColor: { nullable: true, check: "Color", themeable: true },

		/**
		 * Behavior property.
		 */
		behavior: { init: "systemDefault", check: ["systemDefault", "alwaysUnderline", "neverUnderline", "hoverUnderline"], themeable: true },
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
		__applyStyles: function (el, mouseState) {

			var dom = this.getContentElement().getDomElement();
			if (dom) {

				var colorMgr = qx.theme.manager.Color.getInstance();

				if (mouseState == null) {
					mouseState = {
						over: false,
						down: false
					};
				}

				var styles = {
					textDecoration: "underline",
					color: colorMgr.resolve(this.getLinkColor()),
				};

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

				if (el) {
					qx.bom.element.Style.setStyles(el, styles);
				}
				else {
					var links = qx.bom.Selector.query("a", dom);
					for (var i = 0; i < links.length; i++) {
						qx.bom.element.Style.setStyles(links[i], styles);
					}
				}

				// cursor
				if (!this.getCursor()) {
					if (mouseState.over)
						this.getContentElement().setStyle("cursor", "pointer");
					else
						this.getContentElement().removeStyle("cursor");
				}
			}
		},

		// overridden
		_onChangeTheme: function () {

			this.base(arguments);

			this.__applyStyles();
		},

		/**
		 * Listener method for "keydown" event.
		 * Fires "linkClicked" on pressing Enter.
		 *
		 * @param e {Event} Key event
		 */
		_onKeyDown: function (e) {
			switch (e.getKeyIdentifier()) {
				case "Enter":
					var text = this.getValue();
					var area = this.getLinkArea();
					var textLink = text.substr(area.start, area.length == -1 ? text.length : area.length);
					this.fireDataEvent("linkClick", textLink);
					break;
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
			}
		},

		// last element under the pointer.
		__lastEl: null,

		_onAnchorEvent: function (e) {

			var el = this.__findElement(e.getDocumentLeft(), e.getDocumentTop());

			switch (e.getType()) {

				case "click":
					if (el) {
						e.preventDefault();
						e.stopPropagation();
						if (this.isEnabled())
							this.fireDataEvent("linkClick", el.innerText);
					}
					break;

				case "mouseout":
					{
						// mouseout
						if (this.__lastEl)
							this.__applyStyles(this.__lastEl, { over: false, down: false });

						this.__lastEl = null;
					}
					break;

				case "mousemove":
					{
						// mouseout
						if (this.__lastEl && this.__lastEl != el)
							this.__applyStyles(this.__lastEl, { over: false, down: false });

						// mouseover
						if (el && this.__lastEl != el)
							this.__applyStyles(el, { over: true, down: false });

						this.__lastEl = el;
					}
					break;

				case "mousedown":
					if  (el)
						this.__applyStyles(el, { over: true, down: true });
					break;

				case "mouseup":
					if (el)
						this.__applyStyles(el, { over: true, down: false });
					break;
			}
		},

		__findElement: function (x, y) {

			var dom = this.getContentElement().getDomElement();

			var nodes = dom.childNodes;
			for (var i = 0; i < nodes.length; i++) {

				if (nodes[i].tagName == "A") {

					var rect = nodes[i].getBoundingClientRect();
					if (rect.left <= x && rect.right >= x &&
						rect.top <= y && rect.bottom >= y) {

						return nodes[i];
					}
				}
			}
		}
	}
});
