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
 * Provides efdit mask services to controls that implement masked editing.
 */
qx.Class.define("wisej.utils.MaskProvider", {

	extend: qx.core.Object,

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
		 * All other characters Literals = All non-mask elements will appear as themselves within MaskedTextBox. Literals always occupy a static position in the mask at run time, and cannot be moved or deleted by the user.
		 */
		mask: { init: "", check: "String", apply: "_applyMask" },

		/**
		 * The placeholder character to show in place of the mask. 
		 */
		prompt: { init: "_", check: "String", apply: "_applyPrompt" },

		/**
		 * When true, the prompt is hidden when the textfield loses the focus.
		 */
		hidePrompt: { init: true, check: "Boolean", apply: "_applyHidePrompt" },
	},

	construct: function (textfield, mask) {

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
			"ascii": /[a-zA-Z]/,

		},

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

			if (this.__maskChars.length == 0 || this.__isReadOnly)
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

				default:
					return;
			}

			// read the value in the textfield without unmasking.
			var text = this.getValue(true);

			// read the caret position and selection.
			var selection = {
				start: this.__textfield.getTextSelectionStart(),
				length: this.__textfield.getTextSelectionLength()
			};

			// if some text is selected, Backspace and Delete act the same way.
			if (selection.length > 0)
				direction == 0;
			else
				selection.start += direction;

			// don't delete anything if Backspace was pressed at position 0.
			if (selection.start < 0)
				return;

			// delete the character(s) to the left or right of the caret.
			selection.length = selection.length == 0 ? 1 : selection.length;
			text =
				text.substr(0, selection.start)
				+ text.substr(selection.start + selection.length);

			// update the textfield.
			this.setValue(text);

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

			if (this.__maskChars.length == 0 || this.__isReadOnly)
				return;

			var type = e.getType();
			switch (type) {

				case "cut":
					break;
				case "paste":
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

			if (this.__maskChars.length == 0 || this.__isReadOnly)
				return;

			e.preventDefault();

			// retrieve the typed character.
			var char = e.getChar();

			// read the value in the textfield without unmasking.
			var text = this.getValue(true);

			// read the caret position and selection.
			var selection = {
				start: this.__textfield.getTextSelectionStart(),
				length: this.__textfield.getTextSelectionLength()
			};

			// find the next mask position.
			var position = this.__getNextInsertPosition(selection.start);

			// mask the char before applying the mask to the full text to
			// validate the single char.
			var mask = this.__maskChars[position];
			var mchar = this.__transformChar(char, mask);
			if (!mchar) {

				// compare if the typed char matches the literal in the mask, advance one position.
				if (text[selection.start] == char)
					this.__textfield.setTextSelection(selection.start + 1, selection.start + 1)

				// TODO: if needed, we can fire a character rejected event here.
				return;
			}

			// insert the typed character at the caret position.
			text =
				text.substr(0, position)
				+ mchar
				+ text.substr(position + selection.length);

			// update the textfield.
			this.setValue(text);

			// move the caret position to  the next editable mask position.
			var pos = this.__getNextInsertPosition(position + 1);
			this.__textfield.setTextSelection(pos, pos);
		},

		/**
		 * processFocus.
		 *
		 * Updates the masked text when the textfield gains the focus.
		 */
		processFocus: function (e) {

			if (this.__maskChars.length == 0)
				return;

			// update the masked value.
			this.setValue(this.getValue());
			var value = this.getValue();

			var me = this;
			setTimeout(function () {

				var field = me.__textfield;
				var selStart = me.__textfield.getTextSelectionStart();
				var selLength = me.__textfield.getTextSelectionLength();

				// if the field is empty, make sure the caret is at the first editable position.
				if (selLength == 0) {

					if (value.length == 0 || selStart == 0) {
						var pos = me.__getNextInsertPosition(0);
						field.setTextSelection(pos, pos);
					}
				}

			}, 1);
		},

		/**
		 * processBlur.
		 *
		 * Updates the masked text when the textfield loses the focus.
		 */
		processBlur: function (e) {

			if (this.__maskChars.length == 0)
				return;

			this.setValue(this.getValue());

		},

		/**
		 * unmask.
		 *
		 * Removes the mask from the text.
		 */
		unmask: function (text, options) {

			if (text == null || text.length == 0)
				return text;

			if (this.__maskChars.length == 0)
				return text;

			options = options || {};

			var c = "",
				mask = "",
				result = "",
				isMask = false,
				textLength = text.length,
				prompt = options.prompt == null ? this.getPrompt() : options.prompt;

			mask = this.__getFirstMask();
			for (var i = 0; i < textLength; i++) {

				c = text[i];
				if (!mask)
					break;

				if (options.keepPrompt || c != prompt) {

					isMask = this.__isMaskChar(mask);
					if (isMask && this.__transformChar(c, mask))
						result += c;
					else if (options.keepLiterals)
						result += c;
				}

				// advance the mask.
				mask = this.__getNextMask();
			}

			return result.trimEnd();
		},

		/**	
		 * mask.
		 *
		 * Applies the mask to the text.
		 */
		mask: function (text, options) {

			if (this.__maskChars.length == 0)
				return text;

			options = options || {};

			var c = "",
				mask = "",
				result = "",
				literals = "",
				isMask = false,
				textLength = text.length,
				maskLength = this.__maskChars.length,
				prompt = options.prompt == null ? this.getPrompt() : options.prompt;

			if (!options.keepPrompt)
				prompt = " ";

			mask = this.__getFirstMask();
			for (var i = 0; i < textLength;) {

				c = text[i];
				if (!mask)
					break;

				isMask = this.__isMaskChar(mask);
				if (!isMask) {

					// if the mask is a literal, collect the literal to add it 
					// as soon as we get a mask match.
					literals += mask;

					// find the next matching character in the input to align the mask.
					var skipTo = text.indexOf(mask, i);
					if (skipTo > -1)
						i = skipTo + 1

					mask = this.__getNextMask();
				}
				else {

					var mchar = this.__transformChar(c, mask);
					if (mchar) {

						// add pending literals first.
						result += literals;
						literals = "";

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

						// if the input char matches the prompt, add it as-is.
						if (c == prompt) {

							if (options.keepPrompt)
								result += prompt;

							// advance the mask.
							mask = this.__getNextMask();
						}
						else {

							// otherwise, see if the input char matches a mask literal
							// ahead in the list.
							if (this.__maskChars.indexOf(c, this.__maskIndex) > -1) {

								if (prompt) {
									for (; mask != null && mask != c; mask = this.__getNextMask()) {

										if (this.__isMaskChar(mask))
											result += prompt;
									}
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
						if (prompt)
							result += prompt;
					}
					else {
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

			if (this.__textfield == null)
				return;

			// apply the new prompt to the existing text.
			if (old) {

				var text = this.getValue(true);
				text = this.unmask(text, {
					prompt: old,
					keepPrompt: false,
					keepLiterals: false
				});
				this.setValue(text);
			}
			else {

				this.setValue(this.getValue());
			}
		},

		/**
		 * Applies the hidePrompt property.
		 */
		_applyHidePrompt: function (value, old) {

			if (this.__textfield == null)
				return;

			if (this.__textfield.hasState("focused"))
				this.setValue(this.getValue());
		},

		/**
		 * Applies the mask property.
		 *
		 * Splits the mask into an array of characters.
		 */
		_applyMask: function (value, old) {

			// parse the mask.
			var maskChars = value ? maskChars = value.split("") : [];

			// unmask the current value using the previous mask.
			var text = this.getValue();

			// update the parsed masked chars.
			this.__maskChars = maskChars;

			// reapply the mask.
			this.setValue(text);
		},

		// returns the value from the input element.
		getValue: function (keepMask) {

			if (this.__textfield == null)
				return null;

			var el = this.__textfield.getContentElement();
			var text = el.getValue();
			if (!keepMask)
				text = this.unmask(text, {
					keepPrompt: false,
					keepLiterals: false
				});

			return text;
		},

		// sets the value in the input element.
		setValue: function (value, applyMask) {

			if (this.__textfield == null)
				return;

			// show the prompt if we are in design mode or if the 
			// the textfield has the focus and hidePrompt is false.
			var keepPrompt = wisej.web.DesignMode ||
				!this.isHidePrompt() || this.__textfield.hasState("focused");

			var el = this.__textfield.getContentElement();
			if (applyMask !== false)
				value = this.mask(value, {
					keepLiterals: true,
					keepPrompt: keepPrompt
				});

			el.setValue(value);
		},

		// returns the next valid insert position in the mask.
		__getNextInsertPosition: function (pos) {

			for (var mask = this.__maskChars[pos];
					mask != null && !this.__isMaskChar(mask);
						mask = this.__maskChars[++pos]);

			return pos;
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
						break;
					case ">":
						this.__lowercase = false;
						this.__uppercase = true;
						return this.__getNextMask();
						break;
					case "|":
						this.__lowercase = false;
						this.__uppercase = false;
						return this.__getNextMask();
						break;
					case "\\":
						this.__escape = true;
						return this.__getNextMask();
						break;
				}
			}

			return mask;
		},

		// applies the current mask transformation to the char.
		__transformChar: function (c, mask) {

			if (!c)
				return c;

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
			if (c != mask)
				return null;

			return c;
		},

		// checks if the character is a mask or a literal.
		__isMaskChar: function (c) {

			return this.__regexp[c] != null;
		},

		// handles changes to the readOnly property
		// and store it locally - this code needs to check it on every keystroke.
		_onChangeReadOnly: function (e) {
			this.__isReadOnly = e.getData();
		},

	},

});
