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
 * wisej.web.DateTimePicker
 */
qx.Class.define("wisej.web.DateTimePicker", {

	extend: qx.ui.form.DateField,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	/**
	 * Constructor.
	 */
	construct: function () {

		this.base(arguments);

		this.__createUpDownContainer();

		this._forwardStates.checked = true;
		this._forwardStates.unchecked = true;

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["value", "checked", "text"]));

		// add local state events.
		this.setStateEvents(this.getStateEvents().concat(["valueChanged", "textChanged"]));

		// handle "focusin" and "focusout" to focus/blur the inner editable textfield.
		this.addListener("focusin", this.__onFocusIn, this);

		// hovered event handlers.
		this.addListener("pointerover", this._onPointerOver);
		this.addListener("pointerout", this._onPointerOut);

		// any action on the textbox marks this widget as dirty to update the state on the server.
		var textField = this.getChildControl("textfield");
		textField.addListener("keyup", function (e) { this.setDirty(true); }, this);

		// enable the native context menu by default.
		this.setNativeContextMenu(true);
	},

	properties: {

		/**
		 * Checked property.
		 *
		 * Works together with the ShowCheckBox property. It marks the checkbox as checked/unchecked.
		 * When unchecked and if showCheckBox is true, the textfield is disabled.
		 */
		checked: { init: false, check: "Boolean", apply: "_applyChecked" },

		/**
		 * ShowCheckBox property.
		 *
		 * Shows or hides a checkbox image to the left of the date picker textfield.
		 */
		showCheckBox: { init: false, check: "Boolean", apply: "_applyShowCheckBox" },

		/**
		 * ShowUpDown property.
		 *
		 * Shows or hides the additional up/down buttons to the right of the textfield.
		 */
		showUpDown: { init: false, check: "Boolean", apply: "_applyShowUpDown" },

		/**
		 * ShowCalendar property.
		 *
		 * Shows or hides the calendar button.
		 */
		showCalendar: { init: true, check: "Boolean", apply: "_applyShowCalendar" },

		/**
		 * ShowToolTips property.
		 *
		 * Shows or hides the tooltips displayed by the popup calendar control.
		 */
		showToolTips: { init: true, check: "Boolean" },

		/**
		 * Text property.
		 *
		 * Updates the text in the textfield. Doesn't alter the value as the text is not parsed.
		 *
		 * Property defined with the setter/getter methods.
		 */

		/**
		 * Selection(start, length) property.
		 *
		 * This property is defined using the getter/setter methods.
		 */

		/**
		 * Value property.
		 *
		 * Updates the selected date.
		 */
		value: { init: null, check: "Date", apply: "_applyValue", nullable: true },

		/**
		 * MinValue property.
		 */
		minValue: { check: "Date", init: null, nullable: true },

		/**
		 * MaxValue property.
		 */
		maxValue: { check: "Date", init: null, nullable: true },

		/**
		 * ReadOnly property.
		 */
		readOnly: { check: "Boolean", apply: "_applyReadOnly", init: false },

		/**
		 * Editable property.
		 *
		 * Controls whether the textfield of the DateTimePicker is editable or not
		 */
		editable: { check: "Boolean", init: true, apply: "_applyEditable" },

		/**
		 * Tools property.
		 *
		 * Collection of tool definitions to display next to the edit field.
		 */
		tools: { check: "Array", apply: "_applyTools" },

	},

	members: {

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
			this.getChildControl("button").setEnabled(!value);
			this.getChildControl("textfield").setReadOnly(value);
			this.getChildControl("textfield").setFocusable(false);
		},

		/**
		 * Applies the editable property.
		 */
		_applyEditable: function (value, old) {
			value = value && !this.isReadOnly();
			this.getChildControl("textfield").setReadOnly(!value);
			this.getChildControl("textfield").setFocusable(false);
		},

		/**
		 * Applies the nativeContextMenu property.
		 */
		_applyNativeContextMenu: function (value, old) {

			if (this.hasChildControl("textfield"))
				this.getChildControl("textfield").setNativeContextMenu(value);
		},

		/**
		 * Applies the checked property.
		 */
		_applyChecked: function (value, old) {

			if (this.getShowCheckBox()) {

				if (value) {
					this.addState("checked");
					this.removeState("unchecked");
				}
				else {
					this.removeState("checked");
					this.addState("unchecked");
				}

				this.__enableControls([
					"textfield", "upbutton", "downbutton", "button"], value);
			}
		},

		__enableControls: function (controls, enable) {

			for (var i = 0; i < controls.length; i++)
				this.getChildControl(controls[i]).setEnabled(enable);

		},

		/**
		 * Applies the showCheckBox property.
		 */
		_applyShowCheckBox: function (value, old) {

			if (value)
				this.addState("unchecked");
			else
				this.removeState("unchecked");

			this.getChildControl("checkbox").setVisibility(value ? "visible" : "excluded");

			this._applyChecked(this.getChecked());
		},

		/**
		 * Applies the showUpDown property.
		 */
		_applyShowUpDown: function (value, old) {

			this.getChildControl("upbutton").setVisibility(
				value ? "visible" : "excluded");

			this.getChildControl("downbutton").setVisibility(
				value ? "visible" : "excluded");
		},

		/**
		 * Applies the showCalendar property.
		 */
		_applyShowCalendar: function (value, old) {

			this.getChildControl("button").setVisibility(
				value ? "visible" : "excluded");
		},

		/**
		 * Applies the text property.
		 */
		setText: function (value) {

			this.__suspendEvents = true;
			try {

				var textfield = this.getChildControl("textfield");

				if (!this.core.processingActions) {

					textfield.setValue(value);
				}
				else {

					// update the text in the inner text field preserving the caret position.
					var selection = this.getSelection();

					textfield.setValue(value);

					var handler = qx.ui.core.FocusHandler.getInstance();
					if (handler && handler.isFocused(this)) {

						if (selection.length > 1)
							this.selectAllText();
						else
							this.setSelection(selection);
					}
				}

			} finally {

				this.__suspendEvents = false;
			}
		},
		getText: function () {

			return this.getChildControl("textfield").getValue();
		},

		/**
		 * Applies the value property.
		 */
		_applyValue: function (value, old) {

			// do nothing, simply store the date value.
		},

		/** 
		 * Applies the tools property.
		 */
		_applyTools: function (value, old) {

			if (value == null)
				return;

			if (value.length == 0 && (old == null || old.length == 0))
				return;

			var index = this._indexOf(this.getChildControl("textfield"));
			wisej.web.ToolContainer.install(this, this, value, "right", { index: index + 1 });
			wisej.web.ToolContainer.install(this, this, value, "left", { index: 0 });
		},

		/**
		 * Get/set the selection property.
		 */
		getSelection: function () {
			var value = {
				start: this.getTextSelectionStart() || 0,
				length: this.getTextSelectionLength() || 0
			};
			return value;
		},
		setSelection: function (value) {

			if (value) {
				this.setTextSelection(value.start, value.length + value.start);
			}
		},

		// overridden.
		// handles changes in the textfield.
		//
		// when the text changes, we fire "textChanged" to let the
		// server parse the text to a date, format it according to the
		// current culture and format and set the text back.
		_onTextFieldChangeValue: function (e) {

			if (this.__suspendEvents)
				return;

			if (wisej.web.DesignMode) {
				this.base(arguments, e);
				return;
			}

			var textfield = this.getChildControl("textfield");
			this.fireDataEvent("textChanged", textfield.getValue());

		},

		// overridden.
		//
		// when the date changes by clicking on the calendar dropdown, we
		// fire "valueChanged" to let the server format the date and update
		// the text accordingly.
		_onChangeDate: function (e) {

			if (wisej.web.DesignMode) {
				this.base(arguments, e);
				return;
			}

			// don't change when read-only.
			if (this.isReadOnly()) {
				this.close();
				return;
			}

			var selectedDate = this.getChildControl("list").getValue();
			this.fireDataEvent("valueChanged", selectedDate);
			this.selectAllText();

			this.close();
		},

		// forward the "focus" event and 
		// focus the inner textfield when gaining the focus, otherwise the editable
		// textfield doesn't get the focus when clicking close or on the border.
		__onFocusIn: function (e) {

			var textField = this.getChildControl("textfield");

			if (textField.isVisible()) {

				if (textField != qx.ui.core.Widget.getWidgetByElement(e.getOriginalTarget()))
					textField.getContentElement().focus();
			}
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

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "checkbox":
					control = new qx.ui.basic.Image();
					this._addBefore(control, this.getChildControl("textfield"));
					control.addListener("tap", this.__onCheckboxTap, this);
					break;

				case "upbutton":
					control = new qx.ui.form.RepeatButton().set({
						focusable: false,
						keepActive: true,
						keepFocus: true,
						minTimer: 100,
						interval: 300,
						timerDecrease: 20,
						visibility: "excluded"
					});
					control.addState("inner");
					control.addListener("execute", this.__onUpButtonExecute, this);
					break;

				case "downbutton":
					control = new qx.ui.form.RepeatButton().set({
						focusable: false,
						keepActive: true,
						keepFocus: true,
						minTimer: 100,
						interval: 300,
						timerDecrease: 20,
						visibility: "excluded"
					});
					control.addState("inner");
					control.addListener("execute", this.__onDownButtonExecute, this);
					break;
			}

			return control || this.base(arguments, id);
		},

		__createUpDownContainer: function () {

			if (this.__upDownContainer)
				return;

			var container = this.__upDownContainer = new qx.ui.container.Composite(new qx.ui.layout.VBox);
			container.add(this.getChildControl("upbutton"), { flex: 1 });
			container.add(this.getChildControl("downbutton"), { flex: 1 });

			this._addAfter(container, this.getChildControl("textfield"));
		},

		__onUpButtonExecute: function (e) {

			// send the location of the cursor to send it along with the event.
			// the server has to determine what part of the value to decrease.
			if (!this.isReadOnly())
				this.fireDataEvent("up", this.getTextSelectionStart());
		},

		__onDownButtonExecute: function (e) {

			// send the location of the cursor to send it along with the event.
			// the server has to determine what part of the value to increase.
			if (!this.isReadOnly())
				this.fireDataEvent("down", this.getTextSelectionStart());

		},

		_onKeyPress: function (e) {

			// process Up and Down when the calendar is not open to
			// increase/decrease the date/time part under the caret.
			var popup = this.getChildControl("popup", true);
			if (e.getModifiers() == 0 && (!popup || !popup.isVisible())) {

				var key = e.getKeyIdentifier();
				switch (key) {

					case "Up":
					case "PageUp":
					case "Down":
					case "PageDown":
						if (this.getText() > "") {
							e.stop();

							// send the location of the cursor to send it along with the event.
							// the server has to determine what part of the value to increase.
							if (!this.isReadOnly())
								this.fireDataEvent(qx.lang.String.firstLow(key), this.getTextSelectionStart());
						}
						return;
				}
			}

			this.base(arguments, e);
		},

		__onCheckboxTap: function (e) {

			this.toggleChecked();
			this.fireDataEvent("checkedChanged", this.getChecked());

		},

		// overridden.
		_onPopupChangeVisibility: function (e) {

			e.getData() == "visible" ? this.addState("popupOpen") : this.removeState("popupOpen");

			// synchronize the chooser with the current value on every
			// opening of the popup. This is needed when the value has been
			// modified and not saved yet (e.g. no blur).
			var popup = this.getChildControl("popup");
			if (popup.isVisible()) {

				var chooser = this.getChildControl("list");

				// show/hide the tooltips in the chooser control.
				var hide = !this.getShowToolTips();
				chooser.getChildControl("last-year-button").setBlockToolTip(hide);
				chooser.getChildControl("next-year-button").setBlockToolTip(hide);
				chooser.getChildControl("last-month-button").setBlockToolTip(hide);
				chooser.getChildControl("next-month-button").setBlockToolTip(hide);

				// update the min/max limits.
				chooser.setMinValue(this.getMinValue());
				chooser.setMaxValue(this.getMaxValue());

				chooser.setValue(this.getValue());
			}

			this.fireEvent(popup.isVisible() ? "open" : "close");

			if (e.getOldData() == "visible")
				this.tabFocus();
		},

		/*---------------------------------------------------------------------------
		  Selection API
		---------------------------------------------------------------------------*/

		/**
		 * Returns the current selection.
		 * This method only works if the widget is already created and
		 * added to the document.
		 *
		 * @return {String|null}
		 */
		getTextSelection: function () {
			return this.getChildControl("textfield").getTextSelection();
		},


		/**
		 * Returns the current selection length.
		 * This method only works if the widget is already created and
		 * added to the document.
		 *
		 * @return {Integer|null}
		 */
		getTextSelectionLength: function () {
			return this.getChildControl("textfield").getTextSelectionLength();
		},

		/**
		 * Returns the start of the text selection.
		 * This method only works if the widget is already created and
		 * added to the document.
		 *
		 * @return {Integer|null} Start of selection or null if not available
		 */
		getTextSelectionStart: function () {
			return this.getChildControl("textfield").getTextSelectionStart();
		},

		/**
		 * Returns the end of the text selection.
		 * This method only works if the widget is already created and
		 * added to the document.
		 *
		 * @return {Integer|null} End of selection or null if not available
		 */
		getTextSelectionEnd: function () {
			return this.getChildControl("textfield").getTextSelectionEnd();
		},


		/**
		 * Set the selection to the given start and end (zero-based).
		 * If no end value is given the selection will extend to the
		 * end of the textfield's content.
		 * This method only works if the widget is already created and
		 * added to the document.
		 *
		 * @param start {Integer} start of the selection (zero-based)
		 * @param end {Integer} end of the selection
		 */
		setTextSelection: function (start, end) {
			this.getChildControl("textfield").setTextSelection(start, end);
		},


		/**
		 * Clears the current selection.
		 * This method only works if the widget is already created and
		 * added to the document.
		 *
		 */
		clearTextSelection: function () {
			this.getChildControl("textfield").clearTextSelection();
		},


		/**
		 * Selects the whole content
		 *
		 */
		selectAllText: function () {
			this.getChildControl("textfield").selectAllText();
		},


		/**
		 * Clear any text selection, then select all text
		 *
		 */
		resetAllTextSelection: function () {
			this.clearTextSelection();
			this.selectAllText();
		}
	},

	destruct: function () {

		if (this.__upDownContainer) {
			this.__upDownContainer.destroy();
			this.__upDownContainer = null;
		}
	}

});
