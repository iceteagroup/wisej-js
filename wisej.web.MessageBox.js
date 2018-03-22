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
		owner: { init: null, check: "String", nullable: true },

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
		 * Known values: none, error, question, warning, information.
		 */
		image: { init: "", check: "String" },

		/**
		 * List of buttons to show in the messagebox.
		 * This property is a map where he fields id the button id and the value is the localized text.
		 */
		buttons: { init: { "ok": "OK" }, check: "Map" },

		/**
		 * The id if the default button with the focus.
		 */
		defaultButton: { init: "", check: "String" },

		/**
		 * Horizontal alignment of the buttons in the "buttonsPane" container.
		 */
		alignment: { init: "center", check: ["left", "center", "right"], apply: "_applyAlignment", themeable: true },
	},

	construct: function (title) {

		this.base(arguments);

		this._createChildControl("buttonsPane");

		this.setModal(true);
		this.setMinWidth(250);
		this.setMinHeight(150);
		this.setVisible(true);
		this.setResizable(false);
		this.setAllowMaximize(false);
		this.setAllowMinimize(false);
		this.setShowMaximize(false);
		this.setShowMinimize(false);
		this.setTitle(title || "");

		this.addListener("resize", this.center, this);
		this.addListener("keypress", this._onKeyPress, this);

		// focus the default button when the messagebox is rendered.
		this.addListenerOnce("appear", function () {

			if (this.__defaultBtn != null)
				this.__defaultBtn.focus();

			// limit the size of the MessageBox to the window size.
			var maxWidth = this.getMaxWidth();
			maxWidth = Math.max(Math.min(maxWidth || window.innerWidth, window.innerWidth), this.getMinWidth());
			this.setMaxWidth(maxWidth);

		}, this);

		// rightToLeft support.
		this.addListener("changeRtl", function (e) { this.getChildControl("buttonsPane")._mirrorChildren(e.getData()); }, this);

		// add forward states.
		this._forwardStates.error = true;
		this._forwardStates.stop = true;
		this._forwardStates.hand = true;
		this._forwardStates.information = true;
		this._forwardStates.warning = true;
		this._forwardStates.question = true;
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
				if (owner != null && owner.isWindow)
					owner.activate();

			} catch (ex) { }

			this.destroy();
		},

		/** 
		 * Handles keypress events to close the
		 * messagebox when pressing Esc.
		 */
		_onKeyPress: function (e) {

			if (e.getKeyIdentifier() == "Escape") {
				this.close();
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
					control = new qx.ui.basic.Label();
					control.setRich(true);
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
				if (owner != null && owner.isWindow)
					owner.activate();
			}
			catch (ex) { }

			this.destroy();
		},

		__setImage: function (value) {

			var image = this.getChildControl("image");

			if (!value || value == "none") {
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

		__createButtons: function (buttons) {

			// find the buttons container.
			var container = this.getChildControl("buttonsPane");

			// delete all existing buttons.
			this.destroyChildren(container);

			// create the new buttons.
			if (buttons) {

				this.__defaultBtn = null;
				var defaultId = this.getDefaultButton();

				for (var id in buttons) {
					var text = buttons[id];
					var btn = new qx.ui.form.Button(text);

					btn.id = id;
					btn.$$subcontrol = "button";
					btn.$$subparent = container;

					btn.addListener("execute", this.__buttonHandler, this);
					container.add(btn);

					// save the default button.
					if (id == defaultId)
						this.__defaultBtn = btn;
				}
			}
		},

		// overridden to increase the z-index of the messagebox.
		_applyZIndex: function (value, old) {
			this.getContentElement().setStyle("zIndex", value == null ? 0 : 1e7 + value);
		},

	}

});
