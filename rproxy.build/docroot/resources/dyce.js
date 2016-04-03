/**
 * DynamicViewer JavaScript library (v2)
 *
 * $Id: dynamic_viewer.v2.js 2539 2014-03-13 17:37:46Z plroebuck $
 * Copyright (c) 2011-2013 The University of Texas MD Anderson Cancer Center
 *
 * Depends on jQuery
 */


/**
 * @namespace DynamicViewer specification
 *
 * @author <a href="mailto:proebuck@mdanderson.org">P. Roebuck</a>
 * based on prior work by S. Wu and B. Broom.
 */
var DynamicViewer = (function ($) {

    // Execute in strict mode
    "use strict";


    /*
     * Constants
     */
    var PRODUCT = 'DynamicViewerJS',
        VERSION = '2.0.2',
        UNDEFINED,
        DEFAULT_TIMEOUT = 500;         // 1/2 second (msecs)


    /*
     * Initialization
     */

    // Default AJAX set up
    $.ajaxSetup({
        type: 'GET',
        // Disable caching of AJAX responses
        cache: false
    });


    /*
     * Constructors
     */

    /**
     * Creates an instance of DVApp.
     *
     * @private
     * @constructor
     * @this {DVApp}
     * @param {String} url          URL of the DynamicViewer servlet
     * @param {String} [name]       Name of the server-side dvapp
     * @param {String} [command_id] Command to be invoked
     * @throws {Error} If required argument missing
     */
    function DVApp(url, name, command_id) {
        // Self-invoking constructor
        if (!(this instanceof DVApp)) {
            return new DVApp(url, name, command_id);
        }

        if (!url) {
            throw new Error("'url' argument is required");
        }

        this.url = url;
        this.name = name;
        this.command_id = command_id;
    }


    /**
     * Default timeout for retry attempts property.
     *
     * @this {DVApp}
     */
    DVApp.prototype.timeout = DEFAULT_TIMEOUT;


    /**
     * Sets the default retry timeout for the DVApp.
     * Chainable.
     *
     * @this {DVApp}
     * @return {Object} instance of DVApp
     */
    DVApp.prototype.setTimeout = function (timeout) {
        this.timeout = timeout;
        return this;
    };


    /**
     * Returns a string representation of the DVApp.
     *
     * @override
     * @this {DVApp}
     * @return {String} Human-readable representation of this DVApp
     */
    DVApp.prototype.toString = function () {
        var members = [
            'url'        + '="' +  this.url        + '"',
            'name'       + '="' +  this.name       + '"',
            'command_id' + '="' +  this.command_id + '"',
            'timeout'    + '="' +  this.timeout    + '"'
        ];
        return 'DVApp{' + members.join(', ') + '}';
    };


    /**
     * Creates an instance of AJAX query data.
     * Data item to be passed to the Ajax call from the data in the specified
     * 'app' and the parameters specified by the key/value pairs in 'params'.
     *
     * @private
     * @constructor
     * @this {QueryData}
     * @param {Object} app    instance of DVApp
     * @param {Object} params associative map of query parameters
     * @throws {Error} If required arguments unspecified
     * @throws {TypeError} If argument of wrong type
     */
    function QueryData(app, params) {
        // Self-invoking constructor
        if (!(this instanceof QueryData)) {
            return new QueryData(app, params);
        }

        if (!(app && app instanceof DVApp)) {
            throw new TypeError("'app' argument must be object of type 'DVApp'");
        }

        // If checking on job already submitted, only this param is needed
        var REQUEST_KEY = 'requestKey';
        if (REQUEST_KEY in params) {
            this[REQUEST_KEY] = params[REQUEST_KEY];
        }
        else {
            this.app = app.name;
            this.command_id = app.command_id;
            for (var key in params) {
                this[key] = params[key];
            }

            if (!(this.app && this.command_id)) {
                throw new Error("both 'app' and 'command_id' params must be specified");
            }
        }
    }


    /**
     * Creates an instance of custom Error object for DynamicViewer empty
     * responses.
     *
     * @private
     * @constructor
     * @this {EmptyResponseError}
     * @param {String} message detail error message
     */
    function EmptyResponseError(message) {
        this.name = 'EmptyResponseError';
        this.message = message || 'Empty Response';
    }


    /** Prototype inheritance from Error object */
    EmptyResponseError.prototype = new Error();
    EmptyResponseError.prototype.constructor = EmptyResponseError;


    /**
     * Creates an instance of custom Error object for network error
     * (or CORS violation) responses.
     *
     * @private
     * @constructor
     * @this {NetworkError}
     * @param {String} message detail error message
     */
    function NetworkError(message) {
        this.name = 'NetworkError';
        this.message = message || 'Requested URL Not Reachable (CORS?)';
    }


    /** Prototype inheritance from Error object */
    NetworkError.prototype = new Error();
    NetworkError.prototype.constructor = NetworkError;


    /**
     * Creates an instance of custom Error object for DynamicViewer responses.
     *
     * @private
     * @constructor
     * @this {DVError}
     * @param {Object} jqXHR       jQuery XMLHttpRequest object
     * @param {String} textStatus  description of type of error (or null)
     * @param {String} errorThrown textual portion of HTTP status
     * @see <a href="http://api.jquery.com/jQuery.ajax/">jQuery .ajax()</a>.
     */
    function DVError(jqXHR, textStatus, errorThrown) {
        var statusCode = jqXHR.status,
            errmsg = statusCode + " " + errorThrown + "\n";

        // Check if we have defined error code and msg
        var error  = jqXHR.getResponseHeader('X-Error'),
            stderr = jqXHR.getResponseHeader('X-STDERR'),
            stdout = jqXHR.getResponseHeader('X-STDOUT');

        if (error) {
            errmsg += "Error: " + error + "\n";
        }
        if (stdout) {
            errmsg += "STDOUT: " + stdout + "\n";
        }
        if (stderr) {
            errmsg += "STDERR: " + stderr + "\n";
        }

        this.name = 'DVError';
        this.message = errmsg;

        // Custom fields
        this.jqXHR = jqXHR;
        this.textStatus = textStatus;
        this.errorThrown = errorThrown;
    }


    /** Prototype inheritance from Error object */
    DVError.prototype = new Error();
    DVError.prototype.constructor = DVError;


    /**
     * Creates an instance of AJAX loader which displays "async wait" image
     * while awaiting response from DynamicViewer invocation.
     *
     * @private
     * @constructor
     * @this {AjaxLoader}
     * @param {Object} elem    jQuery selection object
     * @param {Object} options associative map of loader options
     * @author <a href="mailto:simon@aplusdesign.com.au">Simon Ilett</a>
     * slightly modified for spelling and naming conventions.
     */
    function AjaxLoader(elem, options) {
        // Becomes this.options
        var defaults = {
            bgColor       : '#fff',
            duration      : 800,
            opacity       : 0.7,
            classOverride : false
        };

        this.options = jQuery.extend(defaults, options);
        this.container = $(elem);
        this.init = function () {
            var container = this.container;
            // Delete any other loaders
            this.remove();
            // Create the overlay
            var overlay = $('<div></div>').css({
                              'background-color': this.options.bgColor,
                              'opacity':          this.options.opacity,
                              'width':            container.width(),
                              'height':           container.height(),
                              'position':         'absolute',
                              'top':              '0px',
                              'left':             '0px',
                              'z-index':          99999
                          }).addClass('ajax_overlay');
            // Add an overiding class name to set new loader style
            if (this.options.classOverride) {
                overlay.addClass(this.options.classOverride);
            }
            // Insert overlay and loader into DOM
            container.append(
                overlay.append(
                    $('<div></div>').addClass('ajax_loader')
                ).fadeIn(this.options.duration)
            );
        };
        this.remove = function () {
            var overlay = this.container.children(".ajax_overlay");
            if (overlay.length) {
                var duration = this.options.classOverride ? "fast" : 0;
                overlay.fadeOut(duration,
                                function() {
                                    overlay.remove();
                                });
            }
        };
        this.init();
    }


    /*
     * Private functions
     */

    /**
     * Returns the request key from a DynamicViewer response.
     * Expected Format: "requestKey:hashValueOfKey"
     *
     * @private
     * @param {String} responseText text of DyanmicViewer response
     * @return {String} hash value of request key
     */
    function getRequestKey(responseText) {
        return $.trim(responseText.replace('requestKey:', ''));
    }


    /**
     * Returns number of milliseconds to delay before retrying request
     * after DynamicViewer "Service Unavailable" response.
     *
     * @private
     * @param {Object} jqXHR        jQuery XMLHttpRequest object
     * @param {Number} defaultDelay default delay (msecs)
     * @return {Number} delay before retry (msecs)
     */
    function getRetryAfterMsecs(jqXHR, defaultDelay) {
        var MSECS_PER_SEC = 1000,
            retryAfter;    // time to delay between calls [unit: #secs]

        retryAfter = 0 + jqXHR.getResponseHeader('Retry-After');
        return retryAfter ? (retryAfter * MSECS_PER_SEC) : defaultDelay;
    }


    /**
     * Invokes the Dynamic Viewer application 'app' with the parameters
     * supplied in 'params' using an HTTP GET/POST request.
     * If successful, 'callback' is invoked with 'null' as the first parameter
     * and the response as the second parameter; otherwise, 'callback' is
     * invoked with an error object as the first argument.
     *
     * @private
     * @param {DVApp} app         Object representing dvapp
     * @param {Object} params     Parameters to be used by dvapp
     * @param {Object} settings   AJAX settings (user-provided)
     * @param {Function} callback Callback called after dvapp completes
     * @throws {Error} If not enough/too many arguments
     * @throws {TypeError} If argument of wrong type
     */
    function dvAjax(app, params, settings, callback) {
        if (arguments.length !== 4) {
            throw new Error("function requires four arguments");
        }
        else if (!(app instanceof DVApp)) {
            throw new TypeError("'app' argument must be DVApp object");
        }
        else if (typeof(callback) !== 'function') {
            throw new TypeError("'callback' argument must be function");
        }

        var ajaxSettings = {
            url: app.url,
            data: new QueryData(app, params),
            dataType: 'text',
            // A function to be called if the request succeeds. The function
            // gets passed three arguments: The data returned from the server,
            // formatted according to the dataType parameter; a string
            // describing the status; and the jqXHR object.
            success: function (response, textStatus, jqXHR) {
                if (!response) {
                    callback(new EmptyResponseError());
                }
                else {
		    var asjson;
		    try { asjson = JSON.parse(response)} catch (e) {};
		    if (asjson !== undefined && asjson.requestKey !== undefined) {
                        if (asjson.jobStatus === "completed") {
			    callback (null, asjson.resultsFileURL);
                        }
			else {
			    // Not finished yet - retry with request key...
			    var params = {
				requestKey : asjson.requestKey
			    };
			    setTimeout(function () {
					   dvAjax(app, params, {}, callback);
				       },
				       app.timeout);
		        }
		    }
		    else if (response.indexOf('requestKey:') >= 0) {
			// Not finished yet - retry with request key...
			var params = {
			    requestKey : getRequestKey(response)
			};
			setTimeout(function () {
				       dvAjax(app, params, {}, callback);
				   },
				   app.timeout);
		    }
		    else {
			// Success!
			callback(null, response);
		    }
		}
            },
            // A function to be called if the request fails. The function
            // receives three arguments: The jqXHR object, a string describing
            // the type of error that occurred and an optional exception object,
            // if one occurred. Possible values for the second argument
            // (besides null) are "timeout", "error", "abort", and
            // "parsererror". When an HTTP error occurs, errorThrown receives
            // the textual portion of the HTTP status, such as "Not Found" or
            // "Internal Server Error."
            error: function (jqXHR, textStatus, errorThrown) {
                var SC_SERVICE_UNAVAILABLE = 503,
                    NETWORK_ERROR = 0,
                    statusCode = jqXHR.status;

                if (statusCode === SC_SERVICE_UNAVAILABLE) {
                    // This occurs if the DynamicViewer server is overloaded.
                    // As it's a transient error, retry after a brief delay.
                    setTimeout(function () {
                                   console.log(errorThrown + ': retrying...');
                                   dvAjax(app, params, settings, callback);
                               },
                               getRetryAfterMsecs(jqXHR, app.timeout));
                    return;
                }

                if (statusCode === NETWORK_ERROR) {
                    // Problem with Ajax call itself...
                    callback(new NetworkError());
                }
                else {
                    callback(new DVError(jqXHR, textStatus, errorThrown));
                }
            }
        };

        $.ajax($.extend({}, settings, ajaxSettings));
    }


    /**
     * Convenience function to invoke DynamicViewer with specified arguments.
     * It sets up the AJAX loader, and invokes DV servlet.
     *
     * @private
     * @param {DVApp} app         Object representing dvapp
     * @param {Object} params     Parameters to be used by dvapp
     * @param {String} target_id  HTML DOM <div> element id
     * @param {Object} options    Associative map with various settings
     * @param {Function} callback Callback called after dvapp completes
     * @throws {Error} If not enough/too many arguments, or bad argument value
     * @throws {TypeError} If argument of wrong type
     */
    function dvInvoke(app, params, target_id, options, callback) {
        if (arguments.length !== 5) {
            throw new Error("function requires five arguments");
        }
        else if (!(app && app instanceof DVApp)) {
            throw new TypeError("'app' argument must be object of type 'DVApp'");
        }
        else if (!(callback && typeof(callback) === 'function')) {
            throw new TypeError("'callback' argument must be function");
        }
        else if (!(options.ajax.type === 'GET' ||
                   options.ajax.type === 'POST')) {
            throw new Error("'options.ajax.type' argument value must be either 'GET' or 'POST'");
        }

        var target_sel = '#' + target_id,
            target_elem = $(target_sel);

        // Remove contents (from previous invocation)
        target_elem.empty();

        // Display wait image
        var waitdiv_class = 'wait-div',
            waitdiv_sel = target_sel + '.' + waitdiv_class,
            waitdiv_elem = $('<div></div>').css({
                               position:     'relative',
                               overflow:     'hidden',
                               height:       '100%',
                               width:        '100%',
                               'text-align': 'center',
                               margin:       '5px',
                               float:        'left',
                           }).addClass(waitdiv_class);
        target_elem.append(waitdiv_elem).show();

        var ajaxLoader = new AjaxLoader(waitdiv_elem, options.loader);

        // Invoke DynamicViewer
        var _callback = function (error, response) {

            // Report error to console
            if (error) {
                console.error(error.toString());
            }

            // Remove loader 
            ajaxLoader.remove();

            // Give AJAX loader animation time to complete...
            var ANIM_DELAY = 200,  // .fadeOut() "fast" duration (msecs)
                MIN_DELAY = 4,     // HTML5 minimum timeout delay (msecs)
                delay = ajaxLoader.options.classOverride ? ANIM_DELAY : MIN_DELAY;

            setTimeout(function () {
                           waitdiv_elem.remove();
                           callback(error, response);
                       },
                       delay);
        };

        dvAjax(app, params, options.ajax, _callback);
        return;
    }


    /*
     * Public API
     */
    return {
        /** Name of this module. */
        name: PRODUCT,

        /** Version of this module. */
        version: VERSION,

        /**
         * Creates a new DVApp.
         *
         * @param {String} url          URL of the DynamicViewer servlet
         * @param {String} [name]       Name of the server-side dvapp
         * @param {String} [command_id] Command to be invoked
         */
        DVApp: function (url, name, command_id) {
            try {
                return new DVApp(url, name, command_id);
            }
            catch(e) {
                alert(e);
            }
        },


        /**
         * Callback invoked after server-side dvapp has completed processing.
         * If successful, first argument will be null; otherwise, the second
         * will be. Only one of the two arguments will ever be defined; the
         * other should ALWAYS be ignored.
         *
         * @callback callback
         * @param {Error} error     Object representing error
         * @param {String} response Result returned from dvapp
         */

        /**
         * Invokes the server-side dvapp. Content of 'div_id' will be replaced.
         *
         * @param {DVApp} app         Object representing dvapp
         * @param {Object} params     Parameters to be used by dvapp
         * @param {String} div_id     HTML DOM <div> element id
         * @param {Object} [options]  Associative map with settings
         * @param {Function} callback Callback called after dvapp completes
         */
        invoke: function (app, params, div_id, options, callback) {
            try {
                var div_sel = '#' + div_id;

                if (!(div_id && $(div_sel).get(0).tagName === 'DIV')) {
                    throw new Error("'div_id' argument must be '<div>' element");
                }

                // Handle next-to-last optional settings argument
                if (arguments.length === 4) {
                    callback = options;
                    options = false;
                }

                // Ensure the options object exists
                if (!options) {
                    options = {};
                }

                // Ensure AJAX defaults exist
                var ajaxDefaults = {
                    type: 'GET'
                };
                options.ajax = (options.ajax) ?
                                   $.extend(ajaxDefaults, options.ajax) :
                                   ajaxDefaults;

                // Ensure AJAX loader defaults exist
                var loaderDefaults = {
                    bgColor: 'grey'
                };
                options.loader = (options.loader) ?
                                   $.extend(loaderDefaults, options.loader) :
                                   loaderDefaults;

                // [Lex]  Come on. Let me hear you say it, just once.
                // [Lois] You're insane.
                // [Lex]  No!
                //   {chuckling}
                // [Lex]  Not that. The other thing. Come on, I know it's
                //        dangling on the tip of your tongue. Let me hear
                //        it just once, please?
                // [Lois] Superman will never...
                // [Lex]  WRONG!

                dvInvoke(app, params, div_id, options, callback);
                return;
            }
            catch(e) {
                alert(e);
            }
        }
    };
})(jQuery);

