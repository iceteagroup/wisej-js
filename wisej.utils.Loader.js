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
 * wisej.utils.Loader
 * 
 * Loader singleton. Loads user defined packages.
 */
qx.Class.define("wisej.utils.Loader", {

	type: "static",
	extend: qx.core.Object,

	statics: {

		// loader cache.
		__cache: {},

		/**
		 * load
		 *
		 * Loads the packages synchronously in the order they are defined.
		 *
		 * Each package has a unique name and a url: i.e. {id:"jQuery", url:"...", integrity:""}.
		 *
		 * The callback method is invoked when all the packages are loaded, the function
		 * takes one result argument that receives the value "complete" or "error".
		 *
		 * @param packages {Array} array of package definitions.
		 * @param callback {Function(result)} callback function.
		 */
		load: function (packages, callback) {

			if (packages == null || packages.length == 0)
				return;

			var index = 0,
				errors = 0,
				list = packages,
				count = list.length;

			var loadClosure = function () {

				if (index >= count)
					return;

				var pkg = list[index];
				if (pkg && pkg.id && pkg.url) {

					wisej.utils.Loader.__load(pkg.id, pkg.url, pkg.integrity, function (result) {

						index++;
						if (result == "error")
							errors++;

						if (index >= count) {
							// done.
							if (callback)
								callback(errors > 0 ? "error" : "complete");
						}
						else if (errors == 0) {
							// load the next package.
							loadClosure();
						}

					});
				}
				else {
					// if the package is invalid, skip it and re-enter to
					// load the next.
					index++;
					loadClosure();
				}

			}

			// start by loading the first package.
			loadClosure();
		},

		/**
		 * Loads the specified script.
		 */
		__load: function (id, url, integrity, callback) {

			if (!id || !url)
				return;

			// retrieve the existing package with the same id.
			var cache = wisej.utils.Loader.__cache;
			var cachedItem = cache[id];

			if (cachedItem != null) {

				// if the package is loading: queue the callback call.
				// if the package is loaded: callback right away.
				if (callback) {
					var state = cachedItem.package.getReadyState();

					if (state === "loading" || state === "initialized") {
						cachedItem.callbacks.push(callback);
					}
					else {
						callback(state === "error" ? "error" : "cached");
					}
				}

				return;
			}

			var callbacks = [];
			var pkg = new qx.io.part.Package([url], id, false, [integrity]);

			cache[id] = {
				package: pkg,
				callbacks: callbacks
			};

			if (callback)
				callbacks.push(callback);

			// load a css or a js?
			if (this.__isCss(url)) {

				qx.bom.Stylesheet.includeFile(url, document,

					// onload
					function () {
						pkg.__readyState = "cached";

						for (var i = 0; i < callbacks.length; i++) {
							callbacks[i]("loaded");
						}
						callbacks.length = 0;
					},

					// onerror
					function () {
						pkg.__readyState = "error";

						for (var i = 0; i < callbacks.length; i++) {
							callbacks[i]("error");
						}
						callbacks.length = 0;
					}
				);
			}
			else {

				pkg.load(function () {
					var state = this.getReadyState() === "error" ? "error" : "complete";

					for (var i = 0; i < callbacks.length; i++) {
						callbacks[i](state);
					}
				}, pkg);
			}
		},

		/**
		 * isLoading
		 *
		 * Returns true if the loader is busy loading any package.
		 */
		isLoading: function () {

			var packages = wisej.utils.Loader.__packages;
			if (packages == null)
				return false;

			for (var id in packages) {
				var pkg = packages[i];
				if (pkg.getReadyState() == "loading")
					return true;
			}

			return false;
		},

		/**
		 * Determines whether the URL is a css file.
		 *
		 * @param url {String} URL to check.
		 */
		__isCss: function (url) {

			if (!url)
				return false;

			url = url.toLowerCase();
			return qx.lang.String.endsWith(url, ".css") || url.indexOf(".css?") > -1;
		}
	}

});
