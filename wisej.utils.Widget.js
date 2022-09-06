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
		 * Returns the name of the automation property set in options["automation.property"] to use
		 * when options["automation.mode"] is set to true.
		 * 
		 * The default is "id".
		 */
		getAutomationPropertyName: function(){

			if (this.__automationPropertyName === null)
				this.__automationPropertyName = qx.core.Environment.get("automation.property") || "id";

			return this.__automationPropertyName;
		},
		__automationPropertyName: null,

		/**
		 * Returns whether the system should generate automation ids for child widgets
		 * when options["automation.drillDown"] is set to true.
		 * 
		 * The default is false.
		 */
		getAutomationDrillDown: function () {

			if (this.__automationDrillDown === null)
				this.__automationDrillDown = !!qx.core.Environment.get("automation.drillDown");

			return this.__automationDrillDown;
		},
		__automationDrillDown: null,

		/**
		 * Returns whether automation mode is enabled.
		 */
		getAutomationMode: function () {
			return !!qx.core.Environment.get("automation.mode");
		},

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

			return el.getDomElement();
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
			widget.invalidateLayoutCache();
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

				case "bottom":
					rotate = "rotate(180deg)";
					origin = "center center";
					translate = " translateX(0px) translateY(0px)";

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
		 * Returns true of the widget is in a popup.
		 * @param widget {qx.ui.core.Widget} Widget to check.
		 */
		isInsidePopup: function (widget) {

			while (widget) {

				if (widget instanceof qx.ui.popup.Popup)
					return true;

				widget = widget.getLayoutParent ? widget.getLayoutParent() : null;
			}

			return false;
		},

		/**
		 * Crawls up until it finds a wisej widget.
		 *
 		 * @param item {qx.ui.core.Widget | Element} A child widget or element.
 		 * @param excludeInner {Boolean?} Exclude inner children.
		 */
		findWisejComponent: function (item, excludeInner) {

			// retrieve the widget from the element.
			if (item instanceof Element)
				item = qx.ui.core.Widget.getWidgetByElement(item);

			excludeInner = excludeInner === true;
			while (item && (!item.isWisejComponent || (excludeInner && item.hasState("inner")))) {
				item = item.getLayoutParent ? item.getLayoutParent() : null;
			}

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
		 * @param width {Integer?} optional width constraint.
		 *
		 * @returns {Map} the size of the element: {width, height}.
		 */
		measure: function (html, className, style, width) {

			var el = this.__measureElement;

			// create the element used to measure.
			if (el == null) {
				el = this.__measureElement = qx.dom.Element.create("div");
				document.body.appendChild(el);

				el.$$style = el.style.cssText = style;

				var elStyle = el.style;
				elStyle.height = "auto";
				elStyle.left = elStyle.top = "-10000px";
				elStyle.visibility = "hidden";
				elStyle.position = "absolute";
				elStyle.overflow = "hidden";
				elStyle.display = "block";
				elStyle.whiteSpace = "normal";

			}

			el.innerHTML = "";

			if (el.$$style !== style) {
				el.$$style = el.style.cssText = style;

				var elStyle = el.style;
				elStyle.height = "auto";
				elStyle.left = elStyle.top = "-10000px";
				elStyle.visibility = "hidden";
				elStyle.position = "absolute";
				elStyle.overflow = "hidden";
				elStyle.display = "block";
				elStyle.whiteSpace = "normal";
			}

			el.className = className || "";
			el.style.width = width === undefined ? "auto" : (width + "px");
			el.innerHTML = html;

			// detect size
			var firstChild = el.firstChild;
			firstChild.style.width = "auto";
			firstChild.style.height = "auto";
			firstChild.style.position = "relative";
			var size = {
				width: el.offsetWidth,
				height: el.offsetHeight
			};

			// all modern browser are needing one more pixel for width
			size.width++;

			return size;
		},
		__measureElement: null,

		/**
		 * Returns the value of the "role" attribute of the closest containing element up to the widget container.
		 *
		 * @param e {qx.event.type.Event} the event data from where to retrieve the role of the clicked element.
		 */
		getTargetRole: function (e) {

			var el = e.getOriginalTarget();
			if (!el || !el.nodeType)
				return null;

			var target = e.getTarget();
			if (!target)
				return null;

			var containerEl = target.getContentElement().getDomElement();
			if (!containerEl || !containerEl.nodeType)
				return null;

			var role = null;
			for (var node = el; node != null; node = node.parentNode) {

				role = node.getAttribute ? node.getAttribute("role") : null;
				if (role != null || node === containerEl)
					break;
			}

			// try with the name of the child component.
			if (!role) {
				var child = qx.ui.core.Widget.getWidgetByElement(el);
				if (child)
					role = child.$$subcontrol;
			}

			return role;
		},

		/**
		 * Determines whether the widget can execute a shortcut or a mnemonic command.
		 *
 		 * @param child {qx.ui.core.Widget} The child widget to check.
		 */
		canExecute: function (target) {

			if (!target)
				return false;

			// a form must be active.
			if (target instanceof wisej.web.Form) {
				if (!target.isActive())
					return false;
			}

			if (target instanceof qx.ui.menu.Menu)
				target = this.findWisejComponent(target.getOpener());

			// the top level container must be active:
			//   - current main page, or
			//   - current desktop, or
			//   - active floating form, or
			//   - active mdi child form.
			var topLevel = target ? target.getTopLevelContainer() : null;
			if (topLevel && topLevel.isActive()) {

				var focusHandler = qx.ui.core.FocusHandler.getInstance();
				var activeWidget = this.findWisejComponent(focusHandler.getActiveWidget());

				// ensure that the active widget that triggered the
				// accelerator has the same parent as the target of the accelerator.
				if (activeWidget) {
					var activeContainer = activeWidget.getTopLevelContainer();

					if (activeContainer != topLevel
						&& activeWidget != topLevel
						&& !qx.ui.core.Widget.contains(topLevel, activeContainer)) {
						return false;
					}
				}

				return activeWidget == null
						|| activeWidget === topLevel
						|| activeWidget === Wisej.Platform.getRoot()
						|| qx.ui.core.Widget.contains(topLevel, activeWidget);
			}

			return false;
		},

		/**
		 * Returns true when the identifier is a valid input key
		 * that can be send to the server for the keypress event.
		 */
		isInputKey: function (identifier) {

			if (!this.inputKeyMap) {
				this.inputKeyMap = {};
				var keyCodes = qx.event.util.Keyboard.keyCodeToIdentifierMap;
				for (var key in keyCodes) {
					this.inputKeyMap[keyCodes[key]] = true;
				}
			}
			return this.inputKeyMap[identifier];
		},

		/**
		 * Adds the "opener" and "container" attributes to popup widgets
		 * to be able to reference their opener control and container
		 * when using QA automation tools.
		 */
		setAutomationAttributes: function (target, opener) {

			if (!target)
				return;

			var ownerName = null;
			var openerName = null;
			var container = null;
			var containerName = null;

			if (opener) {

				if (opener.isWisejMenu) {

					// determine "opener" and "container" for floating menus.
					container = opener.findContainer();
					if (container && container.isWisejComponent) {
						container = container.getTopLevelContainer();
					}

					openerName = opener.getName();
					if (container && container.isWisejComponent) {
						containerName = container.getName();
					}

					// determine the owner, mostly for MDI merged menu.
					var owner = opener.getUserData("owner");
					if (owner && owner.isWisejComponent) {
						ownerName = owner.getName(); // mdiChild1
					}
				}
				else if (opener.isWisejControl) {

					// determine "opener" and "container" for floating popups (i.e. drop down controls).
					openerName = opener.getName(); // comboBow1

					container = opener.getTopLevelContainer();
					if (container && container.isWisejComponent) {
						containerName = container.getName(); // page1
					}

					// determine "opener" and "container" for floating popups
					// created by parentless widgets (i.e. table editors with a drop down).
					owner = opener.getUserData("owner");
					if (owner && owner.isWisejComponent) {
						ownerName = owner.getName(); // dataGrid1
						container = owner.getTopLevelContainer();
						if (container && container.isWisejComponent) {
							containerName = container.getName(); // page1
						}
					}
					opener = opener.getUserData("opener");
					if (opener && opener.isWisejComponent) {
						openerName = opener.getName(); // dataGrid1
					}
				}
				else if (opener.isWisejComponent) {

					// determine "opener", "owner" and "container" for parentless widgets
					// i.e. table editors where the owner is the column component.
					openerName = opener.getName(); // column1

					container = opener.getTopLevelContainer();
					if (container && container.isWisejComponent) {
						containerName = container.getName(); // page1
					}

					owner = target.getUserData("owner");
					if (owner && owner.isWisejComponent) {
						ownerName = owner.getName(); // dataGrid1
						container = owner.getTopLevelContainer();
						if (container && container.isWisejComponent) {
							containerName = container.getName(); // page1
						}
					}
				}

				// change "" to null.
				ownerName = ownerName ? ownerName : null;
				openerName = openerName ? openerName : null;
				containerName = containerName ? containerName : null;
			}

			var el = target.isWisejComponent ? target.getAutomationElement() : target.getContentElement();
			if (el) {
				el.setAttributes({
					"owner": ownerName,
					"opener": openerName,
					"container": containerName
				});
			}

			if (qx.core.Environment.get("automation.mode") === true)
				this.setAutomationID(target);
		},

		/**
		 * Generates a unique hierarchal ID to be used with automation tools.
		 */
		setAutomationID: function (target, parent, force) {

			if (!target)
				return;

			if (force !== true && target.getUserData("automationId"))
				return;

			var names = [], name, className;

			var el = target.isWisejComponent ? target.getAutomationElement() : target.getContentElement();
			if (el) {

				var ids = [];
				var ownerName = el.getAttribute("owner");
				var openerName = el.getAttribute("opener");
				var containerName = el.getAttribute("container");
				var propertyName = this.getAutomationPropertyName();

				if (containerName)
					ids.push(containerName);
				if (ownerName)
					ids.push(ownerName);
				if (openerName)
					ids.push(openerName);

				if (target.isWisejComponent) {
					name = target.getName();
					if (!name) {
						className = target.name.split(".");
						name = className[className.length - 1];
					}
					if (name)
						names.push(name);
				}
				else if (target.$$subcontrol) {
					names.push(target.$$subcontrol);
				}

				parent = parent || target.getLayoutParent();
				for (var widget = parent; widget != null; widget = widget.getLayoutParent()) {

					if (widget.isWisejComponent) {
						name = widget.getName();
						if (!name) {
							className = widget.name.split(".");
							name = className[className.length - 1];
						}
						if (name)
							names.push(name);
					}

					var parentEl = widget.getContentElement();
					if (!containerName) {
						containerName = parentEl.getAttribute("container");
						if (containerName)
							ids.push(containerName);
					}
					if (!ownerName) {
						ownerName = parentEl.getAttribute("owner");
						if (ownerName)
							ids.push(ownerName);
					}
					if (!openerName) {
						openerName = parentEl.getAttribute("opener");
						if (openerName)
							ids.push(openerName);
					}
				}
				names.reverse();

				var id = "";

				if (ids.length === 0)
					id = names.join("_");
				else if (names.length === 0)
					id = ids.join("_");
				else
					id = ids.join("_") + "_" + names.join("_");

				// check collisions.
				if (propertyName === "id") {
					if (document.getElementById(id)) {
						id = id + "_";
						var counter = 1;
						while (document.getElementById(id + counter)) {
							counter++;
						}
						id = id + counter;
					}
				}
				else {
					if (document.querySelector("[" + propertyName + "='" + id + "']")) {
						id = id + "_";
						var counter = 1;
						while (document.querySelector("[" + propertyName + "='" + id + counter + "']")) {
							counter++;
						}
						id = id + counter;
					}
				}

				el.setAttribute(propertyName, id, true);
				target.setUserData("automationId", id);

				// drill down child widgets? (enabled using the "automation.drillDown" option)
				if (this.getAutomationDrillDown() && target instanceof qx.ui.core.Widget) {
					var child;
					var childControls = target._getCreatedChildControls();
					if (childControls && childControls.length > 0) {
						for (var i = 0; i < childControls.length; i++) {
							child = childControls[i];
							if (child && child.$$subcontrol && child.getContentElement())
								child.getContentElement().setAttribute(propertyName, id + "_" + child.$$subcontrol);
						}
					}
				}

				// always drill down anonymous children at all levels.
				if (target instanceof qx.ui.core.Widget)
				{
					var anonymous;
					var children = target._getChildren();
					for (var i = 0; i < children.length; i++) {
						anonymous = children[i];
						if (anonymous.isWisejControl && anonymous.isAnonymous()) {
							this.setAutomationID(anonymous);
						}
					}
				}
			}

			// if the target has an accessibility element, ID that one too.
			var acc = target.getAccessibilityTarget ? target.getAccessibilityTarget() : null;
			if (acc && acc !== target) {
				this.setAutomationID(acc);
			}
		},

		/**
		 * Removes the automation ID.
		 */
		clearAutomationID: function (target) {

			if (!target)
				return;

			target.setUserData("automationId", null);

			var propertyName = this.getAutomationPropertyName();
			var el = target.isWisejComponent ? target.getAutomationElement() : target.getContentElement();
			if (el) {
				el.removeAttribute(propertyName, true);
			}
		},
		
		/**
		 * Parses the css string into a style map.
		 * @param {any} css
		 */
		parseCss: function (css) {

			var el = this.__cssParseElement;

			// create the element used to parse.
			if (el == null) {
				el = this.__cssParseElement = qx.dom.Element.create("div");
			}

			el.setAttribute("style", css);

			var map = {};
			var style = el.style;
			for (var i = 0, l = style.length; i < l; i++) {
				map[style[i]] = style[style[i]];
			}

			return map;
		},
		__cssParseElement: null,

		/**
		 * Converts Keys codes from the server to JavaScript codes.
		 */
		translateAcceleratorKey: function (code) {

			switch (code) {
				case "D0": code = "0"; break;
				case "D1": code = "1"; break;
				case "D2": code = "2"; break;
				case "D3": code = "3"; break;
				case "D4": code = "4"; break;
				case "D5": code = "5"; break;
				case "D6": code = "6"; break;
				case "D7": code = "7"; break;
				case "D8": code = "8"; break;
				case "D9": code = "9"; break;
				case "Esc": code = "Escape"; break;
				case "Back": code = "Backspace"; break;
				case "Return": code = "Enter"; break;
				case "PrintScreen": code = "Print"; break;
			}

			return code;
		},

		/**
		 * Returns whether parent contains the widget directly
		 * or through an inline root.
		 * 
		 * @param parent {qx.ui.core.Widget} Owner.
		 * @param widget {qx.ui.core.Widget} Owned widget to check.
		 */
		contains: function (parent, widget) {

			if (!parent || !widget)
				return false;

			var child = widget;
			while (child) {

				// check inline roots.
				if (child instanceof qx.ui.root.Inline) {
					child = child.getUserData("parent");
					if (!child)
						break
				}

				child = child.getLayoutParent();
				if (parent == child)
					return true;
			}

			return false;		
		}
	}

});

