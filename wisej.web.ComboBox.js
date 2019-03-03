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

		// hovered event handlers.
		this.addListener("pointerover", this._onPointerOver, this);
		this.addListener("pointerout", this._onPointerOut, this);

		// any action on the textbox marks it as dirty to update the state on the server
		// also when the selection and the caret have changed.
		var textField = this.getChildControl("textfield");
		textField.addListener("keydown", function (e) { this.setDirty(true); }, this);
		textField.addListener("mousedown", function (e) { this.setDirty(true); }, this);

		// handle event for the autocomplete feature.
		textField.addListener("input", this._onInput, this);
		this.addListener("keyinput", this._onKeyInput, this);

		// handle the native event "oncopy" to update the clipboard on the server.
		textField.getContentElement().addListener("copy", this.__onCopy, this);

		// register for the Enter or Esc keys at the document level to execute
		// also when they map to a shortcut.
		qx.event.Registration.addListener(document.documentElement, "keydown", this.__onDocumentKeyDown, this, true);

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
		 * Property defined with the setter/getter methods to save memory and not save a copy of the items.
		 */
		// items: { init: null, check: "Map", nullable: true, apply: "_applyItems" },

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
		 * The maximum height of the list popup. Setting this value to
		 * <code>null</code> or 0 will set cause the list to be auto-sized.
		 * 
		 */
		maxListWidth: { init: null, check: "PositiveInteger", apply: "_applyMaxListWidth", nullable: true },

		/**
		 * The maximum height of the list popup. Setting this value to
		 * <code>null</code> or 0 will set cause the list to be auto-sized.
		 */
		maxListHeight: { init: 400, refine: true },

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
		autoCompleteMode: { init: "none", check: ["none", "suggest", "append", "suggestAppend", "filter", "appendFilter"], apply: "_applyAutoCompleteMode" },

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
		 * ItemHeight property.
		 * 
		 * Sets the height of the items in the drop-down list in pixels. 
		 * When set to <code>null</code> or 0 it uses the value in the theme if present otherwise it adapts to the
		 * size of the items. The default is null;
		 * 
		 * For the VirtualComboBox, all items must have the same height so when this value is null, it uses the
		 * height of the largest item used also to calculate he maximum width.
		 */
		itemHeight: { init: null, check: "Integer", apply: "_applyItemHeight", nullable: true, themeable: true },

		/**
		 * Determines the appearance of child items.
		 */
		itemAppearance: { init: "listitem", themeable: true }
	},

	members: {

		// cached auto complete mode.
		_autoCompleteMode: 0,

		// suspend event dispatching.
		_suspendEvents: false,

		// item to select at the next "Down" key press.
		_suggestedItem: null,

		/**
		 * Shows the list popup.
		 *
		 * Overridden to disable the live update of the popup when the
		 * dropdown list is always visible: "simple" style.
		 */
		open: function () {

			var popup = this.getPopup();
			var list = this.getDropDownList();

			switch (this.getDropDownStyle()) {
				case "simple":
					popup.placeToWidget(this);
					popup.show();
					break;

				case "dropDown":
					var textField = this.getChildControl("textfield");
					if (textField.isVisible()) {
						textField.getFocusElement().focus();
					}
					var me = this;
					setTimeout(function () { popup.open(me, true); }, 1);
					break;

				case "dropDownList":
					popup.open(this, true);
					break;
			}
		},

		/**
		 * Hides the list popup.
		 */
		close: function () {
			this.getPopup().hide();
		},

		/**
		 * Get/set the Selection property.
		 * 
		 * This is the text selected in the editable portion of the combobox.
		 * It's not the selected items in the drop-down list.
		 * 
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
				var popup = this.getPopup();
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
		 * Adds, removes, updates the items in the data model.
		 *
		 * @param {Map} items Items to add, remove or updates. The map contains:
		 *	<code>clear:true</code> Clears the data model.
		 *	<code>added:[{}]</code> Adds the specified data items to the model.
		 *	<code>modified:[{}]</code> Updates the specified data items in the model.
		 *	<code>deleted:[1, 2, 3]</code> Indexes of the items to delete from the model.
		 */
		setItems: function (items) {

			this._suggestedItem = null;

			if (items == null)
				return;

			this._suspendEvents = true;
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
					var added = items.added;
					for (var i = 0; i < added.length; i++) {
						var index = added[i].index;
						var item = this._createListItem(added[i]);
						this.addAt(item, index);
					}
				}

				// apply modified items.
				if (items.modified && items.modified.length > 0) {
					var modified = items.modified;
					for (var i = 0; i < modified.length; i++) {
						var index = modified[i].index;

						if (index < 0 || index >= children.length)
							throw new Error("index out of bounds: " + index + " (0.." + children.length + ")");

						children[index].set(modified[i]);
					}
				}

				// remove deleted items.
				if (items.deleted && items.deleted.length > 0) {
					var deleted = items.deleted;
					for (var i = deleted.length - 1; i >= 0; i--) {

						var index = deleted[i];

						if (index < 0 || index >= children.length)
							throw new Error("index out of bounds: " + index + " (0.." + children.length + ")");

						children[index].destroy();
					}
				}

				// update the displayed text in the textfield.
				this.setSelectedIndex(selectedIndex);


			} finally {

				this._suspendEvents = false;
			}

		},

		/**
		 * Applies the MaxLength property.
		 */
		_applyMaxLength: function (value, old) {

			this.getChildControl("textfield").setMaxLength(value);
		},

		/**
		 * Applies the MaxListWidth property.
		 */
		_applyMaxListWidth: function (value, old) {

			if (value === 0)
				value = null;

			this.getDropDownList().setMaxWidth(value);
		},

		/**
		 * Applies the MaxListHeight property.
		 */
		_applyMaxListHeight: function (value, old) {

			if (value === 0)
				value = null;

			this.getDropDownList().setMaxHeight(value);
		},

		/**
		 * Applies the ItemHeight property.
		 */
		_applyItemHeight: function (value, old) {

			if (value === null || value < 0) {
				this.resetItemHeight();
				return;
			}

			var items = this.getChildren();
			for (var i = 0; i < items.length; i++) {
				items[i].setHeight(value);
			}
		},

		/**
		 * Applies the CharacterCasing property.
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

			var list = this.getDropDownList();
			list.setEnableInlineFind(!value);

			// preserve the selection when toggling read-only mode.
			this._suspendEvents = true;
			this.setListSelectionMode(value ? "none" : "single");
			this._suspendEvents = false;
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

			if (this.getDropDownStyle() === "simple")
				return;

			this.getDropDownList().setMaxHeight(value);
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

			if (value === old)
				return;

			this._suspendEvents = true;
			try {

				var list = this.getDropDownList();

				if (value == null || value === -1) {
					this.setListSelectedItem(null);
				}
				else {
					var children = this.getChildren();
					var item = children[value];
					if (item)
						this.setListSelectedItem(item);
				}
			} finally {

				this._suspendEvents = false;
			}
		},

		/**
		 * Applies the droppedDown property.
		 */
		isDroppedDown: function () {

			return this.getPopup().isVisible();
		},
		getDroppedDown: function () {

			return this.getPopup().isVisible();
		},
		setDroppedDown: function (value) {

			if (this.isVisible()) {

				if (this.getDroppedDown() !== value) {
					value
						? this.open()
						: this.close();
				}
			}
		},

		/**
		 * Returns the popup widget used to host the drop down list.
		 */
		getPopup: function () {

			if (!this.__popup)
				this.__popup = this.getChildControl("popup");

			return this.__popup;

		},
		__popup: null,

		/**
		 * Returns the drop down list.
		 */
		getDropDownList: function () {

			if (!this.__dropDownList)
				this.__dropDownList = this.getChildControl("list");

			return this.__dropDownList;
		},
		__dropDownList: null,

		/**
		 * Returns the currently selected item in the drop-down list.
		 *
		 * @returns {qx.ui.form.ListItem} Currently selected item.
		 */
		getListSelectedItem: function () {

			var list = this.getDropDownList();
			var selection = list.getSelection();
			if (selection && selection.length > 0)
				return selection[0];

			return null;
		},

		/**
		 * Selects the item in the drop-down list.
		 * 
		 * @param {qx.ui.form.ListItem} item The item to select, null to reset the selection.
		 */
		setListSelectedItem: function (item) {

			var list = this.getDropDownList();
			if (!item)
				list.resetSelection();
			else
				list.setSelection([item]);
		},

		/**
		 * Sets the selection mode in the drop-down list selection manager.
		 *
		 * @param {String} mode Selection mode.
		 */
		setListSelectionMode: function (mode) {

			this.getDropDownList().setSelectionMode(mode);
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

			var list = this.getDropDownList();

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
					list.resetMaxWidth();
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
					this.getPopup().add(list);
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

			this._autoCompleteMode = ["none", "suggest", "append", "suggestAppend", "filter", "appendFilter"].indexOf(value);
			this._autoCompleteMode = Math.max(0, this._autoCompleteMode);
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

					// disable browser's autocomplete.
					control.getContentElement().setAttribute("autocomplete", "off");
					break;

				case "popup":
					control = new wisej.web.combobox.DropDown(this);
					control.add(this.getDropDownList());
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
					control = new wisej.web.combobox.DropDownList().set({
						focusable: false,
						keepFocus: true,
						height: null,
						width: null,
						maxWidth: this.getMaxListWidth(),
						maxHeight: this.getMaxListHeight(),
						selectionMode: "one",
						quickSelection: false
					});

					control.addListener("changeSelection", this._onListChangeSelection, this);
					control.addListener("pointerdown", this._onListPointerDown, this);
					control.getChildControl("pane").addListener("tap", this.close, this);
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

			var popup = this.getPopup();
			var popupIsVisible = popup.isVisible();

			// adjust the size of the drop-down list.
			if (popupIsVisible)
				this._adjustListSize();

			// prevent firing on change of visibility from "hidden" to "excluded" or vice versa.
			if (!popupIsVisible && e.getOldData() !== "visible")
				return;

			// notify the server the drop down list was opened or closed.
			this.fireEvent(popupIsVisible ? "open" : "close");

			// restore the focus to this widget when the popup is closed.
			if (!popupIsVisible && e.getOldData() === "visible") {
				if (this.isFocusable())
					this.tabFocus();
			}

			// Synchronize the list with the current value on every
			// opening of the popup. This is useful because through
			// the quick selection mode, the list may keep an invalid
			// selection on close or the user may enter text while
			// the combobox is closed and reopen it afterwards.
			if (popupIsVisible) {
				this.__synchListWithText(this.getValue());
			}

			// In all cases: Remove focused state from button
			this.getChildControl("button").removeState("selected");
		},

		/**
		 * Adjusts the size of the drop-down list.
		 */
		_adjustListSize: function () {

			var list = this.getDropDownList();
			var maxWidth = this.getMaxListWidth();
			var maxHeight = this.getMaxListHeight();

			if (maxWidth > 0)
				list.setMaxWidth(maxWidth);
			else
				list.setMaxWidth(window.innerWidth);

			if (maxHeight > 0)
				list.setMaxHeight(maxHeight);
			else
				list.setMaxHeight(window.innerHeight);
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

			this._suggestedItem = null;

			// don't change when read-only, unless it's processing
			// a server request.
			if (this.isReadOnly() && !this.core.processingActions) {
				return;
			}

			// save the suspendEvents state.
			var suspendEvents = this._suspendEvents;

			this._suspendEvents = true;
			try {
				var current = e.getData();
				var icon = this.getChildControl("icon");
				var labelfield = this.getChildControl("labelfield");

				if (current && current.length > 0) {

					var item = current[0];
					var index = this.indexOf(item);

					// update the textfield.
					this.setValue(this._getItemText(item));
					this.selectAllText();

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

						// prevent the state change from updating the control or
						// we may get the SelectedIndexChanged event twice.
						if (this.getDropDownStyle() !== "dropDownList") {
							this.updateState("value");
						}
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
				this._suspendEvents = suspendEvents;
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
			var isOpen = this.isDroppedDown();
			try {
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

					case "Home":
					case "End":
						if (this.getDropDownStyle() !== "dropDownList")
							return;
						break;

					case "Left":
					case "Right":
						return;
				}

				var list = this.getDropDownList();
				if (isOpen) {

					// special case when pressing "Down" and the list is scrolled.
					// we want to select the first visible item in the list.
					if (key === "Down" && this._suggestedItem) {
						this.setListSelectedItem(this._suggestedItem);
					}
					else {

						this.base(arguments, e);
					}
				}
				else if (e.getModifiers() === 0) {
					list.handleKeyPress(e);
				}
			}
			finally {
				this._suggestedItem = null;
			}
		},

		/**
		 * Event handler for the "keydown" accelerator even at the
		 * document level. Needed to close the drop down also when
		 * the app registered a shortcut for Enter or Escape.
		 * 
		 * @param {any} e The event data.
		 */
		__onDocumentKeyDown: function (e) {

			switch (e.getKeyIdentifier()) {

				case "Enter":
					if (this.isDroppedDown()) {
						this._setPreselectedItem();
						this.resetAllTextSelection();
						this.close();
						e.stop();
						return;
					}
					break;

				case "Escape":
					if (this.isDroppedDown()) {
						this.close();
						e.stop();
						return;
					}
					break;
			}
		},

		/**
		 * Event handle for the "keyinput" event.
		 * 
		 * Redirects the event to the drop down list when
		 * the dropDownStyle = "dropDownList", hence we don't have
		 * an editable field.
		 */
		_onKeyInput: function (e) {

			if (this.isReadOnly())
				return;

			if (this.getDropDownStyle() === "dropDownList") {

				// Use the incremental selection using the typed characters
				// implemented in the list control.

				// It saves the string for about 1000ms and uses it to select
				// the nex item in the list.This is the same as the ListBox
				// keyboard selection behavior.

				this.getDropDownList()._onKeyInput(e);
			}
		},

		/**
		 * Event handle for the "input" event.
		 * 
		 * This is the autoComplete implementation. We have 5 behaviors when the user types:
		 * 
		 *	- 0 "none":				Scrolls the list (if open) to the first item that matches the text.
		 *	- 1 "suggest":			Same as "none" but it opens the list automatically when the user starts typing.
		 *	- 2 "append":			Same as "none" but it appends the remaining portion of item that matches to the typed text.
		 *	- 3 "suggestAppend":	Same as "suggest" + "append".
		 *	- 4 "filter":			Opens the list automatically and filters only the items that start with the typed text.
		 *		
		 * @param {qx.event.type.Data} e Event data.
		 */
		_onInput: function (e) {

			if (this.isReadOnly())
				return;

			if (this.getDropDownStyle() === "dropDownList")
				return;

			// automatically show the drop down?
			switch (this._autoCompleteMode) {

				case 1: // suggest
				case 3: // suggestAppend
				case 4: // filter
					if (!this.isDroppedDown())
						this.open();
					break;
			}

			// process the input event.
			var text = e.getData();
			switch (this._autoCompleteMode) {

				case 0: // none
				case 1: // suggest
					this.__onInputAutoCompleteSuggest(text);
					return;

				case 2: // append
				case 3: // suggestAppend
					this.__onInputAutoCompleteAppend(text);
					break;

				case 4: // filter
					this.__onInputAutoCompleteFilter(text);
					break;

				case 5: // appendFilter
					this.__onInputAutoCompleteFilter(text);
					this.__onInputAutoCompleteAppend(text);
					break;
			}
		},

		__onInputAutoCompleteSuggest: function (text) {

			var list = this.getDropDownList();
			this.setListSelectedItem(null);

			if (!text)
				return;

			var item = list.findItemByLabelFuzzy(text);
			if (item) {
				this._suggestedItem = item;
				list.scrollItemIntoView(item);
			}
		},

		// process key inputs when the auto complete mode is "append" or "suggestAppend".
		__onInputAutoCompleteAppend: function (text) {

			var list = this.getDropDownList();
			this.setListSelectedItem(null);

			if (!text)
				return;

			var textfield = this.getChildControl("textfield");

			// find the first item that matches the text.
			var item = list.findItemByLabelFuzzy(text);

			// if found, append and select the remaining portion.
			if (item) {

				// same as "suggest".
				this._suggestedItem = item;
				list.scrollItemIntoView(item);

				// append and select.
				var itemText = this._getItemText(item);
				if (itemText.length > text.length) {

					this._suspendEvents = true;
					try {

						textfield.setValue(itemText);
						textfield.setTextSelection(text.length, itemText.length);
					} finally {

						this._suspendEvents = false;
					}
				}
			}
		},

		// process key inputs when the auto complete mode is "filter".
		__onInputAutoCompleteFilter: function (text) {

			if (this._suspendEvents)
				return;

			var me = this;
			clearTimeout(this.__autoCompleteFilterTimer);
			this.__autoCompleteFilterTimer = setTimeout(function () {

				me.__autoCompleteFilterTimer = 0;

				var list = me.getDropDownList();
				me.setListSelectedItem(null);
				me._filterListItems(list, text);

				// prepare the first matching item if the user presses the arrow down.
				var item = list.findItemByLabelFuzzy(text);
				if (item) {
					me._suggestedItem = item;
				}

			}, 250);

		},
		__autoCompleteFilterTimer: 0,

		/**
		 * Reacts on value changes of the text field and syncs the
		 * value to the combobox.
		 *
		 * @param e {qx.event.type.Data} Change event
		 */
		_onTextFieldChangeValue: function (e) {

			if (!this._suspendEvents) {

				// select the first item that matches the text.
				var text = e.getData();
				this.__synchListWithText(text);
			}

			this.fireDataEvent("changeValue", e.getData(), e.getOldData());
		},

		/***/
		__synchListWithText: function (text) {

			this._suspendEvents = true;
			try {

				var list = this.getDropDownList();

				if (!text) {
					this.setListSelectedItem(null);
					return;
				}

				// find the first item that matches the text.
				var item = list.findItem(text, false /*ignoreCase*/);

				// select the item only if the label of the currently selected item is different
				// from the text in the editable field, in order to preserve the selected index for identical items.
				if (item) {

					var selected = this.getListSelectedItem();
					if (selected) {
						if (this._getItemText(selected) !== text)
							this.setListSelectedItem(item);
					}
					else {
						this.setListSelectedItem(item);
					}
				}
				else {
					this.setListSelectedItem(null);
				}
			}
			finally {
				this._suspendEvents = false;
			}
		},

		// shows or hides the list items that match the text.
		// should be used with the "filter" auto complete mode.
		_filterListItems: function (list, text) {

			var items = list.getChildren();
			for (var i = 0, l = items.length; i < l; i++) {

				var label = this._getItemText(items[i]);
				if (this.onFilterListItem(label, text))
					items[i].show();
				else
					items[i].exclude();
			}

			// fix chrome graphic accelerator bug: when hiding showing elements
			// quickly chrome may not update the screen correctly.
			list.getContentElement().setStyle("transform", "rotateZ(0deg)");
		},

		/**
		 * Default implementation of list the items filter.
		 * An application may replace this method with a custom function.
		 * 
		 * @param {any} label Label of the item being filtered.
		 * @param {any} text Text typed by the user.
		 * @returns {Boolean} true if the item show be visible, false to hide it.
		 */
		onFilterListItem: function (label, text) {

			if (text && label) {
				// match the beginning of the label. case insensitive.
				if (label.toLowerCase().indexOf(text.toLowerCase()) === 0)
					return true; // show.
			}
			else {
				// show the text is empty.
				return true;
			}

			// hide.
			return false;
		},

		/**
		 * Creates the list item to add to the listbox.
		 */
		_createListItem: function (properties) {

			var item = new wisej.web.combobox.ListItem();
			item.setHeight(this.getItemHeight());
			item.setAppearance(this.getItemAppearance());
			item.set(properties);

			return item;
		},

		/**
		 * Returns the plain text for the item.
		 */
		_getItemText: function (item) {

			var text = null;

			if (item) {
				text = item.getLabel() || "";
				text = qx.bom.String.toText(text);
			}

			return text;
		}
	},

	destruct: function () {

		// un-register the Enter or Esc accelerators.
		qx.event.Registration.removeListener(document.documentElement, "keydown", this.__onDocumentKeyDown, this, true);

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
		this.getChildControl("label").getContentElement().setStyle("textOverflow", "ellipsis");
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
 * wisej.web.combobox.DropDownList
 *
 * Represents the list inside the wisej.web.combobox.DropDown popup.
 */
qx.Class.define("wisej.web.combobox.DropDownList", {

	extend: qx.ui.form.List,

	construct: function () {

		this.base(arguments);

	},

	members: {

		/**
		 * Scrolls the specified item to the top of the list, or to the
		 * closest position.
		 * 
		 * @param {wisej.web.combobox.ListItem} item Item to scroll.
		 */
		scrollItemIntoView: function (item) {

			this.scrollChildIntoView(item, "left", "top", true);

		},

		/**
		 * Find an item by its {@link qx.ui.basic.Atom#getLabel}.
		 * 
		 * Overridden to skip items that are not visible or disabled.
		 *
		 * @param {String} search A label or any item.
		 * @param {Boolean} ignoreCase Whether to use case insensitive comparison.
		 * @return {qx.ui.form.ListItem} The found ListItem or null.
		 */
		findItem: function (search, ignoreCase) {

			// lowercase search
			if (ignoreCase !== false) {
				search = search.toLowerCase();
			}

			// get all items of the list
			var items = this.getChildren();
			var item;

			// go through all items
			for (var i = 0, l = items.length; i < l; i++) {

				item = items[i];

				// skip not visible or disabled items.
				if (!item.isEnabled())
					continue;

				// search the label text, whether it's html or not.
				var label = this._getItemText(item);

				if (label != null) {
					if (label.translate) {
						label = label.translate();
					}
					if (ignoreCase !== false) {
						label = label.toLowerCase();
					}

					if (label.toString() === search.toString()) {
						return item;
					}
				}
			}

			return null;
		},

		/**
		 * Takes the given string and tries to find a ListItem
		 * which starts with this string. The search is not case sensitive and the
		 * first found ListItem will be returned. If there could not be found any
		 * qualifying list item, null will be returned.
		 * 
 		 * Overridden to skip items that are not visible or disabled.
		 *
		 *
		 * @param {String} search The text with which the label of the ListItem should start with.
		 * @param {Integer} startIndex The index to start the search from.
		 * @return {qx.ui.form.ListItem} The found ListItem or null
		 */
		findItemByLabelFuzzy: function (search, startIndex) {

			// lower case search text
			search = search.toLowerCase();

			// get all items of the list
			var items = this.getChildren();
			var item;

			// go through all items
			startIndex = Math.max(0, Math.min(startIndex + 1 || 0, items.length));
			for (var i = startIndex, l = items.length; i < l; i++) {

				item = items[i];

				// skip not visible or disabled items.
				if (!item.isEnabled())
					continue;

				// get the label of the current item
				var currentLabel = this._getItemText(item);

				// if the label fits with the search text (ignore case, begins with)
				if (currentLabel && currentLabel.toLowerCase().indexOf(search) === 0) {
					// just return the first found element
					return item;
				}
			}

			// wrap?
			if (startIndex > 0) {
				for (var i = 0, l = startIndex; i < l; i++) {

					item = items[i];

					// skip not visible or disabled items.
					if (!item.isEnabled())
						continue;

					// get the label of the current item
					var currentLabel = this._getItemText(item);

					// if the label fits with the search text (ignore case, begins with)
					if (currentLabel && currentLabel.toLowerCase().indexOf(search) === 0) {
						// just return the first found element
						return item;
					}
				}
			}

			// if no element was found, return null
			return null;
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

		// close the custom drop down when being hidden.
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
		dropDownWidth: { init: 0, check: "PositiveInteger", apply: "_applyDropDownWidth" }
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

		// overridden.
		open: function () {

			this.base(arguments);

			var textField = this.getChildControl("textfield");
			if (textField.isVisible()) {
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

			this.getDropDownList().setWrapped(value);
		},

		/**
		 * Applies the dropDownWidth property.
		 */
		_applyDropDownWidth: function (value, old) {

			var list = this.getDropDownList();
			if (value === 0)
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

			var isOpen = this.isDroppedDown();
			if (isOpen) {

				if (e.getKeyIdentifier() !== "Escape") {
					this.getDropDownList().handleKeyPress(e);
					return;
				}
			}

			this.base(arguments, e);
		},

		// overridden
		_onPopupChangeVisibility: function (e) {

			this.base(arguments, e);

			var popup = this.getPopup();
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
		getSelectionContext: function () { }
	}

});