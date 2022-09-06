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
 * wisej.web.themeRoller.Manager
 */
qx.Class.define("wisej.web.themeRoller.Manager", {

	type: "static",
	extend: qx.core.Object,

	statics: {

		/** custom stylesheet embedded in the theme. */
		__stylesheet: null,

		/**
		 * loadTheme
		 *
		 * @param theme {Object} can be the theme name, a url, or the actual theme definition.
		 */
		loadTheme: function (theme) {

			if (typeof theme === "string") {
				// if the theme is a string, it could be the name of a theme already loaded, or
				// the name of a theme definition file.
				this.__loadThemeByName(theme);
			}
			else {
				// otherwise the parameter is a theme definition object.
				this.__loadThemeByDefinition(theme);
			}
		},

		/**
		 * isDefined
		 *
		 * Checks if the theme is already defined.
		 *
		 * @param theme {String} the theme name.
		 */
		isDefined: function (name) {

			name = "wisej.web.themeRoller.theme." + name;
			return qx.Theme.isDefined(name);

		},

		/**
		 * isThemeRoller
		 *
		 * Checked if the theme is a themeRoller class.
		 *
		 * @param theme {Object} the theme class.
		 */
		isThemeRoller: function (theme) {

			var name = theme.name;
			return (theme && name && name.indexOf("wisej.web.themeRoller") == 0);
		},

		/**
		 * __loadThemeByName
		 *
		 * @param theme {String} the theme name or url.
		 */
		__loadThemeByName: function (theme) {

			var url = null;
			var name = null;

			if (qx.lang.String.contains(theme, ".theme")) {
				url = theme;
			}
			else {
				name = "wisej.web.themeRoller.theme." + theme;

				// if it's a theme name, and the theme is not already loaded, then change the name
				// to a file name and perform a url request.
				if (!qx.Theme.isDefined(name)) {

					name = null;
					url = theme + ".theme";
				}
			}

			// download theme definition.
			if (url) {

				this.__downloadTheme(url, function (json) {

					var theme = JSON.parse(json);
					this.__loadThemeByDefinition(theme);

				});

				return;
			}

			// set the theme by name.
			if (name) {
				var themeMgr = qx.theme.manager.Meta.getInstance();
				var themeRoller = qx.Theme.getByName(name);
				themeMgr.setTheme(themeRoller);

				return;
			}
		},

		/**
		 * __loadThemeByDefinition
		 *
		 * Strips invalid characters from the theme name.
		 */
		__getSafeName: function (theme) {

			return theme.name.replace(/\./g, "_");
		},

		/**
		 * __loadThemeByDefinition
		 *
		 * @param theme {Object} the theme definition object.
		 */
		__loadThemeByDefinition: function (theme) {

			var safeName = this.__getSafeName(theme);
			var name = "wisej.web.themeRoller.theme." + safeName;

			var themeMgr = qx.theme.manager.Meta.getInstance();

			// if the theme roller class is already defined, update it using
			// the definition map.
			if (qx.Theme.isDefined(name)) {

				var themeRoller = qx.Theme.getByName(name);
				this.__updateTheme(themeRoller, theme, false);

				if (themeMgr.getTheme() == themeRoller) {
					// refresh the theme already loaded.
					this.__refreshTheme(themeRoller);
				}
				else {
					// switch the current theme.
					themeMgr.setTheme(themeRoller);
				}
			}
			else {
				// otherwise, create a new theme roller class.

				var themeRoller = this.__createTheme(theme);
				themeMgr.setTheme(themeRoller);
			}
		},

		/**
		 * __downloadTheme
		 *
		 * @param url {String} the theme definition object.
		 * @param callback {Function} callback function on success, the argument is the json definition of the theme.
		 */
		__downloadTheme: function (url, callback) {

			var me = this;
			var req = new qx.io.request.Xhr(url);

			req.addListener("success", function (e) {

				var json = req.getResponseText();
				if (callback)
					callback.call(me, json);

			}, this);

			req.send();
		},

		/**
		 * __createTheme
		 *
		 * @param theme {Object} the theme definition object.
		 */
		__createTheme: function (theme) {

			var safeName = this.__getSafeName(theme);
			var font = "wisej.web.themeRoller.font." + safeName;
			var icon = "wisej.web.themeRoller.icon." + safeName;
			var color = "wisej.web.themeRoller.color." + safeName;
			var themeRoller = "wisej.web.themeRoller.theme." + safeName;
			var appearance = "wisej.web.themeRoller.appearance." + safeName;
			var decoration = "wisej.web.themeRoller.decoration." + safeName;

			// create the classes.
			qx.Theme.define(font, { fonts: {} });
			qx.Theme.define(icon, { aliases: {} });
			qx.Theme.define(color, { colors: {} });
			qx.Theme.define(appearance, { appearances: {} });
			qx.Theme.define(decoration, { decorations: {} });

			// create the meta theme class.
			qx.Theme.define(themeRoller,
			{
				title: safeName,

				meta:
				{
					font: wisej.web.themeRoller.font[safeName],
					icon: wisej.web.themeRoller.icon[safeName],
					color: wisej.web.themeRoller.color[safeName],
					decoration: wisej.web.themeRoller.decoration[safeName],
					appearance: wisej.web.themeRoller.appearance[safeName]
				},
			});

			themeRoller = wisej.web.themeRoller.theme[safeName];
			this.__updateTheme(themeRoller, theme, false);

			return themeRoller;
		},

		/**
		 * __refreshTheme
		 *
		 * Forces a refresh of the loaded theme.
		 */
		__refreshTheme: function (theme) {

			var themeMgr = qx.theme.manager.Meta.getInstance();
			var colorMgr = qx.theme.manager.Color.getInstance();
			var decorationMgr = qx.theme.manager.Decoration.getInstance();
			var fontMgr = qx.theme.manager.Font.getInstance();
			var iconMgr = qx.theme.manager.Icon.getInstance();
			var appearanceMgr = qx.theme.manager.Appearance.getInstance();

			themeMgr._suspendEvents();

			colorMgr.setTheme(null);
			decorationMgr.setTheme(null);
			fontMgr.setTheme(null);
			iconMgr.setTheme(null);
			appearanceMgr.setTheme(null);

			// assign the update theme roller.
			colorMgr.setTheme(theme.meta.color);
			decorationMgr.setTheme(theme.meta.decoration);
			fontMgr.setTheme(theme.meta.font);
			iconMgr.setTheme(theme.meta.icon);
			appearanceMgr.setTheme(theme.meta.appearance);

			// fire and re-activate
			themeMgr.fireEvent("changeTheme");
			themeMgr._activateEvents();
		},

		/**
		 * __updateTheme
		 *
		 * Updates the ThemeRoller settings from the theme definition properties. 
		 *
		 * @param themeRoller {Object} the theme roller theme to update.
		 * @param theme {Object} the theme definition object.
		 */
		__updateTheme: function (themeRoller, theme) {

			if (!theme)
				return;

			// process the settings.
			// values have to be replaced into the JSON string.
			// other settings have to be applied according to the type of setting.
			theme = this.__processSettings(theme);

			// remove an previous stylesheet rules.
			var stylesheet = wisej.web.themeRoller.Manager.__stylesheet;
			if (stylesheet) {
				qx.bom.Stylesheet.removeSheet(stylesheet);
				wisej.web.themeRoller.Manager.__stylesheet = null;
			}

			// load the appearances from the theme.
			for (var name in theme) {

				switch (name) {

					case "colors":
						this.__setColors(themeRoller, theme[name]);
						break;

					case "fonts":
						this.__setFonts(themeRoller, theme[name]);
						break;

					case "images":
						this.__setImages(themeRoller, theme[name]);
						break;

					case "appearances":
						this.__setAppearances(themeRoller, theme[name]);
						break;

					case "stylesheet":
						this.__applyStylesheetRules(theme[name].rules);
						break;
				}
			}
		},

		__processSettings: function (theme) {

			if (theme.settings) {

				// process substitutions.
				var keys = [];
				var values = [];
				var settings = theme.settings;
				for (var name in settings) {
					keys.push("\"\\$" + name + "\"");
					values.push(settings[name]);
				}
				if (keys.length > 0) {
					var json = JSON.stringify(theme);

					for (var i = 0; i < keys.length; i++) {
						json = json.replace(new RegExp(keys[i], "g"), values[i]);
					}

					theme = JSON.parse(json);
				}

				// process special keys.
				var properties =
				{
					"native-scrollbars": "qx.nativeScrollBars",
					"overlapped-scrollbars": "os.scrollBarOverlayed"
				};
				for (var key in properties) {
					var option = properties[key];
					qx.core.Environment.getChecks()[option] = undefined;
					qx.core.Environment.invalidateCacheKey(option);

					if (settings[key] !== undefined)
						qx.core.Environment.add(option, settings[key]);
				}
			}
			return theme;
		},

		__applyStylesheetRules: function (rules) {

			if (rules && rules.length > 0) {

				var css = rules.join("");

				// create the theme stylesheet.
				stylesheet = qx.bom.Stylesheet.createElement(css);
				wisej.web.themeRoller.Manager.__stylesheet = stylesheet;
			}
		},

		__setColors: function (themeRoller, colors) {

			var color = themeRoller.meta.color;
			color.colors = {};

			var target = color.colors;
			for (var name in colors) {
				target[name] = colors[name];
			}
		},

		__setFonts: function (themeRoller, fonts) {

			var font = themeRoller.meta.font;
			font.fonts = {};

			var target = font.fonts;
			for (var name in fonts) {
				target[name] = fonts[name];
			}
		},

		__setImages: function (themeRoller, images) {

			var icon = themeRoller.meta.icon;
			icon.aliases = {};

			var baseUrl = images.baseUrl;
			delete images.baseUrl;

			if (baseUrl != null && baseUrl != "" && !qx.lang.String.endsWith(baseUrl, "/"))
				baseUrl += "/";

			var target = icon.aliases;
			for (var name in images) {

				var img = images[name];
				if (img == null || img == "")
					continue;

				// prepend the baseUrl, unless the icon is a full url.
				if (baseUrl && img.indexOf(":") == -1) {

					if (qx.lang.String.startsWith(img, "/"))
						img = img.substr(1);

					img = baseUrl + img;
				}

				target[name] = img;
			}
		},

		__setAppearances: function (themeRoller, appearances) {

			var appearance = themeRoller.meta.appearance;
			var decoration = themeRoller.meta.decoration;
			appearance.appearances = {};
			decoration.decorations = {};

			var target = appearance.appearances;
			for (var name in appearances) {

				this.__setAppearance(target, appearances[name], name, decoration);
			}
		},

		__setAppearance: function (target, appearance, name, decoration) {

			if (appearance == null)
				return;

			// normalize the styles and decorations.
			var roller = {
				name: name,
				decoration: decoration,
				states: appearance.states
			};

			var theme = {
				roller: roller,
				style: function (states, inherit) {
					return wisej.web.themeRoller.Manager.__getStyleFromRoller(
							states,
							inherit,
							this.roller);
				}
			};
			target[name] = theme;

			if (appearance.inherit) {
				theme.alias = appearance.inherit;
				theme.include = appearance.inherit;
			}

			if (appearance.alias) {
				theme.alias = appearance.alias;
			}

			if (appearance.include) {
				theme.include = appearance.include;
			}

			// iterate child components.
			if (appearance.components != null) {
				var components = appearance.components;
				for (var component in components) {
					this.__setAppearance(target, components[component], name + "/" + component, decoration);
				}
			}
		},

		__getStyleFromRoller: function (states, inherit, roller) {

			// create the style to return.
			var style = {};
			var applyDecorator = false;

			// avoid null errors.
			if (states == null) return style;
			if (roller == null) return style;
			if (roller.states == null) return style;

			// merge the default properties.
			if (roller.states.default != null)
				this.__apply(style, roller.states.default.properties);

			// get the order of the states.
			var $order = roller.states.$order || Object.keys(roller.states);

			// merge the properties that match the state in the order they are declared.
			for (var i = 0, l = $order.length; i < l; i++) {

				var state = $order[i];

				if (state === "default")
					continue;

				if (states[state]) {

					this.__apply(style, roller.states[state].properties);
				}
				else if (state.indexOf("-") > 1) {

					// process the composite state that matches the combination of the active states.
					var override = true;
					var parts = state.split("-");
					for (var j = 0; j < parts.length; j++) {
						if (!states[parts[j]]) {
							override = false;
							break;
						}
					}
					if (override)
						this.__apply(style, roller.states[state].properties);
				}
			}

			// retrieve the decoration theme.
			var decoration = roller.decoration;
			if (!decoration.decorations) decoration.decorations = {};

			// retrieve the inherited decorator, if any.
			var baseDecorator = inherit != null ? decoration.decorations[inherit.decorator] : null;

			// always ensure that we have created the "default" decorator.
			var name = roller.name.replace(/\//g, '-');
			if (roller.states.default != null) {
				if (roller.states.default.styles) {
					applyDecorator = true;

					if (!decoration.decorations[name]) {
						decoration.decorations[name]
							= this.__createDecorator(roller, baseDecorator);
					}
				}
			}

			// build the decorator name by concatenating the status name(s).
			for (var state in states) {
				if (states[state]) {
					name += "-" + state;
					if (roller.states[state] && roller.states[state].styles) {
						applyDecorator = true;
					}
				}
			}

			// retrieve or create the decoration on the fly.
			if (applyDecorator) {

				// concatenate the inherited name to produce a new unique decorator.
				// if (baseDecorator != null)
				//	name += "-" + inherit.decorator;

				// retrieve the already created decorator.
				var newDecorator = decoration.decorations[name];

				// create a new decorator.
				if (newDecorator == null) {

					// create our new fully qualified decorator.
					if (applyDecorator) {
						newDecorator = this.__createDecorator(roller, baseDecorator, states);
						decoration.decorations[name] = newDecorator;
					}
				}

				// return the decorator.
				style.decorator = name;
			}

			// otherwise reuse the inherited decorator.
			if (!applyDecorator && baseDecorator != null)
				style.decorator = inherit.decorator;

			return style;
		},

		__createDecorator: function (roller, inherit, states) {

			// initialize the new decorator using the inherited style.
			var decorator = { style: {} };
			if (inherit)
				this.__apply(decorator.style, inherit.style);

			// start by applying the default styles.
			if (roller.states.default) {
				this.__apply(decorator.style, roller.states.default.styles);
			}

			if (states == null)
				return decorator;

			// get the order of the states.
			var $order = roller.states.$order || Object.keys(roller.states);

			// build the decorator styles, by applying the styles defined in the roller
			// in order of declaration in the states collection.
			for (var i = 0, l = $order.length; i < l; i++) {

				var state = $order[i];

				if (state === "default")
					continue;

				if (states[state]) {
					this.__apply(decorator.style, roller.states[state].styles);
				}
				else if (state.indexOf("-") > 1) {

					// apply the styles with the composite state that matches the combination of the active states.
					var override = true;
					var parts = state.split("-");
					for (var j = 0; j < parts.length; j++) {
						if (!states[parts[j]]) {
							override = false;
							break;
						}
					}
					if (override)
						this.__apply(decorator.style, roller.states[state].styles);
				}
			}

			return decorator;
		},

		__apply: function (target, source) {

			if (target == null || source == null)
				return;

			for (var name in source) {
				target[name] = source[name];
			}

		},
	}
});