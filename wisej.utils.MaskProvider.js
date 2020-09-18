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

			// attach clipboard handler.
			textfield.addListener("input", this.processClipboard, this);

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
		 * & = Character, required. This element behaves like the "L" element.
		 * C = Character or space. Any non-control character. This element behaves like the "?" element.
		 * A = Alphanumeric, required. The only characters it will accept are the ASCII letters a-z and A-Z. This mask element behaves like the "a" element.
		 * a = Alphanumeric or space. The only characters it will accept are the ASCII letters a-z and A-Z. This mask element behaves like the "A" element.
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
		localization: { init: null, check: "Map", apply: "_applyLocalization" }
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

		// integer array of flags indicating when the character in __maskChar is:
		//  0 = literal
		//	1 = mask
		//  2 = uppercase
		//  4 = lowercase
		__maskFlags: [],


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
				if (!this.__isLiteral(i))
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

			var pos = this.__textfield.getTextSelectionEnd();

			qx.event.Timer.once(function () {

				var value = this._getValue();
				this._setValue(this.mask(value));
				pos = this.__getNextInsertPosition(pos);
				this.__textfield.setTextSelection(pos, pos);

			}, this, 0);
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
			var prompt = this.getPrompt();
			var mchar = this.__transformChar(char, pos, prompt);
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
			for (var i = selection.start + selection.length; i < value.length && i < this.__maskChars.length; i++) {
				if (!this.__isLiteral(i))
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
			var length = this.__textfield.getTextSelectionLength();
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
				pos = -1,
				result = "",
				literals = "",
				textLength = text.length,
				prompt = this.getPrompt(),
				maskLength = this.__maskChars.length;
	
			keepPrompt = keepPrompt !== false;
			keepLiterals = keepLiterals !== false;

			pos = 0;
			text = text.substr(0, maskLength);
			for (var i = 0; i < textLength && pos < maskLength;) {

				c = text[i];

				if (this.__isLiteral(pos)) {

					// if the mask is a literal, collect the literal to add it 
					// as soon as we get a mask match.
					if (keepLiterals)
						literals += this.__maskChars[pos];

					if (c == this.__maskChars[pos])
						i++;

					// advance the mask.
					pos++;
				}
				else {

					var mchar = this.__transformChar(c, pos, prompt);
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
						pos++;
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
							pos++;
						}
						else {

							// otherwise, see if the input char matches a mask literal
							// ahead in the list.
							var skipTo = this.__maskChars.indexOf(c, pos);
							if (skipTo > -1 && this.__isLiteral(skipTo)) {

								for (;pos > -1 && pos < skipTo; pos++) {

									if (!this.__isLiteral(pos))
										result += keepPrompt ? prompt : " ";
								}

								// add to the result and advance the mask.
								result += c;
								pos++;
							}
						}
					}
				}
			}

			// complete the result with the remainder of the mask.

			result += literals;
			literals = "";

			for (; pos < maskLength; pos++) {

				if (this.__isLiteral(pos)) {
					if (keepLiterals)
						result += this.__maskChars[pos];
				}
				else {
					result += keepPrompt ? prompt : " ";
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
		 * Applies the localization property.
		 */
		_applyLocalization: function (value, old) {

			if (value || old)
				this._applyMask(this.getMask());
		},

		/**
		 * Applies the mask property.
		 *
		 * Splits the mask into an array of characters.
		 */
		_applyMask: function (value, old) {

			// parse the mask and detect the literals.
			var mask = [];
			var flags = [];

			if (value) {

				var flag = 0;
				var literal = false;
				var localization = this.getLocalization();

				for (var i = 0; i < value.length; i++) {

					var c = value[i];

					switch (c) {

						case "\\": // escape next char into a literal.
							if (literal)
								break;

							literal = true;
							continue;

						case ">": // start uppercase mode
							flag = 2; // uppercase
							continue;

						case "<": // start lowercase mode.
							flag = 4; // uppercase
							continue;

						case "|": // end lower or upper case mode.
							flag = 0;
							continue;

						case ".":
							literal = true;
							c = localization
								? localization.decimal
								: qx.locale.Number.getDecimalSeparator();
							break;

						case ",":
							literal = true;
							c = localization
								? localization.group
								: qx.locale.Number.getGroupSeparator();
							break;

						case "$":
							literal = true;
							c = localization
								? localization.currency
								: qx.locale.Number.getCurrencySymbol();
							break;
					}

					var isMaskChar = (!literal && this.__regexp[c] != null)
					literal = false;

					mask.push(c);
					flags.push(flag | isMaskChar ? 1 : 0);
				}
			}

			this.__maskChars = mask;
			this.__maskFlags = flags;
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
			this.__textfield.__oldInputValue = value;
		},

		// returns the next valid insert position in the mask.
		__getNextInsertPosition: function (pos) {

			for (var i = pos; i < this.__maskChars.length; i++) {
				if (!this.__isLiteral(i)) {
					pos = i;
					break;
				}
			}

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
					mask != null && (this.__isLiteral(pos) || text[pos] !== prompt);
					mask = this.__maskChars[++pos]);

				length = Math.max(0, length - (pos - length));
			}

			return {
				start: pos,
				end: pos + length
			};
		},

		// applies the current mask transformation to the char.
		__transformChar: function (c, index, prompt) {

			if (!c || c === prompt || c === " " || index >= this.__maskChars.length)
				return null;		

			if (this.__isLiteral(index)) {
				c = this.__maskChars[index];
			}
			else {
				var rx = this.__regexp[this.__maskChars[index]];
				if (rx) {
					// test the input char against the mask char. 
					if (!rx.test(c))
						c = null;
				}
			}

			if (c != null) {
				if (this.__isLowercase(index))
					c = c.toLowerCase();
				else if (this.__isUppercase(index))
					c = c.toUpperCase();
			}

			return c;
		},

		// checks if the mask character at index is a mask.
		__isMask: function (index) {

			return (this.__maskFlags[index] & 1) === 1;
		},

		// checks if the mask character at index is a literal.
		__isLiteral: function (index) {

			return (this.__maskFlags[index] & 1) !== 1;
		},

		// checks if the mask character at index must be converted to uppercase.
		__isUppercase: function (index) {

			return (this.__maskFlags[index] & 2) === 2;
		},

		// checks if the mask character at index must be converted to lowercase.
		__isLowercase: function (index) {

			return (this.__maskFlags[index] & 4) === 4;
		},

		// handles changes to the readOnly property
		// and store it locally - this code needs to check it on every keystroke.
		_onChangeReadOnly: function (e) {
			this.__isReadOnly = e.getData();
		}

	}

});
