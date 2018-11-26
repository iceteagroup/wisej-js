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
 * wisej.web.Canvas
 */
qx.Class.define("wisej.web.Canvas", {

	extend: qx.ui.core.Widget,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	properties: {

		/**
		 * The icon to show at design time.
		 */
		designIcon: { init: null, check: "String" },

		/**
		 * The text to show at design time.
		 */
		designLabel: { init: "", check: "String" },

		/**
		 * Actions property.
		 *
		 * This is either a URL to a postback request that will return a JSON array of actions
		 * or the array of actions.
		 */
		actions: { init: null, apply: "_applyActions" },
	},

	members: {

		// the 2d drawing context.
		ctx: null,

		/**
		 * Draws the actions on the canvas.
		 *
		 * @param actions {Array} List of drawing actions defined as: {name: "action name", args:[array of arguments]}.
		 */
		draw: function (actions) {

			if (!actions || actions.length == 0)
				return;

			// make sure we have the 2d element!
			if (!this.__ensureContext())
				return;

			// preload any image that may be referenced in the actions.
			var images = this.__loadImages(actions);

			// make sure that all the images have been loaded before proceeding.
			if (this.__isLoadingImages(images)) {

				var me = this;
				setTimeout(function () {
					me.draw(actions);
				}, 10);

				return;
			}

			// save the state before drawing.
			this.ctx.save();
			try {

				// perform the drawing actions.
				this.__drawActions(actions);

			} finally {

				// restore the canvas state.
				this.ctx.restore();
			}
		},

		/**
		 * Executes the drawing actions.
		 */
		__drawActions: function (actions) {

			for (var i = 0; i < actions.length; i++) {
				try {

					var a = actions[i];
					this[a.name].apply(this, a.args);

				} catch (error) {
					this.core.logError(error);
				}
			}
		},

		/**
		 * Loads all the images used in the actions.
		 */
		__loadImages: function (actions, callback) {

			var images = [];
			var aliasMgr = qx.util.AliasManager.getInstance();

			for (var i = 0; i < actions.length; i++) {

				var a = actions[i];
				if (a.name == "drawImage" || a.name == "createPattern") {
					if (a.args && a.args.length > 0) {
						var image = aliasMgr.resolve(a.args[0]);
						qx.io.ImageLoader.load(image);
						images.push(image);
					}
				}
			}

			return images;
		},

		/**
		 * Checks if we are still loading images.
		 */
		__isLoadingImages: function (images) {

			var images = qx.io.ImageLoader.__data;
			if (images && images.length > 0) {
				for (var i = 0; i < images.length; i++) {
					if (qx.io.ImagesLoader.isLoading(images[i]))
						return true;
				}
			}

			return false;
		},

		/**
		 * Applies the actions property.
		 *
		 * If the value is an array, it's the actual action list.
		 * If the value is a string than it's a URL for an ajax postback.
		 */
		_applyActions: function (value, old) {

			if (wisej.web.DesignMode) {

				// when in design mode, create the
				// child canvas as soon as we have some drawing actions.
				if (!this.__designCanvas) {

					// create a child canvas element at design time to replace the
					// designer's icon and label that are displayed when the canvas
					// control doesn't have any draw actions at design time.
					this.__designCanvas = new qx.html.Element("canvas", { position: "absolute" });
					this.getContentElement().add(this.__designCanvas);
				}
			}

			if (!value || value.length == 0)
				return;

			// draw immediately when applying an array of actions.
			if (value instanceof Array) {
				this.draw(value);
			}
			else {
				// otherwise schedule the ajax postback.
				qx.ui.core.queue.Widget.add(this, "drawActions");
			}
		},

		// Retrieves the action list from a postback url
		// and draws the canvas.
		__drawActionsUrl: function (url) {

			if (!url)
				return;

			// fire an async postback request.
			var me = this;
			var xhr = new XMLHttpRequest();
			xhr.open("GET", url, true);
			xhr.onreadystatechange = function () {
				if (xhr.readyState == 4) {
					if (xhr.status == 200) {
						try {
							var json = xhr.responseText;
							if (json)
								me.draw(JSON.parse(json));
						}
						catch (error) {

							if (!wisej.web.DesignMode)
								this.core.logError(error);
						}
					}
				}
			};
			xhr.send();
		},

		// overridden
		renderLayout: function (x, y, width, height) {

			this.base(arguments, x, y, width, height);

			// update the design-time canvas to fill the container.
			if (wisej.web.DesignMode) {

				if (this.__designCanvas) {
					// the canvas element needs the width and height attributes.
					// setting the css dimensions stretches the canvas when they don't match.
					this.__designCanvas.setAttributes({ width: width, height: height }, true);
				}
			}
			else {
				// update the canvas size when the dimensions
				// are actually changed. otherwise it gets cleared when setting existing width, height.
				var el = this.getContentElement();
				var currentWidth = el.getAttribute("width");
				var currentHeight = el.getAttribute("height");
				if (currentWidth != width || currentHeight != height) {

					// the canvas element needs the width and height attributes.
					// setting the css dimensions stretches the canvas.
					el.setAttributes({ width: width, height: height }, true);

					// schedule the canvas update.
					if (currentWidth != null || currentHeight != null)
						if (!wisej.web.DesignMode)
							qx.ui.core.queue.Widget.add(this, "drawActions");
				}
			}
		},

		syncWidget: function (jobs) {

			// retrieve the list of actions when the canvas
			// needs to refresh its content.
			if (jobs && jobs["drawActions"]) {
				var actionsUrl = this.getActions();
				if (typeof actionsUrl === "string")
					this.__drawActionsUrl(actionsUrl);
			}

		},

		// overridden
		_createContentElement: function () {

			// when in design mode we create a regular widget
			// and use it to: 1 - display a label with icon if the canvas component
			// doesn't have any drawing, or 2 - host an inner canvas element to
			// display the drawing actions at design time.
			if (wisej.web.DesignMode)
				return this.base(arguments);
			else
				return new qx.html.Element("canvas");
		},

		/**
		 * Draws an image on the 2d context.
		 *
		 * @param image {String} the image source.
		 * @param x | clipX (Integer) optional, the image X location or the clip X location.
		 * @param y | clipY (Integer) optional, the image Y location or the clip Y location.
		 * @param width | clipWidth (Integer) optional, the image width or the clip width location.
		 * @param height | clipHeight (Integer) optional, the image height or the clip height location.
		 */
		drawImage: function (image, clipX, clipY, clipWidth, clipHeight, x, y, width, height) {

			var aliasMgr = qx.util.AliasManager.getInstance();
			image = aliasMgr.resolve(image);

			var ctx = this.ctx;
			var img = new Image(); img.src = image;

			switch (arguments.length) {
				case 3:
					ctx.drawImage(img, clipX, clipY);
					break;

				case 5:
					ctx.drawImage(img, clipX, clipY, clipWidth, clipHeight);
					break;
				default:
					ctx.drawImage(img, clipX, clipY, clipWidth, clipHeight, x, y, width, height);
					break;
			}
		},

		/**
		 * Sets the font to use when drawing text on the canvas.
		 */
		setFontStyle: function (value) {

			var font = qx.theme.manager.Font.getInstance().resolve(value);
			if (font instanceof qx.bom.Font) {

				var cssFont =
					(font.isItalic() ? "italic " : "") +
					(font.isBold() ? "bold " : "") +
					(font.getSize() + font.getUnit() + " ") +
					(font.getFamily().join(","));

				this.ctx.font = cssFont;

			}
			else {
				this.ctx.font = null;
			}
		},

		/**
		 * Sets the fillStyle property.
		 *
		 * @param value {Object} The definition of the fillStyle color. It can be a color or a map
		 * of properties to us to create a linear, radial or pattern brush.
		 */
		setFillStyle: function (value) {

			this.ctx.fillStyle = this.__transformStyle(value);
		},

		/**
		 * Sets the strokeStyle property.
		 *
		 * @param value {Object} The definition of the fillStyle color. It can be a color or a map
		 * of properties to us to create a linear, radial or pattern brush.
		 */
		setStrokeStyle: function (value) {

			this.ctx.strokeStyle = this.__transformStyle(value);

		},

		// transforms the style object to a canvas style.
		__transformStyle: function (value) {
			if (!value)
				return null;

			// is it a color string?
			if (typeof value === "string") {
				return qx.theme.manager.Color.getInstance().resolve(value);
			}

			// is it a map of properties to use to create a brush?
			switch (value.type) {

				case "linear":
					return this.__createLinearGradient(value);

				case "radial":
					return this.__createRadialGradient(value);

				case "pattern":
					return this.__createPattern(value);
			}
		},

		__createLinearGradient: function (value) {

			var ctx = this.ctx;
			var colorMgr = qx.theme.manager.Color.getInstance();
			var grd = ctx.createLinearGradient(value.x0, value.y0, value.x1, value.y1);

			var colorStops = value.colorStops;
			if (colorStops != null && colorStops.length > 0) {
				for (var i = 0; i < colorStops.length; i++) {

					var stop = colorStops[i].stop;
					var color = colorMgr.resolve(colorStops[i].color);
					grd.addColorStop(stop, color);
				}
			}
			return grd;
		},

		__createRadialGradient: function (value) {

			var ctx = this.ctx;
			var colorMgr = qx.theme.manager.Color.getInstance();
			var grd = ctx.createRadialGradient(value.x0, value.y0, value.r0, value.x1, value.y1, value.r1);

			var colorStops = value.colorStops;
			if (colorStops != null && colorStops.length > 0) {
				for (var i = 0; i < colorStops.length; i++) {

					var stop = colorStops[i].stop;
					var color = colorMgr.resolve(colorStops[i].color);
					grd.addColorStop(stop, color);
				}
			}
			return grd;
		},

		__createPattern: function (value) {

			var aliasMgr = qx.util.AliasManager.getInstance();
			var image = aliasMgr.resolve(value);

			var ctx = this.ctx;
			var img = new Image(); img.src = image;
			return ctx.createPattern(img, value.repeat);
		},

		/**
		 * Executes the method call on the 2d context.
		 */
		callMethod: function () {

			if (arguments.length < 1)
				return;

			var name = arguments[0];
			var args = new Array(arguments.length - 1);
			for (var i = 0; i < args.length; i++)
				args[i] = arguments[i + 1];

			if (this.ctx == null)
				this.__ensureContext();

			var method = this.ctx[name];
			if (method instanceof Function) {
				try {
					method.apply(this.ctx, args);
				}
				catch (error) {

					if (!wisej.web.DesignMode)
						this.core.logError(error);
				}
			}
		},

		/**
		 * Assigns a property on the 2d context.
		 */
		setProperty: function () {

			if (arguments.length < 2)
				return;

			if (this.ctx == null)
				this.__ensureContext();

			var name = arguments[0];
			var value = arguments[1];
			this.ctx[name] = value;
		},

		__ensureContext: function () {

			if (this.ctx)
				return true;

			var dom = wisej.utils.Widget.ensureDomElement(this);
			if (!dom)
				return;

			if (this.__designCanvas)
				dom = this.__designCanvas.getDomElement();

			this.ctx = dom.getContext("2d");
			return this.ctx != null;
		},

		// overridden.
		_onDesignRender: function () {

			// draw the canvas draw actions. if any.
			// otherwise display the design icon and text.
			var actions = this.getActions();

			if (actions == null || actions.length == 0) {

				// show the logo and text when in design mode.
				this.getChildControl("label").set({
					icon: this.getDesignIcon(),
					label: this.getDesignLabel()
				});

				this.fireEvent("render");
			}
			else {

				// make sure that all the images have been loaded before proceeding.
				if (this.__isLoadingImages()) {

					var me = this;
					setTimeout(function () {

						me.__drawActions(actions);
						me.fireEvent("render");

					}, 10);

					return;
				}
				else {

					this.__drawActions(actions);
					this.fireEvent("render");
				}
			}
		},

		/**
		 * Overridden to create the design mode label.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "label":

					if (wisej.web.DesignMode) {
						this._setLayout(new qx.ui.layout.Canvas());
						var control = new qx.ui.basic.Atom().set({
							rich: true,
							padding: 20,
							center: true,
							alignX: "center",
							iconPosition: "left",
							gap: 10
						});
						this._add(control, { left: 0, right: 0 });
					}
					break;
			}

			return control || this.base(arguments, id);
		},

	},
});
