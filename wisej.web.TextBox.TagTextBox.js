///////////////////////////////////////////////////////////////////////////////
//
// (C) 2018 ICE TEA GROUP LLC - ALL RIGHTS RESERVED
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
 * wisej.web.TagTextBox
 *
 * Represents an input field that displays a list of
 * values as child clickable widgets. The control can add
 * tags dynamically as the user types in the editable part.
 */
qx.Class.define("wisej.web.TagTextBox", {

	extend: wisej.web.TextBoxBase,

	construct: function () {

		this.base(arguments);

		this.initMinFieldLength();
		this.addListener("tap", this._onTap, this);
		this.addListener("keyup", this._onKeyUp, this);
		this.addListener("keydown", this._onKeyDown, this);
		this.addListener("keyinput", this._onKeyInput, this);

		this._tagContainer = this.getChildControl("tag-container");
	},

	properties: {

		appearance: { init: "tagtextbox", refine: true },

		/**
		 * Tags.
		 *
		 * Fills the controls with the specified tags.
		 */
		tags: { init: null, check: "Array", apply: "_applyTags", event: "changeTags" },

		/**
		 * MaxTagCount.
		 *
		 * Gets or sets the maximum number of tags allowed.
		 */
		maxTagCount: { init: 0, check: "PositiveInteger" },

		/**
		 * MaxTagWidth.
		 *
		 * Gets or sets the maximum width of a tag widget in pixels.
		 */
		maxTagWidth: { init: 100, check: "PositiveInteger", apply: "_applyMaxTagWidth" },

		/**
		 * MinFieldLength.
		 *
		 * Gets or sets the minimum number of character that should fit
		 * in the editable field before wrapping to a new line.
		 */
		minFieldLength: { init: 5, Check: "PositiveInteger", apply: "_applyMinFieldLength" },

		/**
		 * SelectedIndex.
		 *
		 * Gets or sets the index of the selected tag widget.
		 */
		selectedIndex: { init: -1, check: "Integer", apply: "_applySelectedIndex", event: "changeSelectedIndex" },

		/**
		 * AllowDuplicateTags.
		 *
		 * When false (default) duplicate tags are not allowed.
		 */
		allowDuplicateTags: { init: false, Check: "Boolean" },

		/**
		 * DuplicateDuration.
		 *
		 * Gets or sets the number of milliseconds for the duplicate highlight animation.
		 */
		duplicateDuration: { init: 200, check: "PositiveInteger", themeable: true },

		/**
		 * SeparatorChar.
		 *
		 * Gets or sets the character used to detect a new tag in addition to the Return.
		 */
		separatorChar: { init: "", check: "String", event: "changeSeparatorChar" },
	},

	events: {

		/**
		 * Fired when a new tag is added by the user.
		 */
		tagAdded: "qx.event.type.Data",

		/**
		 * Fired when a new tag is removed by the user.
		 */
		tagRemoved: "qx.event.type.Data",

		/**
		 * Fired when a tag is selected by the user.
		 */
		tagSelected: "qx.event.type.Data",

		/**
		 * Fired when a duplicated tag is detected and 
		 * the property {@link wisej.web.TagTextBox#allowDuplicateTags} is false or
		 * the value in {@link wisej.web.TagTextBox#maxTags} has been reached.
		 */
		tagRejected: "qx.event.type.Data",
	},

	members: {

		/** reference to the tag container. */
		_tagContainer: null,

		/*---------------------------------------------------------------------------
		  qx.ui.form.IStringForm implementation
		---------------------------------------------------------------------------*/

		/**
		 * Selects the specified tag if it exists.
		 *
		 * @param text {String} The value of the tag to find and select.
		 */
		selectTag: function (text) {

			this.__selectTag(text);
		},

		/*---------------------------------------------------------------------------
		  Implementation
		---------------------------------------------------------------------------*/

		/**
		 * Applies the Tags property.
		 */
		_applyTags: function (value, old) {

			var oldValue = this.getValue();
			var container = this._tagContainer;

			if (!value || value.length == 0) {

				// remove all the tag widgets.
				if (this.__getTagCount() > 0) {
					var children = container.getChildren();
					for (var i = children.length - 2; i > -1; i--) {
						children[i].destroy();
					}
				}

				this.fireDataEvent("changeValue", "", oldValue);
				return;
			}

			// try to reuse the existing widgets.
			for (var i = 0; i < value.length; i++) {

				var tag =
					this.__findTag(value[i].value)
					|| this.__createNewTag();

				tag.set(value[i]);

				container.addAt(tag, i);
			}

			// remove any tag widget that doesn't match the values.
			var children = container.getChildren();
			var searchValues = value.map(function (el) { return el.value.toLowerCase(); });
			for (var i = children.length - 2; i > -1; i--) {
				var value = children[i].getValue().toLowerCase();
				if (searchValues.indexOf(value) == -1)
					children[i].destroy();
			}

			// restore the selected tag widget.
			this._applySelectedIndex(this.getSelectedIndex());

			// update the size of the edit field.
			this.getChildControl("textfield").invalidateLayoutCache();

			// done, notify whoever is listening.
			this.fireDataEvent("changeValue", this.getValue(), oldValue);
		},

		_applySelectedIndex: function (value) {

			var container = this._tagContainer;
			var children = container.getChildren();
			for (var i = 0, count = this.__getTagCount() ; i < count; i++) {

				if (i == value) {
					children[i].addState("selected");
				}
				else {
					children[i].removeState("selected");
				}
			}
		},

		/**
		 * Applies the MinFieldLength property.
		 */
		_applyMinFieldLength: function (value, old) {

			var textfield = this.getChildControl("textfield");
			textfield.setMinLength(value);
			textfield.invalidateLayoutCache();
		},

		/**
		 * Applies the MaxTagWidth property.
		 */
		_applyMaxTagWidth: function (value, old) {

			var container = this._tagContainer;
			var children = container.getChildren();
			for (var i = 0, count = this.__getTagCount() ; i < count; i++) {

				if (value)
					children[i].setMaxWidth(value);
				else
					children[i].resetMaxWidth();
			}
		},

		/**
		 * Handles "tap" events to delete tags.
		 */
		_onTap: function (e) {

			var target = e.getTarget();
			if (target instanceof wisej.web.tagtextbox.Tag) {
				var element = qx.ui.core.Widget.getWidgetByElement(e.getOriginalTarget());

				if (element instanceof qx.ui.basic.Image)
					this.__removeTag(target);
				else
					this.__selectTag(target);
			}
		},

		// overridden.
		_onKeyDown: function (e) {
			var identifier = e.getKeyIdentifier();

			switch (identifier) {

				case "Enter":
					// if the edit field is empty, let the default
					// TextBox class handle the enter.
					if (this.__getFieldText() == "")
						this.base(arguments, e);

					break;

				default:
					this.base(arguments, e);
					break;
			}
		},

		/**
		 * Handles "keydown" events to select tags.
		 */
		_onKeyDown: function (e) {

			var modifiers = e.getModifiers();
			if (modifiers != 0)
				return;

			var key = e.getKeyIdentifier();

			switch (key) {

				case "Delete":
					var index = this.getSelectedIndex();
					if (index > -1) {
						this.__removeTag(this.__getSelectedTag(), true);
						e.stop();
					}
					break;

				case "Backspace":
					var index = this.getSelectedIndex();
					if (index > -1) {
						this.__removeTag(this.__getSelectedTag(), false);
						e.stop();
					}
					else if (this.getTextSelectionStart() == 0) {
						this.__selectTag(this.__getTagCount() - 1);
						this.__removeTag(this.__getSelectedTag(), false);
						e.stop();
					}
					break;

				case "Left":
					var index = this.getSelectedIndex();
					if (index > -1) {
						if (index == 0)
							index = this.__getTagCount();

						this.__selectTag(index - 1);
						e.stop();
					}
					else if (this.getTextSelectionStart() == 0) {
						this.__selectTag(this.__getTagCount() - 1);
						e.stop();
					}
					break;

				case "Right":
					var index = this.getSelectedIndex();
					if (index > -1) {
						if (index < this.__getTagCount() - 1) {
							this.__selectTag(index + 1);
						}
						else {
							this.__selectTag(-1);
						}
						e.stop();
					}
					break;
			}
		},

		/**
		 * Handles "keyup" events to add when the user presses Enter.
		 *
		 * NOTE: cannot do this in keypress because in IE and FireFox it comes too early
		 * before the autocomplete list has changed the text.
		 */
		_onKeyUp: function (e) {

			var key = e.getKeyIdentifier();

			switch (key) {
				case "Enter":
					var text = this.__getFieldText();
					if (text) {
						this.__addTag(this.__getFieldText());
						this.__setFieldText("");
						e.stop();
					}
					break;

				default:
					// on chrome autocomplete key events are not
					// passed to the control. but when pressing enter it fires
					// a key event with keyCode undefined!
					if (qx.core.Environment.get("browser.name") == "chrome" && e.getKeyCode() === undefined) {
						this.__addTag(this.__getFieldText());
						this.__setFieldText("");
					}
					break;
			}
		},

		/**
		 * Handles "keyinput" events to add a new tag
		 * when the user presses the separator char.
		 */
		_onKeyInput: function (e) {

			if (e.getChar() == this.getSeparatorChar()) {
				this.__addTag(this.__getFieldText());
				this.__setFieldText("");
				e.stop();
			}
		},

		__getFieldText: function () {
			return this.getChildControl("textfield").getValue();
		},

		__setFieldText: function (text) {
			return this.getChildControl("textfield").setValue(text);
		},

		__createNewTag: function () {

			tag = new wisej.web.tagtextbox.Tag();
			tag.set({
				keepFocus: true,
				keepActive: true,
				maxWidth: this.getMaxTagWidth(),
				appearance: this.getAppearance() + "/tag"
			});
			return tag;
		},

		__getSelectedTag: function () {
			var container = this._tagContainer;
			var index = this.getSelectedIndex();
			return container.getChildren()[index];
		},

		__addTag: function (text) {

			if (!text)
				return;

			text = text.trim();

			if (!this.getAllowDuplicateTags()) {
				var existing = this.__findTag(text);
				if (existing) {
					existing.addState("duplicate");
					setTimeout(function () {
						if (!existing.isDisposed())
							existing.removeState("duplicate");
					},
					this.getDuplicateDuration());

					this.fireDataEvent("tagRejected", text);
					return;
				}
			}

			if (this.getMaxTagCount() > 0) {
				if (this.__getTagCount() >= this.getMaxTagCount()) {
					this.fireDataEvent("tagRejected", text);
					return;
				}
			}

			var container = this._tagContainer;
			var tag = this.__createNewTag();
			container.addAt(tag, this.__getTagCount());
			tag.setValue(text);
			tag.setLabel(text);

			this.getChildControl("textfield").invalidateLayoutCache();
			this.fireDataEvent("tagAdded", text);
		},

		__removeTag: function (tag, forward) {
			if (!tag)
				return;

			var container = this._tagContainer;
			var index = container.indexOf(tag);
			if (index > -1) {

				this.getChildControl("textfield").invalidateLayoutCache();
				this.fireDataEvent("tagRemoved", tag.getValue());

				tag.destroy();

				if (!forward)
					this.setSelectedIndex(--index);
				else if (this.__getTagCount() > 0)
					this._applySelectedIndex(index);
				else
					this.setSelectedIndex(-1);
			}
		},

		__selectTag: function (arg) {

			var index = -1;

			if (typeof arg === "number")
				index = arg;
			else if (typeof arg === "string")
				arg = this.__findTag(arg);

			if (arg instanceof wisej.web.tagtextbox.Tag) {
				var container = this._tagContainer;
				index = container.indexOf(arg);
			}

			this.setSelectedIndex(index);
			var tag = this.__getSelectedTag();
			if (tag)
				this.fireDataEvent("tagSelected", tag.getValue());
		},

		__findTag: function (text) {
			if (text) {
				text = text.toLowerCase();
				var container = this._tagContainer;
				var children = container.getChildren();
				for (var i = 0, count = this.__getTagCount() ; i < count; i++) {
					var label = children[i].getValue().toLowerCase();
					if (label == text)
						return children[i];
				}
			}
			return null;
		},

		__getTagCount: function () {
			return this._tagContainer.getChildren().length - 1;
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "textfield":
					control = new wisej.web.tagtextbox.TextField();
					control.setFocusable(false);
					control.addState("inner");
					this._add(control, { flex: 1 });
					break;

				case "tag-container":
					control = new wisej.web.tagtextbox.TagContainer();
					control.set({
						anonymous: true,
						keepFocus: true,
						keepActive: true
					});
					var textfield = this.getChildControl("textfield");
					var index = this._indexOf(textfield);
					this._addAt(control, index, { flex: 1 });
					control.add(textfield, { stretch: 1 });
					break;
			}

			return control || this.base(arguments, id);
		},


		/*---------------------------------------------------------------------------
		  qx.ui.form.IStringForm implementation
		---------------------------------------------------------------------------*/

		setValue: function (value) {

			// not implemented.
			// the value must be changed using the tags property.
		},

		getValue: function () {

			var value = "";
			var separator = this.getSeparatorChar();
			var container = this._tagContainer;
			var children = container.getChildren();
			for (var i = 0, count = this.__getTagCount() ; i < count; i++) {

				value += children[i].getValue();
				if (i < count - 1)
					value += separator;
			}

			return value;
		},
		resetValue: function () {

			this.setTags(null);
		},


	}

});

/**
 * wisej.web.tagtextbox.Tag
 */
qx.Class.define("wisej.web.tagtextbox.Tag", {

	extend: qx.ui.basic.Atom,

	construct: function (label) {

		this.base(arguments, label);

		this.setRich(true);
		this.setIconPosition("right");

		this.addListener("pointerover", this._onPointerOver);
		this.addListener("pointerout", this._onPointerOut);

		this._forwardStates.selected = true;
	},

	properties: {

		value: { init: "" }

	},

	members: {

		_onPointerOver: function (e) {
			this.addState("hovered");
		},

		_onPointerOut: function (e) {
			this.removeState("hovered");
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "label":
					control = this.base(arguments, id, hash);
					control.setWrap(false);
					control.getContentElement().setStyle("textOverflow", "ellipsis");
					break;
			}

			return control || this.base(arguments, id);
		},
	}
});


/**
 * wisej.web.tagtextbox.TextField
 */
qx.Class.define("wisej.web.tagtextbox.TextField", {

	extend: qx.ui.form.TextField,

	properties: {

		minLength: { init: 10, check: "PositiveInteger" }
	},

	members: {

		// overridden
		_getContentHint: function () {
			return {
				width: this.__textSize.width * this.getMinLength(),
				height: this.__textSize.height || 16
			};
		},
	}
});


/**
 * wisej.web.tagtextbox.TagContainer
 */
qx.Class.define("wisej.web.tagtextbox.TagContainer", {

	extend: qx.ui.container.Composite,

	construct: function () {

		var layout = new wisej.web.tagtextbox.TagContainerLayout();
		layout.setAlignY("middle");

		this.base(arguments, layout);
	},

	properties: {

		/** Horizontal spacing between two children */
		spacingX:
		{
			init: 0,
			check: "Integer",
			apply: "_applySpacing",
			themeable: true
		},

		/**
		 * The vertical spacing between the lines.
		 */
		spacingY:
		{
			init: 0,
			check: "Integer",
			apply: "_applySpacing",
			themeable: true
		},
	},

	members: {

		_applySpacing: function (value, old, name) {
			this.getLayout().set(name, value);
		}
	}
});


/**
 * wisej.web.tagtextbox.TagContainerLayout
 *
 * Extends the basic qx.ui.layout.Flow to center the
 * items vertically within the container when it's a single line.
 */
qx.Class.define("wisej.web.tagtextbox.TagContainerLayout", {

	extend: qx.ui.layout.Flow,

	members: {

		/**
		 * The FlowLayout tries to add as many Children as possible to the current 'Line'
		 * and when it sees that the next Child won't fit, it starts on a new Line, continuing
		 * until all the Children have been added.
		 * To enable alignX "left", "center", "right" renderLayout has to calculate the positions
		 * of all a Line's children before it draws them.
		 *
		 * @param availWidth {Integer} Final width available for the content (in pixel)
		 * @param availHeight {Integer} Final height available for the content (in pixel)
		 * @param padding {Map} Map containing the padding values. Keys:
		 * <code>top</code>, <code>bottom</code>, <code>left</code>, <code>right</code>
		 */
		renderLayout: function (availWidth, availHeight, padding) {
			var children = this._getLayoutChildren();

			if (this.getReversed()) {
				children = children.concat().reverse();
			}

			var lineCalculator = new qx.ui.layout.LineSizeIterator(
			  children,
			  this.getSpacingX()
			);

			var lineTop = padding.top;
			while (lineCalculator.hasMoreLines()) {
				var line = lineCalculator.computeNextLine(availWidth);

				// if this is the first and only line, make the line height
				// the same as the container height in order to center
				// vertically.
				if (lineTop == padding.top && !lineCalculator.hasMoreLines()) {
					var container = this._getWidget();
					if (container.getBounds())
						line.height = Math.max(line.height, container.getBounds().height);
				}

				this.__renderLine(line, lineTop, availWidth, padding);
				lineTop += line.height + this.getSpacingY();
			}
		},
	}

});