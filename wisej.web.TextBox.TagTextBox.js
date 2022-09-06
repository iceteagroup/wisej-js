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
		this.addListener("mouseup", this._onMouseUp, this);
		this.addListener("dblclick", this._onDblClick, this);
		this.getChildControl("textfield").getContentElement().addListener("paste", this._onPaste, this);

		// add local state events.
		this.setStateEvents(this.getStateEvents().concat(["tagAdded", "tagRemoved"]));

		// reset the state properties to remove the "selection" state property.
		this.setStateProperties(["x", "y", "width", "height", "visible", "enabled", "value"]);

		this._tagContainer = this.getChildControl("container");

		this.initAutoSize();
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

		/**
		 * KeepWatermark
		 * 
		 * Determines whether the watermark is kept when there are tags.
		 */
		keepWatermark: { init: false, check: "Boolean" },

		/**
		 * ShowToolTips.
		 * 
		 * Indicates whether to show a tooltip for each inner tag element.
		 */
		showToolTips: { init: false, check: "Boolean", apply: "_applyShowToolTips" },

		/**
		 * Editable.
		 * 
		 * Returns or sets whether the user can add tags by typing into the editable field.
		 */
		editable: { init: true, check: "Boolean", apply: "_applyEditable" },

		/**
		 * AutoSize.
		 * 
		 * Determines whether the tagTextBox grows vertically to fit the tags and the input.
		 */
		autoSize: { init: true, check: "Boolean", apply: "_applyAutoSize" }
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
		tagRejected: "qx.event.type.Data"
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

			// remove and collect all children of the container: tags and editor.
			var children = container.removeAll();

			if (!value || value.length == 0) {

				// setting zero tags? destroy all children.
				for (var i = 0; i < children.length; i++) {
					if (children[i] instanceof wisej.web.tagtextbox.Tag)
						children[i].destroy();
					else if (children[i] != null)
						container.add(children[i]);
				}

				this.fireDataEvent("changeValue", "", oldValue);
				return;
			}

			var tag = null;
			var showToolTips = this.getShowToolTips();
			var allowDuplicates = this.getAllowDuplicateTags();

			for (var i = 0; i < value.length; i++) {

				// reject duplicates
				if (!allowDuplicates) {
					var text = value[i].value || "";
					if (this.__findTag(text)) {
						this.fireDataEvent("tagRejected", { index: -1, value: text });
						continue;
					}
				}

				// try to reuse the existing widgets.
				var index = children.findIndex(function (item) {
					return item instanceof wisej.web.tagtextbox.Tag;
				});

				if (index == -1) {
					tag = this.__createNewTag();
				}
				else {
					tag = children[index];
					children[index] = null;
				}

				tag.set(value[i]);

				if (showToolTips)
					tag.getContentElement().setAttribute("title", tag.getLabel());
				else
					tag.getContentElement().removeAttribute("title");

				container.add(tag);
			}

			// destroy unused tag widgets and re-add the editor.
			for (var i = 0; i < children.length; i++) {
				if (children[i] instanceof wisej.web.tagtextbox.Tag)
					children[i].destroy();
				else if (children[i] != null)
					container.add(children[i]);
			}

			// update the watermark in the editable widget.
			this._updateWatermark();

			// restore the selected tag widget.
			this._applySelectedIndex(this.getSelectedIndex());

			// update the size of the edit field.
			this.getChildControl("textfield").invalidateLayoutCache();

			// done, notify whoever is listening.
			this.fireDataEvent("changeValue", this.getValue(), oldValue);
		},

		/**
		 * Updates the watermark depending on the property KeepWatermark
		 * and the presence of tags.
		 */
		_updateWatermark: function () {

			if (!this.getKeepWatermark()) {

				if (this.__getTagCount())
					this._applyPlaceholder("");
				else
					this._applyPlaceholder(this.getPlaceholder());
			}

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

			var children = this._tagContainer.getChildren();
			for (var i = 0, count = this.__getTagCount() ; i < count; i++) {

				if (value)
					children[i].setMaxWidth(value);
				else
					children[i].resetMaxWidth();
			}
		},

		/**
		 * Applies the ShowToolTips property.
		 */
		_applyShowToolTips: function (value, old) {

			var children = this._tagContainer.getChildren();
			for (var i = 0, count = this.__getTagCount(); i < count; i++) {

				if (value)
					children[i].getContentElement().setAttribute("title", children[i].getLabel());
				else
					children[i].getContentElement().removeAttribute("title");
			}
		},

		/**
		 * Applies the Editable property.
		 */
		_applyEditable: function (value, old) {

			var textfield = this.getChildControl("textfield");
			value
				? textfield.show()
				: textfield.exclude();
		},

		/**
		 * Applies the AutoSize property.
		 */
		_applyAutoSize: function (value, old) {

			var index = 0;
			var slider = this.getChildControl("slider");
			var container = this.getChildControl("container");

			var widget = this._getChildren()[0];
			if (widget instanceof wisej.web.ToolContainer && widget.getPosition() === "left")
				index++;

			if (value) {
				slider.exclude();
				this._addAt(container, index, { flex: 1 });
				container.invalidateLayoutCache();
				container.invalidateLayoutChildren();
			}
			else {
				slider.show();
				slider.add(container, { flex: 0 });
				this._addAt(slider, index, { flex: 1 });
				container.invalidateLayoutCache();
				container.invalidateLayoutChildren();
			}
		},

		/**
		 * Handles "tap" events to delete tags.
		 */
		_onTap: function (e) {

			var target = e.getTarget();
			if (this.isEditable()
				&& !this.isReadOnly()
				&& !(target instanceof qx.ui.form.RepeatButton)
				&& !(target instanceof wisej.web.tagtextbox.Tag)) {

				this.focus();
			}

			if (target instanceof wisej.web.tagtextbox.Tag) {

				var tag = target;

				if (this.isReadOnly()) {
					this.__selectTag(tag);
				}
				else {

					// clicked on the delete icon?
					target = qx.ui.core.Widget.getWidgetByElement(e.getOriginalTarget());

					if (target instanceof qx.ui.basic.Image)
						this.__removeTag(tag);
					else
						this.__selectTag(tag);
				}
			}
		},

		/**
		 * Handles "mouseup" events on the inner tags.
		 */
		_onMouseUp: function (e) {

			var tag = e.getTarget();
			if (tag instanceof wisej.web.tagtextbox.Tag) {

				this.__selectTag(tag);

				// clicked on the delete icon?
				var target = qx.ui.core.Widget.getWidgetByElement(e.getOriginalTarget());
				if (!(target instanceof qx.ui.basic.Image))
					this.fireDataEvent("tagClick", { index: this.getSelectedIndex(), value: tag.getValue() });
			}
		},

		/**
		 * Handles "dblclick" events on the inner tags.
		 */
		_onDblClick: function (e) {

			var tag = e.getTarget();
			if (tag instanceof wisej.web.tagtextbox.Tag) {
				// clicked on the delete icon?
				var target = qx.ui.core.Widget.getWidgetByElement(e.getOriginalTarget());
				if (!(target instanceof qx.ui.basic.Image))
					this.fireDataEvent("tagDblClick", { index: this.getSelectedIndex(), value: tag.getValue() });
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
					if (!this.isReadOnly()) {
						var index = this.getSelectedIndex();
						if (index > -1) {
							this.__removeTag(this.__getSelectedTag(), true);
							e.stop();
						}
					}
					break;

				case "Backspace":
					if (!this.isReadOnly()) {
						var index = this.getSelectedIndex();
						if (index > -1) {
							this.__removeTag(this.__getSelectedTag(), false);
							e.stop();
						}
						else if (this.getTextSelectionStart() == 0 && this.getTextSelectionLength() == 0) {
							this.__removeTag(this.__getLastTag(), false);
							e.stop();
						}
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
							if (this.isEditable()) {
								this.__selectTag(-1);
								this.getChildControl("textfield").getFocusElement().focus();
							}
							else {
								this.__selectTag(0);
							}
						}
						e.stop();
					}
					break;

				case "End":
					if (this.isEditable()) {
						this.__selectTag(-1);
						this.getChildControl("textfield").getFocusElement().focus();
					}
					else {
						this.__selectTag(this.__getTagCount() - 1);
					}
					break;

				case "Home":
					this.__selectTag(0);
					if (!this.isAutoSize()) {
						var tag = this.__getSelectedTag();
						if (tag) {
							this.getChildControl("slider").scrollTo(tag.getBounds().left);
						}
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
					if (qx.core.Environment.get("browser.name") === "chrome" && e.getKeyCode() === undefined) {
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

		/**
		 * Handles the "paste" event to update the server immediately if the
		 * pasted value contains a separator.
		 * @param {any} e
		 */
		_onPaste: function (e) {
			qx.event.Timer.once(function () {
				var text = this.__getFieldText();
				var separator = this.getSeparatorChar();

				if (text && text.indexOf(separator) > -1) {

					var tags = text.split(separator);
					for (var i = 0; i < tags.length; i++) {
						this.__addTag(tags[i]);
					}

					this.__setFieldText("");
				}

			}, this, 1);
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

		__getLastTag: function () {
			var index = this.__getTagCount() - 1;
			if (index > -1) {
				var container = this._tagContainer;
				return container.getChildren()[index];
			}
		},

		__addTag: function (text) {

			if (!text)
				return false;

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

					this.fireDataEvent("tagRejected", { index: -1, value: text });
					return false;
				}
			}

			if (this.getMaxTagCount() > 0) {
				if (this.__getTagCount() >= this.getMaxTagCount()) {
					this.fireDataEvent("tagRejected", { index: -1, value: text });
					return false;
				}
			}

			var container = this._tagContainer;
			var tag = this.__createNewTag();
			container.addAt(tag, this.__getTagCount());
			tag.setValue(text);
			tag.setLabel(text);

			if (this.getShowToolTips())
				tag.getContentElement().setAttribute("title", text);

			var textfield = this.getChildControl("textfield");
			textfield.invalidateLayoutCache();

			this.fireDataEvent("tagAdded", { index: this.__getTagCount() - 1, value: text });

			// scroll the edit field into view.
			this.scrollChildIntoView(textfield);

			return true;
		},

		__removeTag: function (tag, forward) {
			if (!tag)
				return false;

			var container = this._tagContainer;
			var index = container.indexOf(tag);
			if (index > -1) {

				var selectedIndex = this.getSelectedIndex();

				var textfield = this.getChildControl("textfield");
				textfield.invalidateLayoutCache();
				this.fireDataEvent("tagRemoved", { index: index, value: tag.getValue() });

				tag.destroy();

				if (selectedIndex > -1 && selectedIndex == index) {

					if (!forward || index == this.__getTagCount()) {
						this.setSelectedIndex(--index);
						var tag = this.__getSelectedTag();
						if (tag)
							this.fireDataEvent("tagSelected", { index: index, value: tag.getValue() });
					}
					else if (this.__getTagCount() > 0) {
						this._applySelectedIndex(index);
						var tag = this.__getSelectedTag();
						if (tag)
							this.fireDataEvent("tagSelected", { index: index, value: tag.getValue() });
					}
					else {
						this.setSelectedIndex(-1);
					}
				}

				this.setDirty(true);

				return true;
			}

			return false;
		},

		__selectTag: function (arg) {

			var tag = null;
			var index = -1;

			if (typeof arg === "number")
				index = arg;
			else if (typeof arg === "string")
				tag = this.__findTag(arg);
			else if (arg instanceof wisej.web.tagtextbox.Tag)
				tag = arg;

			if (tag)
				index = this._tagContainer.indexOf(arg);

			// already selected?
			if (tag && tag.hasState("selected"))
				return;

			this.setSelectedIndex(index);
			tag = this.__getSelectedTag();
			if (tag) {
				this.scrollChildIntoView(tag);
				this.fireDataEvent("tagSelected", { index: index, value: tag.getValue() });
			}

			// scroll the edit field into view.
			if (index == -1)
				this.scrollChildIntoView(this.getChildControl("textfield"));

			return index > -1;
		},

		__findTag: function (text) {
			if (text) {
				text = text.toLowerCase();
				var children = this._tagContainer.getChildren();
				for (var i = 0; i < children.length; i++) {
					if (children[i] instanceof wisej.web.tagtextbox.Tag) {
						var label = (children[i].getValue() || "").toLowerCase();
						if (label == text)
							return children[i];
					}
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
					control.setMinWidth(1);
					control.setMinHeight(1);
					control.setSelectable(true);
					control.setAllowGrowY(true);
					this._add(control, { flex: 1 });
					break;

				case "slider":
					control = new qx.ui.container.SlideBar();
					control.setScrollStep(30);
					break;

				case "container":
					control = new wisej.web.tagtextbox.TagContainer();
					var textfield = this.getChildControl("textfield");
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
		}
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
		}
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
		}
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
		}
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
		}
	}

});