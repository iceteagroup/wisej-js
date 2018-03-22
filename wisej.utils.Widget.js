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
 * wisej.utils.Widget
 * 
 * Collection of common methods.
 */
qx.Class.define("wisej.utils.Widget", {

	type: "static",
	extend: qx.core.Object,

	statics: {

		/**
		 * Creates a scaled clone of the dom for the specified widget.
		 *
		 * @param widget {qx.ui.core.Widget} The widget to clone and scale.
		 * @param size {Map} The size of the thumbnail.
		 * @param scaleMode {String} One of "fit", "fill", "fitWidth", "fitHeight".
		 * @returns {Element} Copied and scaled dom element.
		 */
		makeThumbnail: function (widget, size, scaleMode) {

			// sanity check.
			if (!widget || !size)
				return;

			// retrieve the dom for the source widget. force the creation if necessary.
			var sourceDom = wisej.utils.Widget.ensureDomElement(widget);
			if (!sourceDom)
				return;

			// calculate the scale ratio.
			var sourceSize = wisej.utils.Widget.getDomSize(sourceDom);
			switch (scaleMode) {
				default:
				case "fit":
					if (sourceSize.width > sourceSize.height)
						ratio = size.width / sourceSize.width;
					else
						ratio = size.height / sourceSize.height;
					break;

				case "fill":
					if (sourceSize.width < sourceSize.height)
						ratio = size.width / sourceSize.width;
					else
						ratio = size.height / sourceSize.height;
					break;

				case "fitWidth":
					ratio = size.width / sourceSize.width;
					break;

				case "fitHeight":
					ratio = size.height / sourceSize.height;
					break;
			}

			// create the scaled copy of the source dom element.
			var origin = "left top";
			var scale = "scale(" + ratio + ")";
			var thumbnail = qx.bom.Element.clone(sourceDom);
			qx.bom.element.Style.setStyles(thumbnail, {
				"z-index": null,
				"display": null,
				"left": "0px",
				"top": "0px",
				"-ms-transform": scale,
				"-webkit-transform": scale,
				"transform": scale,
				"-ms-transform-origin": origin,
				"-webkit-transform-origin": origin,
				"transform-origin": origin,
				"opacity": 1
			});

			return thumbnail;
		},

		/**
		 * Forces the creation of the dom and stores
		 * the client size in the $$size member.
		 *
		 * @param widget {qx.ui.core.Widget} The widget for which to ensure the creation of the dom elements.
		 */
		ensureDomElement: function (widget) {

			var el = widget.getContentElement();
			if (!el)
				return;

			// force the creation of the dom.
			el.__flush();

			var dom = el.getDomElement();
			if (dom)
				return dom;

			var dom = el.getDomElement();
			return dom;
		},

		/**
		 * Returns either the client size or the style size.
		 *
		 * @param dom {Element} The target HTML element.
		 */
		getDomSize: function (dom) {
			if (!dom)
				return { width: 0, height: 0 };

			var size = {
				width: dom.clientWidth,
				height: dom.clientHeight
			};

			if (size.width == 0 || size.height == 0) {
				size.width = parseInt(dom.style.width);
				size.height = parseInt(dom.style.height);
			}
			return size;

		},

		/**
		 * Rotates the widget.
		 *
 		 * @param widget {qx.ui.core.Widget} The widget to rotate.
 		 * @param direction {String} Rotation direction: "none", "left", "right".
		 */
		rotate: function (widget, direction) {

			if (!widget)
				return;

			var el = widget.getContentElement();
			if (el == null)
				return false;

			// reset and recalculate the preferred size.
			var size = null;
			if (widget.isVisible()) {
				size = widget.getSizeHint();
			}
			else {
				var visibility = widget.getVisibility();
				widget.setVisibility("visible");
				size = widget.getSizeHint();
				widget.setVisibility(visibility);
			}

			var origin = "";
			var rotate = "";
			var translate = "";
			var width = size.width, height = size.height;

			if (width == 0 || height == 0)
				return;

			switch (direction) {

				case "left":
					rotate = "rotate(-90deg)";
					origin = "center center";
					translate = " translateX(" + Math.round((height / 2 - width / 2)) + "px) translateY(" + Math.round((width / 2 - height / 2)) + "px)";

					// switch height and width.
					width = size.height;
					height = size.width;

					widget.setWidth(width);
					widget.setHeight(height);
					widget.setMinWidth(width);
					widget.setMinHeight(height);
					break;

				case "right":
					rotate = "rotate(90deg)";
					origin = "center center";
					translate = " translateX(" + Math.round((height / 2 - width / 2)) + "px) translateY(" + Math.round((width / 2 - height / 2)) + "px)";

					// switch height and width.
					width = size.height;
					height = size.width;

					widget.setWidth(width);
					widget.setHeight(height);
					widget.setMinWidth(width);
					widget.setMinHeight(height);
					break;

				default:
				case "none":
					rotate = "rotate(0deg)";
					origin = "center center";
					translate = " translateX(0px) translateY(0px)";

					widget.setWidth(width);
					widget.setHeight(height);
					widget.setMinWidth(width);
					widget.setMinHeight(height);
					break;
			}

			el.setStyles({
				"-ms-transform": rotate + translate,
				"-webkit-transform": rotate + translate,
				"transform": rotate + translate,
				"-ms-transform-origin": origin,
				"-webkit-transform-origin": origin,
				"transform-origin": origin,
				"overflow": "visible"
			});
		},

		/**
		 * Returns the widget at the specified location.
		 *
 		 * @param container {qx.ui.core.Widget} Container widget. If null, the x,y coordinates refer to the document.
 		 * @param x {Integer} X location relative to the container.
 		 * @param y {Integer} Y location relative to the container.
		 */
		getWidgetFromPoint: function (container, x, y) {
			// use either the document or the container element.
			var parentEl = container == null ? document.body : container.getContentElement().getDomElement();
			if (parentEl == null)
				return undefined;

			var location = qx.bom.element.Location.get(parentEl);
			if (location == null)
				return undefined;

			var el = document.elementFromPoint(location.left + x, location.top + y);
			var widget = qx.ui.core.Widget.getWidgetByElement(el);

			// search for a valid wisej owner widget.
			while (widget != null && !widget.isWisejComponent) {
				widget = widget.getLayoutParent();
			}

			return widget;
		},

		/**
		 * Crawls up until it finds a wisej widget.
		 *
 		 * @param item {qx.ui.core.Widget | Element} A child widget or element.
		 */
		findWisejComponent: function (item) {

			// retrieve the widget from the element.
			if (item instanceof Element)
				item = qx.ui.core.Widget.getWidgetByElement(item);

			while (item && !item.isWisejComponent)
				item = item.getLayoutParent ? item.getLayoutParent() : null;

			return item;
		},

		/**
		 * Returns the client size of the widget without the scrollbars.
		 *
 		 * @param widget {qx.ui.core.Widget} The widget to measure.
		 */
		getClientSize: function (widget) {

			var size = widget.getInnerSize();

			var overlayed = qx.core.Environment.get("os.scrollBarOverlayed");
			if (overlayed)
				return size;

			var showX = widget._isChildControlVisible("scrollbar-x");
			var showY = widget._isChildControlVisible("scrollbar-y");

			if (showX) {
				var scrollBar = widget.getChildControl("scrollbar-x");
				size.height -= scrollBar.getSizeHint().height + scrollBar.getMarginTop() + scrollBar.getMarginBottom();
			}

			if (showY) {
				var scrollBar = widget.getChildControl("scrollbar-y");
				size.width -= scrollBar.getSizeHint().width + scrollBar.getMarginLeft() + scrollBar.getMarginRight();
			}

			return size;
		},

		/**
		 * Measures the html element.
		 *
		 * @param html {String} html text to measure.
		 * @param className {String} name of the css class to use.
		 * @param style {String} css style definition of the element to measure.
		 * @returns {Map} the size of the element: {width, height}.
		 */
		measure: function (html, className, style) {

			var el = this.__measureElement;

			// create the element used to measure.
			if (this.__measureElement == null)
				this.__measureElement = el = qx.dom.Element.create("div");

			el.style = style;

			var elStyle = el.style;
			elStyle.width = elStyle.height = "auto";
			elStyle.left = elStyle.top = "-1000px";
			elStyle.visibility = "hidden";
			elStyle.position = "absolute";
			elStyle.overflow = "hidden";
			elStyle.display = "block";
			elStyle.whiteSpace = "normal";
			document.body.appendChild(el);

			el.className = className;
			el.innerHTML = html;

			// detect size
			var size = qx.bom.element.Dimension.getSize(el);

			// all modern browser are needing one more pixel for width
			size.width++;

			return size;
		},
		__measureElement: null,

		/**
		 * Returns the value of the "role" attribute of the closest containing element up to the widget container.
		 *
		 * @param el {HTMLElement} the target element from where to retrieve the role.
		 */
		getTargetRole: function (el) {

			if (!el || !el.nodeType)
				return null;

			var role = null;
			for (var node = el; node != null; node = node.parentNode) {
				if (node.$$widget)
					break;

				role = node.getAttribute ? node.getAttribute("role") : null;
				if (role)
					break;
			}

			return role;
		},

		/**
		 * Determines whether the widget can execute a shortcut or a mnemonic command.
		 * Checks if the widget is in an active container or is a standalone widget.
		 *
 		 * @param child {qx.ui.core.Widget} The child widget to check.
		 */
		canExecute: function (child) {

			if (!child)
				return false;

			var parent = null;
			for (parent = child.getLayoutParent() ;
					parent != null && !(parent.getLayoutParent() instanceof qx.ui.root.Abstract) ;
						parent = parent.getLayoutParent());

			if (parent)
			{
				if (parent instanceof wisej.web.Form)
				{
					return parent.isActive();
				}
				else if (parent instanceof wisej.web.ScrollablePage)
				{
					return parent.isSeeable();
				}
				else if (parent instanceof wisej.web.Desktop)
				{
					return parent.isSeeable();
				}
			}
			return true;
		},

		/**
		 * Returns true when the identifier is a valid input key
		 * that can be send to the server for the keypress event.
		 */
		isInputKey: function (identifier) {

			if (!this.inputKeyMap)
			{
				this.inputKeyMap = {};
				var keyCodes = qx.event.util.Keyboard.keyCodeToIdentifierMap;
				for (var key in keyCodes) {
					this.inputKeyMap[keyCodes[key]] = true;
				}
			}
			return this.inputKeyMap[identifier];
		}
	}

});


/**
 * wisej.utils.FocusHandlerPatch
 *
 * Replaces the tab index comparer in qx.ui.core.FocusHandler to
 * take in consideration the widget's hierarchy.
 */
qx.Mixin.define("wisej.utils.FocusHandlerPatch", {

	statics: {

		/**
		 * Builds the tab index path array from the widget to the topmost parent.
		 */
		__collectTabIndexPath: function (widget) {
			var path = [];

			for (var parent = widget; parent != null; parent = parent.getLayoutParent()) {

				var tabIndex = parent.getTabIndex();
				if (tabIndex != null && tabIndex > -1)
					path.push(tabIndex);
			}

			path.reverse();
			return path;
		},
	},

	members: {

		/**
		 * Compares the tabIndex of two widgets taking on consideration
		 * their position as children widgets.
		 *
		 * @param widget1 {qx.ui.core.Widget} widget to compare.
		 * @param widget1 {qx.ui.core.Widget} widget to compare.
		 */
		__compareTabOrder: function (widget1, widget2) {

			if (widget1 == widget2)
				return 0;

			var tabPath1 = wisej.utils.FocusHandlerPatch.__collectTabIndexPath(widget1);
			var tabPath2 = wisej.utils.FocusHandlerPatch.__collectTabIndexPath(widget2);

			for (var i = 0; i < tabPath1.length && i < tabPath2.length; i++) {
				if (tabPath1[i] != tabPath2[i]) {
					return tabPath1[i] - tabPath2[i];
				}
			}

			var z1 = widget1.getZIndex() || 0;
			var z2 = widget2.getZIndex() || 0;
			return z1 == z2
				? tabPath1.length - tabPath2.length
				: z1 - z2;
		},
	}
});

qx.Class.patch(qx.ui.core.FocusHandler, wisej.utils.FocusHandlerPatch);
