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

		var textField = this.getChildControl("textfield");

		// enable the native context menu by default.
		this.setNativeContextMenu(true);

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["value", "text"]));

		// add local state events.
		this.setStateEvents(this.getStateEvents().concat(["changeValue"]));

		// any action on the textbox marks this widget as dirty to update the state on the server.
		textField.addListener("keydown", function (e) {
			this.setDirty(true);
		}, this);

		// forward the focusin and focusout events to the textfield. The textfield
		// is not focusable so the events need to be forwarded manually.
		this.addListener("focusin", function (e) {
			textField.fireNonBubblingEvent("focusin", qx.event.type.Focus);
		}, this);
		this.addListener("focusout", function (e) {
			textField.fireNonBubblingEvent("focusout", qx.event.type.Focus);
		}, this);

		// pointer events.
		this.addListener("pointerout", this._onPointerOut, this);
		this.addListener("pointerover", this._onPointerOver, this);
		this.addListener("pointerdown", this._onPointerDown, this);
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
		upDownAlign: { init: "right", check: ["left", "right", "center"], apply: "_applyUpDownAlign", themeable: true },

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

		/**
		 * SelectOnEnter property.
		 * 
		 * When set to true, the entire text is selected when the element gains the focus.
		 */
		selectOnEnter: { init: false, check: "Boolean", apply: "_applySelectOnEnter" },

		/**
		 * When set to true, hides the up and down buttons on the control.
		 */
		hideUpDownButtons: { init: false, check: "Boolean", apply: "_applyHideUpDownButtons" }

	},

	members: {

		/**
		 * Returns or sets the text property.
		 *
		 * Changes the text in the inner textfield.
		 */
		getText: function () {

			return this.getChildControl("textfield").getValue();
		},
		setText: function (value, old) {

			this.getChildControl("textfield").setValue(value);
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
		 * Filters the state collected by MWisejControl.updateState().
		 */
		getState: function (state) {

			// force a "changeValue" event when reading the state
			// in case the user clicked on an item that doesn't change the focus
			// such as menu item or some utility buttons.

			// without a focus change or enter, the "changeValue" event is not 
			// fired and the value of the spinner is not updated.

			var textField = this.getChildControl("textfield");
			textField.fireNonBubblingEvent("changeValue", qx.event.type.Data, [textField.getValue()]);

			state.value = this.getValue();

			return state;
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
		 * Applies the selectOnEnter property.
		 */
		_applySelectOnEnter: function (value, old) {

			if (value && !old) {
				this.addListener("focusin", function (e) {
					if (this.isSelectOnEnter()) {
						var textField = this.getChildControl("textfield");
						qx.event.Timer.once(textField.selectAllText, textField, 1);
					}
				}, this);
			}
		},

		/**
		 * Applies the hideUpDownButtons property.
		 */
		_applyHideUpDownButtons: function (value, old) {

			if (value) {
				this._excludeChildControl("upbutton");
				this._excludeChildControl("downbutton");
			} else {
				this._showChildControl("upbutton");
				this._showChildControl("downbutton");
			}
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
		 * Handles "contextmenu" to stop the bubbling of the event
		 * when nativeContextMenu is enabled and the widget doesn't even
		 * its own context menu.
		 */
		_onContextMenu: function (e) {

			if (!this.getContextMenu() && this.getNativeContextMenu())
				e.stopPropagation();
		},

		/**
		 * Event handler for the "pointerover" event.
		 */
		_onPointerOver: function (e) {

			this.addState("hovered");
		},

		/**
		 * Event handler for the "pointerout" event.
		 */
		_onPointerOut: function (e) {

			this.removeState("hovered");
		},

		/**
		 * Event handler for the "pointerdown" event.
		 */
		_onPointerDown: function (e) {

			if (e.getTarget() === this) {
				qx.event.Timer.once(this.focus, this, 0);
			}
		},

		// overridden
		_onRoll: function (e) {

			if (this.isReadOnly())
				return;

			// don't change on wheel rolls unless it has the focus.
			if (e.getPointerType() === "wheel" && !this.hasState("focused"))
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

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "textfield":
					control = this.base(arguments, id, hash);
					control.setMinWidth(1);
					control.setMinHeight(1);
					control.setAllowGrowY(false);
					// disable browser's autocomplete.
					control.getContentElement().setAttribute("autocomplete", "off");

					break;
			}

			return control || this.base(arguments, id);
		},

		// Arranges the child components according to the settings.
		__layoutChildComponents: function () {

			var textField = this.getChildControl("textfield");
			var upButton = this.getChildControl("upbutton");
			var downButton = this.getChildControl("downbutton");
			var horizontal = this.getButtonsLayout() === "horizontal";
			var layout = this._getLayout();
			var align = this.getUpDownAlign();

			switch (align) {
				case "left":
					{
						if (horizontal) {
							layout.setColumnFlex(0, 0);
							layout.setColumnFlex(1, 0);
							layout.setColumnFlex(2, 1);

							this._add(upButton, { column: 1, row: 0 });
							this._add(downButton, { column: 0, row: 0 });
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
					break;

				case "center":
					{
						layout.setColumnFlex(0, 0);
						layout.setColumnFlex(1, 1);
						layout.setColumnFlex(2, 0);

						this._add(upButton, { column: 2, row: 0 });
						this._add(downButton, { column: 0, row: 0 });
						this._add(textField, { column: 1, row: 0, rowSpan: 1 });
					}
					break;

				default:
				case "right":
					{
						if (horizontal) {
							layout.setColumnFlex(0, 1);
							layout.setColumnFlex(1, 0);
							layout.setColumnFlex(2, 0);

							this._add(upButton, { column: 2, row: 0 });
							this._add(downButton, { column: 1, row: 0 });
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
					break;
			}
		}
	}

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
		}
	}

});


/**
 * wisej.web.DomainUpDown
 */
qx.Class.define("wisej.web.DomainUpDown", {

	extend: wisej.web.UpDownBase,

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

	properties: {

		/**
		 * Items property.
		 * 
		 * List of items to iterate in the spinner.
		 */
		items: { init: null, nullable: true, check: "Array", apply: "_applyItems" }
	},

	members: {


		// current index.
		_index: -1,

		/**
		 * Applies the items property.
		 */
		_applyItems: function (value, old) {

			// update the index of the selected item.
			this._index = this.__findItem(this.getText());

			this._updateButtons();
		},

		// overridden
		_onTextChange: function (e) {

			// update the index of the selected item.
			this._index = this.__findItem(e.getData());

			this._updateButtons();

			this.fireDataEvent("changeValue", e.getData(), e.getOldData());
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

			if (this._index < 0)
				return;

			this.getChildControl("textfield").setValue(items[this._index]);
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

			this.getChildControl("textfield").setValue(items[this._index]);
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
		}

	}

});


/**
 * wisej.web.TimeUpDown
 */
qx.Class.define("wisej.web.TimeUpDown", {

	extend: wisej.web.UpDownBase,

	construct: function () {

		this.base(arguments);

		this.initFormat();

	},

	properties: {

		/**
		 * Maximum value property.
		 */
		maximum: { init: new Date(0, 0, 0, 23, 59, 59), check: "Date", apply: "_applyMaximum" },

		/**
		 * Minimum value property.
		 */
		minimum: { init: new Date(0, 0, 0, 0, 0, 0), check: "Date", apply: "_applyMinimum" },

		/** 
		 *  The value of the spinner.
		 *
		 */
		value: { init: null, check: "Date", apply: "_applyValue", transform:"_transformValue" },

		/** 
		 * Format property.
		 *
		 * Sets the format used to display the time.
		 */
		format: { init: "H:m:s", check: "String", apply: "_applyFormat" },
	},

	members: {

		/** qx.locale.Date.getDateTimeFormat used to format and parse the time. */
		__formatter: null,

		/** flag to indicate the value is changing because it's being formatted. */
		__formattingText: false,

		/**
		 * Applies the value property.
		 */
		_applyValue: function (value, old) {

			if (value == old || (value != null && old != null && value.getTime() === old.getTime()))
				return;

			if (value && this.__formatter != null) {

				this.setText(this.__formatter.format(value));

			} else {

				this.setText(null);
			}

			this._updateButtons();

			this.fireDataEvent("changeValue", value, old);
		},

		/**
		 * Transforms the value to apply the limits.
		 */
		_transformValue: function (value) {

			return this.__limitMin(this.__limitMax(value, this.getMaximum()), this.getMinimum());
		},

		// overridden
		_countUp: function () {

			var value = this.getValue();
			if (!value)
				return;

			var wrap = this.getWrap();

			var newValue = new Date(value);
			var part = this.__selectCurrentTimePart();
			if (part) {
				var H = newValue.getHours();
				var M = newValue.getMinutes();
				var S = newValue.getSeconds();
				switch (part.type) {
					case "H":
						if (wrap || H < 23)
							newValue.setHours(H + 1);
						break;
					case "M":
						if (wrap || M < 59)
							newValue.setMinutes(M + 1);
						break;
					case "S":
						if (wrap || S < 59)
							newValue.setSeconds(S + 1);
						break;
					case "AM":
						newValue.setHours(H + 12);
						break;
					case "PM":
						if (wrap)
							newValue.setHours(H - 12);
						break;
				}
				this.setValue(newValue);
				var field = this.getChildControl("textfield");
				field.setTextSelection(part.position, part.position + part.length)
			}

		},

		// overridden
		_countDown: function () {

			var value = this.getValue();
			if (!value)
				return;

			var wrap = this.getWrap();

			var newValue = new Date(value);
			var part = this.__selectCurrentTimePart();
			if (part) {
				var H = newValue.getHours();
				var M = newValue.getMinutes();
				var S = newValue.getSeconds();
				switch (part.type) {
					case "H":
						if (wrap || H > 0)
							newValue.setHours(H - 1);
						break;
					case "M":
						if (wrap || M > 0)
							newValue.setMinutes(M - 1);
						break;
					case "S":
						if (wrap || S > 0)
							newValue.setSeconds(S - 1);
						break;
					case "AM":
						if (wrap)
							newValue.setHours(H + 12);
						break;
					case "PM":
						newValue.setHours(H - 12);
						break;
				}

				// update the value and preserve the selected text.
				this.setValue(newValue);
				var field = this.getChildControl("textfield");
				field.setTextSelection(part.position, part.position + part.length)
			}
		},

		// overridden
		_onTextChange: function (e) {

			var text = e.getData();

			try {

				this.setValue(this.__formatter.parse(text));

			} catch (ex) {
			}

			this._updateButtons();
		},

		// overridden
		// updates the up/down buttons according to the value and the constraints in the field.
		_updateButtons: function () {

			if (this.isReadOnly()) {
				this.base(arguments);
				return;
			}

			var value = this.getValue();
			var upButton = this.getChildControl("upbutton");
			var downButton = this.getChildControl("downbutton");

			if (this.getWrap() || !value) {
				upButton.setEnabled(true);
				downButton.setEnabled(true);
			}
			else {

				var value = this.getValue();
				var minValue = this.getMinimum();
				var maxValue = this.getMaximum();

				var H = value.getHours();
				var M = value.getMinutes();
				var S = value.getSeconds();
				var minH = minValue.getHours();
				var minM = minValue.getMinutes();
				var minS = minValue.getSeconds();
				var maxH = maxValue.getHours();
				var maxM = maxValue.getMinutes();
				var maxS = maxValue.getSeconds();

				upButton.setEnabled(H < maxH || (H === maxH && M < maxM) || (H === maxH && M === maxM && S < maxS));
				downButton.setEnabled(H > minH || (H === minH && M > minM) || (H === minH && M === minM && S > minS));

			}
		},

		// overridden to eliminate the numeric filter.
		_getFilterRegExp: function () {

			return null;
		},

		/**
		 * Applies the Maximum property.
		 */
		_applyMaximum: function (value, old) {

			this.setValue(this.__limitMax(this.getValue(), value));

		},

		/**
		 * Applies the Minimum property.
		 */
		_applyMinimum: function (value, old) {

			this.setValue(this.__limitMin(this.getValue(), value));

		},

		__limitMin: function (value, minValue) {

			if (!value)
				return value;

			var H = value.getHours();
			var M = value.getMinutes();
			var S = value.getSeconds();
			var minH = minValue.getHours();
			var minM = minValue.getMinutes();
			var minS = minValue.getSeconds();
			if (H < minH
				|| (H === minH && M < minM)
				|| (H === minH && M === minM && S < minS)) {

				return minValue
			}

			return value;

		},

		__limitMax: function (value, maxValue) {

			if (!value)
				return value;

			var H = value.getHours();
			var M = value.getMinutes();
			var S = value.getSeconds();
			var maxH = maxValue.getHours();
			var maxM = maxValue.getMinutes();
			var maxS = maxValue.getSeconds();
			if (H > maxH
				|| (H === maxH && M > maxM)
				|| (H === maxH && M === maxM && S > maxS)) {

				return maxValue;
			}

			return value;
		},

		/**
		 * Applies the Format property.
		 */
		_applyFormat: function (value, old) {

			var savedValue = this.getValue();

			if (this.__formatter)
				this.__formatter.dispose();

			this.__formatter = new qx.util.format.DateFormat(value);
			var locale = qx.locale.Manager.getInstance().getLocale();

			var rule = value;
			rule = rule.replace(/[HMS]/ig, "\\d");
			rule = rule.replace(/\./ig, "\\.");
			rule = rule.replace(/a/ig, qx.locale.Date.getAmMarker(locale) + qx.locale.Date.getPmMarker(locale));
			var textfield = this.getChildControl("textfield");
			textfield.setFilter(new RegExp("[" + rule + "]"));

			if (savedValue)
				this.setText(this.__formatter.format(savedValue));
		},

		// Selects the time part under the current cursor.
		__selectCurrentTimePart: function () {

			var part = null;
			var parts = this.__parseTimeParts();
			var field = this.getChildControl("textfield");
			var currentPos = field.getTextSelectionStart();

			// find the part closes to the caret.
			for (var i = parts.length - 1; i > -1; i--) {

				part = parts[i];
				if (currentPos >= part.position) {
					break;
				}
			}

			if (part) {
				field.setTextSelection(part.position, part.position + part.length)
			}

			return part;
		},

		// Parses the text into 4 parts: H, M, S, AM, PM with their cursor position and length.
		__parseTimeParts: function () {

			var parts = [];
			var text = this.getText();
			var typeIndex = 0;
			var types = ["H", "M", "S", "AM", "PM"];

			// detect H, M, S
			var re = new RegExp("\\d+", "g");
			var match = null;
			while (match = re.exec(text)) {
				parts.push({
					value: match[0],
					position: match.index,
					length: match[0].length,
					type: types[typeIndex++]
				});
			}

			// detect AM
			var locale = qx.locale.Manager.getInstance().getLocale();
			var re = new RegExp(qx.locale.Date.getAmMarker(locale));
			var match = re.exec(text);
			if (match) {
				parts.push({
					value: match[0],
					position: match.index,
					length: match[0].length,
					type: types[3]
				});
			}

			// detect PM
			var locale = qx.locale.Manager.getInstance().getLocale();
			var re = new RegExp(qx.locale.Date.getPmMarker(locale));
			var match = re.exec(text);
			if (match) {
				parts.push({
					value: match[0],
					position: match.index,
					length: match[0].length,
					type: types[4]
				});
			}

			return parts;
		},

		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "upbutton":
					control = this.base(arguments, id, hash);
					control.setKeepFocus(true);
					break;

				case "downbutton":
					control = this.base(arguments, id, hash);
					control.setKeepFocus(true);
					break;
			}

			return control || this.base(arguments, id);
		}

	},
	destruct: function () {
		this._disposeObjects("__formatter");
	}

});
