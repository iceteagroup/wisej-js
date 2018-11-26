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
 * wisej.web.datagrid.StyleManager
 *
 * The StyleManager class in the DataGrid system is designed to read the current theme
 * and generate css classes usable by the row/cell renderers.
 */
qx.Class.define("wisej.web.datagrid.StyleManager", {

	extend: qx.core.Object,
	type: "singleton",

	construct: function () {

		this.base(arguments);

		// create the local stylesheet.
		this.__sheet = qx.bom.Stylesheet.createElement("");

		// dynamic theme switch
		if (qx.core.Environment.get("qx.dyntheme")) {
			qx.theme.manager.Meta.getInstance().addListener("changeTheme", this._onChangeTheme, this);
		}

	},

	members: {

		// stylesheet used by this class to manage the datagrid css classes.
		__sheet: null,

		// list of registered classes. they will be recreated when the theme changes.
		// the map is { appearance: "", states: {}, defaultCss: "" }.
		__classNames: {},

		/**
		 * Retrieves or creates the css class corresponding to the appearance and the states.
		 */
		getCssClass: function (appearance, states, defaultCss) {

			try {

				// check if the class is already registered.
				var className = this.__buildClassName(appearance, states);
				if (this.__classNames[className] != null)
					return className;

				return this.__getCssClass(className, this.__sheet, appearance, states, defaultCss);
			}
			catch (ex) {
				this.warn("Missing appearance: ", appearance);
			}
		},

		/**
		 * Returns the stylesheet containing the datagrid styles.
		 */
		getStyleSheet: function () {

			return this.__sheet;
		},

		/**
		 * Returns the size of the border for the 
		 * specified table appearance and state.
		 */
		getBorder: function (appearance, states) {

			var border = { top: 0, right: 0, bottom: 0, left: 0 };

			var className = this.__buildClassName(appearance, states);
			var styleEntry = this.__classNames[className];
			if (styleEntry) {

				var decorator = styleEntry.decorator;
				if (decorator)
					border = decorator.getInsets();
			}

			return border;
		},

		__getCssClass: function (className, sheet, appearance, states, css) {

			// retrieve the theme managers.
			var appearanceMgr = qx.theme.manager.Appearance.getInstance();
			var decorationMgr = qx.theme.manager.Decoration.getInstance();

			// create the cell class from the theme.
			var decorator = null;
			var themeData = appearanceMgr.styleFrom(appearance, states, null, "");
			if (themeData && themeData.decorator)
				decorator = decorationMgr.resolve(themeData.decorator);

			// cache the class in the list of registered classes.
			this.__classNames[className] = { appearance: appearance, states: states, defaultCss: css, decorator: decorator };

			// create the rule.
			var selector = "." + className;

			// check if the rule already exists.
			for (var i = 0; i < sheet.cssRules.length; i++) {
				if (sheet.cssRules[i].selectorText == selector) {
					return className;
				}
			}

			// create the new rule.
			qx.bom.Stylesheet.addRule(sheet, selector, css);
			var rule = sheet.cssRules[sheet.cssRules.length - 1];

			// apply properties from the theme.
			if (decorator) {
				var styles = decorator.getStyles(true);
				for (var key in styles) {

					// don't override default rules.
					if (rule.style[key])
						continue;

					// if we find a map value, use it as pseudo class
					if (qx.Bootstrap.isObject(styles[key])) {
						var innerCss = "";
						var innerStyles = styles[key];
						var inner = false;
						for (var innerKey in innerStyles) {
							inner = true;
							innerCss += innerKey + ":" + innerStyles[innerKey] + ";";
						}
						var innerSelector = this.__legacyIe ? selector : selector + (inner ? ":" : "");
						qx.bom.Stylesheet.addRule(sheet, innerSelector + key, innerCss);
						continue;
					}

					rule.style[key] = styles[key];
				}
			}

			if (themeData) {

				this.__setThemeFont(rule.style, themeData);
				this.__setThemeWidth(rule.style, themeData);
				this.__setThemeHeight(rule.style, themeData);
				this.__setThemeCursor(rule.style, themeData);
				this.__setThemeMargin(rule.style, themeData);
				this.__setThemePadding(rule.style, themeData);
				this.__setThemeTextColor(rule.style, themeData);
				this.__setThemeTextAlignment(rule.style, themeData);
				this.__setThemeBackgroundColor(rule.style, themeData);
			}

			return className;
		},

		/**
		 * Creates a new pseudo class using the decorator from the specified theme appearance key and state.
		 */
		createCssPseudoClass: function (className, appearance, states, defaultCss) {

			try {

				// check if the class is already registered.
				if (this.__classNames[className] != null)
					return className;

				return this.__getCssClass(className, this.__sheet, appearance, states, defaultCss);
			}
			catch (ex) {
				this.warn("Missing appearance: ", appearance);
			}
		},

		__buildClassName: function (appearance, states) {

			var className = qx.theme.manager.Decoration.CSS_CLASSNAME_PREFIX + appearance;
			className = className.replace(/\//g, "-");

			if (states) {

				for (var name in states) {
					if (name != "default" && states[name])
						className += "-" + name;
				}
			}

			return className;

		},

		__setThemeFont: function (style, data) {

			var font = data["font"];
			if (font) {
				var fontMgr = qx.theme.manager.Font.getInstance();
				font = fontMgr.resolve(font);
				if (font) {
					var styles = font.getStyles();
					for (var name in styles)
						style[name] = styles[name];
				}
			}
		},

		__setThemeWidth: function (style, data) {

			var width = data["width"];
			if (width != null) {
				style.width = isNaN(width) ? width : (width + "px");
			}
		},

		__setThemeHeight: function (style, data) {

			var height = data["height"];
			if (height != null) {
				style.height = isNaN(height) ? height : (height + "px");
			}
		},

		__setThemeTextColor: function (style, data) {

			var color = data["textColor"];
			if (color) {
				var colorMgr = qx.theme.manager.Color.getInstance();
				style.color = colorMgr.resolve(color);
			}
		},

		__setThemeBackgroundColor: function (style, data) {

			var color = data["backgroundColor"];
			if (color) {
				var colorMgr = qx.theme.manager.Color.getInstance();
				style.backgroundColor = colorMgr.resolve(color);
			}
		},

		__setThemeCursor: function (style, data) {

			var cursor = data["cursor"];
			if (cursor)
				style.cursor = cursor;
		},

		__setThemeMargin: function (style, data) {

			var margin = data["margin"];
			if (!(margin instanceof Array))
				margin = [margin, margin, margin, margin];

			var marginTop = data["marginTop"];
			var marginLeft = data["marginLeft"];
			var marginRight = data["marginRight"];
			var marginBottom = data["marginBottom"];

			if (margin[0] || marginTop)
				style.marginTop = (margin[0] || marginTop) + "px";
			if (margin[3] || marginLeft)
				style.marginLeft = (margin[3] || marginLeft) + "px";
			if (margin[1] || marginRight)
				style.marginRight = (margin[1] || marginRight) + "px";
			if (margin[2] || marginBottom)
				style.marginBottom = (margin[2] || marginBottom) + "px";
		},

		__setThemePadding: function (style, data) {

			var padding = data["padding"];
			if (!(padding instanceof Array))
				padding = [padding, padding, padding, padding];

			var paddingTop = data["paddingTop"];
			var paddingLeft = data["paddingLeft"];
			var paddingRight = data["paddingRight"];
			var paddingBottom = data["paddingBottom"];

			if (padding[0] || paddingTop)
				style.paddingTop = (padding[0] || paddingTop) + "px";
			if (padding[3] || paddingLeft)
				style.paddingLeft = (padding[3] || paddingLeft) + "px";
			if (padding[1] || paddingRight)
				style.paddingRight = (padding[1] || paddingRight) + "px";
			if (padding[2] || paddingBottom)
				style.paddingBottom = (padding[2] || paddingBottom) + "px";
		},

		__setThemeTextAlignment: function (style, data) {

			var alignX = data["alignX"];
			var alignY = data["alignY"];

			if (alignX)
				style.textAlign = alignX;

			if (alignY)
				style.verticalAlign = alignY;
		},

		/**
		 * Handler for the dynamic theme change.
		 * @signature function()
		 */
		_onChangeTheme: function (e) {

			// reset the stylesheet.
			qx.bom.Stylesheet.removeAllRules(this.__sheet);
			this.__sheet = qx.bom.Stylesheet.createElement("");

			// reset all the registered classes.
			var classNames = qx.lang.Object.clone(this.__classNames);
			this.__classNames = {};

			// recreate the classes that were already registered
			for (var name in classNames) {
				var c = classNames[name];
				this.__getCssClass(name, this.__sheet, c.appearance, c.states, c.defaultCss);
			}
		}

	},
});