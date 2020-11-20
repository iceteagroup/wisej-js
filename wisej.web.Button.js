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
 * wisej.web.Button
 */
qx.Class.define("wisej.web.Button", {

	extend: qx.ui.form.MenuButton,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle,
		wisej.mixin.MShortcutTarget
	],

	construct: function (label) {

		this.base(arguments, label);

		// we use the grid layout to align 
		// the content according to wisej extended rules.
		this._getLayout().dispose();
		var layout = new qx.ui.layout.Grid();
		layout.setRowFlex(0, 1);
		layout.setRowFlex(1, 1);
		layout.setColumnFlex(0, 0);
		layout.setColumnFlex(1, 1);
		layout.setColumnFlex(2, 0);
		this._setLayout(layout);

		this.initIconAlign();
		this.initTextAlign();
		this.initTextIconRelation();
	},

	properties: {

		// Rich override
		rich: { init: true, refine: true },

		// Appearance override
		appearance: { refine: true, init: "button" },

		/**
		 * Text property.
		 *
		 * Substitutes the label.
		 */
		text: { init: null, nullable: true, check: "String", apply: "_applyText", event: "changeText" },

		/**
		 * AutoEllipsis property.
		 *
		 * Sets the auto-ellipsis style.
		 */
		autoEllipsis: { init: false, check: "Boolean", apply: "_applyAutoEllipsis" },

		/**
		 * ButtonMenu property.
		 *
		 * Assigns the menu to the button and changes the button to a menu-button component.
		 */
		buttonMenu: { init: null, nullable: true, apply: "_applyButtonMenu", transform: "_transformMenu" },

		/**
		 * ShowArrow property.
		 *
		 * Shows the down arrow icon.
		 */
		showArrow: { init: false, check: "Boolean", apply: "_applyShowArrow" },

		/**
		 * IconSize property.
		 *
		 * Gets or sets the size of the icon.
		 */
		iconSize: { init: null, nullable: true, check: "Map", apply: "_applyIconSize", themeable: true },

		/**
		 * IconSpacing property.
		 * 
		 * Gets or sets the spacing between the icon and the label.
		 */
		iconSpacing: { init: 10, check: "Integer", apply: "_applyIconSpacing", themeable: true },

		/**
		 * IconAlign property.
		 *
		 * Gets or sets the alignment of the icon.
		 */
		iconAlign: {
			init: "middleCenter",
			apply: "_applyIconAlign",
			check: ["topRight", "middleRight", "bottomRight", "topLeft", "topCenter", "middleLeft", "middleCenter", "bottomLeft", "bottomCenter"]
		},

		/**
		 * TextIconRelation property.
		 *
		 * Gets or sets the position of the icon in relation to the text.
		 */
		textIconRelation: {
			init: "imageBeforeText",
			themeable: true,
			apply: "_applyTextIconRelation",
			check: ["overlay", "imageBeforeText", "textBeforeImage", "imageAboveText", "textAboveImage"]
		},

		/**
		 * TextAlign property.
		 *
		 * Gets or sets the alignment of the text.
		 */
		textAlign: {
			themeable: true,
			init: "middleCenter",
			apply: "_applyTextAlign",
			check: ["topRight", "middleRight", "bottomRight", "topLeft", "topCenter", "middleLeft", "middleCenter", "bottomLeft", "bottomCenter"]
		},

		/**
		 * Repeat property.
		 *
		 * Enables or disables the auto-repeat feature.
		 */
		repeat: { init: false, check: "Boolean", apply: "_applyRepeat" },

		/**
		 * Interval used after the first run of the timer. Usually a smaller value
		 * than the "firstInterval" property value to get a faster reaction.
		 */
		interval: { check: "Integer", init: 300 },

		/**
		 * Interval used for the first run of the timer. Usually a greater value
		 * than the "interval" property value to a little delayed reaction at the first
		 * time.
		 */
		firstInterval: { check: "Integer", init: 500 },

		/**
		 * This configures the minimum value for the timer interval.
		 */
		minTimer: { check: "Integer", init: 100 },

		/** 
		 * Decrease of the timer on each interval (for the next interval) until minTimer reached.
		 */
		timerDecrease: { check: "Integer", init: 20 },

		/** 
		 * Determines whether the button displays the label only, the  icon only, or both.
		 */
		display: { check: ["both", "label", "icon"], init: "both", apply: "_applyDisplay" },
	},

	members: {

		/**
		 * Process mnemonics.
		 */
		executeMnemonic: function () {

			if (!this.isEnabled() || !this.isVisible() || !this.isSeeable())
				return false;

			this.execute();
			return true;
		},

		/**
		 * Process shortcuts.
		 */
		executeShortcut: function () {

			if (!this.isEnabled() || !this.isVisible() || !this.isSeeable())
				return false;

			this.execute();
			return true;
		},

		/**
		 * Applies the text property.
		 *
		 * We encode the text on the server when the AllowHtml property is set to false.
		 */
		_applyText: function (value, old) {

			this.setLabel(value);

		},

		/**
		 * Applies the autoEllipsis property.
		 */
		_applyAutoEllipsis: function (value, old) {

			var label = this.getChildControl("label");
			var el = label.getContentElement();

			label.setWrap(!value);
			el.setStyle("textOverflow", value ? "ellipsis" : null);
		},

		/**
		 * Applies the showArrow property.
		 */
		_applyShowArrow: function (value, old) {

			if (value)
				this._showChildControl("arrow");
			else
				this._excludeChildControl("arrow");
		},

		/**
		 * Applies the buttonMenu property.
		 */
		_applyButtonMenu: function (value, old) {

			this.setMenu(value);

			if (value) {
				value.setPosition("bottom-left");
			}

			// show the down arrow if we have a menu.
			this.setShowArrow(value != null);

			// change the appearance, but preserve it in case it was 
			// set from the control and it's a custom appearance key.
			if (value != null && this.getAppearance() === "button")
				this.setAppearance("menubutton");
			else if (value == null && this.getAppearance() === "menubutton")
				this.setAppearance("button");
		},

		// overridden
		_onKeyDown: function (e) {

			switch (e.getKeyIdentifier()) {

				case "Enter":
				case "Space":
					this.removeState("abandoned");
					this.addState("pressed");

					var menu = this.getMenu();
					if (menu) {
						// Toggle sub menu visibility
						if (!menu.isVisible()) {
							this.open();
						} else {
							menu.exclude();
						}
						return;
					}
					e.stopPropagation();

					if (this.isRepeat())
						this.__startInternalTimer();

					break;
			}

			this.base(arguments, e);
		},

		/**
		 * Listener method for "keyup" event.<br/>
		 * Removes "abandoned" and "pressed" state (if "pressed" state is set)
		 * for the keys "Enter" or "Space"
		 *
		 * @param e {Event} Key event
		 */
		_onKeyUp: function (e) {
			switch (e.getKeyIdentifier()) {
				case "Enter":
				case "Space":
					if (this.hasState("pressed")) {
						this.removeState("abandoned");
						this.removeState("pressed");
						this.execute();
						e.stopPropagation();

						this.__stopInternalTimer();
					}
					break;
			}
		},

		/**
		  * Callback method for the "pointerdown" method.
		  *
		  * @param e {qx.event.type.Pointer} pointerdown event
		  */
		_onPointerDown: function (e) {

			this.base(arguments, e);

			if (e.isLeftPressed() && this.isRepeat())
				this.__startInternalTimer();
		},


		/**
		 * Callback method for the "pointerup" event.
		 *
		 * @param e {qx.event.type.Pointer} pointerup event
		 */
		_onPointerUp: function (e) {

			this.base(arguments, e);

			this.__stopInternalTimer();
		},

		// overridden and disabled.
		_applyCenter: function (value, old) {
		},

		/**
		 * Applies the display property.
		 */
		_applyDisplay: function (value, old) {

			this.setShow(value);

			// update the label cell in the grid layout when then
			// icon is shown or hidden.
			this._applyTextIconRelation(this.getTextIconRelation());
		},

		// overridden.
		_applyIcon: function (value, old) {

			this.base(arguments, value, old);

			// update the label cell in the grid layout when then
			// icon is shown or hidden.
			this._applyTextIconRelation(this.getTextIconRelation());
		},

		/**
		 * Applies the IconSize property.
		 *
		 * Sets the size of the icon child widget.
		 */
		_applyIconSize: function (value, old) {

			var size = value;
			var icon = this.getChildControl("icon");

			icon.resetMaxWidth();
			icon.resetMaxHeight();

			if (size) {
				icon.setWidth(size.width);
				icon.setHeight(size.height);
				icon.getContentElement().setStyle("backgroundSize", size.width + "px " + size.height + "px");
			}
			else {
				icon.resetWidth();
				icon.resetHeight();
				icon.getContentElement().setStyle("backgroundSize", "contain");
			}

			if (this.getTextIconRelation() == "overlay")
				this._updateBackgroundImages();
		},

		/**
		 * Applies the IconSpacing property.
		 */
		_applyIconSpacing: function (value, old) {

			if (value == null) {
				this.resetIconSpacing();
				return;
			}

			var icon = this.getChildControl("icon");
			var label = this.getChildControl("label");

			icon.resetMargin(0);

			if (icon.isVisible() && label.isVisible())

				switch (this.getTextIconRelation()) {

					case "imageAboveText":
						icon.setMarginBottom(value);
						break;

					case "textAboveImage":
						icon.setMarginTop(value);
						break;

					case "imageBeforeText":
						icon.setMarginRight(value);
						break;

					case "textBeforeImage":
						icon.setMarginLeft(value);
						break;
				}
		},

		/**
		 * Applies the IconAlign property.
		 *
		 * Changes the position of the icon child widget.
		 */
		_applyIconAlign: function (value, old) {

			var icon = this.getChildControl("icon");

			var alignX = "left";
			var alignY = "top";

			if (value) {
				switch (value) {

					case "topLeft":
						break;
					case "topRight":
						alignX = "right";
						break;
					case "topCenter":
						alignX = "center";
						break;

					case "middleLeft":
						alignY = "middle";
						break;
					case "middleRight":
						alignY = "middle";
						alignX = "right";
						break;
					case "middleCenter":
						alignY = "middle";
						alignX = "center";
						break;

					case "bottomLeft":
						alignY = "bottom";
						break;
					case "bottomRight":
						alignY = "bottom";
						alignX = "right";
						break;
					case "bottomCenter":
						alignY = "bottom";
						alignX = "center";
						break;
				}

				icon.setAlignX(alignX);
				icon.setAlignY(alignY);

				// update the label cell in the grid layout when then
				// icon is shown or hidden.
				this._applyTextIconRelation(this.getTextIconRelation());
			}

			if (this.getTextIconRelation() == "overlay")
				this._updateBackgroundImages();
		},

		/**
		 * Applies the TextAlign property.
		 */
		_applyTextAlign: function (value, old) {

			if (value == null) {
				this.resetTextAlign();
				return;
			}

			var label = this.getChildControl("label");

			var alignX = "left";
			var alignY = "top";
			var textAlign = "left";

			if (value) {
				switch (value) {

					case "topLeft":
						break;
					case "topRight":
						textAlign = alignX = "right";
						break;
					case "topCenter":
						textAlign = alignX = "center";
						break;

					case "middleLeft":
						alignY = "middle";
						break;
					case "middleRight":
						alignY = "middle";
						textAlign = alignX = "right";
						break;
					case "middleCenter":
						alignY = "middle";
						textAlign = alignX = "center";
						break;

					case "bottomLeft":
						alignY = "bottom";
						break;
					case "bottomRight":
						alignY = "bottom";
						textAlign = alignX = "right";
						break;
					case "bottomCenter":
						alignY = "bottom";
						textAlign = alignX = "center";
						break;
				}

				label.setAlignX(alignX);
				label.setAlignY(alignY);
				label.setTextAlign(textAlign);

				// update the label cell in the grid layout when then
				// icon is shown or hidden.
				this._applyTextIconRelation(this.getTextIconRelation());
			}
		},

		/**
		 * Applies the textIconRelation property.
		 *
		 * Adjusts the internal layout of the button widget to keep
		 * the image and the text aligned.
		 */
		_applyTextIconRelation: function (value, old) {

			var layout = this._getLayout();
			var icon = this.getChildControl("icon");
			var label = this.getChildControl("label");
			var arrow = this.getChildControl("arrow", true);
			var textAlign = this.getTextAlign();
			var iconAlign = this.getIconAlign();

			// NOTE: when the relation is overlay, the icon is not set here, it is set
			// as an additional background image.
			if (value == "overlay") {
				this._excludeChildControl("icon");
				this._updateBackgroundImages();
			}
			else if (old == "overlay") {

				if (this.getDisplay() != "label")
					this._showChildControl("icon");

				this._updateBackgroundImages();
			}

			layout.setRowFlex(0, 1);
			layout.setRowFlex(1, 1);
			layout.setColumnFlex(1, 1);
			layout.setColumnFlex(0, icon.isVisible() ? 1 : 0);

			if (!icon.isVisible()) {
				icon.setLayoutProperties({ row: 0, column: 0 });
				label.setLayoutProperties({ row: 0, column: 1 });
				if (arrow) arrow.setLayoutProperties({ row: 0, column: 2 });
				return;
			}

			switch (value) {

				case "overlay":

					icon.setLayoutProperties({ row: 0, column: 0 });
					label.setLayoutProperties({ row: 0, column: 1 });
					if (arrow) arrow.setLayoutProperties({ row: 0, column: 2, rowSpan: 1 });

					break;

				case "imageAboveText":

					// move the icon to the row above the text.
					icon.setLayoutProperties({ row: 0, column: 0 });
					label.setLayoutProperties({ row: 1, column: 0 });
					if (arrow) arrow.setLayoutProperties({ row: 0, column: 2, rowSpan: 2 });

					if (icon.isVisible()) {
						if (textAlign.startsWith("top") && iconAlign.startsWith("top"))
							layout.setRowFlex(0, 0);
						else if (textAlign.startsWith("bottom") && iconAlign.startsWith("bottom"))
							layout.setRowFlex(1, 0);
					}

					break;

				case "textAboveImage":

					// move the icon to the row below the text.
					icon.setLayoutProperties({ row: 1, column: 0 });
					label.setLayoutProperties({ row: 0, column: 0 });
					if (arrow) arrow.setLayoutProperties({ row: 0, column: 2, rowSpan: 2 });

					if (icon.isVisible()) {
						if (textAlign.startsWith("top") && iconAlign.startsWith("top"))
							layout.setRowFlex(0, 0);
						else if (textAlign.startsWith("bottom") && iconAlign.startsWith("bottom"))
							layout.setRowFlex(1, 0);
					}

					break;

				case "imageBeforeText":

					// move the icon to the column before the text.
					icon.setLayoutProperties({ row: 0, column: 0 });
					label.setLayoutProperties({ row: 0, column: 1 });
					if (arrow) arrow.setLayoutProperties({ row: 0, column: 2, rowSpan: 1 });

					if (icon.isVisible()) {
						if (textAlign.endsWith("Left") && iconAlign.endsWith("Left"))
							layout.setColumnFlex(0, 0);
						else if (textAlign.endsWith("Right") && iconAlign.endsWith("Right"))
							layout.setColumnFlex(1, 0);
					}

					break;

				case "textBeforeImage":

					// move the icon to the column after the text.
					icon.setLayoutProperties({ row: 0, column: 1 });
					label.setLayoutProperties({ row: 0, column: 0 });
					if (arrow) arrow.setLayoutProperties({ row: 0, column: 2, rowSpan: 1 });

					if (icon.isVisible()) {
						if (textAlign.endsWith("Left") && iconAlign.endsWith("Left"))
							layout.setColumnFlex(0, 0);
						else if (textAlign.endsWith("Right") && iconAlign.endsWith("Right"))
							layout.setColumnFlex(1, 0);
					}

					break;
			}

			this._applyIconSpacing(this.getIconSpacing());
		},

		// returns the list of background images overriding the
		// default implementation in the wisej.mixin.MBackgroundImage mixin.
		_getBackgroundImages: function () {

			var images = this.getBackgroundImages();

			// when the relation is overlay, add the icon to the background images.
			if (this.getTextIconRelation() == "overlay") {

				var icon = this.getIcon();
				if (icon) {

					var iconSize = this.getIconSize();
					var iconAlign = this.getIconAlign();

					// if the widget didn't specify an image size, make
					// it fill the parent when the relation is "overlay".
					iconSize = iconSize || "contain";

					images = images != null ? images.slice() : [];
					images.push({
						image: icon,
						size: iconSize,
						align: iconAlign
					});
				}
			}

			return images;
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "arrow":
					control = new qx.ui.basic.Image().set({
						visibility: "excluded",
						anonymous: true,
						alignX: "center",
						alignY: "middle"
					});
					this._add(control, { row: 0, column: 2 });
					break;

				case "label":
					control = this.base(arguments, id, hash);
					control.setLayoutProperties({ row: 0, column: 1 });
					break;

				case "icon":
					control = this.base(arguments, id, hash);
					control.setLayoutProperties({ row: 0, column: 0 });
					break;
			}

			return control || this.base(arguments, id);
		},

		/*
		---------------------------------------------------------------------------
		  AUTO-REPEAT IMPLEMENTATION
		---------------------------------------------------------------------------
		*/

		/**
		 * Applies the Repeat property.
		 */
		_applyRepeat: function (value, old) {

			if (value) {

				if (!this.__timer) {
					// create the timer and add the listener
					this.__timer = new qx.event.AcceleratingTimer();
					this.__timer.addListener("interval", this._onInterval, this);
				}
			}
			else {
				if (this.__timer) {

					this.__timer.dispose();
					this.__timer = undefined;
				}
			}

		},

		/**
		 * Callback for the interval event.
		 *
		 * Stops the timer and starts it with a new interval
		 * (value of the "interval" property - value of the "timerDecrease" property).
		 * Dispatches the "execute" event.
		 *
		 * @param e {qx.event.type.Event} interval event
		 */
		_onInterval: function (e) {

			this.fireEvent("execute");
		},

		/**
		 * Starts the internal timer which causes firing of execution
		 * events in an interval.
		 */
		__startInternalTimer: function () {

			if (this.__timer) {

				this.fireEvent("press");

				this.__timer.set({
					interval: this.getInterval(),
					firstInterval: this.getFirstInterval(),
					minimum: this.getMinTimer(),
					decrease: this.getTimerDecrease()
				}).start();
			}
		},

		/**
		 * Stops the internal timer and releases the button.
		 */
		__stopInternalTimer: function () {

			if (this.__timer) {
				this.__timer.stop();
				this.fireEvent("release");
			}
		},

	},

	destruct: function () {

		this._disposeObjects("__timer");

		if (this.getMenu())
			this.getMenu().destroy();
	},

});
