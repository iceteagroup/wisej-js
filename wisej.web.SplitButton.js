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
	include: [wisej.mixin.MWisejControl, wisej.mixin.MShortcutTarget],

	construct: function (label) {

		this.base(arguments, label);

		this._forwardStates.vertical = true;
		this._forwardStates.horizontal = true;
		this.addState("horizontal");
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

		/**
		 * Process mnemonics.
		 */
		executeMnemonic: function () {

			if (!this.isEnabled() || !this.isVisible())
				return false;

			this.execute();
			return true;
		},

		/**
		 * Process shortcuts.
		 */
		executeShortcut: function () {

			if (!this.isEnabled() || !this.isVisible())
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
				this.__wireMenuItems(value);
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
			var l = 0;
			var b = 0;

			if (value instanceof Array) {
				t = value[0];
				r = value[1];
				l = value[2];
				b = value[3];
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

		// iterates all the child items and wires the execute event
		// in order to fire it on the button owner.
		__wireMenuItems: function (parent) {

			if (parent == null)
				return;

			var children = parent.getChildren();
			for (var i = 0; i < children.length; i++) {
				var child = children[i];
				if (child instanceof qx.ui.menu.AbstractButton) {

					child.addListener("execute", this._onItemExecute, this);

					// recurse.
					this.__wireMenuItems(child.getMenu());
				}
			}
		},

		// handles clicks in menu items.
		_onItemExecute: function (e) {

			this.fireDataEvent("itemClick", e.getTarget());
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

			this.getChildControl("button").setIconSize(value);
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

			switch (value)
			{
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

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "button":
					control = new wisej.web.Button();
					control.setId(this.getId() + "_button");
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
	},

	destruct: function () {

	  if (this.getMenu())
	    this.getMenu().destroy();
	},

});
