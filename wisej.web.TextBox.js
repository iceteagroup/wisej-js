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
		qx.ui.form.MForm
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

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["value", "selection"]));

		// any action on the textbox marks it as dirty to update the state on the server
		// also when the selection and the caret have changed.
		this.addListener("keydown", function (e) { this.setDirty(true); }, this);
		this.addListener("mousedown", function (e) { this.setDirty(true); }, this);

		// forward the focusin and focusout events to the textfield. The textfield
		// is not focusable so the events need to be forwarded manually.
		this.addListener("focusin", this.__onFocusIn, this);
		this.addListener("focusout", this.__onFocusOut, this);

		// hovered event handlers.
		this.addListener("pointerover", this._onPointerOver);
		this.addListener("pointerout", this._onPointerOut);

		var textField = this.getChildControl("textfield");
		textField.addListener("changeValue", function (e) {
			this.setDirty(true);
			this.fireDataEvent("changeValue", e.getData(), e.getOldData());
		}, this);

		// attach the native event "oncopy" to update the clipboard on the server.
		this.__getTextFieldElement().addListener("copy", function (e) { this.fireEvent("copy"); }, this);

		// enable the native context menu by default.
		this.setNativeContextMenu(true);

		// rightToLeft support.
		this.addListener("changeRtl", function (e) { this._mirrorChildren(e.getData()); }, this);
	},

	events: {
		/**
		 * The event is fired each time the text field looses focus and the
		 * text field values has changed.
		 *
		 * If you change {@link #liveUpdate} to true, the changeValue event will
		 * be fired after every keystroke and not only after every focus loss. In
		 * that mode, the changeValue event is equal to the {@link #input} event.
		 *
		 * The method {@link qx.event.type.Data#getData} returns the
		 * current text value of the field.
		 */
		"changeValue": "qx.event.type.Data"
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

	},

	members: {

		// forwarded states.
		_forwardStates: {
			focused: true,
			invalid: true
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
			var textField = this.getChildControl("textfield");
			textField.setReadOnly(value);
			textField.setFocusable(false);
		},

		/**
		 * Applies the autoComplete property.
		 */
		_applyAutoComplete: function (value, old) {

			var textField = this.getChildControl("textfield");
			textField.getContentElement().setAttribute("autocomplete", value == "default" ? null : value);
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
		 * Applies the nativeContextMenu property.
		 */
		_applyNativeContextMenu: function (value, old) {

			if (this.hasChildControl("textfield"))
				this.getChildControl("textfield").setNativeContextMenu(value);
		},

		/**
		 * Applies the spellCheck property.
		 */
		_applySpellCheck: function (value, old) {
			var el = this.__getTextFieldElement();
			el.setAttribute("spellcheck", value ? "true" : "false");
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
		 * Applies the tools property.
		 */
		_applyTools: function (value, old) {

			if (value == null)
				return;

			if (value.length == 0 && (old == null || old.length == 0))
				return;

			wisej.web.ToolContainer.install(this, this, value, "left", { index: 0 });
			wisej.web.ToolContainer.install(this, this, value, "right", { index: -1 });
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

		// forward the "focus" event and 
		// focus the inner textfield when gaining the focus, otherwise the editable
		// textfield doesn't get the focus when clicking close or on the border.
		__onFocusIn: function (e) {

			var textField = this.getChildControl("textfield");
			if (textField.isVisible()) {

				textField.fireNonBubblingEvent("focusin", qx.event.type.Focus);

				if (textField != qx.ui.core.Widget.getWidgetByElement(e.getOriginalTarget()))
					textField.getContentElement().focus();
			}
		},

		// forward the "blur" event.
		__onFocusOut: function (e) {

			var textField = this.getChildControl("textfield");
			textField.fireNonBubblingEvent("focusout", qx.event.type.Focus);
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

		/*---------------------------------------------------------------------------
		  focus redirection overrides
		---------------------------------------------------------------------------*/

		tabFocus: function () {

			var textField = this.getChildControl("textfield");
			textField.getFocusElement().focus();
			textField.selectAllText();
		},

		focus: function () {

			this.getChildControl("textfield").getFocusElement().focus();
		},

		/*---------------------------------------------------------------------------
		  qx.ui.form.IStringForm implementation
		---------------------------------------------------------------------------*/

		setValue: function (value) {

			var oldValue = this.getValue();
			this.getChildControl("textfield").setValue(value);
			this.fireDataEvent("changeValue", value, oldValue);
		},
		getValue: function () {

			return this.getChildControl("textfield").getValue();
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

	},

	members: {

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

		// handles "Enter" and "Tab" according to the acceptsReturn and acceptsTab properties.
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
		acceptsReturn: { init: false, check: "Boolean" },

		/** 
		 * AcceptsTab property.
		 *
		 * true if users can enter tabs in a multiline text box using the TAB key; false if pressing the TAB key moves the focus.
		 */
		acceptsTab: { init: false, check: "Boolean" },

		/**
		 * Determines which scrollbars should be visible: 1 = Horizontal, 2 = Vertical, 3 = Both.
		 */
		scrollBars: { init: 3, check: "PositiveInteger", apply: "_applyScrollBars" },
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

			return new qx.ui.form.TextArea();
		},

		_onKeyPress: function (e) {

			var modifiers = e.getModifiers();
			if (modifiers == 0) {

				var identifier = e.getKeyIdentifier();
				switch (identifier) {
					case "Enter":
						if (this.getAcceptsReturn())
							e.stopPropagation();
						break;

					case "Tab":
						if (this.getAcceptsTab())
							e.stopPropagation();
						break;
				}
			}
		},
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
		this.__maskProvider = this._createMaskProvider();
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
	},

	members: {

		// the mask provider implementation.
		__maskProvider: null,

		/**
		 * Overridden: Returns the unmasked value from the input element.
		 */
		getValue: function () {

			return this.__maskProvider.getValue(false);

		},

		/**
		 * Overridden: Sets the masked value to the input element.
		 */
		setValue: function (value) {

			this.setDirty(true);
			var oldValue = this.getValue();
			this.__maskProvider.setValue(value, true);
			this.fireDataEvent("changeValue", value, oldValue);
		},

		/**
		 * Creates the mask provider instance. It's overridable to
		 * assign a customized mask provider.
		 */
		_createMaskProvider: function () {

			return new wisej.utils.MaskProvider(this.getChildControl("textfield"));
		},

		/**
		 * Applies the mask property.
		 *
		 * Sets the current edit mask and updates the existing text.
		 */
		_applyMask: function (value, old) {

			this.__maskProvider.setMask(value);

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
		},
	},

	destruct: function () {

		this._disposeObjects("__maskProvider");
	}


});