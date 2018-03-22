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
 * wisej.web.Label
 */
qx.Class.define("wisej.web.Label", {

	extend: qx.ui.basic.Label,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MShortcutTarget,
		wisej.mixin.MBorderStyle
	],

	construct: function (text) {

		this.base(arguments, text);

		this.initRich();
		this.initTextAlign();
	},

	properties: {

		// Rich override
		rich: { init: true, refine: true },

		// Appearance override, we don't want to modify the basic "label" that is used
		// as a child component more or less everywhere.
		appearance: { init: "textlabel", refine: true },

		/**
		 * Text property.
		 *
		 * Substitutes the label.
		 */
		text: { init: "", check: "String", apply: "_applyText", event: "changeText" },

		/**
		 * AutoEllipsis property.
		 *
		 * Sets the auto-ellipsis style.
		 */
		autoEllipsis: { init: false, check: "Boolean", apply: "_applyAutoEllipsis" },

		/**
		 * Icon property.
		 *
		 * Sets the icon to display in the label widget next to the text.
		 */
		icon: { init: null, check: "String", apply: "_applyIconProperty", nullable: true },

		/**
		 * IconSize property.
		 *
		 * Gets or sets the size of the icon.
		 */
		iconSize: { init: null, nullable: true, check: "Map", apply: "_applyIconProperty", themeable: true },

		/**
		 * IconAlign property.
		 *
		 * Gets or sets the alignment of the icon.
		 */
		iconAlign: {
			init: "middleCenter",
			apply: "_applyIconProperty",
			check: ["topRight", "middleRight", "bottomRight", "topLeft", "topCenter", "middleLeft", "middleCenter", "bottomLeft", "bottomCenter"]
		},

		/**
		 * TextAlign property.
		 *
		 * Gets or sets the alignment of the text.
		 */
		textAlign: {
			themeable: true,
			init: "topLeft",
			apply: "_applyTextAlign",
			check: ["topRight", "middleRight", "bottomRight", "topLeft", "topCenter", "middleLeft", "middleCenter", "bottomLeft", "bottomCenter"]
		},
	},

	members: {

		/**
		 * Sets the focus to the next control in the tab order
		 * when a mnemonic (Alt+{char}) that corresponds to this widget is pressed.
		 */
		executeMnemonic: function () {

			if (!this.isEnabled() || !this.isVisible())
				return false;

			// focus the next widget.
			var parent = this.getParent();
			if (parent) {
				var index = parent.indexOf(this);
				var handler = qx.ui.core.FocusHandler.getInstance();
				if (handler) {

					// if this is a label and it has a buddy control, focus it.
					var next = (this instanceof qx.ui.basic.Label)
						? this.getBuddy()
						: null;

					// otherwise try with the next control in collection.
					if (next == null)
						next =
							parent.isReverseControls()
								? parent.getChildren()[index - 1]
								: parent.getChildren()[index + 1];

					if (next && !handler.isFocused(next)) {
						next.focus();
						return true;
					}
				}
			}

			return false;
		},

		/**
		 * Applies the text property.
		 *
		 * Force the rich property to true. We encode
		 * the text on the server when the AllowHtml property
		 * is set to false.
		 */
		_applyText: function (value, old) {

			this.setValue(value);

		},

		/**
		 * Applies the autoEllipsis property.
		 */
		_applyAutoEllipsis: function (value, old) {

			var el = this.getContentElement();

			this.setWrap(!value);
			el.setStyle("textOverflow", value ? "ellipsis" : null);
		},

		// overridden and disabled.
		_applyCenter: function (value, old) {
		},

		/**
		 * Applies the textAlign property.
		 */
		_applyTextAlign: function (value, old) {

			if (value != null) {

				var align = null;
				switch (value) {
					case "topRight":
					case "middleRight":
					case "bottomRight":
						align = "right";
						break;

					case "topLeft":
					case "middleLeft":
					case "bottomLeft":
						align = "left";
						break;

					case "topCenter":
					case "middleCenter":
					case "bottomCenter":
						align = "center";
						break;

					default:
						this.initTextAlign();
						break;
				}

				this.getContentElement().setStyle("textAlign", align);

				this.scheduleLayoutUpdate();
			}
		},
		
		/**
		 * Applies the Icon properties.
		 *
		 * Schedules the "updateIcon" job. The image will be updated when processing the job request.
		 */
		_applyIconProperty: function (value, old, name) {

			if (value || old)
				this._updateBackgroundImages();

			if (name == "iconAlign")
				this.scheduleLayoutUpdate();
		},

		// returns the list of background images overriding the
		// default implementation in the wisej.mixin.MBackgroundImage mixin.
		_getBackgroundImages: function () {

			var images = this.getBackgroundImages();

			var icon = this.getIcon();
			if (icon) {

				var iconSize = this.getIconSize();
				var iconAlign = this.getIconAlign();

				images = images != null ? images.slice() : [];
				images.push({
					image: icon,
					size: iconSize,
					align: iconAlign
				});
			}

			return images;
		},

		// overridden padding property apply
		_applyPadding: function (value, old, name) {

			// @ITG:Wisej: Changed the logic to reset the property when the value is null.
			if (value == null) {
				this["reset" + qx.lang.String.firstUp(name)]();
				return;
			}

			this._updateInsets = true;
			qx.ui.core.queue.Layout.add(this);
		},

		// overridden
		renderLayout: function (left, top, width, height) {

			this.base(arguments, left, top, width, height);

			var textAlign = this.getTextAlign();
			var textSize = this._getContentHint();

			if (this.isWrap() && this.isRich())
				textSize.height = this._getHeightForWidth(width);

			var icon = this.getIcon();
			var iconSize = this.getIconSize();
			var iconAlign = this.getIconAlign();

			if (icon && !iconSize) {

				var source = qx.util.AliasManager.getInstance().resolve(icon);

				// get the original size if the image is loaded.
				if (qx.io.ImageLoader.isLoaded(source)) {

					iconSize = qx.io.ImageLoader.getSize(source);
				}
				else {

					qx.io.ImageLoader.load(source, function (url, entry) {

						if (entry.loaded) {

							if (wisej.web.DesignMode) {
								qx.ui.core.queue.Layout.add(this);
								qx.ui.core.queue.Layout.flush();
							}
							else {
								qx.ui.core.queue.Layout.add(this);
							}
						}

					}, this);

					return;
				}
			}

			// when the image and the text occupy the same cell (i.e. they are both middleLeft)
			// this renderLayout override calculates the necessary padding to move the text
			// enough to make space for the image.

			var el = this.getContentElement();
			var padding = this.__calculateTextPadding(width, height, textAlign, textSize, iconAlign, iconSize);
			el.setStyle("padding", padding.join("px ") + "px");
		},

		__calculateTextPadding: function (width, height, textAlign, textSize, iconAlign, iconSize) {

			var paddingTop = this.getPaddingTop() | 0;
			var paddingLeft = this.getPaddingLeft() | 0;
			var paddingRight = this.getPaddingRight() | 0;
			var paddingBottom = this.getPaddingBottom() | 0;

			// factor in the padding calculated by  the decorator.
			var content = this.getContentElement();
			decorator = qx.theme.manager.Decoration.getInstance().resolve(this.getDecorator());
			if (decorator) {
				var stylePadding = decorator.getPadding();
				paddingTop += stylePadding[0] | 0;
				paddingRight += stylePadding[1] | 0;
				paddingBottom += stylePadding[2] | 0;
				paddingLeft += stylePadding[3] | 0;
			}

			// center vertically.
			if (qx.lang.String.startsWith(textAlign, "middle")) {
				paddingTop += Math.max(0, Math.round((height - textSize.height) / 2));
			}

			// dock to bottom.
			if (qx.lang.String.startsWith(textAlign, "bottom")) {
				paddingTop += Math.max(0, height - textSize.height);
			}

			// text and image overlap?
			if (textAlign == iconAlign) {

				var iconWidth = iconSize ? iconSize.width : 0;

				if (iconWidth) {
					if (qx.lang.String.endsWith(textAlign, "Left")) {
						paddingLeft += iconWidth;
					}
					else if (qx.lang.String.endsWith(textAlign, "Right")) {
						paddingRight += iconWidth;
					}
				}
			}

			// return the trbl array.
			return [paddingTop, paddingRight, paddingBottom, paddingLeft];
		}
	},
});
