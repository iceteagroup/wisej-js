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
 * wisej.web.Upload
 */
qx.Class.define("wisej.web.Upload", {

	extend: qx.ui.core.Widget,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejControl],

	/**
	 * Constructor.
	 */
	construct: function () {

		this.base(arguments);

		var layout = new qx.ui.layout.HBox();
		this._setLayout(layout);
		layout.setReversed(true);
		this._createChildControl("button");
		this._createChildControl("textfield");
		this.__upload = this.__createUploadElement();

		this.initButtonPosition();
	},

	events:
	{
		/** Fired while the upload progresses.
		 *
		 * The data contains {loaded, total}.
		 */
		"progress": "qx.event.type.Data",
	},

	properties: {

		// Appearance override
		appearance: { refine: true, init: "upload" },

		/**
		 * Multiple property.
		 *
		 * Allows multiple files to be selected for uploading.
		 */
		multiple: { init: false, check: "Boolean", apply: "_applyMultiple" },

		/**
		 * AllowedFileTypes property.
		 *
		 * specifies the types of files that the server accepts (that can be submitted through a file upload).
		 * See http://www.w3schools.com/tags/att_input_accept.asp.
		 *
		 * Accepts a string using this format (the pipe indicates alternative options, should NOT be in the string):
		 *
		 *		<input accept="file_extension|audio/*|video/*|image/*|media_type">
		 *
		 */
		allowedFileTypes: { init: "", check: "String", apply: "_applyAllowedFileTypes" },

		/**
		 * MaxSize property in bytes.
		 *
		 * Limits the size of the files that can be uploaded.
		 */
		maxFileSize: { init: 0, check: "PositiveInteger" },

		/**
		 * Text property.
		 *
		 * The text to show in the upload button.
		 */
		text: { init: null, apply: "_applyText", nullable: true, check: "String", themeable: true },

		/**
		 * ButtonPosition property.
		 *
		 * Sets the position of the button relative to the field.
		 */
		buttonPosition: { init: "middleRight", check: "String", apply: "_applyButtonPosition", themeable: true },

		/**
		 * Icon property.
		 *
		 * The icon shown in the upload button.
		 */
		icon: { init: "icon-upload", check: "String", apply: "_applyIcon", nullable: true, themeable: true },

		/**
		 * TextAlign property.
		 *
		 * Values: topLeft, topCenter, topRight, middleLeft, middleCenter, middleRight, bottomLeft, bottomCenter, bottomRight.
		 */
		textAlign: { init: "middleCenter", check: "String", apply: "_applyTextAlign", themeable: true },

		/**
		 * Value property.
		 *
		 * The text displayed in the textfield.
		 */
		value: { init: null, nullable: true, check: "String", apply: "_applyValue" },

		/**
		 * HideValue property.
		 *
		 * Hides the value field.
		 */
		hideValue: { init: false, check: "Boolean", apply: "_applyHideValue", themeable: true },

		/**
		 * SubmitURL property.
		 *
		 * The URL to use to send the files to the server.
		 */
		submitURL: { init: "", check: "String" },

		/**
		 * ShowLoader property.
		 *
		 * When true, the Upload widget shows the ajax loader when uploading files.
		 */
		showLoader: { init: true, check: "Boolean" },
	},

	statics: {

		/** 
		 * Uploads the files to the server using the submitUrl which may wire the
		 * request to a specific component or to the application instance (id="app").
		 *
		 * @param files {Array} the array of files to package and send.
		 * @param submitUrl {String} the url to submit the data to.
		 * @param filter {String} the allowed file types using this format: "file_extension|audio/*|video/*|image/*|media_type".
		 * @param maxSize {Integer} the maximum size in bytes for each file.
		 * @param callbacks {Map} a map with the following handlers:
		 *
		 *		uploading(fileList[])
		 *		uploaded(fileList[])
		 *		completed(error)
		 *
		 * @returns fileList {Array} the list of file names sent to the server.
		 */
		uploadFiles: function (files, submitUrl, filter, maxSize, callbacks) {

			if (!submitUrl)
				return;

			// normalize the callbacks.
			callbacks = callbacks || {};

			var fileList = [];
			var fileTooLargeNames = [];
			var fileTooLargeSizes = [];
			var formData = new FormData();

			// filter the files first.
			for (var i = 0; i < files.length; i++) {
				var file = files[i];

				// enforce max size.
				if (maxSize > 0 && file.size > maxSize) {

					// save the file too large reference to report the error to the server.
					fileTooLargeNames.push(file.name);
					fileTooLargeSizes.push(file.size);
					continue;
				}

				fileList.push(file.name);
				formData.append('file', file, file.name);
			}

			// don't post if there are no files to post.
			if (fileList.length > 0) {

				// send the data to our handler.
				var xhr = new XMLHttpRequest();
				xhr.open("POST", submitUrl, true);
				xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
				xhr.setRequestHeader("X-Wisej-RequestType", "Postback");

				// uploading...
				if (callbacks.uploading)
					callbacks.uploading(fileList, xhr);

				// progress callback.
				xhr.upload.onprogress = callbacks.progress;

				xhr.onreadystatechange = function () {

					if (xhr.readyState == 4) {

						if (xhr.status === 200) {

							// uploaded...
							if (callbacks.uploaded)
								callbacks.uploaded(fileList);

							// completed...
							if (callbacks.completed)
								callbacks.completed();

							// let Wisej process the response from the server.
							Wisej.Core.processResponse.call(Wisej.Core, xhr.responseText);

						} else {

							// completed with error...
							if (callbacks.completed)
								callbacks.completed({ error: "upload", message: xhr.statusText });

						}
					}
				};
				xhr.send(formData);
			}

			// report the list of files that are too large.
			if (fileTooLargeNames.length > 0 && callbacks.completed)
				callbacks.completed({ error: "fileTooLarge", fileNames: fileTooLargeNames, fileSizes: fileTooLargeSizes });

			return fileList;
		},

	},

	members: {

		// the upload element.
		__upload: null,

		// the current http request, needed to cancel.
		__currentXhr: null,

		/**
		 * Opens the file selection dialog and uploads the files to the server/
		 */
		upload: function () {

			if (this.__upload) {
				this.__upload.value = "";
				this.__upload.click();
			}
		},

		/**
		 * Aborts the current upload http request.
		 */
		abort: function () {

			if (this.__currentXhr) {
				this.__currentXhr.abort();
				this.__currentXhr = null;
			}
		},

		/**
		 * Performs the upload procedure.
		 */
		_onExecute: function (e) {

			this.upload();
		},

		/**
		 * Returns the list of selected files.
		 */
		getFiles: function () {

			if (this.__upload)
				return this.__upload.files;
		},

		/**
		 * Applies the multiple property.
		 */
		_applyMultiple: function (value, old) {

			if (this.__upload)
				this.__upload.multiple = (value === true);
		},

		/**
		 * Applies the hideValue property.
		 */
		_applyHideValue: function (value, old) {

			this.getChildControl("textfield").setVisibility(
				value ? "excluded" : "visible");

			var button = this.getChildControl("button");
			button.setAllowGrowX(value);
			button.setLayoutProperties({ flex: value ? 1 : 0 });
		},

		/**
		 * Applies the value property.
		 */
		_applyValue: function (value, old) {

			this.getChildControl("textfield").setValue(value);
		},

		/**
		 * Applies the text property.
		 */
		_applyText: function (value, old) {

			this.getChildControl("button").setLabel(value);
		},

		/**
		 * Applies the icon property.
		 */
		_applyIcon: function (value, old) {

			var button = this.getChildControl("button");
			button.setIcon(value);
			button.setShow(value ? "both" : "label");

		},

		// redirected to the textfield child.
		_applyNativeContextMenu: function (value, old) {

			if (this.hasChildControl("textfield"))
				this.getChildControl("textfield").setNativeContextMenu(value);
		},

		// redirected to the button child.
		_applyBackgroundColor: function (value, old) {

			this.getChildControl("button").setBackgroundColor(value);
		},

		// redirected to the button child.
		_applyTextColor: function (value, old) {

			this.getChildControl("button").setTextColor(value);
		},

		/**
		 * Applies the buttonPosition property.
		 */
		_applyButtonPosition: function (value, old) {

			var layout = this._getLayout();
			var button = this.getChildControl("button");
			var textField = this.getChildControl("textfield");

			this.removeState(old);
			this.addState(value);
			button.removeState(old);
			button.addState(value);
			textField.removeState(old);
			textField.addState(value);

			if (value != null) {

				if (!this.getHideValue())
					button.setAllowGrowX(false);

				if (value == "middleLeft" || value == "middleRight") {
					// HBox
					if (!(layout instanceof qx.ui.layout.HBox)) {
						layout.dispose();
						layout = new qx.ui.layout.HBox();
						this._setLayout(layout);
					}
				}
				else {
					// VBox
					if (!(layout instanceof qx.ui.layout.VBox)) {
						layout.dispose();
						layout = new qx.ui.layout.VBox();
						this._setLayout(layout);
					}
				}

				switch (value) {
					// HBox
					case "middleRight":
						layout.setReversed(true);
						break;
					case "middleLeft":
						layout.setReversed(false);
						break;

						// VBox
					case "middleCenter":
						button.setAllowGrowX(true);
						break;
					case "topRight":
						layout.setReversed(false);
						button.setAlignX("right");
						break;
					case "topLeft":
						layout.setReversed(false);
						button.setAlignX("left");
						break;
					case "topCenter":
						layout.setReversed(false);
						button.setAlignX("center");
						break;
					case "bottomRight":
						layout.setReversed(true);
						button.setAlignX("right");
						break;
					case "bottomLeft":
						layout.setReversed(true);
						button.setAlignX("left");
						break;
					case "bottomCenter":
						layout.setReversed(true);
						button.setAlignX("center");
						break;
				}
			}

		},

		/**
		 * Applies the textAlign property.
		 */
		_applyTextAlign: function (value, old) {

			var button = this.getChildControl("button");

			var center = false;
			if (value != null) {
				switch (value) {
					case "topRight":
						value = "bottom-left";
						break;
					case "middleRight":
						center = true;
						value = "left";
						break;
					case "bottomRight":
						value = "top-left";
						break;
					case "topLeft":
						value = "bottom-right";
						break;
					case "topCenter":
						center = true;
						value = "bottom";
						break;
					case "middleLeft":
						center = true;
						value = "right";
						break;
					case "middleCenter":
						center = true;
						value = "left";
						break;
					case "bottomLeft":
						value = "top-right";
						break;
					case "bottomCenter":
						center = true;
						value = "top";
						break;
					default:
						value = "left";
						break;
				}

				button.setIconPosition(value);
				button.setCenter(center);
			}

		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "button":
					control = new qx.ui.form.Button().set({
						allowGrowX: false,
						allowGrowY: true,
						icon: this.getIcon()
					});
					control.addListener("execute", this._onExecute, this);
					this._add(control);
					break;

				case "textfield":
					control = new qx.ui.form.TextField().set({
						allowGrowX: true,
						allowGrowY: true,
						focusable: false,
						readOnly: true
					});
					control.addState("inner");
					this._add(control, { flex: 1 });
					break;
			}
			return control || this.base(arguments, id);
		},


		/**
		 * Applies the allowedFileTypes property.
		 */
		_applyAllowedFileTypes: function (value, old) {

			if (this.__upload)
				qx.bom.element.Attribute.set(this.__upload, "accept", value);
		},

		// creates the inner invisible upload html.
		__createUploadElement: function () {

			var el = wisej.utils.Widget.ensureDomElement(this);

			var uploadEl = qx.dom.Element.create("input", {
				type: "file",
				accept: this.getAllowedFileTypes(),
				style: "opacity:0; width:0px; height:0px; overflow:hidden",
			});
			el.appendChild(uploadEl);

			// attach the change event handler to upload right after the selection.
			qx.bom.Element.addListener(uploadEl, "change", this.__onUpload, this);

			// apply the multiple property.
			this._applyMultiple(this.getMultiple());

			return uploadEl;
		},

		/**
		 * Uploads the selected files.
		 */
		__onUpload: function (e) {

			// copy the value from the inner upload control, when in design mode.
			if (wisej.web.DesignMode) {
				var textField = this.getChildControl("textfield");
				textField.setValue(this.__upload.value);
				return;
			}

			// don't post if the session is expired or the submitURL has not
			// been set.
			var submitUrl = this.getSubmitURL();
			if (!submitUrl)
				return;

			if (Wisej.Core.session.expired)
				return;

			// read selected files.
			var files = this.getFiles();
			if (files == null || files.length == 0)
				return;

			// send files back to this widget.
			// submitUrl += "&v=" + Date.now();
			var me = this;
			this.__currentXhr = null;
			var fileList = wisej.web.Upload.uploadFiles(
				files,
				submitUrl,
				this.getAllowedFileTypes(),
				this.getMaxFileSize(),
				{
					uploading: function (list, xhr) {

						me.__currentXhr = xhr;

						if (me.getShowLoader())
							me.showLoader();
					},

					uploaded: function (fileList) {

						me.__currentXhr = null;

						// fire the "uploaded" event.
						me.fireDataEvent("uploaded", fileList);
					},

					completed: function (error) {

						me.hideLoader();
						me.__currentXhr = null;

						if (error)
							// fire the "error" event.
							me.fireDataEvent("error", error);
					},

					progress: function (evt) {

						me.fireDataEvent("progress", { loaded: evt.loaded, total: evt.total });

					}
				}
			);

			// fire the "valueChanged" event.
			this.fireDataEvent("valueChanged", fileList);
		},
	}
});