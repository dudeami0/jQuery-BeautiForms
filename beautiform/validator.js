/**
 * Plugin for beautiform form validation.
 * 
 * Depends on XDate for date processing, will fail without it!
 */
(function ($) {
	
	var constants = {
		validity: {
			stepMismatch     : false,
			patternMismatch  : false,
			rangeOverflow    : false,
			rangeUnderflow   : false,
			tooLong          : false,
			typeMismatch     : false,
			valueMissing     : false,
			valid            : true
		},
		messages: {
			step_mismatch   : 'This field\'s value must be a step of {1}!',
			pattern_mismatch: 'This field\'s value must validate against /{1}/',
			range_overflow  : 'This field\'s value must be equal to or less than {1}!',
			range_underflow : 'This field\'s value must be equal to or greater than {1}!',
			too_long        : 'This field\'s value must be shorter than {1} character{2}',
			type_mismatch   : 'This field\'s value does not match the required format.',
			value_missing   : 'This field is required.'
		},
		/**
		 * Below are the regex patterns used for validation in browsers not
		 * supporting HTML5 validation. They follow HTML5 spec, so they should
		 * not be changed!
		 *
		 * Changing these values will have no effect with browsers having HTML5
		 * form validation.
		 */
		regex: {
			email         : '[A-Z0-9!#$%&\'*+\\-/=?_`{|}~.\\^]+@[A-Z0-9\\-]+(\\.[A-Z0-9\\-]+)*',
			// TODO: Add IRI validation to the existing URI validation
			// See:  http://www.w3.org/TR/html5/urls.html#valid-url
			url           : '(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?',
			datetime      : '([0-9]{4,})-([0-9]{1,2})-([0-9]{1,2})T([0-9]{1,2}):([0-9]{1,2})(:([0-9]{1,2})(\.[0-9]{1,3})?)?(Z|[+-]([0-9]{1,2}):([0-9]{1,2}))',
			datetime_local: '([0-9]{4,})-([0-9]{1,2})-([0-9]{1,2})T([0-9]{1,2}):([0-9]{1,2})(:([0-9]{1,2})(\.[0-9]{1,3})?)?',
			date          : '([0-9]{4,})-([0-9]{1,2})-([0-9]{1,2})',
			time          : '([0-9]{1,2}):([0-9]{1,2})(:([0-9]{1,2})(\.[0-9]{1,3})?)?',
			month         : '([0-9]{4,})-([0-9]{1,2})',
			week          : '([0-9]{4,})W([0-9]{1,2})'
		}
	};
	
	/**
	 * Validators
	 */
	var validators = {
		step_mismatch: function () {
			utils.debug('Running stepMismatch validation');

			var $this = $(this);
			var type = $this.attr('type').toLowerCase();
			var val = $this.val();
			var val_float = parseFloat(val);
			var step = parseFloat($this.attr('step'));

			if (!isNaN(step) && step > 0 ) {
				var diff;
				if (type == 'number' || type == 'range') {
					var valid = !isNaN(val_float);
					diff = val_float % step;

					if (!valid)
						return false;
					else if (diff != 0) {
						if (diff < step / 2)
							val_float -= diff;
						else
							val_float += (step - diff);

						$this.val(val_float);
					}
					return true;
				}

				// Handling date objects
				var date = new XDate(val);

				if (!date.valid())
					return false;

				// For rounding of the dates, how to round them was
				// not the clearest in the HTML5 specs. So, we will
				// simply go off the base of days, weeks, or months.
				switch (type) {
					//// Months are the odd one out for the validation
					case 'month':
						var month = date.getMonth();

						// TODO: What is the step based on?
						// For now, we'll base if off of january of the current year.
						diff = month % step;

						if (diff == 0)
							break;

						date.addMonth(diff < step / 2 ? diff : (step - diff));

						$this.val(date.toString('yyyy-mm'));
						break;
					case 'week':
						// For week inputs
						step = step * 7;
					case 'date':
						// For week and date inputs
						step = step * 86400
					case 'datetime':
					case 'datetime-local':
					case 'time':
						step = step * 1000;

						var base_date = date.clone().clearTime();

						if (type == 'week')
							base_date.setWeek(1);

						var base_time = base_date.getTime();
						var time = date.getTime();

						utils.debug('  Basing time off of ' + base_time + ', real time is' + time);

						diff = (time - base_time) % step;

						if (diff == 0) {
							utils.debug('  No difference.');
							break;
						}

						diff = diff < step / 2 ? -diff : (step - diff);

						date.addMilliseconds(diff);

						utils.debug('  Need to remove ' + diff + ' milliseconds, step of ' + step);

						switch(type) {
							case 'date':
								val = date.toString('yyyy-MM-dd');
								break;
							case 'datetime':
								if (val.indexOf('Z') > -1)
									val = date.toISOString();
								else
									val = date.toString('u');
								break;
							case 'datetime-local':
								val = date.toString('i');
								break;
							case 'time':
								val = date.toString('hh:mm:ss');
								break;
							case 'week':
								val = date.toString('yyyyWww');
								break;
						}
						utils.debug('  New Value: ' + val);
						$this.val(val);
						break;
				}
			} else
				utils.debug('  There is no step to validate!');
			return true;
		},

		range_overflow: function () {
			utils.debug('Running rangeOverflow validation.');

			var $this = $(this);
			var val_int = parseFloat($this.val());
			var max = parseFloat($this.attr('max'));

			if (max != null && !isNaN(max) && val_int > max)
				return false;
			return true;
		},

		range_underflow: function () {
			utils.debug('Running rangeUnderflow validation.');

			var $this = $(this);
			var val = parseFloat($this.val());
			var min = parseFloat($this.attr('min'));
			
			if (min != null && !isNaN(min) && val < min)
				return false;
			return true;
		},

		pattern_mismatch: function () {
			utils.debug('Running patternMismatch validation.');

			var $this = $(this);
			var val = $this.val();

			var pattern = $this.attr('pattern');
			if (pattern) {
				pattern = new RegExp('^' + pattern + '$');
				if (val.match(pattern, 'i') != null)
					return false;
			}
			return true;
		},

		too_long: function () {
			utils.debug('Running tooLong validation.');

			var $this = $(this);
			var val = $this.val();

			var maxlength = parseInt($this.attr('maxlength'));
			if (!isNaN(maxlength) && maxlength > 0 && val.length > maxlength)
				return false;
			return true;
		},
		
		type_mismatch: function () {
			var that = this;

			var $this = $(this);
			var type = $this.attr('type').toLowerCase();
			var regex = constants.regex[type.replace('-', '_')];
			
			if (!regex)
				return true;
			
			regex = '^' + regex + '$';
			var val = $this.val();
			var flags = '';

			switch (type) {
				case 'email':
					var values;

					if ($this.attr('multiple'))
						values = val.split(',');
					else
						values = [val];
					
					var valid = true;
					$.each(values, function (i, e) {
						e = $.trim(e);
						
						utils.debug("Email being validated: ", e, i);
						
						if (e.length > 0 && e.match(regex, 'i') == null)
							valid = false;
					});
					if (!valid)
						return false;
					break;
				case 'url':
					flags = 'i';
				default:
					utils.debug(regex);
					if (regex && !val.match(regex, flags))
						return false;
					break;
			}
			return true;
		},

		custom_error: function () {
			utils.debug('Running customError validation.');

			this.customError = true;
		}
	};
	
	/**
	 * Plugin utilities, basically private methods of the plugin.
	 */
	var utils = {
		
		debug : function () {
			// console.debug.apply(window, arguments);
		},
		to_camelcase: function (string) {
			return string.replace(new RegExp('(_[A-Za-z0-9])'), function ($1) {
				return $1.toUpperCase().substring(1);
			})
		},
		
		message : function (name) {
			var message = constants.messages[name.toLowerCase()];
			
			for (var i = 1; i < arguments.length; i++)
				message.replace('{' + i + '}', arguments[i]);
			
			return message;
		},
		
		/**
		 * Determines if the element is eligible for certain types of validation
		 */
		will_validate: function (type) {
			var validate = true;
			var eletype = $(this).attr('type').toLowerCase();
			
			// Due to the lack of full support for validation, here we need
			// to determine when to use the custom validation to compensate
			// for the browsers

			if (!$(this).parents('form').beautiform('options', 'ignore_browser')) {
				validate = !$(this).beautiform('validator.validity')[utils.to_camelcase(type)];
			}
			
			// Generic switch for browser support
			switch (type) {
				case 'step_mismatch':
					validate = validate && $.inArray(eletype, [
						'datetime', 'date', 'month', 'week', 'time',
						'datetime-local', 'number', 'range', 
					]) > -1;
					break;
				case 'value_missing':
					validate = validate && $.inArray(eletype, [
						'hidden', 'range', 'color', 'submit', 'image',
						'reset', 'button'
					]) == -1;
					break;
				case 'too_long':
					validate = validate && $.inArray(eletype, [
						'text', 'search', 'tel', 'url', 'email', 'password'
					]) > -1;
					break;
				case 'pattern_mismatch':
					validate = validate && $.inArray(eletype, [
						'text', 'search', 'tel', 'url', 'email', 'password'
					]) > -1;
					break;
				case 'range_overflow':
				case 'range_underflow':
					validate = validate && $.inArray(eletype, [
						'datetime', 'date', 'month', 'week', 'time',
						'datetime-local', 'number', 'range', 
					]) > -1;
					break;
				case 'type_mismatch':
					// This only uses the validity check above, left here incase
					// additional code is needed.
					break;
				case 'custom_error':
					validate = validate && Boolean(this._validationMessage);
					break;
			}

			return validate;
		},
		
		/**
		 * Saves the validity data.
		 */
		set_validity: function (data) {
			var validity = $(this).data('validity');
			
			!validity && (validity = {});
			
			validity = $.extend(validity, data);
			
			$(this).data('validity', validity);
			
			if ($(this).parents('form').beautiform('options', 'dirty_dom'))
				$(this).prop('_validity', validity);
		},
		
		/**
		 * Sets the validation message.
		 */
		set_validation_message: function (message) {
			$(this).data('validationMessage', message);
			
			if ($(this).parents('form').beautiform('options', 'dirty_dom'))
				$(this).prop('_validationMessage', message);
		},
		
		/**
		 * Validates an element, expects this to be a jQuery element.
		 */
		validate: function () {
			// First things first, load the validity object
			var validity = this.beautiform('validator.validity');
			
			// Determine if we should validate this element
			if (!validity || !validity.willValidate)
				return;
			
			var $form = this.parents('form');

			// Reset the validity of the items
			if (!$form.beautiform('options', 'ignore_browser') && this.prop('validator.validity')) {
				$.extend(validity, this.prop('validator.validity'));
			} else {
				$.extend(validity, constants.validity);
			}

			// Run each type of validator
			utils.debug('----- Starting validation on ' + $('<div>').append(this.clone()).html());

			for (e in validators) {
				var valid = true;

				if (utils.will_validate.apply(this, [e])) {
					valid = validators[e].apply(this, []);
				}
				
				validity[utils.to_camelcase(e)] = !valid;
				
				if (!valid)
					validity.valid = false;
			}
			
			utils.debug('Validation ' + (validity.valid ? 'succeeded' : 'failed'));
			utils.debug('-----------------------');

			if (!validity.valid) {
				if (!validity.customError) {
					var args;
					switch (true) {
						case validity.typeMismatch:
							args = ['type_mismatch'];
							break;
						case validity.stepMismatch:
							args = ['step_mismatch', this.attr('step')];
							break;
						case validity.patternMismatch:
							args = ['pattern_mismatch', this.attr('pattern')];
							break;
						case validity.rangeOverflow:
							args = ['range_overflow', this.attr('max')];
							break;
						case validity.rangeUnderflow:
							args = ['range_underflow', this.attr('min')];
							break;
						case validity.tooLong:
							var maxlength = this.attr('maxlength');
							args = ['too_long', maxlength, maxlength > 1 ? 's' : ''];
							break;
						case validity.valueMissing:
							args = ['value_missing'];
							break;
					}
					if (args) 
						utils.set_validation_message.apply(this, [utils.message.apply($form, args)]);
				}
				this.addClass('error');
			}

			// Commit the changes to the validity object
			utils.set_validity.apply(this, [validity]);
		}
	};
	
	var methods = {
		init: function () {
			
			// TODO: Remove this, or rather make it prevent default only if
			// options.ignore_browser is true.
			if (this.beautiform('options', 'ignore_browser'))
				this.find('input, select, textarea').andSelf().bind('invalid', function (e) {
					e.preventDefault();
				});
				
			var $form = this;
			
			// If needed, add the validation functions
			this.find('input, select, textarea')
				.bind('keyup change', function () {
					$form.beautiform('validator.checkValidity', this);
				})
				.each(function (i, e) {
					var validity = $.extend({
						willValidate: true,
						customError: false
					}, constants.validity);

					utils.set_validity.apply(this, [validity]);

					$(this).beautiform('validator.setCustomValidity', '');

					if ($form.beautiform('options', 'dirty_dom')) {
						this._setCustomValidity = function (message) {
							$(this).beautiform('validator.setCustomValidity', message);
						};
						this._checkValidity = function () {
							$(this).beautiform('validator.checkValidity');
						};
					}
				});
		},		
		/**
		 * Returns the elements validity object.
		 * 
		 * Note while this function allows you to update the validity object,
		 * this should not be used in normal circumstances, if at all!
		 */
		validity: function(data) {
			return this.data('validity');
		},
		
		/**
		 * Sets the validityMessage to the passed message
		 */
		setCustomValidity: function (message) {
			utils.set_validation_message.apply(this, [message]);
			
			utils.set_validity.apply(this, [{
				customError: Boolean(message)
			}]);
			
			$(this).beautiform('validator.checkValidity');
		},
		
		/**
		 * Checks the validity of the element passed.
		 * 
		 * This method can be called on a form element, or a child of a form
		 * element. While any child can be passed, it will only have an effect
		 * on elements that can be validated.
		 * 
		 * While you can do $(element).beautiform('checkValidity'), it should
		 * only be used when a reference to the form is unavailable. If there
		 * is a reference to the form, use:
		 * 
		 *    $(form).beautiform('checkValidity', element);
		 */
		checkValidity: function (element) {
			$(this).beautiform('validator.validate', element);
			
			var valid;
			
			if (!$(this).is('form')) {
				valid = $(this).beautiform('validator.validity').valid;
				!valid && $(this).trigger('invalid');
			} else if (element) {
				valid = $(element).beautiform('validator.validity').valid;
				!valid && $(element).trigger('invalid');
			} else {
				var $form = $(this);
				$(this).find('input, textarea, select', function (i, e) {
					if (!$(this).beautiform('validator.validity').valid) {
						valid = false;
						$(this).trigger('invalid');
					}
				});
			}
		
			return valid;
		},
		
		/**
		 * The underlying code for checkValidity. It accepts the same
		 * parameters, but does not return the elements validity nor does it
		 * fire the invalid event.
		 */
		validate: function (element) {
			var $form;
			var $elements;
			
			if (this.is('form')) {
				$form = this;
				
				if (element)
					$elements = $(element);
				else
					$elements = this.find('input, select, textarea');
			} else {
				$elements = this;
				$form = $elements.parents('form');
				
				if (!$form)
					$.error("You must pass an element that is either a form, or a child of a form.");
			}
			
			// Check if we need to invoke the javascript validator
			$elements
				.removeClass('error')
				.each(function (i, e) {
					utils.validate.apply($(this), []);
				});
		}
	}
	
	// Add to the XDate parsers for weeks
	XDate.parsers.push(function (str) {
		var date  = new XDate();
		// Parse weeks
		var match = str.match(constants.regex.week);
		if (match) {
			date.setWeek(parseInt(match[2]), match[1]);
			return date;
		}
		// Parse months
		match = str.match(constants.regex.month);
		if (match) {
			date.setMonth(match[2], 1);
			return date;
		}
		// Parse time
		match = str.match(constants.regex.time);
		if (match) {
			date.setHours(match[1]);
			date.setMinutes(match[2]);
			date.setSeconds(match[4]);
			var ms = parseFloat(match[5]);
			if (!isNaN(ms))
				date.setMilliseconds(match[5] * 1000);
			return date;
		}
		return null;
	});
	
	$.fn.beautiform.validator = function ( method ) {
		this.methods = methods;
		return this.loader.apply(this, arguments);
	}
})(jQuery);