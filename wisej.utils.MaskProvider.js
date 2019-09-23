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
 * wisej.utils.MaskProvider
 * 
 * Provides edit mask services to controls that implement masked editing.
 */
qx.Class.define("wisej.utils.MaskProvider", {

	extend: qx.core.Object,

	construct: function (textfield, mask) {

		this.base(arguments, true /* weak */);

		if (mask)
			this.setMask(mask);

		this.__regexp = wisej.utils.MaskProvider.__regexp;

		if (textfield instanceof qx.ui.form.AbstractField) {

			this.__textfield = textfield;

			// attach our event handlers.
			textfield.addListener("focusin", this.processFocus, this);
			textfield.addListener("focusout", this.processBlur, this);
			textfield.addListener("keypress", this.processKeyPress, this);
			textfield.addListener("keyinput", this.processKeyInput, this);

			// attach clipboard handlers.
			textfield.getContentElement().addListener("cut", this.processClipboard, this);
			textfield.getContentElement().addListener("paste", this.processClipboard, this);

			// detect when the field becomes read-only.
			textfield.addListener("changeReadOnly", this._onChangeReadOnly, this);
		}
	},

	statics: {

		/**
		 * Regular expressions for each mask character.
		 */
		__regexp: {

			"0": /[0-9]/,
			"9": /[0-9\s]/,
			"#": /[0-9\s\+-]/,
			"L": /[a-zA-Z]/,
			"?": /[a-zA-Z\s]/,
			"&": /./,
			"C": /(.|\s)/,
			"A": /[0-9a-zA-Z]/,
			"a": /[0-9a-zA-Z\s]/,
			"ascii": /[a-zA-Z]/
		}
	},

	properties: {

		/**
		 * Mask property.
		 *
		 * Masking elements:
		 *
		 * 0 = Digit, required. This element will accept any single digit between 0 and 9.
		 * 9 = Digit or space.
		 * # = Digit or space or +- sign.
		 * L = Letter, required. Restricts input to the ASCII letters a-z and A-Z. This mask element is equivalent to [a-zA-Z] in regular expressions.
		 * ? = Letter or space. Restricts input to the ASCII letters a-z and A-Z. This mask element is equivalent to [a-zA-Z]? in regular expressions.
		 * & = Character, required. If the AsciiOnly property is set to true, this element behaves like the "L" element.
		 * C = Character or space. Any non-control character. If the AsciiOnly property is set to true, this element behaves like the "?" element.
		 * A = Alphanumeric, required. If the AsciiOnly property is set to true, the only characters it will accept are the ASCII letters a-z and A-Z. This mask element behaves like the "a" element.
		 * a = Alphanumeric or space. If the AsciiOnly property is set to true, the only characters it will accept are the ASCII letters a-z and A-Z. This mask element behaves like the "A" element.
		 * < = Shift down. Converts all characters that follow to lowercase.
		 * > = Shift up. Converts all characters that follow to uppercase.
		 * | = Disable a previous shift up or shift down.
		 * \ = Escape. Escapes a mask character, turning it into a literal. "\\" is the escape sequence for a backslash.
		 * . = Localized decimal separator.
		 * , = Localized group separator.
		 * $ = Localized currency symbol.
		 * All other characters Literals = All non-mask elements will appear as themselves within MaskedTextBox. Literals always occupy a static position in the mask at run time, and cannot be moved or deleted by the user.
		 */
		mask: { init: "", check: "String", apply: "_applyMask" },

		/**
		 * The placeholder character to show in place of the mask. 
		 */
		prompt: { init: "_", check: "String", apply: "_applyPrompt", transform:"_transformPrompt" },

		/**
		 * When true, the prompt is hidden when the textfield loses the focus.
		 */
		hidePrompt: { init: true, check: "Boolean", apply: "_applyHidePrompt" },

		/**
		 * Localization.
		 * 
		 * Defines the group separator, decimal separator and currency symbol in a map: {group, decimal, currency}.
		 */
		localization: { init: null, check: "Map" }
	},

	members: {

		// textfield associated to this mask provider.
		__textfield: null,

		// convenience reference to the static __regexp.
		__regexp: null,

		// keeps track of the cursor position in the text.
		__caretPosition: null,

		// the mask split in a char array.
		__maskChars: [],

		// read-only flag.
		__isReadOnly: false,

		/**
		 * processKeyPress.
		 *
		 * Handles Backspace and Delete keys in the masked edit control.
		 */
		processKeyPress: function (e) {

			if (this.__maskChars.length === 0 || this.__isReadOnly)
				return;

			var direction = 0;
			var key = e.getKeyIdentifier();
			switch (key) {

				case "Backspace":
					direction = -1;
					break;

				case "Delete":
					direction = 0;
					break;

				case "Home":
					if (e.getModifiers() === 0) {
						var pos = this.__getNextInsertPosition(0);
						this.__textfield.setTextSelection(pos, pos);
						e.stop();
					}
					return;

				case "End":
					if (e.getModifiers() === 0) {
						var pos = this.__adjustTextSelection(0, 0).start;
						this.__textfield.setTextSelection(pos, pos);
						e.stop();
					}
					return;

				default:
					return;
			}

			// read the value in the textfield without unmasking.
			var value = this._getValue();

			// read the caret position and selection.
			var selection = {
				start: this.__textfield.getTextSelectionStart(),
				length: this.__textfield.getTextSelectionLength()
			};

			// if some text is selected, Backspace and Delete act the same way.
			if (selection.length > 0)
				direction = 0;
			else
				selection.start += direction;

			// don't delete anything if Backspace was pressed at position 0.
			if (selection.start < 0)
				return;

			// delete the character(s) to the left or right of the caret.
			selection.length = selection.length == 0 ? 1 : selection.length;

			// delete selection and all trailing literals or the mask code may use them as valid input.
			var mask = this.__maskChars;
			var text = value.substr(0, selection.start);
			for (var i = selection.start + selection.length; i < value.length && i < mask.length; i++) {
				if (this.__isMaskChar(mask[i]))
					text += value[i];
			}

			// update the textfield.
			this._setValue(this.mask(text, true, true));

			// move the caret position.
			var pos = selection.start;
			this.__textfield.setTextSelection(pos, pos);

			e.preventDefault();
		},

		/**
		 * processClipboard.
		 *
		 * Handles Cut, Copy and Paste from the contextual menu and the keyboard.
		 */
		processClipboard: function (e) {

			if (this.__maskChars.length === 0 || this.__isReadOnly)
				return;

			var type = e.getType();
			var value = this._getValue();
			switch (type) {

				case "cut":
				case "paste":
					this._setValue(this.mask(value));
					break;

				default:
					return;
			}
		},

		/**
		 * processKeyInput.
		 *
		 * Inserts typed characters in the masked edit control.
		 */
		processKeyInput: function (e) {

			if (this.__maskChars.length === 0 || this.__isReadOnly)
				return;

			e.preventDefault();

			// retrieve the typed character.
			var char = e.getChar();

			// read the value in the textfield without unmasking.
			var value = this._getValue();

			// read the caret position and selection.
			var selection = {
				start: this.__textfield.getTextSelectionStart(),
				length: this.__textfield.getTextSelectionLength()
			};

			// find the next mask position.
			var pos = this.__getNextInsertPosition(selection.start);

			// mask the char before applying the mask to the full text to
			// validate the single char.
			var mask = this.__maskChars;
			var prompt = this.getPrompt();
			var mchar = this.__transformChar(char, this.__maskChars[pos], prompt);
			if (!mchar) {

				// compare if the typed char matches the literal in the mask, advance one position.
				if (value[selection.start] === char) {
					this.__textfield.setTextSelection(selection.start + 1, selection.start + 1);
					return;
				}
				else if (" " === char) {
					mchar = this.getPrompt();
				}
				else {
					// TODO: if needed, we can fire a character rejected event here.
					return;
				}
			}

			// insert the typed character at the caret position and the trailing characters without literals.
			var text = value.substr(0, selection.start) + mchar;
			for (var i = selection.start + selection.length; i < value.length && i < mask.length; i++) {
				if (this.__isMaskChar(mask[i]))
					text += value[i];
			}

			// update the textfield.
			this._setValue(this.mask(text, true, true));

			// move the caret position to  the next editable mask position.
			pos = this.__getNextInsertPosition(pos + 1);
			this.__textfield.setTextSelection(pos, pos);
		},

		/**
		 * processFocus.
		 *
		 * Updates the masked text when the textfield gains the focus.
		 */
		processFocus: function (e) {

			if (this.__maskChars.length === 0)
				return;

			if (this.getHidePrompt())
				this._setValue(this.mask(this._getValue(), true, true));

			// adjust the selection.
			var start = this.__textfield.getTextSelectionStart();
			var lenght = this.__textfield.getTextSelectionLength();
			var selection = this.__adjustTextSelection(start, length);
			this.__textfield.setTextSelection(selection.start, selection.end);
		},

		/**
		 * processBlur.
		 *
		 * Updates the masked text when the textfield loses the focus.
		 */
		processBlur: function (e) {

			if (this.__maskChars.length === 0)
				return;

			if (this.getHidePrompt())
				this._setValue(this.mask(this._getValue(), false, true));
		},

		/**	
		 * mask.
		 *
		 * Applies the mask to the text.
		 */
		mask: function (text, keepPrompt, keepLiterals) {

			if (this.__maskChars.length === 0)
				return text;

			var c = "",
				mask = "",
				result = "",
				literals = "",
				isMask = false,
				textLength = text.length,
				prompt = this.getPrompt();

			keepPrompt = keepPrompt !== false;
			keepLiterals = keepLiterals !== false;

			mask = this.__getFirstMask();
			for (var i = 0; i < textLength;) {

				c = text[i];
				if (!mask)
					break;

				isMask = this.__isMaskChar(mask);
				if (!isMask) {

					// if the mask is a literal, collect the literal to add it 
					// as soon as we get a mask match.
					if (keepLiterals)
						literals += mask;

					// find the next matching character in the input to align the mask.
					var skipTo = text.indexOf(mask, i);
					if (skipTo > -1)
						i = skipTo + 1;

					mask = this.__getNextMask();
				}
				else {

					var mchar = this.__transformChar(c, mask, prompt);
					if (mchar) {

						// add pending literals first.
						result += literals;
						literals = "";

						if (keepPrompt && mchar === " ")
							mchar = prompt;

						// add the masked-transformed char.
						result += mchar;

						// move the input forward.
						i++;

						// advance the mask.
						mask = this.__getNextMask();
					}
					else {

						// add pending literals first.
						result += literals;
						literals = "";

						// skip the invalid input char.
						i++;

						// if the input char matches the prompt?
						if (c === prompt || c === " ") {

							result += keepPrompt ? prompt : " ";

							// advance the mask.
							mask = this.__getNextMask();
						}
						else {

							// otherwise, see if the input char matches a mask literal
							// ahead in the list.
							if (this.__maskChars.indexOf(c, this.__maskIndex) > -1) {

								for (; mask !== c; mask = this.__getNextMask()) {

									if (this.__isMaskChar(mask))
										result += keepPrompt ? prompt : " ";
								}

								// add to the result and advance the mask.
								result += c;
								mask = this.__getNextMask();
							}
						}
					}
				}
			}

			// complete the result with the remainder of the mask.

			result += literals;
			literals = "";

			for (; mask != null; mask = this.__getNextMask()) {

				if (mask) {
					if (this.__isMaskChar(mask)) {
						result += keepPrompt ? prompt : " ";
					}
					else if (keepLiterals) {
						result += mask;
					}
				}
			}

			return result.trimEnd();
		},

		/**
		 * Applies the prompt property.
		 */
		_applyPrompt: function (value, old) {

			if (!this.__textfield)
				return;

			// apply the new prompt to the existing text.
			this._applyHidePrompt(this.getHidePrompt());
		},

		// ensure we always have a 1 char prompt.
		_transformPrompt: function (value) {
			if (value !== " " && !value)
				return "_";
			else
				return value[0];
		},

		/**
		 * Applies the hidePrompt property.
		 */
		_applyHidePrompt: function (value, old) {

			if (!this.__textfield)
				return;

			if (value && !this.__textfield.hasState("focused"))
				this._setValue(this.mask(this._getValue(), false, true));
			else
				this._setValue(this.mask(this._getValue(), true, true));
		},

		/**
		 * Applies the mask property.
		 *
		 * Splits the mask into an array of characters.
		 */
		_applyMask: function (value, old) {

			// parse the mask.
			this.__maskChars = value
				? maskChars = value.split("")
				: [];
		},

		// returns the value from the input element.
		_getValue: function () {

			if (!this.__textfield)
				return null;

			return this.__textfield.getValue();
		},

		// sets the value in the input element.
		_setValue: function (value) {

			if (!this.__textfield)
				return;

			this.__textfield.setValue(value);
		},

		// returns the next valid insert position in the mask.
		__getNextInsertPosition: function (pos) {

			for (var mask = this.__maskChars[pos];
					mask != null && !this.__isMaskChar(mask);
						mask = this.__maskChars[++pos]);

			return pos;
		},

		// moves the cursor forward to the first available space in the text.
		__adjustTextSelection: function (start, length) {
			var text = this._getValue();
			var prompt = this.getPrompt();
			if (start === text.length)
				start = 0;

			var pos = start;
			if (pos === 0) {
				for (var mask = this.__maskChars[pos];
					mask != null && (!this.__isMaskChar(mask) || text[pos] !== prompt);
					mask = this.__maskChars[++pos]);

				length = Math.max(0, length - (pos - length));
			}

			return {
				start: pos,
				end: pos + length
			};
		},

		// resets all mask related state vars and
		// return the first mask character.
		__getFirstMask: function () {

			this.__maskIndex = -1;
			this.__escape = false;
			this.__uppercase = false;
			this.__lowercase = false;

			return this.__getNextMask();

		},

		// returns the next mask in the mask array and, if necessary, it changes
		// the case transformation state.
		__getNextMask: function () {

			if ((this.__maskIndex + 1) >= this.__maskChars.length)
				return null;

			var mask = this.__maskChars[++this.__maskIndex];

			// process the case and escape state.
			if (!this.__escape) {
				switch (mask) {

					case "<":
						this.__lowercase = true;
						this.__uppercase = false;
						return this.__getNextMask();

					case ">":
						this.__lowercase = false;
						this.__uppercase = true;
						return this.__getNextMask();

					case "|":
						this.__lowercase = false;
						this.__uppercase = false;
						return this.__getNextMask();

					case "\\":
						this.__escape = true;
						return this.__getNextMask();

					case ".":
						return this.getLocalization()
							? this.getLocalization().decimal
							: qx.locale.Number.getDecimalSeparator();

					case ",":
						return this.getLocalization()
							? this.getLocalization().group
							: qx.locale.Number.getGroupSeparator();

					case "$":
						return this.getLocalization()
							? this.getLocalization().currency
							: qx.locale.Number.getCurrencySymbol();
				}
			}

			return mask;
		},

		// applies the current mask transformation to the char.
		__transformChar: function (c, mask, prompt) {

			if (!c || c === prompt)
				return null;		

			if (this.__lowercase)
				c = c.toLowerCase();
			else if (this.__uppercase)
				c = c.toUpperCase();

			if (!this.__escape) {
				var rx = this.__regexp[mask];
				if (rx) {

					// test the input char against the mask char. 
					if (!rx.test(c))
						return null;
					else
						return c;
				}
			}
			this.__escape = false;

			// test the literal.
			if (c !== mask)
				return null;

			return c;
		},

		// checks if the character is a mask or a literal.
		__isMaskChar: function (c) {

			return !!(this.__regexp[c]);
		},

		// handles changes to the readOnly property
		// and store it locally - this code needs to check it on every keystroke.
		_onChangeReadOnly: function (e) {
			this.__isReadOnly = e.getData();
		}

	}

});
