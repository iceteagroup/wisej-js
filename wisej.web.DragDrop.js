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
 * wisej.web.DragDrop
 *
 * This singleton component manages drag-drop operations.
 */
qx.Class.define("wisej.web.DragDrop", {

	extend: qx.core.Object,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	statics: {

		// the singleton instance.
		__singleton: null,

		/**
		 * Returns the singleton instance.
		 */
		getInstance: function () {
			return wisej.web.DragDrop.__singleton;
		}

	},

	construct: function () {

		if (wisej.web.DragDrop.__singleton)
			throw new Error("Only one instance of wisej.web.DragDrop is allowed.");

		wisej.web.DragDrop.__singleton = this;

		this.base(arguments);
	},

	properties: {

		/**
		 * SubmitURL property.
		 *
		 * The URL to use to send the files to the server.
		 */
		submitURL: { init: "", check: "String" },

		/**
		 * FileTypes property.
		 *
		 * Regular expression to filter the type of files that can be uploaded.
		 */
		allowedFileTypes: { init: "", check: "String" },

		/**
		 * MaxSize property in bytes.
		 *
		 * Limits the size of the files that can be uploaded.
		 */
		maxFileSize: { init: 0, check: "PositiveInteger" },

		/**
		 * DropSource property.
		 *
		 * The widget that initiated the current drag-drop operation.
		 */
		dropSource: { init: null, nullable: true, transform: "_transformComponent" },

		/**
		 * DropTarget property.
		 *
		 * The widget that is the current drop target.
		 */
		dropTarget: { init: null, nullable: true, transform: "_transformComponent" },

		/**
		 * AllowedEffects property.
		 *
		 * The drop actions that are allowed by the drop source.
		 */
		// this property is implemented using a setter/getter.
		// allowedEffects: { check: "Integer", apply: "_applyAllowedEffects" },

		/**
		 * DropEffect property.
		 *
		 * The current drop effect supported by the drop target.
		 */
		// this property is implemented using a setter/getter.
		// dropEffect: { check: "Integer", apply: "_applyDropEffect" },

		/**
		 * DragAction property.
		 *
		 * The drag action to perform: continue, drop or cancel.
		 */
		// this property is implemented using a setter/getter.
		// dragAction: { check: "String", apply: "_applyDragAction" },

		/**
		 * DragData property.
		 *
		 * Sets the data object to assign to the dataTransfer instance when dragging an element.
		 */
		dragData: { init: null, nullable: true, check: "String" },
		/**
		 * dragDataType property.
		 *
		 * Sets the type of the data being dragged.
		 */
		dragDataType: { init: null, nullable: true, check: "String" },

		/**
		 * ImageSize property.
		 *
		 * Sets the image to drag when dragging an element.
		 */
		image: { init: null, nullable: true, apply: "_applyImage" },

		/**
		 * ImageSize property.
		 *
		 * Defines the size of the custom drag image.
		 */
		imageSize: { init: null, nullable: true, apply: "_applyImageSize" },
	},

	members: {

		/**
		 * allowedEffects getter/setter.
		 */
		getAllowedEffects: function () {
			return this.__allowedEffects;
		},
		setAllowedEffects: function (value) {

			this.__allowedEffects = value;
			var dropSource = this.getDropSource();

			if (value != null && dropSource) {
				var handler = qx.event.Registration.getManager(dropSource).getHandler(qx.event.handler.DragDrop);
				if (handler) {
					handler.clearActions();

					if (value & 1) // copy
						handler.addAction("copy");
					if (value & 2) // move
						handler.addAction("move");
					if (value & 4) // link
						handler.addAction("alias");
				}
			}
		},

		/**
		 * dropEffect getter/setter.
		 */
		getDropEffect: function () {
			return this.__dropEffect;
		},
		setDropEffect: function (value) {

			this.__dropEffect = value;
			var dropTarget = this.getDropTarget();

			if (value != null && dropTarget) {
				var handler = qx.event.Registration.getManager(dropTarget).getHandler(qx.event.handler.DragDrop);
				if (handler) {

					var action = null;
					switch (value) {
						case 1: action = "copy"; break;
						case 2: action = "move"; break;
						case 4: action = "alias"; break;
					}

					if (!handler.supportsAction(action))
						action = null;

					handler.setCurrentAction(action);
				}
			}
		},

		/**
		 * dragAction getter/setter.
		 */
		getDragAction: function () {
			return this.__dragAction;
		},
		setDragAction: function (value) {

			this.__dragAction = value;
			var dropSource = this.getDropSource();

			if (value != null && dropSource) {
				var handler = qx.event.Registration.getManager(dropSource).getHandler(qx.event.handler.DragDrop);
				if (handler) {

					switch (value) {
						case "drop": break;
						case "cancel": handler.clearSession(); break;
						case "continue": break;
					}

				}
			}
		},

		/**
		 * Applies the Image property.
		 */
		_applyImage: function (value, old) {

			var cursor = qx.ui.core.DragDropCursor.getInstance();
			if (value) {
				cursor.setSource(value);
			}
			else {
				cursor.resetSource();
			}
		},

		/**
		 * Applies the ImageSize property.
		 */
		_applyImageSize: function (value, old) {

			var cursor = qx.ui.core.DragDropCursor.getInstance();
			if (value && value.width > 0 && value.height > 0) {
				cursor.setScale(true);
				cursor.setWidth(value.width);
				cursor.setHeight(value.height);
			}
			else {
				cursor.setScale(false);
				cursor.resetWidth();
				cursor.resetHeight();
			}

			// changing the scale property resets the z-index when
			// the image widget recreates the dom element.
			cursor._applyZIndex(1e8);
		},

		/** 
		 * Uploads the files to the server using the submitUrl which may wire the
		 * request to a specific component or to the application instance (id="app").
		 *
		 * @param submitUrl {String} the URL to use to submit the files to upload.
		 * @param files {Array} the array of files to package and send.
		 * @param callbacks {Map} a map with the following handlers:
		 *
		 *		uploading(fileList[])
		 *		uploaded(fileList[])
		 *		completed(error)
		 *
		 * @returns fileList {Array} the list of file names sent to the server.
		 */
		uploadFiles: function (submitUrl, files, callbacks) {

			if (this.core.session.expired)
				return;

			return wisej.web.Upload.uploadFiles(
				files,
				submitUrl,
				this.getAllowedFileTypes(),
				this.getMaxFileSize(),
				callbacks);
		},

		/**
		 * Registers the component with the drag-drop handler to
		 * manage native html5 drag-drop file operations.
		 *
		 * @param component {Widget} the component to register.
		 */
		registerComponent: function (component) {

			if (wisej.web.DesignMode)
				return;

			var el = component.getContentElement();
			if (el) {
				var dom = el.getDomElement();
				if (dom) {

					// dragging out of the browser is not yet supported.
					/*
					if (component.isDraggable()) {
						dom.setAttribute("draggable", "true");
						qx.bom.Event.addNativeListener(dom, "drag", this.__handleDrag.bind(this));
						qx.bom.Event.addNativeListener(dom, "dragend", this.__handleDragEnd.bind(this));
						qx.bom.Event.addNativeListener(dom, "dragstart", this.__handleDragStart.bind(this));
					}
					*/

					qx.bom.Event.addNativeListener(dom, "drop", this.__handleDrop.bind(this));
					qx.bom.Event.addNativeListener(dom, "dragenter", this.__handleDragEnter.bind(this));
					qx.bom.Event.addNativeListener(dom, "dragover", this.__handleDragOver.bind(this));
					qx.bom.Event.addNativeListener(dom, "dragleave", this.__handleDragLeave.bind(this));
				}
			}
		},

		/**
		 * Dragging out of the browser is not yet supported.
		 * 
		__handleDrag: function (e) {

			e.preventDefault();
			e.stopPropagation();

			var source = this.__getDropSource(e);
			if (source) {
				source.fireEvent("nativedrag");

				// assign the data to drag.
				e.dataTransfer.setData(this.getDragDataType(), this.getDragData());
			}

		},
		__handleDragEnd: function (e) {

			e.preventDefault();
			e.stopPropagation();

			var source = this.__getDropSource(e);
			if (source) {
				source.fireEvent("nativedragend");
			}

		},
		__handleDragStart: function (e) {

			if (!this.getDragData()) {

				e.preventDefault();
				e.stopPropagation();
			}
			else {
				var source = this.__getDropSource(e);
				if (source) {
					source.fireEvent("nativedragstart");

					// assign the data to drag.
					e.dataTransfer.setData(this.getDragDataType(), this.getDragData());
				}
			}

		},
		*/
		__handleDrop: function (e) {

			e.preventDefault();
			e.stopPropagation();

			// note: we don't fire "nativedrop.
			// it is generated by the server right after receiving the dropped files.

			var files = this.__getFiles(e);
			if (files && files.length > 0) {

				var target = this.__getDropTarget(e);
				if (target) {

					// if we have a valid target, send the files to the server.
					this.uploadFiles(

						// postback URL and additional arguments to send back to the server
						// used to send back the coordinates of the pointer.
						this.getSubmitURL() + "&loc=" + (e.pageX | 0) + "," + (e.pageY | 0),

						// files to upload.
						files,

						// callbacks
						{
							// uploading callback.
							uploading: function (xhr) {

								target.showLoader();

							},

							// completed callback.
							completed: function (error) {

								target.hideLoader();

								if (error)
									Wisej.onException(new Error(error));
							}
						}
					);
				}
			}
		},
		__handleDragEnter: function (e) {

			e.preventDefault();
			e.stopPropagation();

			if (e.dataTransfer) {

				var target = this.__getDropTarget(e);
				if (target) {

					// if we have a valid target, send the event to the server.
					var dropTarget = wisej.utils.Widget.getWidgetFromPoint(null, e.pageX, e.pageY);
					target.fireDataEvent("nativedragenter", {
						x: e.pageX | 0,
						y: e.pageY | 0,
						dropTarget: dropTarget,
						fileTypes: this.__getFileTypes(e)
					});

					e.dataTransfer.effectAllowed = "copyMove";
				}
			}
		},
		__handleDragOver: function (e) {

			e.preventDefault();
			e.stopPropagation();

			if (e.dataTransfer) {

				var effect = "none";
				var target = this.__getDropTarget(e);
				if (target) {

					// if we have a valid target, send the event to the server.
					var dropTarget = wisej.utils.Widget.getWidgetFromPoint(null, e.pageX, e.pageY);
					target.fireDataEvent("nativedragover", {
						x: e.pageX | 0,
						y: e.pageY | 0,
						dropTarget: dropTarget,
						fileTypes: this.__getFileTypes(e)
					});

					// update the drop effect. this will most likely be the previous
					// drop effect returned by the server.
					if (this.getDropTarget() == target) {
						switch (this.getDropEffect()) {
							case 1: effect = "copy"; break;
							case 2: effect = "move"; break;
							case 4: effect = "link"; break;
						}
					}
				}
				e.dataTransfer.dropEffect = effect;
			}
		},
		__handleDragLeave: function (e) {

			e.preventDefault();
			e.stopPropagation();

			if (e.dataTransfer) {

				var target = this.__getDropTarget(e);
				if (target) {

					// if we have a valid target, send the event to the server.
					target.fireEvent("nativedragleave");
				}
			}
		},
		__getDropTarget: function (e) {

			var el = e.target;
			var component = qx.ui.core.Widget.getWidgetByElement(el);

			while (component != null && (!component.isWisejComponent || !component.isDroppable())) {
				component = component.getLayoutParent();
			}

			return component;
		},
		__getDropSource: function (e) {

			var el = e.target;
			var component = qx.ui.core.Widget.getWidgetByElement(el);
			while (
				component != null
				&& !component.isWisejComponent
				&& !component.isDraggable()) {

				component = component.getLayoutParent();
			}

			return component;
		},
		__getFiles: function (e) {

			if (e.dataTransfer)
				return e.dataTransfer.files;
		},
		__getItems: function (e) {

			if (e.dataTransfer)
				return e.dataTransfer.items;
		},
		__getFileTypes: function (e) {

			var fileTypes = [];
			var files = this.__getItems(e) || this.__getFiles(e);
			if (files) {
				for (var i = 0; i < files.length; i++)
					fileTypes.push(files[i].type);
			}

			return fileTypes;
		},

	}

});
