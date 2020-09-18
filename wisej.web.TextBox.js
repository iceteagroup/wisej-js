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
 * wisej.web.TextBoxBase
 *
 * Wraps a qx.ui.form.TextField inside a container and provides
 * additional support for wisej.web.ToolContainer and css pseudo
 * elements needed to implement the material design theme.
 */
qx.Class.define("wisej.web.TextBoxBase", {

	extend: qx.ui.core.Widget,

	implement: [
		qx.ui.form.IStringForm,
		qx.ui.form.IForm
	],

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle,
		qx.ui.form.MForm,
		qx.ui.core.MContentPadding
	],

	/**
	 * Constructor.
	 */
	construct: function () {

		this.base(arguments);

		// set the layout
		var layout = new qx.ui.layout.HBox();
		this._setLayout(layout);
		layout.setAlignY("middle");

		var textField = this.getChildControl("textfield");

		// enable the native context menu by default.
		this.setNativeContextMenu(true);

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["value", "selection"]));

		// any action on the textbox marks it as dirty to update the state on the server.
		textField.addListener("input", this.__onTextFieldInput, this);
		textField.addListener("changeValue", this.__onTextFieldChangeValue, this);
		textField.addListener("keydown", function (e) { this.setDirty(true); }, this);

		// attach the native event "oncopy" to update the clipboard on the server.
		this.__getTextFieldElement().addListener("copy", this._onNativeCopy, this);

		// forward the focusin and focusout events to the textfield. The textfield
		// is not focusable so the events need to be forwarded manually.
		this.addListener("focusin", function (e) {
			textField.fireNonBubblingEvent("focusin", qx.event.type.Focus);
		}, this);
		this.addListener("focusout", function (e) {
			textField.fireNonBubblingEvent("focusout", qx.event.type.Focus);
		}, this);

		// rtl support.
		this.addListener("changeRtl", function (e) {
			this._mirrorChildren(e.getData());
		}, this);

		// pointer events.
		this.addListener("pointerout", this._onPointerOut, this);
		this.addListener("pointerover", this._onPointerOver, this);
		this.addListener("pointerdown", this._onPointerDown, this);
	},

	events: {

		/**
		 * The event is fired on every keystroke modifying the value of the field.
		 *
		 * The method {@link qx.event.type.Data#getData} returns the
		 * current value of the text field.
		 */
		"input": "qx.event.type.Data",

		/**
		 * The "changeValue" event is fired each time the text field looses focus and the
		 * text field values has changed.
		 *
		 * If you change {@link #liveUpdate} to true, the changeValue event will
		 * be fired after every keystroke and not only after every focus loss. In
		 * that mode, the changeValue event is equal to the {@link #input} event.
		 *
		 * The method {@link qx.event.type.Data#getData} returns the
		 * current text value of the field.
		 */
		"changeValue": "qx.event.type.Data",
	},

	properties: {

		appearance: { init: "textbox", refine: true },

		// overridden
		focusable: { refine: true, init: true },

		/** 
		 * CharacterCasing property.
		 *
		 * Gets or sets whether the control modifies the case of characters as they are typed.
		 */
		characterCasing: { init: "normal", check: "String", apply: "_applyCharacterCasing" },

		/**
		 * Selection(start, length) property.
		 *
		 * This property is defined using the getter/setter methods.
		 */

		/** 
		 * SpellCheck property.
		 *
		 * Gets or sets whether the spell checking is enabled.
		 */
		spellCheck: { init: false, check: "Boolean", apply: "_applySpellCheck" },

		/**
		 * Placeholder property.
		 *
		 * String value which will be shown as a hint if the field is all of:
		 * unset, unfocused and enabled. Set to null to not show a placeholder
		 * text.
		 */
		placeholder: { check: "String", nullable: true, apply: "_applyPlaceholder" },

		/**
		 * TextAlign property.
		 */
		textAlign: { init: "left", check: ["left", "center", "right"], apply: "_applyTextAlign" },

		/**
		 * ReadOnly property.
		 */
		readOnly: { check: "Boolean", apply: "_applyReadOnly", init: false },

		/**
		 * MaxLength property.
		 *
		 * Sets the maximum number of characters that can be entered in the input/textarea element.
		 */
		maxLength: { apply: "_applyMaxLength", check: "PositiveInteger", init: Infinity },

		/**
		 * Tools property.
		 *
		 * Collection of tool definitions to display next to the edit field.
		 */
		tools: { check: "Array", apply: "_applyTools" },

		/**
		 * AutoComplete property.
		 *
		 * Enables or disables the browser's autocomplete feature.
		 */
		autoComplete: { init: "default", check: ["default", "on", "off"], apply: "_applyAutoComplete" },

		/**
		 * AutoCompleteList property.
		 *
		 * Identifies a list of pre-defined options to suggest to the user.
		 */
		autoCompleteList: { init: null, nullable: true, check: "Array", apply: "_applyAutoCompleteList" },

		/**
		 * AllowTextSelection property.
		 * 
		 * When set to false, it skips calls to the text selection API. It's used when
		 * the TextBox type is set to "checkbox" or "radio".
		 */
		allowTextSelection: { init: true, check: "Boolean" },

		/**
		 * SelectOnEnter property.
		 * 
		 * When set to true, the entire text is selected when the element gains the focus.
		 */
		selectOnEnter: {init: false, check:"Boolean", apply:"_applySelectOnEnter"}
	},

	statics: {

		__defaultAutoComplete: "off",

		/**
		 * Sets the default value for the "autocomplete" attribute when the
		 * property is set to "default".
		 * @param {string} value default autoComplete attribute value.
		 */
		setAutoCompleteDefault: function (value) {
			this.__defaultAutoComplete = value;
		},

		/**
		 * Returns the default "autocomplete" attribute value.
		 */
		getAutoCompleteDefault: function () {
			return this.__defaultAutoComplete;
		}
	},

	members: {

		// forwarded states.
		_forwardStates: {
			focused: true,
			invalid: true,
			readonly: true
		},

		/**
		 * Scrolls the textfield to the given left position.
		 *
		 * @param value {Integer} Horizontal scroll position.
		 */
		scrollToX: function (value) {
			this.getChildControl("textfield").getContentElement().scrollToX(value, true);
		},

		/**
		 * Scrolls the textfield to the given top position.
		 *
		 * @param value {Integer} Vertical scroll position.
		 */
		scrollToY: function (value) {
			this.getChildControl("textfield").getContentElement().scrollToY(value, true);
		},

		/**
		 * Applies the placeholder property.
		 */
		_applyPlaceholder: function (value, old) {
			this.getChildControl("textfield").setPlaceholder(value);
		},

		/**
		 * Applies the readOnly property.
		 */
		_applyReadOnly: function (value, old) {

			if (value)
				this.addState("readonly");
			else
				this.removeState("readonly");

			var textField = this.getChildControl("textfield");
			textField.setReadOnly(value);
		},

		/**
		 * Applies the autoComplete property.
		 */
		_applyAutoComplete: function (value, old) {

			var textField = this.getChildControl("textfield");
			textField.getContentElement().setAttribute(
				"autocomplete",
				value === "default"
					? wisej.web.TextBoxBase.getAutoCompleteDefault()
					: value);
		},

		/**
		 * Applies the autoCompleteList property.
		 */
		_applyAutoCompleteList: function (value, old) {

			var textField = this.getChildControl("textfield");
			var elem = textField.getContentElement();
			var listId = this.getId() + "_datalist";
			elem.setAttribute("list", listId);

			if (old != null && old.length > 0 && this.__datalist != null) {
				this.__datalist.removeAll();
			}

			if (value && value.length > 0) {

				// create the child datalist element, if it's the first time.
				if (this.__datalist == null) {
					this.__datalist = new qx.html.Element("datalist", null, { id: listId });
					elem.add(this.__datalist);
				}

				// add the child values.
				for (var i = 0; i < value.length; i++) {
					this.__datalist.add(new qx.html.Element("option", null, { value: value[i] }));
				}
			}
		},

		// datalist element for the browser's autocomplete feature, supported from HTML5.
		__datalist: null,

		/**
		 * Applies the textAlign property.
		 */
		_applyTextAlign: function (value, old) {
			this.getChildControl("textfield").setTextAlign(value);
		},

		/**
		 * Applies the maxLength property.
		 */
		_applyMaxLength: function (value, old) {
			this.getChildControl("textfield").setMaxLength(value);
		},

		/**
		 * Applies the selectOnEnter property.
		 */
		_applySelectOnEnter: function (value, old) {

			if (value && !old) {
				this.addListener("focusin", function (e) {
					if (this.isSelectOnEnter()) {
						qx.event.Timer.once(this.selectAllText, this, 1);
					}
				}, this);
			}
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
		 * Applies the spellCheck property.
		 */
		_applySpellCheck: function (value, old) {
			var el = this.__getTextFieldElement();
			if (el) {
				el.setAttribute("spellcheck", value ? "true" : "false");
			}
		},

		/**
		 * Applies the characterCasing property.
		 */
		_applyCharacterCasing: function (value, old) {

			var el = this.__getTextFieldElement();
			var transform = null;
			switch (value) {
				case "upper":
					transform = "uppercase";
					break;
				case "lower":
					transform = "lowercase";
					break;
				case "capitalize":
					transform = "capitalize";
					break;
			}
			el.setStyle("textTransform", transform);
		},

		/**
		 * Applies the capitalization defined in the @characterCasing property.
		 */
		_applyTextTransform: function (text) {

			if (text) {
				switch (this.getCharacterCasing()) {

					case "upper": return text.toUpperCase();
					case "lower": return text.toLowerCase();
					case "capitalize": return qx.lang.String.capitalize(text);
					default: return text;
				}
			}

			return text;
		},

		/** 
		 * Applies the tools property.
		 */
		_applyTools: function (value, old) {

			if (value == null)
				return;

			if (value.length == 0 && (old == null || old.length == 0))
				return;

			wisej.web.ToolContainer.install(this, this, value, "left", { index: 0 }, null, "editor");
			wisej.web.ToolContainer.install(this, this, value, "right", { index: -1 }, null, "editor");
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

				if (this.isSelectOnEnter())
					this.selectAllText();

				qx.event.Timer.once(this.focus, this, 0);
			}
		},

		/**
		 * Event handler for the native "copy" event.
		 */
		_onNativeCopy: function (e) {

			this.fireEvent("copy");
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

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "textfield":
					control = this.__createInnerTextField();
					control.setFocusable(false);
					control.addState("inner");
					control.setMinWidth(1);
					control.setMinHeight(1);

					this._add(control, { flex: 1 });
					break;
			}

			return control || this.base(arguments, id);
		},

		__createInnerTextField: function () {

			return new qx.ui.form.TextField();
		},

		__getTextFieldElement: function () {

			return this.getChildControl("textfield").getContentElement();
		},

		// forward the "changeValue" event.
		__onTextFieldChangeValue: function (e) {

			this.setDirty(true);
			this.fireDataEvent("changeValue", e.getData(), e.getOldData());
		},

		// forward the "input" event.
		__onTextFieldInput: function (e) {

			this.setDirty(true);
			this.fireDataEvent("input", e.getData(), e.getOldData());

			if (e.getData() != e.getOldData())
				this.fireEvent("modified");
		},

		// checks whether the textbox has the focus.
		_isFocused: function () {
			return qx.ui.core.FocusHandler.getInstance().getFocusedWidget() === this;
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
		 * Returns the target for the accessibility properties.
		 */
		getAccessibilityTarget: function () {
			return this.getChildControl("textfield");
		},

		/*---------------------------------------------------------------------------
		  qx.ui.core.MContentPadding
		---------------------------------------------------------------------------*/

		_getContentPaddingTarget: function () {
			return this.getChildControl("textfield");
		},

		/*---------------------------------------------------------------------------
		  focus redirection overrides
		---------------------------------------------------------------------------*/

		tabFocus: function () {

			var textField = this.getChildControl("textfield");
			textField.getFocusElement().focus();

			if (this.getAllowTextSelection())
				textField.selectAllText();
		},

		focus: function () {

			this.getChildControl("textfield").getFocusElement().focus();
		},

		/*---------------------------------------------------------------------------
		  qx.ui.form.IStringForm implementation
		---------------------------------------------------------------------------*/

		setValue: function (value) {

			value = this._applyTextTransform(value);

			var textField = this.getChildControl("textfield");
			if (textField.getValue() === value)
				return;

			if (this._isFocused() && this.getAllowTextSelection()) {
				var selectAll, selStart, selEnd;
				selEnd = textField.getTextSelectionEnd();
				selStart = textField.getTextSelectionStart();
				selectAll = selStart < 1 && value && value.length <= selEnd;

				textField.setValue(value);

				if (selectAll)
					textField.selectAllText();
				else
					textField.setTextSelection(selStart, selEnd);
			}
			else {
				textField.setValue(value);
			}
		},
		getValue: function () {

			return  this._applyTextTransform(this.getChildControl("textfield").getValue());

		},
		resetValue: function () {

			this.getChildControl("textfield").setValue(null);
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
			if (this.getAllowTextSelection())
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
			if (this.getAllowTextSelection())
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
			if (this.getAllowTextSelection())
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
			if (this.getAllowTextSelection())
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
			if (this.getAllowTextSelection())
				this.getChildControl("textfield").setTextSelection(start, end);
		},


		/**
		 * Clears the current selection.
		 * This method only works if the widget is already created and
		 * added to the document.
		 *
		 */
		clearTextSelection: function () {
			if (this.getAllowTextSelection())
				this.getChildControl("textfield").clearTextSelection();
		},


		/**
		 * Selects the whole content
		 *
		 */
		selectAllText: function () {
			if (this.getAllowTextSelection())
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

	}

});


/**
 * wisej.web.TextBox
 */
qx.Class.define("wisej.web.TextBox", {

	extend: wisej.web.TextBoxBase,

	properties: {

		/**
		 * InputType property.
		 *
		 * Specifies the type, min, max and step properties to associate to the &lt;input&gt; element.
		 */
		inputType: { init: null, nullable: true, check: "Map", apply: "_applyInputType" },

		/**
		 * Checked property.
		 * 
		 * Works only when the TextBox is of type "checkbox" or "radio".
		 */
		checked: { init: false, check: "Boolean", apply: "_applyChecked", event: "changeChecked" },

		/**
		 * Filter property.
		 * 
		 * RegExp responsible for filtering the value of the textfield. the RegExp
		 * gives the range of valid values.
		 * The following example only allows digits in the textfield.
		 * <pre class='javascript'>field.setFilter(/[0-9]/);</pre>
		 */
		filter: { init: null, check: "String", nullable: true, apply: "_applyFilter", transform:"_transformFilter" }

	},

	members: {

		/** listener for the native "change" event. */
		__onNativeChangeListener: null,

		/**
		 * Applies the inputType property.
		 */
		_applyInputType: function (value, old) {

			var textField = this.getChildControl("textfield");
			var el = textField.getContentElement();
			var dom = el.getDomElement();

			if (old) {

				if (this.__onNativeChangeListener)
					qx.bom.Event.removeNativeListener(dom, "change", this.__onNativeChangeListener);

				this.removeState(old.type);
				this.setAllowTextSelection(true);
				this.__onNativeChangeListener = null;
			}

			if (value) {

				el.setAttribute("min", value.min);
				el.setAttribute("max", value.max);
				el.setAttribute("step", value.step);
				el.setAttribute("type", qx.lang.String.hyphenate(value.type));

				this.addState(value.type);

				switch (value.type) {

					case "radio":
					case "checkbox":
					case "date":
					case "color":
					case "button":
					case "month":
					case "range":
					case "time":
					case "datetimeLocal":
						this.setAllowTextSelection(false);

						this.__onNativeChangeListener =
							this.__onNativeChangeListener || qx.lang.Function.listener(this.__onNativeChange, this);

						if (dom)
							qx.bom.Event.addNativeListener(target, "change", this.__onNativeChangeListener);
						else
							this.addListenerOnce("appear", this.__onCheckTextBoxAppear, this);
						break;
				}
			}
		},

		__onCheckTextBoxAppear: function (e) {

			// sync the checked status of the native checkbox or radio input.
			var textField = this.getChildControl("textfield");
			var dom = textField.getContentElement().getDomElement();
			if (dom && this.__onNativeChangeListener) {
				dom.checked = this.isChecked();
				qx.bom.Event.addNativeListener(dom, "change", this.__onNativeChangeListener);
			}
		},

		__onNativeChange: function (e) {

			this.setDirty(true);
			this.fireDataEvent("changeValue", this.getValue());

			// update the checked property when the user checks the native checkbox or radio input.
			var textField = this.getChildControl("textfield");

			var dom = textField.getContentElement().getDomElement();
			if (dom) {
				this.setChecked(dom.checked);
			}
		},

		/**
		 * Applies the Checked property.
		 */
		_applyChecked: function (value, old) {

			var textField = this.getChildControl("textfield");
			var dom = textField.getContentElement().getDomElement();
			if (dom)
				dom.checked = value === true;
		},

		/**
		 * Applies the Filter property.
		 */
		_applyFilter: function (value, old) {

			this.getChildControl("textfield").setFilter(value);
		},
		_transformFilter: function (value) {
			if (value)
				return new RegExp(value);
			else
				return null;
		}
	}
});


/**
 * wisej.web.TextArea
 */
qx.Class.define("wisej.web.TextArea", {

	extend: wisej.web.TextBoxBase,

	construct: function () {

		this.base(arguments);

		this.addState("multiline");

		// stop Enter from adding newlines to the text area.
		this.addListener("keypress", this._onKeyPress);
	},

	properties: {

		/** 
		 * Wrap property.
		 *
		 * Controls whether text wrap is activated or not.
		 */
		wrap: { init: false, check: "Boolean", apply: "_applyWrap" },

		/** 
		 * AcceptsReturn property.
		 *
		 * true if the ENTER key creates a new line of text in a multiline version of the control; false if the ENTER key activates the default button for the form.
		 */
		acceptsReturn: { init: false, check: "Boolean", apply: "_applyAcceptsReturn" },

		/** 
		 * AcceptsTab property.
		 *
		 * true if users can enter tabs in a multiline text box using the TAB key; false if pressing the TAB key moves the focus.
		 */
		acceptsTab: { init: false, check: "Boolean", apply: "_applyAcceptsTab" },

		/**
		 * Determines which scrollbars should be visible: 0 = None, 1 = Horizontal, 2 = Vertical, 3 = Both, 4 = Hidden.
		 */
		scrollBars: { init: 3, check: "PositiveInteger", apply: "_applyScrollBars" }
	},

	members: {

		/**
		 * Applies the wrap property.
		 */
		_applyWrap: function (value, old) {

			var el = this.__getTextFieldElement();
			el.setWrap(value);
		},

		/**
		 * Applies the scrollBar property.
		 */
		_applyScrollBars: function (value, old) {

			var el = this.__getTextFieldElement();
			el.setStyle("overflowY", (value & wisej.web.ScrollableControl.VERTICAL_SCROLLBAR) ? "auto" : "hidden");
			el.setStyle("overflowX", (value & wisej.web.ScrollableControl.HORIZONTAL_SCROLLBAR) ? "auto" : "hidden");
		},

		__createInnerTextField: function () {

			return new qx.ui.form.TextArea().set({
				allowGrowY: true
			});
		},

		/**
		 * Applies the AcceptsReturn property.
		 */
		_applyAcceptsReturn: function (value, old) {

			if (old) {
				qx.event.Registration.removeListener(document.body, "keydown", this.__onDocumentAcceptsReturn, this, true);
			}

			if (value) {
				// register the document level handlers to override shortcuts.
				qx.event.Registration.addListener(document.body, "keydown", this.__onDocumentAcceptsReturn, this, true);
			}
		},

		/**
		 * Applies the AcceptsTab property.
		 */
		_applyAcceptsTab: function (value, old) {

			if (old) {
				qx.event.Registration.removeListener(document, "keydown", this.__onDocumentAcceptsTab, this, true);
				qx.event.Registration.removeListener(document, "keypress", this.__onDocumentAcceptsTab, this, true);
			}

			if (value) {
				// register the document level handlers to override shortcuts.
				qx.event.Registration.addListener(document, "keydown", this.__onDocumentAcceptsTab, this, true);
				qx.event.Registration.addListener(document, "keypress", this.__onDocumentAcceptsTab, this, true);
			}
		},

		// handles "keydown" to stop Enter from adding newlines to the text area.
		_onKeyPress: function (e) {

			switch (e.getKeyIdentifier()) {

				case "Enter":
					if (!this.getAcceptsReturn() && e.getModifiers() === 0) {
						e.preventDefault();
					}
					break;
			}
		},

		/**
		 * Event handler for the "keydown" and "keypress" event at the document level. 
		 * Needed when the TextArea has the AcceptsReturn and AcceptsTab property set to true.
		 * 
		 * @param {qx.event.type.KeySequence} e The event data.
		 */
		__onDocumentAcceptsReturn: function (e) {

			// verify the event was meant for this instance.
			if (e.getTarget() !== this.__getTextFieldElement().getDomElement())
				return;

			switch (e.getKeyIdentifier()) {

				case "Enter":
					if (this.getAcceptsReturn() && e.getModifiers() === 0) {
						this.__insert("\r\n");
						e.stop();
					}
					break;
			}
		},

		/**
		 * Event handler for the "keydown" and "keypress" event at the document level. 
		 * Needed when the TextArea has the AcceptsReturn and AcceptsTab property set to true.
		 * 
		 * @param {qx.event.type.KeySequence} e The event data.
		 */
		__onDocumentAcceptsTab: function (e) {

			// verify the event was meant for this instance.
			if (e.getTarget() !== this.__getTextFieldElement().getDomElement())
				return;

			switch (e.getKeyIdentifier()) {

				case "Tab":
					if (this.getAcceptsTab()) {
						var modifiers = e.getModifiers();
						if (modifiers === 0) {

							// insert the \t character.
							if (e.getType() === "keydown") {
								this.__insert("\t");
							}

							e.stop();
						}
						else if (modifiers === qx.event.type.Dom.SHIFT_MASK) {

							if (e.getType() === "keypress")
								qx.ui.core.FocusHandler.getInstance().focusNext(this);

							e.stop();
						}
					}
					break;
			}
		},

		// inserts the specified characters at the current position.
		__insert: function (characters) {

			var textField = this.getChildControl("textfield");
			var value = textField.getValue();
			var end = textField.getTextSelectionEnd();
			var start = textField.getTextSelectionStart();

			value = value.substring(0, start) + characters + value.substring(end);
			textField.setValue(value);
			textField.setTextSelection(start + 1, start + 1);
		}
	},

	destruct: function () {

		// detach the document events.
		this.setAcceptsTab(false);
		this.setAcceptsReturn(false);
	}
});


/**
 * wisej.web.MaskedTextBox
 */
qx.Class.define("wisej.web.MaskedTextBox", {

	extend: wisej.web.TextBoxBase,

	construct: function () {

		this.base(arguments);

		this.addState("masked");

		// create the mask provider instance.
		this._createMaskProvider();
	},

	properties: {

		/**
		 * Mask property.
		 *
		 * Masking elements:
		 *
		 * 0 = Digit, required. This element will accept any single digit between 0 and 9.
		 * 9 = Digit or space, optional.
		 * # = Digit or space, optional. If this position is blank in the mask, it will be rendered as a space in the Text property. Plus (+) and minus (-) signs are allowed.
		 * L = Letter, required. Restricts input to the ASCII letters a-z and A-Z. This mask element is equivalent to [a-zA-Z] in regular expressions.
		 * ? = Letter, optional. Restricts input to the ASCII letters a-z and A-Z. This mask element is equivalent to [a-zA-Z]? in regular expressions.
		 * & = Character, required. If the AsciiOnly property is set to true, this element behaves like the "L" element.
		 * C = Character, optional. Any non-control character. If the AsciiOnly property is set to true, this element behaves like the "?" element.
		 * A = Alphanumeric, required. If the AsciiOnly property is set to true, the only characters it will accept are the ASCII letters a-z and A-Z. This mask element behaves like the "a" element.
		 * a = Alphanumeric, optional. If the AsciiOnly property is set to true, the only characters it will accept are the ASCII letters a-z and A-Z. This mask element behaves like the "A" element.
		 * . = Decimal separator (localized).
		 * , = Group separator (localized).
		 * $ = Currency symbol (localized).
		 * < = Shift down. Converts all characters that follow to lowercase.
		 * > = Shift up. Converts all characters that follow to uppercase.
		 * | = Disable a previous shift up or shift down.
		 * \ = Escape. Escapes a mask character, turning it into a literal. "\\" is the escape sequence for a backslash.
		 * All other characters Literals = All non-mask elements will appear as themselves within MaskedTextBox. Literals always occupy a static position in the mask at run time, and cannot be moved or deleted by the user.
		 */
		mask: { init: "", check: "String", apply: "_applyMask" },

		/**
		 * The placeholder character to show in place of the mask. 
		 */
		prompt: { init: "_", check: "String", apply: "_applyPrompt" },

		/**
		 * When true, the prompt is removed when the field loses the focus.
		 */
		hidePrompt: { init: false, check: "Boolean", apply: "_applyHidePrompt" },

		/**
		 * InputType property.
		 *
		 * Specifies the type, min, max and step properties to associate to the &lt;input&gt; element.
		 */
		inputType: { init: null, nullable: true, check: "Map", apply: "_applyInputType" },

		/**
		 * Localization.
		 * 
		 * Defines the group separator, decimal separator and currency symbol in a map: {group, decimal, currency}.
		 */
		localization: { init: null, check: "Map", apply: "_applyLocalization" }
	},

	members: {

		// the mask provider implementation.
		__maskProvider: null,

		/**
		 * Overridden: Returns the masked value.
		 * 
		 * @param {Boolean} unmasked When true it returns the unmasked text. The default is false.
		 * @returns {String} String value in the text box.
		 */
		getValue: function (unmasked) {

			var value = this.base(arguments);

			if (unmasked === true) {
				return this.__maskProvider.mask(value, false, false);
			}
			else {
				var keepLiterals = this.hasState("celleditor");
				return this.__maskProvider.mask(value, false /*keepPrompt*/, keepLiterals);
			}
		},

		/**
		 * Overridden: Sets the masked value to the input element.
		 */
		setValue: function (value) {

			var keepPrompt = this._isFocused() || !this.getHidePrompt() || wisej.web.DesignMode;
			value = this.__maskProvider.mask(value, keepPrompt, true /*keepLiterals*/);

			this.base(arguments, value);
		},

		/**
		 * Overridden. Selects the full text when gaining the focus by tabbing in.
		 */
		tabFocus: function () {

			this.__maskProvider.processFocus();
			this.base(arguments);
		},

		/**
		 * Creates the mask provider instance. It's overridable to
		 * assign a customized mask provider.
		 */
		_createMaskProvider: function () {

			if (this.__maskProvider == null) {
				this.__maskProvider = new wisej.utils.MaskProvider(this.getChildControl("textfield"));
				this.__maskProvider.setPrompt(this.getPrompt());
				this.__maskProvider.setHidePrompt(this.getHidePrompt());
			}
		},

		/**
		 * Applies the mask property.
		 *
		 * Sets the current edit mask and updates the existing text.
		 */
		_applyMask: function (value, old) {

			var text = this.getValue(true);
			this.__maskProvider.setMask(value);
			this.setValue(text);

		},

		/**
		 * Applies the prompt property.
		 *
		 * Sets the character to show as a prompt in place of the mask characters.
		 */
		_applyPrompt: function (value, old) {

			this.__maskProvider.setPrompt(value);

		},

		/**
		 * Applies the hidePrompt property.
		 */
		_applyHidePrompt: function (value, old) {

			this.__maskProvider.setHidePrompt(value);

		},

		/**
		 * Applies the localization property
		 */
		_applyLocalization: function (value, old) {

			var text = this.getValue(true);
			this.__maskProvider.setLocalization(value);
			this.setValue(text);

		},

		/**
		 * Applies the inputType property.
		 */
		_applyInputType: function (value, old) {
			if (value) {
				var el = this.getChildControl("textfield").getContentElement();

				el.setAttribute("type", qx.lang.String.hyphenate(value.type));

				el.setAttribute("min", value.min);
				el.setAttribute("max", value.max);
				el.setAttribute("step", value.step);
			}
		}
	},

	destruct: function () {

		this._disposeObjects("__maskProvider");
	}


});