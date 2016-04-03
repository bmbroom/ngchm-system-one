/*!
 * Parameter Utility library
 *
 * $Id$
 * Copyright (c) 2013 The University of Texas MD Anderson Cancer Center
 *
 * Depends on jQuery
 */


/**
 * @namespace ParamUtils specification
 *
 * @author <a href="mailto:proebuck@mdanderson.org">P. Roebuck</a>
 * based on prior work by S. Wu and B. Broom.
 */
var ParamUtils = (function () {

    // Execute in strict mode
    "use strict";


    /*
     * Constants
     */
    var PRODUCT = 'ParamUtilsJS',
        VERSION = '0.8',
        UNDEFINED;


    /*
     * Private functions
     */

    // ------------------------------------------------------------------------
    // Returns an object containing the key/value pairs in the object 'params'
    // for which key is also a member of the list 'keys'.
    function _select(keys, params) {
		
        var selected = {};

        for (var vv in keys) {
            var kk = keys[vv];
            if (params[kk] != UNDEFINED) {
                selected[kk] = params[kk];
            }
        }
        return selected;
    }


    // ------------------------------------------------------------------------
    // Builds the data object that is passed to the AJAX call. If the optional
    // form id is provided, only its input parameters are used to create the
    // data object; otherwise, all input parameters are used.
    function _getFormParams(form_id, filter) {
        var sel,
            data = {};

        if (form_id) {
            var form = '#' + form_id;
            if ($(form).get(0).tagName !== 'FORM') {
                throw new Error("'form_id' argument must be '<form>' element");
            }
            sel = form + ' :input';
        }
        else {
            sel = ' :input';
        }

        $(sel).each(function () {
            var child = $(this),
                name,
                value;

            name = child.attr('name');
            if (!name) {
                name = child.attr('id');
            }

            value = child.val();
            if (child.is(':checkbox')) {
                if (value != 'on' && child.is(':checked')) {
                    // keep the user specified default value
                }
                else {
                    // convert to boolean value
                    value = child.is(':checked')
                }
            }

            if (child.is(':radio')) {
                if (child.is(':checked')) {
                    data[name] = value;
                }
            }
            else {
                data[name] = value;
            }
        });

        return (filter) ? _select(filter, data) : data;
    }


    // Return an object containing the key/value pairs specified on the URL
    // used to load the current window.
    function _getUrlParams(filter) {
	    
        var e,
            r = /([^&=]+)=?([^&]*)/g,
            d = function (s) {
                    // Replace any addition symbol with a space
                    return decodeURIComponent(s.replace(/\+/g, " "));
                },
            q = window.location.search.substring(1),
            urlParams = {};

        while (e = r.exec(q)) {
            urlParams[d(e[1])] = d(e[2]);
        }
		
        return (filter) ? _select(filter, urlParams) : urlParams;
    }


    // :NOTE: Does not do what name implies - more like extend() instead...
    function _mergeParams(p1, p2) {
        var target = {};

        for (var key in p1) {
            if (p1.hasOwnProperty(key)) {
                target[key] = p1[key];
            }
        }
        for (var key in p2) {
            if (p2.hasOwnProperty(key)) {
                target[key] = p2[key];
            }
        }
        return target;
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
         * Returns parameters extracted from an HTML form element. If the
         * 'filter' argument is provided, only form '<input>' elements with
         * matching name attributes will be returned.
         *
         * @param {String} form_id    HTML DOM <form> element
         * @param {String[]} [filter] Array of parameter names to be returned
         * @returns {Object} parameters from form as KV pairs
         */
        getParamsFromForm: function (form_id, filter) {
            try {
                return _getFormParams(form_id, filter);
            }
            catch(e) {
                alert(e);
            }
        },

        /**
         * Returns parameters extracted from current window's address bar URL.
         * If the 'filter' argument is provided, only query parameters with
         * matching name attributes will be returned.
         *
         * @param {String[]} [filter] Array of parameter names to be returned
         * @returns {Object} parameters from URL as KV pairs
         */
        getParamsFromAddressBar: function (filter) {
            try {
                return _getUrlParams(filter);
            }
            catch(e) {
                alert(e);
            }
        }
    };
})();

