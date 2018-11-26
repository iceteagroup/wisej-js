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
 * wisej.web.Media
 */
qx.Class.define("wisej.web.Media", {

	extend: qx.ui.core.Widget,

	type: "abstract",

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	construct: function () {

		this.base(arguments);

		this._media = this._createMediaElement();

		// initialize the volume with the default value.
		this.initVolume();

		// add local state events.
		this.setStateEvents(this.getStateEvents().concat(["volumechanged", "timeupdate"]));
		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["volume", "currentTime"]));

		// attach design-mode event to render the control at design time.
		this.addListenerOnce("appear", this._onAppear);

		// hook media events.
		this._media.addListener("loadeddata", this.__onLoadedData, this);
		this._media.addListener("volumechange", this.__onVolumeChange, this);
		this._media.addListener("timeupdate", this.__onTimeUpdate, this);
		this._media.addListener("pause", this.__onPause, this);
		this._media.addListener("ended", this.__onEnded, this);
		this._media.addListener("play", this.__onPlaying, this);
		this._media.addListener("playing", this.__onPlaying, this);
		this._media.addListener("waiting", this.__onWaiting, this);
		this._media.addListener("error", this.__onError, this);
		this._media.addListener("abort", this.__onError, this);
		this._media.addListener("stalled", this.__onError, this);
	},

	properties: {

		/**
		 * Source property.
		 *
		 * Indicates the source URL of the video media file. 
		 */
		source: { init: "", check: "String", apply: "_applySource" },

		/**
		 * ShowControls property.
		 *
		 * Shows the native video controls: play, stop, etc...
		 */
		showControls: { init: true, check: "Boolean", apply: "_applyShowControls" },

		/**
		 * Loop property.
		 *
		 * Indicates that the video should play in a loop.
		 */
		loop: { init: false, check: "Boolean", apply: "_applyLoop" },

		/**
		 * AutoPlay property.
		 *
		 * Starts playing the video automatically as soon as the media file is loaded.
		 */
		autoPlay: { init: false, check: "Boolean", apply: "_applyAutoPlay" },

		/**
		 * Muted property.
		 *
		 * Sets or returns whether the audio/video is muted or not.
		 */
		muted: { init: false, check: "Boolean", apply: "_applyMuted" },

		/**
		 * Volume property.
		 *
		 * Sets or returns the volume of the audio/video.
		 */
		volume: { init: 0.5, check: "Number", apply: "_applyVolume" },

		/**
		 * CurrentTime property.
		 *
		 * Sets or returns the current playback position in the audio/video (in seconds).
		 */
		currentTime: { init: 0, check: "Number", apply: "_applyCurrentTime" },

	},

	members: {

		/** the media element */
		_media: null,

		/**
		 * Starts playing the audio/video.
		 */
		play: function () {

			this._media.play();
		},

		/**
		 * Pauses the currently playing audio/video.
		 */
		pause: function () {

			this._media.pause();
		},

		/**
		 * Creates the inner media element.
		 */
		_createMediaElement: function () {

			throw new Error("_createMediaElement is not implemented.");
		},

		_onAppear: function (e) {

			var dom = this.getContentElement().getDomElement();
			var media = this._media.getMediaObject();
			media.style.width = "100%";
			media.style.height = "100%";
			dom.appendChild(media);

		},

		/**
		 * Applies the source property.
		 */
		_applySource: function (value, old) {

			if (value == null)
				value = "";

			this._media.setSource(value);
		},

		/**
		 * Applies the loop property.
		 */
		_applyLoop: function (value, old) {

			this._media.setLoop(value);
		},

		/**
		 * Applies the autoPlay property.
		 */
		_applyAutoPlay: function (value, old) {

			this._media.setAutoplay(value);
		},

		/**
		 * Applies the showControls property.
		 */
		_applyShowControls: function (value, old) {

			if (value)
				this._media.showControls();
			else
				this._media.hideControls();
		},

		/**
		 * Applies the muted property.
		 */
		_applyMuted: function (value, old) {

			this._media.setMuted(value);
		},

		/**
		 * Applies the volume property.
		 */
		_applyVolume: function (value, old) {

			this._media.setVolume(value);
		},

		/**
		 * Applies the currentTime property.
		 */
		_applyCurrentTime: function (value, old) {

			if (this._media.readyState > 0)
				this._media.setCurrentTime(value);
		},

		// loadeddata event
		__onLoadedData: function () {

			this._media.setCurrentTime(this.getCurrentTime());
		},
		// volumechange event
		__onVolumeChange: function () {

			this.setVolume(this._media.getVolume());
			this.fireDataEvent("volumechanged", this.getVolume());
		},
		// timeupdate event
		__onTimeUpdate: function () {

			this.setCurrentTime(this._media.getCurrentTime());
			this.fireDataEvent("timeupdated", this.getCurrentTime());
		},
		// pause event
		__onPause: function () {

			this.fireEvent("paused");
		},
		// ended event
		__onEnded: function () {

			this.fireEvent("ended");
		},
		// playing event
		__onPlaying: function () {

			this.fireEvent("playing");
		},
		// waiting event
		__onWaiting: function () {

			this.fireEvent("waiting");
		},
		// error event
		__onError: function () {

			this.fireEvent("error");
		},

	},

	destruct: function() {
		this._disposeObjects("_media");
	}
});


/**
 * wisej.web.Video
 */
qx.Class.define("wisej.web.Video", {

	extend: wisej.web.Media,

	properties: {

		appearance: { init: "video", refine: true },

		/**
		 * PosterImage property.
		 *
		 * Indicates the image to display while the video is loading and before it starts playing.
		 */
		posterImage: { init: "", check: "String", apply: "_applyPosterImage", transform: "_tranformImageSource" },
	},

	members: {

		/**
		 * Creates the inner media element.
		 */
		_createMediaElement: function () {

			return new qx.bom.media.Video();

		},

		/**
		 * Applies the posterImage property.
		 */
		_applyPosterImage: function (value, old) {

			this._media.setPoster(value);
		},

		// overridden to delay the "render" event to give a chance
		// to the designer to pick the correct rendered control.
		_onDesignRender: function () {

			var me = this;

			// if the video widget being designed
			// and it specified a source, we wait for the video to be loaded
			// or an error to occurr to fire the render event.
			if (this.getSource()) {

				var me = this;
				var video = this._media.getMediaObject();

				var renderWhenReady = function () {

					if (video.readyState >= 2 /*HAVE_CURRENT_DATA*/
						|| video.networkState == 3 /*NETWORK_NO_SOURCE*/) {

						setTimeout(function () {
							me.fireEvent("render");
						}, 100);
					}
					else {
						setTimeout(renderWhenReady, 50);
					}
				}

				setTimeout(renderWhenReady, 50);
				return;
			}

			// no source, render right away.
			setTimeout(function () {
				me.fireEvent("render");
			}, 10);
		},

	},

});

/**
 * wisej.web.Audio
 */
qx.Class.define("wisej.web.Audio", {

	extend: wisej.web.Media,

	properties: {

		appearance: { init: "audio", refine: true },

	},

	members: {

		/**
		 * Creates the inner media element.
		 */
		_createMediaElement: function () {

			return new qx.bom.media.Audio();

		},
	},
});
