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
 * wisej.web.colorPicker.SaturationPane
 *
 */
qx.Class.define("wisej.web.colorPicker.SaturationPane", {

	extend: wisej.web.Control,

	construct: function () {

		this.base(arguments, new qx.ui.layout.HBox(10));

		this._createChildControl("saturation-pane");
		this._createChildControl("brightness-pane");
	},

	events:
	{
		/**
		 * ChangeValue event.
		 *
		 * Fired when the value changes
		 */
		"changeValue": "qx.event.type.Data"
	},

	properties: {

		/** 
		 * Red property.
		 *
		 * The numeric red value of the selected color.
		 */
		red: { check: "Integer", init: 255, apply: "_applyRed" },

		/**
		 * Green property.
		 *
		 * The numeric green value of the selected color.
		 */
		green: { check: "Integer", init: 255, apply: "_applyGreen" },

		/** 
		 * Blue property.
		 *
		 * The numeric blue value of the selected color.
		 */
		blue: { check: "Integer", init: 255, apply: "_applyBlue" },

		/** 
		 * Hue property.
		 * 
		 * The numeric hue value.
		 */
		hue: { check: "Number", init: 0, apply: "_applyHue" },

		/** 
		 * Saturation property.
		 * 
		 * The numeric saturation value.
		 */
		saturation: { check: "Number", init: 0, apply: "_applySaturation" },

		/** 
		 * Brightness property.
		 * 
		 * The numeric brightness value.
		 */
		brightness: { check: "Number", init: 100, apply: "_applyBrightness" }
	},

	members: {

		/**
		 * @type {String} Name of child control which is captured.
		 */
		__capture: "",

		/**
		 * @type {Number} Numeric brightness value
		 */
		__brightnessSubtract: 0,

		// internal boolean flag to signal, that the value is set to null
		__nullValue: true,

		// internal mutex to prevent the changeValue event to be fired too often
		// and setters to re-enter when updating each other.
		__internalChange: 0,

		/**
		 * The value of the ColorSelector is a string containing the HEX value of
		 * the currently selected color. Take a look at
		 * {@link qx.util.ColorUtil#stringToRgb} to see what kind of input the
		 * method can handle.
		 *
		 * @param value {String} The value of a color.
		 */
		setValue: function (value) {
			var rgb;

			if (value == null) {
				this.__nullValue = true;
				rgb = [255, 255, 255];
			}
			else {
				rgb = qx.util.ColorUtil.stringToRgb(value);
				this.__nullValue = false;
			}

			this.__internalChange++;
			this.setRed(rgb[0]);
			this.setGreen(rgb[1]);
			this.setBlue(rgb[2]);
			this.__internalChange--;
			this._setHueFromRgb();

			this.__fireChangeValueEvent();
		},

		/**
		 * Returns the currently selected color.
		 *
		 * @return {String | null} The HEX value of the color of if not color
		 *   is set, null.
		 */
		getValue: function () {
			return this.__nullValue
				? null
				: qx.util.ColorUtil.rgbToHexString([this.getRed(), this.getGreen(), this.getBlue()]
			);
		},

		/**
		 * Resets the color to null.
		 */
		resetValue: function () {

			this.__internalChange++;
			this.__nullValue = true;
			this.setRed(255);
			this.setGreen(255);
			this.setBlue(255);
			this.__internalChange--;

			this.__fireChangeValueEvent();
		},

		/**
		 * Applies the Red property.
		 */
		_applyRed: function (value, old) {

			this._setHueFromRgb();
			this.__fireChangeValueEvent();
		},

		/**
		 * Applies the Green property.
		 */
		_applyGreen: function (value, old) {

			this._setHueFromRgb();
			this.__fireChangeValueEvent();
		},

		/**
		 * Applies the Blue property.
		 */
		_applyBlue: function (value, old) {

			this._setHueFromRgb();
			this.__fireChangeValueEvent();
		},

		/**
		 * Applies the Hue property.
		 */
		_applyHue: function (value, old) {

			if (this.getChildControl("saturation-handle").getBounds()) {
				this.getChildControl("saturation-handle").setDomLeft(Math.round(value / 1.40625) + this.getChildControl("saturation-pane").getPaddingLeft());
			} else {
				this.getChildControl("saturation-handle").setLayoutProperties({ left: Math.round(value / 1.40625) });
			}

			this._setRgbFromHue();
			this._setBrightnessGradient();
			this.__fireChangeValueEvent();
		},

		/**
		 * Applies the Saturation property.
		 */
		_applySaturation: function (value, old) {

			if (this.getChildControl("saturation-handle").getBounds()) {
				this.getChildControl("saturation-handle").setDomTop(256 - Math.round(value * 2.56) + this.getChildControl("saturation-pane").getPaddingTop());
			} else {
				this.getChildControl("saturation-handle").setLayoutProperties({ top: 256 - Math.round(value * 2.56) });
			}

			this._setRgbFromHue();
			this._setBrightnessGradient();
			this.__fireChangeValueEvent();
		},

		/**
		 * Applies the Brightness property.
		 */
		_applyBrightness: function (value, old) {

			var topValue = 256 - Math.round(value * 2.56);

			if (this.getChildControl("brightness-handle").getBounds()) {
				this.getChildControl("brightness-handle").setDomTop(topValue + this.getChildControl("brightness-pane").getPaddingTop());
			} else {
				this.getChildControl("brightness-handle").setLayoutProperties({ top: topValue });
			}

			this._setRgbFromHue();
			this.__fireChangeValueEvent();
		},

		/**
		 * Sets hue value to it's corresponding red, green and blue value.
		 */
		_setHueFromRgb: function () {

			if (this.__internalChange)
				return;

			this.__internalChange++;
			var hsb = qx.util.ColorUtil.rgbToHsb([this.getRed(), this.getGreen(), this.getBlue()]);
			this.setHue(hsb[0]);
			this.setSaturation(hsb[1]);
			this.setBrightness(hsb[2]);
			this.__internalChange--;
		},

		/**
		 * Sets red, green and blue value to corresponding hue value.
		 */
		_setRgbFromHue: function () {

			if (this.__internalChange)
				return;

			this.__internalChange++;
			var vRgb = qx.util.ColorUtil.hsbToRgb([this.getHue(), this.getSaturation(), this.getBrightness()]);
			this.setRed(vRgb[0]);
			this.setGreen(vRgb[1]);
			this.setBlue(vRgb[2]);
			this.__internalChange--;
		},

		/**
		 * Updates the background of the brightness field to give a nicer gradient
		 */
		_setBrightnessGradient: function () {

			var ColorUtil = qx.util.ColorUtil;
			var helpRgb = ColorUtil.hsbToRgb([this.getHue(), this.getSaturation(), 255]);
			var helpRgbString = ColorUtil.rgbToRgbString(helpRgb)
			this.getChildControl("brightness-field").setBackgroundColor(helpRgbString);
		},

		/**
		 * Sets the saturation and moves the saturation handle.
		 *
		 * @param e {qx.event.type.Pointer} Incoming event object
		 */
		_setHueSaturationOnFieldEvent: function (e) {

			if (this.__internalChange)
				return;

			this.__internalChange++;
			var vTop = qx.lang.Number.limit(e.getDocumentTop() - this.__hueSaturationSubtractTop, 0, 256);
			var vLeft = qx.lang.Number.limit(e.getDocumentLeft() - this.__hueSaturationSubtractLeft, 0, 256);
			this.getChildControl("saturation-handle").setDomPosition(vLeft, vTop);
			this.setSaturation(100 - Math.round(vTop / 2.56));
			this.__internalChange--;

			this.setHue(Math.round(vLeft * 1.40625));
		},

		/**
		 * Helper for firing the changeValue event and checking for the mutex.
		 */
		__fireChangeValueEvent: function () {

			if (!this.__internalChange) {
				this.__nullValue = false;
				this.fireDataEvent("changeValue", this.getValue());
			}
		},

		/**
		 * Listener of roll event on the saturation pane.
		 * Adjusts the color by changing the saturation.
		 *
		 * @param e {qx.event.type.Roll} Incoming event object
		 */
		_onHueSaturationPaneRoll: function (e) {
			e.stop();

			// only wheel
			if (e.getPointerType() != "wheel") {
				return;
			}

			var delta = e.getDelta();
			this.setSaturation(qx.lang.Number.limit(this.getSaturation() - delta.y / 10, 0, 100));
			this.setHue(qx.lang.Number.limit(this.getHue() + delta.x / 10, 0, 360));
		},

		/**
		 * Listener of pointerdown event on the saturation field.
		 * Adjusts the color by changing the saturation.
		 * Sets pointer capture.
		 *
		 * @param e {qx.event.type.Pointer} Incoming event object
		 */
		_onHueSaturationFieldPointerDown: function (e) {

			// Calculate substract: Half width/height of handler
			var location = this.getChildControl("saturation-field").getContentLocation();
			var handleBounds = this.getChildControl("saturation-handle").getBounds();
			var fieldBounds = this.getChildControl("saturation-field").getBounds();

			this.__hueSaturationSubtractTop = location.top + (handleBounds.height / 2) - fieldBounds.top;
			this.__hueSaturationSubtractLeft = location.left + (handleBounds.width / 2) - fieldBounds.left;

			// Update
			this._setHueSaturationOnFieldEvent(e);

			// Afterwards: Activate Capturing for handle
			this.getChildControl("saturation-handle").capture();
			this.__capture = "saturation-handle";
		},

		/**
		 * Listener of pointerdown event on the brightness field.
		 * Adjusts the color by changing the brightness.
		 *
		 * @param e {qx.event.type.Pointer} Incoming event object
		 */
		_onBrightnessFieldPointerDown: function (e) {

			// Calculate substract: Half height of handler
			var location = this.getChildControl("brightness-field").getContentLocation();
			var bounds = this.getChildControl("brightness-handle").getBounds();
			this.__brightnessSubtract = location.top + (bounds.height / 2);

			// Update
			this._setBrightnessOnFieldEvent(e);

			// Afterwards: Activate Capturing for handle
			this.getChildControl("brightness-handle").capture();
			this.__capture = "brightness-handle";
		},

		/**
		 * Listener of pointermove event on the brightness handle.
		 * Forwards the event to _setBrightnessOnFieldEvent().
		 *
		 * @param e {qx.event.type.Pointer} Incoming event object
		 */
		_onBrightnessHandlePointerMove: function (e) {

			// Update if captured currently (through previous pointerdown)
			if (this.__capture === "brightness-handle") {
				this._setBrightnessOnFieldEvent(e);
				e.stopPropagation();
			}
		},

		/**
		 * Listener of pointerdown event on the brightness handle.
		 * Adjusts the color by changing the brightness.
		 *
		 * @param e {qx.event.type.Pointer} Incoming event object
		 */
		_onBrightnessHandlePointerDown: function (e) {

			// Activate Capturing
			this.getChildControl("brightness-handle").capture();
			this.__capture = "brightness-handle";

			// Calculate subtract: Position of Brightness Field - Current Pointer Offset
			var locationBrightnessField = this.getChildControl("brightness-field").getContentLocation();
			var locationBrightnessHandle = this.getChildControl("brightness-handle").getContentLocation();
			var fieldBounds = this.getChildControl("brightness-field").getBounds();

			this.__brightnessSubtract = locationBrightnessField.top +
			  (e.getDocumentTop() - locationBrightnessHandle.top) - fieldBounds.top;

			// Block field event handling
			e.stopPropagation();
		},

		/**
		 * Listener of pointerup event on the brightness handle.
		 * Releases the capture.
		 *
		 * @param e {qx.event.type.Pointer} Incoming event object
		 */
		_onBrightnessHandlePointerUp: function (e) {

			// Disabling capturing
			this.getChildControl("brightness-handle").releaseCapture();
			this.__capture = null;
		},

		/**
		 * Sets the brightness and moves the brightness handle.
		 *
		 * @param e {qx.event.type.Pointer} Incoming event object
		 */
		_setBrightnessOnFieldEvent: function (e) {
			var value = qx.lang.Number.limit(e.getDocumentTop() - this.__brightnessSubtract, 0, 256);

			if (this.getChildControl("brightness-handle").getBounds()) {
				this.getChildControl("brightness-handle").setDomTop(value);
			} else {
				this.getChildControl("brightness-handle").setLayoutProperties({ top: value });
			}

			this.setBrightness(100 - Math.round(value / 2.56));
		},

		/**
		 * Listener of roll event on the brightness pane.
		 * Adjusts the color by changing the brightness.
		 *
		 * @param e {qx.event.type.Roll} Incoming event object
		 */
		_onBrightnessPaneRoll: function (e) {

			e.stop();

			// only wheel
			if (e.getPointerType() != "wheel") {
				return;
			}

			this.setBrightness(qx.lang.Number.limit((this.getBrightness() - (e.getDelta().y / 10)), 0, 100));
		},

		/**
		 * Listener of pointerup event on the saturation handle.
		 * Releases pointer capture.
		 *
		 * @param e {qx.event.type.Pointer} Incoming event object
		 */
		_onHueSaturationHandlePointerUp: function (e) {

			// Disabling capturing
			if (this.__capture) {
				e.stopPropagation();
				this.getChildControl("saturation-handle").releaseCapture();
				this.__capture = null;
			}
		},


		/**
		 * Listener of pointermove event on the saturation handle.
		 * Forwards the event to _onHueSaturationHandlePointerMove().
		 *
		 * @param e {qx.event.type.Pointer} Incoming event object
		 */
		_onHueSaturationHandlePointerMove: function (e) {

			// Update if captured currently (through previous pointerdown)
			if (this.__capture === "saturation-handle") {
				this._setHueSaturationOnFieldEvent(e);
				e.stopPropagation();
			}
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "saturation-pane":
					control = new qx.ui.container.Composite(new qx.ui.layout.Canvas()).set({
						allowGrowX: false,
						allowGrowY: false,
					});
					control.addListener("roll", this._onHueSaturationPaneRoll, this);
					control.add(this.getChildControl("saturation-field"));
					control.add(this.getChildControl("saturation-handle"), { left: 0, top: 0 });
					this.add(control);
					break;

				case "saturation-field":
					control = new qx.ui.basic.Image("resource.wx/huesaturation-field.jpg").set({
						margin: [4, 4, 4, 4],
						appearance: "widget"
					});
					control.addListener("pointerdown", this._onHueSaturationFieldPointerDown, this);
					control.addState("borderSolid");
					break;

				case "saturation-handle":
					control = new qx.ui.basic.Image("resource.wx/huesaturation-handle.gif");
					control.addListener("pointerdown", this._onHueSaturationFieldPointerDown, this);
					control.addListener("pointerup", this._onHueSaturationHandlePointerUp, this);
					control.addListener("pointermove", this._onHueSaturationHandlePointerMove, this);
					break;

				case "brightness-pane":
					control = new qx.ui.container.Composite(new qx.ui.layout.Canvas()).set({
						allowGrowX: false,
						allowGrowY: false,
					});
					control.addListener("roll", this._onBrightnessPaneRoll, this);
					control.add(this.getChildControl("brightness-field"));
					control.add(this.getChildControl("brightness-handle"));
					this.add(control);
					break;

				case "brightness-field":
					control = new qx.ui.basic.Image("resource.wx/brightness-field.png").set({
						margin: [5, 5, 3, 7],
						appearance: "widget"
					});
					control.addListener("pointerdown", this._onBrightnessFieldPointerDown, this);
					control.addState("borderSolid");
					break;

				case "brightness-handle":
					control = new qx.ui.basic.Image("resource.wx/brightness-handle.gif");
					control.addListener("pointerdown", this._onBrightnessHandlePointerDown, this);
					control.addListener("pointerup", this._onBrightnessHandlePointerUp, this);
					control.addListener("pointermove", this._onBrightnessHandlePointerMove, this);
					break;
			}

			return control || this.base(arguments, id);
		},

	}

});

/**
 * wisej.web.colorPicker.PresetPane
 *
 */
qx.Class.define("wisej.web.colorPicker.PresetPane", {

	extend: wisej.web.Control,

	construct: function () {

		this.base(arguments, new qx.ui.layout.Grow());

		this._createChildControl("color-grid");
	},

	properties: {

		/**
		 * Value property.
		 */
		value: { init: null, check: "String", event: "changeValue", nullable: true },

		/**
		 * PresetColors property.
		 */
		presetColors: { init: null, check: "Array", apply: "_applyPresetColors", nullable: true },

	},

	members: {

		/** Default list of preset colors. */
		__defaultPresetColors: [
			"maroon", "red", "orange", "yellow", "olive",
			"purple", "fuchsia", "lime", "green", "navy",
			"blue", "aqua", "teal", "black", "#333",
			"#666", "#999", "#BBB", "#EEE", "white"],

		/**
		 * Applies the PresetColors property.
		 */
		_applyPresetColors: function (value, old) {

			if (value != old)
				this.__loadColorGrid(this.getChildControl("color-grid"));
		},

		// Loads the preset colors in the color grid.
		__loadColorGrid: function (colorGrid) {

			var colorPos;
			var colorField;
			var colorTable = this.getPresetColors() || this.__defaultPresetColors;

			for (var i = 0; i < 2; i++) {
				for (var j = 0; j < 10; j++) {
					colorPos = i * 10 + j;
					colorField = this.getChildControl("color#" + colorPos);
					colorField.setBackgroundColor(colorTable[colorPos]);

					colorGrid.add(colorField, { column: j, row: i });
				}
			}
		},

		/**
		 * Listener of tap event on the color field.
		 * Sets red, green and blue values to tapped color field's background color.
		 *
		 * @param e {qx.event.type.Pointer} Incoming event object
		 */
		_onColorFieldTap: function (e) {

			var color = e.getTarget().getBackgroundColor();
			var rgb = qx.util.ColorUtil.stringToRgb(color);
			this.setValue(qx.util.ColorUtil.rgbToHexString(rgb));
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "color-grid":
					control = new qx.ui.container.Composite(new qx.ui.layout.Grid(3, 3));
					this.__loadColorGrid(control);
					this.add(control);
					break;

				case "color":
					control = new qx.ui.core.Widget().set({
						width: 16,
						height: 16,
						appearance: "widget"
					});
					control.addListener("pointerdown", this._onColorFieldTap, this);
					control.addState("borderSolid");
					break;

			}

			return control || this.base(arguments, id);
		},

	}

});