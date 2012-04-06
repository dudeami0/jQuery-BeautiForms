/**
 * Beautiform v0.1 alpha
 * 
 * This plugin allows the easy creation of beautiful forms. It aims to make
 * all widely used browsers have valid HTML5 input types, with dialog
 * (Ex: calendar for date input) and validation. The dialogs are based off
 * jQuery UI, and have easy hooks to change these.
 * 
 * Note on changing values with JS
 * 
 * Due to a limitation in javascript, changing of an elements value using
 * javascript cannot be detected. When changing an inputs value, trigger the
 * 'change' event. If this is not an option you can set an interval to fire the
 * change event or validate the whole form with $('form').beautiform('validate')
 */
(function ($) {
	
	var defaults = {
		/**
		 * Set this option to true if you wish to only use the javascript
		 * validator. This prevents the invalid event from firing, as well
		 * as 
		 */
		ignore_browser: true,
		/**
		 * This option allows you to define how you can access the custom
		 * validation methods. For example, we'll use checkValidity() as an
		 * example.
		 * 
		 * dirty_dom on : element._checkValidity();
		 * dirty_dom off: $('form').beautiform('checkValidity', element);
		 * 
		 * As you can see, the first way is a bit easier and closily resembles
		 * the how HTML5 compliant browsers call the checkValidity function.
		 * Note that even when dirty_dom is on, the long version will still be
		 * usable.
		 */
		dirty_dom: false
	};
	
	var utils = {
		debug : function () {
			console.debug.apply(window, arguments);
		}
	};
	

	var methods = {
		/**
		 * Initalizes the beautiform
		 */
		init : function( options ) {
			var $form = this;
			
			options = $.extend({}, options, defaults);
			
			this.submit(function (event) {
				return false;
				$form.beautiform('submit');
			});
			
			this.beautiform('options', options);
			
			this.beautiform('validator.init');
			this.beautiform('widgets.init');
		},

		
		clear : function() {
			
		},
		
		submit : function() {
			// Setup our basic variables
			this.each(function () {
				var options = this.beautiform('options');
				
				var data = {};
				this.find('input, select, textarea').each(function () {
					// Process dirname
					var dirname = this.attr('dirname');
					if (typeof dirname == 'string') {
						data[dirname] = this.css('direction');
						data.mode = 'add';
					}
					
					// Process data
					if (this.is('textarea.tinymce'))
						data[this.attr('name')] = this.tinymce().getContent();
					if (!this.is(':checkbox, :radio') || this.is(':checked'))
						data[this.attr('name')] = this.val();
				});
				
				$.ajax({
					url : this.attr('href'),
					type: this.attr('method'),
					data: data,
					dataType: options.response_type,
					success: function (response) {
						// Determine if we have any errors
						if (response.errors.length > 0) {
							
						}
						if (typeof options.success == "function")
							options.success.apply(this, arguments);
					},
					error: function () {
						if (typeof options.error == "function")
							options.error.apply(this, arguments);
					}
				});
			});
		},
		options : function(name, data) {
			var options = this.data('beautiform-data');
			var object;
			
			if (typeof arguments[0] == 'object') {
				options = $.extend(options, arguments[0]);
			} else if (typeof arguments[0] == 'string') {
				name = name.split(".");
				object = options;
				try {
					for (var i = 0; i < name.length - 1; i++) {
						object = object[name[i]];
					}

					arguments.length > 1 && (object[name[name.length - 1]] = data);
				} catch (e) {
					$.error('Invalid option passed: ' + name);
				}
			}
			
			this.data('beautiform-data', options);
			return typeof object == 'undefined' ? options : object[name[name.length - 1]];
		},
		/**
		 * An alias for the options function
		 */
		o: function (name, data) {
			this.beautiform('options', name, data);
		}
	};
	
	/**
	 * This is a loader I am prototyping. It supports pre-loading classes through
	 * either script tags or $.beautiform('load', 'validator'). Note lazy
	 * loading is supported, but it forces async on the request to false because
	 * it needs to return the code. While this is ugly, its still an option :)
	 * 
	 * And yes, its kinda bloated. But it makes it so much easier :)
	 */
	
	// Find the last script tag (us), and get its source
	var regex = new RegExp('^(.*/)?(jQuery\\.)?((.*?)\\.).*$', 'i');
	var baseurl = $('script:last').attr('src').replace(regex, '$1$4')+'/';;
	
	// Helper function for calling beautiform methods that don't require
	// an element ('loader', 'utils')
	$.beautiform = function () {
		$.fn.beautiform.apply($(), arguments);
	}
	
	$.fn.beautiform = function ( method ) {
		this.methods = methods;
		this.loader = function ( method ) {
			var methods = this.methods;
			var that = this;
			
			// Method calling logic
			if (typeof method == 'string') {
				var stack = method.split('.');
				var a = stack.shift();
				var args = Array.prototype.slice.call(arguments, 2);
				var caller = arguments.callee.caller;
				var is_loader = (a == 'loader');
				
				// If we can find the method, call it!
				if (methods[a] && !is_loader)
					return methods[a].apply( this , args);
				
				if (is_loader) {
					stack = arguments[1].split('.');
					a = stack.shift();
				}
				
				if (typeof caller[a] == 'undefined') {
					// Check that this baseurl is defined. Should only occur
					// on the root class
					if (!this.baseurl && baseurl)
						this.baseurl = baseurl;
					
					// Attempt to load the script
					var b = this.baseurl;
					$.ajax({
						async: is_loader,
						url: this.baseurl+a+'.js',
						dataType: "script",
						success: function () {
							if (caller[a]) {
								caller[a].loader = that.loader;
								caller[a].loader.baseurl = b+a+'/';
							} else {
								caller[a] = false;
								$.error('File was successfully loaded, but could not find the dom element. Double check variable names!');
							}
						},
						error: function (jqXHR, textStatus, error) {
							$.error('Failed to load '+b+a+' with: '+error);
						}
					});
				}
				
				// Now try calling the function.
				if (caller[a] && !is_loader)
					return caller[a].apply( this , $.merge([stack.join('.')], args));
				else if (is_loader)
					return;
			} else if ( typeof method === 'object' || ! method ) {
				return methods.init.apply( this, arguments );
			}
			// We got an error, figure out the function name
			$.error( 'Method ' + method + ' does not exist on jQuery.beautiform' );
			return this;
		}
		return this.loader.apply(this, arguments);
	}

})(jQuery);