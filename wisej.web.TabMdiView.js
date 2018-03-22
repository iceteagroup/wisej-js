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
 * wisej.web.TabMdiView
 *
 * The tabbed mdi view inside an mdi parent form.
 * This widget extends the standard wisej.web.TabControl class
 * by adding a right docked themed button that shows a thumbnail view of the 
 * mdi child forms.
 *
 */
qx.Class.define("wisej.web.TabMdiView", {

	extend: wisej.web.TabControl,

	construct: function () {

		this.base(arguments);

		this.initShowThumbnails();
	},

	properties: {

		appearance: { init: "tabmdiview", refine: true },

		/**
		 * ShowThumbnails.
		 *
		 * Shows or hides the thumbnail preview.
		 */
		showThumbnails: { init: true, check: "Boolean", apply: "_applyShowThumbnails" },
	},

	members: {

		// signals that the selection change was triggered by adding and showing the thumbnails page.
		__inShowThumbnails: false,

		// signals that the selection change was triggered by hiding and removing the thumbnails page.
		__inHidingThumbnails: false,

		// saves the selected tab when showing the thumbnails page.
		__savedSelection: null,

		// overridden to hide the preview button.
		remove: function (page) {

			this.base(arguments, page);

			// if the deleted tab was also the active tab when it entered
			// the thumbnail mode, clear the saved selection.
			if (this.__savedSelection && this.__savedSelection[0] == page) {
				this.__savedSelection.length = 0;

				// try to select the nearest page.
				var pages = this.getChildren();
				var index = this.indexOf(page);
				if (index > 0)
					index--;
				else if (index < pages.length - 3)
					index++;
				if (index > -1 && index < pages.length - 2)
					this.__savedSelection.push(pages[index]);
			}

			// hide the thumbnails page and button when removing the last tab page.
			var pageCount = this.getChildren().length;
			pageCount = pageCount - (this._isThumbnailsVisible() ? 1 : 0);

			if (pageCount == 0) {
				this.__hideThumbnails();
				this.getChildControl("bar").setShowPreviewButton(false);
			}
		},

		// overridden to show the preview button.
		add: function (page) {

			this.base(arguments, page);

			// hide the thumbnails page when adding an mdi tab page.
			//if (!this.__inShowThumbnails && !this.__inHidingThumbnails)
			//	this.__hideThumbnails();

			if (this.getShowThumbnails())
				this.getChildControl("bar").setShowPreviewButton(true);
		},

		// overridden to detect when a mdi page is selected
		// to hide/remove the thumbnails page.
		_onChangeSelection: function (e) {

			this.base(arguments, e);

			if (!this.__inShowThumbnails && !this.__inHidingThumbnails)
				this.__hideThumbnails();
		},

		// overridden.
		// prevents closing the thumbnails page when an
		// mdi child window is activated.
		setSelectedIndex: function (value) {

			if (this._isThumbnailsVisible())
				return;

			this.base(arguments, value);
		},

		/**
		 * Applies the showThumbnails property.
		 */
		_applyShowThumbnails: function (value, old) {

			if (!value || this.getChildren().length > 0)
				this.getChildControl("bar").setShowPreviewButton(value);
		},

		// overridden
		_onPageClose: function (e) {

			// don't call the base, the tabPage
			// will be closed only if the hosted form is closed on the server side.
			// this.base(arguments, e);

			var page = e.getTarget();
			this.fireDataEvent("close", page);
		},

		// handles clicks on the preview button to show/hide the thumbnails page.
		__onToggleThumbnails: function (e) {

			this._isThumbnailsVisible()
				? this.__hideThumbnails()
				: this.__showThumbnails();
		},

		__showThumbnails: function () {

			if (this._isThumbnailsVisible())
				return;

			this.__suspendEvents = true;
			this.__inShowThumbnails = true;

			try {
				var thumbnails = this.getChildControl("thumbnails");

				// save the current selection.
				this.__savedSelection = this.getSelection();

				this.add(thumbnails);
				this.setSelection([thumbnails]);

				// signal the pressed status to the preview button.
				this.getChildControl("bar").getChildControl("preview").addState("selected");
			}
			finally {

				this.__suspendEvents = false;
				this.__inShowThumbnails = false;
			}
		},

		__hideThumbnails: function () {

			if (!this._isThumbnailsVisible())
				return;

			this.__inHidingThumbnails = true;
			try {

				// restore the selection before removing the thumbnails page, only
				// if the current selection is still the thumbnails page, otherwise
				// it means that we changed the selection and we don't want to flicker.
				var thumbnails = this.getChildControl("thumbnails");
				if (this.getSelection()[0] == thumbnails && this.indexOf(this.getSelection()[0]) > -1)
					this.setSelection(this.__savedSelection);

				this.remove(thumbnails);

				// remove the pressed status to the preview button.
				this.getChildControl("bar").getChildControl("preview").removeState("selected");
			}
			finally {

				this.__inHidingThumbnails = false;
			}
		},

		// check if the thumbnails page is currently visible.
		_isThumbnailsVisible: function () {

			var thumbnails = this.getChildControl("thumbnails", true);
			return thumbnails && this.indexOf(thumbnails) > -1;
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "thumbnails":
					control = new wisej.web.tabmdiview.ThumbnailPage(this);
					break;

				case "bar":
					control = new wisej.web.tabmdiview.SlideBar();
					control.setZIndex(10);
					control.addListener("showThumbnails", this.__onToggleThumbnails, this);
					this._add(control);
					break;
			}

			return control || this.base(arguments, id);
		},

	},

});


/**
 * wisej.web.tabmdiview.SlideBar
 *
 * Extends the standard qx.ui.container.SlideBar to add the mdi child window preview
 * button after the button-forward widget used to scroll the tabs that are outside the
 * viewport.
 */
qx.Class.define("wisej.web.tabmdiview.SlideBar", {

	extend: qx.ui.container.SlideBar,

	construct: function (orientation) {

		this.base(arguments, orientation);

	},

	properties: {

		/**
		 * Determines whether the preview button is visible.
		 */
		showPreviewButton: { init: false, check: "Boolean", apply: "_applyShowPreviewButton" },

	},

	members: {

		/**
		 * Applies the showPreviewButton property
		 */
		_applyShowPreviewButton: function (value, old) {

			value
				? this._showChildControl("preview")
				: this._excludeChildControl("preview");

		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "preview":
					control = new qx.ui.form.Button();
					control.setShow("icon");
					control.setIcon(control.getIcon() || "icon-preview");
					control.addListener("execute", this._onExecutePreview, this);
					control.setFocusable(false);
					control._forwardStates.selected = true;
					this._addAt(control, 3);
					break;
			}

			return control || this.base(arguments, id);
		},

		_onExecutePreview: function (e) {

			this.fireEvent("showThumbnails");
		}
	}
});


/**
 * wisej.web.tabmdiview.TabPage
 */
qx.Class.define("wisej.web.tabmdiview.TabPage", {

	extend: wisej.web.tabcontrol.TabPage,

	members: {

		// overridden to fire the "disposed" event.
		// we need it to remove the preview window.
		dispose: function () {

			try {
				this.fireEvent("disposed");
			}
			finally {

				this.base(arguments);
			}
		}
	}

});


/**
 * wisej.web.tabmdiview.ThumbnailPage
 *
 * The tab page that is added automatically as the last page
 * and contains the thumbnails of the mdi child windows.
 *
 * The button child control is overridden to make it invisible.
 *
 */
qx.Class.define("wisej.web.tabmdiview.ThumbnailPage", {

	extend: wisej.web.tabcontrol.TabPage,

	construct: function (tabView) {

		this.base(arguments, new qx.ui.layout.Grow());

		this.__tabView = tabView;
		this.addListener("appear", this.updateThumbnails, this);
	},

	members: {

		// the owner tabview widget.
		__tabView: null,

		/**
		 * Clones and scales the content in the other tabs and creates child
		 * thumbnails.
		 */
		updateThumbnails: function () {

			// dispose all the existing thumbnails.
			var existing = this.removeAll();
			for (var i = 0; i < existing.length; ++i) {
				existing[i].destroy();
			}

			// re-create the thumbnails as child controls from the tab pages.
			var tabPages = this.__tabView.getChildren();
			for (var i = 0; i < tabPages.length; i++) {

				var tabPage = tabPages[i];
				if (tabPage instanceof wisej.web.tabmdiview.TabPage) {

					// create the new thumbnail.
					var thumbnail = new wisej.web.tabmdiview.WindowPreview(tabPage);
					this.add(thumbnail);
				}
			}
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "pane":
					var control = new qx.ui.container.Scroll();
					var clientArea = new qx.ui.container.Composite(new qx.ui.layout.Flow());
					control.add(clientArea);
					this._add(control);
					break;

				case "button":
					control = this.base(arguments, id);
					control.exclude();
					break;
			}

			return control || this.base(arguments, id);
		},
	},

	// overridden.
	destruct: function () {

		this.__tabView = null;
	},

});


/**
 * wisej.web.tabmdiview.WindowPreview
 *
 * Contains the thumbnail preview of the related mdi child window.
 */
qx.Class.define("wisej.web.tabmdiview.WindowPreview", {

	extend: qx.ui.container.Composite,

	construct: function (page) {

		//  prepare the layout.
		var layout = new qx.ui.layout.Grid();
		layout.setRowFlex(1, 1);
		layout.setColumnFlex(0, 1);

		this.base(arguments, layout);

		// force the creation of the child component.
		this._createChildControl("title");
		this._createChildControl("close");
		this._createChildControl("preview");

		// attach events.
		this.addListener("tap", this.__onTap);
		this.addListener("pointerover", this.__onPointerOver);
		this.addListener("pointerout", this.__onPointerOut);

		this.__page = page;

		// create the thumbnail as soon as the dom is created.
		this.addListenerOnce("appear", this.__createThumbnail);

		// handle the "disposed" event to remove ourselves when the tab page is disposed (form closed).
		page.addListenerOnce("disposed", this.__onFormClosed, this);

	},

	properties: {

		appearance: { init: "tabmdiview/window-preview", refine: true },

		/**
		 * The <code>LayoutItem</code>'s preferred width.
		 *
		 * The computed width may differ from the given width due to
		 * stretching. Also take a look at the related properties
		 * {@link #minWidth} and {@link #maxWidth}.
		 */
		width:
		{
			init: 240,
			refine: true
		},

		/**
		 * The item's preferred height.
		 *
		 * The computed height may differ from the given height due to
		 * stretching. Also take a look at the related properties
		 * {@link #minHeight} and {@link #maxHeight}.
		 */
		height:
		{
			init: 200,
			refine: true
		},

	},

	members: {

		// the tab page that is displayed in this preview widget.
		__page: null,

		// mouse state flags.
		__isMouseOver: false,
		__isMouseOverClose: false,

		/**
		 * Creates the thumbnail view of the tab page.
		 */
		__createThumbnail: function () {

			var window = this.__page.getChildren()[0];
			this.__showPreview(window);

		},

		/**
		 * Selected the tab page.
		 */
		__onTap: function (e) {

			if (this.__page) {

				var tabView = this.__page.getParent();
				if (tabView)
					tabView.setSelection([this.__page]);
			}

		},

		/**
		 * Shows the window preview.
		 */
		__onPointerOver: function (e) {

			this.addState("hovered");

			if (e.getTarget() == this.getChildControl("close"))
				this.__isMouseOverClose = true;
			else
				this.__isMouseOver = true;
		},

		/**
		 * Hides the window preview.
		 */
		__onPointerOut: function (e) {

			if (e.getTarget() == this.getChildControl("close")) {
				this.__isMouseOverClose = false;
			}
			else {
				this.__isMouseOver = false;
				this.removeState("hovered");
			}
		},

		/**
		 * Close the associated window when the close button is pressed.
		 */
		__onClose: function (e) {

			if (this.__page)
				this.__page._onButtonClose();
		},

		/**
		 * Destroy this preview when the associated tab is disposed, which means
		 * that the mdi child form has been closed.
		 */
		__onFormClosed: function (e) {

			this.destroy();

		},

		/**
		 * Create child components.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "title":
					control = new qx.ui.basic.Atom().set({
						iconPosition: "left",
						anonymous: true
					});
					this._add(control, { row: 0, column: 0 });
					break;

				case "close":
					control = new qx.ui.form.Button().set({
						show: "icon"
					});
					control.setThemedIcon("icon-close");

					control.addListener("execute", this.__onClose, this);
					control.addListener("pointerover", this.__onPointerOver, this);
					control.addListener("pointerout", this.__onPointerOut, this);

					this._add(control, { row: 0, column: 1 });
					break;

				case "preview":
					control = new qx.ui.core.Widget().set({
						anonymous: true
					});
					this._add(control, { row: 1, column: 0, colSpan: 2 });
					break;
			}

			return control || this.base(arguments, id);
		},

		__showPreview: function (window) {

			if (!window)
				return;

			// update the title bar.
			var title = this.getChildControl("title");
			title.setLabel(this.__page.getLabel());
			title.setIcon(window.getIcon() || "window-icon");

			// retrieve the dom for the preview target widget.
			var dom = this.__getPreviewDom();
			var size = { width: dom.clientWidth, height: dom.clientHeight };

			// create the thumbnail.
			var thumbnail = wisej.utils.Widget.makeThumbnail(window, size, "fitWidth");

			// update the inner dom to show the preview window and add
			// a blocker element on top to prevent clicks inside the thumbnail.
			dom.innerHTML = "";
			dom.appendChild(thumbnail);
			dom.appendChild(qx.dom.Element.create("div", {
				style: "width:100%;height:100%;position:absolute"
			}));
		},

		/**
		 * Returns the dom element of the preview box.
		 */
		__getPreviewDom: function () {

			var preview = this.getChildControl("preview");
			var dom = wisej.utils.Widget.ensureDomElement(preview);
			return dom;
		},
	},

	// overridden.
	destruct: function () {

		this.__page = null;

	},

});

