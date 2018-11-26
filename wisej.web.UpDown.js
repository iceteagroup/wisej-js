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
 * wisej.web.UpDownBase
 * 
 * Delegates the up/down operations to the server.
 * Adds buttons and text alignment.
 * adds up/down buttons horizontal layout.
 */
qx.Class.define("wisej.web.UpDownBase", {

	extend: qx.ui.form.Spinner,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	construct: function (min, value, max) {

		this.base(arguments, min, value, max);

		this.__layoutChildComponents();

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["value", "text"]));

		// add local state events.
		this.setStateEvents(this.getStateEvents().concat(["changeValue"]));

		// hovered event handlers.
		this.addListener("pointerover", this._onPointerOver);
		this.addListener("pointerout", this._onPointerOut);

		// set the focus to the inner textfield.
		this.addListener("tap", this._onTap, this);

		// enable the native context menu by default.
		this.setNativeContextMenu(true);
	},

	properties: {

		/**
		 * UseArrowKeys property.
		 * 
		 * Enables/disables the arrow keys. When enabled, the user can change the value using the arrow keys.
		 */
		useArrowKeys: { init: true, check: "Boolean" },

		/**
		 * Determines the layout of the up/down buttons
		 */
		buttonsLayout: { init: "vertical", check: ["vertical", "horizontal"], themeable: true, apply: "_applyButtonsLayout" },

		/**
		 * TextAlign property.
		 *
		 * Values: Left, Right, Center.
		 */
		textAlign: { init: "left", check: "String", apply: "_applyTextAlign", themeable: true },

		/**
		 * UpDownAlign property.
		 *
		 * Values: Left, Right.
		 */
		upDownAlign: { init: "right", check: "String", apply: "_applyUpDownAlign", themeable: true },

		/**
		 * ReadOnly property.
		 */
		readOnly: { check: "Boolean", apply: "_applyReadOnly", init: false },

		/**
		 * Text property.
		 *
		 * Sets or returns the text in the control.
		 *
		 * Property defined with the setter/getter methods.
		 */
		// text: { init: "", check: "String", nullable: true },

	},

	members: {

		/**
		 * Returns or sets the text property.
		 *
		 * Changes the text in the inner textfield.
		 */
		setText: function (value, old) {
			this.getChildControl("textfield").setValue(value);
		},
		getText: function () {
			return this.getChildControl("textfield").getValue();
		},

		// overridden
		tabFocus: function () {

			var textField = this.getChildControl("textfield");
			textField.getFocusElement().focus();
			textField.selectAllText();
		},

		// overridden
		focus: function () {
			this.getChildControl("textfield").getFocusElement().focus();
		},

		/**
		 * Applies the readOnly property.
		 */
		_applyReadOnly: function (value, old) {

			if (value)
				this.addState("readonly");
			else
				this.removeState("readonly");

			this.getChildControl("upbutton").setEnabled(!value);
			this.getChildControl("downbutton").setEnabled(!value);
			this.getChildControl("textfield").setReadOnly(value);
			this.getChildControl("textfield").setFocusable(false);
		},

		/**
		 * Applies the editable property.
		 */
		_applyEditable: function (value, old) {
			value = value && !this.isReadOnly();
			var textField = this.getChildControl("textfield");
			textField.setReadOnly(!value);
			textField.setFocusable(false);
		},

		/**
			* Checks the min and max values, disables / enables the
			* buttons and handles the wrap around.
			*/
		_updateButtons: function () {

			if (this.isReadOnly()) {
				this.getChildControl("upbutton").setEnabled(false);
				this.getChildControl("downbutton").setEnabled(false);
				return;
			}

			this.base(arguments);
		},

		/**
		 * Applies the nativeContextMenu property.
		 */
		_applyNativeContextMenu: function (value, old) {

			if (this.hasChildControl("textfield"))
				this.getChildControl("textfield").setNativeContextMenu(value);

			if (value)
				this.addListener("contextmenu", this._onContextMenu);
			else
				this.removeListener("contextmenu", this._onContextMenu);
		},

		/**
		 * Applies the buttonsLayout property.
		 */
		_applyButtonsLayout: function (value, old) {

			this.__layoutChildComponents();
		},

		/**
		 * Applies the upDownAlign property.
		 */
		_applyUpDownAlign: function (value, old) {

			this.__layoutChildComponents();

		},

		/**
		 * Applies the TextAlign property.
		 *
		 * Adjusts the alignment of the textField inner control.
		 */
		_applyTextAlign: function (value, old) {

			if (value != null) {

				var textField = this.getChildControl("textfield");
				textField.setTextAlign(value);

			}
		},

		/**
		 * Transfer the focus.
		 *
		 * @param e {qx.event.type.Pointer} Pointer tap event
		 */
		_onTap: function (e) {

			if (!this.hasState("focused"))
				this.tabFocus();
		},

		/**
		 * Handles "contextmenu" to stop the bubbling of the event
		 * when nativeContextMenu is enabled and the widget doesn't even
		 * its own context menu.
		 */
		_onContextMenu: function (e) {

			if (!this.getContextMenu() && this.getNativeContextMenu())
				e.stopPropagation();
		},

		// overridden
		_onRoll: function (e) {

			if (this.isReadOnly())
				return;

			// don't change on wheel rolls unless it has the focus.
			if (e.getPointerType() == "wheel" && !this.hasState("focused"))
				return;

			this.base(arguments, e);
		},

		// overridden to implement the useArrowKeys property.
		_onKeyDown: function (e) {

			if (this.getUseArrowKeys())
				return this.base(arguments, e);

			e.stopPropagation();
			e.preventDefault();
		},

		// overridden to implement the useArrowKeys property.
		_onKeyUp: function (e) {

			if (this.getUseArrowKeys())
				return this.base(arguments, e);

			e.stopPropagation();
			e.preventDefault();
		},

		/**
		 * Event handler for the pointer over event.
		 */
		_onPointerOver: function (e) {

			this.addState("hovered");
		},

		/**
		 * Event handler for the pointer out event.
		 */
		_onPointerOut: function (e) {

			this.removeState("hovered");
		},

		// Arranges the child components according to the settings.
		__layoutChildComponents: function () {

			var textField = this.getChildControl("textfield");
			var upButton = this.getChildControl("upbutton");
			var downButton = this.getChildControl("downbutton");
			var horizontal = this.getButtonsLayout() == "horizontal";
			var layout = this._getLayout();

			if (this.getUpDownAlign() == "right") {

				if (horizontal) {
					layout.setColumnFlex(0, 1);
					layout.setColumnFlex(1, 0);
					layout.setColumnFlex(2, 0);

					this._add(upButton, { column: 1, row: 0 });
					this._add(downButton, { column: 2, row: 0 });
					this._add(textField, { column: 0, row: 0, rowSpan: 1 });
				}
				else {
					layout.setColumnFlex(0, 1);
					layout.setColumnFlex(1, 0);

					this._add(upButton, { column: 1, row: 0 });
					this._add(downButton, { column: 1, row: 1 });
					this._add(textField, { column: 0, row: 0, rowSpan: 2 });
				}
			}
			else {

				if (horizontal) {
					layout.setColumnFlex(0, 0);
					layout.setColumnFlex(1, 0);
					layout.setColumnFlex(2, 1);

					this._add(upButton, { column: 0, row: 0 });
					this._add(downButton, { column: 1, row: 0 });
					this._add(textField, { column: 2, row: 0, rowSpan: 1 });

				}
				else {
					layout.setColumnFlex(0, 0);
					layout.setColumnFlex(1, 1);

					this._add(upButton, { column: 0, row: 0 });
					this._add(downButton, { column: 0, row: 1 });
					this._add(textField, { column: 1, row: 0, rowSpan: 2 });
				}
			}
		},
	},

});


/**
 * wisej.web.NumericUpDown
 */
qx.Class.define("wisej.web.NumericUpDown", {

	extend: wisej.web.UpDownBase,

	properties: {

		/**
		 * DecimalPlaces property.
		 */
		decimalPlaces: { init: 0, check: "Integer", apply: "_applyDecimalPlaces" },

		/**
		 * ThousandsSeparator property.
		 */
		thousandsSeparator: { init: false, check: "Boolean", apply: "_applyThousandsSeparator" },

		/**
		 * Hexadecimal property.
		 * 
		 * Displays the value as an hexadecimal number.
		 */
		hexadecimal: { init: false, check: "Boolean", apply: "_applyHexadecimal" },
	},

	construct: function (min, value, max) {

		this.base(arguments, min, value, max);

		// any action on the textbox marks this widget as dirty to update the state on the server.
		var textField = this.getChildControl("textfield");
		textField.addListener("keyup", function (e) { this.setDirty(true); }, this);
	},

	members: {

		/**
		 * Applies the decimalPlaces property.
		 */
		_applyDecimalPlaces: function (value, old) {

			this.__setFormat(value, this.getThousandsSeparator());

		},

		/**
		 * Applies the thousandsSeparator property.
		 */
		_applyThousandsSeparator: function (value, old) {

			this.__setFormat(this.getDecimalPlaces(), value);

		},

		/**
		 * Assigns the property format object.
		 */
		__setFormat: function (decimalDigits, thousandsSeparator) {

			var format = this.getNumberFormat() || new qx.util.format.NumberFormat();

			format.setMinimumFractionDigits(decimalDigits);
			format.setMaximumFractionDigits(decimalDigits);
			format.setGroupingUsed(thousandsSeparator);

			this.setNumberFormat(format);
		},

		/**
		 * Applies the hexadecimal property.
		 */
		_applyHexadecimal: function (value, old) {

			this._applyValue(this.getValue());
		},

		// overridden to allow hexadecimal characters.
		_getFilterRegExp: function () {

			if (this.isHexadecimal())
				return new RegExp("[0-9A-Fa-f]");
			else
				return this.base(arguments);
		},

		// Overridden
		//
		// Added parsing of an hexadecimal string.
		_onTextChange: function (e) {

			if (this.isHexadecimal()) {

				var textField = this.getChildControl("textfield");
				var value = parseInt(textField.getValue(), 16);

				if (!isNaN(value)) {

					// fix range
					if (value > this.getMaximum())
						value = this.getMaximum();
					else if (value < this.getMinimum())
						value = this.getMinimum();

					// set the value in the spinner
					this.setValue(value);
				}
				else {
					// otherwise, reset the last valid value
					this._applyValue(this.__lastValidValue, undefined);
				}
			}
			else {
				this.base(arguments, e);
			}
		},

		// Overridden
		//
		// Format the numeric value to hexadecimal if the property is set to true.
		//
		_applyValue: function (value, old) {

			var textField = this.getChildControl("textfield");

			this._updateButtons();

			// make sure it's a valid number
			if (isNaN(value))
				value = 0;

			// save the last valid value of the spinner
			this.__lastValidValue = value;

			// write the value of the spinner to the textfield
			if (value !== null) {

				if (this.getHexadecimal()) {

					textField.setValue(value.toString(16).toUpperCase());
				}
				else {

					if (this.getNumberFormat()) {
						textField.setValue(this.getNumberFormat().format(value));
					} else {
						textField.setValue(value + "");
					}
				}
			} else {
				textField.setValue(null);
			}

		},
	},

});


/**
 * wisej.web.DomainUpDown
 */
qx.Class.define("wisej.web.DomainUpDown", {

	extend: wisej.web.UpDownBase,

	properties: {

		/**
		 * Items property.
		 * 
		 * List of items to iterate in the spinner.
		 */
		items: { init: null, nullable: true, check: "Array", apply: "_applyItems" },
	},

	construct: function () {

		this.base(arguments);

		// add the "list" state to the components.
		var upButton = this.getChildControl("upbutton");
		var downButton = this.getChildControl("downbutton");
		this.addState("list");
		upButton.addState("list");
		downButton.addState("list");

		this.setText("");
	},

	members: {


		// current index.
		_index: -1,

		/**
		 * Applies the items property.
		 */
		_applyItems: function (value, old) {

			this._updateButtons();
		},

		// overridden
		_onTextChange: function (e) {

			// update the index of the selected item.
			this._index = this.__findItem(e.getData());
			this._updateButtons();

			this.fireDataEvent("changeValue", e.getData());
		},

		// overridden
		// use the list instead of the numeric value.
		_countUp: function () {

			var wrap = this.getWrap();
			var items = this.getItems();
			if (items == null || items.length == 0)
				return;

			// update the index of the selected item.
			this._index = this.__findItem(this.getText());

			if (this._index <= 0) {
				if (wrap)
					this._index = items.length - 1;
			}
			else {
				this._index--;
			}

			var textField = this.getChildControl("textfield");
			textField.setValue(items[this._index]);
		},


		// overridden
		// use the list instead of the numeric value.
		_countDown: function () {

			var wrap = this.getWrap();
			var items = this.getItems();
			if (items == null || items.length == 0)
				return;

			// update the index of the selected item.
			this._index = this.__findItem(this.getText());

			if (this._index >= items.length - 1) {
				if (wrap)
					this._index = 0;
			}
			else {
				this._index++;
			}

			var textField = this.getChildControl("textfield");
			textField.setValue(items[this._index]);
		},

		// overridden to eliminate the numeric filter.
		_getFilterRegExp: function () {

			return null;
		},

		// overridden
		// updates the up/down buttons according to the position in the list
		// instead of using the numeric value.
		_updateButtons: function () {

			if (this.isReadOnly()) {
				this.base(arguments);
				return;
			}

			var wrap = this.getWrap();
			var upButton = this.getChildControl("upbutton");
			var downButton = this.getChildControl("downbutton");

			var items = this.getItems();
			if (items != null && items.length > 0) {

				if (this._index <= 0)
					upButton.setEnabled(wrap);
				else
					upButton.setEnabled(true);

				if (this._index >= items.length - 1)
					downButton.setEnabled(wrap);
				else
					downButton.setEnabled(true);
			}
			else {
				upButton.setEnabled(false);
				downButton.setEnabled(false);
			}

		},

		/**
		 * Find the item that matches the text.
		 */
		__findItem: function (text) {

			var items = this.getItems();
			if (items == null || items.length == 0)
				return -1;

			return items.indexOf(text);
		},

	},

});
