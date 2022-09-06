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
 * wisej.web.MessageBox
 */
qx.Class.define("wisej.web.MessageBox", {

	extend: qx.ui.window.Window,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejControl],

	properties: {

		appearance: { init: "messagebox", refine: true },

		/**
		 * Owner of the message box. It will gain the focus when
		 * the messagebox is closed.
		 */
		owner: { init: null, check: "String", nullable: true, transform: "_transformComponent" },

		/**
		 * Title of the message box.
		 */
		title: { init: "", check: "String", nullable: true },

		/**
		 * Message text. Can contain html.
		 */
		message: { init: "", check: "String" },

		/**
		 * Image to display in the messagebox.
		 *
		 * The actual icon in the theme is "messagebox-" + this.getImage().
		 */
		image: { init: "", check: ["none", "error", "question", "warning", "information"] },

		/**
		 * List of buttons to show in the messagebox.
		 * This property is a map where the field name is the button id and the value is the localized text.
		 */
		buttons: { init: { "ok": "OK" }, check: "Map" },

		/**
		 * The id if the default button with the focus.
		 */
		defaultButton: { init: "", check: "String" },

		/**
		 * Horizontal alignment of the buttons in the "buttonsPane" container.
		 */
		alignment: { init: "center", check: ["left", "center", "right"], apply: "_applyAlignment", themeable: true }
	},

	construct: function (title) {

		this.base(arguments);

		this._createChildControl("buttonsPane");

		this.setMinWidth(250);
		this.setMinHeight(150);
		this.setVisible(true);
		this.setResizable(false);
		this.setAllowMaximize(false);
		this.setAllowMinimize(false);
		this.setShowMaximize(false);
		this.setShowMinimize(false);
		this.setTitle(title || "");
		this.setAlignX("center");
		this.setAlignY("middle");

		this.addListener("focusin", this._onFocusIn, this);

		if (!wisej.web.DesignMode)
			qx.event.Idle.getInstance().addListener("interval", this.__ensureActiveMessageBox, this);

		// process Enter and Esc.
		this.addListener("keypress", this._onKeyPress, this);

		// adjust the size on rendering.
		this.addListenerOnce("appear", this._onAppear, this);

		// rightToLeft support.
		this.addListener("changeRtl", function (e) {
			this.getChildControl("buttonsPane")._mirrorChildren(e.getData());
		}, this);

		// add forward states.
		this._forwardStates.error = true;
		this._forwardStates.stop = true;
		this._forwardStates.hand = true;
		this._forwardStates.information = true;
		this._forwardStates.warning = true;
		this._forwardStates.question = true;

		// set the name for automation apps.
		this.getContentElement().setAttribute("name", "MessageBox");

		// block "contextmenu" from bubbling up to the Page or Desktop.
		this.addListener("longtap", function (e) { e.stopPropagation(); }, this);
		this.addListener("contextmenu", function (e) { e.stopPropagation(); }, this);
	},

	members: {

		isWindow: true,

		// reference to the default button.
		__defaultBtn: null,

		show: function () {

			this.base(arguments);

			this.__setImage(this.getImage());
			this.__setTitle(this.getTitle());
			this.__setMessage(this.getMessage());
			this.__createButtons(this.getButtons());
		},


		close: function () {

			try {

				// terminate the modal state on the server.
				this.fireDataEvent("close", "abort");

				// activate the owner window
				var owner = this.getOwner();
				if (owner instanceof qx.ui.core.Widget) {

					owner.activate();
					if (owner instanceof qx.ui.window.Window)
						owner.setActive(true);
				}

			} catch (ex) {

				// ignore.
			}

			this.destroy();
		},

		/**
		 * Ensures that the active message box has the focus and the keyboard.
		 */
		__ensureActiveMessageBox: function () {

			if (!this.isActive() || wisej.web.DesignMode)
				return;

			if (this.__defaultBtn) {
				if (!qx.ui.core.FocusHandler.getInstance().isFocused(this.__defaultBtn))
					this.__defaultBtn.focus();
			}

			if (!this.isModal())
				qx.event.Idle.getInstance().removeListener("interval", this.__ensureActiveMessageBox, this);
		},

		/**
		 * Handles the message box or a child widget getting the focus.
		 */
		_onFocusIn: function (e) {

			if (!this.isActive())
				return;

			// change the default button when it gets the focus (tab or click).
			var target = e.getTarget();
			if (target instanceof qx.ui.form.Button) {
				this.__defaultBtn = target;
				return;
			}
		},

		/** 
		 * Handles keypress events to close the
		 * messagebox when pressing Esc and to
		 * navigate between button options with
		 * arrow keys.
		 */
		_onKeyPress: function (e) {

			if (e.getModifiers() !== 0)
				return;

			switch (e.getKeyIdentifier()) {

				case "Escape":
					this.close();
					break;

				case "Enter":
					if (this.__defaultBtn)
						this.__defaultBtn.execute();
					break;

				case "Down":
				case "Right":
					qx.ui.core.FocusHandler.getInstance().focusNext();
					break;

				case "Up":
				case "Left":
					qx.ui.core.FocusHandler.getInstance().focusPrev();
					break;
			}
		},

		/**
		 * Applies the alignment property to the
		 *  "buttonsPane" child control.
		 */
		_applyAlignment: function (value, old) {
			this.getChildControl("buttonsPane").getLayout().setAlignX(value);
		},

		_createChildControlImpl: function (id, hash) {

			var control;

			switch (id) {

				case "image":
					control = new qx.ui.basic.Image("messagebox-information");
					this.add(control, { edge: "west" });
					break;

				case "pane":
					control = new qx.ui.container.Composite(new qx.ui.layout.Dock());
					this._add(control, { flex: 1 });
					break;

				case "message":
					control = new qx.ui.basic.Label().set({
						rich: true
					});
					this.add(control, { edge: "center" });
					break;

				case "buttonsPane":
					control = new qx.ui.container.Composite(new qx.ui.layout.HBox(10, this.getAlignment()));
					this.add(control, { edge: "south", width: "100%" });
					break;
			}

			return control || this.base(arguments, id);
		},

		__buttonHandler: function (ev) {

			try {

				var btn = ev.getTarget().id;

				// close the messagebox on the server.
				this.fireDataEvent("close", btn);

				// activate the owner window
				var owner = this.getOwner();
				if (owner && owner instanceof qx.ui.core.Widget)
					owner.activate();
			}
			catch (ex) { }

			// must destroy async or on mobile the element below will get the focus.
			qx.event.Timer.once(this.destroy, this, 1);
		},

		__setImage: function (value) {

			var image = this.getChildControl("image");

			if (!value || value === "none") {
				image.exclude();
			}
			else {
				image.show();
				this.addState(value);
				image.setSource("messagebox-" + value);
			}
		},

		__setTitle: function (value) {

			this.setCaption(value);

		},

		__setMessage: function (value) {

			this.getChildControl("message").setValue(value);

		},

		_onAppear: function (e) {

			if (!wisej.web.DesignMode)
				Wisej.Platform.setFocusedComponent(this.__defaultBtn);

			// limit the size of the MessageBox to the window size.
			var message = this.getChildControl("message");
			var bounds = this.getBounds() || this.getSizeHint();
			var messageBounds = message.getBounds() || message.getSizeHint();

			var maxWidth = this.getMaxWidth() || window.innerWidth;
			maxWidth = Math.max(Math.min(maxWidth, window.innerWidth), this.getMinWidth());
			var maxHeight = this.getMaxHeight() || window.innerHeight;
			maxHeight = Math.max(Math.min(maxHeight, window.innerHeight), this.getMinHeight());

			this.setMaxWidth(maxWidth);
			this.setMaxHeight(maxHeight);
			message.setMaxHeight(maxHeight - bounds.height + messageBounds.height);

			// let the message box grow vertically if necessary.
			this.invalidateLayoutCache();
			message.invalidateLayoutCache();

			if (messageBounds.height >= message.getMaxHeight()) {
				message.getContentElement().setStyle("overflow", "auto");
			}

		},

		__createButtons: function (buttons) {

			// find the buttons container.
			var container = this.getChildControl("buttonsPane");

			// delete all existing buttons.
			this.destroyChildren(container);

			// create the new buttons.
			if (buttons) {

				this.__defaultBtn = null;
				var defaultId = this.getDefaultButton();

				var tabIndex = 1;
				for (var id in buttons) {
					var text = buttons[id];
					var btn = new qx.ui.form.Button(text);

					btn.id = id;
					btn.$$subcontrol = "button";
					btn.$$subparent = container;

					btn.setTabIndex(tabIndex++);
					btn.getContentElement().setAttribute("name", id);
					btn.addListener("execute", this.__buttonHandler, this);
					container.add(btn);

					// save the default button.
					if (id == defaultId)
						this.__defaultBtn = btn;

					// make sure we always have a default button.
					if (this.__defaultBtn == null)
						this.__defaultBtn = btn;
				}
			}
		},

		// overridden to increase the z-index of the messagebox.
		_applyZIndex: function (value, old) {
			this.getContentElement().setStyle("zIndex", value == null ? 0 : 1e7 + value);
		}

	},

	destruct: function () {

		qx.event.Idle.getInstance().removeListener("interval", this.__ensureActiveMessageBox, this);

	}

});
