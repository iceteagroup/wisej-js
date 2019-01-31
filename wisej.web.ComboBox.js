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
 * wisej.web.ComboBox
 *
 */
qx.Class.define("wisej.web.ComboBox", {

	extend: qx.ui.form.ComboBox,

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

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["value", "selection"]));
		// add local state events.
		this.setStateEvents(this.getStateEvents().concat(["changeValue"]));

		// handle "focusin" to focus the inner editable textfield.
		//this.addListener("focusin", this.__onFocusIn, this);

		// handle "keyinput" for the autocomplete feature.
		this.addListener("keyinput", this._onKeyAutoComplete, this);

		// hovered event handlers.
		this.addListener("pointerover", this._onPointerOver, this);
		this.addListener("pointerout", this._onPointerOut, this);

		// any action on the textbox marks it as dirty to update the state on the server
		// also when the selection and the caret have changed.
		var textField = this.getChildControl("textfield");
		textField.addListener("keydown", function (e) { this.setDirty(true); }, this);
		textField.addListener("mousedown", function (e) { this.setDirty(true); }, this);

		// handle the native event "oncopy" to update the clipboard on the server.
		textField.getContentElement().addListener("copy", this.__onCopy, this);

		// enable the native context menu by default.
		this.setNativeContextMenu(true);

		// this is the initial value of dropDownStyle.
		this.addState("dropDown");

		// prepare the combobox when created in a grid cell.
		this.addListener("cellBeginEdit", this._onCellBeginEdit, this);
	},

	properties: {

		/**
		 * droppedDown property.
		 *
		 * Gets or sets the status of the dropdown list.
		 *
		 * This property is defined using the getter/setter methods.
		 */

		/**
		 * items property.
		 *
		 * Sets the items in the dropdown list.
		 */
		items: { init: null, check: "Map", nullable: true, apply: "_applyItems" },

		/**
		 * dropDownStyle property.
		 *
		 * Determines whether the text part is editable and if the dropdown list is always visible.
		 */
		dropDownStyle: { init: "dropDown", check: ["simple", "dropDown", "dropDownList"], apply: "_applyDropDownStyle" },

		/**
		 * maxLength property.
		 *
		 * Maximum number of characters that can be entered in the textfield.
		 */
		maxLength: { init: 0, check: "PositiveInteger", apply: "_applyMaxLength" },

		/** 
		 * CharacterCasing property.
		 *
		 * Gets or sets whether the control modifies the case of characters as they are typed.
		 */
		characterCasing: { init: "normal", check: "String", apply: "_applyCharacterCasing" },

		/**
		 * SelectedIndex property.
		 *
		 * Gets or sets the index of the selected item.
		 */
		selectedIndex: { init: -1, check: "Integer", apply: "_applySelectedIndex", event: "changeSelectedIndex" },

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
		 * AutoCompleteMode property.
		 *
		 * Specifies the mode for the automatic completion feature.
		 */
		autoCompleteMode: { init: "none", check: ["none", "suggest", "append", "suggestAppend", "filter"], apply: "_applyAutoCompleteMode" },

		/**
		 * ReadOnly property.
		 */
		readOnly: { check: "Boolean", apply: "_applyReadOnly", init: false },

		/**
		 * Tools property.
		 *
		 * Collection of tool definitions to display next to the edit field.
		 */
		tools: { check: "Array", apply: "_applyTools" },

		/**
		 * Determines the appearance of child items.
		 */
		itemAppearance: { init: "listitem", themeable: true },
	},

	members: {

		// suspend event dispatching.
		__suspendEvents: false,

		// cached auto complete mode.
		__autoCompleteMode: 0,

		/**
		 * Shows the list popup.
		 *
		 * Overridden to disable the live update of the popup when the
		 * dropdown list is always visible: "simple" style.
		 */
		open: function () {

			var popup = this.getChildControl("popup");
			if (this.getDropDownStyle() === "simple") {
				popup.placeToWidget(this);
				popup.show();
			}
			else {
				popup.open(this, true);
			}
		},

		/**
		 * Hides the list popup.
		 */
		close: function () {
			this.getChildControl("popup").hide();
		},

		/**
		 * Get/set the selection property.
		 */
		getSelection: function () {

			var textfield = this.getChildControl("textfield");
			var value = {
				start: textfield.getTextSelectionStart() || 0,
				length: textfield.getTextSelectionLength() || 0
			};
			return value;
		},
		setSelection: function (value) {

			if (value) {

				// don't set the selection if the combobox is dropped down.
				var popup = this.getChildControl("popup");
				if (popup.isVisible())
					return;

				var textfield = this.getChildControl("textfield");
				textfield.setTextSelection(value.start, value.length + value.start);
			}
		},

		// overridden
		tabFocus: function () {

			var field = this.getChildControl("textfield");

			if (field.isVisible()) {
				field.getFocusElement().focus();
				field.selectAllText();
			}
			else {
				this.focus();
			}
		},

		/**
		 * Returns the target for the accessibility properties.
		 */
		getAccessibilityTarget: function () {
			var field = this.getChildControl("textfield");
			return field.isVisible() ? field : this;
		},

		/**
		 * Applies the appearance property.
		 *
		 * Overridden to update the appearance immediately
		 * to receive the correct value of itemAppearance in case
		 * it's defined in the theme.
		 */
		_applyAppearance: function (value, old) {

			this.syncAppearance();
		},

		/**
		 * Applies the items property.
		 */
		_applyItems: function (value, old) {

			var items = value;

			if (items == null)
				return;

			this.__suspendEvents = true;
			try {

				var selectedIndex = this.getSelectedIndex();
				this.setSelectedIndex(-1);

				// clear?
				if (items.clear) {
					selectedIndex = -1;
					this.destroyChildren();
				}

				var children = this.getChildren();

				// add new items.
				if (items.added && items.added.length > 0) {
					var list = items.added;
					for (var i = 0; i < list.length; i++) {
						var index = list[i].index;
						var item = this._createListItem(list[i]);
						this.addAt(item, index);
					}
				}

				// apply modified items.
				if (items.modified && items.modified.length > 0) {
					var list = items.modified;
					for (var i = 0; i < list.length; i++) {
						var index = list[i].index;

						if (index < 0 || index >= children.length)
							throw new Error("index out of bounds: " + index + " (0.." + children.length + ")");

						children[index].set(list[i]);
					}
				}

				// remove deleted items.
				if (items.deleted && items.deleted.length > 0) {
					var list = items.deleted;
					for (var i = list.length - 1; i >= 0; i--) {

						var index = list[i];

						if (index < 0 || index >= children.length)
							throw new Error("index out of bounds: " + index + " (0.." + children.length + ")");

						children[index].destroy();
					}
				}

				// update the displayed text in the textfield.
				this.setSelectedIndex(selectedIndex);


			} finally {

				this.__suspendEvents = false;
			}

		},

		/**
		 * Applies the maxLength property.
		 */
		_applyMaxLength: function (value, old) {

			this.getChildControl("textfield").setMaxLength(value);
		},

		/**
		 * Applies the characterCasing property.
		 */
		_applyCharacterCasing: function (value, old) {

			var fieldEl = this.getChildControl("textfield").getContentElement();
			var labelEl = this.getChildControl("labelfield").getContentElement();

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
			fieldEl.setStyle("textTransform", transform);
			labelEl.setStyle("textTransform", transform);
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

			var list = this.getChildControl("list");
			list.setEnableInlineFind(!value);

			// preserve the selection when toggling read-only mode.
			this.__suspendEvents = true;
			var selection = list.getSelection();
			list.setSelectionMode(value ? "none" : "single");
			list.setSelection(selection);
			this.__suspendEvents = false;
		},

		/**
		 * Applies the spellCheck property.
		 */
		_applySpellCheck: function (value, old) {

			var el = this.getChildControl("textfield").getContentElement();
			el.setAttribute("spellcheck", value ? "true" : "false");
		},

		/**
		 * Applies the maxListHeight property.
		 */
		_applyMaxListHeight: function (value, old) {

			if (this.getDropDownStyle() == "simple")
				return;

			this.getChildControl("list").setMaxHeight(value);
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
		 * Applies the selectedIndex property.
		 */
		_applySelectedIndex: function (value, old) {

			this.__suspendEvents = true;
			try {

				var list = this.getChildControl("list");

				if (value == null || value === -1) {
					list.resetSelection();
				}
				else {
					var children = this.getChildren();
					var item = children[value];
					if (item)
						list.setSelection([item]);
				}
			} finally {

				this.__suspendEvents = false;
			}
		},

		/**
		 * Applies the droppedDown property.
		 */
		getDroppedDown: function () {

			return this.getChildControl("popup").isVisible();
		},
		setDroppedDown: function (value) {

			if (this.isVisible()) {
				value
					? this.open()
					: this.close();
			}
		},

		/**
		 * Applies the dropDownStyle property.
		 */
		_applyDropDownStyle: function (value, old) {

			if (value == old)
				return;

			this.removeState("simple");
			this.removeState("dropDown");
			this.removeState("dropDownList");
			this.addState(value);

			var icon = this.getChildControl("icon");
			var list = this.getChildControl("list");
			var button = this.getChildControl("button");
			var textField = this.getChildControl("textfield");
			var labelField = this.getChildControl("labelfield");

			switch (value) {
				case "simple":
				case "dropDown":
					textField.show();
					labelField.exclude();
					break;

				case "dropDownList":
					labelField.show();
					textField.exclude();
					break;
			}

			switch (value) {
				case "simple":
					// the simple combobox always shows the editable text
					// and the dropped down list, without the button.
					this.open();
					button.exclude();
					list.addState("simple");
					textField.addState("simple");
					this._getLayout().dispose();
					this._setLayout(new qx.ui.layout.Grid());
					var layout = this._getLayout();
					layout.setRowFlex(1, 1);
					layout.setColumnFlex(2, 1);
					this._add(list);
					icon.setLayoutProperties({ row: 0, column: 0 });
					textField.setLayoutProperties({ row: 0, column: 2 });
					list.setLayoutProperties({ row: 1, column: 0, colSpan: 4 });

					if (this.__leftToolsContainer)
						this.__leftToolsContainer.setLayoutProperties({ row: 0, column: 1 });
					if (this.__rightoolsContainer)
						this.__rightoolsContainer.setLayoutProperties({ row: 0, column: 3 });

					list.show();
					list.resetMaxHeight();
					break;

				case "dropDown":
				case "dropDownList":
					this.close();
					button.show();
					list.removeState("simple");
					textField.removeState("simple");
					list.setMaxHeight(this.getMaxListHeight());
					this._getLayout().dispose();
					this._setLayout((new qx.ui.layout.HBox()).set({ alignY: "middle" }));
					var popup = this.getChildControl("popup");
					popup.add(list);
					break;
			}

		},

		/**
		 * Applies the placeholder property.
		 */
		_applyPlaceholder: function (value, old) {

			this.getChildControl("textfield").setPlaceholder(value);

			// update the label when the combobox is not editable (DropDownList)
			// and the selection is empty.
			if (this.getSelectedIndex() === -1) {

				var labelfield = this.getChildControl("labelfield");
				labelfield.setValue(value);
				labelfield.setTextColor("text-placeholder");
			}
		},

		/**
		 * Applies the AutoCompleteMode property.
		 *
		 * Detects the selected auto complete mode and saves the
		 * state in an integer field to speed up keyboard handling.
		 */
		_applyAutoCompleteMode: function (value, old) {

			this.__autoCompleteMode = ["none", "suggest", "append", "suggestAppend" /*, "filter"*/].indexOf(value);
			this.__autoCompleteMode = Math.max(0, this.__autoCompleteMode);
		},

		/** 
		 * Applies the tools property.
		 */
		_applyTools: function (value, old) {

			// [icon][tools][text|label][tools][button]

			if (value == null)
				return;

			if (value.length == 0 && (old == null || old.length == 0))
				return;

			if (this.getDropDownStyle() === "simple") {
				wisej.web.ToolContainer.install(this, this, value, "left", { row: 0, column: 1 });
				wisej.web.ToolContainer.install(this, this, value, "right", { row: 0, column: 3 });
			}
			else {
				wisej.web.ToolContainer.install(this, this, value, "left", { index: 1 });
				wisej.web.ToolContainer.install(this, this, value, "right", { index: 3 });
			}
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "textfield":
					// create the icon before the text field.
					this._createChildControl("icon");

					control = this.base(arguments, id);

					// create the label field companion for 
					// non-editable combo boxes.
					this._createChildControl("labelfield");
					break;

				case "popup":
					control = new wisej.web.combobox.DropDown(this);
					control.add(this.getChildControl("list"));
					control.addListener("changeVisibility", this._onPopupChangeVisibility, this);
					break;

				case "icon":
					control = new qx.ui.basic.Image().set({
						visibility: "excluded",
						keepActive: true,
						focusable: false,
						anonymous: true,
						scale: true
					});
					control.addState("inner");
					this._add(control);
					break;

				case "labelfield":
					control = new qx.ui.basic.Label().set({
						visibility: "excluded",
						keepActive: true,
						focusable: false,
						anonymous: true,
						rich: true,
						wrap: false,
						allowGrowX: true
					});
					control.addState("inner");
					this._add(control, { flex: 1 });
					break;

				case "list":
					control = this.base(arguments, id);
					// disable the quick selection to preserve the
					// selected item in the drop down list.
					control.setQuickSelection(false);
					break;
			}

			return control || this.base(arguments, id);
		},

		/**
		 * Handler for the blur event of the current widget.
		 *
		 * @param e {qx.event.type.Focus} The blur event.
		 */
		_onBlur: function (e) {
			this.close();
		},

		/**
		 * Handler for the cellBeginEdit event.
		 */
		_onCellBeginEdit: function (e) {

			if (this.getDroppedDown()) {
				this.close();
				this.addListenerOnce("appear", function () {
					this.open();
				});
			}
		},

		// overridden
		_onPopupChangeVisibility: function (e) {

			// update the state and bypass the base method.
			e.getData() === "visible"
				? this.addState("popupOpen")
				: this.removeState("popupOpen");

			if (this.getDropDownStyle() === "simple")
				return;

			var popup = this.getChildControl("popup");

			// prevent firing on change of visibility from "hidden" to "excluded" or vice versa.
			if (!popup.isVisible() && e.getOldData() != "visible")
				return;

			this.fireEvent(
				popup.isVisible() ? "open" : "close");

			// Synchronize the list with the current value on every
			// opening of the popup. This is useful because through
			// the quick selection mode, the list may keep an invalid
			// selection on close or the user may enter text while
			// the combobox is closed and reopen it afterwards.
			if (popup.isVisible()) {
				this.__synchListWithText(this.getValue());
			}
			else if (e.getOldData() === "visible") {
				if (this.isFocusable())
					this.tabFocus();
			}

			// In all cases: Remove focused state from button
			this.getChildControl("button").removeState("selected");
		},

		// overridden
		_onListPointerDown: function (e) {

			if (this.getDropDownStyle() === "simple") {
				if (this.isFocusable())
					this.tabFocus();
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

		// overridden
		_onListChangeSelection: function (e) {

			// don't change when read-only, unless it's processing
			// a server request.
			if (this.isReadOnly() && !this.core.processingActions) {
				return;
			}

			// save the suspendEvents state.
			var suspendEvents = this.__suspendEvents;

			this.__suspendEvents = true;
			try {
				var current = e.getData();
				var icon = this.getChildControl("icon");
				var labelfield = this.getChildControl("labelfield");

				if (current && current.length > 0) {

					var item = current[0];
					var index = this.indexOf(item);

					// update the textfield.
					this.setValue(this.__getItemText(item));

					// update the labelfield.
					labelfield.resetTextColor();
					labelfield.setValue(item.getLabel());

					// update the icon.
					icon.setSource(item.getIcon());
					icon.setVisibility(icon.getSource() ? "visible" : "excluded");

					if (!suspendEvents) {

						// update the selectedIndex property.
						this.setSelectedIndex(index);

						// fire the event.
						this.fireDataEvent("selectionChanged", index);
					}
				}
				else {

					// update the textfield only if the combobox
					// is not editable ("dropDownList") otherwise
					// simply set the selected index to -1 and 
					// keep the invalid text.
					if (this.getDropDownStyle() !== "dropDownList")
						this.setSelectedIndex(-1);
					else
						this.setValue("");

					// update the labelfield.
					labelfield.setValue(this.getPlaceholder());
					labelfield.setTextColor("text-placeholder");

					// update the icon.
					icon.exclude();
				}
			}
			finally {
				// restore the suspendEvents state.
				this.__suspendEvents = suspendEvents;
			}
		},

		/**
		 * Toggles or closes the dropdown and transfers the focus.
		 */
		_onTap: function (e) {

			switch (this.getDropDownStyle()) {
				case "dropDown":
					this.close();

					if (!this.hasState("focused"))
						this.tabFocus();
					break;

				case "dropDownList":
					this.toggle();
					break;
			}
		},

		// update the clipboard on the server.
		__onCopy: function (e) {

			this.fireEvent("copy");
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
		_onKeyPress: function (e) {

			var key = e.getKeyIdentifier();
			var isAltPressed = e.isAltPressed();
			var isOpen = this.getChildControl("popup").isVisible();

			switch (key) {
				case "Up":
					if (isOpen && isAltPressed) {
						this.close();
						e.stop();
						return;
					}
					break;

				case "Down":
					if (isAltPressed) {
						this.toggle();
						e.stop();
						return;
					}
					else if (!isOpen) {
						this.open();
						e.stop();
						return;
					}
					break;

				case "Enter":
					if (isOpen) {
						this._setPreselectedItem();
						this.resetAllTextSelection();
						this.close();
						e.stop();
						return;
					}
					break;


				case "Escape":
					if (isOpen) {
						this.close();
						e.stop();
						return;
					}
					break;
			}

			if (isOpen) {
				this.base(arguments, e);
			}
			else if (this.getDropDownStyle() === "dropDownList") {
				this.getChildControl("list").handleKeyPress(e);
			}
		},

		/**
		 * AutoComplete implementation.
		 *
		 * @param e {qx.event.type.KeyInput} Keyboard event
		 */
		_onKeyAutoComplete: function (e) {

			if (this.isReadOnly())
				return;

			if (this.getDropDownStyle() === "dropDownList")
				return;

			// handle key inputs when we do have a textfield.
			if (this.__autoCompleteMode == 0)
				return;

			// automatically show the drop down?
			switch (this.__autoCompleteMode) {
				case 1: // suggest
				case 3: // suggestAppend
				case 4: // filter
					if (!this.getChildControl("popup").isVisible())
						this.open();
					break;
			}

			// process the key.
			switch (this.__autoCompleteMode) {
				case 1: // suggest
					this.__onKeyAutoCompleteSuggest(e);
					return;

				case 2: // append
				case 3: // suggestAppend
					this.__onKeyAutoCompleteAppend(e);
					break;

				case 4: // filter
					this.__onKeyAutoCompleteFilter(e);
					break;
			}
		},

		// process key inputs when the auto complete mode is "suggest".
		__onKeyAutoCompleteSuggest: function (e) {

			var list = this.getChildControl("list");
			list._onKeyInput(e);
			e.stop();

			if (this.getDropDownStyle() !== "dropDownList") {
				var textfield = this.getChildControl("textfield");
				textfield.selectAllText();
			}
		},

		// process key inputs when the auto complete mode is "append" or "suggestAppend".
		__onKeyAutoCompleteAppend: function (e) {

			var textfield = this.getChildControl("textfield");
			var text = textfield.getValue();
			text = text.substr(0, textfield.getTextSelectionStart()) + e.getChar();

			// find it in the drop down list.
			var list = this.getChildControl("list");
			var item = list.findItemByLabelFuzzy(text);

			// if found, append and select the remaining portion.
			if (item != null) {

				var itemText = this.__getItemText(item);
				if (itemText.length > text.length) {

					this.__suspendEvents = true;
					try {

						textfield.setValue(itemText);
						textfield.setTextSelection(text.length, itemText.length);
						e.stop();

					} finally {

						this.__suspendEvents = false;
					}
				}
			}
		},

		// process key inputs when the auto complete mode is "filter".
		__onKeyAutoCompleteFilter: function (e) {
			// TODO: Implement.
		},

		/**
		 * Reacts on value changes of the text field and syncs the
		 * value to the combobox.
		 *
		 * @param e {qx.event.type.Data} Change event
		 */
		_onTextFieldChangeValue: function (e) {

			if (!this.__suspendEvents) {

				// select the first item that matches the text.
				var text = e.getData();
				this.__synchListWithText(text);
			}

			this.fireDataEvent("changeValue", e.getData(), e.getOldData());
		},

		/***/
		__synchListWithText: function (text) {

			if (text == null)
				return;

			this.__suspendEvents = true;
			try {

				var list = this.getChildControl("list");

				// show/hide matching items, when auto complete mode = filter.
				if (this.__autoCompleteMode == 4)
					this.__filterListItems(text);

				// find the first item that matches the text.
				var item = list.findItem(text, false /*ignoreCase*/);

				// select the item only if the label is different, in order
				// to preserve the selected index for identical items.
				if (item) {

					var selection = list.getSelection();
					if (selection != null && selection.length > 0) {

						if (selection[0].getLabel() != text)
							list.setSelection([item]);
					}
					else {
						list.setSelection([item]);
					}
				}
				else {
					list.resetSelection();
				}
			}
			finally {
				this.__suspendEvents = false;
			}
		},

		/***/
		__filterListItems: function (text) {
			var items = this.getChildren();
			for (var i = 0, l = items.length; i < l; i++) {

				if (text) {
					var currentLabel = this.__getItemText(items[i]);
					if (currentLabel && currentLabel.toLowerCase().indexOf(text) > -1) {
						items[i].show();
					}
					else {
						items[i].exclude();
					}
				}
				else {
					items[i].show();
				}
			}
		},

		/**
		 * Creates the list item to add to the listbox.
		 */
		_createListItem: function (properties) {

			var item = new wisej.web.combobox.ListItem();
			item.setAppearance(this.getItemAppearance());
			item.set(properties);

			return item;
		},

		/**
		 * Returns the plain text for the item.
		 */
		__getItemText: function (item) {

			var text = null;

			if (item) {

				if (item.isRich()) {
					var control = item.getChildControl("label", true);
					if (control) {
						var labelNode = wisej.utils.Widget.ensureDomElement(control);
						if (labelNode) {
							text = qx.bom.element.Attribute.get(labelNode, "text") || "";
						}
						else {
							text = item.getLabel() || "";
							return qx.bom.String.unescape(text);
						}
					}
				} else {
					text = item.getLabel() || "";
				}
			}

			return text;
		},
	}
});


/**
 * wisej.web.combobox.ListItem
 *
 * Represents the items in the wisej.web.ComboBox.
 */
qx.Class.define("wisej.web.combobox.ListItem", {

	extend: qx.ui.form.ListItem,

	construct: function (text, icon) {

		this.base(arguments, text, icon);

		// display html and allow the item to extend horizontally.
		this.setRich(true);
		this.getChildControl("icon").setScale(true);
		this.getChildControl("label").setWrap(false);
	},

	properties: {

		/**
		 * The position of the item in the list control.
		 */
		index: { init: -1, check: "Integer" }
	},

	members: {

	}
});


/**
 * wisej.web.combobox.DropDown
 *
 * Shows the drop down list in a popup widget.
 */
qx.Class.define("wisej.web.combobox.DropDown", {

	extend: wisej.mobile.Popup,

	construct: function (owner) {

		if (qx.core.Environment.get("qx.debug"))
			this.assertNotNull(owner);

		this.owner = owner;
		this.base(arguments);

		this.setAutoHide(true);
		this.setKeepActive(true);
		this.setFont(owner.getFont());
		this.setPlacementModeX("best-fit");

		owner.addListener("changeFont", function (e) { this.setFont(owner.getFont()); }, this);

		// set the "owner" and "container" attributes for QA automation.
		this.addListener("changeVisibility", function (e) {
			if (this.isVisible())
				wisej.utils.Widget.setAutomationAttributes(this, this.owner);
		});
	},

	members: {

		/** the combobox that owns this drop down. */
		owner: null,

		canAutoHide: function (target) {
			var button = this.owner.getChildControl("button");
			return button !== target
				&& target !== this.owner
				&& !qx.ui.core.Widget.contains(button, target);
		}
	}
});


/**
 * wisej.web.UserComboBox
 *
 * Extends the wisej.web.ComboBox widget to support a custom control
 * in the drop-down popup.
 *
 */
qx.Class.define("wisej.web.UserComboBox", {

	extend: wisej.web.ComboBox,

	construct: function () {

		this.base(arguments);

		// close the custom drop when being hidden.
		this.addListener("disappear", this.__onDisappear, this);
	},

	properties: {

		/**
		 * DropDown property.
		 *
		 * Reference to the widget to place inside the drop down popup to replace the list control.
		 */
		dropDown: { init: null, nullable: true, apply: "_applyDropDown", transform: "_transformComponent" },

		/**
		 * DropDownWidth property.
		 *
		 * Sets the width of the custom dropdown. If 0, the width of the wrapped widget is used.
		 */
		dropDownWidth: { init: 0, check: "PositiveInteger", apply: "_applyDropDownWidth" },
	},

	members: {

		// interface implementation
		setValue: function (value) {

			var textfield = this.getChildControl("textfield");
			var labelfield = this.getChildControl("labelfield");

			if (textfield.isVisible()) {
				textfield.setValue(value);
			}
			else if (labelfield.isVisible()) {
				labelfield.setValue(value);
				labelfield.resetTextColor();
			}
		},

		/**
		 * Shows the dropdown popup.
		 */
		open: function () {

			this.base(arguments);

			var textField = this.getChildControl("textfield");
			if (textField.isVisible()) {
				textField.getFocusElement().focus();
				textField.selectAllText();
			}
		},

		/**
		 * Applies the readOnly property.
		 */
		_applyReadOnly: function (value, old) {
			var textField = this.getChildControl("textfield");
			textField.setReadOnly(value);
		},

		/**
		 * Applies the dropDown property.
		 */
		_applyDropDown: function (value, old) {

			this.getChildControl("list").setWrapped(value);
		},

		/**
		 * Applies the dropDownWidth property.
		 */
		_applyDropDownWidth: function (value, old) {

			var list = this.getChildControl("list");
			if (value == 0)
				list.resetWidth();
			else
				list.setWidth(value);
		},

		// overridden.
		_applyVisibility: function (value, old) {

			if (value !== "visible")
				this.close();

			this.base(arguments, value, old);
		},

		// overridden
		_onBlur: function (e) {
			// don't close the dropdown when losing the focus, it may be the wrapped drop down widget.
		},

		// close the drop down when being hidden.
		__onDisappear: function (e) {
			this.close();
		},

		// overridden
		_onKeyPress: function (e) {

			var isOpen = this.getChildControl("popup").isVisible();
			if (isOpen) {

				if (e.getKeyIdentifier() !== "Escape") {
					this.getChildControl("list").handleKeyPress(e);
					return;
				}
			}

			this.base(arguments, e);
		},

		// overridden
		_onPopupChangeVisibility: function (e) {

			this.base(arguments, e);

			var popup = this.getChildControl("popup");
			if (!popup.isVisible()) {

				qx.event.Idle.getInstance().removeListener("interval", this.__checkFocusedWidget, this);

				// close all popup widgets (most likely a context menu)
				// when the combobox dropdown list is closed.
				qx.ui.menu.Manager.getInstance().hideAll();
			}
			else {
				// check for a change in focus, this is the only
				// way to make sure the popup is closed only when the
				// focused is moved to another widget and not to a child
				// widget in the custom drop down.
				qx.event.Idle.getInstance().addListener("interval", this.__checkFocusedWidget, this);

			}
		},

		__checkFocusedWidget: function () {

			var focused = qx.ui.core.FocusHandler.getInstance().getFocusedWidget();
			if (focused && focused !== this && !qx.ui.core.Widget.contains(this, focused)) {
				var dropDown = this.getDropDown();
				if (focused !== dropDown && !qx.ui.core.Widget.contains(dropDown, focused)) {
					this.close();
				}
			}
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "textfield":
					control = this.base(arguments, id, hash);

					// don't close when losing the focus, the dropdown control
					// may requires the focus to operate.
					control.removeListener("blur", this.close, this);
					break;

				case "popup":
					control = this.base(arguments, id, hash);
					break;

				case "list":
					control = new wisej.web.userComboBox.DropDownWrapper(this).set({
						focusable: true,
						keepFocus: true,
						tabIndex: -1
					});
					break;

			}

			return control || this.base(arguments, id);
		},
	},

	destruct: function () {

		this.removeListener("disappear", this.__onDisappear, this);
	},
});


/**
 * wisej.web.userComboBox.DropDownWrapper
 *
 * Wraps the custom drop down control in a widget that
 * implements the same methods and properties as the 
 * qx.ui.form.List in order to preserve the base functionality.
 */
qx.Class.define("wisej.web.userComboBox.DropDownWrapper", {

	extend: qx.ui.core.Widget,

	include: [
		qx.ui.core.MRemoteChildrenHandling],

	construct: function (owner) {

		this.base(arguments);

		this.__owner = owner;
		this._setLayout(new qx.ui.layout.VBox());
		this.addListener("keypress", this._onKeyPress);
		this.addListener("focusin", this._onFocusIn, this);
		this.addListener("focusout", this._onFocusOut, this);
	},

	properties: {

		/**
		 * Wrapped property.
		 *
		 * Reference to the widget to wrap.
		*/
		wrapped: { init: null, nullable: true, apply: "_applyWrapped" },
	},

	members: {

		/** @type {wisej.web.UserComboBox} The owner control. */
		__owner: null,

		/** void method */
		findItem: function () { return; },

		/**
		 * Applies the wrapped property.
		 */
		_applyWrapped: function (value, old) {

			if (old) {

				this._remove(old);
				old.removeState("inner");
			}

			if (value) {

				value.addState("inner");
				value.resetUserBounds();
				value.setLayoutProperties({ flex: 1 });

				if (value.setBorderStyle)
					value.setBorderStyle("none");

				this._add(value);
			}
		},

		_onFocusIn: function (e) {
			this.__owner.addState("focused");
		},

		_onFocusOut: function (e) {
			this.__owner.removeState("focused");
		},

		_onKeyPress: function (e) {

			var key = e.getKeyIdentifier();
			switch (key) {

				case "Escape":
					this.__owner.close();
					e.stop();
					break;
			}
		},

		/**
		 * Route keyboard events to the wrapped control.
		 */
		handleKeyPress: function (e) {

			var wrapped = this.getWrapped();
			if (wrapped && wrapped._onKeyPress)
				wrapped._onKeyPress(e);
		},


		/*
		---------------------------------------------------------------------------
		  Empty "list" implementation to keep this class compatible with the
		  base implementation of the ComboBox.
		---------------------------------------------------------------------------
		*/

		findItem: function () { },
		findItemByLabelFuzzy: function () { },
		getValue: function () { },
		getSelection: function () { },
		setSelection: function () { },
		resetSelection: function () { },
		getSelectionContext: function () { },
	},

});