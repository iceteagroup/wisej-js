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
 * wisej.web.SplitButton
 */
qx.Class.define("wisej.web.SplitButton", {

	extend: qx.ui.form.SplitButton,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle,
		wisej.mixin.MShortcutTarget
	],

	construct: function (label) {

		this.base(arguments, label);

		this._forwardStates.vertical = true;
		this._forwardStates.horizontal = true;
		this.addState("horizontal");

		// listen to changes of the allowMove property to change the move handle target.
		this.addListener("changeAllowMove", this.__onChangeAllowMove, this);

		this.getChildControl("button").addListener("pointerup", this._onPointerUp, this);
		this.getChildControl("button").addListener("pointerdown", this._onPointerDown, this);
	},

	properties: {

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
			check: ["overlay", "imageAboveText", "textAboveImage", "imageBeforeText", "imageBeforeText"]
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
		 * The 'innerPadding' property redirects the
		 * padding to the child widgets (button and arrow) that make
		 * the SplitButton.
		 */
		innerPadding:
		{
			init: null,
			nullable: true,
			themeable: true,
			apply: "_applyInnerPadding"
		},

		/** 
		 * Determines whether the button displays the text only, the  icon only, or both.
		 */
		display: { check: ["both", "text", "icon"], init: "both", apply: "_applyDisplay" },

		/**
		 * Orientation property.
		 *
		 * When set to "vertical", the down arrow is placed below the text.
		 */
		orientation: { init: "horizontal", check: ["horizontal", "vertical"], apply: "_applyOrientation" }

	},

	members: {

		// The button repeat timer.
		__timer: null,

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
		 */
		_applyText: function (value, old) {

			this.setLabel(value);
		},

		/**
		 * Applies the autoEllipsis property on the inner button.
		 */
		_applyAutoEllipsis: function (value, old) {

			this.getChildControl("button").setAutoEllipsis(value);
		},

		/**
		 * Applies the buttonMenu property.
		 */
		_applyButtonMenu: function (value, old) {

			this.setMenu(value);

			if (value) {
				value.setPosition("bottom-left");
			}
		},

		/**
		 * Applies the padding property to the inner
		 * widgets of the SplitButton component.
		 */
		_applyInnerPadding: function (value, old) {

			var arrow = this.getChildControl("arrow");
			var button = this.getChildControl("button");

			if (value == null) {
				arrow.resetPadding(name);
				button.resetPadding();
				return;
			}

			var t = 0;
			var r = 0;
			var b = 0;
			var l = 0;

			if (value instanceof Array) {
				t = value[0];
				r = value[1];
				b = value[2];
				l = value[3];
			}
			else {
				t = r = l = b = value;
			}

			arrow.setPaddingTop(t);
			arrow.setPaddingRight(r);
			arrow.setPaddingBottom(b);
			button.setPaddingTop(t);
			button.setPaddingLeft(l);
			button.setPaddingBottom(b);
		},

		// overridden.
		_applyIcon: function (value, old) {

			this.base(arguments, value, old);

			// update the label cell in the grid layout when then
			// icon is shown or hidden.
			this._applyTextIconRelation(this.getTextIconRelation());
		},

		/**
		 * Applies the IconSize property on the inner button.
		 */
		_applyIconSize: function (value, old) {

			if (value == null) {
				this.resetIconSize();
				return;
			}

			this.getChildControl("button").setIconSize(value);
		},


		/**
		 * Applies the IconSpacing property.
		 */
		_applyIconSpacing: function (value, old) {

			this.getChildControl("button").setIconSpacing(value);
		},

		/**
		 * Applies the IconAlign property on the inner button.
		 */
		_applyIconAlign: function (value, old) {

			this.getChildControl("button").setIconAlign(value);
		},

		/**
		 * Applies the TextAlign property on the inner button.
		 */
		_applyTextAlign: function (value, old) {

			this.getChildControl("button").setTextAlign(value);
		},

		/**
		 * Applies the textIconRelation property on the inner button.
		 */
		_applyTextIconRelation: function (value, old) {

			this.getChildControl("button").setTextIconRelation(value);
		},

		/**
		 * Applies the display property.
		 */
		_applyDisplay: function (value, old) {

			this.getChildControl("button").setDisplay(value);
		},

		/**
		 * Applies the orientation property.
		 */
		_applyOrientation: function (value, old) {

			switch (value) {
				case "horizontal":
					this.addState("horizontal");
					this.removeState("vertical");
					this._getLayout().dispose();
					this._setLayout(new qx.ui.layout.HBox);
					break;

				case "vertical":
					this.addState("vertical");
					this.removeState("horizontal");
					this._getLayout().dispose();
					this._setLayout(new qx.ui.layout.VBox);
					break;
			}

		},

		/**
		 * Returns the widget to use to apply the background style by wisej.mixin.MBackgroundImage.
		 */
		_getBackgroundWidget: function () {

			return this.getChildControl("button");
		},

		/**
		 * Handles the changeAllowMove event to change the
		 * move handle target to the main button, otherwise
		 * split buttons cannot be moved since the main button
		 * processes all the pointer events.
		 */
		__onChangeAllowMove: function (e) {
			
			if (e.getData())
				this._activateMoveHandle(this.getChildControl("button"));
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "button":
					control = new wisej.web.Button();
					control.addListener("execute", this._onButtonExecute, this);
					control.setFocusable(false);
					this._addAt(control, 0, { flex: 1 });
					break;

				case "arrow":
					control = new qx.ui.form.MenuButton();
					control.setFocusable(false);
					control.setShow("icon");
					this._addAt(control, 1);
					break;
			}

			return control || this.base(arguments, id);
		},

		/**
		  * Callback method for the "pointerdown" method.
		  *
		  * @param e {qx.event.type.Pointer} pointerdown event
		  */
		_onPointerDown: function (e) {

			if (e.isLeftPressed() && this.isRepeat())
				this.__startInternalTimer();
		},


		/**
		 * Callback method for the "pointerup" event.
		 *
		 * @param e {qx.event.type.Pointer} pointerup event
		 */
		_onPointerUp: function (e) {

			this.__stopInternalTimer();
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

		if (this.getMenu())
			this.getMenu().destroy();
	},

});
