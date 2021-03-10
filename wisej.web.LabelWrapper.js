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
 * wisej.web.LabelWrapper
 * 
 * Wraps an editor to add a related label.
 */
qx.Class.define("wisej.web.LabelWrapper", {

	extend: wisej.web.Control,

	include: [
		qx.ui.core.MContentPadding
	],

	/**
	 */
	construct: function () {

		this.base(arguments, new wisej.web.labelWrapper.Layout());

		this._createChildControl("label");

		this.setTabStop(false);
		this.addListener("focusin", this._onFocusIn);
		this.addListener("focusout", this._onFocusOut);
	},

	properties: {

		appearance: { init: "label-wrapper", refine: true },

		/**
		 * Label property.
		 */
		text: { init: "", check: "String", apply: "_applyText" },

		/**
		 * Position property.
		 */
		position: {
			init: "top",
			check: ["left", "top", "right", "bottom", "inside"], apply: "_applyPosition"
		},

		/**
		 * TextAlign property.
		 */
		textAlign: {
			init: "middleLeft",
			apply: "_applyTextAlign",
			check: ["topRight", "middleRight", "bottomRight", "topLeft", "topCenter", "middleLeft", "middleCenter", "bottomLeft", "bottomCenter"],
		},

		/**
		 * AutoEllipsis property.
		 */
		autoEllipsis: { init: false, check: "Boolean", apply: "_applyAutoEllipsis" },

		/**
		 * Mnemonic property.
		 * 
		 * Defines the accelerator key that sets the focus to the editor
		 * associated with this LabelWrapper.
		 */
		mnemonic: { init: null, nullable: true, check: "String", apply: "_applyMnemonic", event: "changeMnemonic" },

		/**
		 * Size property.
		 * 
		 * Defines the size of the label widget either in pixels or percentage, depending
		 * on the value of SizeType.
		 */
		size: { init: 0, check: "Integer", apply: "_applySize" },

		/**
		 * MaxSize property.
		 * 
		 * Defines the maximum width (when Position is Left or Right) or the
		 * maximum height (when Position is Top or Bottom) in pixels.
		 */
		maxSize: { init: 0, check: "Integer", apply: "_applyMaxSize" },

		/**
		 * MinSize property.
		 * 
		 * Defines the minimum width (when Position is Left or Right) or the
		 * minimum height (when Position is Top or Bottom) in pixels.
		 */
		minSize: { init: 0, check: "Integer", apply: "_applyMinSize" },

		/**
		 * SizeType property.
		 * 
		 * Determines how to compute the size of the label widget.
		 */
		sizeType: { init: "autoSize", check: ["autoSize", "absolute", "percent"], apply: "_applySizeType" },

		/**
		 * LabelFont property.
		 * 
		 * Applies the font to the label only, without affecting child widgets.
		 */
		labelFont: { init: null, nullable: true, check: "Font", apply: "_applyLabelFont" }

		/**
		 * Wrapped editor.
		 * 
		 * Represent the wrapper editor widget. It takes a JSON definition
		 * that is used to create the wrapped widget at first, and then used
		 * to update it.
		 * 
		 * Property set through the setter/getter methods.
		 */
		// editor: {}
	},

	members: {

		/** wrapped editor widget */
		_editor: null,

		// overridden.
		_forwardStates: {
			focused: true,
			hovered: true,
			full: true, // means that the editor contains a value.
			top: true,
			left: true,
			right: true,
			bottom: true,
			inside: true,
			multiline: true
		},

		/**
		 * Applies the Text property.
		 */
		_applyText: function (value, old) {

			this.getLabel().setValue(value);
		},

		/**
		 * Applies the font property.
		 */
		_applyLabelFont: function (value, old) {

			var label = this.getLabel();
			var editor = this.getEditor();

			// if the font being set is null:
			if (!value) {

				// use the font set in the theme.
				label.syncAppearance();
				value = qx.util.PropertyUtil.getThemeValue(label, "font");

				// otherwise use the font set on the wrapped editor.
				if (!value && editor)
					value = editor.getFont();
			}

			if (!value)
				this.resetFont();
			else
				label.setFont(value);
		},

		/**
		 * Applies the TextAlign property.
		 */
		_applyTextAlign: function (value, old) {

			if (this.getPosition() !== "inside")
				this.getLabel().setTextAlign(value);
		},

		/**
		 * Applies the AutoEllipsis property.
		 */
		_applyAutoEllipsis: function (value, old) {

			this.getLabel().setAutoEllipsis(value);
		},

		/**
		 * Applies the Mnemonic property.
		 */
		_applyMnemonic: function (value, old) {

			this.getLabel().setMnemonic(value);
		},

		/**
		 * Applies the Size property.
		 */
		_applySize: function (value, old) {

			this.updateLayout();
		},

		/**
		 * Applies the MaxSize property.
		 */
		_applyMaxSize: function (value, old) {

			this.updateLayout();
		},

		/**
		 * Applies the MinSize property.
		 */
		_applyMinSize: function (value, old) {

			this.updateLayout();
		},

		/**
		 * Applies the SizeType property.
		 */
		_applySizeType: function (value, old) {

			this.updateLayout();
		},

		/**
		 * Applies the Position property.
		 */
		_applyPosition: function (value, old) {

			this.removeState(old);
			this.addState(value);

			var label = this.getLabel();
			var editor = this.getEditor();
			var labelEl = label.getContentElement();
			var textfield = editor ? editor.getChildControl("textfield", true) : null;
			var labelfield = editor ? editor.getChildControl("labelfield", true) : null;

			switch (value) {
				case "inside":

					label.resetTextAlign();
					labelEl.setStyles({
						"disabled": "disabled",
						"pointer-events": "none"
					});

					if (textfield)
						textfield.setAlignY("bottom");
					if (labelfield)
						labelfield.setAlignY("bottom");

					// special case for multiline TextBox with label inside.
					// add the label height to the inner padding.
					if (editor instanceof wisej.web.TextArea) {
						editor.setPaddingTop(label.getSizeHint().height);
					}

					break;

				default:
					labelEl.setStyles({
						"disabled": null,
						"pointer-events": null
					});

					if (textfield)
						textfield.resetAlignY();
					if (labelfield)
						labelfield.resetAlignY();

					// special case for multiline TextBox with label inside.
					// add the label height to the inner padding.
					if (editor instanceof wisej.web.TextArea) {
						editor.resetPaddingTop();
					}

					break;
			}

			this.updateLayout();
		},

		/**
		 * Schedules the update of label size and layout.
		 *
		 */
		updateLayout: function () {

			qx.ui.core.queue.Layout.add(this);
		},

		/**
		 * Returns the element to use to set accessibility attributes.
		 *
		 */
		getAccessibilityTarget: function () {

			var editor = this.getEditor();
			if (editor && editor.getAccessibilityTarget)
				return editor.getAccessibilityTarget();

			return editor;
		},

		/**
		 * Returns the wrapped label.
		 */
		getLabel: function () {

			return this.getChildControl("label");
		},

		/**
		 * Returns the wrapped editor.
		 */
		getEditor: function () {

			return this._editor;
		},

		/**
		 * Creates or updates the wrapped editor.
		 */
		setEditor: function (value) {

			if (!value)
				return;

			var config = value;

			if (this._editor) {

				delete config.root;
				delete config.className;
				delete config.webMethods;

				// update the wrapped widget.
				this._editor.__inSetState = true;
				try {
					this._editor.set(config);
				}
				catch (error) {
					if (this.core)
						this.core.logError(error);
				}
				this._editor.__inSetState = false;
			}
			else {

				// find the widget class
				var className = config.className;

				delete config.root;
				delete config.className;
				delete config.webMethods;

				if (!className)
					throw new Error("Null class name.");

				var widgetClass = qx.Class.getByName(className);
				if (!widgetClass)
					throw new Error("Unknown class name: " + className);

				try {

					config.allowGrowY = true;
					config.allowGrowX = true;

					// create the QX component.
					var comp = new widgetClass();

					comp.set(config);
					comp.addState("inner");

					this.add(comp);

					this._editor = comp;
					this._replaceGetSetDirty();
					this._applyName(this.getName());
					this._applyPosition(this.getPosition());

					if (this._editor.getValue) {

						var editorValue = this._editor.getValue();
						if (editorValue !== null && editorValue !== "")
							this.addState("full");

						this._editor.addListener("changeValue", this._onEditorChangeValue, this);
						this._editor.addListener("changeSelectedIndex", this._onEditorChangeSelectedIndex, this);
					}

					// propagate up the multiline state when wrapping a textarea.
					if (this._editor.hasState("multiline"))
						this.addState("multiline");
				}
				catch (error) {

					if (this.core)
						this.core.logError(error);
				}

				// done
				return comp;
			}
		},

		/**
		 * Filters the state collected by MWisejControl.updateState().
		 */
		getState: function (state) {

			var editor = this.getEditor();
			if (!editor)
				return;

			// add the state from the inner editor.
			var name;
			var properties = editor.getStateProperties();
			for (var i = 0, l = properties.length; i < l; i++) {
				name = properties[i];
				if (state[name] === undefined) {
					state[name] = editor.get(name);
				}
			}

			return state;
		},

		// use this get/setDirty in place of the wrapped editor's.
		_replaceGetSetDirty: function () {

			this._editor.getDirty = this.getDirty.bind(this);
			this._editor.setDirty = this.setDirty.bind(this);
		},

		// dispatches the events fired by the wrapped editor
		// to the LabelWrapper since this is the widget wired on the server side.
		_relayEvent: function (e) {

			var evt = e.clone();
			evt.setBubbles(false);
			this.dispatchEvent(evt);
		},

		_onFocusIn: function (e) {
			this.addState("focused");
		},

		_onFocusOut: function (e) {
			this.removeState("focused");
		},

		_onEditorChangeValue: function (e) {

			var value = e.getData();
			if (value !== null && value !== "")
				this.addState("full");
			else
				this.removeState("full");
		},

		_onEditorChangeSelectedIndex: function (e) {

			var value = e.getData();
			if (value > -1)
				this.addState("full");
			else
				this.removeState("full");
		},

		__isVertical: function (position) {

			return position === "top" || position === "bottom";
		},

		/*---------------------------------------------------------------------------
		  qx.ui.core.MContentPadding
		---------------------------------------------------------------------------*/

		_getContentPaddingTarget: function () {

			return this.getLabel();
		},

		/*---------------------------------------------------------------------------
		  focus redirection overrides
		---------------------------------------------------------------------------*/

		tabFocus: function () {

			if (this._editor)
				this._editor.tabFocus();
		},

		focus: function () {

			if (this._editor)
				this._editor.focus();
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "label":
					control = new wisej.web.Label().set({
						anonymous: true,
						focusable: false
					});
					var el = control.getContentElement();
					el.setAttribute("role", "label");

					this.add(control);
					break;
			}

			return control || this.base(arguments, id);
		},

		// overridden
		addState: function (state) {

			this.base(arguments, state);

			// forward state change to the editor.
			if (this._editor)
				this._editor.addState(state);
		},

		// overridden
		removeState: function (state) {

			this.base(arguments, state);

			// forward state change to the editor.
			if (this._editor)
				this._editor.removeState(state);
		}
	},

	destruct: function () {

		this._disposeObjects("_editor");

	}

});


/**
 * wisej.web.labelWrapper.Layout
 *
 * Layout manager for the wisej.web.LabelWrapper widget.
 */
qx.Class.define("wisej.web.labelWrapper.Layout", {

	extend: qx.ui.layout.Basic,

	members: {

		// overridden
		renderLayout: function (availWidth, availHeight, padding) {

			var labelWrapper = this._getWidget();
			var size = labelWrapper.getSize();
			var label = labelWrapper.getLabel();
			var editor = labelWrapper.getEditor();
			var maxSize = labelWrapper.getMaxSize();
			var minSize = labelWrapper.getMinSize();
			var sizeType = labelWrapper.getSizeType();
			var position = labelWrapper.getPosition();

			var top = padding.top;
			var left = padding.left;
			var width = availWidth;
			var height = availHeight;

			// when "inside" both the label and editor fill the wrapper.
			if (position === "inside") {

				label.renderLayout(left, top, width, height);

				if (editor) {
					// ensure the label is above the editor.
					label.setZIndex(editor.getZIndex() + 1);

					editor.renderLayout(left, top, width, height);
				}

				return;
			}

			// left, right.
			var labelWidth, editorWidth;
			if (position === "left" || position === "right") {

				switch (sizeType) {

					case "absolute":
						labelWidth = size;
						if (minSize > 0)
							labelWidth = Math.max(minSize, labelWidth);
						if (maxSize > 0)
							labelWidth = Math.min(maxSize, labelWidth);
						if (editor) {
							editorWidth = width - labelWidth;
						}
						break;

					case "percent":
						labelWidth = width * size / 100;
						if (minSize > 0)
							labelWidth = Math.max(minSize, labelWidth);
						if (maxSize > 0)
							labelWidth = Math.min(maxSize, labelWidth);
						if (editor) {
							editorWidth = width - labelWidth;
						}
						break;

					default:
					case "autoSize":
						labelWidth = label.getSizeHint().width;
						if (minSize > 0)
							labelWidth = Math.max(minSize, labelWidth);
						if (maxSize > 0)
							labelWidth = Math.min(maxSize, labelWidth);
						if (editor) {
							editorWidth = width - labelWidth;
						}
						break;
				}

				if (position === "right") {

					label.renderLayout(width - labelWidth, top, labelWidth, height);

					// always dock the editor to the left.
					if (editor) {
						editor.renderLayout(left, top, editorWidth, height);
					}

				}
				else {

					label.renderLayout(left, top, labelWidth, height);

					// always dock the editor to the right.
					if (editor) {
						editor.renderLayout(width - editorWidth, top, editorWidth, height);
					}
				}

				return;
			}

			// top, bottom, anything else.
			var labelHeight, editorHeight;
			{

				switch (sizeType) {

					case "absolute":
						labelHeight = size;
						if (minSize > 0)
							labelHeight = Math.max(minSize, labelHeight);
						if (maxSize > 0)
							labelHeight = Math.min(maxSize, labelHeight);
						if (editor) {
							editorHeight = height - labelHeight;
						}
						break;

					case "percent":
						labelHeight = height * size / 100;
						if (minSize > 0)
							labelHeight = Math.max(minSize, labelHeight);
						if (maxSize > 0)
							labelHeight = Math.min(maxSize, labelHeight);
						if (editor) {
							editorHeight = height - labelHeight;
						}
						break;

					default:
					case "autoSize":
						labelHeight = label.getSizeHint().height;
						if (editor) {

							// if the editor is a multiline (i.e. listbox, or textarea) 
							// use the remaining height, otherwise use the preferred height.
							if (editor.hasState("multiline"))
								editorHeight = height - labelHeight;
							else
								editorHeight = editor.getSizeHint().height;

							labelHeight = height - editorHeight;
						}
						break;
				}

				if (position === "bottom") {

					label.renderLayout(left, height - labelHeight, width, labelHeight);

					// always dock the editor to the top.
					if (editor) {
						editor.renderLayout(left, top, width, editorHeight);
					}

				}
				else {

					label.renderLayout(left, top, width, labelHeight);

					// always dock the editor to the bottom.
					if (editor) {
						editor.renderLayout(left, height - editorHeight, width, editorHeight);
					}
				}

				return;
			}
		}
	}

});
